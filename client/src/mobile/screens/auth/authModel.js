/*
 * authModel — everything the native account-entry screens need to know that is
 * not React (Phase 8, D59).
 *
 * Three jobs, deliberately kept out of the components:
 *
 *   1. THE ROLE CATALOGUE. Which accounts a phone can create, what each one is
 *      called in the product, which `role` string the server wants, and which
 *      steps it asks for. Mobile implements all three sign-up flows as ONE
 *      stepper, so the difference between a writer and a producer has to live
 *      somewhere as data; this is that somewhere.
 *
 *   2. VALIDATION THAT MATCHES THE SERVER. Every rule here is a mirror of a
 *      rule in `server/controllers/authController.js`, cited by name. A phone
 *      round-trip on a bad network is expensive enough that "the server will
 *      tell them" is not an acceptable answer for a rule we already know — but
 *      a mirror that drifts is worse than none, so each one says what it is
 *      mirroring and the server stays the authority.
 *
 *   3. ONE REFUSAL SHAPE. The auth endpoints refuse in at least a dozen ways,
 *      and most of them are not errors at all — `requiresVerification` is the
 *      sign-up flow continuing, not failing. `readRefusal` turns any axios
 *      error (or a 200 body that carries a refusal) into one
 *      `{ code, message, email, ... }` record, so a screen branches on a code
 *      it can enumerate rather than pattern-matching prose that a server change
 *      would silently break.
 */

/* ─── Roles ──────────────────────────────────────────────────────────────── */

/*
 * `key` is what the URL carries (`/signup?as=writer`); `role` is what the
 * server's enum calls it. They differ for two of the three, and that mismatch
 * is exactly why this table exists: "investor" is the stored role for what the
 * product calls a producer/director, and "creator" for a writer.
 *
 * Reader and actor are absent on purpose, not by oversight — see the §19.1
 * follow-up. Adding either is a row here plus its step list.
 */
export const AUTH_ROLES = Object.freeze([
  Object.freeze({
    key: "writer",
    role: "creator",
    title: "Writer",
    blurb: "Host your screenplays, reach producers, and enter challenges.",
    detail: "You write. You want the work read by people who can make it.",
    aliases: Object.freeze(["creator"]),
  }),
  Object.freeze({
    key: "producer",
    role: "investor",
    title: "Producer or Director",
    blurb: "Discover stories, option them, and track your slate.",
    detail: "You buy, option, finance or direct. You want the right script first.",
    aliases: Object.freeze(["investor", "director", "producer-director"]),
  }),
  Object.freeze({
    key: "industry",
    role: "professional",
    title: "Industry professional",
    blurb: "Represent a studio, agency or production house.",
    detail: "You work inside the business and need your company on the account.",
    aliases: Object.freeze(["professional"]),
  }),
]);

export const DEFAULT_ROLE_KEY = "writer";

export function findRole(input = "") {
  const wanted = String(input || "").trim().toLowerCase();
  if (!wanted) return null;
  return AUTH_ROLES.find(
    (entry) => entry.key === wanted || entry.role === wanted || entry.aliases.includes(wanted),
  ) || null;
}

/* The role a `/signup` URL means, falling back to the writer flow rather than
   to an error: an unrecognised `?as=` is far more likely to be a stale link
   than an attack, and a dead end helps nobody. */
export function resolveRole(input = "") {
  return findRole(input) || findRole(DEFAULT_ROLE_KEY);
}

/* Sub-roles the industry flow asks for. `subRole` is passed straight through to
   POST /auth/join, which stores it beside role: "professional". */
export const INDUSTRY_SUB_ROLES = Object.freeze([
  "Studio executive",
  "Development executive",
  "Agent",
  "Manager",
  "Production house",
  "Casting",
  "Distribution",
  "Other",
]);

/* ─── Steps ──────────────────────────────────────────────────────────────── */

/*
 * The first three steps are identical for every role, and that is the whole
 * argument for one stepper. `createsAccount` marks the step whose primary
 * action calls POST /auth/join — the point after which abandoning the flow
 * leaves a real, signed-in account behind rather than nothing, which is why
 * every step past it offers "Finish later" instead of a dead end.
 */
