import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Script from "../models/Script.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @route   GET /api/search
// @desc    Search for users, posts, or scripts with optional role filter
// @access  Private
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { q, type = "all", role, genre, contentType, budget, premium } = req.query;
    if (!q || !q.trim()) {
      return res.json({ users: [], scripts: [] });
    }
    const searchRegex = new RegExp(escapeRegExp(q.trim()), "i");

    const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
    const usersWhoBlockedCurrent = await User.find({ blockedUsers: req.user._id }).select("_id").lean();
    const blockedUserIds = [
      ...(currentUser?.blockedUsers || []),
      ...usersWhoBlockedCurrent.map((u) => u._id),
    ];

    let results = { users: [], scripts: [] };

    // Search users (optionally filter by role)
    if (type === "all" || type === "users" || type === "writers" || type === "investors") {
      const userMatch = { role: { $ne: "reader" } };

      // Apply role filter
      if (type === "writers") {
        userMatch.role = { $in: ["writer", "creator"] };
      } else if (type === "investors") {
        userMatch.role = "investor";
      } else if (role && role !== "reader") {
        userMatch.role = role;
      }

      if (blockedUserIds.length > 0) {
        userMatch._id = { $nin: blockedUserIds };
      }

      const userDocs = await User.aggregate([
        {
          $match: {
            ...userMatch,
            $or: [
              { name: searchRegex },
              { sid: searchRegex },
              { bio: searchRegex },
              { skills: searchRegex },
              { "writerProfile.genres": searchRegex },
              { "writerProfile.specializedTags": searchRegex }
            ]
          }
        },
        { $limit: 30 },
        { 
          $project: { 
            sid: 1, name: 1, email: 1, role: 1, bio: 1, skills: 1, profileImage: 1, 
            followers: 1, following: 1, "writerProfile.genres": 1, 
            "writerProfile.wgaMember": 1, "writerProfile.sgaMember": 1, 
            "writerProfile.representationStatus": 1 
          } 
        }
      ]);

      // Add computed counts
      results.users = userDocs.map((u) => {
        return ({
          ...u,
          followerCount: u.followers?.length || 0,
          followingCount: u.following?.length || 0,
        });
      });
    }

    // Search scripts/projects
    if (type === "all" || type === "projects") {
      const scriptMatch = {
        status: "published",
        isSold: { $ne: true },
        isDeleted: { $ne: true },
      };
      
      if (genre) scriptMatch.genre = genre;
      if (contentType) scriptMatch.contentType = contentType;
      if (budget) scriptMatch.budget = budget;
      if (premium === "true") scriptMatch.premium = true;
      else if (premium === "false") scriptMatch.premium = { $ne: true };
      if (blockedUserIds.length > 0) {
        scriptMatch.creator = { $nin: blockedUserIds };
      }

      const scriptDocs = await Script.aggregate([
        {
          $match: {
            ...scriptMatch,
            $or: [
              { title: searchRegex },
              { sid: searchRegex },
              { description: searchRegex },
              { genre: searchRegex },
              { contentType: searchRegex }
            ]
          }
        },
        { $limit: 30 },
        {
          $lookup: {
            from: "users",
            localField: "creator",
            foreignField: "_id",
            as: "creator",
            pipeline: [{ $project: { name: 1, profileImage: 1, role: 1 } }]
          }
        },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } }
      ]);

      // Add computed counts
      results.scripts = scriptDocs.map((s) => {
        return ({
          ...s,
          unlockCount: s.unlockedBy?.length || 0,
          viewCount: s.views || 0,
        });
      });
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

    const [scripts, users] = await Promise.all([
      Script.aggregate([
        {
          $match: { title: new RegExp(escapeRegExp(q.trim()), "i") }
        },
        { $sort: { readsCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "creator",
            foreignField: "_id",
            as: "creator",
            pipeline: [{ $project: { name: 1, profileImage: 1 } }]
          }
        },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        {
          $project: { title: 1, genre: 1, coverImage: 1, creator: 1, readsCount: 1, scriptScore: 1, scriptCompletion: 1 }
        }
      ]),
      User.aggregate([
        {
          $match: { 
            role: { $in: ["writer", "investor"] },
            name: new RegExp(escapeRegExp(q.trim()), "i")
          } 
        },
        { $limit: 3 },
        { $project: { name: 1, profileImage: 1, role: 1 } }
      ])
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
      .select("title genre readsCount scriptScore coverImage creator scriptCompletion")
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

