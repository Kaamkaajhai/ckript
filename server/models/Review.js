import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    script: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
);

// One review per user per script
reviewSchema.index({ user: 1, script: 1 }, { unique: true });

// Auto-update Script's rating & reviewCount after save/delete
reviewSchema.statics.calcAverageRating = async function (scriptId) {
  const Script = (await import("./Script.js")).default;
  const stats = await this.aggregate([
    { $match: { script: scriptId } },
    { $group: { _id: "$script", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    await Script.findByIdAndUpdate(scriptId, { rating: Math.round(stats[0].avgRating * 10) / 10, reviewCount: stats[0].count });
  } else {
    await Script.findByIdAndUpdate(scriptId, { rating: 0, reviewCount: 0 });
  }
};

reviewSchema.post("save", function () {
  this.constructor.calcAverageRating(this.script);
});

reviewSchema.post("findOneAndDelete", function (doc) {
  if (doc) doc.constructor.calcAverageRating(doc.script);
});

export default mongoose.model("Review", reviewSchema);
