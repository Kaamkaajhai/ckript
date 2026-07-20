// Single source of truth for the writer "scripts per plan" limit. Create, upload, AND the
// /script-limit status endpoint all build their answer from here, so the number and the message
// can't drift between the gate the UI shows and the gate the server enforces.
//
// The limit counts NON-DRAFT scripts (status !== "draft"): a writer can keep unlimited drafts, but
// only `limit` of them may be submitted/published. Only writer/creator roles are limited.

const WRITER_ROLES = new Set(["writer", "creator"]);

// plan → how many non-draft scripts are allowed, and the plan to upgrade to for more.
const PLAN_LIMITS = {
  free: { limit: 1, requiredPlan: "silver" },
  silver: { limit: 8, requiredPlan: "gold" },
  gold: { limit: 20, requiredPlan: "custom" },
  pro: { limit: 20, requiredPlan: "custom" },
  premium: { limit: 20, requiredPlan: "custom" },
};

export const writerLimitApplies = (role) => WRITER_ROLES.has(String(role || "").toLowerCase());

export const resolvePlanLimit = (plan) =>
  PLAN_LIMITS[String(plan || "free").toLowerCase()] || PLAN_LIMITS.free;

// Build the full status object from a plan + the writer's current non-draft script count.
// `verb` only shapes the message ("create" / "upload" more scripts).
export const buildScriptLimitStatus = (plan, used, { verb = "create" } = {}) => {
  const normPlan = String(plan || "free").toLowerCase();
  const { limit, requiredPlan } = resolvePlanLimit(normPlan);
  const usedCount = Math.max(0, Number(used) || 0);
  const limitReached = usedCount >= limit;
  const planLabel = normPlan === "free" ? "Free Tier" : "current plan";
  const message = `You have reached your ${planLabel} limit of ${limit} script${limit > 1 ? "s" : ""}. Please upgrade your plan to ${verb} more scripts.`;
  return {
    plan: normPlan,
    limit,
    used: usedCount,
    remaining: Math.max(0, limit - usedCount),
    limitReached,
    requiredPlan,
    message,
  };
};

export const getScriptUploadCycleStart = (user) => {
  if (!user || !user.subscription) return null;
  
  const activatedAt = user.subscription.accessActivatedAt;
  const expiresAt = user.subscription.accessExpiresAt;
  
  if (activatedAt && expiresAt) {
    const start = new Date(activatedAt);
    const end = new Date(expiresAt);
    const now = new Date();

    if (now <= end) {
      let current = new Date(start);
      while (current <= now) {
        current.setMonth(current.getMonth() + 1);
      }
      
      let previous = new Date(current);
      previous.setMonth(previous.getMonth() - 1);
      return previous;
    }
  }
  
  return null;
};
