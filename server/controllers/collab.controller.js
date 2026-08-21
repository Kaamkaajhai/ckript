import mongoose from "mongoose";
import { diff_match_patch } from "diff-match-patch";
import { applyThreeWayMerge } from "../utils/contentMerge.js";
import { addWriterCredit } from "../utils/writerCredits.js";
import { decodeEntitiesOnce, stripTagsCompletely } from "../utils/htmlText.js";
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
import { isWriterRole } from "../utils/industryAccess.js";

// Script.titlePage is a Mongoose Map — convert to a plain object (or null) for generateScreenplayPdf.
const titlePageToObject = (tp) => {
  if (!tp) return null;
  const obj = typeof tp.toObject === "function" ? tp.toObject() : (tp instanceof Map ? Object.fromEntries(tp) : tp);
  return obj && Object.keys(obj).length ? obj : null;
};

// `commenter` is a first-class role in the Script schema enum and in PERMISSIONS (it grants the
// `comment` tier without `write`), but it was missing here — and normalizeCollaboratorRoleInput
// falls back to "editor" for anything unlisted. Inviting someone as a Commenter therefore granted
// them full write access instead. Invites and new requests share this current vocabulary; the
// CollabRequest model retains `merger` only so historic pending documents remain actionable.
const VALID_COLLAB_ROLES = ["editor", "viewer", "full_admin", "commenter"];
const REQUESTABLE_ROLES = [...VALID_COLLAB_ROLES];
const REVIEW_DECISIONS = ["approved", "rejected"];
const REQUEST_DECISIONS = ["accepted", "rejected"];
const PR_REVIEW_DECISIONS = ["approved", "rejected"];
const VALID_ACCESS_LEVELS = Object.values(COLLAB_ACCESS_LEVELS);
const dmp = new diff_match_patch();

const normalizeObjectId = (value) => String(value?._id || value?.id || value || "");

const getPaging = (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 12));
  return { page, limit, skip: (page - 1) * limit };
};

const getPagination = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit)),
  hasNext: page * limit < total,
  hasPrevious: page > 1,
});

const getIo = (req) => req.app.get("io");

const getOwnerId = (script) => getScriptOwnerId(script);

const getScriptRoom = (scriptId) => `script:${scriptId}`;

const sanitizeMessage = (value, maxLength = 1500) => String(value || "").trim().slice(0, maxLength);
const sanitizeTitle = (value, maxLength = 200) => String(value || "").trim().slice(0, maxLength);
// Both security-relevant steps now come from utils/htmlText.js; only the block-tag presentation is
// local, because this helper's plain text keeps list bullets and blank lines between paragraphs.
// The two bugs that were here: entities were decoded AFTER stripping, which MANUFACTURED markup
// ("&lt;img src=x onerror=alert(1)&gt;" carried no tag past the stripper and came out live) and
// unescaped twice (`&amp;` before `&lt;` turned the literal text "&amp;lt;" into "<"); and
// `/<[^>]+>/g` is one sweep, so "<<p>p>" leaves "p>" behind and nesting reassembles a whole tag.
// The old open-`<p>`/`<div>` removals are dropped, not moved — stripTagsCompletely already deletes
// them, so keeping them would just be a second, weaker copy of the same rule.
const stripHtmlToPlainText = (value = "") =>
  stripTagsCompletely(
    // `String(value || "")` and not decodeEntitiesOnce's own `?? ""`: this helper has always turned
    // 0/false/NaN into "", and that is a coercion rule, not a sanitising one, so it stays here.
    decodeEntitiesOnce(String(value || ""))
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*\/p\s*>/gi, "\n\n")
      .replace(/<\s*\/div\s*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
  )
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
const normalizeRequestedRoleForDecision = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  // `merger` belonged to the retired branch-review workflow. Existing requests must remain
  // actionable, but silently turning one into a live co-writer would grant broader access than
  // was requested. Comment-only is the least-privilege migration default; the owner can choose a
  // current role explicitly when accepting it.
  return normalized === "merger" ? "commenter" : normalized;
};

