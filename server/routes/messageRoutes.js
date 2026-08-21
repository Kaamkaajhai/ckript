import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  sendMessage,
  getMessages,
  getConversations,
  checkCanMessage,
  markChatRead,
  toggleReaction,
  deleteMessage,
  getUnreadCount,
  uploadAttachment,
  uploadMessageAttachment,
  authorizeMessageAttachmentTarget,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/", protect, getConversations);
router.get("/unread-count", protect, getUnreadCount);
router.get("/conversations", protect, getConversations);
router.get("/can-message/:targetId", protect, checkCanMessage);
router.post("/upload", protect, authorizeMessageAttachmentTarget, uploadMessageAttachment, uploadAttachment);
router.post("/send", protect, sendMessage);
router.get("/:chatId", protect, getMessages);
router.patch("/:chatId/read", protect, markChatRead);
router.patch("/:messageId/reaction", protect, toggleReaction);
router.delete("/:messageId", protect, deleteMessage);

export default router;
