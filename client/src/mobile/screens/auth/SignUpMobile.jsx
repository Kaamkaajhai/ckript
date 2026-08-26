import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { resolvePostAuthPath } from "../../../routing/audienceTransitions";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import InlineMessage from "../../components/feedback/InlineMessage";
import useKeyboardInset from "../../hooks/useKeyboardInset";
import MobileShell from "../../shell/MobileShell";
import { ensureAuthFonts, readReturnPath, SIGNUP_SHELL_MODE, withReturnPath } from "./authChrome";
import { clampStep, isRetryable, refusalField, resolveRole } from "./authModel";
import OtpInput from "./components/OtpInput";
import SignUpPanels from "./components/SignUpPanels";
import StepProgress from "./components/StepProgress";
import useMobileOtp from "./useMobileOtp";
import useMobileSignUp from "./useMobileSignUp";
import "./SignUp.css";

/*
 * SignUpMobile — /signup?as=<role>&step=<n> (Phase 8, D59).
 *
 * One screen for all three sign-up flows. The role picks the step list, the
 * step picks the panel, and everything else on this surface — the progress
 * rail, the docked action, the OTP detour, the resume prompt, the exit — is the
 * same for every role, which is the point.
 *
 * THE STEP IS IN THE URL, AND THAT IS THE WHOLE ARCHITECTURE. Each advance is a
 * history push, so:
 *   • the hardware/browser back button means "previous step", which is what a
 *     native app does and what a phone user's thumb already expects;
 *   • a reload — including the one the OS performs when it evicts a backgrounded
 *     tab, which is exactly what happens while someone is in their mail app
 *     copying a verification code — resumes on the same step;
 *   • a step can be linked to, which is how /writer-onboarding resolves here.
 *
 * The docked footer holds the ONE primary action for every step, and rides the
 * keyboard via useKeyboardInset. A phone keyboard covers the bottom third of
 * the screen; a "Continue" underneath it is a form with no way forward.
 */
