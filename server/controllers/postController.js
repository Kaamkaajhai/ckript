import Post from "../models/Post.js";
import Comment from "../models/Comment.js";

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
    const posts = await Post.find().populate("user", "name profileImage role").sort({ createdAt: -1 });
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
    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
