import { useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
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
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WriterOnboarding = () => {
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
    role: "creator"
  });
  
  // Email Verification
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  
  // Step 2: Writer Profile
  const [writerProfile, setWriterProfile] = useState({
    bio: "",
    representationStatus: "unrepresented",
    agencyName: "",
    wgaMember: false,
    diversity: {
      gender: "",
      ethnicity: "",
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
      // Create account using AuthContext join function
      await join({
        name: accountData.name,
        email: accountData.email,
        password: accountData.password,
        role: "creator"
      });
      
      // Send verification email
      await api.post("/onboarding/send-verification");
      setVerificationSent(true);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Join failed");
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

  const handleWriterProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
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
              <p className="text-sm text-gray-600">Join the Script Bridge community</p>
              
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
                    placeholder="John Doe"
                    required
                  />
                </div>
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
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                    placeholder="writer@example.com"
                    required
                  />
                </div>
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
          <form onSubmit={handleWriterProfile} className="space-y-6">
            <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Tell Us About Yourself</h2>
            <p className="text-gray-600">Help industry professionals discover you</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio (Max 500 characters)
              </label>
              <textarea
                value={writerProfile.bio}
                onChange={(e) => setWriterProfile({...writerProfile, bio: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent resize-none"
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
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
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
                className="w-5 h-5 text-[#1a365d] border-gray-300 rounded focus:ring-[#1a365d]"
              />
              <label htmlFor="wgaMember" className="ml-3 text-sm font-medium text-gray-700">
                I am a WGA member
              </label>
            </div>
            
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Diversity Information (Optional)
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
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ethnicity
                  </label>
                  <input
                    type="text"
                    value={writerProfile.diversity.ethnicity}
                    onChange={(e) => setWriterProfile({
                      ...writerProfile, 
                      diversity: {...writerProfile.diversity, ethnicity: e.target.value}
                    })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1a365d] focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>
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
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    Browse script snippets
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    Basic profile
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
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
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    Full script hosting
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    Professional evaluation
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    Priority visibility
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
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
                <h4 className="font-semibold mb-2">Script Bridge Submission Agreement</h4>
                <p className="mb-3">
                  By submitting your profile and/or scripts to ScriptBridge, you agree to the following terms:
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>You retain all copyright and ownership of your work.</li>
                  <li>You grant ScriptBridge permission to display your scripts to verified industry professionals.</li>
                  <li>You confirm that you own the rights to any material you submit or have permission to submit it.</li>
                  <li>You release ScriptBridge from liability if similar content is independently produced.</li>
                  <li>Your profile and scripts will be viewable by verified industry professionals only.</li>
                  <li>For paid plans, payment is non-refundable after your profile is activated.</li>
                  <li>Monthly subscriptions renew automatically and can be cancelled at any time.</li>
                  <li>ScriptBridge reserves the right to remove content that violates our community guidelines.</li>
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
                  className="w-5 h-5 text-[#1a365d] border-gray-300 rounded focus:ring-[#1a365d] mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

  return (
    <div className="min-h-screen bg-[#f0f4f8] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText size={28} className="text-[#0a1628]" strokeWidth={1.5} />
            <h1 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Script Bridge</h1>
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

export default WriterOnboarding;
