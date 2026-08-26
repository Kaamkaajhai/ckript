import { useContext, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import useForgotPasswordFlow from "../../../hooks/useForgotPasswordFlow";
import { useToast } from "../../components/feedback/toastContext";
import Button from "../../components/buttons/Button";
import TextField from "../../components/forms/TextField";
import MobileShell from "../../shell/MobileShell";
import { AUTH_SHELL_MODE, readReturnPath, withReturnPath } from "./authChrome";
import AuthScreenFrame from "./components/AuthScreenFrame";
import OtpInput from "./components/OtpInput";
import PasswordField from "./components/PasswordField";
import "./Auth.css";

/*
 * ForgotPasswordMobile — /forgot-password (Phase 8, D59).
 *
 * The one screen in this family with no new logic at all: `useForgotPasswordFlow`
 * was already extracted and headless, precisely so the surface rendering it
 * could be swapped without the contract moving. This is that swap, and the
 * reason it is four dozen lines rather than three hundred.
 *
 * Two things it does add, both mobile-specific:
 *   • the OTP boxes are the shared OtpInput, so recovery and verification feel
 *     like the same control rather than two implementations of one idea;
 *   • the hook's `notify` is wired to the MOBILE toast host, not the desktop
 *     one — the mobile app mounts its own ToastProvider inside `.ckm`, and a
 *     desktop toast would render outside the phone frame entirely.
 */
export default function ForgotPasswordMobile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useContext(AuthContext);
  const toast = useToast();

  const returnPath = useMemo(() => readReturnPath(location.search), [location.search]);
  const signInPath = withReturnPath("/login", returnPath);

  const flow = useForgotPasswordFlow({
    notify: toast,
    onComplete: () => navigate(signInPath, { replace: true }),
  });

  /* Someone signed in does not need recovery — they need account settings, and
     sending them to a "who are you?" form would be the wrong answer to a
     question they did not ask. */
  useEffect(() => {
    if (!loading && user) navigate("/profile?tab=settings", { replace: true });
  }, [loading, user, navigate]);

  const isEmailStep = flow.step === "email";

  return (
    <MobileShell mode={AUTH_SHELL_MODE} screenId="forgot-password">
      <AuthScreenFrame
        eyebrow="Account recovery"
        title={isEmailStep ? "Reset your password" : "Enter your code"}
        lede={isEmailStep
          ? "Tell us the email on your account and we'll send a 6-digit code."
          : `We sent a code to ${flow.email}. Enter it and choose a new password.`}
        closeTo={signInPath}
        closeLabel="Back to sign in"
        footer={(
          <p className="ckm-auth__alt">
            Remembered it?{" "}
            <Link className="ckm-auth__link" to={signInPath}>Sign in</Link>
          </p>
        )}
      >
        {isEmailStep ? (
          <form className="ckm-auth__form" onSubmit={flow.submitEmail} noValidate>
            <TextField
              label="Email"
              purpose="email"
              required
              value={flow.email}
              onChange={(event) => flow.setEmail(event.target.value)}
            />
            <Button type="submit" fullWidth pending={flow.loading} pendingLabel="Sending…">
              Send reset code
            </Button>
          </form>
        ) : (
          <form className="ckm-auth__form" onSubmit={flow.submitReset} noValidate>
            <OtpInput
              digits={flow.otpDigits}
              onDigit={flow.handleOtpChange}
              onKeyDown={flow.handleOtpKeyDown}
              onPaste={flow.handleOtpPaste}
              inputsRef={flow.otpInputsRef}
              label="Reset code"
              hint="Paste the code and every box fills."
              disabled={flow.loading}
            />

            <PasswordField
              label="New password"
              autoComplete="new-password"
              showRequirements
              required
              value={flow.newPassword}
              onChange={(event) => flow.setNewPassword(event.target.value)}
            />

            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              required
              value={flow.confirmPassword}
              onChange={(event) => flow.setConfirmPassword(event.target.value)}
              error={flow.confirmPassword && flow.confirmPassword !== flow.newPassword
                ? "Both passwords need to match."
                : ""}
            />

            <Button type="submit" fullWidth pending={flow.loading} pendingLabel="Updating…">
              Set new password
            </Button>

            <div className="ckm-auth__resend">
              {flow.resendCooldown > 0 ? (
                <p className="ckm-auth__muted" aria-live="polite">
                  You can ask for a new code in {flow.resendCooldown}s.
                </p>
              ) : (
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={flow.handleResend}
                  pending={flow.resendLoading}
                  pendingLabel="Sending…"
                >
                  Send a new code
                </Button>
              )}
              <Button variant="tertiary" size="sm" onClick={flow.backToEmail}>
                Use a different email
              </Button>
            </div>
          </form>
        )}
      </AuthScreenFrame>
    </MobileShell>
  );
}
