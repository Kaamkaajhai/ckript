import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { resolvePostAuthPath } from "../../../routing/audienceTransitions";
import GoogleSignInButton from "../../../components/GoogleSignInButton";
import Button from "../../components/buttons/Button";
import InlineMessage from "../../components/feedback/InlineMessage";
import TextField from "../../components/forms/TextField";
import MobileShell from "../../shell/MobileShell";
import { AUTH_SHELL_MODE, readReturnPath, withReturnPath } from "./authChrome";
import { isRetryable, REFUSAL } from "./authModel";
import AuthScreenFrame from "./components/AuthScreenFrame";
import OtpInput from "./components/OtpInput";
import PasswordField from "./components/PasswordField";
import useMobileOtp from "./useMobileOtp";
import useMobileSignIn, { SIGN_IN_PHASE } from "./useMobileSignIn";
import "./Auth.css";

/*
 * SignInMobile — /login (Phase 8, D59).
 *
 * A real route rather than a modal, which is the whole D59 argument in one
 * screen: the verification step below can outlive a trip to the mail app, and a
 * surface with no URL does not survive that.
 *
 * A signed-in visitor is sent on rather than bounced to "/", because arriving
 * here already signed in almost always means a stale link or a second tab — and
 * `resolvePostAuthPath` knows where that person actually belongs, including
 * honouring a `?redirect=` they may have been carrying.
 */
export default function SignInMobile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useContext(AuthContext);
  const emailRef = useRef(null);

  const returnPath = useMemo(() => readReturnPath(location.search), [location.search]);

  const land = useCallback((account) => {
    navigate(resolvePostAuthPath({ requestedPath: returnPath, user: account || user }), { replace: true });
  }, [navigate, returnPath, user]);

  const signIn = useMobileSignIn({
    onSignedIn: land,
    /* Google refused because there is no account yet. That is a sign-UP, so
       hand the verified email to the role chooser rather than showing an error
       at the moment someone was trying to join. */
    onNeedsAccount: (email) => {
      navigate(withReturnPath(
        `/join${email ? `?email=${encodeURIComponent(email)}` : ""}`,
        returnPath,
      ));
    },
  });

  const otp = useMobileOtp({
    email: signIn.verification?.email,
    expirySeconds: signIn.verification?.expirySeconds,
    cooldownSeconds: signIn.verification?.cooldownSeconds,
    onVerified: land,
  });

  /* Already signed in — including the moment sign-in succeeds in another tab. */
  useEffect(() => {
    if (!loading && user && signIn.phase !== SIGN_IN_PHASE.DONE) land(user);
  }, [loading, user, signIn.phase, land]);

  useEffect(() => {
    // A short delay so the field is focused after the screen has painted;
    // preventScroll keeps the viewport still under a raised keyboard.
    const timer = setTimeout(() => emailRef.current?.focus({ preventScroll: true }), 80);
    return () => clearTimeout(timer);
  }, []);

  if (signIn.phase === SIGN_IN_PHASE.VERIFY) {
    return (
      <MobileShell mode={AUTH_SHELL_MODE} screenId="sign-in-verify">
        <AuthScreenFrame
          eyebrow="One more step"
          title="Check your email"
          lede={`We sent a 6-digit code to ${signIn.verification?.email}. It's good for ${otp.expiryLabel}.`}
          onClose={signIn.backToCredentials}
          closeLabel="Back to sign in"
          footer={(
            <p className="ckm-auth__alt">
              Wrong email?{" "}
              <button type="button" className="ckm-auth__link" onClick={signIn.backToCredentials}>
                Go back
              </button>
            </p>
          )}
        >
          <form
            className="ckm-auth__form"
            onSubmit={(event) => { event.preventDefault(); otp.verify(); }}
          >
            <OtpInput
              digits={otp.digits}
              onDigit={otp.setDigit}
              onKeyDown={otp.handleKeyDown}
              onPaste={otp.handlePaste}
              inputsRef={otp.inputsRef}
              hint="Paste the code and every box fills."
              error={otp.refusal?.message || ""}
              disabled={otp.verifying}
            />

            <Button type="submit" fullWidth pending={otp.verifying} pendingLabel="Verifying…" disabled={!otp.complete}>
              Verify and continue
            </Button>

            <div className="ckm-auth__resend">
              {otp.cooldown > 0 ? (
                <p className="ckm-auth__muted" aria-live="polite">
                  You can ask for a new code in {otp.cooldown}s.
                </p>
              ) : (
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={otp.resend}
                  pending={otp.resending}
                  pendingLabel="Sending…"
                >
                  Send a new code
                </Button>
              )}
            </div>
          </form>
        </AuthScreenFrame>
      </MobileShell>
    );
  }

  const refusal = signIn.formRefusal;

  return (
    <MobileShell mode={AUTH_SHELL_MODE} screenId="sign-in">
      <AuthScreenFrame
        eyebrow="Welcome back"
        title="Sign in to Ckript"
        lede="Where stories become films."
        closeTo="/"
        closeLabel="Back to Ckript"
        banner={refusal ? (
          <InlineMessage
            tone={refusal.code === REFUSAL.ACCOUNT_FROZEN || refusal.code === REFUSAL.ACCOUNT_DELETED ? "warning" : "error"}
            className="ckm-auth__banner"
            onRetry={isRetryable(refusal.code) ? () => signIn.submit() : null}
          >
            {refusal.frozenReason || refusal.message}
          </InlineMessage>
        ) : null}
        footer={(
          <p className="ckm-auth__alt">
            New to Ckript?{" "}
            <Link className="ckm-auth__link" to={withReturnPath("/join", returnPath)}>
              Create an account
            </Link>
          </p>
        )}
      >
        <form className="ckm-auth__form" onSubmit={signIn.submit} noValidate>
          <TextField
            ref={emailRef}
            label="Email"
            purpose="email"
            required
            value={signIn.email}
            error={signIn.emailError}
            onChange={(event) => signIn.setEmail(event.target.value)}
          />

          <PasswordField
            label="Password"
            required
            value={signIn.password}
            error={signIn.passwordError}
            onChange={(event) => signIn.setPassword(event.target.value)}
          />

          <p className="ckm-auth__forgot">
            <Link className="ckm-auth__link" to="/forgot-password">Forgot your password?</Link>
          </p>

          <Button type="submit" fullWidth pending={signIn.submitting} pendingLabel="Signing in…">
            Sign in
          </Button>
        </form>

        <div className="ckm-auth__divider" aria-hidden="true"><span>or</span></div>

        {/* The Google button is a fixed-width third-party iframe. The wrapper
            constrains and centres it so it cannot push the 320px layout wide;
            see .ckm-auth__google. */}
        <div className="ckm-auth__google">
          <GoogleSignInButton
            text="continue_with"
            onSuccess={signIn.completeGoogle}
            onError={signIn.failGoogle}
          />
        </div>
      </AuthScreenFrame>
    </MobileShell>
  );
}
