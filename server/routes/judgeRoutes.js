import express from "express";
import protect from "../middleware/authMiddleware.js";
import judgeOnly, { requireJudgeAssignment } from "../middleware/judgeMiddleware.js";
import {
  listJudgeCompetitions,
  getJudgeCompetition,
  listJudgeEntries,
  getJudgeEntry,
  saveJudgeScore,
  listJudgeNominations,
  saveJudgeNomination,
  deleteJudgeNomination,
} from "../controllers/judgeController.js";

const router = express.Router();

// Two gates, in order. `judgeOnly` answers "are you a judge at all"; `requireJudgeAssignment` on
// every :competitionId route answers "are you a judge HERE". The second is what makes one account
// across several panels safe, and it reads the assignment per request — so revoking a seat takes
// effect on the very next call, with no token to invalidate.
router.use(protect, judgeOnly);

router.get("/competitions", listJudgeCompetitions);

// Note what is NOT here: no leaderboard, no aggregate, no other judge's score, no AI evaluation, and
// no route that takes an entry id without a competition id beside it. Requirement "a judge sees only
// their own scores" is enforced by there being no endpoint that could serve anything else, which is
// a stronger guarantee than a filter someone can later widen.
router.get("/competitions/:competitionId", requireJudgeAssignment, getJudgeCompetition);
router.get("/competitions/:competitionId/entries", requireJudgeAssignment, listJudgeEntries);
router.get("/competitions/:competitionId/entries/:entryId", requireJudgeAssignment, getJudgeEntry);
router.put("/competitions/:competitionId/entries/:entryId/score", requireJudgeAssignment, saveJudgeScore);

router.get("/competitions/:competitionId/nominations", requireJudgeAssignment, listJudgeNominations);
router.put("/competitions/:competitionId/nominations/:awardKey", requireJudgeAssignment, saveJudgeNomination);
router.delete("/competitions/:competitionId/nominations/:awardKey", requireJudgeAssignment, deleteJudgeNomination);

export default router;
