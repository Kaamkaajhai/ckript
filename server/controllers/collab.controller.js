import mongoose from "mongoose";
import { diff_match_patch } from "diff-match-patch";
import { uploadToCloudinary } from "../config/cloudinary.js";
import Script from "../models/Script.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Comment from "../models/Comment.js";
import Revision from "../models/Revision.js";
import AuditLog from "../models/AuditLog.js";
import CollabRequest from "../models/CollabRequest.js";
import Branch from "../models/Branch.js";
import PullRequest from "../models/PullRequest.js";
import {
  COLLAB_ACCESS_LEVELS,
  getAcceptedCollaborator,
  getScriptOwnerId,
  hasScriptPermission,
  resolveCollaboratorAccessLevel,
  resolveScriptRole,
} from "../middleware/checkPermission.js";
import {
  generateInviteToken,
  getInviteExpiryDate,
  isInviteExpired,
} from "../utils/inviteToken.js";
import {
  createNotification,
  sendEmailNotification,
  sendInviteEmail,
} from "../utils/notify.js";
import {
  applyMergeDecisions,
  computeDiff,
} from "../utils/merge.js";
// Canonical screenplay PDF (same formatter the editor/viewer/export use) so a merged/reverted script
// renders identically everywhere — NOT the old flat generateScriptPdf (plain A4 text, no elements).
import { generateScreenplayPdf } from "../utils/screenplayPdf.js";
import { extractTextFromPdfUrl } from "../utils/pdfTextExtraction.js";
import { runScriptScoreGeneration } from "./aiController.js";

// Script.titlePage is a Mongoose Map — convert to a plain object (or null) for generateScreenplayPdf.
const titlePageToObject = (tp) => {
  if (!tp) return null;
  const obj = typeof tp.toObject === "function" ? tp.toObject() : (tp instanceof Map ? Object.fromEntries(tp) : tp);
  return obj && Object.keys(obj).length ? obj : null;
};

const VALID_COLLAB_ROLES = ["editor", "merger", "viewer", "full_admin"];
const REQUESTABLE_ROLES = ["editor", "merger", "viewer", "full_admin"];
const REVIEW_DECISIONS = ["approved", "rejected"];
const REQUEST_DECISIONS = ["accepted", "rejected"];
const PR_REVIEW_DECISIONS = ["approved", "rejected"];
const VALID_ACCESS_LEVELS = Object.values(COLLAB_ACCESS_LEVELS);
const dmp = new diff_match_patch();

const normalizeObjectId = (value) => String(value?._id || value?.id || value || "");

const getIo = (req) => req.app.get("io");

const getOwnerId = (script) => getScriptOwnerId(script);

const getScriptRoom = (scriptId) => `script:${scriptId}`;

const sanitizeMessage = (value, maxLength = 1500) => String(value || "").trim().slice(0, maxLength);
const sanitizeTitle = (value, maxLength = 200) => String(value || "").trim().slice(0, maxLength);
const stripHtmlToPlainText = (value = "") =>
  String(value || "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n\n")
    .replace(/<\s*p[^>]*>/gi, "")
    .replace(/<\s*\/div\s*>/gi, "\n")
    .replace(/<\s*div[^>]*>/gi, "")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
const normalizeAccessLevel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return VALID_ACCESS_LEVELS.includes(normalized) ? normalized : COLLAB_ACCESS_LEVELS.FULL_ACCESS;
};
const normalizeCollaboratorRoleInput = (value, fallback = "editor") => {
  const normalized = String(value || "").trim().toLowerCase();
  return VALID_COLLAB_ROLES.includes(normalized) ? normalized : fallback;
};
const COLLAB_ROLE_LABELS = {
  editor: "Editor",
  merger: "Merger",
  viewer: "Viewer",
  full_admin: "Admin",
};
const getCollabRoleLabel = (value) => COLLAB_ROLE_LABELS[normalizeCollaboratorRoleInput(value)] || "Editor";
const CONTENT_ONLY_SECTION_FIELDS = new Set(["textContent", "fullContent"]);
const FULL_ACCESS_SECTION_FIELDS = new Set(["textContent", "fullContent", "description", "synopsis", "logline"]);

const mapCollaboratorForResponse = (collaborator) => ({
  _id: collaborator?._id,
  role: collaborator?.role,
  accessLevel: collaborator?.accessLevel || COLLAB_ACCESS_LEVELS.FULL_ACCESS,
  invitedBy: collaborator?.invitedBy,
  status: collaborator?.status,
  joinedAt: collaborator?.joinedAt,
  isActive: collaborator?.isActive,
  inviteExpiresAt: collaborator?.inviteExpiresAt,
  user: collaborator?.userId && typeof collaborator.userId === "object"
    ? {
      _id: collaborator.userId._id,
      name: collaborator.userId.name,
      email: collaborator.userId.email,
      profileImage: collaborator.userId.profileImage || "",
    }
    : collaborator?.userId,
});

const createAuditEntry = async (scriptId, actorId, action, metadata = {}) =>
  AuditLog.create({
    scriptId,
    actorId,
    action,
    metadata,
  });

const emitNotification = (req, userId, event, payload) => {
  const io = getIo(req);
  if (!io || !userId) return;
  io.to(`notifications-${userId}`).emit(event, payload);
};

const emitScriptEvent = (req, scriptId, event, payload) => {
  const io = getIo(req);
  if (!io || !scriptId) return;
  io.to(getScriptRoom(scriptId)).emit(event, payload);
};

const emitCollabMembershipChanged = (req, {
  scriptId,
  actorId = null,
  targetUserIds = [],
  action = "",
  role = "",
} = {}) => {
  const uniqueUserIds = [...new Set(
    (Array.isArray(targetUserIds) ? targetUserIds : [])
      .map((value) => normalizeObjectId(value))
      .filter(Boolean)
  )];

  const payload = {
    scriptId: normalizeObjectId(scriptId),
    actorId: normalizeObjectId(actorId),
    targetUserIds: uniqueUserIds,
    action: String(action || "").trim(),
    role: String(role || "").trim(),
  };

  emitScriptEvent(req, scriptId, "collab_membership_changed", payload);
  uniqueUserIds.forEach((userId) => emitNotification(req, userId, "collab_membership_changed", payload));
};

const updateScriptSectionContent = (script, sectionRef, content) => {
  const normalizedSectionRef = String(sectionRef || "textContent").trim();
  const assignableFields = FULL_ACCESS_SECTION_FIELDS;

  if (assignableFields.has(normalizedSectionRef)) {
    script[normalizedSectionRef] = content;
    return normalizedSectionRef;
  }

  script.textContent = content;
  return "textContent";
};

const applyRevisionMerge = ({
  currentContent = "",
  baseContent = "",
  proposedContent = "",
}) => {
  const normalizedCurrent = String(currentContent || "");
  const normalizedBase = String(baseContent || "");
  const normalizedProposed = String(proposedContent || "");

  if (!normalizedBase) {
    return {
      mergedContent: normalizedProposed,
      merged: false,
      conflict: false,
      fallbackApplied: true,
    };
  }

  const patches = dmp.patch_make(normalizedBase, normalizedProposed);
  const [mergedContent, appliedFlags] = dmp.patch_apply(patches, normalizedCurrent);
  const conflict = Array.isArray(appliedFlags) && appliedFlags.some((flag) => flag !== true);

  return {
    mergedContent,
    merged: true,
    conflict,
    fallbackApplied: false,
  };
};

