import mongoose from "mongoose";

// A rating a verified industry professional (producer / director / professional / investor) gives a
// published script. Shown to EVERY viewer as a credibility signal ("rated by N producers"). Kept in
// its own collection (separate from the reader `Review` system) so the aggregate and role gating stay
// clean and independent of reader reviews.
const producerRatingSchema = new mongoose.Schema(
  {
    producer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    script: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, default: "", maxlength: 2000 }, // optional written note
  },
  { timestamps: true }
);

// One rating per producer per script (submitting again updates the existing one — see the controller).
producerRatingSchema.index({ producer: 1, script: 1 }, { unique: true });
producerRatingSchema.index({ script: 1, createdAt: -1 });

// Recompute the script's stored aggregate (average + count) after any change, so cards/lists/detail can
// show the producer rating without re-aggregating on every read.
producerRatingSchema.statics.recalcAggregate = async function recalcAggregate(scriptId) {
  const Script = (await import("./Script.js")).default;
  const stats = await this.aggregate([
    { $match: { script: new mongoose.Types.ObjectId(scriptId) } },
    { $group: { _id: "$script", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const average = stats.length ? Math.round(stats[0].avg * 10) / 10 : 0;
  const count = stats.length ? stats[0].count : 0;
  await Script.findByIdAndUpdate(scriptId, { producerRating: { average, count } });
};

producerRatingSchema.post("save", function afterSave() {
  this.constructor.recalcAggregate(this.script);
});
producerRatingSchema.post("findOneAndDelete", function afterDelete(doc) {
  if (doc) doc.constructor.recalcAggregate(doc.script);
});

export default mongoose.model("ProducerRating", producerRatingSchema);
