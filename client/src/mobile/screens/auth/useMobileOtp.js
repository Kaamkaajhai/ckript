import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "../../../services/api";
import { AuthContext } from "../../../context/AuthContext";
import { readRefusal, REFUSAL } from "./authModel";

/*
 * useMobileOtp — the email verification step, as state (Phase 8, D59).
 *
 * This is the step of the whole flow most exposed to how a phone actually
 * behaves. The code arrives in another app. The visitor leaves, reads six
 * digits, comes back — and may come back to a page the OS evicted and reloaded.
 * So two things that a desktop implementation can be careless about are load
 * bearing here:
 *
 *   THE COOLDOWN OUTLIVES THE COMPONENT. It is stored against the email, so a
 *   reload cannot hand someone a fresh "Resend" they are not entitled to and
 *   then have the server refuse it. `localStorage` (not session) and an
 *   absolute deadline (not a remaining count), because a countdown that resumes
 *   from where it was paused is a countdown that never ends.
 *
 *   THE PASTE IS THE PRIMARY INPUT. On a phone, six digits arrive on the
 *   clipboard far more often than they are typed. Paste fills every box from
 *   any one of them and moves focus to the end.
 *
 * On success it calls `adoptSession` — the one function that knows what being
 * signed in entails — rather than persisting the payload itself. See DEF-34.
 */

export const OTP_LENGTH = 6;
const EMPTY = Object.freeze(Array(OTP_LENGTH).fill(""));
const DEFAULT_COOLDOWN_SECONDS = 30;
const DEFAULT_EXPIRY_SECONDS = 300;
const COOLDOWN_KEY_PREFIX = "otp-resend-until:";

/* The same key the desktop OTPVerification uses, so the two never hand the same
   person two different cooldowns for the same email in the same browser. */
const cooldownKey = (email) => (email ? `${COOLDOWN_KEY_PREFIX}${email}` : "");

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readDeadline = (key) => {
  if (!key || typeof window === "undefined") return 0;
  try {
    const until = Number(window.localStorage.getItem(key));
    if (!Number.isFinite(until) || until <= Date.now()) return 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  } catch {
    return 0;
  }
};

const writeDeadline = (key, seconds) => {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(Date.now() + seconds * 1000));
  } catch { /* storage unavailable — the in-memory countdown still runs */ }
};

const dropDeadline = (key) => {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch { /* nothing to clean up */ }
};

