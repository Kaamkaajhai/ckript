import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  CreditCard, 
  Shield, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  AlertCircle,
  Save,
  Edit2,
  Trash2,
  Globe2,
  Info
} from "lucide-react";
import api from "../services/api";

const ACCOUNT_NUMBER_REGEX = /^\d{8,20}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const GENERIC_ROUTING_REGEX = /^[A-Z0-9-]{4,20}$/;

const BankDetails = ({ dark }) => {
  const [bankDetails, setBankDetails] = useState(null);
  const [bankDetailsReview, setBankDetailsReview] = useState({ status: "not_submitted" });
  const [bankDetailsSecurity, setBankDetailsSecurity] = useState({ invalidAttempts: 0, isLocked: false });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    accountType: "checking",
    swiftCode: "",
    iban: "",
    country: "IN",
    currency: "INR"
  });

  const applyBankDetailsToForm = (details = {}) => {
    setFormData((prev) => ({
      ...prev,
      accountHolderName: details.accountHolderName || "",
      bankName: details.bankName || "",
      accountNumber: "",
      routingNumber: details.routingNumber || "",
      accountType: details.accountType || "checking",
      swiftCode: details.swiftCode || "",
      iban: details.iban || "",
      country: details.country || "IN",
      currency: details.currency || "INR",
    }));
  };

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/transactions/bank-details");
      const review = data.bankDetailsReview || { status: "not_submitted" };
      setBankDetailsReview(review);
      setBankDetailsSecurity(data.bankDetailsSecurity || { invalidAttempts: 0, isLocked: false });
      if (data.bankDetails) {
        setBankDetails(data.bankDetails);
        applyBankDetailsToForm(data.bankDetails);
      } else if (review?.requestedDetails) {
        applyBankDetailsToForm(review.requestedDetails);
      }

      if (!data.bankDetails && review?.status === "not_submitted") {
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load bank details");
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const normalizedAccountNumber = String(formData.accountNumber || "").replace(/\s+/g, "");
    const normalizedRoutingNumber = String(formData.routingNumber || "").replace(/\s+/g, "").toUpperCase();
    const normalizedCountry = String(formData.country || "IN").trim().toUpperCase();

    if (!ACCOUNT_NUMBER_REGEX.test(normalizedAccountNumber)) {
      setError("Account number must be 8-20 digits");
      setSaving(false);
      return;
    }

    if (!normalizedRoutingNumber) {
      setError("Routing / IFSC number is required");
      setSaving(false);
      return;
    }

    if (normalizedCountry === "IN") {
      if (!IFSC_REGEX.test(normalizedRoutingNumber)) {
        setError("Please enter a valid IFSC code (example: HDFC0001234)");
        setSaving(false);
        return;
      }
    } else if (!GENERIC_ROUTING_REGEX.test(normalizedRoutingNumber)) {
      setError("Routing number must be 4-20 letters, numbers, or hyphen");
      setSaving(false);
      return;
    }

    const payload = {
      ...formData,
      accountNumber: normalizedAccountNumber,
      routingNumber: normalizedRoutingNumber,
      country: normalizedCountry,
      currency: String(formData.currency || "INR").trim().toUpperCase(),
    };

    try {
      const { data } = await api.put("/transactions/bank-details", payload);
      setBankDetails(data.bankDetails);
      setBankDetailsReview(data.bankDetailsReview || { status: "pending" });
      setBankDetailsSecurity(data.bankDetailsSecurity || { invalidAttempts: 0, isLocked: false });
      setSuccess(data.message || "Bank details submitted for review");
      setIsEditing(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save bank details");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    if (bankDetails) {
      applyBankDetailsToForm(bankDetails);
      setIsEditing(false);
    } else if (bankDetailsReview?.requestedDetails) {
      applyBankDetailsToForm(bankDetailsReview.requestedDetails);
      setIsEditing(false);
    }
    setError("");
  };

  const reviewStatus = bankDetailsReview?.status || "not_submitted";
  const isBankLocked = Boolean(bankDetailsSecurity?.isLocked);
  const hasPendingReview = reviewStatus === "pending";
  const isReviewRejected = reviewStatus === "rejected";
  const reviewDueAtText = bankDetailsReview?.dueAt
    ? new Date(bankDetailsReview.dueAt).toLocaleString()
    : "within 2 days";

  if (loading) {
    return (
      <div className={`rounded-2xl p-8 border ${
        dark ? "bg-[#0d1829] border-white/[0.06]" : "bg-white border-gray-200"
      }`}>
        <div className="flex items-center justify-center h-48">
          <div className={`w-8 h-8 border-3 rounded-full animate-spin ${
            dark 
              ? "border-white/10 border-t-white/50" 
              : "border-gray-200 border-t-[#1e3a5f]"
          }`} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${
        dark ? "bg-[#0d1829] border-white/[0.06]" : "bg-white border-gray-200"
      }`}
    >
      {/* Header */}
      <div className={`px-8 py-6 border-b ${
        dark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-200 bg-gray-50/50"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              dark 
                ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20" 
                : "bg-gradient-to-br from-blue-50 to-purple-50"
            }`}>
              <Building2 className={`w-6 h-6 ${
                dark ? "text-blue-400" : "text-blue-600"
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${
                dark ? "text-white" : "text-gray-900"
              }`}>
                Bank Account Details
              </h2>
              <p className={`text-sm mt-0.5 ${
                dark ? "text-white/40" : "text-gray-500"
              }`}>
                Manage your payout account information
              </p>
            </div>
          </div>
          
          {!isEditing && (bankDetails || bankDetailsReview?.requestedDetails) && (
            <button
              onClick={handleEdit}
              disabled={isBankLocked || hasPendingReview}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
                isBankLocked || hasPendingReview
                  ? dark
                    ? "bg-white/[0.05] text-white/30 cursor-not-allowed"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : dark
                    ? "bg-white/[0.07] text-white hover:bg-white/[0.12]"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Edit2 className="w-4 h-4" />
              Edit Details
            </button>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`mx-8 mt-6 px-4 py-3 rounded-xl flex items-start gap-3 ${
              dark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"
            }`}
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className={`text-sm ${dark ? "text-red-400" : "text-red-700"}`}>{error}</p>
          </motion.div>
        )}
        
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`mx-8 mt-6 px-4 py-3 rounded-xl flex items-start gap-3 ${
              dark ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className={`text-sm ${dark ? "text-green-400" : "text-green-700"}`}>{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Notice */}
      <div className={`mx-8 mt-6 px-4 py-3 rounded-xl flex items-start gap-3 ${
        dark ? "bg-blue-500/5 border border-blue-500/10" : "bg-blue-50 border border-blue-100"
      }`}>
        <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          dark ? "text-blue-400" : "text-blue-600"
        }`} />
        <div>
          <p className={`text-sm font-semibold ${dark ? "text-blue-300" : "text-blue-900"}`}>
            Your information is secure
          </p>
          <p className={`text-xs mt-1 ${dark ? "text-blue-400/70" : "text-blue-700/70"}`}>
            All bank details are encrypted and stored securely. We never share this information with third parties.
          </p>
          <p className={`text-xs mt-1 ${dark ? "text-blue-300/70" : "text-blue-700/70"}`}>
            Invalid attempts: {Number(bankDetailsSecurity?.invalidAttempts || 0)} / 5
          </p>
        </div>
      </div>

      {(hasPendingReview || isReviewRejected) && (
        <div className={`mx-8 mt-4 px-4 py-3 rounded-xl flex items-start gap-3 ${
          hasPendingReview
            ? dark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"
            : dark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"
        }`}>
          <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${hasPendingReview ? "text-amber-500" : "text-red-500"}`} />
          <div>
            <p className={`text-sm font-semibold ${hasPendingReview ? dark ? "text-amber-300" : "text-amber-800" : dark ? "text-red-300" : "text-red-800"}`}>
              {hasPendingReview ? "Bank details under admin review" : "Bank details review was rejected"}
            </p>
            <p className={`text-xs mt-1 ${hasPendingReview ? dark ? "text-amber-200/80" : "text-amber-700" : dark ? "text-red-200/80" : "text-red-700"}`}>
              {hasPendingReview
                ? `Your request is expected to be reviewed ${reviewDueAtText}.`
                : (bankDetailsReview?.adminNote || "Please update and resubmit your bank details.")}
            </p>
          </div>
        </div>
      )}

      {isBankLocked && (
        <div className={`mx-8 mt-4 px-4 py-3 rounded-xl flex items-start gap-3 ${
          dark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className={`text-sm font-semibold ${dark ? "text-red-300" : "text-red-800"}`}>
              Bank detail updates are blocked
            </p>
            <p className={`text-xs mt-1 ${dark ? "text-red-200/80" : "text-red-700"}`}>
              Too many invalid attempts were detected. Please contact support team. Only admin can unblock your account.
            </p>
          </div>
        </div>
      )}

      {/* Form / Display */}
      <div className="p-8">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Holder Name */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                dark ? "text-white/70" : "text-gray-700"
              }`}>
                Account Holder Name *
              </label>
              <input
                type="text"
                required
                value={formData.accountHolderName}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  dark 
                    ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20" 
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                }`}
                placeholder="Full name as it appears on your account"
              />
            </div>

            {/* Bank Name */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                dark ? "text-white/70" : "text-gray-700"
              }`}>
                Bank Name *
              </label>
              <input
                type="text"
                required
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  dark 
                    ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20" 
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                }`}
                placeholder="e.g., HDFC Bank, ICICI Bank, SBI"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Number */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  dark ? "text-white/70" : "text-gray-700"
                }`}>
                  Account Number *
                </label>
                <div className="relative">
                  <input
                    type={showAccountNumber ? "text" : "password"}
                    required
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 20) })}
                    className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm font-medium transition-all ${
                      dark 
                        ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20" 
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                    placeholder="Enter account number"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      dark ? "hover:bg-white/10 text-white/40" : "hover:bg-gray-100 text-gray-400"
                    }`}
                  >
                    {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Routing Number */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  dark ? "text-white/70" : "text-gray-700"
                }`}>
                  Routing Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.routingNumber}
                    onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, formData.country?.toUpperCase() === "IN" ? 11 : 20) })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    dark 
                      ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20" 
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                  placeholder={formData.country?.toUpperCase() === "IN" ? "IFSC code (e.g., HDFC0001234)" : "Routing number"}
                  maxLength={formData.country?.toUpperCase() === "IN" ? 11 : 20}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Account Type */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  dark ? "text-white/70" : "text-gray-700"
                }`}>
                  Account Type *
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    dark 
                      ? "bg-white/[0.03] border-white/[0.06] text-white focus:bg-white/[0.05] focus:border-white/20" 
                      : "bg-white border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="business">Business</option>
                </select>
              </div>

              {/* Country */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  dark ? "text-white/70" : "text-gray-700"
                }`}>
                  Country
                </label>
                <div className="relative">
                  <Globe2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    dark ? "text-white/30" : "text-gray-400"
                  }`} />
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) })}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      dark 
                        ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20" 
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                    placeholder="IN"
                  />
                </div>
              </div>

              {/* Currency */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${
                  dark ? "text-white/70" : "text-gray-700"
                }`}>
                  Currency
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    dark 
                      ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20" 
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                  placeholder="INR"
                />
              </div>
            </div>

            {/* International Fields */}
            <div className={`p-4 rounded-xl ${
              dark ? "bg-white/[0.02]" : "bg-gray-50"
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Info className={`w-4 h-4 ${dark ? "text-white/40" : "text-gray-400"}`} />
                <p className={`text-xs font-semibold ${
                  dark ? "text-white/50" : "text-gray-600"
                }`}>
                  International Transfers (Optional)
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-2 ${
                    dark ? "text-white/60" : "text-gray-600"
                  }`}>
                    SWIFT Code
                  </label>
                  <input
                    type="text"
                    value={formData.swiftCode}
                    onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-all ${
                      dark 
                        ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20" 
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500"
                    }`}
                    placeholder="e.g., CHASUS33"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-2 ${
                    dark ? "text-white/60" : "text-gray-600"
                  }`}>
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-all ${
                      dark 
                        ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20" 
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500"
                    }`}
                    placeholder="International Bank Account Number"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {bankDetails && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                    dark 
                      ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.10]" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } disabled:opacity-50`}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving || isBankLocked}
                className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  dark
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                } disabled:opacity-50`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : isBankLocked ? (
                  "Blocked - Contact Support"
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Bank Details
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Display Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoDisplay 
                label="Account Holder" 
                value={bankDetails?.accountHolderName || "Not set"}
                dark={dark}
              />
              <InfoDisplay 
                label="Bank Name" 
                value={bankDetails?.bankName || "Not set"}
                dark={dark}
              />
              <InfoDisplay 
                label="Account Number" 
                value={bankDetails?.accountNumber || "****"}
                dark={dark}
                masked
              />
              <InfoDisplay 
                label="Routing Number" 
                value={bankDetails?.routingNumber ? `****${bankDetails.routingNumber.slice(-4)}` : "Not set"}
                dark={dark}
              />
              <InfoDisplay 
                label="Account Type" 
                value={bankDetails?.accountType || "Not set"}
                dark={dark}
                capitalize
              />
              <InfoDisplay 
                label="Country" 
                value={bankDetails?.country || "IN"}
                dark={dark}
              />
            </div>

            {bankDetails?.isVerified && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
                dark ? "bg-green-500/10" : "bg-green-50"
              }`}>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className={`text-sm font-semibold ${
                  dark ? "text-green-400" : "text-green-700"
                }`}>
                  Verified Account
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const InfoDisplay = ({ label, value, dark, masked, capitalize }) => (
  <div>
    <p className={`text-xs font-semibold mb-1.5 ${
      dark ? "text-white/40" : "text-gray-500"
    }`}>
      {label}
    </p>
    <p className={`text-sm font-bold flex items-center gap-2 ${
      dark ? "text-white/80" : "text-gray-900"
    } ${capitalize ? "capitalize" : ""}`}>
      {masked && <CreditCard className="w-4 h-4 opacity-50" />}
      {value}
    </p>
  </div>
);

export default BankDetails;