export default function SignUpMobile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { user, loading } = useContext(AuthContext);
  const keyboardInset = useKeyboardInset();
  const panelRef = useRef(null);

  const role = useMemo(() => resolveRole(params.get("as")), [params]);
  const step = useMemo(() => clampStep(params.get("step"), role.key), [params, role.key]);
  const returnPath = useMemo(() => readReturnPath(location.search), [location.search]);

  useEffect(() => { ensureAuthFonts(); }, []);

  /* Every navigation inside the flow keeps the whole query, so the role, the
     referral and the return path survive a step change, a back, and a reload. */
  const goToStep = useCallback((next) => {
    const query = new URLSearchParams(params);
    query.set("as", role.key);
    query.set("step", String(clampStep(next, role.key)));
    navigate(`/signup?${query.toString()}`);
  }, [params, role.key, navigate]);

  const flow = useMobileSignUp({
    roleKey: role.key,
    step,
    goToStep,
    onComplete: () => {
      navigate(resolvePostAuthPath({ requestedPath: returnPath, user }), { replace: true });
    },
  });

  const otp = useMobileOtp({
    email: flow.verification?.email,
    expirySeconds: flow.verification?.expirySeconds,
    cooldownSeconds: flow.verification?.cooldownSeconds,
    startCooldownOnMount: true,
    onVerified: flow.onVerified,
  });

  /* A referral in the URL is adopted once, and stored, so the detour through
     the mail app cannot lose it. */
  useEffect(() => {
    const referral = params.get("ref") || params.get("referral") || params.get("referralCode");
    if (referral) flow.adoptReferral(referral);
    // Only when the URL's referral changes — re-running on every flow render
    // would fight the person typing in the referral field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  /* An email handed over by the role chooser (Google had no account for it). */
  const prefillEmail = params.get("email");
  useEffect(() => {
    if (!prefillEmail) return;
    flow.setAccount((prev) => (prev.email ? prev : { ...prev, email: prefillEmail }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillEmail]);

  /*
   * Someone already signed in who lands on step 1 is not mid-flow — they are on
   * a stale link, or they bookmarked it. Send them to their workspace.
   *
   * The `accountCreated` guard is what makes this safe: from step 3 onward the
   * flow's own account exists, so `user` being set is the SUCCESS state, not a
   * reason to leave. This is why the manifest entry is deliberately not
   * `signedOutOnly` — the policy cannot tell these two apart, and this can.
   */
  useEffect(() => {
    if (loading || !user) return;
    if (flow.accountCreated && step > 1) return;
    navigate(resolvePostAuthPath({ requestedPath: returnPath, user }), { replace: true });
  }, [loading, user, flow.accountCreated, step, returnPath, navigate]);

  /* Move focus to the new step's heading. Without this a screen reader is never
     told the panel changed, and a keyboard user stays wherever the last control
     was. `preventScroll` keeps the viewport still under a raised keyboard. */
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [step, flow.verification]);

  const exit = () => navigate(withReturnPath("/join", returnPath), { replace: true });

  const finishLater = () => {
    navigate(resolvePostAuthPath({ requestedPath: returnPath, user }), { replace: true });
  };

  const footerStyle = keyboardInset ? { paddingBottom: `${keyboardInset}px` } : undefined;

  /* ── The OTP detour ───────────────────────────────────────────────────────
     Rendered in place of the panel rather than as its own route: the account
     exists at this point, so this is not a step someone can go "back" past —
     only forward, or away to read their email and return. */
  if (flow.verification) {
    return (
      <MobileShell mode={SIGNUP_SHELL_MODE} screenId="sign-up-verify">
        <section className="ckm-signup" aria-labelledby="ckm-signup-title">
          <div className="ckm-signup__bar">
            <IconButton icon="arrow_back" label="Back" onClick={flow.back} />
            <IconButton icon="close" label="Leave sign-up" onClick={finishLater} />
          </div>

          <header className="ckm-signup__head">
            <p className="ckm-signup__eyebrow">Verify your email</p>
            <h1 className="ckm-signup__title" id="ckm-signup-title" ref={panelRef} tabIndex={-1}>
              Check your inbox
            </h1>
            <p className="ckm-signup__sub">
              We sent a 6-digit code to {flow.verification.email}. It&apos;s good for {otp.expiryLabel}.
            </p>
          </header>

          <div className="ckm-signup__panel">
            <p className="ckm-signup__note">
              Your account is created. Verifying unlocks the rest of your setup —
              if you leave now, you can finish it from your profile.
            </p>

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

            <div className="ckm-signup__resend">
              {otp.cooldown > 0 ? (
                <p className="ckm-signup__muted" aria-live="polite">
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
          </div>

          <div className="ckm-signup__foot" style={footerStyle}>
            <Button
              fullWidth
              onClick={() => otp.verify()}
              pending={otp.verifying}
              pendingLabel="Verifying…"
              disabled={!otp.complete}
            >
              Verify and continue
            </Button>
          </div>
        </section>
      </MobileShell>
    );
  }

  /* ── The resume prompt ────────────────────────────────────────────────────
     Offered rather than applied silently. Restoring four screens of someone's
     typing without telling them is disorienting, and "start again" has to be
     one tap away when the draft is from a different intention. */
  if (flow.resumeOffered) {
    return (
      <MobileShell mode={SIGNUP_SHELL_MODE} screenId="sign-up-resume">
        <section className="ckm-signup" aria-labelledby="ckm-signup-title">
          <div className="ckm-signup__bar">
            <IconButton icon="close" label="Leave sign-up" onClick={exit} />
          </div>
          <header className="ckm-signup__head">
            <p className="ckm-signup__eyebrow">Welcome back</p>
            <h1 className="ckm-signup__title" id="ckm-signup-title" ref={panelRef} tabIndex={-1}>
              Pick up where you left off?
            </h1>
            <p className="ckm-signup__sub">
              We kept what you'd filled in for your {role.title.toLowerCase()} account.
              Your password isn&apos;t saved — you&apos;ll set that when you get there.
            </p>
          </header>
          <div className="ckm-signup__foot" style={footerStyle}>
            <Button fullWidth onClick={flow.keepDraft}>Continue where I stopped</Button>
            <Button fullWidth variant="tertiary" onClick={flow.discardDraft}>Start again</Button>
          </div>
        </section>
      </MobileShell>
    );
  }

  const primaryLabel = flow.current.createsAccount && !flow.accountCreated
    ? "Create my account"
    : flow.isLast ? "Finish and enter Ckript" : "Continue";

  return (
    <MobileShell mode={SIGNUP_SHELL_MODE} screenId="sign-up">
      <section className="ckm-signup" aria-labelledby="ckm-signup-title" data-role={role.key}>
        <div className="ckm-signup__bar">
          {step > 1
            ? <IconButton icon="arrow_back" label="Previous step" onClick={flow.back} />
            : <span className="ckm-signup__bar-spacer" />}
          <p className="ckm-signup__role">Joining as {role.title}</p>
          <IconButton icon="close" label="Leave sign-up" onClick={flow.canFinishLater ? finishLater : exit} />
        </div>

        <StepProgress step={step} total={flow.total} label={flow.current.title} />

        <header className="ckm-signup__head">
          <h1 className="ckm-signup__title" id="ckm-signup-title" ref={panelRef} tabIndex={-1}>
            {flow.current.title}
          </h1>
          <p className="ckm-signup__sub">{flow.current.sub}</p>
        </header>

        {/*
          * A refusal that belongs to no single field. Field-bound ones are
          * rendered by the control they concern (authModel.refusalField), the
          * same split SignInMobile uses.
          *
          * The condition is "not bound to a field" rather than "no field errors
          * at all": some refusals set both, and they are the ones that most need
          * both. Being sent back to About because a resumed draft could not keep
          * the demographics marks two fields AND needs a sentence saying why the
          * step reopened — without it, the return reads as a bug.
          */}
        {flow.refusal && !refusalField(flow.refusal.code) && (
          <InlineMessage
            tone="error"
            className="ckm-signup__banner"
            onRetry={isRetryable(flow.refusal.code) ? flow.advance : null}
          >
            {flow.refusal.message}
          </InlineMessage>
        )}

        <form
          className="ckm-signup__panel"
          onSubmit={(event) => { event.preventDefault(); flow.advance(); }}
          noValidate
        >
          <SignUpPanels flow={flow} />
          {/* A submit input the keyboard's "go" key can reach, without a second
              visible button competing with the docked one. */}
          <button type="submit" className="ckm-sr-only" tabIndex={-1} aria-hidden="true">
            {primaryLabel}
          </button>
        </form>

        <div className="ckm-signup__foot" style={footerStyle}>
          <Button
            fullWidth
            onClick={flow.advance}
            pending={flow.submitting}
            pendingLabel={flow.current.createsAccount ? "Creating your account…" : "Saving…"}
          >
            {primaryLabel}
          </Button>

          {flow.canFinishLater ? (
            <button type="button" className="ckm-signup__later" onClick={finishLater}>
              Finish this later
            </button>
          ) : step === 1 ? (
            <p className="ckm-signup__alt">
              Already have an account?{" "}
              <Link to={withReturnPath("/login", returnPath)}>Sign in</Link>
            </p>
          ) : null}
        </div>
      </section>
    </MobileShell>
  );
}
