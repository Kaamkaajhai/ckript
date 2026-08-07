import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { asObjectId } from "../utils/requestValue.js";

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
    const postId = asObjectId(req.body.postId);
    if (!postId) {
      return res.status(400).json({ message: "A valid postId is required" });
    }

    const post = await Post.findById(postId);
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
    // Validated before the comment is written, so a bad id cannot leave an orphaned Comment behind.
    const postId = asObjectId(req.body.postId);
    if (!postId) {
      return res.status(400).json({ message: "A valid postId is required" });
    }

    const comment = await Comment.create({ user: req.user._id, post: postId, text: req.body.text });
    const post = await Post.findById(postId);
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