const mapRequestForResponse = (request, script = null) => ({
  _id: request?._id,
  scriptId: normalizeObjectId(request?.scriptId?._id || request?.scriptId),
  scriptTitle: script?.title || request?.scriptId?.title || "Untitled Script",
  requester: request?.requesterId?.name
    ? {
      _id: request.requesterId._id,
      name: request.requesterId.name || "Writer",
      profileImage: request.requesterId.profileImage || "",
    }
    : null,
  requestedRole: normalizeRequestedRoleForDecision(request?.requestedRole) || "editor",
  legacyRequestedRole: String(request?.requestedRole || "").toLowerCase() === "merger" ? "merger" : null,
  message: sanitizeMessage(request?.message, 1000),
  status: String(request?.status || "pending").toLowerCase(),
  createdAt: request?.createdAt || null,
  respondedAt: request?.respondedAt || null,
});
const CONTENT_ONLY_SECTION_FIELDS = new Set(["textContent", "fullContent"]);
const FULL_ACCESS_SECTION_FIELDS = new Set(["textContent", "fullContent", "description", "synopsis", "logline"]);

const mapCollaboratorForResponse = (collaborator, { includeInvitedEmail = false } = {}) => ({
  _id: collaborator?._id,
  role: collaborator?.role,
  accessLevel: collaborator?.accessLevel || COLLAB_ACCESS_LEVELS.FULL_ACCESS,
  invitedBy: collaborator?.invitedBy,
  status: collaborator?.status,
  joinedAt: collaborator?.joinedAt,
  isActive: collaborator?.isActive,
  invitedAt: collaborator?.invitedAt || collaborator?._id?.getTimestamp?.() || null,
  inviteExpiresAt: collaborator?.inviteExpiresAt,
  inviteExpired: collaborator?.status === "pending" && isInviteExpired(collaborator?.inviteExpiresAt),
  ...(includeInvitedEmail && collaborator?.invitedEmail ? { invitedEmail: collaborator.invitedEmail } : {}),
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
  invitedAt = new Date(),
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
  invitedAt,
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
  const bestByIdentity = new Map();

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const identity = normalizeObjectId(entry?.userId) || String(entry?.invitedEmail || "").trim().toLowerCase();
    if (!identity) return;

    const current = bestByIdentity.get(identity);
    if (!current || getCollaboratorRank(entry) >= getCollaboratorRank(current)) {
      bestByIdentity.set(identity, entry);
    }
  });

  return [...bestByIdentity.values()];
};

const collaboratorMatchesIdentity = (entry, identity) => {
  const target = String(identity || "").trim().toLowerCase();
  if (!target) return false;
  return [entry?._id, entry?.userId?._id, entry?.userId, entry?.invitedEmail]
    .some((value) => String(value || "").trim().toLowerCase() === target);
};

const findCurrentCollaboratorEntry = (script, identity) => {
  const collaboratorEntries = Array.isArray(script?.collaborators) ? script.collaborators : [];

  return collaboratorEntries.find(
    (entry) =>
      collaboratorMatchesIdentity(entry, identity)
      && entry?.isActive === true
      && ["pending", "accepted"].includes(entry?.status)
  ) || collaboratorEntries.find(
    (entry) => collaboratorMatchesIdentity(entry, identity)
  ) || null;
};