const ACCOUNT_STEPS = Object.freeze([
  Object.freeze({ id: "name", title: "What should we call you?", sub: "Your name as you want it credited." }),
  Object.freeze({ id: "contact", title: "How we reach you", sub: "Email for your verification code, phone for account security." }),
  Object.freeze({
    id: "password",
    title: "Secure your account",
    sub: "One strong password. You can change it any time.",
    createsAccount: true,
  }),
]);

const ROLE_STEPS = Object.freeze({
  writer: Object.freeze([
    Object.freeze({ id: "username", title: "Pick a username", sub: "This is how producers find you on Ckript." }),
    Object.freeze({ id: "about", title: "Tell us about your writing", sub: "A short bio and where you stand on representation." }),
    Object.freeze({ id: "guilds", title: "Guild memberships", sub: "WGA or SWA? Optional — skip if neither applies." }),
    Object.freeze({ id: "links", title: "Your work online", sub: "Portfolio and socials. All optional." }),
    Object.freeze({ id: "tags", title: "What do you write?", sub: "Genres you work in, and up to five story tags." }),
    Object.freeze({ id: "terms", title: "Almost there", sub: "Review and accept to finish your writer account." }),
  ]),
  producer: Object.freeze([
    Object.freeze({ id: "username", title: "Pick a username", sub: "How writers will see you on Ckript." }),
    Object.freeze({ id: "identity", title: "Industry identity", sub: "Your company and your standing in the business." }),
    Object.freeze({ id: "credits", title: "Notable credits", sub: "The work that speaks for you. Optional." }),
    Object.freeze({ id: "discover", title: "What moves you", sub: "Genres and formats, so your feed knows where to start." }),
    Object.freeze({ id: "terms", title: "Almost there", sub: "Review and accept to enter Ckript." }),
  ]),
  industry: Object.freeze([
    Object.freeze({ id: "username", title: "Pick a username", sub: "How writers will see you on Ckript." }),
    Object.freeze({ id: "identity", title: "Your company", sub: "Where you work and what you do there." }),
    Object.freeze({ id: "discover", title: "What you're looking for", sub: "Formats and genres shape the writers we surface." }),
    Object.freeze({ id: "terms", title: "Almost there", sub: "Review and accept to enter Ckript." }),
  ]),
});

export function stepsForRole(roleKey) {
  const role = resolveRole(roleKey);
  return Object.freeze([...ACCOUNT_STEPS, ...(ROLE_STEPS[role.key] || [])]);
}

export function stepCount(roleKey) {
  return stepsForRole(roleKey).length;
}

/* The 1-based index of the step that calls POST /auth/join. */
export function accountStepNumber(roleKey) {
  const index = stepsForRole(roleKey).findIndex((step) => step.createsAccount);
  return index === -1 ? 0 : index + 1;
}

/* Clamp a `?step=` to a step that exists. A URL is user-editable and arrives
   from history, deep links and the back button, so this is the only place that
   should ever decide what step number 0, 99 or "banana" means. */
export function clampStep(value, roleKey) {
  const total = stepCount(roleKey);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), total);
}

/* ─── Validation (mirrors of server rules) ───────────────────────────────── */

/* Mirror of `isValidPassword` in server/controllers/authController.js. The five
   rules are listed rather than folded into one regex so the UI can show which
   ones are still outstanding while the writer types — a single "invalid
   password" message is the thing that makes people give up on a phone. */
export const PASSWORD_RULES = Object.freeze([
  Object.freeze({ id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 }),
  Object.freeze({ id: "uppercase", label: "An uppercase letter", test: (v) => /[A-Z]/.test(v) }),
  Object.freeze({ id: "lowercase", label: "A lowercase letter", test: (v) => /[a-z]/.test(v) }),
  Object.freeze({ id: "number", label: "A number", test: (v) => /[0-9]/.test(v) }),
  Object.freeze({
    id: "special",
    label: "A symbol",
    test: (v) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v),
  }),
]);

export function passwordChecklist(password = "") {
  const value = String(password || "");
  return PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(value) }));
}