export function formatExpiry(seconds) {
  const safe = positiveInt(seconds, DEFAULT_EXPIRY_SECONDS);
  if (safe % 60 === 0) {
    const minutes = safe / 60;
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  return `${safe} second${safe === 1 ? "" : "s"}`;
}

export default function useMobileOtp({
  email = "",
  expirySeconds = DEFAULT_EXPIRY_SECONDS,
  cooldownSeconds = DEFAULT_COOLDOWN_SECONDS,
  startCooldownOnMount = false,
  onVerified,
} = {}) {
  const { adoptSession } = useContext(AuthContext);
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const storageKey = cooldownKey(normalizedEmail);
  const defaultCooldown = positiveInt(cooldownSeconds, DEFAULT_COOLDOWN_SECONDS);

  const [digits, setDigits] = useState(EMPTY);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [refusal, setRefusal] = useState(null);
  const [cooldown, setCooldown] = useState(() => readDeadline(storageKey));

  const inputsRef = useRef([]);
  const startedForRef = useRef("");
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  const code = useMemo(() => digits.join(""), [digits]);
  const complete = code.length === OTP_LENGTH;

  const beginCooldown = useCallback((seconds) => {
    const safe = positiveInt(seconds, defaultCooldown);
    setCooldown(safe);
    writeDeadline(storageKey, safe);
  }, [defaultCooldown, storageKey]);

  /* Adopt whatever deadline this email already has whenever the email changes —
     including a first mount after a reload, which is the case that matters. */
  useEffect(() => {
    setCooldown(readDeadline(storageKey));
  }, [storageKey]);

  /* A code that was just sent starts its cooldown immediately, once per email,
     so the first "Resend" is not offered a second after the first send. */
  useEffect(() => {
    if (!startCooldownOnMount || !normalizedEmail) return;
    if (startedForRef.current === normalizedEmail) return;
    startedForRef.current = normalizedEmail;
    if (readDeadline(storageKey) <= 0) beginCooldown(defaultCooldown);
  }, [startCooldownOnMount, normalizedEmail, storageKey, beginCooldown, defaultCooldown]);

  /* One interval, re-read from the stored deadline rather than decremented, so a
     backgrounded tab (where timers are throttled to once a minute or stopped
     outright) resumes with the truth instead of a count that stood still. */
  useEffect(() => {
    if (cooldown <= 0) {
      dropDeadline(storageKey);
      return undefined;
    }
    const id = setInterval(() => setCooldown(readDeadline(storageKey)), 1000);
    return () => clearInterval(id);
  }, [cooldown, storageKey]);

  const focusBox = useCallback((index) => {
    inputsRef.current[Math.min(Math.max(index, 0), OTP_LENGTH - 1)]?.focus();
  }, []);

  const setDigit = useCallback((index, value) => {
    const digit = String(value || "").replace(/\D/g, "").slice(-1);
    setRefusal(null);
    setDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) focusBox(index + 1);
  }, [focusBox]);

  const handleKeyDown = useCallback((index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      // Step back and clear, so one backspace does one thing the user can see.
      event.preventDefault();
      setDigits((current) => {
        const next = [...current];
        next[index - 1] = "";
        return next;
      });
      focusBox(index - 1);
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
    }
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  }, [digits, focusBox]);

  /* Paste is bound to every box, not just the first: someone pasting into the
     fourth box means the same thing as pasting into the first. */
  const handlePaste = useCallback((event) => {
    const pasted = String(event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    setRefusal(null);
    const next = [...EMPTY];
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setDigits(next);
    focusBox(pasted.length);
  }, [focusBox]);

  const clear = useCallback(() => {
    setDigits(EMPTY);
    focusBox(0);
  }, [focusBox]);

  const verify = useCallback(async (explicitCode) => {
    const value = String(explicitCode || code || "");
    if (value.length !== OTP_LENGTH) {
      setRefusal({ code: REFUSAL.UNKNOWN, message: `Enter all ${OTP_LENGTH} digits.` });
      return { ok: false };
    }
    if (!normalizedEmail) {
      setRefusal({ code: REFUSAL.UNKNOWN, message: "We lost track of which email to verify. Start again." });
      return { ok: false };
    }

    setVerifying(true);
    setRefusal(null);
    try {
      const { data } = await api.post("/auth/verify-otp", { email: normalizedEmail, otp: value });
      // The account exists from here on, so the cooldown record is spent.
      dropDeadline(storageKey);
      const session = adoptSession(data, { reason: "signup_success" }) || data;
      onVerifiedRef.current?.(session);
      return { ok: true, session };
    } catch (error) {
      const next = readRefusal(error);
      setRefusal(next);
      // An expired or wrong code is recoverable, and leaving six wrong digits in
      // place makes the retry look like it did nothing.
      if (/expired|invalid|incorrect|request a new/i.test(next.message || "")) clear();
      return { ok: false, refusal: next };
    } finally {
      setVerifying(false);
    }
  }, [code, normalizedEmail, storageKey, adoptSession, clear]);

  const resend = useCallback(async () => {
    if (cooldown > 0 || resending || !normalizedEmail) return { ok: false };
    setResending(true);
    setRefusal(null);
    try {
      const { data } = await api.post("/auth/resend-otp", { email: normalizedEmail });
      beginCooldown(data?.resendCooldownSeconds);
      clear();
      return { ok: true };
    } catch (error) {
      const next = readRefusal(error);
      // The server is the authority on how long is left; if it tells us, adopt
      // its number rather than keeping a local one it has already overruled.
      const remaining = Number(error?.response?.data?.cooldownRemainingSeconds || 0);
      if (remaining > 0) beginCooldown(remaining);
      setRefusal(next);
      return { ok: false, refusal: next };
    } finally {
      setResending(false);
    }
  }, [cooldown, resending, normalizedEmail, beginCooldown, clear]);

  return {
    digits,
    code,
    complete,
    verifying,
    resending,
    cooldown,
    refusal,
    inputsRef,
    expiryLabel: formatExpiry(expirySeconds),
    setDigit,
    handleKeyDown,
    handlePaste,
    clear,
    verify,
    resend,
    setRefusal,
  };
}
