import User from "../models/User.js";
import Post from "../models/Post.js";
import Script from "../models/Script.js";
import ScriptOption from "../models/ScriptOption.js";
import Audition from "../models/Audition.js";
import Notification from "../models/Notification.js";

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Run all heavy queries in parallel
    const [user, postStats, scriptStats, recentPosts, topScripts] = await Promise.all([
      User.findById(userId).select("followers following subscription"),

      // Aggregate post stats in one query instead of loading every post doc
      Post.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            totalPosts:    { $sum: 1 },
            totalLikes:    { $sum: { $size: { $ifNull: ["$likes", []] } } },
            totalComments: { $sum: { $size: { $ifNull: ["$comments", []] } } },
            totalSaves:    { $sum: { $size: { $ifNull: ["$saves", []] } } },
          },
        },
      ]),

      // Aggregate script stats in one query instead of loading every script doc
      Script.aggregate([
        { $match: { creator: userId } },
        {
          $group: {
            _id: null,
            totalScripts:      { $sum: 1 },
            totalViews:        { $sum: { $ifNull: ["$views", 0] } },
            trailersGenerated: { $sum: { $cond: [{ $eq: ["$trailerStatus", "ready"] }, 1, 0] } },
            activeHolds:       { $sum: { $cond: [{ $eq: ["$holdStatus", "held"] }, 1, 0] } },
            scoredCount:       { $sum: { $cond: [{ $gt: ["$scriptScore.overall", 0] }, 1, 0] } },
            scoreSum:          { $sum: { $cond: [{ $gt: ["$scriptScore.overall", 0] }, "$scriptScore.overall", 0] } },
            totalUnlocks:      { $sum: { $size: { $ifNull: ["$unlockedBy", []] } } },
            // earnings = unlockedBy.length * price per script
            totalEarnings: {
              $sum: {
                $multiply: [
                  { $size: { $ifNull: ["$unlockedBy", []] } },
                  { $ifNull: ["$price", 0] },
                ],
              },
            },
            scriptIds: { $push: "$_id" },
          },
        },
      ]),

      Post.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name profileImage")
        .lean(),

      Script.find({ creator: userId })
        .sort({ views: -1 })
        .limit(5)
        .select("title views unlockedBy scriptScore trailerStatus holdStatus genre")
        .lean(),
    ]);

    const ps = postStats[0] || { totalPosts: 0, totalLikes: 0, totalComments: 0, totalSaves: 0 };
    const ss = scriptStats[0] || {
      totalScripts: 0, totalViews: 0, trailersGenerated: 0,
      activeHolds: 0, scoredCount: 0, scoreSum: 0, totalUnlocks: 0,
      totalEarnings: 0, scriptIds: [],
    };

    const avgScore = ss.scoredCount > 0 ? Math.round(ss.scoreSum / ss.scoredCount) : null;

    // Hold earnings — only if there are scripts
    let holdEarnings = 0;
    if (ss.scriptIds.length > 0) {
      const holdAgg = await ScriptOption.aggregate([
        { $match: { script: { $in: ss.scriptIds }, status: { $in: ["active", "converted"] } } },
        { $group: { _id: null, total: { $sum: "$creatorPayout" } } },
      ]);
      holdEarnings = holdAgg[0]?.total || 0;
    }

    // Audition count — only if there are scripts
    const auditionCount = ss.scriptIds.length > 0
      ? await Audition.countDocuments({ script: { $in: ss.scriptIds } })
      : 0;

    res.json({
      stats: {
        totalPosts:    ps.totalPosts,
        totalLikes:    ps.totalLikes,
        totalComments: ps.totalComments,
        totalSaves:    ps.totalSaves,
        totalScripts:  ss.totalScripts,
        totalEarnings: ss.totalEarnings + holdEarnings,
        holdEarnings,
        followersCount: user?.followers?.length || 0,
        followingCount: user?.following?.length || 0,
        totalViews:      ss.totalViews,
        trailersGenerated: ss.trailersGenerated,
        scoredScripts:   ss.scoredCount,
        avgScore,
        auditionCount,
        activeHolds: ss.activeHolds,
        scriptScoreCredits: user?.subscription?.scriptScoreCredits || 0,
        plan: user?.subscription?.plan || "free",
      },
      recentPosts,
      topScripts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDashboardReviews = async (req, res) => {
  try {
    const userId = req.user._id;

    const scripts = await Script.find({ creator: userId })
      .select("title scriptScore platformScore views unlockedBy genre price holdStatus trailerStatus createdAt")
      .sort({ createdAt: -1 });

    // AI Reviews — from scripts that have been scored
    const aiReviews = scripts
      .filter(s => s.scriptScore?.overall)
      .map(s => ({
        scriptId: s._id,
        scriptTitle: s.title,
        source: "ai",
        rating: s.scriptScore.overall,
        scores: {
          plot: s.scriptScore.plot,
          characters: s.scriptScore.characters,
          dialogue: s.scriptScore.dialogue,
          pacing: s.scriptScore.pacing,
          marketability: s.scriptScore.marketability,
        },
        feedback: s.scriptScore.feedback,
        strengths: s.scriptScore.strengths || [],
        weaknesses: s.scriptScore.weaknesses || [],
        improvements: s.scriptScore.improvements || [],
        audienceFit: s.scriptScore.audienceFit || "",
        comparables: s.scriptScore.comparables || "",
        date: s.scriptScore.scoredAt,
      }));

    // Reader Insights — engagement-based metrics
    const readerReviews = scripts.map(s => {
      const unlocks = s.unlockedBy?.length || 0;
      const views = s.views || 0;
      const conversionRate = views > 0 ? Math.round((unlocks / views) * 100) : 0;
      // Score based on engagement signals
      const engagementScore = Math.min(100, Math.round(
        (Math.min(views, 500) / 500) * 40 +
        (Math.min(unlocks, 50) / 50) * 40 +
        (conversionRate > 0 ? Math.min(conversionRate, 20) : 0)
      ));
      return {
        scriptId: s._id,
        scriptTitle: s.title,
        source: "reader",
        views,
        unlocks,
        conversionRate,
        engagementScore,
        insight: views === 0
          ? "No views yet — share your script to get reader engagement."
          : conversionRate > 10
            ? "Strong reader interest — high conversion rate from views to unlocks."
            : unlocks > 0
              ? "Gaining traction — readers are discovering your content."
              : "Getting views but no unlocks yet — consider adjusting your pricing or synopsis.",
      };
    });

    // Platform Insights — editorial/platform-level analysis
    const totalViews = scripts.reduce((sum, s) => sum + (s.views || 0), 0);
    const totalUnlocks = scripts.reduce((sum, s) => sum + (s.unlockedBy?.length || 0), 0);
    const scoredScripts = aiReviews.length;
    const avgAiScore = scoredScripts > 0
      ? Math.round(aiReviews.reduce((sum, r) => sum + r.rating, 0) / scoredScripts)
      : null;
    const heldCount = scripts.filter(s => s.holdStatus === "held").length;
    const trailerCount = scripts.filter(s => s.trailerStatus === "ready").length;
    const genres = [...new Set(scripts.map(s => s.genre).filter(Boolean))];

    const platformInsights = [];
    if (avgAiScore !== null) {
      platformInsights.push({
        type: "quality",
        title: "Script Quality",
        value: avgAiScore,
        label: avgAiScore >= 80 ? "Excellent" : avgAiScore >= 60 ? "Good" : avgAiScore >= 40 ? "Average" : "Needs Work",
        detail: `Average AI score across ${scoredScripts} scored script${scoredScripts > 1 ? "s" : ""}.`,
      });
    }
    platformInsights.push({
      type: "reach",
      title: "Audience Reach",
      value: totalViews,
      label: totalViews >= 1000 ? "High" : totalViews >= 100 ? "Growing" : "Getting Started",
      detail: `${totalViews.toLocaleString()} total views and ${totalUnlocks} unlocks across ${scripts.length} project${scripts.length > 1 ? "s" : ""}.`,
    });
    if (heldCount > 0) {
      platformInsights.push({
        type: "deals",
        title: "Deal Activity",
        value: heldCount,
        label: "Active",
        detail: `${heldCount} script${heldCount > 1 ? "s" : ""} currently held by interested buyers.`,
      });
    }
    if (trailerCount > 0) {
      platformInsights.push({
        type: "marketing",
        title: "Marketing Assets",
        value: trailerCount,
        label: "Ready",
        detail: `${trailerCount} AI trailer${trailerCount > 1 ? "s" : ""} generated to showcase your work.`,
      });
    }
    if (genres.length > 0) {
      platformInsights.push({
        type: "genre",
        title: "Genre Focus",
        value: genres.length,
        label: genres.slice(0, 3).join(", "),
        detail: `You write across ${genres.length} genre${genres.length > 1 ? "s" : ""}: ${genres.join(", ")}.`,
      });
    }

    const adminScores = scripts
      .filter(s => s.platformScore?.overall)
      .map(s => ({
        scriptId: s._id,
        scriptTitle: s.title,
        overall: s.platformScore.overall,
        content: s.platformScore.content,
        trailer: s.platformScore.trailer,
        title: s.platformScore.title,
        synopsis: s.platformScore.synopsis,
        tags: s.platformScore.tags,
        feedback: s.platformScore.feedback,
        scoredAt: s.platformScore.scoredAt,
      }));

    res.json({
      ai: aiReviews,
      readers: readerReviews,
      platform: platformInsights,
      adminScores,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Investor Dashboard ────────────────────────────────────────────
export const getInvestorDashboard = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Scripts the investor has viewed (deduplicated by script id)
    const rawViewHistory = (user.viewHistory || []).map(v => v.script?.toString()).filter(Boolean);
    const viewedScriptIds = [...new Set(rawViewHistory)];

    // Fallback: also count scripts where this user is in script.viewedBy (covers existing data before fix)
    const viewedByCount = await Script.countDocuments({ "viewedBy.user": userId });
    const totalViewedCount = Math.max(viewedScriptIds.length, viewedByCount);

    // Active holds by this investor
    const activeHolds = await ScriptOption.find({
      holder: userId,
      status: "active",
    }).populate({
      path: "script",
      select: "title genre contentType creator views scriptScore coverImage trailerStatus holdStatus budget logline",
      populate: { path: "creator", select: "name profileImage" },
    });

    // All option deals (active + past)
    const allDeals = await ScriptOption.find({ holder: userId })
      .populate({
        path: "script",
        select: "title genre contentType creator coverImage",
        populate: { path: "creator", select: "name profileImage" },
      })
      .sort({ createdAt: -1 });

    const totalInvested = allDeals.reduce((sum, d) => sum + d.fee, 0);
    const activeDealsCount = allDeals.filter(d => d.status === "active").length;
    const convertedDealsCount = allDeals.filter(d => d.status === "converted").length;

    // Scripts viewed recently
    const recentViews = await Script.find({ _id: { $in: viewedScriptIds.slice(-20) } })
      .populate("creator", "name profileImage")
      .select("title genre contentType views scriptScore coverImage trailerStatus holdStatus logline budget createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    // Top-rated scripts on the platform (for recommendations)
    const topRated = await Script.find({
      status: "published",
      adminApproved: true,
      isSold: { $ne: true },
      "scriptScore.overall": { $exists: true },
      holdStatus: "available",
    })
      .populate("creator", "name profileImage")
      .select("title genre contentType views scriptScore coverImage trailerStatus holdStatus logline budget createdAt")
      .sort({ "scriptScore.overall": -1 })
      .limit(8);

    // Preference-matched scripts (mandates take priority over general preferences)
    const mandateGenres = user.industryProfile?.mandates?.genres;
    const prefGenres = (mandateGenres?.length > 0) ? mandateGenres : (user.preferences?.genres || []);
    const prefQuery = { status: "published", adminApproved: true, holdStatus: "available", isSold: { $ne: true } };
    if (prefGenres.length > 0) {
      prefQuery.genre = { $in: prefGenres };
    }
    const matchedScripts = await Script.find(prefQuery)
      .populate("creator", "name profileImage")
      .select("title genre contentType views scriptScore coverImage trailerStatus holdStatus logline budget createdAt")
      .sort({ createdAt: -1 })
      .limit(8);

    // Genre breakdown of viewed scripts
    const genreBreakdown = {};
    recentViews.forEach(s => {
      if (s.genre) genreBreakdown[s.genre] = (genreBreakdown[s.genre] || 0) + 1;
    });

    // Average AI score of scripts the investor has viewed
    const scoredViews = recentViews.filter(s => s.scriptScore?.overall);
    const avgViewedScore = scoredViews.length > 0
      ? Math.round(scoredViews.reduce((sum, s) => sum + s.scriptScore.overall, 0) / scoredViews.length)
      : null;

    // Recent notifications for investor
    const recentNotifications = await Notification.find({ user: userId })
      .populate("from", "name profileImage role")
      .populate("script", "title genre")
      .sort({ createdAt: -1 })
      .limit(5);

    // Platform-wide stats (gives investor a market pulse)
    const totalPlatformScripts = await Script.countDocuments({ status: "published", adminApproved: true, isSold: { $ne: true } });
    const newThisWeek = await Script.countDocuments({
      status: "published",
      adminApproved: true,
      isSold: { $ne: true },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    const availableScripts = await Script.countDocuments({
      status: "published",
      adminApproved: true,
      isSold: { $ne: true },
      holdStatus: "available",
    });

    res.json({
      stats: {
        totalViewed: totalViewedCount,
        activeHolds: activeDealsCount,
        convertedDeals: convertedDealsCount,
        totalInvested,
        totalDeals: allDeals.length,
        avgViewedScore,
        followingCount: user.following?.length || 0,
        followersCount: user.followers?.length || 0,
      },
      marketPulse: {
        totalScripts: totalPlatformScripts,
        newThisWeek,
        available: availableScripts,
      },
      activeHolds: activeHolds.map(h => ({
        _id: h._id,
        script: h.script,
        fee: h.fee,
        startDate: h.startDate,
        endDate: h.endDate,
        status: h.status,
        daysRemaining: Math.max(0, Math.ceil((new Date(h.endDate) - new Date()) / (1000 * 60 * 60 * 24))),
      })),
      recentViews,
      topRated,
      matchedScripts,
      genreBreakdown,
      recentNotifications,
      recentDeals: allDeals.slice(0, 10).map(d => ({
        _id: d._id,
        script: d.script,
        fee: d.fee,
        startDate: d.startDate,
        endDate: d.endDate,
        status: d.status,
        daysRemaining: d.status === "active"
          ? Math.max(0, Math.ceil((new Date(d.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
          : null,
      })),
      preferences: user.preferences || {},
      industryProfile: user.industryProfile || {},
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
