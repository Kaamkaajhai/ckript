import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Script from "../models/Script.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// @route   GET /api/search
// @desc    Search for users, posts, or scripts with optional role filter
// @access  Private
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { q, type = "all", role } = req.query;
    if (!q || !q.trim()) {
      return res.json({ users: [], scripts: [] });
    }
    const searchRegex = new RegExp(q.trim(), "i");

    let results = { users: [], scripts: [] };

    // Search users (optionally filter by role)
    if (type === "all" || type === "users" || type === "writers" || type === "investors" || type === "readers") {
      const userQuery = {
        $or: [
          { name: searchRegex },
          { bio: searchRegex },
          { skills: searchRegex },
          { "writerProfile.genres": searchRegex },
          { "writerProfile.specializedTags": searchRegex },
        ],
      };

      // Apply role filter
      if (type === "writers") {
        userQuery.role = { $in: ["writer", "creator"] };
      } else if (type === "investors") {
        userQuery.role = "investor";
      } else if (type === "readers") {
        userQuery.role = "reader";
      } else if (role) {
        userQuery.role = role;
      }

      results.users = await User.find(userQuery)
        .select("name email role bio skills profileImage followers following writerProfile.genres writerProfile.wgaMember writerProfile.representationStatus")
        .limit(30)
        .lean();

      // Add computed counts
      results.users = results.users.map((u) => ({
        ...u,
        followerCount: u.followers?.length || 0,
        followingCount: u.following?.length || 0,
      }));
    }

    // Search scripts/projects
    if (type === "all" || type === "projects") {
      results.scripts = await Script.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { genre: searchRegex },
          { contentType: searchRegex },
        ],
      })
        .populate("creator", "name profileImage role")
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();

      // Add computed counts
      results.scripts = results.scripts.map((s) => ({
        ...s,
        unlockCount: s.unlockedBy?.length || 0,
        viewCount: s.views || 0,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
