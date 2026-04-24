// Helper functions for rights/license labels
const RIGHTS_TYPE_LABELS = {
  full_rights_sale: "Full Rights Sale (Ownership Transfer)",
  exclusive_license: "Exclusive License",
  custom_negotiation_required: "Custom Negotiation Required",
};
const MODIFICATION_LABELS = {
  buyer_can_modify_freely: "Buyer can modify freely",
  buyer_must_consult_writer: "Buyer must consult writer",
  writer_retains_creative_approval_rights: "Writer retains creative approval rights",
};
const PAYMENT_LABELS = {
  one_time_upfront_payment: "One-time upfront payment",
  lower_upfront_plus_royalty_percent: "Lower upfront + royalty %",
  revenue_sharing_model: "Revenue sharing model",
  custom_deal: "Custom deal",
};
const NEGOTIATION_LABELS = {
  fixed_terms_non_negotiable: "Fixed terms (non-negotiable)",
  open_to_discussion_after_purchase: "Open to discussion after purchase",
  ckript_not_involved: "Ckript not involved",
};

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { jsPDF } from "jspdf";
import { getApiBaseUrl } from "../utils/apiOrigin";
import { formatCurrency } from "../utils/currency";
import { resolveMediaUrl } from "../utils/mediaUrl";

const SCRIPT_LINES_PER_PAGE = 42;

const adminApi = axios.create({ baseURL: getApiBaseUrl() });

adminApi.interceptors.request.use((config) => {
  const adminSession = sessionStorage.getItem("admin-session");
  if (adminSession) {
    try {
      const { token } = JSON.parse(adminSession);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore malformed admin session and allow request to fail with 401.
    }
  }
  return config;
});

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPlainTextFromScriptContent = (content) => {
  const source = String(content || "");
  if (!source) return "";

  const maybeHtml = source.trimStart().startsWith("<");
  if (!maybeHtml) return source;

  // Convert common HTML boundaries to line breaks, then strip tags.
  return source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n");
};

