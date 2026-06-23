import mongoose from "mongoose";

// Scene-anchored screenplay comment (Phase 3 — Slice 2). The anchor is content-relative
// (scene identity + offset-within-scene + the quoted text), NEVER a raw document position —
// so editing elsewhere doesn't drift the comment, and if the quoted text is deleted the
// comment resolves as "orphaned" client-side rather than being lost.
const scriptCommentSchema = new mongoose.Schema(
  {
    scriptId: { type: mongoose.Schema.Types.ObjectId, ref: "Script", required: true, index: true },
    anchor: {
      sceneId: { type: String, default: "" },
      sceneOffset: { type: Number, default: 0 }, // char offset of the selection within the scene
      length: { type: Number, default: 0 },
      quote: { type: String, default: "" },        // selected text — primary locator + orphan check
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, default: "" },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    resolved: { type: Boolean, default: false },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "ScriptComment", default: null }, // reply thread
  },
  { timestamps: true }
);

scriptCommentSchema.index({ scriptId: 1, createdAt: 1 });

export default mongoose.model("ScriptComment", scriptCommentSchema);
