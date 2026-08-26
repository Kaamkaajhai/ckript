import { useCallback, useContext, useMemo, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { isValidEmail, readRefusal, refusalField, REFUSAL } from "./authModel";

/*
 * useMobileSignIn — the sign-in state machine (Phase 8, D59).
 *
 * Sign in is two fields and one button, and almost all of its difficulty is in
 * what happens when it does not work. The server refuses in eight distinguishable
 * ways and only one of them ("wrong password") is what a bare error message
 * implies. Two of the eight are not failures at all:
 *
 *   requiresVerification  The account exists and its email was never verified.
 *                         This is the sign-UP flow resuming, and the right
 *                         response is to show the OTP step — not an error. A
 *                         toast here would strand someone one tap from being in.
 *
 *   accountNotFound       (Google) The credential is valid, there is just no
 *                         Ckript account yet. The right response is the role
 *                         chooser with their email carried across.
 *
 * The hook returns `phase` so the screen renders a state rather than assembling
 * one from four booleans.
 */

export const SIGN_IN_PHASE = Object.freeze({
  CREDENTIALS: "credentials",
  VERIFY: "verify",
  DONE: "done",
});

export default function useMobileSignIn({ onSignedIn, onNeedsAccount } = {}) {
  const { login } = useContext(AuthContext);

  const [phase, setPhase] = useState(SIGN_IN_PHASE.CREDENTIALS);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refusal, setRefusal] = useState(null);
  const [touched, setTouched] = useState(false);
  const [verification, setVerification] = useState(null);

  /* Field-level validity is only surfaced after a submit attempt. Marking an
     email field invalid while someone is still typing the "@" is the classic
     way to make a form feel hostile on a phone. */
  const emailError = touched && !isValidEmail(email) ? "Enter a valid email address." : "";
  const passwordError = touched && !password ? "Enter your password." : "";

  /* Which control a refusal belongs beside — a wrong password sits under the
     password field, a frozen account belongs to the whole form. */
  const boundField = refusal ? refusalField(refusal.code) : "";
  const formRefusal = refusal && !boundField ? refusal : null;

  const fieldRefusalFor = useCallback(
    (name) => (boundField === name ? refusal?.message || "" : ""),
    [boundField, refusal],
  );

  const canSubmit = useMemo(
    () => isValidEmail(email) && Boolean(password) && !submitting,
    [email, password, submitting],
  );

  /* Both /auth/login shapes carry the same verification payload — a 403 body on
     a rejected sign-in, a 200 body when the account simply is not verified —
     so one reader handles both and the caller never has to ask which it got. */
  const enterVerification = useCallback((source, fallbackEmail) => {
    const record = readRefusal(source);
    setVerification({
      email: record.email || String(fallbackEmail || "").trim().toLowerCase(),
      expirySeconds: record.otpExpirySeconds,
      cooldownSeconds: record.resendCooldownSeconds,
    });
    setRefusal(null);
    setPhase(SIGN_IN_PHASE.VERIFY);
  }, []);

  const submit = useCallback(async (event) => {
    event?.preventDefault?.();
    setTouched(true);
    if (submitting) return { ok: false };
    if (!isValidEmail(email) || !password) return { ok: false };

    setSubmitting(true);
    setRefusal(null);
    try {
      const data = await login(email, password);
      if (data?.requiresVerification) {
        enterVerification(data, email);
        return { ok: false, needsVerification: true };
      }
      setPhase(SIGN_IN_PHASE.DONE);
      onSignedIn?.(data);
      return { ok: true, user: data };
    } catch (error) {
      const next = readRefusal(error);
      if (next.code === REFUSAL.NEEDS_VERIFICATION) {
        enterVerification(error, email);
        return { ok: false, needsVerification: true };
      }
      setRefusal(next);
      return { ok: false, refusal: next };
    } finally {
      setSubmitting(false);
    }
  }, [email, password, submitting, login, enterVerification, onSignedIn]);

  /*
   * Google hands back a session that is already complete — the server only
   * returns one for an existing, verified account — so there is no OTP leg.
   *
   * It is deliberately NOT adopted here: `GoogleSignInButton` calls
   * `AuthContext.googleSignIn`, which already ran `adoptSession` before this
   * callback fired. Doing it again would be harmless for the session but would
   * report a second auth event for one sign-in, which quietly doubles the count
   * every dashboard reads.
   */
  const completeGoogle = useCallback((data) => {
    if (!data?.token) return;
    setPhase(SIGN_IN_PHASE.DONE);
    onSignedIn?.(data);
  }, [onSignedIn]);

  /*
   * Google's refusals, handled rather than toasted.
   *
   * `accountNotFound` is the one that matters: Google sign-in is deliberately
   * sign-in only, because a new account has to pick a role and — for producers
   * — supply contact and approval data Google cannot provide. Until now that
   * arrived as a bare error toast, which is a dead end at the exact moment
   * someone was trying to join. It now hands the email to the role chooser.
   */
  const failGoogle = useCallback((_message, data) => {
    const next = readRefusal(data || {});
    if (next.code === REFUSAL.ACCOUNT_NOT_FOUND) {
      onNeedsAccount?.(next.email || "");
      return;
    }
    setRefusal(next.code === REFUSAL.NONE
      ? { code: REFUSAL.UNKNOWN, message: _message || "Google sign-in didn't complete." }
      : next);
  }, [onNeedsAccount]);

  const backToCredentials = useCallback(() => {
    setPhase(SIGN_IN_PHASE.CREDENTIALS);
    setVerification(null);
    setRefusal(null);
  }, []);

  return {
    phase,
    email,
    setEmail,
    password,
    setPassword,
    submitting,
    canSubmit,
    refusal,
    formRefusal,
    emailError: emailError || fieldRefusalFor("email"),
    passwordError: passwordError || fieldRefusalFor("password"),
    verification,
    submit,
    completeGoogle,
    failGoogle,
    backToCredentials,
    setRefusal,
  };
}
