// Client mirror of the server AI entitlement rule (server/config/aiEntitlements.js). The SERVER is
// authoritative — it enforces this on every AI endpoint — and this mirror exists so the UI can show a
// locked state and a truthful remaining count without a round trip. Kept in sync by
// aiEntitlements.parity.test.js, which imports both files and compares them.
//
// Replaces three client gates that disagreed with each other and with the server:
//   - enforceGoldPlan (pages/CreateProject)  required plan === "gold" exactly
//   - useAiCover                              required plan !== "free"
//   - ScriptUpload's handleGenerateMetadata   had no gate at all
// against a plan enum of free|pro|enterprise|silver|gold|diamond.
//
// `enforceGoldPlan` deliberately still exists for PDF export and screenplay import. Those are not AI
// features and their entitlement was never part of this decision — see §19 of
// NATIVE_APP_IMPLEMENTATION.md, where the question of whether they should follow this rule is open.

export const AI_FREE_PLANS = Object.freeze(["free", "none", ""]);

export const AI_IMAGE_ALLOWANCE = 15;

export const normalizePlan = (plan) => String(plan ?? "").trim().toLowerCase();

export const hasAiAccess = (plan) => !AI_FREE_PLANS.includes(normalizePlan(plan));

// Read AI access straight off an auth-context user, which is how every caller actually holds it.
export const userHasAiAccess = (user) => hasAiAccess(user?.subscription?.plan);

export const aiImagesRemaining = (used) => {
  const spent = Number(used);
  if (!Number.isFinite(spent) || spent < 0) return AI_IMAGE_ALLOWANCE;
  return Math.max(0, AI_IMAGE_ALLOWANCE - spent);
};

// Copy for the toast raised when a free-plan writer taps a locked AI control. One string, so the
// three flows stop describing the same lock three different ways.
export const AI_LOCKED_TOAST = "AI tools are included with a paid plan. Upgrade to unlock them.";

// Copy for a spent allowance. Deliberately NOT an upgrade prompt: the writer already pays, so
// offering them a plan they hold would be both wrong and insulting.
export const AI_QUOTA_TOAST =
  `You've used all ${AI_IMAGE_ALLOWANCE} AI cover images included in your current plan period.`;

/**
 * Turn an axios error from any AI endpoint into what the UI should do about it.
 * Distinguishes the two refusals the server can send — `requiresUpgrade` (403, offer the pricing
 * modal) and `quotaExhausted` (429, do not) — from an ordinary failure.
 */
export const describeAiError = (error) => {
  const status = error?.response?.status;
  const data = error?.response?.data || {};
  const message = data.message || error?.message || "Something went wrong. Please try again.";

  if (status === 403 && data.requiresUpgrade) {
    return { kind: "locked", message, offerUpgrade: true };
  }
  if (status === 429 || data.quotaExhausted) {
    return { kind: "quota", message, offerUpgrade: false };
  }
  return { kind: "error", message, offerUpgrade: false };
};
