import { useCallback, useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useForgotPasswordFlow from "../hooks/useForgotPasswordFlow";
import { useToast } from "../context/ToastContext";
import useScrollLock from "../hooks/useScrollLock";
import "./ForgotPasswordModal.css";

/* ─────────────────────────────────────────────────────────────
   Ckript — Forgot Password modal.

   Port of "Forgot Password Modal.dc.html" from the Claude Design handoff.
   A three-step recovery surface (request code → verify & set password →
   done) in the editorial cream/serif language shared by AboutModal and the
   Pricing modal. Opened as an overlay from the sign-in modal + the Login
   page; the /forgot-password route also opens it (ForgotPasswordRoute) for
   deep links.

   All flow logic lives in useForgotPasswordFlow (the real /auth endpoints,
   OTP focus/paste, resend cooldown), so this component is purely the design.
   ───────────────────────────────────────────────────────────── */

const FONT_LINK_ID = "ckript-authmodal-fonts";
function ensureModalFonts() {
  if (typeof document === "undefined" || document.getElementById(FONT_LINK_ID)) return;
  const pre1 = document.createElement("link");
  pre1.rel = "preconnect";
  pre1.href = "https://fonts.googleapis.com";
  const pre2 = document.createElement("link");
  pre2.rel = "preconnect";
  pre2.href = "https://fonts.gstatic.com";
  pre2.crossOrigin = "anonymous";
  const sheet = document.createElement("link");
  sheet.id = FONT_LINK_ID;
  sheet.rel = "stylesheet";
  sheet.href =
    "https://fonts.googleapis.com/css2?family=Baskervville:ital@0;1&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap";
  document.head.append(pre1, pre2, sheet);
}

const HEADS = {
  email: {
    num: "01",
    kicker: "Account Recovery",
    title: "Forgot password?",
    subtitle: "Enter the email tied to your account and we'll send a six-digit code to reset it.",
  },
  reset: {
    num: "02",
    kicker: "Verify & Reset",
    title: "Check your inbox.",
    subtitle: "Enter the code we emailed you, then choose a new password.",
  },
};

const FOCUSABLE =
  'a[href],button:not(:disabled),input:not(:disabled),textarea,select,[tabindex]:not([tabindex="-1"])';

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

function ForgotPasswordModalInner({ onClose, onSignIn }) {
  const titleId = useId();
  const cardRef = useRef(null);
  const emailRef = useRef(null);
  const previouslyFocused = useRef(null);

  const toast = useToast();
  const fp = useForgotPasswordFlow({ notify: toast, onComplete: onSignIn });
  const {
    step,
    email,
    setEmail,
    otpDigits,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    resendLoading,
    resendCooldown,
    otpInputsRef,
    handleOtpChange,
    handleOtpKeyDown,
    handleOtpPaste,
    submitEmail,
    handleResend,
    submitReset,
    backToEmail,
  } = fp;

  const head = HEADS[step];

  useScrollLock();

  // Fonts, focus restore.
  useEffect(() => {
    ensureModalFonts();
    previouslyFocused.current = document.activeElement;
    const t = window.setTimeout(() => emailRef.current?.focus({ preventScroll: true }), 60);
    return () => {
      window.clearTimeout(t);
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") prev.focus({ preventScroll: true });
    };
  }, []);

  // Move focus to the natural target as the step changes.
  useEffect(() => {
    if (step === "reset") {
      window.setTimeout(() => otpInputsRef.current?.[0]?.focus({ preventScroll: true }), 40);
    }
  }, [step, otpInputsRef]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" && !loading) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const nodes = cardRef.current?.querySelectorAll(FOCUSABLE);
        if (!nodes || nodes.length === 0) return;
        const list = Array.from(nodes).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, loading]
  );

  return (
    <motion.div
      className="fpm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        ref={cardRef}
        className="fpm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loading || undefined}
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <div className="fpm-watermark" aria-hidden="true">{head.num}</div>

        <div className="fpm-inner">
          {/* Header */}
          <div>
            <div className="fpm-eyebrow">
              <i />
              <span>{head.kicker}</span>
            </div>
            <h2 className="fpm-title" id={titleId}>{head.title}</h2>
            <div className="fpm-title-rule" />
            {head.subtitle && <p className="fpm-subtitle">{head.subtitle}</p>}
          </div>

          {/* Body */}
          <div className="fpm-body">
            {step === "email" && (
              <form onSubmit={submitEmail}>
                <label className="fpm-field-label" htmlFor={`${titleId}-email`}>Email address</label>
                <input
                  id={`${titleId}-email`}
                  ref={emailRef}
                  className="fpm-line"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="fpm-cta" disabled={loading}>
                  {loading ? <span className="fpm-spinner" aria-hidden="true" /> : (<>Send reset code <ArrowIcon /></>)}
                </button>
              </form>
            )}

            {step === "reset" && (
              <form onSubmit={submitReset}>
                <div className="fpm-sent">
                  <i />
                  <span>Code sent to <strong>{email}</strong> — check your inbox &amp; spam.</span>
                </div>

                <div className="fpm-otp-head">
                  <label className="fpm-field-label" style={{ margin: 0 }}>Verification code</label>
                  <button
                    type="button"
                    className="fpm-resend"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendLoading}
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : resendLoading
                        ? "Sending…"
                        : "Resend code"}
                  </button>
                </div>
                <div className="fpm-otp" onPaste={handleOtpPaste}>
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpInputsRef.current[i] = el)}
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Digit ${i + 1}`}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>

                <div className="fpm-pw-row">
                  <div>
                    <label className="fpm-field-label" htmlFor={`${titleId}-pw`}>New password</label>
                    <input
                      id={`${titleId}-pw`}
                      className="fpm-line fpm-line--sm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="8+ characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="fpm-field-label" htmlFor={`${titleId}-pw2`}>Confirm</label>
                    <input
                      id={`${titleId}-pw2`}
                      className="fpm-line fpm-line--sm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="re-enter"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <button type="submit" className="fpm-cta" disabled={loading}>
                  {loading ? <span className="fpm-spinner" aria-hidden="true" /> : "Reset password"}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="fpm-footer">
            {step === "reset" ? (
              <button type="button" className="fpm-footer-link" onClick={backToEmail}>
                ← Use a different email
              </button>
            ) : (
              <>
                <span className="fpm-footer-text">Remembered your password? </span>
                <button type="button" className="fpm-footer-signin" onClick={onSignIn}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <button type="button" className="fpm-close" aria-label="Close" onClick={onClose} disabled={loading}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function ForgotPasswordModal({ open, onClose, onSignIn }) {
  return (
    <AnimatePresence>
      {open && <ForgotPasswordModalInner key="forgot-password-modal" onClose={onClose} onSignIn={onSignIn} />}
    </AnimatePresence>
  );
}