const getActiveEditors = async (script) => {
  const editorIds = (script.collaborators || [])
    .filter((collab) => collab.isActive && collab.status === "accepted" && collab.role === "editor")
    .map((collab) => collab.userId);

  if (!editorIds.length) return [];
  return User.find({ _id: { $in: editorIds } }).select("_id name email profileImage");
};

const getPrimaryScriptContent = (script) =>
  String(script?.fullContent || script?.textContent || "");

const ensureEditorBranch = async (script, userId) => {
  if (!script?._id || !userId) return null;

  const existingBranch = await Branch.findOne({
    scriptId: script._id,
    editorId: userId,
  });

  if (existingBranch) {
    return existingBranch;
  }

  const content = String(script?.textContent || "");
  return Branch.create({
    scriptId: script._id,
    editorId: userId,
    content,
    baseContent: content,
    updatedAt: new Date(),
  });
};

const createCollaboratorEntry = ({
  userId,
  role,
  accessLevel = COLLAB_ACCESS_LEVELS.FULL_ACCESS,
  invitedBy,
  status = "pending",
  inviteToken = null,
  inviteExpiresAt = null,
  joinedAt = null,
}) => ({
  userId,
  role,
  accessLevel,
  invitedBy,
  inviteToken,
  inviteExpiresAt,
  status,
  joinedAt,
  isActive: true,
});

const getCollaboratorRank = (entry) => {
  if (!entry) return -1;
  if (entry.isActive === true && entry.status === "accepted") return 4;
  if (entry.isActive === true && entry.status === "pending") return 3;
  if (entry.status === "accepted") return 2;
  if (entry.status === "pending") return 1;
  return 0;
};

const getCanonicalCollaboratorEntries = (entries = []) => {
  const bestByUserId = new Map();

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const userId = normalizeObjectId(entry?.userId);
    if (!userId) return;

    const current = bestByUserId.get(userId);
    if (!current || getCollaboratorRank(entry) >= getCollaboratorRank(current)) {
      bestByUserId.set(userId, entry);
    }
  });

  return [...bestByUserId.values()];
};

const findCurrentCollaboratorEntry = (script, userId) => {
  const collaboratorEntries = Array.isArray(script?.collaborators) ? script.collaborators : [];
  const targetUserId = normalizeObjectId(userId);

  return collaboratorEntries.find(
    (entry) =>
      normalizeObjectId(entry?.userId) === targetUserId
      && entry?.isActive === true
      && ["pending", "accepted"].includes(entry?.status)
  ) || collaboratorEntries.find(
    (entry) => normalizeObjectId(entry?.userId) === targetUserId
  ) || null;
};

export const inviteCollaborator = async (req, res) => {
  try {
    const script = req.script || await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    const role = normalizeCollaboratorRoleInput(req.body?.role, "editor");
    const accessLevel = normalizeAccessLevel(req.body?.accessLevel);

    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const invitedUser = await User.findOne({ email }).select("_id name email");
    if (!invitedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (normalizeObjectId(invitedUser._id) === normalizeObjectId(req.user._id)) {
      return res.status(400).json({ error: "You cannot invite yourself" });
    }

    const existingCollaborator = (script.collaborators || []).find(
      (collab) =>
        normalizeObjectId(collab.userId) === normalizeObjectId(invitedUser._id)
        && collab.isActive === true
        && ["pending", "accepted"].includes(collab.status)
    );

    if (existingCollaborator) {
      return res.status(409).json({ error: "User is already an active collaborator or has a pending invite" });
    }

    const inviteToken = generateInviteToken();
    const inviteExpiresAt = getInviteExpiryDate();

    script.collaborators.push(createCollaboratorEntry({
      userId: invitedUser._id,
      role,
      accessLevel,
      invitedBy: req.user._id,
      status: "pending",
      inviteToken,
      inviteExpiresAt,
    }));
    await script.save();

    let emailResult = { success: false, skipped: true };
    try {
      emailResult = await sendInviteEmail({
        to: invitedUser.email,
        recipientName: invitedUser.name,
        scriptTitle: script.title,
        token: inviteToken,
        role,
        message: sanitizeMessage(req.body?.message, 1000),
      });
    } catch (emailError) {
      console.error("inviteCollaborator email failed:", emailError.message);
    }

    await createNotification({
      userId: invitedUser._id,
      type: "collab_invite",
      from: req.user._id,
      script: script._id,
      message: `You were invited to collaborate on ${script.title} as ${role}.`,
    });

    emitNotification(req, invitedUser._id, "collab_invite", {
      scriptId: script._id,
      role,
      token: inviteToken,
    });

    await createAuditEntry(script._id, req.user._id, "invite_sent", {
      invitedUserId: invitedUser._id,
      role,
      emailSent: emailResult?.success === true,
      emailSkipped: emailResult?.skipped === true,
    });

    const emailUnavailable = emailResult?.success !== true;

    return res.status(200).json({
      message: emailUnavailable
        ? "Invite created successfully. Email delivery is unavailable, but the collaborator can still accept from their account."
        : "Invite sent successfully",
      emailSent: emailResult?.success === true,
    });
  } catch (error) {
    console.error("inviteCollaborator failed:", error.message);
    return res.status(500).json({ error: "Failed to send invite" });
  }
};

export const resendInvite = async (req, res) => {
  try {
    const script = req.script || await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    const collaborator = (script.collaborators || []).find(
      (entry) =>
        normalizeObjectId(entry.userId) === normalizeObjectId(req.params.userId)
        && entry.isActive === true
        && entry.status === "pending"
    );

    if (!collaborator) {
      return res.status(404).json({ error: "Pending invite not found" });
    }

    const invitedUser = await User.findById(collaborator.userId).select("_id name email");
    if (!invitedUser) {
      return res.status(404).json({ error: "Invited user not found" });
    }

    const inviteToken = generateInviteToken();
    const inviteExpiresAt = getInviteExpiryDate();
    collaborator.inviteToken = inviteToken;
    collaborator.inviteExpiresAt = inviteExpiresAt;
    await script.save();

    let emailResult = { success: false, skipped: true };
    try {
      emailResult = await sendInviteEmail({
        to: invitedUser.email,
        recipientName: invitedUser.name,
        scriptTitle: script.title,
        token: inviteToken,
        role: collaborator.role,
        message: sanitizeMessage(req.body?.message, 1000),
      });
    } catch (emailError) {
      console.error("resendInvite email failed:", emailError.message);
    }

    await createAuditEntry(script._id, req.user._id, "invite_resent", {
      invitedUserId: invitedUser._id,
      role: collaborator.role,
      emailSent: emailResult?.success === true,
      emailSkipped: emailResult?.skipped === true,
    });

    return res.status(200).json({
      message: emailResult?.success === true
        ? "Invite resent successfully"
        : "Invite refreshed successfully. Email delivery is unavailable, but the collaborator can still accept from their account.",
      emailSent: emailResult?.success === true,
    });
  } catch (error) {
    console.error("resendInvite failed:", error.message);
    return res.status(500).json({ error: "Failed to resend invite" });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token) {
      return res.status(400).json({ error: "Invite token is required" });
    }

    const script = await Script.findOne({ "collaborators.inviteToken": token })
      .select("title creator collaborators collabVisibility");

    if (!script) {
      return res.status(404).json({ error: "Invalid invite link" });
    }

    const collaborator = script.collaborators.find((entry) => entry.inviteToken === token);
    if (!collaborator) {
      return res.status(404).json({ error: "Invalid invite link" });
    }

    if (isInviteExpired(collaborator.inviteExpiresAt)) {
      return res.status(410).json({ error: "Invite link expired" });
    }

    if (collaborator.status !== "pending") {
      return res.status(409).json({ error: "Invite already used" });
    }

    if (normalizeObjectId(collaborator.userId) !== normalizeObjectId(req.user._id)) {
      return res.status(403).json({ error: "Wrong account" });
    }

    collaborator.status = "accepted";
    collaborator.joinedAt = new Date();
    collaborator.inviteToken = null;
    collaborator.inviteExpiresAt = null;
    collaborator.isActive = true;
    await script.save();

    if (collaborator.role === "editor") {
      await ensureEditorBranch(script, collaborator.userId);
    }

    await createAuditEntry(script._id, req.user._id, "invite_accepted", {
      role: collaborator.role,
    });

    await createNotification({
      userId: getOwnerId(script),
      type: "collab_update",
      from: req.user._id,
      script: script._id,
      message: `${req.user.name || "A collaborator"} accepted the invitation for ${script.title} as ${collaborator.role}.`,
    });

    emitCollabMembershipChanged(req, {
      scriptId: script._id,
      actorId: req.user._id,
      targetUserIds: [getOwnerId(script), collaborator.userId],
      action: "invite_accepted",
      role: collaborator.role,
    });

    emitScriptEvent(req, script._id, "user_joined", {
      userId: req.user._id,
      name: req.user.name,
      role: collaborator.role,
      cursor: null,
    });

    return res.status(200).json({
      message: "Invite accepted",
      script: {
        _id: script._id,
        title: script.title,
        collabVisibility: script.collabVisibility,
      },
      role: collaborator.role,
    });
  } catch (error) {
    console.error("acceptInvite failed:", error.message);
    return res.status(500).json({ error: "Failed to accept invite" });
  }
};

