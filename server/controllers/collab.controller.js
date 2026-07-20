import mongoose from "mongoose";
import { diff_match_patch } from "diff-match-patch";
import { applyThreeWayMerge } from "../utils/contentMerge.js";
import { addWriterCredit } from "../utils/writerCredits.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import Script from "../models/Script.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Comment from "../models/Comment.js";
import AuditLog from "../models/AuditLog.js";
import CollabRequest from "../models/CollabRequest.js";
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

// `commenter` is a first-class role in the Script schema enum and in PERMISSIONS (it grants the
// `comment` tier without `write`), but it was missing here — and normalizeCollaboratorRoleInput
// falls back to "editor" for anything unlisted. Inviting someone as a Commenter therefore granted
// them full write access instead. Listed for invites; requests stay on the narrower set because
// CollabRequest has its own enum that does not include it.
const VALID_COLLAB_ROLES = ["editor", "viewer", "full_admin", "commenter"];
const REQUESTABLE_ROLES = ["editor", "viewer", "full_admin"];
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
  editor: "Co-writer",
  commenter: "Commenter",
  viewer: "Reader",
  full_admin: "Co-owner",
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


// Shared with saveDraft's duet merge — see utils/contentMerge.js. Kept as an alias so the existing
// revision-review call sites read unchanged.
const applyRevisionMerge = applyThreeWayMerge;


const getPrimaryScriptContent = (script) =>
  String(script?.fullContent || script?.textContent || "");


const createCollaboratorEntry = ({
  userId,
  invitedEmail,
  role,
  accessLevel = COLLAB_ACCESS_LEVELS.FULL_ACCESS,
  invitedBy,
  status = "pending",
  inviteToken = null,
  inviteExpiresAt = null,
  joinedAt = null,
}) => ({
  userId,
  invitedEmail,
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

    const invitedUser = await User.findOne({ email }).select("_id name email role");

    if (invitedUser && normalizeObjectId(invitedUser._id) === normalizeObjectId(req.user._id)) {
      return res.status(400).json({ error: "You cannot invite yourself" });
    }

    const industryRoles = ["investor", "producer", "director", "actor", "industry", "professional"];
    if (invitedUser && industryRoles.includes(invitedUser.role)) {
      return res.status(403).json({ 
        error: "🎬 This account belongs to a Film Industry Professional. You can only invite fellow writers to collaborate on scripts." 
      });
    }

    const existingCollaborator = (script.collaborators || []).find(
      (collab) => {
        const isSameUser = invitedUser && collab.userId && normalizeObjectId(collab.userId) === normalizeObjectId(invitedUser._id);
        const isSameEmail = !collab.userId && collab.invitedEmail === email;
        return (isSameUser || isSameEmail)
          && collab.isActive === true
          && ["pending", "accepted"].includes(collab.status)
      }
    );

    if (existingCollaborator) {
      return res.status(409).json({ error: "User is already an active collaborator or has a pending invite" });
    }

    const inviteToken = generateInviteToken();
    const inviteExpiresAt = getInviteExpiryDate();

    script.collaborators.push(createCollaboratorEntry({
      userId: invitedUser ? invitedUser._id : undefined,
      invitedEmail: invitedUser ? undefined : email,
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
        to: email,
        recipientName: invitedUser ? invitedUser.name : email.split("@")[0],
        scriptTitle: script.title,
        token: inviteToken,
        role,
        message: sanitizeMessage(req.body?.message, 1000),
      });
    } catch (emailError) {
      console.error("inviteCollaborator email failed:", emailError.message);
    }

    if (invitedUser) {
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
    }

    await createAuditEntry(script._id, req.user._id, "invite_sent", {
      invitedUserId: invitedUser ? invitedUser._id : null,
      invitedEmail: invitedUser ? null : email,
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

    if (collaborator.userId) {
      if (normalizeObjectId(collaborator.userId) !== normalizeObjectId(req.user._id)) {
        return res.status(403).json({ error: "Wrong account" });
      }
    } else if (collaborator.invitedEmail) {
      if (req.user.email.toLowerCase() !== collaborator.invitedEmail.toLowerCase()) {
        return res.status(403).json({ error: "Wrong account" });
      }
      collaborator.userId = req.user._id;
    } else {
      return res.status(403).json({ error: "Invalid invite data" });
    }

    collaborator.status = "accepted";
    collaborator.joinedAt = new Date();
    collaborator.inviteToken = null;
    collaborator.inviteExpiresAt = null;
    collaborator.isActive = true;

    // A co-writer who joins to WRITE gets an authorship credit by default (seeded behind the owner).
    // Credit is display-only and the owner can remove it — but the common case is that someone
    // invited to write on the script should be named on it, so the default is to include them.
    if (collaborator.role === "editor" || collaborator.role === "full_admin") {
      const owner = await User.findById(getOwnerId(script)).select("name").lean();
      addWriterCredit(script, {
        userId: req.user._id,
        name: req.user.name,
        ownerName: owner?.name || "",
      });
      script.markModified("writers");
    }

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







