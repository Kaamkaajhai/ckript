import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  chatId: { type: String, required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, default: "" },
  script: { type: mongoose.Schema.Types.ObjectId, ref: "Script" },
  fileUrl: { type: String },
  fileType: { type: String, enum: ["image", "document", "audio", "video"] },
  fileName: { type: String },
  fileSize: { type: Number },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  deleted: { type: Boolean, default: false },
  reactions: [reactionSchema],
}, { timestamps: true });

messageSchema.index({ chatId: 1, createdAt: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
