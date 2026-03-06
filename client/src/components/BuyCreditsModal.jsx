import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Zap,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Crown,
  Rocket,
  Gift,
  Shield,
  CreditCard,
  ArrowRight,
  Loader2,
  AlertCircle,
  Star,
  Lock,
  RefreshCw,
} from "lucide-react";
import api from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";

const BuyCreditsModal = ({ isOpen, onClose, onSuccess }) => {
  const { isDarkMode: dark } = useDarkMode();
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const modalRef = useRef(null);

  // Load Razorpay SDK
  useEffect(() => {
    if (document.querySelector('script[src*="razorpay"]')) {
      setRazorpayLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => setError("Failed to load payment gateway");
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
      setError("");
      setSuccess(false);
      setSelectedPackage(null);
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isOpen && !purchasing) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, purchasing, onClose]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/credits/packages");
      setPackages(data);
      // Auto-select popular package
      const popular = data.find((p) => p.popular);
      if (popular) setSelectedPackage(popular);
    } catch {
      setError("Failed to load credit packages. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      setError("Please select a credit package");
      return;
    }
    if (!razorpayLoaded) {
      setError("Payment gateway is loading. Please wait and try again.");
      return;
    }

    try {
      setPurchasing(true);
      setError("");

      const { data: orderData } = await api.post("/credits/create-order", {
        packageId: selectedPackage._id,
      });

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Ckript",
        description: `${orderData.packageDetails.name} — ${orderData.packageDetails.totalCredits} Credits`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            const { data: verifyData } = await api.post(
              "/credits/verify-payment",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                packageId: selectedPackage._id,
              }
            );

            if (verifyData.success) {
              setSuccess(true);
              if (onSuccess) onSuccess(verifyData);
              setTimeout(() => onClose(), 2000);
            } else {
              setError("Payment verification failed. Contact support if charged.");
            }
          } catch (err) {
            setError(
              err.response?.data?.message ||
                "Payment verification failed. Contact support if charged."
            );
          } finally {
            setPurchasing(false);
          }
        },
        prefill: {},
        notes: {
          package: selectedPackage.name,
          credits: orderData.packageDetails.totalCredits,
        },
        theme: { color: "#3b82f6" },
        modal: {
          ondismiss: function () {
            setPurchasing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        setPurchasing(false);
        setError(
          response.error?.description || "Payment failed. Please try again."
        );
      });
      razorpay.open();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to initiate payment. Please try again."
      );
      setPurchasing(false);
    }
  };

  const getIcon = (name) => {
    if (name?.includes("Starter")) return Zap;
    if (name?.includes("Professional")) return TrendingUp;
    if (name?.includes("Premium")) return Crown;
    if (name?.includes("Enterprise")) return Rocket;
    return Sparkles;
  };

  const getCurrency = (c) => {
    const map = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
    return map[c] || "₹";
  };

  const getGradient = (name) => {
    if (name?.includes("Starter"))
      return dark
        ? "from-blue-500/20 to-cyan-500/10"
        : "from-blue-50 to-cyan-50";
    if (name?.includes("Professional"))
      return dark
        ? "from-violet-500/20 to-purple-500/10"
        : "from-violet-50 to-purple-50";
    if (name?.includes("Premium"))
      return dark
        ? "from-amber-500/20 to-yellow-500/10"
        : "from-amber-50 to-yellow-50";
    if (name?.includes("Enterprise"))
      return dark
        ? "from-rose-500/20 to-pink-500/10"
        : "from-rose-50 to-pink-50";
    return dark ? "from-gray-500/20 to-gray-500/10" : "from-gray-50 to-gray-50";
  };

  const getAccent = (name) => {
    if (name?.includes("Starter"))
      return dark ? "text-cyan-400" : "text-blue-600";
    if (name?.includes("Professional"))
      return dark ? "text-violet-400" : "text-violet-600";
    if (name?.includes("Premium"))
      return dark ? "text-amber-400" : "text-amber-600";
    if (name?.includes("Enterprise"))
      return dark ? "text-rose-400" : "text-rose-600";
    return dark ? "text-blue-400" : "text-blue-600";
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !purchasing) onClose();
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl border overflow-hidden flex flex-col ${
            dark
              ? "bg-[#0c1525] border-white/[0.08]"
              : "bg-white border-gray-200"
          }`}
        >
          {/* ─── Success Overlay ────────────────────── */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-lg font-black text-white">
                    Credits Added Successfully!
                  </p>
                  <p className="text-sm text-white/60">
                    Your credits are now available to use
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Header ─────────────────────────────── */}
          <div
            className={`px-6 py-5 border-b flex items-center justify-between shrink-0 ${
              dark
                ? "border-white/[0.06] bg-gradient-to-r from-blue-600/5 to-purple-600/5"
                : "border-gray-100 bg-gradient-to-r from-blue-50/50 to-purple-50/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  dark
                    ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20"
                    : "bg-gradient-to-br from-blue-100 to-purple-100"
                }`}
              >
                <CreditCard
                  className={`w-5 h-5 ${
                    dark ? "text-blue-400" : "text-blue-600"
                  }`}
                />
              </div>
              <div>
                <h2
                  className={`text-xl font-black ${
                    dark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Buy Credits
                </h2>
                <p
                  className={`text-xs mt-0.5 ${
                    dark ? "text-white/40" : "text-gray-500"
                  }`}
                >
                  Choose a plan that works for you
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={purchasing}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                dark
                  ? "hover:bg-white/10 text-white/40 hover:text-white/70"
                  : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              } disabled:opacity-40`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ─── Content ────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2
                  className={`w-8 h-8 animate-spin ${
                    dark ? "text-white/30" : "text-gray-400"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    dark ? "text-white/40" : "text-gray-500"
                  }`}
                >
                  Loading packages...
                </p>
              </div>
            ) : (
              <>
                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mb-5 px-4 py-3 rounded-xl flex items-start gap-3 ${
                        dark
                          ? "bg-red-500/10 border border-red-500/20"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <AlertCircle
                        className={`w-5 h-5 shrink-0 mt-0.5 ${
                          dark ? "text-red-400" : "text-red-500"
                        }`}
                      />
                      <div className="flex-1">
                        <p
                          className={`text-sm font-semibold ${
                            dark ? "text-red-300" : "text-red-700"
                          }`}
                        >
                          {error}
                        </p>
                      </div>
                      <button
                        onClick={() => setError("")}
                        className={`shrink-0 ${
                          dark ? "text-red-400/60" : "text-red-400"
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Package Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {packages.map((pkg, idx) => {
                    const Icon = getIcon(pkg.name);
                    const isSelected = selectedPackage?._id === pkg._id;
                    const total = pkg.credits + (pkg.bonusCredits || 0);
                    const perCredit = (pkg.price / total).toFixed(1);
                    const sym = getCurrency(pkg.currency || "INR");

                    return (
                      <motion.div
                        key={pkg._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative rounded-2xl border cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? dark
                              ? "border-blue-500 bg-blue-500/[0.08] ring-1 ring-blue-500/30 shadow-lg shadow-blue-500/10"
                              : "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/10"
                            : dark
                            ? "border-white/[0.06] hover:border-white/[0.15] bg-white/[0.02]"
                            : "border-gray-200 hover:border-gray-300 bg-white hover:shadow-md"
                        }`}
                      >
                        {/* Popular ribbon */}
                        {pkg.popular && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                            <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                              <Star className="w-3 h-3" />
                              Best Value
                            </div>
                          </div>
                        )}

                        <div className="p-5">
                          {/* Icon + Name */}
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${getGradient(
                              pkg.name
                            )}`}
                          >
                            <Icon
                              className={`w-6 h-6 ${getAccent(pkg.name)}`}
                            />
                          </div>

                          <h3
                            className={`text-base font-black mb-1 ${
                              dark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {pkg.name}
                          </h3>

                          {/* Credits count */}
                          <div className="mb-3">
                            <div className="flex items-baseline gap-1.5">
                              <span
                                className={`text-2xl font-black tabular-nums ${
                                  dark ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {total}
                              </span>
                              <span
                                className={`text-xs font-semibold ${
                                  dark ? "text-white/40" : "text-gray-500"
                                }`}
                              >
                                credits
                              </span>
                            </div>
                            {pkg.bonusCredits > 0 && (
                              <div
                                className={`flex items-center gap-1 mt-1 text-[11px] font-bold ${
                                  dark ? "text-emerald-400" : "text-emerald-600"
                                }`}
                              >
                                <Gift className="w-3 h-3" />+
                                {pkg.bonusCredits} bonus included
                              </div>
                            )}
                          </div>

                          {/* Price */}
                          <div className="mb-3">
                            <div className="flex items-baseline gap-1">
                              <span
                                className={`text-xl font-black ${
                                  dark ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {sym}
                                {pkg.price.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <span
                              className={`text-[11px] font-medium ${
                                dark ? "text-white/30" : "text-gray-400"
                              }`}
                            >
                              {sym}
                              {perCredit}/credit
                            </span>
                          </div>

                          {/* Features */}
                          {pkg.features?.length > 0 && (
                            <ul className="space-y-1.5 mb-3">
                              {pkg.features.slice(0, 3).map((f, i) => (
                                <li
                                  key={i}
                                  className={`flex items-start gap-2 text-[11px] leading-tight ${
                                    dark ? "text-white/50" : "text-gray-600"
                                  }`}
                                >
                                  <CheckCircle2
                                    className={`w-3.5 h-3.5 shrink-0 mt-px ${
                                      dark
                                        ? "text-emerald-400/70"
                                        : "text-emerald-500"
                                    }`}
                                  />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Selection indicator */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-3 right-3"
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                  {[
                    { icon: Shield, text: "Secure Payment" },
                    { icon: Lock, text: "256-bit Encryption" },
                    { icon: RefreshCw, text: "Instant Credits" },
                  ].map(({ icon: TrustIcon, text }) => (
                    <div
                      key={text}
                      className={`flex items-center gap-1.5 text-xs font-medium ${
                        dark ? "text-white/30" : "text-gray-400"
                      }`}
                    >
                      <TrustIcon className="w-3.5 h-3.5" />
                      {text}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ─── Footer ─────────────────────────────── */}
          <div
            className={`px-6 py-4 border-t flex items-center justify-between shrink-0 ${
              dark
                ? "border-white/[0.06] bg-white/[0.02]"
                : "border-gray-100 bg-gray-50/50"
            }`}
          >
            <div>
              {selectedPackage && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      dark ? "text-white/40" : "text-gray-500"
                    }`}
                  >
                    Total:
                  </span>
                  <span
                    className={`text-lg font-black ${
                      dark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {getCurrency(selectedPackage.currency || "INR")}
                    {selectedPackage.price.toLocaleString("en-IN")}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      dark
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {selectedPackage.credits +
                      (selectedPackage.bonusCredits || 0)}{" "}
                    credits
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={purchasing}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  dark
                    ? "bg-white/[0.05] text-white/60 hover:bg-white/[0.10]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } disabled:opacity-40`}
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePurchase}
                disabled={!selectedPackage || purchasing}
                className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay Now
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BuyCreditsModal;
