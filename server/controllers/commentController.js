import mongoose from "mongoose";
import ScriptComment from "../models/ScriptComment.js";
import Script from "../models/Script.js";
import { hasScriptPermission, resolveScriptRole } from "../middleware/checkPermission.js";

const broadcast = (req, scriptId) => {
  const io = req.app.get("io");
  io?.to(`scene:script:${scriptId}`).emit("scene:comment:change", { scriptId: String(scriptId) });
};

const serialize = (c) => ({
  _id: c._id,
  scriptId: c.scriptId,
  anchor: c.anchor,
  authorId: c.authorId,
  authorName: c.authorName,
  body: c.body,
  resolved: c.resolved,
  parentId: c.parentId,
  createdAt: c.createdAt,
});

const loadScript = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Script.findById(id).select("creator collaborators");
};

// GET /scripts/:id/comments — anyone who can read the script.
export const listComments = async (req, res) => {
  try {
    const script = await loadScript(req.params.id);
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (!hasScriptPermission(script, req.user._id, "read")) {
      return res.status(403).json({ message: "Not authorized to view comments." });
    }
    const comments = await ScriptComment.find({ scriptId: req.params.id }).sort({ createdAt: 1 }).lean();
    return res.json(comments.map(serialize));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load comments." });
  }
};

// POST /scripts/:id/comments — requires "comment" permission (commenter/editor/merger/owner; NOT viewer).
export const createComment = async (req, res) => {
  try {
    const script = await loadScript(req.params.id);
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (!hasScriptPermission(script, req.user._id, "comment")) {
      return res.status(403).json({ message: "You don't have permission to comment on this script." });
    }

    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ message: "Comment body is required." });

    const anchorIn = req.body?.anchor || {};
    const parentId = req.body?.parentId && mongoose.Types.ObjectId.isValid(req.body.parentId)
      ? req.body.parentId
      : null;

    const comment = await ScriptComment.create({
      scriptId: req.params.id,
      anchor: {
        sceneId: String(anchorIn.sceneId || ""),
        sceneOffset: Number(anchorIn.sceneOffset) || 0,
        length: Number(anchorIn.length) || 0,
        quote: String(anchorIn.quote || "").slice(0, 1000),
      },
      authorId: req.user._id,
      authorName: req.user.name || req.user.writerProfile?.username || "Collaborator",
      body,
      parentId,
    });

    broadcast(req, req.params.id);
    return res.status(201).json(serialize(comment));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to add comment." });
  }
};

// PATCH /scripts/:id/comments/:commentId — resolve/unresolve or edit body (author or owner).
export const updateComment = async (req, res) => {
  try {
    const script = await loadScript(req.params.id);
    if (!script) return res.status(404).json({ message: "Script not found" });

    const comment = await ScriptComment.findOne({ _id: req.params.commentId, scriptId: req.params.id });
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isAuthor = String(comment.authorId) === req.user._id.toString();
    const isOwnerOrAdmin = String(script.creator) === req.user._id.toString()
      || resolveScriptRole(script, req.user._id) === "full_admin";
    // Resolving is a review action — author, owner, or any commenter-capable collaborator.
    const canResolve = isAuthor || isOwnerOrAdmin || hasScriptPermission(script, req.user._id, "comment");

    if (req.body?.resolved !== undefined) {
      if (!canResolve) return res.status(403).json({ message: "Not authorized." });
      comment.resolved = Boolean(req.body.resolved);
    }
    if (req.body?.body !== undefined) {
      if (!isAuthor) return res.status(403).json({ message: "Only the author can edit this comment." });
      comment.body = String(req.body.body).trim().slice(0, 4000);
    }

    await comment.save();
    broadcast(req, req.params.id);
    return res.json(serialize(comment));
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update comment." });
  }
};

// DELETE /scripts/:id/comments/:commentId — author or owner. Also removes its replies.
export const deleteComment = async (req, res) => {
  try {
    const script = await loadScript(req.params.id);
    if (!script) return res.status(404).json({ message: "Script not found" });

    const comment = await ScriptComment.findOne({ _id: req.params.commentId, scriptId: req.params.id });
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isAuthor = String(comment.authorId) === req.user._id.toString();
    const isOwnerOrAdmin = String(script.creator) === req.user._id.toString()
      || resolveScriptRole(script, req.user._id) === "full_admin";
    if (!isAuthor && !isOwnerOrAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this comment." });
    }

    await ScriptComment.deleteMany({ scriptId: req.params.id, $or: [{ _id: comment._id }, { parentId: comment._id }] });
    broadcast(req, req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete comment." });
  }
};
