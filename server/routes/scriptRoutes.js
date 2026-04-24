import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  uploadScript, getScripts, getScriptById, getScriptByPath, getPublicScriptById, unlockScript,
  holdScript, releaseHold, getMyHolds, addRoles,
  getFeaturedScripts, getTopScripts, searchScriptsReader,
  getLatestScripts, recordRead, toggleFavorite, getCategories,
  trackScriptInteraction,
  extractPdfText, saveDraft, deleteScript, getMyDrafts, getMyScripts, updateScript,
  getScriptSubmissionSummaryPdf,
  getPurchaseRequestAcceptancePdf,
  createScriptPurchaseOrder, verifyScriptPurchase,
  createScriptHoldOrder, verifyScriptHold,
  uploadThumbnail, uploadTrailer,
  uploadScriptThumbnail, uploadScriptTrailer,
  requestScriptAITrailer, submitTrailerFeedback,
  activateProjectSpotlight,
  getInvestorHomeFeed, getTopList,
  requestScriptPurchase, approveScriptPurchase, rejectScriptPurchase, getMyPurchaseRequests,
} from "../controllers/scriptController.js";
import multer from "multer";

const router = express.Router();
const PDF_UPLOAD_MAX_BYTES = 30 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PDF_UPLOAD_MAX_BYTES },
});

const uploadPdfWithLimit = (req, res, next) => {
  upload.single("pdf")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "PDF must be 30MB or smaller." });
    }
    if (err) {
      return res.status(400).json({ message: err.message || "PDF upload failed." });
    }
    next();
  });
};

const uploadThumbnailWithLimit = (req, res, next) => {
  uploadThumbnail.single("thumbnail")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Thumbnail must be 5MB or smaller." });
    }
    if (err) {
      return res.status(400).json({ message: err.message || "Thumbnail upload failed." });
    }
    next();
  });
};

const uploadTrailerWithLimit = (req, res, next) => {
  uploadTrailer.single("trailer")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Trailer must be 250MB or smaller." });
    }
    if (err) {
      return res.status(400).json({ message: err.message || "Trailer upload failed." });
    }
    next();
  });
};

router.post("/extract-pdf", protect, uploadPdfWithLimit, extractPdfText);
router.post("/draft", protect, saveDraft);
router.post("/upload", protect, uploadScript);

// Thumbnail and Trailer upload routes
router.post("/:id/upload-thumbnail", protect, uploadThumbnailWithLimit, uploadScriptThumbnail);
router.post("/:id/upload-trailer", protect, uploadTrailerWithLimit, uploadScriptTrailer);
router.post("/:id/request-ai-trailer", protect, requestScriptAITrailer);
router.post("/:id/trailer-feedback", protect, submitTrailerFeedback);
router.post("/:id/activate-spotlight", protect, activateProjectSpotlight);
router.post("/activate-spotlight", protect, activateProjectSpotlight);
router.post("/spotlight/activate", protect, activateProjectSpotlight);

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
router.get("/top-list", protect, getTopList);
router.get("/reader-search", protect, searchScriptsReader);
router.get("/latest", protect, getLatestScripts);
router.get("/categories", protect, getCategories);
router.get("/investor-home", protect, getInvestorHomeFeed);
router.get("/public/:id", getPublicScriptById);
router.get("/path/:projectHeading/:writerUsername", protect, getScriptByPath);
router.get("/:id/submission-summary-pdf", protect, getScriptSubmissionSummaryPdf);
router.get("/purchase-request/:id/acceptance-pdf", protect, getPurchaseRequestAcceptancePdf);
// Purchase request routes (must be before /:id)
router.post("/purchase-request", protect, requestScriptPurchase);
router.get("/purchase-requests/mine", protect, getMyPurchaseRequests);
router.put("/purchase-request/:id/approve", protect, approveScriptPurchase);
router.put("/purchase-request/:id/reject", protect, rejectScriptPurchase);
router.get("/:id", protect, getScriptById);
router.post("/unlock", protect, unlockScript);
router.post("/hold", protect, holdScript);
router.post("/release-hold", protect, releaseHold);
router.post("/add-roles", protect, addRoles);
router.post("/:id/read", protect, recordRead);
router.post("/:id/favorite", protect, toggleFavorite);
router.post("/:id/interactions", protect, trackScriptInteraction);
router.put("/:id", protect, updateScript);
router.delete("/:id", protect, deleteScript);

export default router;
