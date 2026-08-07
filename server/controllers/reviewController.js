import Review from "../models/Review.js";
import Script from "../models/Script.js";
import { asObjectId } from "../utils/requestValue.js";

const isReaderReviewer = (role) => String(role || "").toLowerCase() === "reader";

export const createReview = async (req, res) => {
  try {
    const { script, rating, comment } = req.body;

    if (!isReaderReviewer(req.user?.role)) {
      return res.status(403).json({ message: "Only readers can submit reviews." });
    }

    const scriptId = asObjectId(script);
    if (!scriptId) {
      return res.status(400).json({ message: "A valid script id is required" });
    }

    const scriptDoc = await Script.findById(scriptId).select("creator status isDeleted");
    if (!scriptDoc) {
      return res.status(404).json({ message: "Script not found" });
    }

    if (scriptDoc.isDeleted) {
      return res.status(410).json({ message: "This project is deleted and cannot be reviewed." });
    }

    if (scriptDoc.status !== "published") {
      return res.status(400).json({ message: "Only published projects can be reviewed." });
    }

    if (scriptDoc.creator?.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot review your own project." });
    }

    const existing = await Review.findOne({ user: req.user._id, script: scriptId });
    if (existing) return res.status(400).json({ message: "You already reviewed this script" });

    const review = await Review.create({ user: req.user._id, script: scriptId, rating, comment });
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
    const [total, reviews, myReview] = await Promise.all([
      Review.countDocuments({ script: req.params.scriptId }),
      Review.find({ script: req.params.scriptId })
        .populate("user", "name profileImage role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Review.findOne({ script: req.params.scriptId, user: req.user._id })
        .populate("user", "name profileImage role"),
    ]);

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      page,
      total,
      myReview,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getReviewsByUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Fetch up to 20 for profile
    const total = await Review.countDocuments({ user: req.params.userId });
    const reviews = await Review.find({ user: req.params.userId })
      .populate("script", "title coverImage genre _id")
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
    if (!isReaderReviewer(req.user?.role)) {
      return res.status(403).json({ message: "Only readers can update reviews." });
    }

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

