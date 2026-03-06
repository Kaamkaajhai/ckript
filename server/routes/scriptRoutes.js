import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  uploadScript, getScripts, getScriptById, unlockScript,
  holdScript, releaseHold, getMyHolds, addRoles,
  getFeaturedScripts, getTopScripts, searchScriptsReader,
  getLatestScripts, recordRead, toggleFavorite, getCategories,
  extractPdfText, saveDraft, deleteScript, getMyDrafts, getMyScripts, updateScript,
  createScriptPurchaseOrder, verifyScriptPurchase,
  createScriptHoldOrder, verifyScriptHold,
  uploadThumbnail, uploadTrailer,
  uploadScriptThumbnail, uploadScriptTrailer,
  getInvestorHomeFeed
} from "../controllers/scriptController.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/extract-pdf", protect, upload.single("pdf"), extractPdfText);
router.post("/draft", protect, saveDraft);
router.post("/upload", protect, uploadScript);

// Thumbnail and Trailer upload routes
router.post("/:id/upload-thumbnail", protect, uploadThumbnail.single("thumbnail"), uploadScriptThumbnail);
router.post("/:id/upload-trailer", protect, uploadTrailer.single("trailer"), uploadScriptTrailer);

// Razorpay payment routes for scripts
router.post("/purchase/create-order", protect, createScriptPurchaseOrder);
router.post("/purchase/verify-payment", protect, verifyScriptPurchase);
router.post("/hold/create-order", protect, createScriptHoldOrder);
router.post("/hold/verify-payment", protect, verifyScriptHold);

router.get("/", protect, getScripts);
router.get("/holds", protect, getMyHolds);
router.get("/my-drafts", protect, getMyDrafts);
router.get("/mine", protect, getMyScripts);
// Reader static routes (must be before /:id)
router.get("/featured", protect, getFeaturedScripts);
router.get("/top", protect, getTopScripts);
router.get("/reader-search", protect, searchScriptsReader);
router.get("/latest", protect, getLatestScripts);
router.get("/categories", protect, getCategories);
router.get("/investor-home", protect, getInvestorHomeFeed);
router.get("/:id", protect, getScriptById);
router.post("/unlock", protect, unlockScript);
router.post("/hold", protect, holdScript);
router.post("/release-hold", protect, releaseHold);
router.post("/add-roles", protect, addRoles);
router.post("/:id/read", protect, recordRead);
router.post("/:id/favorite", protect, toggleFavorite);
router.put("/:id", protect, updateScript);
router.delete("/:id", protect, deleteScript);

export default router;
