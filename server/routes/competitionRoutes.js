import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getActiveCompetition,
  registerForCompetition,
  getMyEntry,
  openCompetitionEditor,
  submitCompetitionEntry,
  getMyCompetitions,
  getCompetitionHistory,
  getCompetitionParticipants,
  getCompetitionCertificate,
} from "../controllers/competitionController.js";

const router = express.Router();

// Public
router.get("/active", getActiveCompetition);
router.get("/history/:userId", getCompetitionHistory);

// Participant. `/mine` is declared before `/:id/...` so it is never captured as an id.
router.get("/mine", protect, getMyCompetitions);
router.post("/:id/register", protect, registerForCompetition);
router.get("/:id/me", protect, getMyEntry);
router.get("/:id/participants", protect, getCompetitionParticipants);
router.get("/:id/certificate", protect, getCompetitionCertificate);
router.post("/:id/open-editor", protect, openCompetitionEditor);
router.post("/:id/submit", protect, submitCompetitionEntry);

export default router;
