import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";

const RazorpayScriptPayment = ({
  isOpen,
  onClose,
  script,
  type = "purchase", // "purchase" or "hold"
  onSuccess,
}) => {
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setRazorpayReady(Boolean(window.Razorpay));

    if (window.Razorpay) return undefined;

    const sdkScript = document.createElement("script");
    sdkScript.src = "https://checkout.razorpay.com/v1/checkout.js";
    sdkScript.async = true;
    sdkScript.onload = () => setRazorpayReady(true);
    sdkScript.onerror = () => {
      setRazorpayReady(false);
      setError(
        "Payment SDK failed to load. Disable ad blocker/privacy extension for checkout.razorpay.com and try again."
      );
    };
    document.body.appendChild(sdkScript);

    return () => {
      if (sdkScript.parentNode) {
        sdkScript.parentNode.removeChild(sdkScript);
      }
    };
  }, [isOpen]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError("");

      if (!window.Razorpay || !razorpayReady) {
        setError(
          "Payment SDK is blocked or not ready. Disable blocker for checkout.razorpay.com, then retry."
        );
        setLoading(false);
        return;
      }

      const orderEndpoint =
        type === "purchase" ? "/scripts/purchase/create-order" : "/scripts/hold/create-order";

      const verifyEndpoint =
        type === "purchase"
          ? "/scripts/purchase/verify-payment"
          : "/scripts/hold/verify-payment";

      // Create order
      const { data: orderData } = await api.post(orderEndpoint, {
        scriptId: script._id,
      });

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ckript",
        description:
          type === "purchase"
          ? `Purchase: ${script.title}`
          : `Place Hold: ${script.title}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            // Verify payment on backend
            const { data: verifyData } = await api.post(verifyEndpoint, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              scriptId: script._id,
            });

            if (verifyData.success) {
              onSuccess(verifyData);
              onClose();
            } else {
              setError("Payment verification failed. Please contact support.");
            }
          } catch (err) {
            console.error("Payment verification error:", err);
            setError(err.response?.data?.message || "Payment verification failed");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#1e3a5f",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error("Payment initiation error:", err);
      setError(err.response?.data?.message || "Failed to initiate payment");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const amount = type === "purchase" ? script.price : script.holdFee || 200;
  const title = type === "purchase" ? "Purchase Script" : "Place Hold";
  const description = type === "purchase"
    ? "Get full access to this script immediately after payment"
    : "Place a 30-day exclusive hold on this script";

  const t = {
    overlay: "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4",
    modal: isDarkMode
      ? "bg-[#0d1829] border border-white/[0.08] rounded-2xl shadow-2xl max-w-md w-full"
      : "bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-md w-full",
    title: isDarkMode ? "text-white" : "text-gray-900",
    text: isDarkMode ? "text-neutral-300" : "text-gray-600",
    muted: isDarkMode ? "text-neutral-500" : "text-gray-400",
    divider: isDarkMode ? "border-white/[0.06]" : "border-gray-100",
    infoRow: isDarkMode
      ? "bg-white/[0.03] border border-white/[0.05]"
      : "bg-gray-50 border border-gray-200",
    btnPrimary: "bg-[#1e3a5f] hover:bg-[#254a75] text-white",
    btnSecondary: isDarkMode
      ? "bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1]"
      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    error: "bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={t.overlay}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={t.modal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-xl font-bold ${t.title}`}>{title}</h2>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition ${t.btnSecondary}`}
                disabled={loading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className={`text-sm ${t.muted}`}>{description}</p>
          </div>

          {/* Content */}
          <div className={`px-6 pb-6 space-y-4 border-t ${t.divider} pt-4`}>
            {/* Script Info */}
            <div className={`rounded-xl p-4 ${t.infoRow}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${t.muted}`}>Script</p>
              <h3 className={`font-bold mb-1 ${t.title}`}>{script.title}</h3>
              <p className={`text-sm ${t.text}`}>
                by {script.creator?.name || "Unknown Author"}
              </p>
            </div>

            {/* Amount */}
            <div className={`rounded-xl p-4 ${t.infoRow}`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${t.muted}`}>Amount</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${t.title}`}>₹{amount}</span>
                <span className={`text-sm ${t.muted}`}>INR</span>
              </div>
              {type === "hold" && (
                <p className={`text-xs mt-2 ${t.muted}`}>
                  Valid for 30 days • 90% goes to creator
                </p>
              )}
              {type === "purchase" && (
                <p className={`text-xs mt-2 ${t.muted}`}>
                  One-time payment • Full access forever
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className={t.error}>
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className={`text-xs ${t.muted} space-y-1`}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Secured by Razorpay</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>All major cards, UPI, Net Banking accepted</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={loading}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition disabled:opacity-50 ${t.btnSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={loading || !razorpayReady}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm transition disabled:opacity-50 shadow-lg ${t.btnPrimary}`}
              >
                {!razorpayReady ? (
                  "Preparing payment..."
                ) : loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Pay ₹${amount}`
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RazorpayScriptPayment;
