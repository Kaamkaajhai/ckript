import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  uploadScript, getScripts, getScriptById, unlockScript,
  holdScript, releaseHold, getMyHolds, addRoles,
  getFeaturedScripts, getTopScripts, searchScriptsReader,
  getLatestScripts, recordRead, toggleFavorite, getCategories,
  extractPdfText, saveDraft
} from "../controllers/scriptController.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/extract-pdf", protect, upload.single("pdf"), extractPdfText);
router.post("/draft", protect, saveDraft);
router.post("/upload", protect, uploadScript);
router.get("/", protect, getScripts);
router.get("/holds", protect, getMyHolds);
// Reader static routes (must be before /:id)
router.get("/featured", protect, getFeaturedScripts);
router.get("/top", protect, getTopScripts);
router.get("/reader-search", protect, searchScriptsReader);
router.get("/latest", protect, getLatestScripts);
router.get("/categories", protect, getCategories);
router.get("/:id", protect, getScriptById);
router.post("/unlock", protect, unlockScript);
router.post("/hold", protect, holdScript);
router.post("/release-hold", protect, releaseHold);
router.post("/add-roles", protect, addRoles);
router.post("/:id/read", protect, recordRead);
router.post("/:id/favorite", protect, toggleFavorite);

export default router;
