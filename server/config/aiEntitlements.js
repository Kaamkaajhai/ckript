// Single server-side source of truth for who may use the AI tools, and how much image generation a
// plan period includes. Mirrored for display by client/src/config/aiEntitlements.js; the two are
// pinned together by client/src/config/aiEntitlements.parity.test.js, and THIS file is authoritative.
//
// Why this file exists: the rule used to be written four times and said four different things. The
// client's enforceGoldPlan required plan === "gold" exactly, useAiCover required plan !== "free",
// ScriptUpload's metadata generator had no gate at all, and the server gated some endpoints and not
// others — against a plan enum of free|pro|enterprise|silver|gold|diamond. A diamond subscriber was
// refused on /create-project what /upload handed them from the identical endpoint.
//
// The rule is now one sentence: any plan that is not the free tier unlocks every AI tool.

// Plan values that do NOT carry AI access. Everything else in the User.subscription.plan enum
// (pro, enterprise, silver, gold, diamond) does. Empty/absent is treated as free, not as access.
export const AI_FREE_PLANS = Object.freeze(["free", "none", ""]);

// AI cover images included per plan period. Counted on User.subscription.aiImagesGeneratedTotal,
// which paymentController/adminController/grantGoldPlan already reset to 0 on every purchase or
// grant — this file is what finally gives that counter a ceiling to mean something against.
export const AI_IMAGE_ALLOWANCE = 15;

export const normalizePlan = (plan) => String(plan ?? "").trim().toLowerCase();

export const hasAiAccess = (plan) => !AI_FREE_PLANS.includes(normalizePlan(plan));

// Images left in this plan period. Clamped at both ends: a counter that somehow ran past the
// allowance reports 0 left rather than a negative, and a missing counter reports the full allowance.
export const aiImagesRemaining = (used) => {
  const spent = Number(used);
  if (!Number.isFinite(spent) || spent < 0) return AI_IMAGE_ALLOWANCE;
  return Math.max(0, AI_IMAGE_ALLOWANCE - spent);
};

// The 403 body for a locked feature. `requiresUpgrade` is the machine-readable flag the client reads
// to raise the pricing modal instead of showing a raw error string.
export const aiLockedResponse = (feature = "This AI tool") => ({
  message: `${feature} is included with a paid plan. Upgrade to unlock it.`,
  requiresUpgrade: true,
});

// The 429 body for an exhausted image allowance. Distinct from the 403 above: the writer HAS access,
// they have simply spent the period's images, so the client must not offer an upgrade as the fix.
export const aiQuotaExhaustedResponse = () => ({
  message: `You've used all ${AI_IMAGE_ALLOWANCE} AI cover images included in your current plan period.`,
  quotaExhausted: true,
  allowance: AI_IMAGE_ALLOWANCE,
  remaining: 0,
});
