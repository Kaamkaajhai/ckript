import { useContext, useState } from "react";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, AlertCircle, Clock, XCircle } from "lucide-react";
import OTPVerification from "../components/OTPVerification";
import BrandLogo from "../components/BrandLogo";

const Login = () => {
  const { login, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);
  const [accountRejected, setAccountRejected] = useState(false);
  const [rejectedMessage, setRejectedMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userData = await login(email, password);
      
      // Check if OTP verification is required
      if (userData?.requiresVerification) {
        setUserEmail(email);
        setShowOTPVerification(true);
        setLoading(false);
        return;
      }
      
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser?.role === "reader") {
        navigate("/reader");
      } else if (storedUser?.role === "investor") {
        navigate("/home");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.pendingApproval) {
        setPendingApproval(true);
        setLoading(false);
        return;
      }
      if (data?.rejected) {
        setAccountRejected(true);
        setRejectedMessage(data.message || "Your investor account has been rejected. Please contact support.");
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
      setPendingApproval(true);
      return;
    }

    // Update auth context with user data
    setUser(userData);
    
    // Navigate based on role
    if (userData.role === "reader") {
      navigate("/reader");
    } else if (userData.role === "investor") {
      navigate("/home");
    } else {
      navigate("/dashboard");
    }
  };

  const handleBackToLogin = () => {
    setShowOTPVerification(false);
    setUserEmail("");
  };

  // Show OTP verification screen if needed
  if (showOTPVerification) {
    return (
      <OTPVerification 
        email={userEmail} 
        onSuccess={handleOTPSuccess} 
        onBack={handleBackToLogin}
      />
    );
  }

  // Show pending approval screen for investors
  if (pendingApproval) {
    return (
      <div className="min-h-screen bg-[#080e18] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Account Pending Approval</h2>
          <p className="text-[#8896a7] text-sm leading-relaxed mb-6">
            Your investor account has been submitted and is currently under review.<br />
            You'll be able to log in once an admin approves your account.
          </p>
          <p className="text-xs text-[#4a5a6e]">
            Need help?{" "}
            <a href="mailto:info.ckript@gmail.com" className="text-[#8896a7] font-semibold hover:text-white transition-colors">
              info.ckript@gmail.com
            </a>
          </p>
          <button onClick={() => setPendingApproval(false)} className="mt-8 text-xs text-[#4a5a6e] hover:text-[#8896a7] font-medium transition-colors">
            &larr; Back to login
          </button>
        </motion.div>
      </div>
    );
  }

  // Show rejected screen for investors
  if (accountRejected) {
    return (
      <div className="min-h-screen bg-[#080e18] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Account Not Approved</h2>
          <p className="text-[#8896a7] text-sm leading-relaxed mb-6">{rejectedMessage}</p>
          <p className="text-xs text-[#4a5a6e]">
            Contact{" "}
            <a href="mailto:info.ckript@gmail.com" className="text-[#8896a7] font-semibold hover:text-white transition-colors">
              info.ckript@gmail.com
            </a>{" "}
            for assistance.
          </p>
          <button onClick={() => setAccountRejected(false)} className="mt-8 text-xs text-[#4a5a6e] hover:text-[#8896a7] font-medium transition-colors">
            &larr; Back to login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080e18] flex">

      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col items-start justify-between p-12 border-r border-[#151f2e]">
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
            <h1 className="text-xl font-bold text-white tracking-tight">Sign in</h1>
            <p className="text-sm text-[#4a5a6e] mt-1.5">Enter your credentials to continue</p>
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
              <label className="block text-[11px] font-medium text-[#4a5a6e] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-[#0d1520] border border-[#1c2a3a] rounded-xl text-sm text-white placeholder-[#2a3a4e] outline-none focus:border-[#374d63] focus:ring-1 focus:ring-[#374d63] transition-all duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#4a5a6e] mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#0d1520] border border-[#1c2a3a] rounded-xl text-sm text-white placeholder-[#2a3a4e] outline-none focus:border-[#374d63] focus:ring-1 focus:ring-[#374d63] transition-all duration-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-white hover:bg-gray-100 text-[#080e18] rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          <div className="mt-6 pt-6 border-t border-[#151f2e] space-y-3 text-center">
            <p className="text-sm text-[#4a5a6e]">
              Don't have an account?{" "}
              <Link to="/join" className="text-[#8896a7] font-semibold hover:text-white transition-colors">
                Create one
              </Link>
            </p>
            <p>
              <Link to="/" className="text-xs text-[#2a3a4e] hover:text-[#4a5a6e] font-medium transition-colors">
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
