import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import { getScriptCanonicalPath } from "../utils/scriptPath";

const BUYER_COMMISSION_RATE = 0.05;

const RIGHTS_TYPE_LABELS = {
  full_rights_sale: "Full Rights Sale (Ownership Transfer)",
  exclusive_license: "Exclusive License",
  custom_negotiation_required: "Custom Negotiation Required",
};

const MODIFICATION_RIGHTS_LABELS = {
  buyer_can_modify_freely: "Buyer can modify freely",
  buyer_must_consult_writer: "Buyer must consult writer",
  writer_retains_creative_approval_rights: "Writer retains creative approval rights",
};

const PAYMENT_STRUCTURE_LABELS = {
  one_time_upfront_payment: "One-time upfront payment",
  lower_upfront_plus_royalty_percent: "Lower upfront + royalty %",
  revenue_sharing_model: "Revenue sharing model",
  custom_deal: "Custom deal",
};

const NEGOTIATION_MODE_LABELS = {
  fixed_terms_non_negotiable: "Fixed terms (non-negotiable)",
  open_to_discussion_after_purchase: "Open to discussion after purchase",
  ckript_not_involved: "Ckript not involved",
};

const roundAmount = (value) => Math.round((Number(value) || 0) * 100) / 100;

const formatInr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const loadRazorpaySdk = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Browser environment unavailable"));
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[data-razorpay-sdk="true"]');
    if (existingScript) {
      const handleLoad = () => resolve(true);
      const handleError = () => reject(new Error("Failed to load Razorpay SDK"));
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const sdkScript = document.createElement("script");
    sdkScript.src = "https://checkout.razorpay.com/v1/checkout.js";
    sdkScript.async = true;
    sdkScript.setAttribute("data-razorpay-sdk", "true");
    sdkScript.onload = () => resolve(true);
    sdkScript.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(sdkScript);
  });