const AdminScriptView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [script, setScript] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const hasAdminSession = useMemo(() => {
    const raw = sessionStorage.getItem("admin-session");
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.token);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!hasAdminSession) {
      navigate("/admin", { replace: true });
      return;
    }

    const fetchScript = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await adminApi.get(`/admin/scripts/${id}`);
        setScript(data);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          navigate("/admin", { replace: true });
          return;
        }
        setError(err?.response?.data?.message || "Failed to load project details.");
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [hasAdminSession, id, navigate]);

  const handleDelete = async () => {
    if (!script?._id || script?.isDeleted) return;
    const confirmed = window.confirm("Delete this project from platform listings?");
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      setNotice("");
      const { data } = await adminApi.delete(`/admin/scripts/${script._id}`);
      setScript((prev) => (prev ? { ...prev, isDeleted: true, deletedAt: new Date().toISOString() } : prev));
      setNotice(data?.message || "Project deleted successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete project.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const rawContent = typeof script?.textContent === "string" ? script.textContent : "";
  const writerCustomTerms = String(script?.legal?.customInvestorTerms || "").trim();
  const hasWriterCustomTerms = writerCustomTerms.length > 0;
  const plainScriptText = useMemo(() => getPlainTextFromScriptContent(rawContent), [rawContent]);
  const scriptPages = useMemo(() => {
    const normalized = plainScriptText.replace(/\r\n/g, "\n").trim();
    if (!normalized) return [];

    const lines = normalized.split("\n");
    const pages = [];
    for (let i = 0; i < lines.length; i += SCRIPT_LINES_PER_PAGE) {
      pages.push(lines.slice(i, i + SCRIPT_LINES_PER_PAGE).join("\n").trimEnd());
    }
    return pages;
  }, [plainScriptText]);

  const totalPages = scriptPages.length;
  const currentPage = totalPages > 0 ? scriptPages[Math.min(Math.max(activePage, 1), totalPages) - 1] : "";

  useEffect(() => {
    setActivePage(1);
  }, [script?._id, plainScriptText]);

  useEffect(() => {
    setPageInput(String(Math.min(Math.max(activePage, 1), Math.max(totalPages, 1))));
  }, [activePage, totalPages]);

  const handleJumpToPage = () => {
    if (!totalPages) return;
    const parsed = Number.parseInt(String(pageInput || "").trim(), 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(activePage));
      return;
    }
    const targetPage = Math.min(totalPages, Math.max(1, parsed));
    setActivePage(targetPage);
    setPageInput(String(targetPage));
  };

  const handleDownloadScript = () => {
    const normalized = plainScriptText.replace(/\r\n/g, "\n").trim();
    if (!normalized) return;

    const title = String(script?.title || "script").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    const filename = `${title || "script"}_full_script.pdf`;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 44;
    const topY = 54;
    const usableWidth = pageWidth - marginX * 2;

    const pdfPages = scriptPages.length > 0 ? scriptPages : [normalized];

    pdfPages.forEach((pageText, index) => {
      if (index > 0) doc.addPage("a4", "portrait");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(String(script?.title || "Script"), marginX, 32, { maxWidth: usableWidth });

      doc.setFont("courier", "normal");
      doc.setFontSize(11);
      const wrappedLines = doc.splitTextToSize(pageText || "", usableWidth);
      doc.text(wrappedLines, marginX, topY, { baseline: "top" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Page ${index + 1} / ${pdfPages.length}`, pageWidth - marginX, pageHeight - 24, {
        align: "right",
      });
    });

    doc.save(filename);
  };

  const handleOpenSubmissionSummaryPdf = () => {
    const pdfUrl = resolveMediaUrl(script?.submissionSummaryPdf?.url || "");
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadSubmissionSummaryPdf = async () => {
    if (!script?._id) return;

    try {
      const response = await adminApi.get(`/scripts/${script._id}/submission-summary-pdf?download=1`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      const safeTitle = String(script?.title || "script")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "") || "script";

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${safeTitle}_submission_summary.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to download submission PDF.");
    }
  };

  const openPdfBlob = (blob) => {
    const objectUrl = window.URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 15000);
  };

  const downloadPdfBlob = (blob, filename) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
  };

  const handlePurchaseAcceptancePdf = async (requestId, title, action = "open") => {
    if (!requestId) return;

    try {
      const response = await adminApi.get(`/scripts/purchase-request/${requestId}/acceptance-pdf${action === "download" ? "?download=1" : ""}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const safeTitle = String(title || "purchase-request")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "") || "purchase-request";

      if (action === "download") {
        downloadPdfBlob(blob, `${safeTitle}_buyer_acceptance.pdf`);
        return;
      }

      openPdfBlob(blob);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to open buyer acceptance PDF.");
    }
  };

  const handleAgreementPdf = async (agreementId, party = "buyer", action = "open") => {
    if (!agreementId) return;

    try {
      const suffix = action === "download" ? "&download=1" : "";
      const response = await adminApi.get(`/agreements/${agreementId}/pdf?party=${party}${suffix}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const filename = `agreement_${agreementId}_${party}.pdf`;

      if (action === "download") {
        downloadPdfBlob(blob, filename);
        return;
      }

      openPdfBlob(blob);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to open agreement PDF.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b16] text-white flex items-center justify-center px-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/15 border-t-white/80 animate-spin" />
      </div>
    );
  }

  if (error && !script) {
    return (
      <div className="min-h-screen bg-[#050b16] text-white px-4 py-10">
        <div className="max-w-4xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-red-200 text-sm font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b16] text-white px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-5">
                {/* Rights & Licensing Section */}
                <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Writer Rights & Licensing</p>
                    <p className="text-xs text-white/60">Rights and licensing preferences set by the writer during script upload.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Rights Type</p>
                      <p className="text-xs text-white/85">{RIGHTS_TYPE_LABELS[script?.rightsLicensing?.rightsType] || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Exclusivity</p>
                      <p className="text-xs text-white/85">{script?.rightsLicensing?.exclusivity ? "Exclusive" : "Non-exclusive"}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">License Duration (months)</p>
                      <p className="text-xs text-white/85">{script?.rightsLicensing?.timeBound?.licenseDurationMonths || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Modification Rights</p>
                      <p className="text-xs text-white/85">{MODIFICATION_LABELS[script?.rightsLicensing?.modificationRights] || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Payment Structure</p>
                      <p className="text-xs text-white/85">{PAYMENT_LABELS[script?.rightsLicensing?.paymentStructure] || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Royalty %</p>
                      <p className="text-xs text-white/85">{script?.rightsLicensing?.royaltySettings?.percentage || 0}%</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Royalty Duration</p>
                      <p className="text-xs text-white/85">{script?.rightsLicensing?.royaltySettings?.durationType === "years" ? `${script?.rightsLicensing?.royaltySettings?.durationYears} years` : (script?.rightsLicensing?.royaltySettings?.durationType === "project_lifetime" ? "Project lifetime" : "-")}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Negotiation Mode</p>
                      <p className="text-xs text-white/85">{NEGOTIATION_LABELS[script?.rightsLicensing?.negotiationMode] || "-"}</p>
                    </div>
                  </div>
                  {script?.rightsLicensing?.customConditions && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mt-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/45 mb-2">Custom Conditions</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/90">{script.rightsLicensing.customConditions}</p>
                    </div>
                  )}
                </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold"
            >
              Back
            </button>
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold"
            >
              Admin Dashboard
            </Link>
          </div>

          {!script?.isDeleted && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="px-4 py-2 rounded-lg border border-red-400/30 bg-red-500/15 hover:bg-red-500/25 text-red-100 text-xs sm:text-sm font-bold disabled:opacity-60"
            >
              {deleteLoading ? "Deleting..." : "Delete Project"}
            </button>
          )}
        </div>

        {notice && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] overflow-hidden">
          {(script?.coverImage || script?.trailerThumbnail) && (
            <div className="h-52 sm:h-72 bg-black/30">
              <img
                src={resolveMediaUrl(script?.trailerThumbnail || script?.coverImage)}
                alt={script?.title || "Project cover"}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-5 sm:p-7 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight break-words">{script?.title || "Untitled"}</h1>
                <p className="text-sm text-white/65 mt-1">Writer: {script?.creator?.name || "Unknown"}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5">{script?.status || "-"}</span>
                <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5">{script?.format || "-"}</span>
                <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5">{formatCurrency(script?.price || 0)} INR</span>
                {script?.isDeleted && (
                  <span className="px-2.5 py-1 rounded-lg border border-red-400/35 bg-red-500/20 text-red-100">Deleted</span>
                )}
              </div>
            </div>

            {script?.logline && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-2">Logline</p>
                <p className="text-sm text-white/85 italic">{script.logline}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Project ID</p>
                <p className="text-xs text-white/80 break-all">{script?.sid || script?._id || "-"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Created</p>
                <p className="text-xs text-white/80">{formatDateTime(script?.createdAt)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Published</p>
                <p className="text-xs text-white/80">{formatDateTime(script?.publishedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7">
          <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-3">Full Synopsis</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/90">
            {script?.synopsis || "No synopsis provided."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Writer Terms & Conditions</p>
            <p className="text-xs text-white/60">Terms accepted by the writer during script upload.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Terms Accepted</p>
              <p className="text-xs text-white/85">{script?.legal?.agreedToTerms ? "Yes" : "No"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Terms Version</p>
              <p className="text-xs text-white/85 break-all">{script?.legal?.termsVersion || "-"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Accepted At</p>
              <p className="text-xs text-white/85">{formatDateTime(script?.legal?.timestamp)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Custom Terms Updated</p>
              <p className="text-xs text-white/85">{formatDateTime(script?.legal?.customInvestorTermsUpdatedAt)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/45 mb-2">Custom Terms For Film Industry Professionals</p>
            {hasWriterCustomTerms ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/90">{writerCustomTerms}</p>
            ) : (
              <p className="text-sm text-white/60">Writer did not add custom terms.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Legal PDF Records</p>
            <p className="text-xs text-white/60">Dedicated admin section for saved writer terms PDFs and film industry professional acceptance PDFs.</p>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white/90">Writer Terms & Conditions PDF</p>
                  <p className="text-xs text-white/55 mt-1">Saved from the writer side while uploading the script, including pricing, rights, licensing, and legal acceptance.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenSubmissionSummaryPdf}
                    disabled={!script?.submissionSummaryPdf?.url}
                    className="px-3 py-1.5 rounded-lg border border-blue-400/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Open Writer PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSubmissionSummaryPdf}
                    disabled={!script?.submissionSummaryPdf?.url}
                    className="px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Download Writer PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-white/10 bg-[#0b1322] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Status</p>
                  <p className="text-xs text-white/85">{script?.submissionSummaryPdf?.url ? "Saved in admin records" : "Not available"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0b1322] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Generated At</p>
                  <p className="text-xs text-white/85">{formatDateTime(script?.submissionSummaryPdf?.generatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-white/90">Film Industry Professional Terms Acceptance PDFs</p>
                <p className="text-xs text-white/55 mt-1">Saved after the investor / producer / director / professional accepts terms and conditions for full script access.</p>
              </div>

              {Array.isArray(script?.settledPurchaseRequests) && script.settledPurchaseRequests.length > 0 ? (
                <div className="space-y-3">
                  {script.settledPurchaseRequests.map((request) => (
                    <div key={request._id} className="rounded-xl border border-white/10 bg-[#0b1322] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white/90">{request?.investor?.name || "Buyer"}</p>
                          <p className="text-xs text-white/55 mt-1">
                            {request?.investor?.email || "-"} · {request?.investor?.role || "-"}
                          </p>
                          <p className="text-xs text-white/45 mt-1">
                            Settled {formatDateTime(request?.settledAt || request?.updatedAt)} · {formatCurrency(request?.amount || 0)} INR
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handlePurchaseAcceptancePdf(request._id, script?.title, "open")}
                            disabled={!request?.acceptancePdf?.url}
                            className="px-3 py-1.5 rounded-lg border border-blue-400/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Open Accepted Terms PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePurchaseAcceptancePdf(request._id, script?.title, "download")}
                            disabled={!request?.acceptancePdf?.url}
                            className="px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Download Accepted Terms PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAgreementPdf(request?.agreement?._id, "buyer", "open")}
                            disabled={!request?.agreement?._id || !request?.agreement?.buyerPdfUrl}
                            className="px-3 py-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Open Final Agreement
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">No film industry professional acceptance PDFs are available for this script yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45">Main Script</p>
            <div className="flex items-center gap-2">
              {totalPages > 0 && (
                <p className="text-xs text-white/45">
                  Page {Math.min(activePage, totalPages)} / {totalPages}
                </p>
              )}
              <button
                type="button"
                onClick={handleDownloadScript}
                disabled={!plainScriptText.trim()}
                className="px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download
              </button>
            </div>
          </div>

          {currentPage ? (
            <>
              <div className="mx-auto w-full max-w-[794px] aspect-[210/297] bg-white text-slate-900 rounded-md shadow-[0_18px_48px_rgba(0,0,0,0.35)] border border-slate-200 overflow-hidden">
                <div className="h-full p-6 sm:p-10 lg:p-12 overflow-hidden">
                  <pre
                    className="h-full whitespace-pre-wrap break-words text-[13px] sm:text-[14px] leading-[1.55]"
                    style={{ fontFamily: '"Courier Prime", "Courier New", Courier, monospace' }}
                  >
                    {currentPage}
                  </pre>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="admin-script-page-search" className="text-xs text-white/70 font-medium">
                      Go to page
                    </label>
                    <input
                      id="admin-script-page-search"
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInput}
                      onChange={(event) => setPageInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleJumpToPage();
                        }
                      }}
                      className="w-24 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                    />
                    <button
                      type="button"
                      onClick={handleJumpToPage}
                      className="px-3 py-1.5 rounded-lg border border-blue-400/40 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 text-xs font-semibold"
                    >
                      Open
                    </button>
                    <span className="text-xs text-white/50">of {totalPages}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePage((prev) => Math.max(1, prev - 1))}
                    disabled={activePage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="text-xs text-white/60 font-medium">Showing script page-wise preview</div>
                  <button
                    type="button"
                    onClick={() => setActivePage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={activePage >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-white/55">No script body found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminScriptView;
