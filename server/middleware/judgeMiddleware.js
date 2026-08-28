import CompetitionJudge from "../models/CompetitionJudge.js";

/**
 * Access to the judge panel.
 *
 * Shaped on middleware/financeMiddleware.js — a Set of allowed roles checked against req.user.role —
 * but it diverges on one point, deliberately.
 *
 * `admin` IS NOT ADMITTED. financeOnly admits admin because that panel performs no writes, so an
 * admin reading it changes nothing. These routes do write: an admin who hit the scoring endpoint
 * would create a JudgeScore carrying their own id, and it would then be averaged into the panel's
 * result as though a judge had cast it — a phantom judge nobody assigned, in the one place where
 * "every score came from a named judge" is the entire point of the feature.
 *
 * An admin who wants to see exactly what a judge sees does not need this role: they get it from the
 * admin-side preview route, which calls the same toJudgeEntryView projection. That is strictly
 * better than admitting admin here, because it also proves the projection works.
 *
 * Also missing, and for the same reason financeOnly omits it: the adminBranchAccess deploy-branch
 * guard. That exists to stop admin writes landing on the wrong environment. Judges are not admins,
 * and a branch freeze must not strand a panel halfway through reading a script.
 */
const JUDGE_ROLES = new Set(["judge"]);

const judgeOnly = (req, res, next) => {
  if (!req.user || !JUDGE_ROLES.has(String(req.user.role))) {
    return res.status(403).json({ message: "Access denied. Judge access only." });
  }
  return next();
};

/**
 * Is this judge on THIS competition's panel?
 *
 * The role gate above says "you are a judge". This says "you are a judge HERE", and it is what makes
 * one account across several competitions safe: the assignment is read per request, so revoking a
 * seat takes effect on the next call with no token to invalidate and no session to expire.
 *
 * Per-object scoping, transposed from middleware/checkPermission.js: load the row, resolve the
 * caller's standing on it, attach it to req, hand off.
 *
 * Returns 404 rather than 403 when the judge is not on the panel. A 403 would confirm the
 * competition exists, letting an assigned judge walk ObjectIds and enumerate every unannounced
 * competition on the platform. Not on the panel should be indistinguishable from not there.
 */
export const requireJudgeAssignment = async (req, res, next) => {
  try {
    const competitionId = req.params.competitionId || req.params.id;
    if (!competitionId) return res.status(404).json({ message: "Competition not found." });

    const assignment = await CompetitionJudge.findOne({
      competition: competitionId,
      judge: req.user._id,
      status: "active",
    }).lean();

    if (!assignment) return res.status(404).json({ message: "Competition not found." });

    req.judgeAssignment = assignment;
    return next();
  } catch (error) {
    // Logged server-side rather than returned: a CastError on a malformed id would otherwise echo
    // the caller's input back at them, and the caller learns nothing useful from it either way.
    console.error("[judge] assignment check failed:", error?.message || error);
    return res.status(500).json({ message: "Permission check failed." });
  }
};

export default judgeOnly;
