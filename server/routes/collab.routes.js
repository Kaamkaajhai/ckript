import express from "express";
import rateLimit from "express-rate-limit";
import protect from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";
import {
  acceptInvite,
  getActivityLog,
  getCollabActivityInbox,
  getCollaborators,
  getCollabInvitesInbox,
  getCollabRequestsInbox,
  getMyCollabRequest,
  getOutgoingCollabRequests,
  getScriptRequests,
  inviteCollaborator,
  publishScript,
  removeCollaborator,
  resendInvite,
  requestCollab,
  respondToRequest,
  updateCollaboratorRole,
  updateVisibility,
} from "../controllers/collab.controller.js";

const router = express.Router();

const inviteLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `invite:${req.params.scriptId}`,
  message: { error: "Invite limit reached for this script today" },
});

const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `request:${req.params.scriptId}:${req.user?._id || "anonymous"}`,
  message: { error: "Too many collaboration requests for this script right now. Please retry shortly." },
});

router.get("/requests/inbox", protect, getCollabRequestsInbox);
router.get("/requests/outgoing", protect, getOutgoingCollabRequests);
router.get("/invites/inbox", protect, getCollabInvitesInbox);
router.get("/activity", protect, getCollabActivityInbox);

router.post("/:scriptId/invite", protect, checkPermission("manage"), inviteLimiter, inviteCollaborator);
router.post("/invite/:token/accept", protect, acceptInvite);
// Compatibility for invitation links opened by clients released before D44.
router.get("/invite/:token", protect, acceptInvite);

router.post("/:scriptId/request", protect, requestLimiter, requestCollab);
router.get("/:scriptId/request/mine", protect, getMyCollabRequest);
router.post("/:scriptId/request/:requestId/respond", protect, checkPermission("manage"), respondToRequest);
router.get("/:scriptId/requests", protect, checkPermission("manage"), getScriptRequests);

router.get("/:scriptId/collaborators", protect, checkPermission("read"), getCollaborators);
router.patch("/:scriptId/collaborators/:userId/role", protect, checkPermission("manage"), updateCollaboratorRole);
router.delete("/:scriptId/collaborators/:userId", protect, checkPermission("manage"), removeCollaborator);
router.post("/:scriptId/collaborators/:userId/resend-invite", protect, checkPermission("manage"), inviteLimiter, resendInvite);
router.patch("/:scriptId/visibility", protect, checkPermission("manage"), updateVisibility);

router.post("/:scriptId/publish", protect, checkPermission("publish"), publishScript);
router.get("/:scriptId/activity", protect, checkPermission("read"), getActivityLog);

export default router;
