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

const BankDetails = ({ dark }) => {
  const [bankDetails, setBankDetails] = useState(null);
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
    country: "US",
    currency: "USD"
  });

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/transactions/bank-details");
      if (data.bankDetails) {
        setBankDetails(data.bankDetails);
        setFormData(prev => ({ ...prev, ...data.bankDetails }));
      } else {
        setIsEditing(true);
      }
    } catch (err) {
      setError("Failed to load bank details");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { data } = await api.put("/transactions/bank-details", formData);
      setBankDetails(data.bankDetails);
      setSuccess("Bank details saved successfully");
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
      setFormData({ ...bankDetails });
      setIsEditing(false);
    }
    setError("");
  };

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
          
          {!isEditing && bankDetails && (
            <button
              onClick={handleEdit}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
                dark 
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
        </div>
      </div>

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
                placeholder="e.g., Wells Fargo, Chase, Bank of America"
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
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    dark 
                      ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20" 
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  }`}
                  placeholder="9-digit routing number"
                  maxLength="9"
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
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      dark 
                        ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20" 
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                    placeholder="US"
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
                  placeholder="USD"
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
                disabled={saving}
                className={`flex-1 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  dark
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                } disabled:opacity-50`}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
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
                value={bankDetails?.country || "US"}
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
