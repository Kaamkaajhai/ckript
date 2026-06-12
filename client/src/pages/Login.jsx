import { useContext, useState } from "react";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import OTPVerification from "../components/OTPVerification";
import BrandLogo from "../components/BrandLogo";
import GoogleSignInButton from "../components/GoogleSignInButton";
import PasswordInput from "../components/PasswordInput";

const FORCE_DEFAULT_REDIRECT_KEY = "auth:force-default-redirect";

const Login = () => {
  const { login, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [otpConfig, setOtpConfig] = useState({
    otpExpirySeconds: undefined,
    resendCooldownSeconds: undefined,
    startCooldownOnMount: false,
  });
  const [loading, setLoading] = useState(false);

  const getSafeRedirectPath = (value = "") => {
    const path = String(value || "").trim();
    if (!path || !path.startsWith("/")) return "";
    if (path.startsWith("//")) return "";
    if (path.startsWith("/login")) return "";
    return path;
  };

  const redirectPath =
    getSafeRedirectPath(location.state?.from) ||
    getSafeRedirectPath(searchParams.get("next"));

  const navigateAfterLogin = (userData = {}) => {
    const shouldForceDefaultRedirect =
      typeof window !== "undefined" &&
      sessionStorage.getItem(FORCE_DEFAULT_REDIRECT_KEY) === "1";

    if (shouldForceDefaultRedirect && typeof window !== "undefined") {
      sessionStorage.removeItem(FORCE_DEFAULT_REDIRECT_KEY);
    }

    if (!shouldForceDefaultRedirect && redirectPath) {
      navigate(redirectPath, { replace: true });
      return;
    }

    if (userData?.role === "reader") {
      navigate("/reader", { replace: true });
    } else if (userData?.role === "investor") {
      navigate("/home", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userData = await login(email, password);
      
      // Check if OTP verification is required
      if (userData?.requiresVerification) {
        setUserEmail(userData?.email || String(email || "").trim().toLowerCase());
        setOtpConfig({
          otpExpirySeconds: userData?.otpExpirySeconds,
          resendCooldownSeconds: userData?.resendCooldownSeconds,
          startCooldownOnMount: false,
        });
        setShowOTPVerification(true);
        setLoading(false);
        return;
      }
      
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      navigateAfterLogin(storedUser || userData || {});
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        setUserEmail(data.email || String(email || "").trim().toLowerCase());
        setOtpConfig({
          otpExpirySeconds: data?.otpExpirySeconds,
          resendCooldownSeconds: data?.resendCooldownSeconds,
          startCooldownOnMount: false,
        });
        setShowOTPVerification(true);
        setLoading(false);
        return;
      }
      if (data?.pendingApproval) {
        navigate("/?investorReview=pending");
        setLoading(false);
        return;
      }
      if (data?.rejected) {
        const note = encodeURIComponent(data.message || "Your investor profile was not approved.");
        navigate(`/?investorReview=rejected&note=${note}`);
        setLoading(false);
        return;
      }
      setError(data?.message || "Login failed");
      setLoading(false);
    }
  };

  const handleOTPSuccess = (userData) => {
    // Investor pending approval — show waiting screen
    if (userData.pendingApproval) {
      setShowOTPVerification(false);
      navigate("/?investorReview=pending");
      return;
    }

    // Update auth context with user data
    setUser(userData);

    navigateAfterLogin(userData);
  };

  const handleBackToLogin = () => {
    setShowOTPVerification(false);
    setUserEmail("");
    setOtpConfig({
      otpExpirySeconds: undefined,
      resendCooldownSeconds: undefined,
      startCooldownOnMount: false,
    });
  };

  // Show OTP verification screen if needed
  if (showOTPVerification) {
    return (
      <OTPVerification 
        email={userEmail} 
        onSuccess={handleOTPSuccess} 
        onBack={handleBackToLogin}
        otpExpirySeconds={otpConfig.otpExpirySeconds}
        initialResendCooldownSeconds={otpConfig.resendCooldownSeconds}
        startCooldownOnMount={otpConfig.startCooldownOnMount}
      />
    );
  }

  return (
    <div className="login-page min-h-screen bg-white flex">

      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#080e18] relative overflow-hidden flex-col items-start justify-between p-12 border-r border-[#151f2e]">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Ambient glows */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/[0.025] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-white/[0.025] rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <BrandLogo className="h-10 w-auto" />
        </div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative z-10 max-w-xs"
        >
          <h2 className="text-2xl font-bold text-white leading-snug tracking-tight mb-3">
            Where stories find<br />their audience.
          </h2>
          <p className="text-[#4a5a6e] text-sm leading-relaxed">
            The script discovery platform for creators and industry professionals.
          </p>
        </motion.div>

        {/* Bottom copyright */}
        <div className="relative z-10">
          <p className="text-[11px] text-[#2a3a4e] font-medium">&copy; 2026 Ckript. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <BrandLogo className="h-9 w-auto" />
          </div>

          <div className="mb-8">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sign in</h1>
            <p className="text-sm text-slate-500 mt-1.5">Enter your credentials to continue</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-all duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                Password
              </label>
              <PasswordInput
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-all duration-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="mt-1.5 text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#1e3a5f] font-medium hover:text-[#162d4a] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-[#1e3a5f] hover:bg-[#162d4a] text-white !text-white rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="mt-4">
            <GoogleSignInButton
              text="signin_with"
              onSuccess={(userData) => navigateAfterLogin(userData || {})}
              onError={(msg, data) => {
                if (data?.accountNotFound) {
                  setError("No account found for that Google email. Please create an account first.");
                  return;
                }
                setError(msg);
              }}
            />
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 space-y-3 text-center">
            <p className="text-sm text-slate-600">
              Don't have an account?{" "}
              <Link to="/join" className="text-[#1e3a5f] font-semibold hover:text-[#162d4a] transition-colors">
                Create one
              </Link>
            </p>
            <p>
              <Link to="/" className="text-xs text-slate-500 hover:text-[#1e3a5f] font-medium transition-colors">
                &larr; Back to home
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