export const requestCollab = async (req, res) => {
  try {
    const script = await Script.findById(req.params.scriptId).select("title creator collabVisibility collaborators");
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    if (script.collabVisibility !== "open") {
      return res.status(403).json({ error: "Script not open for requests" });
    }

    if (normalizeObjectId(getOwnerId(script)) === normalizeObjectId(req.user._id)) {
      return res.status(400).json({ error: "You are the owner" });
    }

    const activeCollaborator = getAcceptedCollaborator(script, req.user._id);
    if (activeCollaborator) {
      return res.status(409).json({ error: "Already a collaborator" });
    }

    const requestedRole = String(req.body?.requestedRole || "").trim().toLowerCase();
    if (!REQUESTABLE_ROLES.includes(requestedRole)) {
      return res.status(400).json({ error: "Invalid requested role" });
    }

    const existingRequest = await CollabRequest.findOne({
      scriptId: script._id,
      requesterId: req.user._id,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(409).json({ error: "You already sent a request" });
    }

    const collabRequest = await CollabRequest.create({
      scriptId: script._id,
      requesterId: req.user._id,
      requestedRole,
      message: sanitizeMessage(req.body?.message, 1000),
    });
    const requestedRoleLabel = getCollabRoleLabel(requestedRole);

    await createNotification({
      userId: req.user._id,
      type: "collab_update",
      script: script._id,
      message: `Your collaboration request for ${script.title} was sent as ${requestedRoleLabel}.`,
    });

    emitNotification(req, req.user._id, "collab_request_sent", {
      requestId: collabRequest._id,
      scriptId: script._id,
      requestedRole,
    });

    let emailResult = { success: false, skipped: true };
    try {
      const owner = await User.findById(getOwnerId(script)).select("_id name email");
      if (owner) {
        await createNotification({
          userId: owner._id,
          type: "collab_request",
          from: req.user._id,
          script: script._id,
          message: `${req.user.name} requested ${requestedRoleLabel} access to ${script.title}.`,
        });

        emitNotification(req, owner._id, "collab_request", {
          requestId: collabRequest._id,
          scriptId: script._id,
          requestedRole,
        });

        emitScriptEvent(req, script._id, "collab_request", {
          requestId: collabRequest._id,
          scriptId: script._id,
          requesterId: normalizeObjectId(req.user._id),
          requestedRole,
        });

        try {
          emailResult = await sendEmailNotification({
            to: owner.email,
            subject: `New collaboration request for ${script.title}`,
            html: `<p>${req.user.name} requested <strong>${requestedRoleLabel}</strong> access to <strong>${script.title}</strong>.</p>`,
            text: `${req.user.name} requested ${requestedRoleLabel} access to ${script.title}.`,
          });
        } catch (emailError) {
          console.error("requestCollab email failed:", emailError.message);
        }
      }
    } catch (notifyError) {
      console.error("requestCollab notify failed:", notifyError.message);
    }

    try {
      await createAuditEntry(script._id, req.user._id, "request_sent", {
        requestId: collabRequest._id,
        requestedRole,
        emailSent: emailResult?.success === true,
        emailSkipped: emailResult?.skipped === true,
      });
    } catch (auditError) {
      console.error("requestCollab audit failed:", auditError.message);
    }

    return res.status(200).json({
      message: emailResult?.success === true
        ? "Request sent successfully"
        : "Request sent successfully. Email delivery is unavailable, but the writer will still see it in-app.",
      requestId: collabRequest._id,
      emailSent: emailResult?.success === true,
    });
  } catch (error) {
    console.error("requestCollab failed:", error.message);
    return res.status(500).json({ error: "Failed to send collaboration request" });
  }
};

export const respondToRequest = async (req, res) => {
  try {
    const decision = String(req.body?.decision || "").trim();
    if (!REQUEST_DECISIONS.includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }

    const script = req.script || await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    const collabRequest = await CollabRequest.findById(req.params.requestId).populate("requesterId", "_id name email");
    if (!collabRequest || normalizeObjectId(collabRequest.scriptId) !== normalizeObjectId(script._id)) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (collabRequest.status !== "pending") {
      return res.status(409).json({ error: "Request already processed" });
    }

    if (decision === "accepted") {
      const role = String(collabRequest.requestedRole || "").trim().toLowerCase();
      const accessLevel = normalizeAccessLevel(req.body?.accessLevel);
      if (!VALID_COLLAB_ROLES.includes(role)) {
        return res.status(400).json({ error: "Invalid collaborator role" });
      }
      const roleLabel = getCollabRoleLabel(role);

      const existingCollaborator = (script.collaborators || []).find(
        (collab) =>
          normalizeObjectId(collab.userId) === normalizeObjectId(collabRequest.requesterId?._id)
          && collab.isActive === true
          && collab.status === "accepted"
      );

      if (!existingCollaborator) {
        script.collaborators.push(createCollaboratorEntry({
          userId: collabRequest.requesterId._id,
          role,
          accessLevel,
          invitedBy: req.user._id,
          status: "accepted",
          joinedAt: new Date(),
        }));
        await script.save();
      }

      collabRequest.status = "accepted";
      collabRequest.respondedAt = new Date();
      await collabRequest.save();

      if (role === "editor") {
        await ensureEditorBranch(script, collabRequest.requesterId._id);
      }

      await createNotification({
        userId: collabRequest.requesterId._id,
        type: "collab_update",
        from: req.user._id,
        script: script._id,
        message: `${req.user.name || "The writer"} approved your collaboration request for ${script.title} as ${roleLabel}.`,
      });

      emitNotification(req, collabRequest.requesterId._id, "collab_request_responded", {
        requestId: collabRequest._id,
        scriptId: script._id,
        decision,
        role,
      });

      emitScriptEvent(req, script._id, "collab_request_responded", {
        requestId: collabRequest._id,
        scriptId: script._id,
        decision,
        role,
      });

      emitCollabMembershipChanged(req, {
        scriptId: script._id,
        actorId: req.user._id,
        targetUserIds: [collabRequest.requesterId._id, getOwnerId(script)],
        action: "request_accepted",
        role,
      });

      await createAuditEntry(script._id, req.user._id, "request_accepted", {
        requestId: collabRequest._id,
        requestedRole: collabRequest.requestedRole,
        assignedRole: role,
      });

      return res.status(200).json({ message: "Request accepted" });
    }

    collabRequest.status = "rejected";
    collabRequest.respondedAt = new Date();
    await collabRequest.save();

    await createNotification({
      userId: collabRequest.requesterId._id,
      type: "collab_update",
      from: req.user._id,
      script: script._id,
      message: `${req.user.name || "The writer"} rejected your collaboration request for ${script.title}.`,
    });

    emitNotification(req, collabRequest.requesterId._id, "collab_request_responded", {
      requestId: collabRequest._id,
      scriptId: script._id,
      decision,
    });

    emitScriptEvent(req, script._id, "collab_request_responded", {
      requestId: collabRequest._id,
      scriptId: script._id,
      decision,
    });

    await createAuditEntry(script._id, req.user._id, "request_rejected", {
      requestId: collabRequest._id,
      requestedRole: collabRequest.requestedRole,
      note: sanitizeMessage(req.body?.note, 1000),
    });

    return res.status(200).json({ message: "Request rejected" });
  } catch (error) {
    console.error("respondToRequest failed:", error.message);
    return res.status(500).json({ error: "Failed to respond to request" });
  }
};

export const getCollaborators = async (req, res) => {
  try {
    const script = await Script.findById(req.params.scriptId)
      .populate("collaborators.userId", "name email profileImage")
      .populate("collaborators.invitedBy", "name email");

    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    return res.status(200).json({
      ownerId: getOwnerId(script),
      collabVisibility: script.collabVisibility,
      collaborators: getCanonicalCollaboratorEntries(script.collaborators || []).map(mapCollaboratorForResponse),
    });
  } catch (error) {
    console.error("getCollaborators failed:", error.message);
    return res.status(500).json({ error: "Failed to load collaborators" });
  }
};

export const updateCollaboratorRole = async (req, res) => {
  try {
    const role = normalizeCollaboratorRoleInput(req.body?.role, "editor");
    const accessLevel = normalizeAccessLevel(req.body?.accessLevel);

    const script = req.script || await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    const collaborator = findCurrentCollaboratorEntry(script, req.params.userId);

    if (!collaborator) {
      return res.status(404).json({ error: "Collaborator not found" });
    }

    await Script.updateOne(
      {
        _id: script._id,
        collaborators: {
          $elemMatch: {
            userId: collaborator.userId,
            isActive: true,
            status: { $in: ["pending", "accepted"] },
          },
        },
      },
      {
        $set: {
          "collaborators.$[entry].role": role,
          "collaborators.$[entry].accessLevel": accessLevel,
        },
      },
      {
        arrayFilters: [
          {
            "entry.userId": collaborator.userId,
            "entry.isActive": true,
            "entry.status": { $in: ["pending", "accepted"] },
          },
        ],
      },
    );

    const updatedScript = await Script.findById(script._id)
      .populate("collaborators.userId", "name email profileImage");
    const updatedCollaborator = findCurrentCollaboratorEntry(updatedScript, collaborator.userId) || collaborator;

    try {
      await createNotification({
        userId: collaborator.userId,
        type: "collab_update",
        from: req.user._id,
        script: script._id,
        message: `Your collaboration access on ${script.title} is now ${accessLevel === COLLAB_ACCESS_LEVELS.CONTENT_ONLY ? "content only" : "full access"}.`,
      });

      emitNotification(req, collaborator.userId, "collab_role_changed", {
        scriptId: script._id,
        role,
        accessLevel,
      });

      emitCollabMembershipChanged(req, {
        scriptId: script._id,
        actorId: req.user._id,
        targetUserIds: [collaborator.userId, getOwnerId(script)],
        action: "role_changed",
        role,
      });

      await createAuditEntry(script._id, req.user._id, "role_changed", {
        targetUserId: collaborator.userId,
        role,
        accessLevel,
      });
    } catch (sideEffectError) {
      console.error("updateCollaboratorRole side-effect failed:", sideEffectError.message);
    }

    return res.status(200).json({
      message: "Collaborator access updated successfully",
      collaborator: mapCollaboratorForResponse(updatedCollaborator),
    });
  } catch (error) {
    console.error("updateCollaboratorRole failed:", error.message);
    return res.status(500).json({ error: error.message || "Failed to update collaborator role" });
  }
};

export const removeCollaborator = async (req, res) => {
  try {
    const script = req.script || await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    if (normalizeObjectId(req.params.userId) === normalizeObjectId(getOwnerId(script))) {
      return res.status(400).json({ error: "Owner cannot be removed from their own script" });
    }

    const collaborator = findCurrentCollaboratorEntry(script, req.params.userId);

    if (!collaborator) {
      return res.status(404).json({ error: "Collaborator not found" });
    }

    const nextStatus = collaborator.status === "pending" ? "rejected" : collaborator.status;

    await Script.updateOne(
      {
        _id: script._id,
        collaborators: {
          $elemMatch: {
            userId: collaborator.userId,
          },
        },
      },
      {
        $set: {
          "collaborators.$[entry].isActive": false,
          "collaborators.$[entry].status": nextStatus,
          "collaborators.$[entry].inviteToken": null,
          "collaborators.$[entry].inviteExpiresAt": null,
        },
      },
      {
        arrayFilters: [
          {
            "entry.userId": collaborator.userId,
            "entry.isActive": true,
            "entry.status": { $in: ["pending", "accepted"] },
          },
        ],
      },
    );

    emitScriptEvent(req, script._id, "collaborator_removed", { userId: normalizeObjectId(req.params.userId) });
    emitNotification(req, collaborator.userId, "collaborator_removed", { scriptId: script._id });
    emitCollabMembershipChanged(req, {
      scriptId: script._id,
      actorId: req.user._id,
      targetUserIds: [collaborator.userId, getOwnerId(script)],
      action: "collaborator_removed",
      role: collaborator.role,
    });

    await createNotification({
      userId: collaborator.userId,
      type: "collab_update",
      from: req.user._id,
      script: script._id,
      message: `Your collaboration access to ${script.title} was removed.`,
    });

    await createAuditEntry(script._id, req.user._id, "collaborator_removed", {
      targetUserId: collaborator.userId,
    });

    return res.status(200).json({ message: "Collaborator removed successfully" });
  } catch (error) {
    console.error("removeCollaborator failed:", error.message);
    return res.status(500).json({ error: "Failed to remove collaborator" });
  }
};

export const updateVisibility = async (req, res) => {
  try {
    const collabVisibility = String(req.body?.collabVisibility || "").trim();
    if (!["open", "private"].includes(collabVisibility)) {
      return res.status(400).json({ error: "Invalid collaboration visibility" });
    }

    const script = req.script || await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    script.collabVisibility = collabVisibility;
    await script.save();

    const targetUserIds = [
      getOwnerId(script),
      ...(Array.isArray(script.collaborators)
        ? script.collaborators
          .filter((entry) => entry?.isActive === true && entry?.status === "accepted")
          .map((entry) => entry?.userId)
        : []),
    ];

    emitCollabMembershipChanged(req, {
      scriptId: script._id,
      actorId: req.user._id,
      targetUserIds,
      action: "visibility_changed",
    });

    await createAuditEntry(script._id, req.user._id, "visibility_changed", {
      collabVisibility,
    });

    return res.status(200).json({
      message: "Collaboration visibility updated",
      collabVisibility: script.collabVisibility,
    });
  } catch (error) {
    console.error("updateVisibility failed:", error.message);
    return res.status(500).json({ error: "Failed to update visibility" });
  }
};

export const submitRevision = async (req, res) => {
  try {
    const script = req.script || await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    const content = String(req.body?.content || "");
    const baseContent = String(req.body?.baseContent || "");
    const sectionRef = String(req.body?.sectionRef || "").trim();
    if (!content.trim() || !sectionRef) {
      return res.status(400).json({ error: "Content and sectionRef are required" });
    }

    const accessLevel = resolveCollaboratorAccessLevel(script, req.user._id);
    const allowedSections = accessLevel === COLLAB_ACCESS_LEVELS.CONTENT_ONLY
      ? CONTENT_ONLY_SECTION_FIELDS
      : FULL_ACCESS_SECTION_FIELDS;
    if (!allowedSections.has(sectionRef)) {
      return res.status(403).json({
        error: accessLevel === COLLAB_ACCESS_LEVELS.CONTENT_ONLY
          ? "This collaborator can only edit script content."
          : "Invalid revision section.",
      });
    }

    let revision = null;
    let wasResubmitted = false;

    if (req.userRole === "editor") {
      const existingPending = await Revision.findOne({
        scriptId: script._id,
        authorId: req.user._id,
        status: "pending_review",
      });

      if (existingPending) {
        existingPending.baseContent = baseContent;
        existingPending.content = content;
        existingPending.sectionRef = sectionRef;
        existingPending.reviewNote = "";
        existingPending.reviewerId = null;
        existingPending.reviewedAt = null;
        await existingPending.save();
        revision = existingPending;
        wasResubmitted = true;
      }
    }

    if (!revision) {
      revision = await Revision.create({
        scriptId: script._id,
        authorId: req.user._id,
        baseContent,
        content,
        sectionRef,
        status: "pending_review",
      });
    }

    const owner = await User.findById(getOwnerId(script)).select("_id name email");
    const editors = await getActiveEditors(script);
    const recipients = [
      ...(owner ? [owner] : []),
      ...editors.filter((editor) => normalizeObjectId(editor._id) !== normalizeObjectId(req.user._id)),
    ];

    await Promise.all(recipients.map((recipient) =>
      createNotification({
        userId: recipient._id,
        type: "revision_update",
        from: req.user._id,
        script: script._id,
        message: `A revision for ${script.title} is ready for review.`,
      })
    ));

    emitScriptEvent(req, script._id, "revision_submitted", { revisionId: revision._id });

    await createAuditEntry(script._id, req.user._id, wasResubmitted ? "revision_resubmitted" : "revision_submitted", {
      revisionId: revision._id,
      sectionRef,
    });

    return res.status(wasResubmitted ? 200 : 201).json({
      message: wasResubmitted ? "Pending revision updated for review" : "Revision submitted for review",
      revision,
      updatedExisting: wasResubmitted,
    });
  } catch (error) {
    console.error("submitRevision failed:", error.message);
    return res.status(500).json({ error: "Failed to submit revision" });
  }
};

export const reviewRevision = async (req, res) => {
  try {
    const decision = String(req.body?.decision || "").trim();
    if (!REVIEW_DECISIONS.includes(decision)) {
      return res.status(400).json({ error: "Invalid review decision" });
    }

    const note = sanitizeMessage(req.body?.note, 1000);
    if (decision === "rejected" && !note) {
      return res.status(400).json({ error: "Rejection note is required" });
    }

    const script = req.script || await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    const revision = await Revision.findById(req.params.revisionId).populate("authorId", "_id name email");
    if (!revision || normalizeObjectId(revision.scriptId) !== normalizeObjectId(script._id)) {
      return res.status(404).json({ error: "Revision not found" });
    }

    if (normalizeObjectId(revision.authorId?._id) === normalizeObjectId(req.user._id)) {
      return res.status(403).json({ error: "You cannot approve your own revision" });
    }

    if (decision === "approved") {
      if (!String(revision.baseContent || "") && ["textContent", "fullContent"].includes(String(revision.sectionRef || "").trim())) {
        return res.status(409).json({
          error: "This revision was created before merge support and cannot be approved safely. Please ask the collaborator to resubmit it.",
        });
      }

      const currentSectionContent = String(script?.[revision.sectionRef] || "");
      const mergeResult = applyRevisionMerge({
        currentContent: currentSectionContent,
        baseContent: revision.baseContent,
        proposedContent: revision.content,
      });

      if (mergeResult.conflict) {
        return res.status(409).json({
          error: "This revision could not be auto-merged because the script changed after submission.",
        });
      }

      const appliedField = updateScriptSectionContent(script, revision.sectionRef, mergeResult.mergedContent);
      await script.save();
      revision.status = "approved";
      revision.reviewerId = req.user._id;
      revision.reviewNote = note;
      revision.reviewedAt = new Date();
      await revision.save();

      emitScriptEvent(req, script._id, "revision_reviewed", {
        revisionId: revision._id,
        decision,
      });

      await createAuditEntry(script._id, req.user._id, "revision_approved", {
        revisionId: revision._id,
        sectionRef: revision.sectionRef,
        appliedField,
        merged: mergeResult.merged,
        fallbackApplied: mergeResult.fallbackApplied,
      });
    } else {
      revision.status = "rejected";
      revision.reviewerId = req.user._id;
      revision.reviewNote = note;
      revision.reviewedAt = new Date();
      await revision.save();

      emitScriptEvent(req, script._id, "revision_reviewed", {
        revisionId: revision._id,
        decision,
      });

      await createAuditEntry(script._id, req.user._id, "revision_rejected", {
        revisionId: revision._id,
        sectionRef: revision.sectionRef,
        note,
      });
    }

    await createNotification({
      userId: revision.authorId._id,
      type: "revision_update",
      from: req.user._id,
      script: script._id,
      message: `Your revision for ${script.title} was ${decision}.`,
    });

    emitNotification(req, revision.authorId._id, "revision_reviewed", {
      revisionId: revision._id,
      decision,
      scriptId: script._id,
    });

    return res.status(200).json({ message: `Revision ${decision}` });
  } catch (error) {
    console.error("reviewRevision failed:", error.message);
    return res.status(500).json({ error: "Failed to review revision" });
  }
};

export const getRevisions = async (req, res) => {
  try {
    const revisions = await Revision.find({ scriptId: req.params.scriptId })
      .sort({ createdAt: -1 })
      .populate("authorId", "name email profileImage")
      .populate("reviewerId", "name email profileImage");

    return res.status(200).json({ revisions });
  } catch (error) {
    console.error("getRevisions failed:", error.message);
    return res.status(500).json({ error: "Failed to load revisions" });
  }
};

export const createRevisionComment = async (req, res) => {
  try {
    const revision = await Revision.findById(req.params.revisionId);
    if (!revision || normalizeObjectId(revision.scriptId) !== normalizeObjectId(req.params.scriptId)) {
      return res.status(404).json({ error: "Revision not found" });
    }

    const lineRef = String(req.body?.lineRef || "").trim();
    const body = sanitizeMessage(req.body?.body, 3000);
    if (!lineRef || !body) {
      return res.status(400).json({ error: "lineRef and body are required" });
    }

    const comment = await Comment.create({
      revisionId: revision._id,
      userId: req.user._id,
      lineRef,
      body,
      resolved: false,
    });

    await createAuditEntry(req.params.scriptId, req.user._id, "comment_added", {
      revisionId: revision._id,
      commentId: comment._id,
      lineRef,
    });

    return res.status(201).json({ comment });
  } catch (error) {
    console.error("createRevisionComment failed:", error.message);
    return res.status(500).json({ error: "Failed to create comment" });
  }
};

export const resolveComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment?.revisionId) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const revision = await Revision.findById(comment.revisionId);
    if (!revision) {
      return res.status(404).json({ error: "Revision not found" });
    }

    const script = await Script.findById(revision.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    const isOwner = normalizeObjectId(getOwnerId(script)) === normalizeObjectId(req.user._id);
    const isAuthor = normalizeObjectId(comment.userId) === normalizeObjectId(req.user._id);
    if (!isOwner && !isAuthor) {
      return res.status(403).json({ error: "Only the comment author or owner can resolve this comment" });
    }

    comment.resolved = true;
    await comment.save();

    await createAuditEntry(script._id, req.user._id, "comment_resolved", {
      commentId: comment._id,
      revisionId: revision._id,
    });

    return res.status(200).json({ message: "Comment resolved" });
  } catch (error) {
    console.error("resolveComment failed:", error.message);
    return res.status(500).json({ error: "Failed to resolve comment" });
  }
};

