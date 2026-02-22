import express from "express";
import protect from "../middleware/authMiddleware.js";
import { createReview, getReviewsByScript, getReviewsByUser, updateReview, deleteReview } from "../controllers/reviewController.js";

const router = express.Router();

router.post("/", protect, createReview);
router.get("/user/:userId", protect, getReviewsByUser);
router.get("/:scriptId", protect, getReviewsByScript);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);

export default router;
