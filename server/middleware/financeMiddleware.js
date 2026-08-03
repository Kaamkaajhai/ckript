/**
 * Access to the finance panel.
 *
 * Deliberately NOT `adminOnly`. The panel is meant to be handed to an external accountant, and an
 * admin login carries the whole product with it — user management, script moderation, competition
 * administration, plan grants. Reusing that role would mean giving a bookkeeper the ability to
 * change the very things they are auditing.
 *
 * So `finance` is its own role with exactly one capability: reading the money. `admin` is admitted
 * too, because an owner who can already grant themselves the role gains nothing from being locked
 * out of it, and the alternative is a second account nobody maintains.
 *
 * Note what is missing: `adminOnly` also enforces the deploy-branch guard from adminBranchAccess.
 * That guard exists to stop admin WRITES landing on the wrong environment. This panel performs no
 * writes, so gating reads on it would only lock the accountant out during a branch freeze.
 */

const FINANCE_ROLES = new Set(["finance", "admin"]);

const financeOnly = (req, res, next) => {
  if (!req.user || !FINANCE_ROLES.has(String(req.user.role))) {
    return res.status(403).json({ message: "Access denied. Finance access only." });
  }
  return next();
};

export default financeOnly;