export const publishScript = async (req, res) => {
  try {
    const script = req.script || await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    script.status = "published";
    script.publishedAt = new Date();

    if (!script.isFeatured) {
      const creatorUser = await User.findById(script.creator).select("subscription");
      if (creatorUser?.subscription?.plan === "gold") {
        script.isFeatured = true;
      }
    }
    await script.save();

    // Automatically trigger AI Evaluation after publishing
    if (!script.evaluationStatus || script.evaluationStatus === "requested") {
      script.evaluationStatus = "requested";
      script.evaluationRequestedAt = new Date();
      await script.save();
      
      setImmediate(async () => {
        try {
          await runScriptScoreGeneration({ scriptId: script._id, userId: script.creator });
        } catch (err) {
          console.error("[Auto-AI Evaluation] Failed to generate score for script:", script._id, err);
        }
      });
    }

    const collaboratorIds = (script.collaborators || [])
      .filter((collab) => collab.isActive && collab.status === "accepted")
      .map((collab) => collab.userId);

    await Promise.all(collaboratorIds.map((userId) =>
      createNotification({
        userId,
        type: "collab_update",
        from: req.user._id,
        script: script._id,
        message: `${script.title} has been published.`,
      })
    ));

    await createAuditEntry(script._id, req.user._id, "published", {});

    return res.status(200).json({ message: "Script published successfully" });
  } catch (error) {
    console.error("publishScript failed:", error.message);
    return res.status(500).json({ error: "Failed to publish script" });
  }
};

