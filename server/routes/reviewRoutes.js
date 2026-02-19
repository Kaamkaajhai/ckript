import express from "express";
import protect from "../middleware/authMiddleware.js";
import { createReview, getReviewsByScript, updateReview, deleteReview } from "../controllers/reviewController.js";

const router = express.Router();

router.post("/", protect, createReview);
router.get("/:scriptId", protect, getReviewsByScript);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);

export default router;
