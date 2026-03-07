import Message from "../models/Message.js";
import User from "../models/User.js";
import Script from "../models/Script.js";

const buildChatId = (idA, idB) => {
  const sorted = [idA.toString(), idB.toString()].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

/* ── Send a message ─────────────────────────────────────────── */
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, text, fileUrl, fileType, fileName } = req.body;
    if (!receiverId) return res.status(400).json({ message: "receiverId is required." });
    if (!text?.trim() && !fileUrl) return res.status(400).json({ message: "Message cannot be empty." });

    const sender = req.user;
    const receiver = await User.findById(receiverId).select("role name");
    if (!receiver) return res.status(404).json({ message: "Recipient not found." });

    const chatId = buildChatId(sender._id, receiverId);
    const existingMessageCount = await Message.countDocuments({ chatId });

    if (existingMessageCount === 0) {
      if (sender.role !== "investor") {
        return res.status(403).json({ message: "Only investors can start a new conversation." });
      }
      const writerRoles = ["writer", "creator"];
      if (!writerRoles.includes(receiver.role)) {
        return res.status(403).json({ message: "Investors can only start conversations with writers." });
      }
      const hasPurchased = await Script.exists({ creator: receiverId, unlockedBy: sender._id });
      if (!hasPurchased) {
        return res.status(403).json({
          message: "You can only message a writer after purchasing one of their projects.",
          code: "PURCHASE_REQUIRED",
        });
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

    const message = await Message.create(messageData);
    const populated = await message.populate("sender", "name profileImage role");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
        lastMessage: msg.text || (msg.fileType === "image" ? "📷 Image" : "📎 File"),
        timestamp: msg.createdAt,
        unreadCount,
      });
    }

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ── Check if investor can message a writer ─────────────────── */
export const checkCanMessage = async (req, res) => {
  try {
    const investor = req.user;
    const { writerId } = req.params;

    if (investor.role !== "investor")
      return res.json({ allowed: false, reason: "Only investors can initiate messages." });

    const writer = await User.findById(writerId).select("role");
    if (!writer) return res.status(404).json({ message: "Writer not found." });

    const writerRoles = ["writer", "creator"];
    if (!writerRoles.includes(writer.role))
      return res.json({ allowed: false, reason: "Recipient is not a writer." });

    const hasPurchased = await Script.exists({ creator: writerId, unlockedBy: investor._id });
    if (!hasPurchased)
      return res.json({
        allowed: false,
        reason: "Purchase a project from this writer to unlock messaging.",
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

