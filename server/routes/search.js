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
    const { q, type = "all", role, genre, contentType, budget, premium } = req.query;
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
      const scriptQuery = { status: "published" };
      if (q && q.trim()) {
        scriptQuery.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { genre: searchRegex },
          { contentType: searchRegex },
        ];
      }
      if (genre) scriptQuery.genre = genre;
      if (contentType) scriptQuery.contentType = contentType;
      if (budget) scriptQuery.budget = budget;
      if (premium === "true") scriptQuery.premium = true;
      else if (premium === "false") scriptQuery.premium = { $ne: true };

      results.scripts = await Script.find(scriptQuery)
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

// GET /api/search/suggestions?q=
router.get("/suggestions", authMiddleware, async (req, res) => {
  try {
    const { q = "" } = req.query;
    if (!q.trim() || q.trim().length < 2) return res.json({ scripts: [], users: [] });

    const regex = new RegExp(q.trim(), "i");

    const [scripts, users] = await Promise.all([
      Script.find({ title: regex })
        .select("title genre coverImage creator readsCount scriptScore")
        .populate("creator", "name profileImage")
        .sort({ readsCount: -1 })
        .limit(5)
        .lean(),
      User.find({ name: regex, role: { $in: ["writer", "investor"] } })
        .select("name profileImage role")
        .limit(3)
        .lean(),
    ]);

    res.json({ scripts, users });
  } catch (error) {
    console.error("Suggestions error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/search/trending
router.get("/trending", async (req, res) => {
  try {
    const trendingScripts = await Script.find({ isPublished: true })
      .select("title genre readsCount scriptScore coverImage creator")
      .populate("creator", "name")
      .sort({ readsCount: -1, scriptScore: -1 })
      .limit(8)
      .lean();

    const trendingGenres = [
      "Drama", "Comedy", "Thriller", "Romance", "Action",
      "Horror", "Sci-Fi", "Documentary",
    ];

    res.json({ scripts: trendingScripts, genres: trendingGenres });
  } catch (error) {
    console.error("Trending error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