export default function ScriptPaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();

  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [acceptPlatformTerms, setAcceptPlatformTerms] = useState(false);
  const [acceptWriterTerms, setAcceptWriterTerms] = useState(false);
  const [acceptCustomWriterTerms, setAcceptCustomWriterTerms] = useState(false);
  const [acceptRightsSummary, setAcceptRightsSummary] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [invoiceActionLoading, setInvoiceActionLoading] = useState(false);
  const scriptPath = getScriptCanonicalPath(script || { _id: id });

  useEffect(() => {
    const fetchScript = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/scripts/${id}`);
        setScript(data);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load script payment details.");
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [id]);

  const request = script?.myPendingRequest;
  const approvedForPayment = Boolean(
    request &&
      request.status === "approved" &&
      request.paymentStatus !== "released"
  );
  const baseAmount = roundAmount(Number(request?.amount || script?.price || 0));
  const buyerCommissionAmount = roundAmount(baseAmount * BUYER_COMMISSION_RATE);
  const totalPayable = roundAmount(baseAmount + buyerCommissionAmount);
  const requiresRazorpayPayment = totalPayable > 0;
  const isAlreadyPurchased = Boolean(script?.isUnlocked || request?.paymentStatus === "released");
  const customWriterTerms = String(script?.legal?.customInvestorTerms || "").trim();
  const hasCustomWriterTerms = customWriterTerms.length > 0;
  const investorRoles = ["investor", "producer", "director", "industry", "professional"];
  const isInvestor = investorRoles.includes(user?.role);
  const rightsTerms = script?.rightsLicensing || {};
  const rightsTypeLabel = RIGHTS_TYPE_LABELS[rightsTerms?.rightsType] || "Not specified";
  const modificationRightsLabel = MODIFICATION_RIGHTS_LABELS[rightsTerms?.modificationRights] || "Not specified";
  const paymentStructureLabel = PAYMENT_STRUCTURE_LABELS[rightsTerms?.paymentStructure] || "Not specified";
  const negotiationModeLabel = NEGOTIATION_MODE_LABELS[rightsTerms?.negotiationMode] || "Not specified";
  const licenseDurationMonths = Number(rightsTerms?.timeBound?.licenseDurationMonths || 0);
  const licenseDurationLabel = rightsTerms?.rightsType === "exclusive_license"
    ? (licenseDurationMonths ? `${licenseDurationMonths} months` : "Time-bound")
    : "Not time-bound";
  const royaltyPercent = Number(rightsTerms?.royaltySettings?.percentage || 0);

  useEffect(() => {
    if (!requiresRazorpayPayment) {
      setRazorpayReady(true);
      return undefined;
    }

    let cancelled = false;

    const prepareSdk = async () => {
      setRazorpayReady(Boolean(window.Razorpay));
      try {
        await loadRazorpaySdk();
        if (!cancelled) {
          setRazorpayReady(true);
        }
      } catch {
        if (!cancelled) {
          setRazorpayReady(false);
          setPaymentError("Payment gateway failed to load. Please disable blockers and retry.");
        }
      }
    };

    prepareSdk();

    return () => {
      cancelled = true;
    };
  }, [requiresRazorpayPayment]);

  const handleInvoicePdfAction = async (invoice, action = "open") => {
    if (!invoice?._id) {
      return;
    }

    try {
      setInvoiceActionLoading(true);
      const { data } = await api.get(`/invoices/${invoice._id}/pdf`, {
        params: action === "download" ? { download: 1 } : {},
        responseType: "blob",
      });

      const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));

      if (action === "download") {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${invoice.invoiceNumber || "invoice"}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      }

      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    } catch (err) {
      setPaymentError(err?.response?.data?.message || "Unable to open invoice right now.");
    } finally {
      setInvoiceActionLoading(false);
    }
  };

  const promptInvoiceDownload = async (invoice) => {
    if (!invoice?._id) {
      return;
    }

    const shouldDownload = window.confirm("Payment successful. Do you want to download your invoice now?");
    if (shouldDownload) {
      await handleInvoicePdfAction(invoice, "download");
    }
  };

  const downloadAcceptancePdf = async (purchaseRequestId) => {
    if (!purchaseRequestId) return;

    try {
      const response = await api.get(`/scripts/purchase-request/${purchaseRequestId}/acceptance-pdf?download=1`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      const safeTitle = String(script?.title || "script")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "") || "script";

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${safeTitle}_accepted_terms.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
    } catch (err) {
      setPaymentError(err?.response?.data?.message || "Unable to download accepted terms PDF right now.");
    }
  };

  const handlePayment = async () => {
    if (!script?._id || processing) return;

    setPaymentError("");

    if (!acceptPlatformTerms || !acceptWriterTerms) {
      setPaymentError("Please accept both Platform and Writer Terms & Conditions before payment.");
      return;
    }

    if (!acceptRightsSummary) {
      setPaymentError("Please accept the rights and licensing summary before payment.");
      return;
    }

    if (hasCustomWriterTerms && !acceptCustomWriterTerms) {
      setPaymentError("Please accept the writer's custom terms before payment.");
      return;
    }

    if (requiresRazorpayPayment && (!window.Razorpay || !razorpayReady)) {
      try {
        await loadRazorpaySdk();
        setRazorpayReady(true);
      } catch {
        setPaymentError("Payment SDK is blocked or not ready. Please retry after enabling checkout.razorpay.com.");
        return;
      }
    }

    try {
      setProcessing(true);

      const { data: orderData } = await api.post("/scripts/purchase/create-order", {
        scriptId: script._id,
        acceptedPlatformTerms: acceptPlatformTerms,
        acceptedWriterTerms: acceptWriterTerms,
        acceptedCustomWriterTerms: hasCustomWriterTerms ? acceptCustomWriterTerms : false,
        acceptedRightsSummary: acceptRightsSummary,
        acceptedLegalDisclaimer: true,
      });

      if (orderData?.noPaymentRequired) {
        const { data: verifyData } = await api.post("/scripts/purchase/verify-payment", {
          scriptId: script._id,
          freeAccess: true,
        });

        if (!verifyData?.success) {
          setPaymentError("Access confirmation failed. Please try again.");
          setProcessing(false);
          return;
        }

        setSuccessInfo({
          message: verifyData.message || "Free access confirmed. Full script access unlocked.",
          invoiceNumber: "",
          invoice: null,
          purchaseRequestId: verifyData?.purchaseRequest?.id || orderData?.purchaseRequestId || "",
        });
        setScript((prev) => (prev ? { ...prev, isUnlocked: true } : prev));
        await downloadAcceptancePdf(verifyData?.purchaseRequest?.id || orderData?.purchaseRequestId || "");
        setProcessing(false);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ckript",
        description: `Script Purchase: ${script.title}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const { data: verifyData } = await api.post("/scripts/purchase/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              scriptId: script._id,
            });

            if (!verifyData?.success) {
              setPaymentError("Payment verification failed. Please contact support.");
              setProcessing(false);
              return;
            }

            const invoice = verifyData?.invoice || null;

            setSuccessInfo({
              message: verifyData.message || "Payment successful. Full script access unlocked.",
              invoiceNumber: invoice?.invoiceNumber || "",
              invoice,
              purchaseRequestId: verifyData?.purchaseRequest?.id || "",
            });
            setScript((prev) => (prev ? { ...prev, isUnlocked: true } : prev));
            await downloadAcceptancePdf(verifyData?.purchaseRequest?.id || "");
            setProcessing(false);

            if (invoice?._id) {
              setTimeout(() => {
                promptInvoiceDownload(invoice);
              }, 120);
            }
          } catch (err) {
            setPaymentError(err?.response?.data?.message || "Payment verification failed.");
            setProcessing(false);
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: "",
        },
        theme: {
          color: "#1e3a5f",
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setPaymentError(err?.response?.data?.message || "Failed to initiate payment.");
      setProcessing(false);
    }
  };

  const t = {
    page: isDarkMode ? "bg-[#070e1a]" : "bg-gray-50",
    card: isDarkMode ? "bg-[#0d1829] border-white/[0.08]" : "bg-white border-gray-200",
    title: isDarkMode ? "text-white" : "text-gray-900",
    sub: isDarkMode ? "text-gray-300" : "text-gray-600",
    muted: isDarkMode ? "text-gray-500" : "text-gray-500",
    row: isDarkMode ? "border-white/[0.08]" : "border-gray-200",
    inset: isDarkMode ? "bg-white/[0.03] border-white/[0.08]" : "bg-gray-50 border-gray-200",
    btnPrimary: "bg-[#1e3a5f] hover:bg-[#254a75] text-white",
    btnSecondary: isDarkMode
      ? "bg-white/[0.05] border-white/[0.08] text-white hover:bg-white/[0.1]"
      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
  };

  if (loading) {
    return (
      <div className={`min-h-[60vh] flex items-center justify-center ${t.page}`}>
        <div className={`w-10 h-10 border-2 rounded-full animate-spin ${isDarkMode ? "border-white/15 border-t-white/70" : "border-gray-200 border-t-gray-600"}`} />
      </div>
    );
  }

  if (error || !script) {
    return (
      <div className={`min-h-screen ${t.page}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className={`rounded-2xl border p-6 ${t.card}`}>
            <h1 className={`text-xl font-bold mb-2 ${t.title}`}>Payment Page Unavailable</h1>
            <p className={t.sub}>{error || "Script not found."}</p>
            <button
              type="button"
              onClick={() => navigate(scriptPath)}
              className={`mt-5 px-4 py-2 rounded-xl text-sm font-semibold border transition ${t.btnSecondary}`}
            >
              Back to Script
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.page}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-7 sm:py-10">
        <button
          type="button"
          onClick={() => navigate(scriptPath)}
          className={`inline-flex items-center gap-2 text-sm mb-5 ${t.muted} ${isDarkMode ? "hover:text-white" : "hover:text-gray-700"}`}
        >
          <span aria-hidden="true">&#8592;</span>
          Back to Script
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className={`rounded-2xl border p-5 sm:p-7 ${t.card}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 ${t.muted}`}>Investor Payment</p>
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${t.title}`}>Pay for Script Access</h1>
              <p className={`text-sm mt-2 ${t.sub}`}>
                Complete payment to unlock full script content for {script.title}.
              </p>
            </div>
            <div className={`rounded-xl border px-4 py-3 min-w-[180px] ${t.inset}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${t.muted}`}>Writer</p>
              <p className={`text-sm font-semibold mt-1 ${t.title}`}>{script.creator?.name || "Unknown"}</p>
            </div>
          </div>

          {!isInvestor && (
            <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Only investor/industry roles can complete this payment.
            </div>
          )}

          {isAlreadyPurchased && (
            <div className="mb-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              You already purchased this script. Full access is active.
            </div>
          )}

          {!isAlreadyPurchased && !approvedForPayment && (
            <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Payment is enabled only after writer approval on your purchase request.
            </div>
          )}

          {successInfo && (
            <div className="mb-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successInfo.message}
              {successInfo.invoiceNumber ? ` Invoice ${successInfo.invoiceNumber} has been generated.` : ""}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className={`rounded-xl border p-4 sm:p-5 ${t.inset}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${t.muted}`}>Payment Breakdown</p>
              <div className={`space-y-2.5 text-sm ${t.sub}`}>
                <div className="flex items-center justify-between gap-3">
                  <span>Script Access Fee</span>
                  <span className={`font-semibold ${t.title}`}>{formatInr(baseAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Platform Commission (5%)</span>
                  <span className={`font-semibold ${t.title}`}>{formatInr(buyerCommissionAmount)}</span>
                </div>
                <div className={`flex items-center justify-between gap-3 pt-2 border-t ${t.row}`}>
                  <span className={`font-bold ${t.title}`}>Total Payable</span>
                  <span className={`text-lg font-extrabold ${t.title}`}>{formatInr(totalPayable)}</span>
                </div>
                <p className={`text-xs pt-1 ${t.muted}`}>
                  Writer receives the full script access fee. Platform commission is charged separately at checkout.
                </p>
              </div>
            </div>

            <div className={`rounded-xl border p-4 sm:p-5 ${t.inset}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${t.muted}`}>Terms & Conditions</p>
              <div className="space-y-3.5 text-sm">
                <div className={`rounded-lg border p-3 ${isDarkMode ? "border-white/[0.1] bg-white/[0.02]" : "border-gray-200 bg-white"}`}>
                  <p className={`font-semibold mb-1.5 ${t.title}`}>Rights & Licensing Summary</p>
                  <div className={`space-y-1.5 text-xs ${t.sub}`}>
                    <p><span className="font-semibold">Rights Type:</span> {rightsTypeLabel}</p>
                    <p><span className="font-semibold">Modification Rights:</span> {modificationRightsLabel}</p>
                    <p><span className="font-semibold">Payment Structure:</span> {paymentStructureLabel}</p>
                    <p><span className="font-semibold">Negotiation:</span> {negotiationModeLabel}</p>
                    <p><span className="font-semibold">License Duration:</span> {licenseDurationLabel}</p>
                    {royaltyPercent > 0 && (
                      <p><span className="font-semibold">Royalty:</span> {royaltyPercent}%</p>
                    )}
                  </div>
                  <p className="mt-2 rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700">
                    EXCLUSIVE RIGHTS ENFORCEMENT: once this agreement is settled, parallel buyer sales are blocked.
                  </p>
                </div>

                <div className={`rounded-lg border p-3 ${isDarkMode ? "border-white/[0.1] bg-white/[0.02]" : "border-gray-200 bg-white"}`}>
                  <p className={`font-semibold mb-1.5 ${t.title}`}>Platform Terms & Conditions</p>
                  <p className={t.sub}>
                    Platform usage, payment rules, and dispute handling apply to this transaction.
                  </p>
                  <Link to="/terms-of-service" target="_blank" rel="noreferrer" className="inline-block mt-2 text-[#1e3a5f] hover:underline font-semibold">
                    Read Platform Terms
                  </Link>
                </div>

                <div className={`rounded-lg border p-3 ${isDarkMode ? "border-white/[0.1] bg-white/[0.02]" : "border-gray-200 bg-white"}`}>
                  <p className={`font-semibold mb-1.5 ${t.title}`}>Writer Terms & Conditions</p>
                  <p className={t.sub}>
                    Rights transfer and writer obligations for approved script access requests apply.
                  </p>
                  <Link to="/terms-conditions?tab=writer" target="_blank" rel="noreferrer" className="inline-block mt-2 text-[#1e3a5f] hover:underline font-semibold">
                    Read Writer Terms
                  </Link>
                </div>

                {hasCustomWriterTerms && (
                  <div className={`rounded-lg border p-3 ${isDarkMode ? "border-white/[0.1] bg-white/[0.02]" : "border-gray-200 bg-white"}`}>
                    <p className={`font-semibold mb-1.5 ${t.title}`}>Writer Custom Terms</p>
                    <p className={`text-xs whitespace-pre-wrap leading-relaxed ${t.sub}`}>{customWriterTerms}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`mt-5 rounded-xl border p-4 ${t.inset}`}>
            <div className="space-y-2.5">
              <label className={`flex items-start gap-2.5 text-sm ${t.sub}`}>
                <input
                  type="checkbox"
                  checked={acceptPlatformTerms}
                  onChange={(e) => setAcceptPlatformTerms(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I agree to the Platform Terms & Conditions.</span>
              </label>
              <label className={`flex items-start gap-2.5 text-sm ${t.sub}`}>
                <input
                  type="checkbox"
                  checked={acceptWriterTerms}
                  onChange={(e) => setAcceptWriterTerms(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I agree to the Writer Terms & Conditions.</span>
              </label>
              <label className={`flex items-start gap-2.5 text-sm ${t.sub}`}>
                <input
                  type="checkbox"
                  checked={acceptRightsSummary}
                  onChange={(e) => setAcceptRightsSummary(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I have reviewed and accept the writer-defined rights and licensing summary.</span>
              </label>
              {hasCustomWriterTerms && (
                <label className={`flex items-start gap-2.5 text-sm ${t.sub}`}>
                  <input
                    type="checkbox"
                    checked={acceptCustomWriterTerms}
                    onChange={(e) => setAcceptCustomWriterTerms(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>I agree to the writer custom terms shown above.</span>
                </label>
              )}
            </div>

            {paymentError && (
              <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {paymentError}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePayment}
                disabled={!isInvestor || !approvedForPayment || isAlreadyPurchased || processing || (requiresRazorpayPayment && !razorpayReady)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 ${t.btnPrimary}`}
              >
                {processing
                  ? "Processing Payment..."
                  : requiresRazorpayPayment
                  ? (!razorpayReady ? "Preparing Gateway..." : `Pay ${formatInr(totalPayable)}`)
                  : "Get Full Script (Free)"}
              </button>

              <button
                type="button"
                onClick={() => navigate(scriptPath)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition ${t.btnSecondary}`}
              >
                Cancel
              </button>

              {successInfo && (
                <>
                  {successInfo.invoice?._id && (
                    <button
                      type="button"
                      onClick={() => handleInvoicePdfAction(successInfo.invoice, "download")}
                      disabled={invoiceActionLoading}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition ${t.btnSecondary}`}
                    >
                      {invoiceActionLoading ? "Preparing Invoice..." : "Download Invoice"}
                    </button>
                  )}
                  {successInfo.invoice?._id && (
                    <button
                      type="button"
                      onClick={() => handleInvoicePdfAction(successInfo.invoice, "open")}
                      disabled={invoiceActionLoading}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition ${t.btnSecondary}`}
                    >
                      Open Invoice
                    </button>
                  )}
                  {successInfo.purchaseRequestId && (
                    <button
                      type="button"
                      onClick={() => downloadAcceptancePdf(successInfo.purchaseRequestId)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition ${t.btnSecondary}`}
                    >
                      Download Accepted Terms PDF
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => navigate(scriptPath)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition ${t.btnSecondary}`}
                >
                  View Script
                </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
