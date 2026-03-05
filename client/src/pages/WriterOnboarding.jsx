import { useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import OTPVerification from "../components/OTPVerification";
import { 
  FileText, 
  UserCircle, 
  Upload, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Mail,
  Lock,
  User,
  AlertCircle,
  MapPin,
  Phone,
  Calendar,
  Link,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Film,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


// Comprehensive email validation
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  email = email.trim().toLowerCase();
  if (email.length > 254 || email.length < 5) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  if (localPart.length > 64 || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) return false;
  if (!domain.includes('.') || domain.startsWith('-') || domain.endsWith('-') || domain.includes('..')) return false;
  const tld = domain.split('.').pop();
  return tld.length >= 2;
};

// Password validation criteria
const validatePassword = (password) => {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
};

const WriterOnboarding = () => {
  const { join, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [dobError, setDobError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [openRepSections, setOpenRepSections] = useState({ filmTv: false, theater: false, literary: false });
  const [emailError, setEmailError] = useState("");
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  // Step 1: Account Creation
  const [accountData, setAccountData] = useState({
    name: "",
    dateOfBirth: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    phone: "",
    role: "creator"
  });
  
  // Email Verification (keeping for compatibility, but using OTP now)
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  
  // Step 2: Writer Profile
  const [writerProfile, setWriterProfile] = useState({
    username: "",
    bio: "",
    representationStatus: "unrepresented",
    agencyName: "",
    wgaMember: false,
    links: {
      portfolio: "",
      instagram: "",
      twitter: "",
      linkedin: "",
      imdb: "",
      facebook: ""
    },
    accomplishments: [],
    representation: {
      filmTv: { agency: "", agent: "", managementCompany: "", manager: "", lawFirm: "", lawyer: "" },
      theater: { agency: "", agent: "", managementCompany: "", manager: "", lawFirm: "", lawyer: "" },
      literary: { agency: "", agent: "", managementCompany: "", manager: "", lawFirm: "", lawyer: "" }
    },
    demographicPrivacy: "searchable",
    diversity: {
      gender: "",
      nationality: "",
      lgbtqStatus: "",
      disabilityStatus: ""
    }
  });

  // Step 3: Tags
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [nuancedTags, setNuancedTags] = useState([]);
  const [showTagError, setShowTagError] = useState(false);

  // Step 4: Legal & Checkout
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [agreementScrolled, setAgreementScrolled] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const agreementRef = useRef(null);

  const steps = [
    { num: 1, title: "Account" },
    { num: 2, title: "Profile" },
    { num: 3, title: "Tags" },
    { num: 4, title: "Checkout" }
  ];

  // Handle account creation and email verification
  const handleAccountCreation = async (e) => {
    e.preventDefault();
    setError("");
    setPhoneError("");
    setDobError("");
    setEmailError("");

    if (!accountData.dateOfBirth) {
      setDobError("Date of birth is required");
      return;
    }

    if (!accountData.phone) {
      setPhoneError("Phone number is required");
      return;
    }
    const phoneRegex = /^[+]?[\d\s\-().]{7,15}$/;
    if (!phoneRegex.test(accountData.phone)) {
      setPhoneError("Please enter a valid phone number (e.g. +91 00000 00000)");
      return;
    }
    
    // Trim and sanitize email
    const sanitizedEmail = accountData.email.trim().toLowerCase();
    
    // Validate email
    if (!isValidEmail(sanitizedEmail)) {
      setEmailError("Please enter a valid email address (e.g., user@example.com)");
      return;
    }
    
    // Validate password
    const passwordCheck = validatePassword(accountData.password);
    if (!Object.values(passwordCheck).every(Boolean)) {
      setError("Password does not meet all requirements");
      return;
    }
    
    // Check password confirmation
    if (accountData.password !== accountData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    try {
      // Create account using AuthContext join function
      const response = await join({
        name: accountData.name,
        email: sanitizedEmail,
        password: accountData.password,
        role: "creator"
      });
      
      // Check if OTP verification is required
      if (response?.requiresVerification) {
        setUserEmail(sanitizedEmail);
        setShowOTPVerification(true);
      } else if (response?.token) {
        // Direct login (shouldn't happen with new flow)
        setCurrentStep(2);
      }
      
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Join failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = (userData) => {
    // Update auth context with user data
    setUser(userData);
    setShowOTPVerification(false);
    // Move to next step
    setCurrentStep(2);
  };

  const handleBackToSignup = () => {
    setShowOTPVerification(false);
    setUserEmail("");
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

  const handleWriterProfile = async (e) => {
    e.preventDefault();
    setUsernameError("");
    setError("");

    if (!writerProfile.username) {
      setUsernameError("Username is required");
      return;
    }
    if (writerProfile.username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }

    setLoading(true);
    
    try {
      const response = await api.put("/onboarding/writer-profile", writerProfile);
      
      if (response.data.success) {
        setCurrentStep(3); // Move to tags step
      }
    } catch (err) {
      setError(err.response?.data?.message || "Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  // Genre and Tag Options
  const genreOptions = [
    "Action", "Comedy", "Drama", "Horror", "Thriller", 
    "Romance", "Sci-Fi", "Fantasy", "Mystery", "Adventure",
    "Crime", "Western", "Animation", "Documentary", "Historical",
    "War", "Musical", "Biographical", "Sports", "Political",
    "Legal", "Medical", "Supernatural", "Psychological", "Noir",
    "Family", "Teen", "Satire", "Dark Comedy", "Mockumentary"
  ];

  const allNuancedTags = [
    // Themes
    "Revenge", "Redemption", "Coming of Age", "Love Triangle", "Betrayal",
    "Family Drama", "Social Justice", "Identity Crisis", "Survival",
    "Power Struggle", "Forbidden Love", "Loss & Grief", "Ambition",
    "Good vs Evil", "Man vs Nature", "Isolation", "Corruption",
    "Second Chance", "Underdog Story", "Fish Out of Water", "Chosen One",
    "Quest", "Transformation", "Sacrifice", "Justice", "Freedom",
    // Settings
    "Urban", "Rural", "Suburban", "Space", "Historical", "Contemporary",
    "Post-Apocalyptic", "Dystopian", "Small Town", "Big City",
    "Wilderness", "Ocean/Sea", "Desert", "Jungle", "Medieval",
    "Future", "Alternate Reality", "Virtual Reality", "Underground",
    "Prison", "Hospital", "School/College", "Military Base",
    // Tones
    "Dark", "Satirical", "Gritty", "Lighthearted", "Noir",
    "Uplifting", "Tragic", "Suspenseful", "Whimsical", "Intense",
    "Edgy", "Heartwarming", "Cynical", "Hopeful", "Melancholic",
    "Surreal", "Cerebral", "Raw", "Poetic", "Epic"
  ];

  // Tag handlers
  const toggleGenre = (genre) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const toggleNuancedTag = (tag) => {
    if (nuancedTags.includes(tag)) {
      // Remove tag
      setNuancedTags(nuancedTags.filter(t => t !== tag));
    } else {
      // Add tag with limit check
      if (nuancedTags.length >= 5) {
        setShowTagError(true);
        setTimeout(() => setShowTagError(false), 2000);
        return;
      }
      setNuancedTags([...nuancedTags, tag]);
    }
  };

  // Agreement scroll handler
  const handleAgreementScroll = (e) => {
    const element = e.target;
    const isScrolledToBottom = 
      element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    if (isScrolledToBottom && !agreementScrolled) {
      setAgreementScrolled(true);
    }
  };

  const handleTagsSubmit = (e) => {
    e.preventDefault();
    setCurrentStep(4);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await api.post("/onboarding/complete", {
        genres: selectedGenres,
        tags: nuancedTags,
        plan: selectedPlan,
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



  const renderStep = () => {
    switch (currentStep) {
      case 1:
        if (!verificationSent) {
          return (
            <form onSubmit={handleAccountCreation} className="space-y-6">
              <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Create Writer Account</h2>
              <p className="text-sm text-gray-600">Join the Ckript community</p>
              
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
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="date"
                    value={accountData.dateOfBirth}
                    onChange={(e) => setAccountData({...accountData, dateOfBirth: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent ${accountData.dateOfBirth ? "text-gray-900" : "text-gray-400"}`}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                {dobError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {dobError}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={accountData.email}
                    onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="writer@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={accountData.address}
                    onChange={(e) => setAccountData({...accountData, address: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="123 Main St, City, State, ZIP"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    value={accountData.phone}
                    onChange={(e) => { setAccountData({...accountData, phone: e.target.value}); setPhoneError(""); }}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 ${
                      phoneError ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-[#1a365d]"
                    }`}
                    placeholder="+91 00000 00000"
                    required
                  />
                </div>
                {phoneError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {phoneError}
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
                    onChange={(e) => {
                      setAccountData({...accountData, password: e.target.value});
                      if (!showPasswordReqs) setShowPasswordReqs(true);
                    }}
                    onFocus={() => setShowPasswordReqs(true)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {showPasswordReqs && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-600 mb-2">Password Requirements:</p>
                    <div className="space-y-1">
                      {(() => {
                        const validation = validatePassword(accountData.password);
                        return (
                          <>
                            <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${validation.length ? 'text-green-600' : 'text-gray-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={validation.length ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                              </svg>
                              At least 8 characters
                            </div>
                            <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${validation.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={validation.uppercase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                              </svg>
                              One uppercase letter (A-Z)
                            </div>
                            <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${validation.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={validation.lowercase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                              </svg>
                              One lowercase letter (a-z)
                            </div>
                            <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${validation.number ? 'text-green-600' : 'text-gray-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={validation.number ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                              </svg>
                              One number (0-9)
                            </div>
                            <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${validation.special ? 'text-green-600' : 'text-gray-500'}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d={validation.special ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                              </svg>
                              One special character (!@#$%^&*)
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
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
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              
              {emailError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                  {emailError}
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-center text-2xl tracking-widest text-gray-900"
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
                className="w-full bg-[#1e3a5f] text-white py-3 rounded-lg font-semibold hover:bg-[#162d4a] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Verifying..." : "Verify Email"}
                <ArrowRight size={20} />
              </button>
            </form>
          );
        }
      
      case 2:
        return (
          <form onSubmit={handleWriterProfile} className="space-y-6">
            <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Tell Us About Yourself</h2>
            <p className="text-gray-600">Help industry professionals discover you</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium text-sm">@</span>
                <input
                  type="text"
                  value={writerProfile.username}
                  onChange={(e) => setWriterProfile({...writerProfile, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")})}
                  className="w-full pl-7 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                  placeholder="e.g. john_doe"
                  required
                />
              </div>
              {usernameError && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {usernameError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio <span className="text-xs font-normal text-gray-500">(Max 500 characters)</span>
              </label>
              <textarea
                value={writerProfile.bio}
                onChange={(e) => setWriterProfile({...writerProfile, bio: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent resize-none text-gray-900"
                rows={4}
                maxLength={500}
                placeholder="Tell us about your background, voice, and experience..."
                required
              />
              <p className="text-sm text-gray-500 mt-1">{writerProfile.bio.length}/500</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Representation Status
              </label>
              <select
                value={writerProfile.representationStatus}
                onChange={(e) => setWriterProfile({...writerProfile, representationStatus: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
              >
                <option value="unrepresented">Unrepresented</option>
                <option value="manager">Manager</option>
                <option value="agent">Agent</option>
                <option value="manager_and_agent">Manager & Agent</option>
              </select>
            </div>
            
            {(writerProfile.representationStatus === "agent" || writerProfile.representationStatus === "manager_and_agent") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agency Name
                </label>
                <input
                  type="text"
                  value={writerProfile.agencyName}
                  onChange={(e) => setWriterProfile({...writerProfile, agencyName: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                  placeholder="e.g., CAA, WME, UTA"
                />
              </div>
            )}
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="wgaMember"
                checked={writerProfile.wgaMember}
                onChange={(e) => setWriterProfile({...writerProfile, wgaMember: e.target.checked})}
                className="w-5 h-5 border-gray-300 rounded focus:ring-[#0f2544]"
                style={{ accentColor: '#0f2544' }}
              />
              <label htmlFor="wgaMember" className="ml-3 text-sm font-medium text-gray-700">
                I am a WGA member
              </label>
            </div>
            
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Diversity Information <span className="text-sm font-normal text-gray-500">(Optional)</span>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This information helps producers find underrepresented voices and is completely optional.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <input
                    type="text"
                    value={writerProfile.diversity.gender}
                    onChange={(e) => setWriterProfile({
                      ...writerProfile, 
                      diversity: {...writerProfile.diversity, gender: e.target.value}
                    })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="Optional"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={writerProfile.diversity.nationality}
                    onChange={(e) => setWriterProfile({
                      ...writerProfile, 
                      diversity: {...writerProfile.diversity, nationality: e.target.value}
                    })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Links & Social Media <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio / Website</label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input type="url" value={writerProfile.links.portfolio}
                      onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, portfolio: e.target.value}})}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                      placeholder="https://yourwebsite.com" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="url" value={writerProfile.links.instagram}
                        onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, instagram: e.target.value}})}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="https://instagram.com/..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Twitter / X</label>
                    <div className="relative">
                      <Twitter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="url" value={writerProfile.links.twitter}
                        onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, twitter: e.target.value}})}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="https://x.com/..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="url" value={writerProfile.links.linkedin}
                        onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, linkedin: e.target.value}})}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="https://linkedin.com/in/..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
                    <div className="relative">
                      <Facebook className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="url" value={writerProfile.links.facebook}
                        onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, facebook: e.target.value}})}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="https://facebook.com/..." />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">IMDb</label>
                    <div className="relative">
                      <Film className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input type="url" value={writerProfile.links.imdb}
                        onChange={(e) => setWriterProfile({...writerProfile, links: {...writerProfile.links, imdb: e.target.value}})}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                        placeholder="https://imdb.com/name/..." />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accomplishments */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Accomplishments <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role / Credit</label>
                <select
                  value={writerProfile.accomplishments[0] || ""}
                  onChange={(e) => setWriterProfile({...writerProfile, accomplishments: e.target.value ? [e.target.value] : []})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                >
                  <option value="">Optional — select a credit</option>
                  <option value="co-executive-producer">Co-Executive Producer</option>
                  <option value="co-producer">Co-Producer</option>
                  <option value="executive-producer">Executive Producer</option>
                  <option value="executive-story-editor">Executive Story Editor</option>
                  <option value="producer">Producer</option>
                  <option value="showrunner">Showrunner</option>
                  <option value="staff-writer">Staff Writer</option>
                  <option value="story-editor">Story Editor</option>
                  <option value="supervising-producer">Supervising Producer</option>
                </select>
              </div>
            </div>

            {/* Representation */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Representation <span className="text-sm font-normal text-gray-500">(Optional)</span></h3>

              {[
                { key: "filmTv", label: "Film & TV Writer Representation" },
                { key: "theater", label: "Theater Representation" },
                { key: "literary", label: "Literary Representation" }
              ].map(({ key, label }) => (
                <div key={key} className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenRepSections(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                  >
                    <span className="text-sm font-semibold text-gray-800">{label}</span>
                    <ChevronDown
                      size={18}
                      className={`text-gray-500 transition-transform duration-200 ${openRepSections[key] ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openRepSections[key] && (
                    <div className="grid grid-cols-2 gap-4 p-4">
                      {[
                        { field: "agency", label: "Agency" },
                        { field: "agent", label: "Agent" },
                        { field: "managementCompany", label: "Management Company" },
                        { field: "manager", label: "Manager" },
                        { field: "lawFirm", label: "Law Firm" },
                        { field: "lawyer", label: "Lawyer" }
                      ].map(({ field, label: fieldLabel }) => (
                        <div key={field}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{fieldLabel}</label>
                          <input
                            type="text"
                            value={writerProfile.representation[key][field]}
                            onChange={(e) => setWriterProfile({
                              ...writerProfile,
                              representation: {
                                ...writerProfile.representation,
                                [key]: { ...writerProfile.representation[key], [field]: e.target.value }
                              }
                            })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent text-gray-900"
                            placeholder=""
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Privacy */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please note that unless you choose otherwise in your privacy settings, your demographic information will be searchable on the website.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                  writerProfile.demographicPrivacy === "searchable"
                    ? "border-[#0f2544] bg-[#0f2544]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="radio"
                    name="demographicPrivacy"
                    value="searchable"
                    checked={writerProfile.demographicPrivacy === "searchable"}
                    onChange={() => setWriterProfile({...writerProfile, demographicPrivacy: "searchable"})}
                    className="mt-0.5 accent-[#0f2544]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Use in search filtering</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                  writerProfile.demographicPrivacy === "private"
                    ? "border-[#0f2544] bg-[#0f2544]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="radio"
                    name="demographicPrivacy"
                    value="private"
                    checked={writerProfile.demographicPrivacy === "private"}
                    onChange={() => setWriterProfile({...writerProfile, demographicPrivacy: "private"})}
                    className="mt-0.5 accent-[#0f2544]"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Keep private</p>
                  </div>
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
          <form onSubmit={handleTagsSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Select Your Genres & Tags</h2>
              <p className="text-gray-600 mt-2">Help us match you with the right opportunities</p>
            </div>

            {/* Genre Selection - Card Grid */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Primary Genres (Select all that apply)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-4 py-3 rounded-lg font-medium text-sm transition-all border-2 ${
                      selectedGenres.includes(genre)
                        ? 'bg-[#0f2544] text-white border-[#0f2544]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Nuanced Tags - Selectable Chips */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialized Tags (Select up to 5)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Choose themes, tones, or settings you specialize in
              </p>
              
              {/* Error Message */}
              <AnimatePresence>
                {showTagError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 mb-3 text-red-600 text-sm bg-red-50 p-3 rounded-lg"
                  >
                    <AlertCircle size={16} />
                    <span>Please choose your top 5 only.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selectable Tag Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                {allNuancedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleNuancedTag(tag)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      nuancedTags.includes(tag)
                        ? 'bg-[#0f2544] text-white border-[#0f2544]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-3 flex items-center justify-between">
                <span>{nuancedTags.length}/5 tags selected</span>
                {nuancedTags.length > 0 && (
                  <span className="font-medium text-[#0f2544]">
                    Selected: {nuancedTags.join(', ')}
                  </span>
                )}
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
              <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Choose Your Plan</h2>
              <p className="text-gray-600 mt-2">Select the plan that works best for you</p>
            </div>

            {/* Plan Selection */}
            <div className="grid grid-cols-2 gap-4">
              {/* Free Plan */}
              <button
                type="button"
                onClick={() => setSelectedPlan("free")}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedPlan === "free"
                    ? 'border-[#0f2544] bg-[#f0f4f8]'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">Free</h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === "free" ? 'border-[#0f2544]' : 'border-gray-300'
                  }`}>
                    {selectedPlan === "free" && (
                      <div className="w-3 h-3 bg-[#0f2544] rounded-full"></div>
                    )}
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-4">$0</div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-[#1e3a5f] flex-shrink-0 mt-0.5" />
                    Browse script snippets
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-[#1e3a5f] flex-shrink-0 mt-0.5" />
                    Basic profile
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-[#1e3a5f] flex-shrink-0 mt-0.5" />
                    Community access
                  </li>
                </ul>
              </button>

              {/* Paid Plan */}
              <button
                type="button"
                onClick={() => setSelectedPlan("paid")}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  selectedPlan === "paid"
                    ? 'border-[#0f2544] bg-[#f0f4f8]'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">Pro</h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === "paid" ? 'border-[#0f2544]' : 'border-gray-300'
                  }`}>
                    {selectedPlan === "paid" && (
                      <div className="w-3 h-3 bg-[#0f2544] rounded-full"></div>
                    )}
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-4">$130<span className="text-base text-gray-500">/mo</span></div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-[#1e3a5f] flex-shrink-0 mt-0.5" />
                    Full script hosting
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-[#1e3a5f] flex-shrink-0 mt-0.5" />
                    Professional evaluation
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-[#1e3a5f] flex-shrink-0 mt-0.5" />
                    Priority visibility
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-[#1e3a5f] flex-shrink-0 mt-0.5" />
                    Advanced analytics
                  </li>
                </ul>
              </button>
            </div>

            {/* Price Breakdown (Only for Paid) */}
            {selectedPlan === "paid" && (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Script Hosting (Monthly)</span>
                    <span className="font-semibold text-gray-900">$30.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Professional Evaluation</span>
                    <span className="font-semibold text-gray-900">$100.00</span>
                  </div>
                  <div className="border-t-2 border-gray-200 pt-3 mt-3 flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-xl text-[#0f2544]">$130.00</span>
                  </div>
                </div>
              </div>
            )}

            {/* Legal Agreement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <div
                ref={agreementRef}
                onScroll={handleAgreementScroll}
                className="border-2 border-gray-200 rounded-lg p-4 h-[150px] overflow-y-auto text-sm text-gray-700 bg-gray-50"
              >
                <h4 className="font-semibold mb-2">Ckript Submission Agreement</h4>
                <p className="mb-3">
                  By submitting your profile and/or scripts to Ckript, you agree to the following terms:
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>You retain all copyright and ownership of your work.</li>
                  <li>You grant Ckript permission to display your scripts to verified industry professionals.</li>
                  <li>You confirm that you own the rights to any material you submit or have permission to submit it.</li>
                  <li>You release Ckript from liability if similar content is independently produced.</li>
                  <li>Your profile and scripts will be viewable by verified industry professionals only.</li>
                  <li>For paid plans, payment is non-refundable after your profile is activated.</li>
                  <li>Monthly subscriptions renew automatically and can be cancelled at any time.</li>
                  <li>Ckript reserves the right to remove content that violates our community guidelines.</li>
                  <li>You agree to maintain professional conduct when interacting with other users.</li>
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
                  className="w-5 h-5 border-gray-300 rounded focus:ring-[#1e3a5f] mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ accentColor: '#1e3a5f' }}
                />
                <label
                  htmlFor="agreement"
                  className={`ml-3 text-sm ${
                    agreementScrolled ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  I have read and agree to the Terms & Conditions
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
                className="flex-1 bg-[#1e3a5f] text-white py-3 rounded-lg font-semibold hover:bg-[#162d4a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? "Processing..." : selectedPlan === "paid" ? "Pay & Publish" : "Complete Setup"}
                <CheckCircle size={20} />
              </button>
            </div>
          </form>
        );

      
      default:
        return null;
    }
  };

  // Show OTP verification screen if needed
  if (showOTPVerification) {
    return (
      <OTPVerification 
        email={userEmail} 
        onSuccess={handleOTPSuccess} 
        onBack={handleBackToSignup}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] pt-2 pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center mb-1">
            <div className="w-20 h-20 bg-[#f0f4f8] rounded-xl flex items-center justify-center">
              <FileText className="text-black" size={40} strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-sm text-gray-600">Writer Onboarding</p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isComplete = currentStep > step.num;
              
              return (
                <div key={step.num} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition text-xs font-semibold ${
                    isComplete 
                      ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white' 
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
                      isComplete ? 'bg-[#1e3a5f]' : 'bg-gray-300'
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

export default WriterOnboarding;
