import Review from "../models/Review.js";

export const createReview = async (req, res) => {
  try {
    const { script, rating, comment } = req.body;
    const existing = await Review.findOne({ user: req.user._id, script });
    if (existing) return res.status(400).json({ message: "You already reviewed this script" });

    const review = await Review.create({ user: req.user._id, script, rating, comment });
    const populated = await review.populate("user", "name profileImage role");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getReviewsByScript = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const total = await Review.countDocuments({ script: req.params.scriptId });
    const reviews = await Review.find({ script: req.params.scriptId })
      .populate("user", "name profileImage role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ reviews, totalPages: Math.ceil(total / limit), page, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });

    review.rating = req.body.rating || review.rating;
    review.comment = req.body.comment || review.comment;
    await review.save();
    const populated = await review.populate("user", "name profileImage role");
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });

    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
