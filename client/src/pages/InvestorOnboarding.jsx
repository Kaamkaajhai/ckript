import { useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Users,
  AlertCircle,
  Globe,
  Briefcase,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const InvestorOnboarding = () => {
  const { join } = useContext(AuthContext);
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Account
  const [accountData, setAccountData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Email Verification
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);

  // Step 2: Investor Profile
  const [investorProfile, setInvestorProfile] = useState({
    company: "",
    investmentRange: "",
    linkedInUrl: "",
    bio: "",
  });

  // Step 3: Preferences
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedBudgets, setSelectedBudgets] = useState([]);
  const [selectedFormats, setSelectedFormats] = useState([]);

  // Step 4: Legal
  const [agreementScrolled, setAgreementScrolled] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const agreementRef = useRef(null);

  const steps = [
    { num: 1, title: "Account" },
    { num: 2, title: "Profile" },
    { num: 3, title: "Preferences" },
    { num: 4, title: "Complete" },
  ];

  const investmentRanges = [
    { value: "under_50k", label: "Under $50K" },
    { value: "50k_250k", label: "$50K – $250K" },
    { value: "250k_1m", label: "$250K – $1M" },
    { value: "1m_5m", label: "$1M – $5M" },
    { value: "over_5m", label: "Over $5M" },
  ];

  const genreOptions = [
    "Action", "Comedy", "Drama", "Horror", "Thriller",
    "Romance", "Sci-Fi", "Fantasy", "Mystery", "Adventure",
    "Crime", "Documentary", "Historical", "Animation", "Musical",
  ];

  const budgetOptions = [
    "Micro Budget (< $1M)", "Low Budget ($1M–$5M)", "Mid Budget ($5M–$30M)",
    "High Budget ($30M–$100M)", "Tentpole ($100M+)",
  ];

  const formatOptions = [
    "Feature Film", "TV Series", "Limited Series", "Short Film",
    "Web Series", "Documentary", "Animation",
  ];

  const toggle = (arr, setArr, val) => {
    setArr((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  // ── Step 1: Account Creation ───────────────────────────────
  const handleAccountCreation = async (e) => {
    e.preventDefault();
    setError("");
    if (accountData.password !== accountData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (accountData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await join({
        name: accountData.name,
        email: accountData.email,
        password: accountData.password,
        role: "investor",
      });
      await api.post("/onboarding/send-verification");
      setVerificationSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/onboarding/verify-email", { code: verificationCode });
      if (res.data.success) setCurrentStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Investor Profile ───────────────────────────────
  const handleInvestorProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.put("/users/update", {
        bio: investorProfile.bio,
        company: investorProfile.company,
        linkedInUrl: investorProfile.linkedInUrl,
        investmentRange: investorProfile.investmentRange,
      });
      setCurrentStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Preferences ────────────────────────────────────
  const handlePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.put("/users/update", {
        preferredGenres: selectedGenres,
        preferredBudgets: selectedBudgets,
        preferredFormats: selectedFormats,
      });
      setCurrentStep(4);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Legal & Complete ───────────────────────────────
  const handleScrollAgreement = () => {
    const el = agreementRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setAgreementScrolled(true);
    }
  };

  const handleComplete = async () => {
    if (!agreementAccepted) {
      setError("Please accept the agreement to continue");
      return;
    }
    setLoading(true);
    try {
      await api.put("/users/update", { onboardingComplete: true });
      navigate("/dashboard");
    } catch {
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared UI helpers ──────────────────────────────────────
  const inputClass = "w-full h-11 px-4 border border-gray-200 rounded-xl text-[14px] font-medium focus:outline-none focus:border-[#1e3a5f]/40 focus:ring-2 focus:ring-[#1e3a5f]/5 transition-all bg-gray-50 text-gray-900 placeholder:text-gray-400";
  const labelClass = "block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5";

  const ChipButton = ({ label, active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
        active
          ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
          : "bg-white text-gray-500 border-gray-200 hover:border-[#1e3a5f]/40 hover:text-[#1e3a5f]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8faff] via-white to-[#f0f4ff] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users size={28} className="text-[#0a1628]" strokeWidth={1.5} />
            <h1 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Ckript</h1>
          </div>
          <p className="text-sm text-gray-600">Investor Onboarding</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    currentStep > step.num
                      ? "bg-[#1e3a5f] border-[#1e3a5f] text-white"
                      : currentStep === step.num
                      ? "bg-white border-[#1e3a5f] text-[#1e3a5f]"
                      : "bg-white border-gray-200 text-gray-300"
                  }`}
                >
                  {currentStep > step.num ? <CheckCircle size={14} /> : step.num}
                </div>
                <span className={`text-[10px] font-bold ${currentStep === step.num ? "text-[#1e3a5f]" : "text-gray-300"}`}>
                  {step.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-14 h-0.5 mb-5 mx-1 transition-all ${currentStep > step.num ? "bg-[#1e3a5f]" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <AnimatePresence mode="wait">

            {/* ── Step 1: Account ── */}
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="px-8 pt-7 pb-2 border-b border-gray-50">
                  <h2 className="text-xl font-black text-gray-900">Create your account</h2>
                  <p className="text-gray-400 text-sm font-medium mt-1">Join as an investor and discover projects worth backing</p>
                </div>

                {!verificationSent ? (
                  <form onSubmit={handleAccountCreation} className="p-8 space-y-5">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-3.5 text-gray-300" />
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={accountData.name}
                          onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                          className={`${inputClass} pl-10`}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Email Address</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-3.5 text-gray-300" />
                        <input
                          type="email"
                          placeholder="you@example.com"
                          value={accountData.email}
                          onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                          className={`${inputClass} pl-10`}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className={labelClass}>Password</label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3.5 top-3.5 text-gray-300" />
                          <input
                            type="password"
                            placeholder="Min. 6 chars"
                            value={accountData.password}
                            onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                            className={`${inputClass} pl-10`}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Confirm</label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3.5 top-3.5 text-gray-300" />
                          <input
                            type="password"
                            placeholder="Repeat password"
                            value={accountData.confirmPassword}
                            onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                            className={`${inputClass} pl-10`}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                        <AlertCircle size={15} className="text-red-400 shrink-0" />
                        <p className="text-sm font-semibold text-red-600">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-[#1e3a5f] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#162d4a] transition-all disabled:opacity-60"
                    >
                      {loading ? "Creating account..." : <>Create Account <ArrowRight size={16} /></>}
                    </button>

                    <p className="text-center text-xs text-gray-400 font-medium">
                      Already have an account?{" "}
                      <a href="/login" className="text-[#1e3a5f] font-bold hover:underline">Sign in</a>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleEmailVerification} className="p-8 space-y-5">
                    <div className="flex items-center gap-3 px-4 py-3.5 bg-blue-50 border border-blue-100 rounded-xl">
                      <Mail size={16} className="text-blue-500 shrink-0" />
                      <p className="text-sm font-semibold text-blue-700">Verification code sent to <span className="font-black">{accountData.email}</span></p>
                    </div>
                    <div>
                      <label className={labelClass}>Verification Code</label>
                      <input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className={`${inputClass} text-center text-xl font-black tracking-[0.3em]`}
                        maxLength={6}
                        required
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                        <AlertCircle size={15} className="text-red-400 shrink-0" />
                        <p className="text-sm font-semibold text-red-600">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || verificationCode.length < 6}
                      className="w-full h-11 bg-[#1e3a5f] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#162d4a] transition-all disabled:opacity-60"
                    >
                      {loading ? "Verifying..." : <>Verify Email <ArrowRight size={16} /></>}
                    </button>

                    <button
                      type="button"
                      onClick={async () => { await api.post("/onboarding/send-verification").catch(() => {}); }}
                      className="w-full text-sm text-gray-400 hover:text-[#1e3a5f] font-semibold transition-colors"
                    >
                      Resend code
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* ── Step 2: Investor Profile ── */}
            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="px-8 pt-7 pb-2 border-b border-gray-50">
                  <h2 className="text-xl font-black text-gray-900">Investor profile</h2>
                  <p className="text-gray-400 text-sm font-medium mt-1">Tell writers and creators about your investment focus</p>
                </div>
                <form onSubmit={handleInvestorProfile} className="p-8 space-y-5">
                  <div>
                    <label className={labelClass}>Company / Fund Name <span className="normal-case text-gray-300 font-medium">(optional)</span></label>
                    <div className="relative">
                      <Briefcase size={15} className="absolute left-3.5 top-3.5 text-gray-300" />
                      <input
                        type="text"
                        placeholder="e.g. Summit Capital Films"
                        value={investorProfile.company}
                        onChange={(e) => setInvestorProfile({ ...investorProfile, company: e.target.value })}
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Typical Investment Range</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {investmentRanges.map((r) => (
                        <ChipButton
                          key={r.value}
                          label={r.label}
                          active={investorProfile.investmentRange === r.value}
                          onClick={() => setInvestorProfile({ ...investorProfile, investmentRange: r.value })}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>LinkedIn Profile <span className="normal-case text-gray-300 font-medium">(optional)</span></label>
                    <div className="relative">
                      <Globe size={15} className="absolute left-3.5 top-3.5 text-gray-300" />
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/yourname"
                        value={investorProfile.linkedInUrl}
                        onChange={(e) => setInvestorProfile({ ...investorProfile, linkedInUrl: e.target.value })}
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Bio <span className="normal-case text-gray-300 font-medium">(optional)</span></label>
                    <textarea
                      rows={3}
                      placeholder="Brief background on your investment philosophy or experience..."
                      value={investorProfile.bio}
                      onChange={(e) => setInvestorProfile({ ...investorProfile, bio: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[14px] font-medium focus:outline-none focus:border-[#1e3a5f]/40 focus:ring-2 focus:ring-[#1e3a5f]/5 transition-all bg-gray-50 text-gray-900 placeholder:text-gray-400 resize-none"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                      <AlertCircle size={15} className="text-red-400 shrink-0" />
                      <p className="text-sm font-semibold text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setCurrentStep(1)}
                      className="h-11 px-5 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm flex items-center gap-1.5 hover:border-gray-300 transition-all">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-1 h-11 bg-[#1e3a5f] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#162d4a] transition-all disabled:opacity-60">
                      {loading ? "Saving..." : <>Continue <ArrowRight size={16} /></>}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── Step 3: Preferences ── */}
            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="px-8 pt-7 pb-2 border-b border-gray-50">
                  <h2 className="text-xl font-black text-gray-900">Investment preferences</h2>
                  <p className="text-gray-400 text-sm font-medium mt-1">Help us match you with the right projects</p>
                </div>
                <form onSubmit={handlePreferences} className="p-8 space-y-6">
                  <div>
                    <label className={labelClass}>Preferred Genres</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {genreOptions.map((g) => (
                        <ChipButton key={g} label={g} active={selectedGenres.includes(g)} onClick={() => toggle(selectedGenres, setSelectedGenres, g)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Budget Range</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {budgetOptions.map((b) => (
                        <ChipButton key={b} label={b} active={selectedBudgets.includes(b)} onClick={() => toggle(selectedBudgets, setSelectedBudgets, b)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Preferred Formats</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formatOptions.map((f) => (
                        <ChipButton key={f} label={f} active={selectedFormats.includes(f)} onClick={() => toggle(selectedFormats, setSelectedFormats, f)} />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                      <AlertCircle size={15} className="text-red-400 shrink-0" />
                      <p className="text-sm font-semibold text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setCurrentStep(2)}
                      className="h-11 px-5 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm flex items-center gap-1.5 hover:border-gray-300 transition-all">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-1 h-11 bg-[#1e3a5f] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#162d4a] transition-all disabled:opacity-60">
                      {loading ? "Saving..." : <>Continue <ArrowRight size={16} /></>}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── Step 4: Legal & Complete ── */}
            {currentStep === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="px-8 pt-7 pb-2 border-b border-gray-50">
                  <h2 className="text-xl font-black text-gray-900">Investor Agreement</h2>
                  <p className="text-gray-400 text-sm font-medium mt-1">Please read and accept the terms before accessing the platform</p>
                </div>
                <div className="p-8 space-y-5">
                  {/* Agreement scroll box */}
                  <div
                    ref={agreementRef}
                    onScroll={handleScrollAgreement}
                    className="h-56 overflow-y-auto border border-gray-100 rounded-xl p-5 bg-gray-50 text-xs text-gray-500 font-medium leading-relaxed space-y-3"
                  >
                    <p className="font-black text-gray-700 text-sm">Ckript Investor Platform Agreement</p>
                    <p>By joining Ckript as an Investor, you agree to the following terms:</p>
                    <p><strong>1. Platform Use.</strong> This platform is for discovery and connection purposes only. Ckript facilitates introductions between investors and content creators but is not a party to any investment agreement.</p>
                    <p><strong>2. No Financial Advice.</strong> Nothing on this platform constitutes financial, legal, or investment advice. All investment decisions are made solely at your own discretion and risk.</p>
                    <p><strong>3. Due Diligence.</strong> You are responsible for conducting your own due diligence on any project or creator before committing funds. Ckript makes no representations about the viability, legality, or returns of any listed project.</p>
                    <p><strong>4. Confidentiality.</strong> Scripts, synopses, and creative materials accessed through this platform are confidential and may not be shared, reproduced, or distributed without written consent from the rights holder.</p>
                    <p><strong>5. Data & Privacy.</strong> Your profile information may be visible to creators and industry professionals on the platform. Refer to our Privacy Policy for full details on data handling.</p>
                    <p><strong>6. Compliance.</strong> You represent that any investment activities conducted through connections made on this platform will comply with all applicable laws and regulations in your jurisdiction.</p>
                    <p><strong>7. Termination.</strong> Ckript reserves the right to suspend or terminate any account found in violation of these terms or the platform's community standards.</p>
                    <p className="text-gray-400">Last updated: January 2026</p>
                  </div>

                  {!agreementScrolled && (
                    <p className="text-center text-xs text-gray-400 font-semibold">↓ Scroll to the bottom to accept</p>
                  )}

                  {agreementScrolled && (
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div
                        onClick={() => setAgreementAccepted(!agreementAccepted)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          agreementAccepted ? "bg-[#1e3a5f] border-[#1e3a5f]" : "border-gray-300 bg-white"
                        }`}
                      >
                        {agreementAccepted && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        I have read and agree to the Investor Platform Agreement
                      </span>
                    </label>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                      <AlertCircle size={15} className="text-red-400 shrink-0" />
                      <p className="text-sm font-semibold text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setCurrentStep(3)}
                      className="h-11 px-5 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm flex items-center gap-1.5 hover:border-gray-300 transition-all">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button
                      type="button"
                      onClick={handleComplete}
                      disabled={!agreementAccepted || loading}
                      className="flex-1 h-11 bg-[#1e3a5f] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#162d4a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {loading ? "Completing..." : <>
                        <TrendingUp size={16} /> Enter Platform
                      </>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default InvestorOnboarding;