export const getActivityLog = async (req, res) => {
  try {
    const entries = await AuditLog.find({ scriptId: req.params.scriptId })
      .sort({ createdAt: -1 })
      .populate("actorId", "name profileImage");

    return res.status(200).json({ activity: entries });
  } catch (error) {
    console.error("getActivityLog failed:", error.message);
    return res.status(500).json({ error: "Failed to load activity log" });
  }
};

export const getCollabRequestsInbox = async (req, res) => {
  try {
    const ownedScripts = await Script.find({ creator: req.user._id }).select("_id title");
    const scriptIds = ownedScripts.map((script) => script._id);
    const scriptTitleMap = new Map(ownedScripts.map((script) => [normalizeObjectId(script._id), script.title]));

    const requests = await CollabRequest.find({
      scriptId: { $in: scriptIds },
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .populate("requesterId", "name email profileImage")
      .lean();

    return res.status(200).json({
      requests: requests.map((request) => ({
        ...request,
        scriptTitle: scriptTitleMap.get(normalizeObjectId(request.scriptId)) || "Untitled Script",
      })),
    });
  } catch (error) {
    console.error("getCollabRequestsInbox failed:", error.message);
    return res.status(500).json({ error: "Failed to load collaboration requests" });
  }
};

export const getScriptRequests = async (req, res) => {
  try {
    const requests = await CollabRequest.find({ scriptId: req.params.scriptId })
      .sort({ createdAt: -1 })
      .populate("requesterId", "name email profileImage")
      .lean();

    return res.status(200).json({
      requests,
    });
  } catch (error) {
    console.error("getScriptRequests failed:", error.message);
    return res.status(500).json({ error: "Failed to load collaboration requests" });
  }
};

export const getScriptAccessSummary = async (scriptId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(scriptId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return { allowed: false, role: null, accessLevel: null, script: null };
  }

  const script = await Script.findById(scriptId)
    .populate("creator", "name username writerProfile.username")
    .populate("collaborators.userId", "name username writerProfile.username");
  if (!script) {
    return { allowed: false, role: null, accessLevel: null, script: null };
  }

  const role = resolveScriptRole(script, userId);
  const accessLevel = resolveCollaboratorAccessLevel(script, userId);
  return {
    allowed: Boolean(role),
    role,
    accessLevel,
    script,
  };
};

export const canWriteToScript = async (scriptId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(scriptId) || !mongoose.Types.ObjectId.isValid(userId)) {
    return false;
  }

  const script = await Script.findById(scriptId);
  return hasScriptPermission(script, userId, "write");
};

export const getBranch = async (req, res) => {
  try {
    let branch = await Branch.findOne({
      scriptId: req.params.scriptId,
      editorId: req.user.id,
    });

    if (!branch) {
      if (req.userRole !== "editor") {
        return res.status(404).json({ error: "No branch found" });
      }
      
      // Branch missing for an editor — lazily create it from the current script content
      // so BranchEditor never 404s on a legitimately accepted editor.
      const script = req.script || await Script.findById(req.params.scriptId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }
      branch = await ensureEditorBranch(script, req.user.id);
      if (!branch) {
        return res.status(404).json({ error: "Could not create branch" });
      }
    }

    return res.status(200).json({ branch });
  } catch (error) {
    console.error("getBranch failed:", error.message);
    return res.status(500).json({ error: "Failed to load branch" });
  }
};

export const saveBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      scriptId: req.params.scriptId,
      editorId: req.user.id,
    });

    if (!branch) {
      return res.status(404).json({ error: "No branch found" });
    }

    branch.content = String(req.body?.content || "");
    branch.updatedAt = new Date();
    await branch.save();

    return res.status(200).json({
      message: "Branch updated successfully",
      branch,
    });
  } catch (error) {
    console.error("saveBranch failed:", error.message);
    return res.status(500).json({ error: "Failed to save branch" });
  }
};

