import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Zap,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Crown,
  Rocket,
  Gift
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
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/credits/packages");
      setPackages(data);
    } catch (err) {
      setError("Failed to load credit packages");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !razorpayLoaded) {
      setError("Payment system not ready. Please try again.");
      return;
    }

    try {
      setPurchasing(true);
      setError("");
      
      // Create Razorpay order
      const { data: orderData } = await api.post("/credits/create-order", {
        packageId: selectedPackage._id
      });

      // Configure Razorpay checkout options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ScriptBridge",
        description: `Purchase ${orderData.packageDetails.name}`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            // Verify payment on backend
            const { data: verifyData } = await api.post("/credits/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              packageId: selectedPackage._id
            });

            if (verifyData.success) {
              if (onSuccess) {
                onSuccess(verifyData);
              }
              onClose();
            } else {
              setError("Payment verification failed");
            }
          } catch (err) {
            setError(err.response?.data?.message || "Payment verification failed");
          } finally {
            setPurchasing(false);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: ""
        },
        notes: {
          package: selectedPackage.name,
          credits: orderData.packageDetails.totalCredits
        },
        theme: {
          color: dark ? "#3b82f6" : "#1e3a5f"
        },
        modal: {
          ondismiss: function() {
            setPurchasing(false);
            setError("Payment cancelled");
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate payment");
      setPurchasing(false);
    }
  };

  const getPackageIcon = (name) => {
    if (name.includes("Starter")) return Zap;
    if (name.includes("Professional")) return TrendingUp;
    if (name.includes("Premium")) return Crown;
    if (name.includes("Enterprise")) return Rocket;
    return Sparkles;
  };

  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case "INR": return "₹";
      case "USD": return "$";
      case "EUR": return "€";
      case "GBP": return "£";
      default: return "$";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`rounded-2xl border w-full max-w-5xl max-h-[90vh] overflow-hidden ${
          dark ? "bg-[#0d1829] border-white/[0.06]" : "bg-white border-gray-200"
        }`}
      >
        {/* Header */}
        <div
          className={`px-8 py-6 border-b flex items-center justify-between ${
            dark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-200 bg-gray-50/50"
          }`}
        >
          <div>
            <h2 className={`text-2xl font-black ${dark ? "text-white" : "text-gray-900"}`}>
              Buy Credits
            </h2>
            <p className={`text-sm mt-1 ${dark ? "text-white/40" : "text-gray-500"}`}>
              Choose a package to power your creative workflow
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              dark
                ? "hover:bg-white/10 text-white/60"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className={`w-8 h-8 border-3 rounded-full animate-spin ${
                  dark
                    ? "border-white/10 border-t-white/50"
                    : "border-gray-200 border-t-[#1e3a5f]"
                }`}
              />
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div
                  className={`mb-6 px-4 py-3 rounded-xl ${
                    dark
                      ? "bg-red-500/10 border border-red-500/20 text-red-400"
                      : "bg-red-50 border border-red-200 text-red-600"
                  }`}
                >
                  {error}
                </div>
              )}

              {/* Packages Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {packages.map((pkg) => {
                  const Icon = getPackageIcon(pkg.name);
                  const isSelected = selectedPackage?._id === pkg._id;
                  const totalCredits = pkg.credits + (pkg.bonusCredits || 0);
                  const pricePerCredit = (pkg.price / totalCredits).toFixed(2);
                  const currencySymbol = getCurrencySymbol(pkg.currency || "USD");

                  return (
                    <motion.div
                      key={pkg._id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`relative rounded-2xl border p-6 cursor-pointer transition-all ${
                        isSelected
                          ? dark
                            ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                            : "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20"
                          : dark
                          ? "border-white/[0.06] hover:border-white/20 bg-white/[0.02]"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {/* Popular Badge */}
                      {pkg.popular && (
                        <div
                          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${
                            dark
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                              : "bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900"
                          }`}
                        >
                          MOST POPULAR
                        </div>
                      )}

                      {/* Icon */}
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                          dark
                            ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20"
                            : "bg-gradient-to-br from-blue-50 to-purple-50"
                        }`}
                      >
                        <Icon
                          className={`w-7 h-7 ${dark ? "text-blue-400" : "text-blue-600"}`}
                        />
                      </div>

                      {/* Package Name */}
                      <h3
                        className={`text-lg font-black mb-2 ${
                          dark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {pkg.name}
                      </h3>

                      {/* Credits */}
                      <div className="mb-3">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-3xl font-black ${
                              dark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {totalCredits}
                          </span>
                          <span className={`text-sm ${dark ? "text-white/40" : "text-gray-500"}`}>
                            credits
                          </span>
                        </div>
                        {pkg.bonusCredits > 0 && (
                          <div
                            className={`flex items-center gap-1 mt-1 text-xs font-semibold ${
                              dark ? "text-green-400" : "text-green-600"
                            }`}
                          >
                            <Gift className="w-3 h-3" />
                            +{pkg.bonusCredits} bonus
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-2xl font-black ${
                              dark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {currencySymbol}{pkg.price}
                          </span>
                          <span className={`text-sm ${dark ? "text-white/40" : "text-gray-500"}`}>
                            {pkg.currency || "USD"}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 ${dark ? "text-white/30" : "text-gray-400"}`}>
                          {currencySymbol}{pricePerCredit} per credit
                        </p>
                      </div>

                      {/* Description */}
                      <p
                        className={`text-xs mb-4 ${dark ? "text-white/50" : "text-gray-600"}`}
                      >
                        {pkg.description}
                      </p>

                      {/* Features */}
                      {pkg.features && pkg.features.length > 0 && (
                        <ul className="space-y-2">
                          {pkg.features.map((feature, idx) => (
                            <li
                              key={idx}
                              className={`flex items-start gap-2 text-xs ${
                                dark ? "text-white/60" : "text-gray-600"
                              }`}
                            >
                              <CheckCircle2
                                className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  dark ? "text-green-400" : "text-green-500"
                                }`}
                              />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Selected Badge */}
                      {isSelected && (
                        <div
                          className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center ${
                            dark ? "bg-blue-500" : "bg-blue-600"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Service Pricing Info */}
              <div
                className={`rounded-xl p-4 ${
                  dark
                    ? "bg-white/[0.03] border border-white/[0.06]"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <h4
                  className={`text-sm font-bold mb-3 ${dark ? "text-white" : "text-gray-900"}`}
                >
                  What can you do with credits?
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        dark ? "bg-white/10" : "bg-white"
                      }`}
                    >
                      <Zap className={`w-4 h-4 ${dark ? "text-yellow-400" : "text-yellow-500"}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
                        AI Script Evaluation
                      </p>
                      <p className={`text-xs ${dark ? "text-white/40" : "text-gray-500"}`}>
                        10 credits per evaluation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        dark ? "bg-white/10" : "bg-white"
                      }`}
                    >
                      <Sparkles
                        className={`w-4 h-4 ${dark ? "text-purple-400" : "text-purple-500"}`}
                      />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
                        AI Trailer Generation
                      </p>
                      <p className={`text-xs ${dark ? "text-white/40" : "text-gray-500"}`}>
                        15 credits per trailer
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-8 py-5 border-t flex items-center justify-between ${
            dark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-200 bg-gray-50/50"
          }`}
        >
          <div>
            {selectedPackage && (
              <p className={`text-sm ${dark ? "text-white/60" : "text-gray-600"}`}>
                Selected:{" "}
                <span className="font-bold">
                  {selectedPackage.name} - {getCurrencySymbol(selectedPackage.currency || "USD")}{selectedPackage.price}
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={purchasing}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                dark
                  ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.10]"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={!selectedPackage || purchasing}
              className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                dark
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {purchasing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Purchase Credits
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BuyCreditsModal;
