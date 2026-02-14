import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Script from "../models/Script.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// @route   GET /api/search
// @desc    Search for users, posts, or scripts
// @access  Private
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { q, type = "users" } = req.query;
    const searchRegex = new RegExp(q, "i");

    let results = { users: [], posts: [], scripts: [] };

    if (type === "users" || type === "all") {
      results.users = await User.find({
        $or: [
          { name: searchRegex },
          { bio: searchRegex },
          { skills: searchRegex },
        ],
      })
        .select("-password")
        .limit(20);
    }

    if (type === "posts" || type === "all") {
      results.posts = await Post.find({ content: searchRegex })
        .populate("user", "name profileImage role")
        .sort({ createdAt: -1 })
        .limit(20);
    }

    if (type === "scripts" || type === "all") {
      results.scripts = await Script.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { genre: searchRegex },
        ],
      })
        .populate("creator", "name")
        .sort({ createdAt: -1 })
        .limit(20);
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
