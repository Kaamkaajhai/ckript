import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";

/* ─────────────────────────────────────────────────────────────
   Single source of truth for the password-recovery flow.

   Three steps — request a code, verify + set a new password, done —
   over the real backend:
     POST /auth/forgot-password    { email }            → emails a 6-digit OTP
     POST /auth/resend-reset-otp   { email }            → resends it
     POST /auth/reset-password     { email, otp, newPassword }

   The hook owns all of it (state machine, OTP box focus/paste, resend
   cooldown timer, request lifecycle) so the surface that renders it —
   the ForgotPasswordModal today — stays purely presentational and can
   never drift from the contract. Mirrors how the checkout hooks isolate
   their Razorpay flow.
   ───────────────────────────────────────────────────────────── */

const OTP_LENGTH = 6;
const EMPTY_OTP = Array(OTP_LENGTH).fill("");
const EMAIL_RE = /.+@.+\..+/;

export function useForgotPasswordFlow() {
  const [step, setStep] = useState("email"); // 'email' | 'reset' | 'done'
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(EMPTY_OTP);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputsRef = useRef([]);

  const otp = otpDigits.join("");

  // Resend cooldown countdown.
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const id = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  // ── OTP box helpers ───────────────────────────────────────────
  const handleOtpChange = useCallback((idx, value) => {
    const digit = String(value || "").replace(/\D/g, "").slice(0, 1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    if (error) setError("");
    if (digit && idx < OTP_LENGTH - 1) otpInputsRef.current[idx + 1]?.focus();
  }, [error]);

  const handleOtpKeyDown = useCallback((idx, e) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
      otpInputsRef.current[idx - 1]?.focus();
    }
  }, [otpDigits]);

  const handleOtpPaste = useCallback((e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = [...EMPTY_OTP];
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setOtpDigits(next);
    otpInputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }, []);

  // ── API steps ─────────────────────────────────────────────────
  const requestOtp = useCallback(async (targetEmail) => {
    const { data } = await api.post("/auth/forgot-password", { email: targetEmail });
    setResendCooldown(data?.resendCooldownSeconds || 60);
    return data;
  }, []);

  const submitEmail = useCallback(
    async (e) => {
      e?.preventDefault?.();
      setError("");
      setInfo("");
      const normalized = email.trim().toLowerCase();
      if (!EMAIL_RE.test(normalized)) {
        setError("Please enter a valid email address.");
        return;
      }
      setLoading(true);
      try {
        await requestOtp(normalized);
        setInfo("If an account exists for that email, a 6-digit reset code is on its way. Check your inbox and spam.");
        setStep("reset");
      } catch (err) {
        setError(err.response?.data?.message || "Couldn't send the reset code. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, requestOtp]
  );

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setError("");
    setInfo("");
    setResendLoading(true);
    try {
      const { data } = await api.post("/auth/resend-reset-otp", { email: email.trim().toLowerCase() });
      setResendCooldown(data?.resendCooldownSeconds || 60);
      setInfo("A new reset code has been sent if the account exists.");
    } catch (err) {
      const data = err.response?.data;
      if (data?.cooldownRemainingSeconds) setResendCooldown(data.cooldownRemainingSeconds);
      setError(data?.message || "Couldn't resend the code.");
    } finally {
      setResendLoading(false);
    }
  }, [email, resendCooldown, resendLoading]);

  const submitReset = useCallback(
    async (e) => {
      e?.preventDefault?.();
      setError("");
      setInfo("");
      if (otp.length !== OTP_LENGTH) {
        setError("Please enter the 6-digit code.");
        return;
      }
      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters.");
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
        const message = err.response?.data?.message || "Couldn't reset the password.";
        setError(message);
        // An expired/invalid code is recoverable — clear it so they can resend.
        if (/expired|request a new|invalid/i.test(message)) setOtpDigits(EMPTY_OTP);
      } finally {
        setLoading(false);
      }
    },
    [otp, newPassword, confirmPassword, email]
  );

  // Back to the email step (keeps the typed email so they can correct it).
  const backToEmail = useCallback(() => {
    setStep("email");
    setOtpDigits(EMPTY_OTP);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setInfo("");
    setResendCooldown(0);
  }, []);

  // Full reset to the initial state (used when the surface is dismissed/reopened).
  const reset = useCallback(() => {
    setStep("email");
    setEmail("");
    setOtpDigits(EMPTY_OTP);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setInfo("");
    setLoading(false);
    setResendLoading(false);
    setResendCooldown(0);
  }, []);

  return {
    // state
    step,
    email,
    setEmail,
    otpDigits,
    otp,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    info,
    loading,
    resendLoading,
    resendCooldown,
    otpInputsRef,
    // handlers
    handleOtpChange,
    handleOtpKeyDown,
    handleOtpPaste,
    submitEmail,
    handleResend,
    submitReset,
    backToEmail,
    reset,
  };
}

export default useForgotPasswordFlow;
