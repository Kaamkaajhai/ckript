import express from "express";
import protect from "../middleware/authMiddleware.js";
import { 
  submitAudition, getScriptAuditions, getMyAuditions, 
  updateAuditionStatus, getAvailableRoles 
} from "../controllers/auditionController.js";

const router = express.Router();

router.post("/submit", protect, submitAudition);
router.get("/script/:scriptId", protect, getScriptAuditions);
router.get("/my-auditions", protect, getMyAuditions);
router.put("/:id/status", protect, updateAuditionStatus);
router.get("/roles", protect, getAvailableRoles);

export default router;
