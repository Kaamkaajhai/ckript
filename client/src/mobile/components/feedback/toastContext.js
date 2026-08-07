import { createContext, useContext } from "react";

/*
 * Toast context — split from the provider so this module exports no component
 * and React Fast Refresh stays happy (the same reason listContext.js and
 * tabIds.js exist as their own files).
 */

export const ToastContext = createContext(null);

/** Tones a toast may take. A screen may not invent a fifth. */
export const TOAST_TONE = Object.freeze({
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
});

export const TOAST_TONES = Object.freeze(Object.values(TOAST_TONE));

/*
 * Only an error interrupts. `role="alert"` is assertive: it cuts off whatever a
 * screen reader is currently saying, and the APG is explicit that using it too
 * freely is itself an accessibility failure. A saved draft is not worth
 * interrupting a sentence for; a failed payment is.
 */
export function toastIsAssertive(tone) {
  return tone === TOAST_TONE.ERROR;
}

/*
 * Whether a toast is allowed to disappear on its own.
 *
 * The ARIA APG's alert pattern says plainly: "avoid designing alerts that
 * disappear automatically". WCAG SC 2.2.1 tolerates it only where the same
 * information stays reachable somewhere else — the worked example in that
 * document is a new-mail notice, which is fine to miss precisely because the
 * inbox still holds the mail.
 *
 * So the rule this app enforces, rather than merely documents:
 *
 *   • a toast carrying an ACTION never auto-dismisses. When it vanishes the
 *     user's ability to act vanishes with it, and that is a time limit on the
 *     task itself — exactly what SC 2.2.1 exists to prevent.
 *   • a toast carrying an ERROR never auto-dismisses, because an error the user
 *     did not manage to read has not been reported.
 *
 * Everything else is an acknowledgement of something the user just did, and is
 * safe to fade — the screen behind it is the durable copy.
 */
export function toastPersists({ tone, action }) {
  return tone === TOAST_TONE.ERROR || Boolean(action);
}

/** Longer when there is more to read. Deliberately not a words-per-minute
 *  calculation: a toast that lingers for 12 seconds reads as a bug. */
export function toastDuration({ description }) {
  return description ? 7000 : 5000;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