export const raisePR = async (req, res) => {
  try {
    const title = sanitizeTitle(req.body?.title, 200);
    const message = sanitizeMessage(req.body?.message, 3000);
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const branch = await Branch.findOne({
      scriptId: req.params.scriptId,
      editorId: req.user.id,
    });

    if (!branch) {
      return res.status(400).json({ error: "No branch found. You need a branch first." });
    }

    const script = req.script || await Script.findById(req.params.scriptId).select("creator collaborators title");

    const existingOpenPr = await PullRequest.findOne({
      scriptId: req.params.scriptId,
      authorId: req.user.id,
      status: "open",
    });

    if (existingOpenPr) {
      existingOpenPr.title = title;
      existingOpenPr.message = message;
      existingOpenPr.branchId = branch._id;
      existingOpenPr.mergeDecisions = [];
      existingOpenPr.updatedAt = new Date();
      await existingOpenPr.save();

      emitScriptEvent(req, req.params.scriptId, "pr_updated", {
        prId: existingOpenPr._id,
        authorName: req.user.name || "Collaborator",
      });

      await createAuditEntry(req.params.scriptId, req.user._id, "pr_updated", {
        prId: existingOpenPr._id,
        branchId: branch._id,
        title,
      });

      return res.status(200).json({
        message: "Your open pull request was updated (same PR; reviewers see your latest branch)",
        pr: existingOpenPr,
      });
    }

    const pr = await PullRequest.create({
      scriptId: req.params.scriptId,
      branchId: branch._id,
      authorId: req.user.id,
      title,
      message,
    });

    emitScriptEvent(req, req.params.scriptId, "pr_raised", {
      prId: pr._id,
      authorName: req.user.name || "Collaborator",
    });

    const targetUserIds = [
      normalizeObjectId(script?.creator),
      ...((script?.collaborators || [])
        .filter((entry) => entry?.isActive === true && entry?.status === "accepted" && entry?.role === "merger")
        .map((entry) => normalizeObjectId(entry?.userId))),
    ].filter(Boolean);

    const uniqueTargetUserIds = [...new Set(targetUserIds)];

    await Promise.all(uniqueTargetUserIds.map((userId) => createNotification({
      userId,
      type: "collab_update",
      from: req.user._id,
      script: req.params.scriptId,
      message: `${req.user.name || "A collaborator"} raised a pull request on ${script?.title || "this script"}.`,
    })));

    uniqueTargetUserIds.forEach((userId) => emitNotification(req, userId, "pr_raised", {
      prId: pr._id,
      scriptId: req.params.scriptId,
      authorName: req.user.name || "Collaborator",
    }));

    await createAuditEntry(req.params.scriptId, req.user._id, "pr_raised", {
      prId: pr._id,
      branchId: branch._id,
      title,
    });

    return res.status(201).json({
      message: "Pull request raised successfully",
      pr,
    });
  } catch (error) {
    console.error("raisePR failed:", error.message);
    return res.status(500).json({ error: "Failed to raise pull request" });
  }
};

