import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { UserPlus, MapPin, Phone } from "lucide-react";
import OTPVerification from "../components/OTPVerification";
import BrandLogo from "../components/BrandLogo";
import api from "../services/api";

const EMAIL_EXISTS_MSG = "User already exists";

// Comprehensive email validation
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  // Trim and convert to lowercase
  email = email.trim().toLowerCase();
  
  // Check length
  if (email.length > 254 || email.length < 5) return false;
  
  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  
  // Additional checks
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [localPart, domain] = parts;
  
  // Local part validation
  if (localPart.length > 64 || localPart.length === 0) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.includes('..')) return false;
  
  // Domain validation
  if (domain.length === 0 || domain.startsWith('-') || domain.endsWith('-')) return false;
  if (domain.includes('..')) return false;
  if (!domain.includes('.')) return false;
  
  // Check for valid TLD (at least 2 characters)
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  
  return true;
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

const PHONE_REGEX = /^[+]?[\d\s\-().]{7,15}$/;
const CITY_STATE_REGEX = /^[a-zA-Z][a-zA-Z\s.'-]{1,}$/;
const INDIA_COUNTRY_NAME = "India";
const INDIA_ZIP_REGEX = /^\d{6}$/;
const INTERNATIONAL_POSTAL_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\s-]{2,11}$/;

const DEFAULT_ADDRESS_FIELDS = {
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: INDIA_COUNTRY_NAME,
};

const ENABLED_SIGNUP_ROLES = new Set(["creator", "investor"]);
const DEFAULT_SIGNUP_ROLE = "creator";
const REFERRAL_STORAGE_KEY = "sb:referral-code";
const REFERRAL_MAX_LENGTH = 40;

const normalizeReferralInput = (value = "") =>
  String(value || "")
    .trim()
    .slice(0, REFERRAL_MAX_LENGTH);

