import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import api from "../services/api";
import PasswordInput from "../components/PasswordInput";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // 'email' | 'reset' | 'done'
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputsRef = useRef([]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const id = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const otp = otpDigits.join("");

  const handleOtpChange = (idx, value) => {
    const digit = value.replace(/\D/g, "").slice(0, 1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    if (digit && idx < 5) {
      otpInputsRef.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
      otpInputsRef.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setOtpDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpInputsRef.current[focusIdx]?.focus();
  };

  const requestOtp = async (targetEmail) => {
    const { data } = await api.post("/auth/forgot-password", { email: targetEmail });
    if (data?.resendCooldownSeconds) {
      setResendCooldown(data.resendCooldownSeconds);
    } else {
      setResendCooldown(60);
    }
    return data;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await requestOtp(email.trim().toLowerCase());
      setInfo(
        "If an account with that email exists, we've sent a 6-digit reset code. Check your inbox (and spam folder)."
      );
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setError("");
    setInfo("");
    setResendLoading(true);
    try {
      const { data } = await api.post("/auth/resend-reset-otp", {
        email: email.trim().toLowerCase(),
      });
      setResendCooldown(data?.resendCooldownSeconds || 60);
      setInfo("A new reset code has been sent if the account exists.");
    } catch (err) {
      const data = err.response?.data;
      if (data?.cooldownRemainingSeconds) {
        setResendCooldown(data.cooldownRemainingSeconds);
      }
      setError(data?.message || "Failed to resend code.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
      });
      setStep("done");
    } catch (err) {
      const data = err.response?.data;
      const message = data?.message || "Failed to reset password.";
      setError(message);
      if (/expired|request a new/i.test(message)) {
        // Allow user to request a fresh code
        setOtpDigits(["", "", "", "", "", ""]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#080e18] relative overflow-hidden flex-col items-start justify-between p-12 border-r border-[#151f2e]">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/[0.025] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-white/[0.025] rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

        <div className="relative z-10">
          <BrandLogo className="h-10 w-auto" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative z-10 max-w-xs"
        >
          <h2 className="text-2xl font-bold text-white leading-snug tracking-tight mb-3">
            Reset your password<br />in a few seconds.
          </h2>
          <p className="text-[#4a5a6e] text-sm leading-relaxed">
            We'll email you a verification code so you can set a new password securely.
          </p>
        </motion.div>

        <div className="relative z-10">
          <p className="text-[11px] text-[#2a3a4e] font-medium">&copy; 2026 Ckript. All rights reserved.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px]"
        >
          <div className="lg:hidden mb-10">
            <BrandLogo className="h-9 w-auto" />
          </div>

          <div className="mb-8">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {step === "done" ? "Password updated" : "Forgot password"}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {step === "email" &&
                "Enter your account email and we'll send you a verification code."}
              {step === "reset" &&
                "Enter the 6-digit code we sent to your email along with a new password."}
              {step === "done" &&
                "Your password has been reset successfully. You can now sign in."}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-medium flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {info && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-xl text-sm font-medium flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{info}</span>
            </motion.div>
          )}

          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
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
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-[#1e3a5f] hover:bg-[#162d4a] text-white !text-white rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? "Sending…" : (<>Send reset code <ArrowRight className="w-4 h-4" /></>)}
              </button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                  6-digit code sent to {email}
                </label>
                <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpInputsRef.current[i] = el)}
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-12 text-center text-lg font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-all"
                    />
                  ))}
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendLoading}
                    className="text-xs font-medium text-[#1e3a5f] hover:text-[#162d4a] disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : resendLoading
                        ? "Sending…"
                        : "Resend code"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                  New password
                </label>
                <PasswordInput
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-all duration-200"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1.5">
                  Confirm new password
                </label>
                <PasswordInput
                  placeholder="Re-enter password"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-all duration-200"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-[#1e3a5f] hover:bg-[#162d4a] text-white !text-white rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          )}

          {step === "done" && (
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="w-full py-3 bg-[#1e3a5f] hover:bg-[#162d4a] text-white !text-white rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
            >
              Back to sign in <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="mt-6 pt-6 border-t border-slate-200 space-y-3 text-center">
            <p className="text-sm text-slate-600">
              Remembered your password?{" "}
              <Link to="/login" className="text-[#1e3a5f] font-semibold hover:text-[#162d4a] transition-colors">
                Sign in
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

export default ForgotPassword;