export const getPRs = async (req, res) => {
  try {
    const prs = await PullRequest.find({ scriptId: req.params.scriptId })
      .sort({ createdAt: 1 })
      .populate("authorId", "name profileImage")
      .populate("reviewerId", "name profileImage");

    return res.status(200).json({ prs });
  } catch (error) {
    console.error("getPRs failed:", error.message);
    return res.status(500).json({ error: "Failed to load pull requests" });
  }
};

export const getDiff = async (req, res) => {
  try {
    const pr = await PullRequest.findById(req.params.prId).populate("authorId", "name profileImage");
    if (!pr || normalizeObjectId(pr.scriptId) !== normalizeObjectId(req.params.scriptId)) {
      return res.status(404).json({ error: "Pull request not found" });
    }

    const [branch, script] = await Promise.all([
      Branch.findById(pr.branchId),
      Script.findById(req.params.scriptId).select("fullContent textContent"),
    ]);

    if (!branch || !script) {
      return res.status(404).json({ error: "Pull request diff unavailable" });
    }

    // Strip HTML so the client receives clean plain-text for line-level diffing.
    const mainContent = stripHtmlToPlainText(String(script.fullContent || script.textContent || ""));
    const branchContent = stripHtmlToPlainText(String(branch.content || ""));

    return res.status(200).json({
      mainContent,
      branchContent,
      prId: pr._id,
      authorName: pr.authorId?.name || "Unknown",
      title: pr.title,
      isOutdated: Boolean(branch.isOutdated),
    });
  } catch (error) {
    console.error("getDiff failed:", error.message);
    return res.status(500).json({ error: "Failed to load pull request diff" });
  }
};