const Join = () => {
  const { join, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = String(searchParams.get("role") || "").toLowerCase();
  const initialRole = ENABLED_SIGNUP_ROLES.has(requestedRole) ? requestedRole : DEFAULT_SIGNUP_ROLE;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [zipLookupLoading, setZipLookupLoading] = useState(false);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const zipLookupRequestRef = useRef(0);
  const [otpConfig, setOtpConfig] = useState({
    otpExpirySeconds: undefined,
    resendCooldownSeconds: undefined,
    startCooldownOnMount: false,
  });
  const [addressFields, setAddressFields] = useState(DEFAULT_ADDRESS_FIELDS);
  const [isOutsideIndia, setIsOutsideIndia] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: initialRole,
  });

  const requiresContactDetails = formData.role === "investor";

  useEffect(() => {
    if (requestedRole && !ENABLED_SIGNUP_ROLES.has(requestedRole)) {
      navigate("/signup", { replace: true });
    }
  }, [navigate, requestedRole]);

  useEffect(() => {
    const referralFromUrl = normalizeReferralInput(
      searchParams.get("ref") || searchParams.get("referral") || searchParams.get("referralCode")
    );

    if (referralFromUrl) {
      setReferralCode(referralFromUrl);
      if (typeof window !== "undefined") {
        localStorage.setItem(REFERRAL_STORAGE_KEY, referralFromUrl);
      }
      return;
    }

    if (typeof window !== "undefined") {
      const stored = normalizeReferralInput(localStorage.getItem(REFERRAL_STORAGE_KEY));
      if (stored) {
        setReferralCode(stored);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!requiresContactDetails) {
      setZipLookupLoading(false);
      return;
    }

    if (isOutsideIndia) {
      setZipLookupLoading(false);
      return;
    }

    const zipCode = String(addressFields.zipCode || "").trim();
    if (!INDIA_ZIP_REGEX.test(zipCode)) {
      setZipLookupLoading(false);
      return;
    }

    const requestId = Date.now();
    zipLookupRequestRef.current = requestId;
    let isActive = true;

    const lookupZipInfo = async () => {
      setZipLookupLoading(true);
      try {
        const { data } = await api.get(`/auth/zip-info/${zipCode}`);
        if (!isActive || zipLookupRequestRef.current !== requestId) return;

        if (data?.valid === false) {
          if (data?.message) {
            setAddressError(data.message);
          }
          return;
        }

        const resolvedCity = String(data?.city || "").trim();
        const resolvedState = String(data?.state || "").trim();

        setAddressFields((prev) => {
          if (prev.zipCode !== zipCode) return prev;
          return {
            ...prev,
            city: resolvedCity || prev.city,
            state: resolvedState || prev.state,
          };
        });

        setAddressError("");
      } catch (err) {
        if (!isActive || zipLookupRequestRef.current !== requestId) return;
        const message = err?.response?.data?.message;
        if (message) {
          setAddressError(message);
        }
      } finally {
        if (isActive && zipLookupRequestRef.current === requestId) {
          setZipLookupLoading(false);
        }
      }
    };

    lookupZipInfo();

    return () => {
      isActive = false;
    };
  }, [addressFields.zipCode, isOutsideIndia, requiresContactDetails]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setEmailError("");
    setPhoneError("");
    setAddressError("");

    const trimmedName = String(formData.name || "").trim();
    if (!trimmedName) {
      setError("Please enter your full name");
      return;
    }
    
    // Trim and sanitize email
    const sanitizedEmail = formData.email.trim().toLowerCase();
    
    // Validate email
    if (!isValidEmail(sanitizedEmail)) {
      setEmailError("Please enter a valid email address (e.g., user@example.com)");
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

    const signupPayload = {
      ...formData,
      name: trimmedName,
      email: sanitizedEmail,
      referralCode: normalizeReferralInput(referralCode),
    };

    const normalizedReferralCode = signupPayload.referralCode;
    if (typeof window !== "undefined") {
      if (normalizedReferralCode) {
        localStorage.setItem(REFERRAL_STORAGE_KEY, normalizedReferralCode);
      } else {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }
    }

    if (!normalizedReferralCode) {
      delete signupPayload.referralCode;
    }

    if (requiresContactDetails) {
      const phone = String(formData.phone || "").trim();
      const street = String(addressFields.street || "").trim();
      const city = String(addressFields.city || "").trim();
      const state = String(addressFields.state || "").trim();
      const zipCode = String(addressFields.zipCode || "").trim();
      const country = isOutsideIndia
        ? String(addressFields.country || "").trim()
        : INDIA_COUNTRY_NAME;

      if (!phone) {
        setPhoneError("Phone number is required");
        return;
      }

      if (!PHONE_REGEX.test(phone)) {
        setPhoneError("Please enter a valid phone number (e.g. +91 00000 00000)");
        return;
      }

      if (!street || !city || !state || !zipCode || !country) {
        setAddressError("Street, city, state, postal code, and country are required");
        return;
      }

      if (!isOutsideIndia) {
        if (!INDIA_ZIP_REGEX.test(zipCode)) {
          setAddressError("ZIP code must be exactly 6 digits");
          return;
        }
      } else if (!INTERNATIONAL_POSTAL_REGEX.test(zipCode)) {
        setAddressError("Enter a valid postal code (3-12 letters, numbers, spaces, or hyphen)");
        return;
      }

      if (!CITY_STATE_REGEX.test(city) || !CITY_STATE_REGEX.test(state)) {
        setAddressError("Enter a valid city and state name");
        return;
      }

      signupPayload.phone = phone;
      signupPayload.address = {
        street,
        city,
        state,
        zipCode,
        country,
        formatted: isOutsideIndia
          ? `${street}, ${city}, ${state}, ${zipCode}, ${country}`
          : `${street}, ${city}, ${state}, ${zipCode}`,
      };
    }
    
    setSubmitting(true);

    try {
      if (requiresContactDetails && !isOutsideIndia) {
        await api.post("/auth/validate-address", {
          address: signupPayload.address.formatted,
        });
      }

      const response = await join(signupPayload);
      
      // Check if OTP verification is required
      if (response?.requiresVerification) {
        setUserEmail(response?.email || sanitizedEmail);
        setOtpConfig({
          otpExpirySeconds: response?.otpExpirySeconds,
          resendCooldownSeconds: response?.resendCooldownSeconds,
          startCooldownOnMount: true,
        });
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
      const msg = err.response?.data?.message
        || (err.code === "ERR_NETWORK"
          ? "Unable to connect to server. Please make sure backend is running on http://localhost:5001"
          : "Join failed");

      if (/zip|city|state|address/i.test(msg)) {
        setAddressError(msg);
      } else if (/phone/i.test(msg)) {
        setPhoneError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
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
    setOtpConfig({
      otpExpirySeconds: undefined,
      resendCooldownSeconds: undefined,
      startCooldownOnMount: false,
    });
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
        otpExpirySeconds={otpConfig.otpExpirySeconds}
        initialResendCooldownSeconds={otpConfig.resendCooldownSeconds}
        startCooldownOnMount={otpConfig.startCooldownOnMount}
        darkBackground
      />
    );
  }

  return (
    <div className="reader-signup-page min-h-screen relative overflow-hidden flex items-center justify-center !bg-[#080e18]">
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute top-0 left-0 w-[480px] h-[480px] bg-white/[0.03] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[360px] h-[360px] bg-white/[0.02] rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

      {/* Form panel */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center px-6 pt-8 pb-12">
          <div className="mb-5">
            <BrandLogo className="h-10 w-auto" />
          </div>
          <div className="flex items-center justify-center mb-0">
            <div className="w-20 h-20 bg-[#0d1520] border border-[#1a2433] rounded-xl flex items-center justify-center shadow-lg shadow-black/25">
              <UserPlus className="text-white" size={40} strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-[#8ea0b5] text-sm font-medium mb-6">Account Setup</p>
        <div className="reader-signup-panel w-full max-w-[540px] bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200 p-10 backdrop-blur-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
            <p className="reader-muted text-[15px] mt-1.5 font-medium">Get started with Ckript in seconds</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              <span>
                {isEmailExists ? (
                  <>An account with this email already exists.{" "}
                    <Link to="/login" className="underline hover:no-underline text-[#1e3a5f]">Sign in instead →</Link>
                  </>
                ) : error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#8fa2b8] mb-2">Full name</label>
              <input type="text" placeholder="Your full name"
                className="w-full px-4 py-3 bg-[#0b121c] border border-[#243447] rounded-xl text-[15px] text-white placeholder-[#506074] outline-none focus:border-[#3f5d7a] focus:ring-2 focus:ring-[#3f5d7a]/20 transition-all duration-200"
                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8fa2b8] mb-2">Email address</label>
              <input type="email" placeholder="you@example.com"
                className={`w-full px-4 py-3 bg-[#0b121c] border rounded-xl text-[15px] text-white placeholder-[#506074] outline-none focus:ring-2 transition-all duration-200 ${
                  emailError
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-500/20'
                    : 'border-[#243447] focus:border-[#3f5d7a] focus:ring-[#3f5d7a]/20'
                }`}
                value={formData.email} 
                onChange={(e) => { 
                  setFormData({ ...formData, email: e.target.value }); 
                  setEmailError(""); 
                }} 
                onBlur={() => formData.email && !isValidEmail(formData.email) && setEmailError("Invalid email format")}
                required />
              {emailError && (
                <p className="mt-1.5 text-[12px] font-semibold text-red-300 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  {emailError}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8fa2b8] mb-2">Referral code (optional)</label>
              <input
                type="text"
                placeholder="Enter referral code or writer username"
                className="w-full px-4 py-3 bg-[#0b121c] border border-[#243447] rounded-xl text-[15px] text-white placeholder-[#506074] outline-none focus:border-[#3f5d7a] focus:ring-2 focus:ring-[#3f5d7a]/20 transition-all duration-200"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.slice(0, REFERRAL_MAX_LENGTH))}
              />
              <p className="mt-1.5 text-[11px] text-[#8fa2b8]">
                You and your referrer both get 15 credits after successful signup verification.
              </p>
            </div>
            {requiresContactDetails && (
              <div className="reader-address-card rounded-xl border border-[#243447] bg-[#0a111b] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-[#8fa2b8]" />
                  <label className="text-[13px] font-semibold text-[#c8d4e3]">Address details</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAddressFields((prev) => ({
                        ...prev,
                        country: isOutsideIndia ? INDIA_COUNTRY_NAME : "",
                        zipCode: "",
                        city: "",
                        state: "",
                      }));
                      setIsOutsideIndia((prev) => !prev);
                      setAddressError("");
                      setZipLookupLoading(false);
                    }}
                    className={`ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      isOutsideIndia
                        ? "border-black bg-black text-white"
                        : "border-black bg-white text-black hover:bg-gray-100"
                    }`}
                  >
                    {isOutsideIndia && (
                      <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isOutsideIndia ? "Outside India Enabled" : "Outside India"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {isOutsideIndia && (
                    <div>
                      <label className="block text-[12px] font-semibold text-[#8fa2b8] mb-1.5">Country</label>
                      <input
                        type="text"
                        value={addressFields.country}
                        onChange={(e) => {
                          setAddressFields({ ...addressFields, country: e.target.value });
                          setAddressError("");
                        }}
                        className="w-full px-3.5 py-2.5 bg-[#0b121c] border border-[#243447] rounded-xl text-[14px] text-white placeholder-[#506074] outline-none focus:border-[#3f5d7a] focus:ring-2 focus:ring-[#3f5d7a]/20"
                        placeholder="United Kingdom"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[12px] font-semibold text-[#8fa2b8] mb-1.5">
                      {isOutsideIndia ? "Postal code" : "ZIP code"}
                    </label>
                    <input
                      type="text"
                      inputMode={isOutsideIndia ? "text" : "numeric"}
                      maxLength={isOutsideIndia ? 12 : 6}
                      value={addressFields.zipCode}
                      onChange={(e) => {
                        const nextPostalValue = isOutsideIndia
                          ? e.target.value.replace(/[^a-zA-Z0-9\s-]/g, "").slice(0, 12)
                          : e.target.value.replace(/\D/g, "").slice(0, 6);
                        setAddressFields({ ...addressFields, zipCode: nextPostalValue });
                        setAddressError("");
                      }}
                      className="w-full px-3.5 py-2.5 bg-[#0b121c] border border-[#243447] rounded-xl text-[14px] text-white placeholder-[#506074] outline-none focus:border-[#3f5d7a] focus:ring-2 focus:ring-[#3f5d7a]/20"
                      placeholder={isOutsideIndia ? "SW1A 1AA" : "400001"}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-[#8fa2b8] mb-1.5">State</label>
                    <input
                      type="text"
                      value={addressFields.state}
                      onChange={(e) => {
                        setAddressFields({ ...addressFields, state: e.target.value });
                        setAddressError("");
                      }}
                      className="w-full px-3.5 py-2.5 bg-[#0b121c] border border-[#243447] rounded-xl text-[14px] text-white placeholder-[#506074] outline-none focus:border-[#3f5d7a] focus:ring-2 focus:ring-[#3f5d7a]/20"
                      placeholder={isOutsideIndia ? "State / Province" : "Maharashtra"}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-[#8fa2b8] mb-1.5">City</label>
                    <input
                      type="text"
                      value={addressFields.city}
                      onChange={(e) => {
                        setAddressFields({ ...addressFields, city: e.target.value });
                        setAddressError("");
                      }}
                      className="w-full px-3.5 py-2.5 bg-[#0b121c] border border-[#243447] rounded-xl text-[14px] text-white placeholder-[#506074] outline-none focus:border-[#3f5d7a] focus:ring-2 focus:ring-[#3f5d7a]/20"
                      placeholder={isOutsideIndia ? "London" : "Mumbai"}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#8fa2b8] mb-1.5">Street address</label>
                  <input
                    type="text"
                    value={addressFields.street}
                    onChange={(e) => {
                      setAddressFields({ ...addressFields, street: e.target.value });
                      setAddressError("");
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#0b121c] border border-[#243447] rounded-xl text-[14px] text-white placeholder-[#506074] outline-none focus:border-[#3f5d7a] focus:ring-2 focus:ring-[#3f5d7a]/20"
                    placeholder="House/Flat, Street, Area"
                    required
                  />
                </div>

                {zipLookupLoading && !isOutsideIndia && (
                  <p className="text-[11px] text-[#8fa2b8]">Looking up ZIP code and auto-filling city/state...</p>
                )}

                {isOutsideIndia && (
                  <p className="text-[11px] text-[#8fa2b8]">Enter country and postal code exactly as used in your region.</p>
                )}

                {addressError && (
                  <p className="text-[12px] font-semibold text-red-300 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    {addressError}
                  </p>
                )}
              </div>
            )}
            {requiresContactDetails && (
              <div>
                <label className="block text-[13px] font-semibold text-[#8fa2b8] mb-2">Phone number</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3.5 text-[#506074]" />
                  <input
                    type="tel"
                    placeholder="+91 00000 00000"
                    className={`w-full pl-10 pr-4 py-3 bg-[#0b121c] border rounded-xl text-[15px] text-white placeholder-[#506074] outline-none focus:ring-2 transition-all duration-200 ${
                      phoneError
                        ? "border-red-400 focus:border-red-400 focus:ring-red-500/20"
                        : "border-[#243447] focus:border-[#3f5d7a] focus:ring-[#3f5d7a]/20"
                    }`}
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      setPhoneError("");
                    }}
                    required
                  />
                </div>
                {phoneError && (
                  <p className="mt-1.5 text-[12px] font-semibold text-red-300 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    {phoneError}
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="block text-[13px] font-semibold text-[#8fa2b8] mb-2">Password</label>
              <input type="password" placeholder="Create a strong password"
                className="w-full px-4 py-3 bg-[#0b121c] border border-[#243447] rounded-xl text-[15px] text-white placeholder-[#506074] outline-none focus:border-[#3f5d7a] focus:ring-2 focus:ring-[#3f5d7a]/20 transition-all duration-200"
                value={formData.password} 
                onChange={(e) => { 
                  setFormData({ ...formData, password: e.target.value }); 
                  setPasswordMismatch(false); 
                  if (!showPasswordReqs) setShowPasswordReqs(true);
                }} 
                onFocus={() => setShowPasswordReqs(true)}
                required />
              {showPasswordReqs && (
                <div className="reader-password-hint mt-2 p-3 bg-[#0a111b] rounded-lg border border-[#1f2b3c]">
                  <p className="text-[11px] font-semibold text-[#8fa2b8] mb-2">Password Requirements:</p>
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${passwordValidation.length ? 'text-emerald-400' : 'text-[#6e7f95]'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={passwordValidation.length ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${passwordValidation.uppercase ? 'text-emerald-400' : 'text-[#6e7f95]'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={passwordValidation.uppercase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      One uppercase letter (A-Z)
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${passwordValidation.lowercase ? 'text-emerald-400' : 'text-[#6e7f95]'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={passwordValidation.lowercase ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      One lowercase letter (a-z)
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${passwordValidation.number ? 'text-emerald-400' : 'text-[#6e7f95]'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={passwordValidation.number ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                      </svg>
                      One number (0-9)
                    </div>
                    <div className={`flex items-center gap-2 text-[11px] font-medium transition-colors ${passwordValidation.special ? 'text-emerald-400' : 'text-[#6e7f95]'}`}>
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
              <label className="block text-[13px] font-semibold text-[#8fa2b8] mb-2">Confirm password</label>
              <input type="password" placeholder="Re-enter your password"
                className={`w-full px-4 py-3 bg-[#0b121c] border rounded-xl text-[15px] text-white placeholder-[#506074] outline-none focus:ring-2 transition-all duration-200 ${
                  passwordMismatch
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-500/20'
                    : 'border-[#243447] focus:border-[#3f5d7a] focus:ring-[#3f5d7a]/20'
                }`}
                value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMismatch(false); }} required />
              {passwordMismatch && (
                <p className="mt-1.5 text-[12px] font-semibold text-red-300 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  Passwords do not match
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl text-[15px] font-bold hover:bg-[#162d4a] transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-[#1e3a5f]/25 hover:-translate-y-0.5 mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm flex items-center justify-center gap-2"
            >
              {submitting && (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {submitting ? "Creating account..." : "Create account"}
            </button>

            {submitting && (
              <p className="reader-muted text-center text-[12px] font-medium">Checking details and creating your account...</p>
            )}
          </form>

          <p className="reader-muted mt-8 text-center text-[14px] font-medium">
            Already have an account? <Link to="/login" className="reader-primary-link font-semibold transition-colors">Sign in</Link>
          </p>
          <p className="mt-3 text-center">
            <Link to="/" className="reader-muted text-[13px] font-medium transition-colors hover:text-slate-700">&larr; Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Join;
