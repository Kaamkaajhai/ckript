import { useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import { 
  FileText, 
  Building2,
  Briefcase,
  Link as LinkIcon,
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Mail,
  Lock,
  User,
  AlertCircle,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const IndustryOnboarding = () => {
  const { join } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Step 1: Account Creation
  const [accountData, setAccountData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "professional",
    subRole: ""
  });
  
  // Email Verification
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  
  // Step 2: Professional Identity
  const [professionalData, setProfessionalData] = useState({
    company: "",
    jobTitle: "",
    imdbUrl: "",
    linkedInUrl: "",
    previousCredits: ""
  });
  
  // Step 3: Mandates (What they're looking for)
  const [mandates, setMandates] = useState({
    formats: [],
    budgetTiers: [],
    genres: [],
    excludeGenres: [],
    specificHooks: []
  });

  // Step 4: Legal
  const [agreementScrolled, setAgreementScrolled] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const agreementRef = useRef(null);

  const steps = [
    { num: 1, title: "Account" },
    { num: 2, title: "Identity" },
    { num: 3, title: "Mandates" },
    { num: 4, title: "Complete" }
  ];

  const subRoleOptions = [
    { value: "producer", label: "Producer / Executive" },
    { value: "agent", label: "Agent / Manager" },
    { value: "director", label: "Director" },
    { value: "actor", label: "Actor / Talent" }
  ];

  const formatOptions = [
    "Feature Film",
    "TV Pilot (1-Hour)",
    "TV Pilot (30-Min)",
    "Limited Series",
    "Short Film",
    "Web Series"
  ];

  const budgetTierOptions = [
    { value: "micro", label: "Micro (<$500K)", desc: "Executable indie scripts" },
    { value: "low", label: "Low ($500K - $5M)", desc: "Independent features" },
    { value: "medium", label: "Medium ($5M - $25M)", desc: "Mid-budget productions" },
    { value: "high", label: "High ($25M - $75M)", desc: "Studio features" },
    { value: "blockbuster", label: "Blockbuster (>$75M)", desc: "Big IP & franchises" }
  ];

  const genreOptions = [
    "Action", "Comedy", "Drama", "Horror", "Thriller", 
    "Romance", "Sci-Fi", "Fantasy", "Mystery", "Adventure",
    "Crime", "Western", "Animation", "Documentary", "Historical",
    "War", "Musical", "Biographical", "Sports", "Political",
    "Legal", "Medical", "Supernatural", "Psychological", "Noir",
    "Family", "Teen", "Satire", "Dark Comedy", "Mockumentary"
  ];

  const specificHookOptions = [
    "Diverse Voices",
    "Female-Led Action",
    "LGBTQ+ Stories",
    "Based on True Story",
    "Single Location",
    "Ensemble Cast",
    "Strong Female Protagonist",
    "Period Piece",
    "International Setting",
    "First-Time Writer"
  ];

  // Handle account creation
  const handleAccountCreation = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!accountData.subRole) {
      setError("Please select your professional role");
      return;
    }
    
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
        role: "professional",
        subRole: accountData.subRole
      });
      
      // Send verification email
      await api.post("/onboarding/send-verification");
      setVerificationSent(true);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Account creation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await api.post("/onboarding/verify-email", {
        code: verificationCode
      });
      
      if (response.data.success) {
        setCurrentStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalIdentity = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await api.put("/onboarding/professional-identity", professionalData);
      
      if (response.data.success) {
        setCurrentStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMandatesSubmit = (e) => {
    e.preventDefault();
    setCurrentStep(4);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await api.post("/onboarding/complete-industry", {
        mandates,
        agreementAccepted
      });
      
      if (response.data.success) {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  // Toggle handlers
  const toggleFormat = (format) => {
    setMandates(prev => ({
      ...prev,
      formats: prev.formats.includes(format)
        ? prev.formats.filter(f => f !== format)
        : [...prev.formats, format]
    }));
  };

  const toggleBudgetTier = (tier) => {
    setMandates(prev => ({
      ...prev,
      budgetTiers: prev.budgetTiers.includes(tier)
        ? prev.budgetTiers.filter(t => t !== tier)
        : [...prev.budgetTiers, tier]
    }));
  };

  const toggleGenre = (genre) => {
    setMandates(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const toggleExcludeGenre = (genre) => {
    setMandates(prev => ({
      ...prev,
      excludeGenres: prev.excludeGenres.includes(genre)
        ? prev.excludeGenres.filter(g => g !== genre)
        : [...prev.excludeGenres, genre]
    }));
  };

  const toggleHook = (hook) => {
    setMandates(prev => ({
      ...prev,
      specificHooks: prev.specificHooks.includes(hook)
        ? prev.specificHooks.filter(h => h !== hook)
        : [...prev.specificHooks, hook]
    }));
  };

  const handleAgreementScroll = (e) => {
    const element = e.target;
    const isScrolledToBottom = 
      element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    if (isScrolledToBottom && !agreementScrolled) {
      setAgreementScrolled(true);
    }
  };

  const isWorkEmail = (email) => {
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = email.split('@')[1];
    return !commonDomains.includes(domain);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        if (!verificationSent) {
          return (
            <form onSubmit={handleAccountCreation} className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Industry Professional Account</h2>
                <p className="text-sm text-gray-600 mt-2">Join as a verified industry professional</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Role *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {subRoleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAccountData({...accountData, subRole: option.value})}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition ${
                        accountData.subRole === option.value
                          ? 'border-[#0f2544] bg-[#f0f4f8]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={accountData.name}
                    onChange={(e) => setAccountData({...accountData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                    placeholder="John Smith"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={accountData.email}
                    onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                    placeholder="you@company.com"
                    required
                  />
                </div>
                {accountData.email && !isWorkEmail(accountData.email) && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Please use your work email for faster verification
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={accountData.password}
                    onChange={(e) => setAccountData({...accountData, password: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={accountData.confirmPassword}
                    onChange={(e) => setAccountData({...accountData, confirmPassword: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0f2544] text-white py-2.5 rounded-lg hover:bg-[#1a365d] transition font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Creating Account..." : "Create Account"}
                <ArrowRight size={16} />
              </button>
            </form>
          );
        } else {
          return (
            <form onSubmit={handleEmailVerification} className="space-y-6">
              <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Verify Your Email</h2>
              <p className="text-gray-600">
                We've sent a 6-digit code to <strong>{accountData.email}</strong>
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Verifying..." : "Verify Email"}
                <ArrowRight size={20} />
              </button>
            </form>
          );
        }
      
      case 2:
        return (
          <form onSubmit={handleProfessionalIdentity} className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-[#0f2544]" size={24} />
                <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Professional Verification</h2>
              </div>
              <p className="text-gray-600">Help us verify your industry credentials</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company / Studio *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={professionalData.company}
                    onChange={(e) => setProfessionalData({...professionalData, company: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                    placeholder="e.g., Netflix, CAA"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={professionalData.jobTitle}
                    onChange={(e) => setProfessionalData({...professionalData, jobTitle: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                    placeholder="Creative Executive"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IMDbPro URL (Recommended)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="url"
                  value={professionalData.imdbUrl}
                  onChange={(e) => setProfessionalData({...professionalData, imdbUrl: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                  placeholder="https://pro.imdb.com/name/..."
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Providing your IMDb profile helps us verify your account faster
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn URL (Optional)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="url"
                  value={professionalData.linkedInUrl}
                  onChange={(e) => setProfessionalData({...professionalData, linkedInUrl: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Previous Credits (Optional)
              </label>
              <textarea
                value={professionalData.previousCredits}
                onChange={(e) => setProfessionalData({...professionalData, previousCredits: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent resize-none"
                rows={4}
                placeholder="List notable films, shows, or projects you've worked on..."
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your account will show as "Unverified" until our team reviews your credentials. 
                Verified accounts get priority access to new scripts.
              </p>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2.5 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#0f2544] text-white py-2.5 rounded-lg hover:bg-[#1a365d] transition font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Saving..." : "Continue"}
                <ArrowRight size={20} />
              </button>
            </div>
          </form>
        );
      
      case 3:
        return (
          <form onSubmit={handleMandatesSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Set Your Mandates</h2>
              <p className="text-gray-600 mt-2">Tell us what scripts you're looking for</p>
            </div>

            {/* Formats */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preferred Formats
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {formatOptions.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => toggleFormat(format)}
                    className={`px-4 py-3 rounded-lg font-medium text-sm transition-all border-2 ${
                      mandates.formats.includes(format)
                        ? 'bg-[#0f2544] text-white border-[#0f2544]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Tiers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Budget Range
              </label>
              <div className="space-y-2">
                {budgetTierOptions.map((tier) => (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => toggleBudgetTier(tier.value)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      mandates.budgetTiers.includes(tier.value)
                        ? 'border-[#0f2544] bg-[#f0f4f8]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{tier.label}</div>
                        <div className="text-sm text-gray-600">{tier.desc}</div>
                      </div>
                      {mandates.budgetTiers.includes(tier.value) && (
                        <CheckCircle className="text-[#0f2544]" size={20} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Genres to Include */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Include Genres
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      mandates.genres.includes(genre)
                        ? 'bg-[#0f2544] text-white border-[#0f2544]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Genres to Exclude */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Exclude Genres (Optional)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleExcludeGenre(genre)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      mandates.excludeGenres.includes(genre)
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific Hooks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Specific Interests
              </label>
              <div className="grid grid-cols-2 gap-2">
                {specificHookOptions.map((hook) => (
                  <button
                    key={hook}
                    type="button"
                    onClick={() => toggleHook(hook)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      mandates.specificHooks.includes(hook)
                        ? 'bg-[#0f2544] text-white border-[#0f2544]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]'
                    }`}
                  >
                    {hook}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#0f2544] text-white py-2.5 rounded-lg hover:bg-[#1a365d] transition font-semibold text-sm flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight size={20} />
              </button>
            </div>
          </form>
        );

      case 4:
        return (
          <form onSubmit={handleFinalSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Terms & Conditions</h2>
              <p className="text-gray-600 mt-2">Review and accept to complete your registration</p>
            </div>

            {/* Legal Agreement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry Professional Agreement
              </label>
              <div
                ref={agreementRef}
                onScroll={handleAgreementScroll}
                className="border-2 border-gray-200 rounded-lg p-4 h-[150px] overflow-y-auto text-sm text-gray-700 bg-gray-50"
              >
                <h4 className="font-semibold mb-2">Script Bridge Industry Professional Terms</h4>
                <p className="mb-3">
                  By creating an industry professional account, you agree to the following:
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>You are a legitimate industry professional (producer, agent, director, or talent).</li>
                  <li>You will use this platform professionally to discover and evaluate scripts.</li>
                  <li>You will protect the confidentiality of scripts you access through the platform.</li>
                  <li>You will not reproduce, distribute, or exploit scripts without proper agreements with writers.</li>
                  <li>Script Bridge facilitates connections but is not party to any deals between users.</li>
                  <li>Verified status is contingent on accurate professional information.</li>
                  <li>You agree to communicate professionally with writers on the platform.</li>
                  <li>Misrepresentation of credentials may result in account termination.</li>
                  <li>You understand that writers retain all rights to their work.</li>
                  <li>These terms are subject to change with notice to active users.</li>
                </ol>
                <p className="mt-4 text-xs text-gray-500">
                  Last updated: February 2026
                </p>
              </div>
              
              {/* Agreement Checkbox */}
              <div className="flex items-start mt-3">
                <input
                  type="checkbox"
                  id="agreement"
                  checked={agreementAccepted}
                  onChange={(e) => setAgreementAccepted(e.target.checked)}
                  disabled={!agreementScrolled}
                  className="w-5 h-5 text-[#1a365d] border-gray-300 rounded focus:ring-[#1a365d] mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="agreement"
                  className={`ml-3 text-sm ${
                    agreementScrolled ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  I have read and agree to the Industry Professional Terms & Conditions
                  {!agreementScrolled && (
                    <span className="block text-xs text-gray-500 mt-1">
                      (Scroll to the bottom to enable)
                    </span>
                  )}
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !agreementAccepted}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? "Processing..." : "Complete Setup & Browse Scripts"}
                <CheckCircle size={20} />
              </button>
            </div>
          </form>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#e8eff5] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText size={28} className="text-[#0a1628]" strokeWidth={1.5} />
            <h1 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Script Bridge</h1>
          </div>
          <p className="text-sm text-gray-600">Industry Professional Registration</p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = currentStep === step.num;
              const isComplete = currentStep > step.num;
              
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition text-xs font-semibold ${
                    isComplete 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                        ? 'bg-[#0f2544] border-[#0f2544] text-white' 
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isComplete ? '✓' : step.num}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <div className={`text-xs font-semibold ${
                      isComplete || isActive ? 'text-[#0a1628]' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      isComplete ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Form Container */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
        >
          {renderStep()}
        </motion.div>
      </div>
    </div>
  );
};

export default IndustryOnboarding;
