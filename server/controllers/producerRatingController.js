import ProducerRating from "../models/ProducerRating.js";
import Script from "../models/Script.js";
import { isFilmIndustryProfessionalRole } from "../utils/industryAccess.js";
import { asInt, asObjectId, asTrimmedString } from "../utils/requestValue.js";

// Industry professionals (producer / director / professional / industry / investor) may give a producer
// rating — the credibility signal. Reuses the shared role list so it stays in lockstep with the rest of
// the industry-access checks.
const isProducerRole = (role) => isFilmIndustryProfessionalRole({ role });

const PRODUCER_FIELDS = "name profileImage role companyName";

/**
 * POST /api/producer-ratings — a producer rates a published script (creates or updates their rating).
 */
export const rateScript = async (req, res) => {
  try {
    if (!isProducerRole(req.user?.role)) {
      return res.status(403).json({ message: "Only producers and industry professionals can rate scripts." });
    }

    const { script: rawScriptId, rating, review } = req.body;
    const score = Number(rating);
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return res.status(400).json({ message: "Rating must be a number from 1 to 5." });
    }

    const scriptId = asObjectId(rawScriptId);
    if (!scriptId) {
      return res.status(400).json({ message: "A valid script id is required." });
    }

    const scriptDoc = await Script.findById(scriptId).select("creator status isDeleted");
    if (!scriptDoc) return res.status(404).json({ message: "Script not found." });
    if (scriptDoc.isDeleted) return res.status(410).json({ message: "This project is deleted and cannot be rated." });
    if (scriptDoc.status !== "published") return res.status(400).json({ message: "Only published projects can be rated." });
    if (scriptDoc.creator?.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot rate your own project." });
    }

    // Upsert via find-then-save so the post('save') hook recomputes the script's aggregate.
    let doc = await ProducerRating.findOne({ producer: req.user._id, script: scriptId });
    if (doc) {
      doc.rating = score;
      doc.review = asTrimmedString(review, 2000);
      await doc.save();
    } else {
      doc = await ProducerRating.create({ producer: req.user._id, script: scriptId, rating: score, review: asTrimmedString(review, 2000) });
    }
    const populated = await doc.populate("producer", PRODUCER_FIELDS);
    const fresh = await Script.findById(scriptId).select("producerRating");
    res.status(201).json({ rating: populated, aggregate: fresh?.producerRating || { average: 0, count: 0 } });
  } catch (error) {
    console.error("[rateScript]", error?.message || error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/producer-ratings/:scriptId — the list of producer ratings for a script (visible to everyone),
 * plus the requesting producer's own rating (if any) and the aggregate.
 */
export const getProducerRatings = async (req, res) => {
  try {
    const scriptId = asObjectId(req.params.scriptId);
    if (!scriptId) return res.status(400).json({ message: "A valid script id is required." });
    const page = asInt(req.query.page, { min: 1, max: 100000, fallback: 1 });
    const limit = asInt(req.query.limit, { min: 1, max: 50, fallback: 10 });

    const [total, ratings, myRating, scriptDoc] = await Promise.all([
      ProducerRating.countDocuments({ script: scriptId }),
      ProducerRating.find({ script: scriptId })
        .populate("producer", PRODUCER_FIELDS)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      req.user?._id
        ? ProducerRating.findOne({ script: scriptId, producer: req.user._id }).populate("producer", PRODUCER_FIELDS)
        : null,
      Script.findById(scriptId).select("producerRating"),
    ]);

    res.json({
      ratings,
      myRating,
      aggregate: scriptDoc?.producerRating || { average: 0, count: 0 },
      canRate: isProducerRole(req.user?.role),
      totalPages: Math.ceil(total / limit),
      page,
      total,
    });
  } catch (error) {
    console.error("[getProducerRatings]", error?.message || error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /api/producer-ratings/:id — a producer removes their own rating.
 */
export const deleteProducerRating = async (req, res) => {
  try {
    if (!isProducerRole(req.user?.role)) {
      return res.status(403).json({ message: "Only producers and industry professionals can remove ratings." });
    }
    const ratingId = asObjectId(req.params.id);
    if (!ratingId) return res.status(400).json({ message: "A valid rating id is required." });
    const doc = await ProducerRating.findById(ratingId);
    if (!doc) return res.status(404).json({ message: "Rating not found." });
    if (doc.producer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized." });
    }
    await ProducerRating.findOneAndDelete({ _id: doc._id }); // triggers aggregate recompute
    res.json({ message: "Rating removed." });
  } catch (error) {
    console.error("[deleteProducerRating]", error?.message || error);
    res.status(500).json({ message: error.message });
  }
};