export function isValidPassword(password = "") {
  const value = String(password || "");
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

/* Mirror of `isValidEmail`'s shape checks. The server also rejects on length
   bounds, which is why they are here rather than a bare /.+@.+/. */
export function isValidEmail(value = "") {
  const email = String(value || "").trim().toLowerCase();
  if (email.length < 5 || email.length > 254) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    .test(email);
}

/* Mirror of USERNAME_PATTERN in the auth and onboarding controllers. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
export const isValidUsername = (value = "") => USERNAME_PATTERN.test(String(value || "").trim().toLowerCase());

/* Matches the pattern both desktop onboarding modals already enforce. */
export const PHONE_PATTERN = /^[+]?[\d\s\-().]{7,15}$/;
export const isValidPhone = (value = "") => PHONE_PATTERN.test(String(value || "").trim());

export function isValidHttpUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return true; // every link field in these flows is optional
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return Boolean(url.hostname) && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export const REFERRAL_MAX_LENGTH = 40;
export const REFERRAL_STORAGE_KEY = "sb:referral-code";

/* Mirror of `normalizeReferralInput`. "null"/"undefined" are filtered because a
   referral can arrive from a URL that stringified a missing value. */
export function normalizeReferral(value = "") {
  const raw = String(value || "").trim();
  if (raw === "null" || raw === "undefined") return "";
  return raw.slice(0, REFERRAL_MAX_LENGTH);
}

export const MAX_STORY_TAGS = 5;

/* ─── Refusals ───────────────────────────────────────────────────────────── */

export const REFUSAL = Object.freeze({
  NONE: "none",
  /* Not a failure: the account exists and the flow continues at the OTP step. */
  NEEDS_VERIFICATION: "needs-verification",
  INVALID_CREDENTIALS: "invalid-credentials",
  ACCOUNT_DELETED: "account-deleted",
  ACCOUNT_FROZEN: "account-frozen",
  ACCOUNT_NOT_FOUND: "account-not-found",
  EMAIL_IN_USE: "email-in-use",
  REFERRAL_USED: "referral-used",
  REFERRAL_INVALID: "referral-invalid",
  WEAK_PASSWORD: "weak-password",
  USERNAME_TAKEN: "username-taken",
  ADMIN_CODE: "admin-code",
  RATE_LIMITED: "rate-limited",
  OFFLINE: "offline",
  SERVER: "server",
  UNKNOWN: "unknown",
});

/*
 * Codes we can read from a flag rather than from prose. Flags are checked
 * first, always: the server sets `accountDeleted`, `accountFrozen`,
 * `accountNotFound` and `requiresVerification` explicitly, and a flag survives
 * a copy-edit that a message string does not.
 */
const FLAG_CODES = Object.freeze([
  ["requiresVerification", REFUSAL.NEEDS_VERIFICATION],
  ["accountDeleted", REFUSAL.ACCOUNT_DELETED],
  ["accountFrozen", REFUSAL.ACCOUNT_FROZEN],
  ["accountNotFound", REFUSAL.ACCOUNT_NOT_FOUND],
]);

/*
 * The refusals with no flag of their own. These ARE prose matches, and that is
 * a known weakness rather than a design: the server returns a bare 400/403 with
 * a sentence for each. They are ordered most-specific-first, every one falls
 * back to showing the server's own message, and none of them changes what the
 * user is told — only which control the screen puts in front of them. So a
 * server copy-edit degrades this to "shows the message without the shortcut"
 * rather than to something wrong.
 */
const MESSAGE_CODES = Object.freeze([
  [/referral already used/i, REFUSAL.REFERRAL_USED],
  [/invalid referral/i, REFUSAL.REFERRAL_INVALID],
  [/admin access code/i, REFUSAL.ADMIN_CODE],
  [/username (is )?(already )?(taken|in use)/i, REFUSAL.USERNAME_TAKEN],
  [/(email|user) already (exists|registered|in use)/i, REFUSAL.EMAIL_IN_USE],
  [/password must/i, REFUSAL.WEAK_PASSWORD],
  [/too many|try again later|rate limit/i, REFUSAL.RATE_LIMITED],
  [/invalid email or password/i, REFUSAL.INVALID_CREDENTIALS],
]);

const FALLBACK_MESSAGE = Object.freeze({
  [REFUSAL.OFFLINE]: "We couldn't reach Ckript. Check your connection and try again.",
  [REFUSAL.SERVER]: "Something went wrong on our side. Please try again in a moment.",
  [REFUSAL.INVALID_CREDENTIALS]: "That email and password don't match an account.",
  [REFUSAL.UNKNOWN]: "That didn't work. Please try again.",
});

/**
 * Normalise anything an auth request can come back as into one refusal record.
 *
 * Accepts an axios error, a rejected promise's reason, or a resolved response
 * body — because `requiresVerification` arrives BOTH ways depending on the
 * endpoint: /auth/join returns it on a 200 and /auth/login on a 403. A caller
 * that had to know which would eventually get it wrong.
 *
 * Returns `{ code: REFUSAL.NONE }` when there is nothing to refuse.
 */
export function readRefusal(input) {
  if (!input) return { code: REFUSAL.NONE, message: "" };

  // An axios error, a fetch-style error, or a plain response body.
  const body = input?.response?.data ?? input?.data ?? input;
  const status = input?.response?.status ?? input?.status ?? 0;
  const network = input?.code === "ERR_NETWORK" || input?.message === "Network Error";

  if (network) {
    return { code: REFUSAL.OFFLINE, message: FALLBACK_MESSAGE[REFUSAL.OFFLINE], status: 0 };
  }

  if (!body || typeof body !== "object") {
    if (!status) return { code: REFUSAL.NONE, message: "" };
    const code = status >= 500 ? REFUSAL.SERVER : REFUSAL.UNKNOWN;
    return { code, message: FALLBACK_MESSAGE[code], status };
  }

  const message = String(body.message || "").trim();
  const base = {
    message,
    status,
    email: String(body.email || "").trim(),
    // /auth/login and /auth/join both send these with a verification refusal so
    // the OTP step can show a truthful countdown instead of a guessed one.
    otpExpirySeconds: body.otpExpirySeconds,
    resendCooldownSeconds: body.resendCooldownSeconds,
    frozenReason: String(body.frozenReason || "").trim(),
  };

  for (const [flag, code] of FLAG_CODES) {
    if (body[flag]) return { ...base, code, message: message || FALLBACK_MESSAGE[REFUSAL.UNKNOWN] };
  }

  // A successful body with no flag and no message is not a refusal at all.
  if (!message && status && status < 400) return { code: REFUSAL.NONE, message: "" };

  if (message) {
    for (const [pattern, code] of MESSAGE_CODES) {
      if (pattern.test(message)) return { ...base, code };
    }
  }

  if (!status || status < 400) return { code: REFUSAL.NONE, message: "" };
  if (status >= 500) return { ...base, code: REFUSAL.SERVER, message: message || FALLBACK_MESSAGE[REFUSAL.SERVER] };
  return { ...base, code: REFUSAL.UNKNOWN, message: message || FALLBACK_MESSAGE[REFUSAL.UNKNOWN] };
}

/*
 * Which field a refusal belongs beside, or "" for the ones that belong to the
 * whole form. §14 asks that an error be reachable from the control that caused
 * it; a frozen account has no control, a taken username has exactly one.
 */
export const REFUSAL_FIELD = Object.freeze({
  [REFUSAL.INVALID_CREDENTIALS]: "password",
  [REFUSAL.EMAIL_IN_USE]: "email",
  [REFUSAL.WEAK_PASSWORD]: "password",
  [REFUSAL.USERNAME_TAKEN]: "username",
  [REFUSAL.REFERRAL_USED]: "referralCode",
  [REFUSAL.REFERRAL_INVALID]: "referralCode",
});

export function refusalField(code) {
  return REFUSAL_FIELD[code] || "";
}

/* Whether a refusal is worth offering a retry for. An account that is frozen or
   deleted will still be frozen or deleted on the second tap, and offering
   "Try again" for it is a small dishonesty that wastes someone's time. */
export function isRetryable(code) {
  return code === REFUSAL.OFFLINE || code === REFUSAL.SERVER || code === REFUSAL.UNKNOWN;
}
