import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import { sanitizeLocalReturnPath } from "../../../routing/audienceTransitions";

/*
 * authChrome — the shell contract for the account-entry family, and the two
 * URL helpers every one of its screens needs (Phase 8, D59).
 *
 * The shell modes are named constants rather than literals in JSX because §8.1
 * requires a mode to be declarable from the manifest and greppable from the
 * code, and because an override has to be a visible decision.
 */

/* Sign in, the role chooser, recovery and invite: public chrome, no bottom tabs. */
export const AUTH_SHELL_MODE = MOBILE_SHELL_MODE.PUBLIC;

/* The stepper is a `flow` surface — §8.1 names onboarding steppers as the
   example — and takes no slot overrides: it wants exactly what the mode says. */
export const SIGNUP_SHELL_MODE = MOBILE_SHELL_MODE.FLOW;

/* The webfont pair the desktop auth surfaces already load, under the SAME
 * element id they use.
 *
 * Sharing the id is the point: a phone that has been on the landing page has
 * these fonts already, and a second <link> for the same two families would be a
 * duplicate request on the connection least able to afford one. A <link> rather
 * than an @import in Auth.css for the reason AuthModal.jsx documents at length —
 * a stylesheet that begins with @import withholds ALL of its rules until the
 * import resolves, so the screen would lay out unstyled while the fonts fly.
 */
const FONT_LINK_ID = "ckript-authmodal-fonts";

export function ensureAuthFonts() {
  if (typeof document === "undefined" || document.getElementById(FONT_LINK_ID)) return;

  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = "https://fonts.googleapis.com";

  const preconnectStatic = document.createElement("link");
  preconnectStatic.rel = "preconnect";
  preconnectStatic.href = "https://fonts.gstatic.com";
  preconnectStatic.crossOrigin = "anonymous";

  const sheet = document.createElement("link");
  sheet.id = FONT_LINK_ID;
  sheet.rel = "stylesheet";
  sheet.href =
    "https://fonts.googleapis.com/css2?family=Baskervville:ital@0;1&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap";

  document.head.append(preconnect, preconnectStatic, sheet);
}

/*
 * The return path an auth screen was given, or "".
 *
 * Every read of `?redirect=` in this family goes through here, because the
 * value is attacker-controllable: it arrives from a URL anyone can send. The
 * guard is `sanitizeLocalReturnPath`, which is already the app's answer to
 * open redirects — it rejects absolute URLs, protocol-relative `//evil.com`,
 * backslash-smuggled paths and control characters, and refuses the auth routes
 * themselves so a return path cannot loop the visitor back to sign-in.
 *
 * Reusing it rather than re-deriving it is deliberate: a second implementation
 * of an open-redirect guard is a second place for it to be subtly wrong.
 */
export function readReturnPath(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  return sanitizeLocalReturnPath(params.get("redirect") || "");
}

/* Carry the current `?redirect=` onto another auth URL, so moving between sign
   in, the role chooser and the stepper never loses where the visitor was
   heading. Already-sanitised input, re-encoded for the URL it is going into. */
export function withReturnPath(path, returnPath = "") {
  if (!returnPath) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}redirect=${encodeURIComponent(returnPath)}`;
}
