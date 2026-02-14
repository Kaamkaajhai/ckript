import User from "../models/User.js";
import Post from "../models/Post.js";
import Script from "../models/Script.js";

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's posts
    const posts = await Post.find({ user: userId });
    const totalPosts = posts.length;

    // Calculate total likes across all posts
    const totalLikes = posts.reduce((sum, post) => sum + post.likes.length, 0);

    // Get total comments
    const totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0);

    // Get total saves
    const totalSaves = posts.reduce((sum, post) => sum + post.saves.length, 0);

    // Get user's scripts
    const scripts = await Script.find({ creator: userId });
    const totalScripts = scripts.length;

    // Calculate earnings (scripts unlocked * price)
    const totalEarnings = scripts.reduce((sum, script) => {
      return sum + (script.unlockedBy.length * script.price);
    }, 0);

    // Get followers count
    const user = await User.findById(userId);
    const followersCount = user.followers.length;
    const followingCount = user.following.length;

    // Recent activity (last 5 posts)
    const recentPosts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name profileImage");

    res.json({
      stats: {
        totalPosts,
        totalLikes,
        totalComments,
        totalSaves,
        totalScripts,
        totalEarnings,
        followersCount,
        followingCount,
      },
      recentPosts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
