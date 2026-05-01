import Message from "../models/Message.js";
import User from "../models/User.js";
import Script from "../models/Script.js";
import Notification from "../models/Notification.js";
import multer from "multer";
import path from "path";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { sendAdminMessageEmail } from "../utils/emailService.js";

const detectFileType = (mimetype = "") => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  return "document";
};

const isAllowedAttachmentMime = (mimetype = "") => {
  if (!mimetype) return false;
  if (mimetype.startsWith("image/")) return true;
  if (mimetype.startsWith("video/")) return true;
  if (mimetype.startsWith("audio/")) return true;

  const allowedDocs = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-zip-compressed",
  ]);

  return allowedDocs.has(mimetype);
};

const rawUploadMessageAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedAttachmentMime(file?.mimetype)) return cb(null, true);
    return cb(new Error("Unsupported file type. Please upload image, video, audio, PDF, Office, text, CSV, or ZIP files."));
  },
}).single("file");

export const uploadMessageAttachment = (req, res, next) => {
  rawUploadMessageAttachment(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "Attachment is too large. Maximum size is 250MB." });
      }
      return res.status(400).json({ message: err.message || "Attachment upload failed." });
    }

    return res.status(400).json({ message: err.message || "Attachment upload failed." });
  });
};

const buildChatId = (idA, idB) => {
  const sorted = [idA.toString(), idB.toString()].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

const resolveClientOriginFromRequest = (req) => {
  const originHeader = String(req.get("origin") || "").trim();
  if (originHeader) return originHeader;

  const refererHeader = String(req.get("referer") || "").trim();
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin;
    } catch (_error) {
      // Ignore malformed referer and fall back to env-based URL resolution.
    }
  }

  return "";
};

const hasBlockedUser = (blockedUsers = [], userId) =>
  blockedUsers?.some((id) => id?.toString() === userId?.toString());

