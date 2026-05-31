import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";

export const createPost = async (req, res) => {
  try {
    const post = await Post.create({ user: req.user._id, ...req.body });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFeed = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("user", "name profileImage role");
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.body.postId);
    if (!post.likes.includes(req.user._id)) {
      post.likes.push(req.user._id);
      await post.save();

      // Send notification to post owner (not yourself)
      if (post.user.toString() !== req.user._id.toString()) {
        await Notification.create({
          user: post.user,
          type: "like",
          from: req.user._id,
          post: post._id,
          message: "liked your post",
        });
      }
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const commentPost = async (req, res) => {
  try {
    const comment = await Comment.create({ user: req.user._id, post: req.body.postId, text: req.body.text });
    const post = await Post.findById(req.body.postId);
    post.comments.push(comment._id);
    await post.save();

    // Send notification to post owner (not yourself)
    if (post.user.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: post.user,
        type: "comment",
        from: req.user._id,
        post: post._id,
        message: "commented on your post",
      });
    }
    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
