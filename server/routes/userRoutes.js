import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getWriters, getCurrentUser, getUserProfile, updateUserProfile, followUser, unfollowUser, getWatchlist, addToWatchlist, removeFromWatchlist, uploadProfileImage, upload } from "../controllers/userController.js";

const router = express.Router();

// Writers listing (must come before /:id)
router.get("/writers", protect, getWriters);

// Current user route must come before /:id to avoid conflict
router.get("/me", protect, getCurrentUser);

// Watchlist routes must come before /:id to avoid conflict
router.get("/watchlist", protect, getWatchlist);
router.post("/watchlist/add", protect, addToWatchlist);
router.post("/watchlist/remove", protect, removeFromWatchlist);

// User profile routes
router.get("/:id", protect, getUserProfile);
router.put("/update", protect, updateUserProfile);
router.post("/upload-image", protect, upload.single("profileImage"), uploadProfileImage);
router.post("/follow", protect, followUser);
router.post("/unfollow", protect, unfollowUser);

export default router;
