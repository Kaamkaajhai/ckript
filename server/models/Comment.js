import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  text: { type: String },
  revisionId: { type: mongoose.Schema.Types.ObjectId, ref: "Revision" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lineRef: { type: String },
  body: { type: String },
  resolved: { type: Boolean, default: false },
}, { timestamps: true });

commentSchema.pre("validate", function validateComment() {
  const isPostComment = Boolean(this.post);
  const isRevisionComment = Boolean(this.revisionId);

  if (!isPostComment && !isRevisionComment) {
    throw new Error("Comment must belong to either a post or a revision.");
  }

  if (isPostComment) {
    if (!this.user || !this.text) {
      throw new Error("Post comments require user, post, and text.");
    }
  }

  if (isRevisionComment) {
    if (!this.userId || !this.lineRef || !this.body) {
      throw new Error("Revision comments require userId, lineRef, and body.");
    }
  }
});

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ revisionId: 1, createdAt: -1 });

export default mongoose.model("Comment", commentSchema);
