import express from "express";
import protect from "../middleware/authMiddleware.js";
import { uploadScript, getScripts, unlockScript } from "../controllers/scriptController.js";

const router = express.Router();

router.post("/upload", protect, uploadScript);
router.get("/", protect, getScripts);
router.post("/unlock", protect, unlockScript);

export default router;