export const reviewPR = async (req, res) => {
  try {
    const decision = String(req.body?.decision || "").trim();
    if (!PR_REVIEW_DECISIONS.includes(decision)) {
      return res.status(400).json({ error: "Invalid review decision" });
    }

    const note = sanitizeMessage(req.body?.note, 3000);
    const mergeDecisions = Array.isArray(req.body?.mergeDecisions) ? req.body.mergeDecisions : [];

    const pr = await PullRequest.findById(req.params.prId).populate("authorId", "_id name email profileImage");
    if (!pr || normalizeObjectId(pr.scriptId) !== normalizeObjectId(req.params.scriptId)) {
      return res.status(404).json({ error: "Pull request not found" });
    }

    if (pr.status !== "open") {
      return res.status(409).json({ error: "Pull request already reviewed" });
    }

    if (decision === "rejected") {
      if (!note) {
        return res.status(400).json({ error: "Rejection note is required" });
      }

      pr.status = "rejected";
      pr.reviewNote = note;
      pr.reviewerId = req.user._id;
      pr.reviewedAt = new Date();
      await pr.save();

      emitScriptEvent(req, req.params.scriptId, "pr_rejected", {
        prId: pr._id,
        note,
      });

      await createNotification({
        userId: pr.authorId?._id,
        type: "collab_update",
        from: req.user._id,
        script: req.params.scriptId,
        message: `Your PR was rejected.`,
      });

      emitNotification(req, pr.authorId?._id, "pr_rejected", {
        prId: pr._id,
        note,
        scriptId: req.params.scriptId,
      });

      await createAuditEntry(req.params.scriptId, req.user._id, "pr_rejected", {
        prId: pr._id,
        note,
      });

      return res.status(200).json({ message: "Pull request rejected" });
    }

    if (normalizeObjectId(pr.authorId?._id) === normalizeObjectId(req.user.id)) {
      return res.status(403).json({ error: "Cannot approve your own PR" });
    }

    const [script, branch] = await Promise.all([
      Script.findById(req.params.scriptId),
      Branch.findById(pr.branchId),
    ]);

    if (!script || !branch) {
      return res.status(404).json({ error: "Pull request merge source not found" });
    }

    const mainContent = getPrimaryScriptContent(script);
    const branchContent = String(branch.content || "");
    const prMergeDecisions = mergeDecisions.length
      ? mergeDecisions
      : (Array.isArray(pr.mergeDecisions) ? pr.mergeDecisions : []);
    const now = new Date();

    script.history.push({
      content: mainContent,
      savedAt: now,
      savedBy: req.user.id,
      prId: pr._id,
    });

    // If the client sent a pre-resolved mergedContent (from per-block conflict resolution),
    // use it directly. Otherwise fall back to server-side applyMergeDecisions.
    const clientMergedContent = req.body?.mergedContent ? String(req.body.mergedContent) : null;
    const mergedContent = clientMergedContent ?? applyMergeDecisions(
      stripHtmlToPlainText(mainContent),
      stripHtmlToPlainText(branchContent),
      prMergeDecisions
    );

    script.textContent = mergedContent;
    script.fullContent = mergedContent;
    script.status = "pending_approval";
    script.adminApproved = false;

    // Mark all other branches for this script as outdated so their editors
    // are warned that the main content has advanced past their base.
    const otherBranches = await Branch.find({
      scriptId: req.params.scriptId,
      _id: { $ne: branch._id },
    });
    await Promise.all(
      otherBranches.map((b) => {
        b.baseContent = mergedContent;
        b.isOutdated = true;
        return b.save();
      })
    );

    const pdfBuffer = await generateScreenplayPdf(mergedContent, {
      title: script.title,
      author: script.companyName || "",
      titlePage: titlePageToObject(script.titlePage),
    });
    const pdfUpload = await uploadToCloudinary(pdfBuffer, {
      folder: "scripts",
      resource_type: "raw",
      format: "pdf",
      public_id: `script-${normalizeObjectId(script._id)}-${Date.now()}`,
      originalFilename: `script-${normalizeObjectId(script._id)}.pdf`,
      mimeType: "application/pdf",
    });

    if (!pdfUpload?.secure_url) {
      throw new Error("Cloudinary upload did not return a secure URL");
    }

    script.fileUrl = pdfUpload.secure_url;
    await script.save();

    await Branch.deleteOne({ _id: branch._id });

    pr.status = "approved";
    pr.reviewerId = req.user._id;
    pr.reviewedAt = now;
    pr.reviewNote = note;
    pr.mergeDecisions = prMergeDecisions;
    await pr.save();

    const io = req.app.get("io");
    if (io) {
      io.to(getScriptRoom(req.params.scriptId)).emit("pr_merged", {
        scriptId: normalizeObjectId(script._id),
        newContent: mergedContent,
        fileUrl: script.fileUrl || "",
      });
    }

    await createNotification({
      userId: pr.authorId?._id,
      type: "collab_update",
      from: req.user._id,
      script: req.params.scriptId,
      message: "Your PR was merged and the script PDF was updated.",
    });

    emitNotification(req, pr.authorId?._id, "pr_merged", {
      prId: pr._id,
      scriptId: req.params.scriptId,
      newContent: mergedContent,
      fileUrl: script.fileUrl || "",
    });

    await createAuditEntry(req.params.scriptId, req.user._id, "pr_approved", {
      prId: pr._id,
      branchId: branch._id,
      mergeDecisions: prMergeDecisions,
      fileUrl: script.fileUrl || "",
    });

    return res.status(200).json({
      message: "Pull request approved and merged",
      mergedContent,
      fileUrl: script.fileUrl || "",
    });
  } catch (error) {
    console.error("reviewPR failed:", error.message);
    return res.status(500).json({ error: "Failed to review pull request" });
  }
};

export const revertPR = async (req, res) => {
  try {
    const { scriptId, prId } = req.params;

    const [script, pr] = await Promise.all([
      Script.findById(scriptId),
      PullRequest.findById(prId),
    ]);

    if (!script || !pr) {
      return res.status(404).json({ error: "Script or Pull Request not found" });
    }

    if (pr.status !== "approved") {
      return res.status(400).json({ error: "Only approved Pull Requests can be reverted" });
    }

    // Check if it's the last merged PR
    if (!script.history || script.history.length === 0) {
      return res.status(400).json({ error: "Script has no history to revert" });
    }

    const lastHistory = script.history[script.history.length - 1];
    if (String(lastHistory.prId) !== String(pr._id)) {
      return res.status(400).json({ error: "Can only revert the most recently merged Pull Request" });
    }

    // Pop history and restore content
    const backupContent = lastHistory.content;
    script.history.pop();
    script.textContent = backupContent;
    script.fullContent = backupContent;
    
    // Regenerate PDF
    let fileUrl = script.fileUrl;
    try {
      const pdfBuffer = await generateScreenplayPdf(backupContent, {
        title: script.title,
        author: script.companyName || "",
        titlePage: titlePageToObject(script.titlePage),
      });
      const pdfUpload = await uploadToCloudinary(pdfBuffer, {
        folder: "scripts",
        resource_type: "raw",
        format: "pdf",
        public_id: `script-${scriptId}-${Date.now()}`,
        originalFilename: `script-${scriptId}.pdf`,
        mimeType: "application/pdf",
      });
      if (pdfUpload?.secure_url) {
        fileUrl = pdfUpload.secure_url;
      }
    } catch (pdfErr) {
      console.warn("Failed to generate PDF on revert:", pdfErr.message);
    }
    
    script.fileUrl = fileUrl;
    await script.save();

    // Update PR status
    pr.status = "rejected";
    pr.reviewNote = "This Pull Request was reverted by the merger.";
    await pr.save();

    // Notify author
    await createNotification({
      userId: pr.authorId,
      type: "collab_update",
      from: req.user._id,
      script: scriptId,
      message: "Your previously merged PR was reverted.",
    });

    emitNotification(req, pr.authorId, "pr_reverted", {
      prId: pr._id,
      scriptId,
    });

    await createAuditEntry(scriptId, req.user._id, "pr_reverted", {
      prId: pr._id,
    });

    const io = getIo(req);
    if (io) {
      io.to(getScriptRoom(scriptId)).emit("pr_reverted", {
        prId: pr._id,
        scriptId,
        newContent: backupContent,
        fileUrl,
      });
    }

    return res.status(200).json({
      message: "Pull request reverted successfully",
      revertedContent: backupContent,
      fileUrl,
    });
  } catch (error) {
    console.error("revertPR failed:", error.message);
    return res.status(500).json({ error: "Failed to revert pull request" });
  }
};
