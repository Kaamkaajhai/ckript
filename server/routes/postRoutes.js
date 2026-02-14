import express from "express";
import protect from "../middleware/authMiddleware.js";
import { createPost, getFeed, likePost, commentPost } from "../controllers/postController.js";

const router = express.Router();

router.post("/create", protect, createPost);
router.get("/feed", protect, getFeed);
router.post("/like", protect, likePost);
router.post("/comment", protect, commentPost);

export default router;
