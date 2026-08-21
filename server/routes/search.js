import express from "express";
import User from "../models/User.js";
import Script from "../models/Script.js";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  SEARCH_SCRIPT_RESULT_PROJECT,
  SEARCH_USER_RESULT_PROJECT,
  getScriptSearchSort,
  parseSearchQuery,
  unpackSearchFacet,
} from "../utils/searchQuery.js";

const router = express.Router();

// @route   GET /api/search
// @desc    Search for users, posts, or scripts with optional role filter
// @access  Private
router.get("/", authMiddleware, async (req, res) => {
  try {
    const {
      regex: searchRegex,
      type,
      role,
      genre,
      contentType,
      budget,
      premium,
      sort,
      page,
      limit,
    } = parseSearchQuery(req.query);
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(req.user._id).select("blockedUsers").lean();
    const usersWhoBlockedCurrent = await User.find({ blockedUsers: req.user._id }).select("_id").lean();
    const blockedUserIds = [
      ...(currentUser?.blockedUsers || []),
      ...usersWhoBlockedCurrent.map((u) => u._id),
    ];

    const results = { users: [], scripts: [] };
    const pagination = {
      page,
      limit,
      users: { total: 0, hasMore: false },
      scripts: { total: 0, hasMore: false },
    };

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

      if (searchRegex) {
        userMatch.$or = [
          { name: searchRegex },
          { sid: searchRegex },
          { bio: searchRegex },
          { skills: searchRegex },
          { "writerProfile.genres": searchRegex },
          { "writerProfile.specializedTags": searchRegex }
        ];
      }

      const userRows = await User.aggregate([
        { $match: userMatch },
        {
          $facet: {
            items: [
              { $sort: { name: 1, _id: 1 } },
              { $skip: skip },
              { $limit: limit },
              { $project: SEARCH_USER_RESULT_PROJECT },
            ],
            meta: [{ $count: "total" }],
          },
        },
      ]);
      const userPage = unpackSearchFacet(userRows, { page, limit });
      results.users = userPage.items;
      pagination.users = { total: userPage.total, hasMore: userPage.hasMore };
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

      if (searchRegex) {
        scriptMatch.$or = [
          { title: searchRegex },
          { sid: searchRegex },
          { description: searchRegex },
          { genre: searchRegex },
          { contentType: searchRegex }
        ];
      }

      const scriptRows = await Script.aggregate([
        { $match: scriptMatch },
        {
          $addFields: {
            unlockCount: { $size: { $ifNull: ["$unlockedBy", []] } },
            viewCount: { $ifNull: ["$views", 0] },
          },
        },
        {
          $facet: {
            items: [
              { $sort: getScriptSearchSort(sort) },
              { $skip: skip },
              { $limit: limit },
              { $project: SEARCH_SCRIPT_RESULT_PROJECT },
              {
                $lookup: {
                  from: "users",
                  localField: "creator",
                  foreignField: "_id",
                  as: "creator",
                  pipeline: [{
                    $project: {
                      name: 1,
                      username: 1,
                      profileImage: 1,
                      role: 1,
                      "writerProfile.username": 1,
                    },
                  }],
                },
              },
              { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
            ],
            meta: [{ $count: "total" }],
          },
        },
      ]);
      const scriptPage = unpackSearchFacet(scriptRows, { page, limit });
      results.scripts = scriptPage.items;
      pagination.scripts = { total: scriptPage.total, hasMore: scriptPage.hasMore };
    }

    res.json({ ...results, pagination });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/search/suggestions?q=
router.get("/suggestions", authMiddleware, async (req, res) => {
  try {
    const { q, regex } = parseSearchQuery(req.query);
    if (q.length < 2 || !regex) return res.json({ scripts: [], users: [] });

    const [scripts, users] = await Promise.all([
      Script.aggregate([
        {
            $match: { title: regex }
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
            name: regex
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