/* ── Send a message ─────────────────────────────────────────── */
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, text, fileUrl, fileType, fileName, fileSize, scriptId } = req.body;
    if (!receiverId) return res.status(400).json({ message: "receiverId is required." });
    if (!text?.trim() && !fileUrl) return res.status(400).json({ message: "Message cannot be empty." });

    const sender = await User.findById(req.user._id).select("_id role name blockedUsers");
    if (!sender) return res.status(404).json({ message: "Sender not found." });

    const receiver = await User.findById(receiverId).select("_id role name email blockedUsers");
    if (!receiver) return res.status(404).json({ message: "Recipient not found." });

    const blockedBySender = hasBlockedUser(sender.blockedUsers, receiver._id);
    const blockedByReceiver = hasBlockedUser(receiver.blockedUsers, sender._id);
    if (blockedBySender || blockedByReceiver) {
      return res.status(403).json({
        message: "Messaging is unavailable because one of you has blocked the other.",
        code: "USER_BLOCKED",
      });
    }

    const chatId = buildChatId(sender._id, receiver._id);
    const existingMessageCount = await Message.countDocuments({ chatId });

    if (existingMessageCount === 0) {
      const isInvestor = sender.role === "investor";
      const isWriter = ["writer", "creator"].includes(sender.role);
      const isAdmin = sender.role === "admin";
      const isReceiverInvestor = receiver.role === "investor";
      const isReceiverWriter = ["writer", "creator"].includes(receiver.role);
      const isReceiverAdmin = receiver.role === "admin";

      const isAdminWriterConversation =
        (isAdmin && isReceiverWriter) ||
        (isReceiverAdmin && isWriter);

      if (isAdminWriterConversation) {
        // Admin can initiate direct discussions with writers for workflow coordination.
      } else {
        if (!((isInvestor && isReceiverWriter) || (isWriter && isReceiverInvestor))) {
          return res.status(403).json({ message: "Conversations can only be started between writers and investors." });
        }

        const investorId = isInvestor ? sender._id : receiverId;
        const writerId = isWriter ? sender._id : receiverId;

        const hasPurchased = await Script.exists({ creator: writerId, unlockedBy: investorId });
        if (!hasPurchased) {
          return res.status(403).json({
            message: "Messaging is locked until an investor purchases a script from this writer.",
            code: "PURCHASE_REQUIRED",
          });
        }
      }
    }

    const messageData = {
      chatId,
      sender: sender._id,
      receiver: receiverId,
      text: text?.trim() || "",
    };
    if (fileUrl) messageData.fileUrl = fileUrl;
    if (fileType) messageData.fileType = fileType;
    if (fileName) messageData.fileName = fileName;
    if (fileSize) messageData.fileSize = Number(fileSize) || undefined;
    if (scriptId) messageData.script = scriptId;

    const message = await Message.create(messageData);

    if (sender.role === "admin" && receiver.role !== "admin") {
      const trimmedText = String(text || "").trim();
      const preview = trimmedText
        ? (trimmedText.length > 140 ? `${trimmedText.slice(0, 137)}...` : trimmedText)
        : (fileUrl ? "Attachment sent by admin." : "You have a new message from admin.");

      await Notification.create({
        user: receiver._id,
        type: "admin_alert",
        from: sender._id,
        message: `Admin sent you a message: ${preview}`,
      }).catch(() => null);

      sendAdminMessageEmail(receiver.email, receiver.name, {
        senderName: sender.name || "Admin",
        previewText: preview,
        hasAttachment: Boolean(fileUrl),
        clientBaseUrl: resolveClientOriginFromRequest(req),
      }).catch((err) => {
        console.error("Failed to send admin message email:", err.message);
      });
    }

    const populated = await message.populate([
      { path: "sender", select: "name profileImage role" },
      { path: "script", select: "title" },
    ]);
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── Upload message attachment ─────────────────────────────── */
export const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const ext = path.extname(req.file.originalname || "") || ".bin";
    const baseName = path
      .basename(req.file.originalname || "attachment", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "attachment";

    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: "scriptbridge/messages",
      resource_type: "auto",
      public_id: `message-${Date.now()}-${baseName}`,
      chunked: req.file.mimetype?.startsWith("video/") || req.file.size > 15 * 1024 * 1024,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    return res.status(201).json({
      fileUrl: uploadResult.secure_url,
      fileType: detectFileType(req.file.mimetype),
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to upload file." });
  }
};

/* ── Get messages for a chatId ──────────────────────────────── */
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const ids = chatId.split("_");
    if (!ids.includes(userId.toString())) {
      return res.status(403).json({ message: "Access denied." });
    }

    const messages = await Message.find({ chatId, deleted: { $ne: true } })
      .populate("sender", "name profileImage role")
      .populate("script", "title")
      .sort({ createdAt: 1 });

    const unreadIds = messages
      .filter((m) => m.receiver.toString() === userId.toString() && !m.read)
      .map((m) => m._id);

    if (unreadIds.length) {
      await Message.updateMany(
        { _id: { $in: unreadIds } },
        { $set: { read: true, readAt: new Date() } }
      );
    }

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── Get all conversations (inbox) ─────────────────────────── */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const msgs = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
      deleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name profileImage role")
      .populate("receiver", "name profileImage role");

    const seen = new Set();
    const conversations = [];

    for (const msg of msgs) {
      if (seen.has(msg.chatId)) continue;
      seen.add(msg.chatId);

      const otherUser =
        msg.sender._id.toString() === userId.toString() ? msg.receiver : msg.sender;

      const unreadCount = await Message.countDocuments({
        chatId: msg.chatId,
        receiver: userId,
        read: false,
        deleted: { $ne: true },
      });

      conversations.push({
        chatId: msg.chatId,
        user: otherUser,
        lastMessage:
          msg.text ||
          (msg.fileType === "image"
            ? "📷 Image"
            : msg.fileType === "video"
              ? "🎬 Trailer Video"
              : "📎 File"),
        timestamp: msg.createdAt,
        unreadCount,
      });
    }

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── Check if a user can message another user ─────────────────── */
export const checkCanMessage = async (req, res) => {
  try {
    const user = req.user;
    const { targetId } = req.params;

    const currentUser = await User.findById(user._id).select("_id role blockedUsers");
    if (!currentUser) return res.status(404).json({ message: "User not found." });

    const targetUser = await User.findById(targetId).select("_id role blockedUsers");
    if (!targetUser) return res.status(404).json({ message: "User not found." });

    const blockedByCurrent = hasBlockedUser(currentUser.blockedUsers, targetUser._id);
    const blockedByTarget = hasBlockedUser(targetUser.blockedUsers, currentUser._id);
    if (blockedByCurrent || blockedByTarget) {
      return res.json({
        allowed: false,
        reason: "Messaging is unavailable because one of you has blocked the other.",
        code: "USER_BLOCKED",
      });
    }

    const isUserInvestor = currentUser.role === "investor";
    const isUserWriter = ["writer", "creator"].includes(currentUser.role);
    const isUserAdmin = currentUser.role === "admin";
    
    const isTargetInvestor = targetUser.role === "investor";
    const isTargetWriter = ["writer", "creator"].includes(targetUser.role);
    const isTargetAdmin = targetUser.role === "admin";

    const isAdminWriterConversation =
      (isUserAdmin && isTargetWriter) ||
      (isTargetAdmin && isUserWriter);

    if (isAdminWriterConversation) {
      return res.json({ allowed: true });
    }

    if (!((isUserInvestor && isTargetWriter) || (isUserWriter && isTargetInvestor))) {
         return res.json({ allowed: false, reason: "Conversations are only between investors and writers." });
    }

    const investorId = isUserInvestor ? user._id : targetId;
    const writerId = isUserWriter ? user._id : targetId;

    const hasPurchased = await Script.exists({ creator: writerId, unlockedBy: investorId });
    if (!hasPurchased)
      return res.json({
        allowed: false,
        reason: "Messaging unlocks only after an investor purchases a project from this writer.",
        code: "PURCHASE_REQUIRED",
      });

    return res.json({ allowed: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── Mark all messages in a chat as read ───────────────────── */
export const markChatRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chatId } = req.params;

    await Message.updateMany(
      { chatId, receiver: userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── Toggle reaction on a message ───────────────────────────── */
export const toggleReaction = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ message: "Emoji is required." });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found." });

    const existingIdx = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingIdx > -1) {
      message.reactions.splice(existingIdx, 1);
    } else {
      message.reactions.push({ emoji, userId });
    }

    await message.save();
    res.json(message.reactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── Delete a message (soft delete) ────────────────────────── */
export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found." });

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only delete your own messages." });
    }

    message.deleted = true;
    message.text = "";
    await message.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── Get unread message count (for navbar badge) ────────────── */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await Message.countDocuments({
      receiver: userId,
      read: false,
      deleted: { $ne: true },
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

