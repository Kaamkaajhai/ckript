import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
	generateTrailer,
	getTrailerStatus,
	generateScriptScore,
	correctScriptText,
	aiWritingAssist,
	generateProseSample,
	generateProjectMetadata,
} from "../controllers/aiController.js";

const router = express.Router();

// AI Trailer
router.post("/generate-trailer", protect, generateTrailer);
router.get("/trailer-status/:scriptId", protect, getTrailerStatus);

// Script Score
router.post("/script-score", protect, generateScriptScore);

// AI Prose Sample (Publishing)
router.post("/prose-sample", protect, generateProseSample);

// Script grammar correction
router.post("/correct-script-text", protect, correctScriptText);

// AI Writing Assistant (improve, professional, grammar, shorten, expand, dialogue, emotional, custom)
router.post("/writing-assist", protect, aiWritingAssist);

// AI Project Metadata — parse the script to draft logline, synopsis, and roles
router.post("/generate-metadata", protect, generateProjectMetadata);

export default router;
