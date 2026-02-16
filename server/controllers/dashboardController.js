import User from "../models/User.js";
import Post from "../models/Post.js";
import Script from "../models/Script.js";
import ScriptOption from "../models/ScriptOption.js";
import Audition from "../models/Audition.js";

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Get user's posts
    const posts = await Post.find({ user: userId });
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, post) => sum + post.likes.length, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0);
    const totalSaves = posts.reduce((sum, post) => sum + post.saves.length, 0);

    // Get user's scripts
    const scripts = await Script.find({ creator: userId });
    const totalScripts = scripts.length;
    const totalEarnings = scripts.reduce((sum, script) => {
      return sum + (script.unlockedBy.length * script.price);
    }, 0);

    // Hold earnings
    const holdOptions = await ScriptOption.find({ 
      script: { $in: scripts.map(s => s._id) },
      status: { $in: ["active", "converted"] }
    });
    const holdEarnings = holdOptions.reduce((sum, opt) => sum + opt.creatorPayout, 0);

    // Total views across all scripts
    const totalViews = scripts.reduce((sum, s) => sum + (s.views || 0), 0);

    // Scripts with trailers
    const trailersGenerated = scripts.filter(s => s.trailerStatus === "ready").length;

    // Scripts with scores  
    const scoredScripts = scripts.filter(s => s.scriptScore?.overall).length;
    const avgScore = scoredScripts > 0 
      ? Math.round(scripts.filter(s => s.scriptScore?.overall).reduce((sum, s) => sum + s.scriptScore.overall, 0) / scoredScripts) 
      : 0;

    // Audition stats
    const auditionCount = await Audition.countDocuments({ script: { $in: scripts.map(s => s._id) } });
    
    // Active holds on my scripts
    const activeHolds = scripts.filter(s => s.holdStatus === "held").length;

    const followersCount = user.followers.length;
    const followingCount = user.following.length;

    // Recent activity (last 5 posts)
    const recentPosts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name profileImage");

    // Top performing scripts
    const topScripts = await Script.find({ creator: userId })
      .sort({ views: -1 })
      .limit(5)
      .select("title views unlockedBy scriptScore trailerStatus holdStatus genre");

    res.json({
      stats: {
        totalPosts,
        totalLikes,
        totalComments,
        totalSaves,
        totalScripts,
        totalEarnings: totalEarnings + holdEarnings,
        holdEarnings,
        followersCount,
        followingCount,
        totalViews,
        trailersGenerated,
        scoredScripts,
        avgScore,
        auditionCount,
        activeHolds,
        scriptScoreCredits: user.subscription?.scriptScoreCredits || 0,
        plan: user.subscription?.plan || "free",
      },
      recentPosts,
      topScripts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
