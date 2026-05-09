import express from "express";
import rateLimit from "express-rate-limit";
import protect from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";
import {
  acceptInvite,
  createRevisionComment,
  getActivityLog,
  getCollaborators,
  getCollabRequestsInbox,
  getScriptRequests,
  getRevisions,
  inviteCollaborator,
  publishScript,
  removeCollaborator,
  resendInvite,
  requestCollab,
  resolveComment,
  respondToRequest,
  reviewRevision,
  reviewPR,
  submitRevision,
  updateCollaboratorRole,
  updateVisibility,
  getBranch,
  saveBranch,
  raisePR,
  getPRs,
  getDiff,
  revertPR,
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

router.post("/:scriptId/invite", protect, checkPermission("manage"), inviteLimiter, inviteCollaborator);
router.get("/invite/:token", protect, acceptInvite);

router.post("/:scriptId/request", protect, requestLimiter, requestCollab);
router.post("/:scriptId/request/:requestId/respond", protect, checkPermission("manage"), respondToRequest);
router.get("/:scriptId/requests", protect, checkPermission("manage"), getScriptRequests);

router.get("/:scriptId/collaborators", protect, checkPermission("read"), getCollaborators);
router.patch("/:scriptId/collaborators/:userId/role", protect, checkPermission("manage"), updateCollaboratorRole);
router.delete("/:scriptId/collaborators/:userId", protect, checkPermission("manage"), removeCollaborator);
router.post("/:scriptId/collaborators/:userId/resend-invite", protect, checkPermission("manage"), resendInvite);
router.patch("/:scriptId/visibility", protect, checkPermission("manage"), updateVisibility);

router.post("/:scriptId/revisions", protect, checkPermission("write"), submitRevision);
router.post("/:scriptId/revisions/:revisionId/review", protect, checkPermission("approve"), reviewRevision);
router.get("/:scriptId/revisions", protect, checkPermission("read"), getRevisions);

router.post("/:scriptId/revisions/:revisionId/comments", protect, checkPermission("comment"), createRevisionComment);
router.patch("/:scriptId/comments/:commentId/resolve", protect, resolveComment);

router.post("/:scriptId/publish", protect, checkPermission("publish"), publishScript);
router.get("/:scriptId/activity", protect, checkPermission("read"), getActivityLog);

router.get("/:scriptId/branch", protect, checkPermission("write"), getBranch);
router.patch("/:scriptId/branch", protect, checkPermission("write"), saveBranch);
router.post("/:scriptId/pr", protect, checkPermission("write"), raisePR);
router.get("/:scriptId/prs", protect, checkPermission("read"), getPRs);
router.get("/:scriptId/prs/:prId/diff", protect, checkPermission("merge"), getDiff);
router.post("/:scriptId/prs/:prId/review", protect, checkPermission("merge"), reviewPR);
router.post("/:scriptId/prs/:prId/revert", protect, checkPermission("merge"), revertPR);

export default router;
