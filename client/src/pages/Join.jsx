import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import OTPVerification from "../components/OTPVerification";
import BrandLogo from "../components/BrandLogo";

const EMAIL_EXISTS_MSG = "User already exists";

// Email validation regex
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

const Join = () => {
  const { join, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: searchParams.get("role") || "creator",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    
    // Validate email
    if (!isValidEmail(formData.email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    
    // Validate password
    const passwordCheck = validatePassword(formData.password);
    if (!Object.values(passwordCheck).every(Boolean)) {
      setError("Password does not meet all requirements");
      return;
    }
    
    // Check password confirmation
    if (formData.password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
    
    try {
      const response = await join(formData);
      
      // Check if OTP verification is required
      if (response?.requiresVerification) {
        setUserEmail(formData.email);
        setShowOTPVerification(true);
      } else if (response?.token) {
        // Direct login (shouldn't happen with new flow, but keeping for backwards compatibility)
        if (response.role === "investor") {
          navigate("/home");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Join failed";
      setError(msg);
    }
  };

  const handleOTPSuccess = (userData) => {
    // Update auth context with user data
    setUser(userData);
    
    // Navigate based on role
    if (userData.role === "investor") {
      navigate("/home");
    } else {
      navigate("/dashboard");
    }
  };

  const handleBackToSignup = () => {
    setShowOTPVerification(false);
    setUserEmail("");
  };

  const isEmailExists = error === EMAIL_EXISTS_MSG;
  const passwordValidation = validatePassword(formData.password);
  const allPasswordReqsMet = Object.values(passwordValidation).every(Boolean);

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Form panel */}
      <div className="w-full flex flex-col items-center justify-center px-6 pt-4 pb-12">
          <div className="flex items-center justify-center mb-0">
            <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center">
              <BookOpen className="text-black" size={40} strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-gray-400 text-sm font-medium mb-6">Reader Onboarding</p>
        <div className="w-full max-w-[540px] bg-white rounded-2xl shadow-lg border border-gray-100 p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create your account</h2>
            <p className="text-[15px] text-gray-400 mt-1.5 font-medium">Get started with Ckript in seconds</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              <span>
                {isEmailExists ? (
                  <>An account with this email already exists.{" "}
                    <Link to="/login" className="underline hover:no-underline">Sign in instead →</Link>
                  </>
                ) : error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">Full name</label>
              <input type="text" placeholder="Your full name"
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 focus:bg-white transition-all duration-200"
                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">Email address</label>
              <input type="email" placeholder="you@example.com"
                className={`w-full px-4 py-3 bg-gray-50/80 border rounded-xl text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:bg-white transition-all duration-200 ${
                  emailError
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                    : 'border-gray-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/10'
                }`}
                value={formData.email} 
                onChange={(e) => { 
                  setFormData({ ...formData, email: e.target.value }); 
                  setEmailError(""); 
                }} 
                onBlur={() => formData.email && !isValidEmail(formData.email) && setEmailError("Invalid email format")}
                required />
              {emailError && (
                <p className="mt-1.5 text-[12px] font-semibold text-red-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  {emailError}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">Password</label>
              <input type="password" placeholder="Create a strong password"
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 focus:bg-white transition-all duration-200"
                value={formData.password} 
                onChange={(e) => { 
                  setFormData({ ...formData, password: e.target.value }); 
                  setPasswordMismatch(false); 
                  if (!showPasswordReqs) setShowPasswordReqs(true);
                }} 
                onFocus={() => setShowPasswordReqs(true)}
                required />
              {showPasswordReqs && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-[11px] font-semibold text-gray-600 mb-2">Password Requirements:</p>
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${passwordValidation.length ? 'text-green-600' : 'text-gray-500'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={passwordValidation.length ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${passwordValidation.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={passwordValidation.uppercase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      One uppercase letter (A-Z)
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${passwordValidation.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={passwordValidation.lowercase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      One lowercase letter (a-z)
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${passwordValidation.number ? 'text-green-600' : 'text-gray-500'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={passwordValidation.number ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      One number (0-9)
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${passwordValidation.special ? 'text-green-600' : 'text-gray-500'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={passwordValidation.special ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      One special character (!@#$%^&*)
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">Confirm password</label>
              <input type="password" placeholder="Re-enter your password"
                className={`w-full px-4 py-3 bg-gray-50/80 border rounded-xl text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:bg-white transition-all duration-200 ${
                  passwordMismatch
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                    : 'border-gray-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/10'
                }`}
                value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMismatch(false); }} required />
              {passwordMismatch && (
                <p className="mt-1.5 text-[12px] font-semibold text-red-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  Passwords do not match
                </p>
              )}
            </div>
            <button type="submit" className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl text-[15px] font-bold hover:bg-[#162d4a] transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-[#1e3a5f]/20 hover:-translate-y-0.5 mt-1">
              Create account
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-gray-400 font-medium">
            Already have an account? <Link to="/login" className="text-[#1e3a5f] font-semibold hover:text-[#162d4a] transition-colors">Sign in</Link>
          </p>
          <p className="mt-3 text-center">
            <Link to="/" className="text-[13px] text-gray-400 hover:text-gray-600 font-medium transition-colors">&larr; Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Join;