export const inviteCollaborator = async (req, res) => {
  try {
    const script = req.script || await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    // The competition is solo: one writer, one entry. The generic collaboration surface is closed on
    // a competition script, because otherwise inviting co-writers here would be an unguarded way to
    // enter work that is not your own.
    if (script.competitionId && !script.competitionReleasedAt) {
      return res.status(403).json({ error: "Competition entries are written solo — collaborators cannot be added." });
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

    if (invitedUser && !isWriterRole(invitedUser)) {
      return res.status(403).json({
        error: "Only writer accounts can be invited to collaborate on scripts.",
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
        actionToken: inviteToken,
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
        ? "Invite saved. Email delivery is unavailable, but the recipient can accept after signing in or creating a writer account with this email."
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

    const collaborator = findCurrentCollaboratorEntry(script, req.params.userId);

    if (!collaborator || collaborator.isActive !== true || collaborator.status !== "pending") {
      return res.status(404).json({ error: "Pending invite not found" });
    }

    const invitedUser = collaborator.userId
      ? await User.findById(collaborator.userId).select("_id name email role")
      : await User.findOne({ email: String(collaborator.invitedEmail || "").trim().toLowerCase() })
        .select("_id name email role");
    if (invitedUser && !isWriterRole(invitedUser)) {
      return res.status(403).json({ error: "The invitation recipient no longer has a writer account." });
    }
    const invitedEmail = String(invitedUser?.email || collaborator.invitedEmail || "").trim().toLowerCase();
    if (!invitedEmail) {
      return res.status(409).json({ error: "Invitation has no recipient email" });
    }

    const inviteToken = generateInviteToken();
    const inviteExpiresAt = getInviteExpiryDate();
    if (invitedUser && !collaborator.userId) {
      collaborator.userId = invitedUser._id;
      collaborator.invitedEmail = undefined;
    }
    collaborator.inviteToken = inviteToken;
    collaborator.inviteExpiresAt = inviteExpiresAt;
    await script.save();

    let emailResult = { success: false, skipped: true };
    try {
      emailResult = await sendInviteEmail({
        to: invitedEmail,
        recipientName: invitedUser?.name || invitedEmail.split("@")[0],
        scriptTitle: script.title,
        token: inviteToken,
        role: collaborator.role,
        message: sanitizeMessage(req.body?.message, 1000),
      });
    } catch (emailError) {
      console.error("resendInvite email failed:", emailError.message);
    }

    await createAuditEntry(script._id, req.user._id, "invite_resent", {
      invitedUserId: invitedUser?._id || null,
      invitedEmail: invitedUser ? null : invitedEmail,
      role: collaborator.role,
      emailSent: emailResult?.success === true,
      emailSkipped: emailResult?.skipped === true,
    });

    if (invitedUser) {
      await Notification.deleteMany({ user: invitedUser._id, type: "collab_invite", script: script._id });
      await createNotification({
        userId: invitedUser._id,
        type: "collab_invite",
        from: req.user._id,
        script: script._id,
        message: `Your collaboration invitation for ${script.title} was refreshed.`,
        actionToken: inviteToken,
      });
      emitNotification(req, invitedUser._id, "collab_invite", {
        scriptId: script._id,
        role: collaborator.role,
        token: inviteToken,
      });
    }

    return res.status(200).json({
      message: emailResult?.success === true
        ? "Invite resent successfully"
        : "Invite refreshed. Email delivery is unavailable, but the recipient can accept after signing in or creating a writer account with this email.",
      emailSent: emailResult?.success === true,
    });
  } catch (error) {
    console.error("resendInvite failed:", error.message);
    return res.status(500).json({ error: "Failed to resend invite" });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    if (!isWriterRole(req.user)) {
      return res.status(403).json({ error: "Only writer accounts can accept script collaboration invitations." });
    }

    const token = String(req.params.token || "").trim();
    if (!token) {
      return res.status(400).json({ error: "Invite token is required" });
    }

    const script = await Script.findOne({ "collaborators.inviteToken": token })
      // competitionId is selected so the guard below can actually see it — without it the guard would
      // read undefined and silently never fire.
      .select("title creator collaborators collabVisibility competitionId competitionReleasedAt");

    if (!script) {
      return res.status(404).json({ error: "Invalid invite link" });
    }

    if (script.competitionId && !script.competitionReleasedAt) {
      return res.status(403).json({ error: "This script is a competition entry and cannot be co-written." });
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
      if (String(req.user.email || "").trim().toLowerCase() !== collaborator.invitedEmail.toLowerCase()) {
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

    // The action token is single-use. Removing its notifications prevents a successful invite
    // from leaving a bell action that can only answer "already used" on the next click.
    try {
      await Notification.deleteMany({
        user: req.user._id,
        type: "collab_invite",
        script: script._id,
      });
    } catch (notificationError) {
      console.error("acceptInvite notification cleanup failed:", notificationError.message);
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
    if (!isWriterRole(req.user)) {
      return res.status(403).json({ error: "Only writer accounts can request script collaboration." });
    }

    const script = await Script.findById(req.params.scriptId).select("title creator collabVisibility collaborators competitionId competitionReleasedAt");
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    // A competition entry is written solo. Without this, collabVisibility "open" would be an
    // unguarded join path straight into a live entry.
    if (script.competitionId && !script.competitionReleasedAt) {
      return res.status(403).json({ error: "Competition entries are written solo." });
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
      request: mapRequestForResponse(collabRequest, script),
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
      const requestedRole = normalizeRequestedRoleForDecision(collabRequest.requestedRole);
      const role = String(req.body?.role || requestedRole).trim().toLowerCase();
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

      return res.status(200).json({
        message: "Request accepted",
        request: mapRequestForResponse(collabRequest, script),
        assignedRole: role,
        accessLevel,
      });
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

    return res.status(200).json({
      message: "Request rejected",
      request: mapRequestForResponse(collabRequest, script),
    });
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

    const ownerId = getOwnerId(script);
    const includeInvitedEmail = normalizeObjectId(ownerId) === normalizeObjectId(req.user?._id);
    return res.status(200).json({
      ownerId,
      collabVisibility: script.collabVisibility,
      collaborators: getCanonicalCollaboratorEntries(script.collaborators || [])
        .map((entry) => mapCollaboratorForResponse(entry, { includeInvitedEmail })),
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

    if (script.competitionId && !script.competitionReleasedAt) {
      return res.status(403).json({ error: "Competition entries are written solo." });
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
            _id: collaborator._id,
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
            "entry._id": collaborator._id,
            "entry.isActive": true,
            "entry.status": { $in: ["pending", "accepted"] },
          },
        ],
      },
    );

    const updatedScript = await Script.findById(script._id)
      .populate("collaborators.userId", "name email profileImage");
    const updatedCollaborator = findCurrentCollaboratorEntry(updatedScript, collaborator._id) || collaborator;

    try {
      if (collaborator.userId) {
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
      }

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
      collaborator: mapCollaboratorForResponse(updatedCollaborator, { includeInvitedEmail: true }),
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

    // A competition script has no collaborators to manage, and this endpoint must not become a way
    // to mutate one mid-competition.
    if (script.competitionId && !script.competitionReleasedAt) {
      return res.status(403).json({ error: "Competition entries are written solo." });
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
            _id: collaborator._id,
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
            "entry._id": collaborator._id,
            "entry.isActive": true,
            "entry.status": { $in: ["pending", "accepted"] },
          },
        ],
      },
    );

    emitScriptEvent(req, script._id, "collaborator_removed", { userId: normalizeObjectId(collaborator.userId) });
    emitNotification(req, collaborator.userId, "collaborator_removed", { scriptId: script._id });
    emitCollabMembershipChanged(req, {
      scriptId: script._id,
      actorId: req.user._id,
      targetUserIds: [collaborator.userId, getOwnerId(script)],
      action: "collaborator_removed",
      role: collaborator.role,
    });

    if (collaborator.userId) {
      await createNotification({
        userId: collaborator.userId,
        type: "collab_update",
        from: req.user._id,
        script: script._id,
        message: `Your collaboration access to ${script.title} was removed.`,
      });
    }

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

    // Prevents flipping a competition entry to "open", which would create a public join path.
    if (script.competitionId && !script.competitionReleasedAt) {
      return res.status(403).json({ error: "Competition entries cannot change visibility." });
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

const mapActivityForResponse = (entry, scriptTitle = "") => ({
  _id: entry._id,
  scriptId: normalizeObjectId(entry.scriptId),
  scriptTitle: scriptTitle || entry.scriptId?.title || "Untitled Script",
  action: entry.action,
  actor: entry.actorId ? {
    _id: entry.actorId._id,
    name: entry.actorId.name || "Unknown user",
    profileImage: entry.actorId.profileImage || "",
  } : null,
  // Audit metadata can contain invited email addresses and internal merge details. Every activity
  // surface exposes only the vocabulary its timeline actually renders.
  metadata: {
    role: entry.metadata?.role || entry.metadata?.assignedRole || entry.metadata?.requestedRole || null,
  },
  createdAt: entry.createdAt,
});

export const getActivityLog = async (req, res) => {
  try {
    const { page, limit, skip } = getPaging(req.query);
    const filter = { scriptId: req.params.scriptId };
    const [entries, total] = await Promise.all([
      AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actorId", "name profileImage")
      .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      activity: entries.map((entry) => mapActivityForResponse(entry)),
      pagination: getPagination({ page, limit, total }),
    });
  } catch (error) {
    console.error("getActivityLog failed:", error.message);
    return res.status(500).json({ error: "Failed to load activity log" });
  }
};

export const getCollabInvitesInbox = async (req, res) => {
  try {
    if (!isWriterRole(req.user)) {
      return res.status(403).json({ error: "Only writer accounts have a collaboration invitation inbox." });
    }

    const { page, limit, skip } = getPaging(req.query);
    const userId = req.user._id;
    const email = String(req.user.email || "").trim().toLowerCase();
    const recipientMatch = [
      { collaborators: { $elemMatch: { userId, isActive: true, status: "pending" } } },
      ...(email ? [{ collaborators: { $elemMatch: { invitedEmail: email, isActive: true, status: "pending" } } }] : []),
    ];
    const scripts = await Script.find({ $or: recipientMatch })
      .select("title creator collaborators")
      .populate("creator", "name profileImage")
      .populate("collaborators.invitedBy", "name profileImage")
      .lean();

    const invitations = scripts.flatMap((script) => (script.collaborators || [])
      .filter((entry) => entry.isActive === true && entry.status === "pending")
      .filter((entry) => (
        normalizeObjectId(entry.userId) === normalizeObjectId(userId)
        || (email && String(entry.invitedEmail || "").trim().toLowerCase() === email)
      ))
      .map((entry) => ({
        _id: entry._id,
        scriptId: normalizeObjectId(script._id),
        scriptTitle: script.title || "Untitled Script",
        owner: script.creator ? {
          _id: script.creator._id,
          name: script.creator.name || "Writer",
          profileImage: script.creator.profileImage || "",
        } : null,
        invitedBy: entry.invitedBy ? {
          _id: entry.invitedBy._id,
          name: entry.invitedBy.name || "Writer",
          profileImage: entry.invitedBy.profileImage || "",
        } : null,
        role: entry.role,
        accessLevel: entry.accessLevel || COLLAB_ACCESS_LEVELS.FULL_ACCESS,
        invitedAt: entry.invitedAt || entry._id?.getTimestamp?.() || null,
        expiresAt: entry.inviteExpiresAt || null,
        expired: isInviteExpired(entry.inviteExpiresAt),
        token: entry.inviteToken || null,
      })));

    invitations.sort((left, right) => (
      new Date(right.invitedAt || 0).getTime() - new Date(left.invitedAt || 0).getTime()
    ));
    const total = invitations.length;
    return res.status(200).json({
      invitations: invitations.slice(skip, skip + limit),
      pagination: getPagination({ page, limit, total }),
    });
  } catch (error) {
    console.error("getCollabInvitesInbox failed:", error.message);
    return res.status(500).json({ error: "Failed to load collaboration invitations" });
  }
};

export const getCollabActivityInbox = async (req, res) => {
  try {
    if (!isWriterRole(req.user)) {
      return res.status(403).json({ error: "Only writer accounts have collaboration activity." });
    }

    const { page, limit, skip } = getPaging(req.query);
    const scripts = await Script.find({
      $or: [
        { creator: req.user._id },
        { collaborators: { $elemMatch: { userId: req.user._id, isActive: true, status: "accepted" } } },
      ],
    }).select("_id title").lean();
    const scriptIds = scripts.map((script) => script._id);
    const titles = new Map(scripts.map((script) => [normalizeObjectId(script._id), script.title]));
    const filter = { scriptId: { $in: scriptIds } };
    const [entries, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("actorId", "name profileImage")
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      activity: entries.map((entry) => mapActivityForResponse(
        entry,
        titles.get(normalizeObjectId(entry.scriptId)),
      )),
      pagination: getPagination({ page, limit, total }),
    });
  } catch (error) {
    console.error("getCollabActivityInbox failed:", error.message);
    return res.status(500).json({ error: "Failed to load collaboration activity" });
  }
};

export const getCollabRequestsInbox = async (req, res) => {
  try {
    if (!isWriterRole(req.user)) {
      return res.status(403).json({ error: "Only writer accounts have a collaboration inbox." });
    }

    const { page, limit, skip } = getPaging(req.query);
    const ownedScripts = await Script.find({ creator: req.user._id }).select("_id title");
    const scriptIds = ownedScripts.map((script) => script._id);
    const scriptTitleMap = new Map(ownedScripts.map((script) => [normalizeObjectId(script._id), script.title]));
    const filter = {
      scriptId: { $in: scriptIds },
      status: "pending",
    };
    const [requests, total] = await Promise.all([
      CollabRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("requesterId", "name profileImage")
        .lean(),
      CollabRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      requests: requests.map((request) => mapRequestForResponse(request, {
        title: scriptTitleMap.get(normalizeObjectId(request.scriptId)),
      })),
      pagination: getPagination({ page, limit, total }),
    });
  } catch (error) {
    console.error("getCollabRequestsInbox failed:", error.message);
    return res.status(500).json({ error: "Failed to load collaboration requests" });
  }
};

export const getOutgoingCollabRequests = async (req, res) => {
  try {
    if (!isWriterRole(req.user)) {
      return res.status(403).json({ error: "Only writer accounts can send collaboration requests." });
    }

    const { page, limit, skip } = getPaging(req.query);
    const filter = { requesterId: req.user._id };
    const [requests, total] = await Promise.all([
      CollabRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("scriptId", "title")
        .lean(),
      CollabRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      requests: requests.map((request) => mapRequestForResponse(request)),
      pagination: getPagination({ page, limit, total }),
    });
  } catch (error) {
    console.error("getOutgoingCollabRequests failed:", error.message);
    return res.status(500).json({ error: "Failed to load collaboration requests" });
  }
};

export const getMyCollabRequest = async (req, res) => {
  try {
    const script = await Script.findById(req.params.scriptId)
      .select("_id title creator collabVisibility collaborators competitionId competitionReleasedAt");
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    const isOwner = normalizeObjectId(getOwnerId(script)) === normalizeObjectId(req.user._id);
    const collaborator = getAcceptedCollaborator(script, req.user._id);
    const request = await CollabRequest.findOne({
      scriptId: script._id,
      requesterId: req.user._id,
    }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      request: request ? mapRequestForResponse(request, script) : null,
      isOwner,
      isCollaborator: Boolean(collaborator),
      canRequest: isWriterRole(req.user)
        && !isOwner
        && !collaborator
        && script.collabVisibility === "open"
        && !(script.competitionId && !script.competitionReleasedAt),
    });
  } catch (error) {
    console.error("getMyCollabRequest failed:", error.message);
    return res.status(500).json({ error: "Failed to load collaboration request" });
  }
};

export const getScriptRequests = async (req, res) => {
  try {
    const { page, limit, skip } = getPaging(req.query);
    const filter = { scriptId: req.params.scriptId };
    const [requests, total] = await Promise.all([
      CollabRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("requesterId", "name profileImage")
        .lean(),
      CollabRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      requests: requests.map((request) => mapRequestForResponse(request, req.script)),
      pagination: getPagination({ page, limit, total }),
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







