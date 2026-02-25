import Message from "../models/Message.js";
import User from "../models/User.js";
import Script from "../models/Script.js";

// Generate a consistent chatId from two user IDs (sorted so both users get the same chatId)
const buildChatId = (idA, idB) => {
  const sorted = [idA.toString(), idB.toString()].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

/**
 * POST /messages/send
 * Rules:
 *  - Only investors can START a new conversation with a writer.
 *  - Investors may only send the first message if they have purchased (unlocked)
 *    at least one script by that writer.
 *  - Once a conversation exists, both parties can reply freely.
 */
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;

    if (!receiverId || !text) {
      return res.status(400).json({ message: "receiverId and text are required." });
    }

    const sender = req.user;
    const receiver = await User.findById(receiverId).select("role name");
    if (!receiver) {
      return res.status(404).json({ message: "Recipient not found." });
    }

    const chatId = buildChatId(sender._id, receiverId);

    // Check if this is a new conversation
    const existingMessageCount = await Message.countDocuments({ chatId });

    if (existingMessageCount === 0) {
      // NEW CONVERSATION – strict rules apply

      // Rule 1: Only investors can initiate a conversation
      if (sender.role !== "investor") {
        return res.status(403).json({
          message: "Only investors can start a new conversation. Writers and others cannot initiate messages.",
        });
      }

      // Rule 2: The recipient must be a writer (or creator role)
      const writerRoles = ["writer", "creator"];
      if (!writerRoles.includes(receiver.role)) {
        return res.status(403).json({
          message: "Investors can only start conversations with writers.",
        });
      }

      // Rule 3: Investor must have purchased (unlocked) at least one script by this writer
      const hasPurchased = await Script.exists({
        creator: receiverId,
        unlockedBy: sender._id,
      });

      if (!hasPurchased) {
        return res.status(403).json({
          message: "You can only message a writer after purchasing one of their projects.",
          code: "PURCHASE_REQUIRED",
        });
      }
    }

    // Save message with receiver field
    const message = await Message.create({
      chatId,
      sender: sender._id,
      receiver: receiverId,
      text,
    });

    const populated = await message.populate("sender", "name profileImage role");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chatId }).populate("sender", "name profileImage role");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /messages/conversations
 * Returns all unique conversations for the logged-in user.
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all unique chatIds that involve this user
    const msgs = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name profileImage role")
      .populate("receiver", "name profileImage role");

    // Deduplicate by chatId, keeping only the latest message per chat
    const seen = new Set();
    const conversations = [];

    for (const msg of msgs) {
      if (seen.has(msg.chatId)) continue;
      seen.add(msg.chatId);

      const otherUser =
        msg.sender._id.toString() === userId.toString() ? msg.receiver : msg.sender;

      conversations.push({
        chatId: msg.chatId,
        user: otherUser,
        lastMessage: msg.text,
        timestamp: msg.createdAt,
      });
    }

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /messages/can-message/:writerId
 * Returns { allowed: true/false, reason? }
 * Used by the investor frontend to show/hide the "Message" button.
 */
export const checkCanMessage = async (req, res) => {
  try {
    const investor = req.user;
    const { writerId } = req.params;

    // Must be investor
    if (investor.role !== "investor") {
      return res.json({ allowed: false, reason: "Only investors can initiate messages." });
    }

    const writer = await User.findById(writerId).select("role");
    if (!writer) return res.status(404).json({ message: "Writer not found." });

    const writerRoles = ["writer", "creator"];
    if (!writerRoles.includes(writer.role)) {
      return res.json({ allowed: false, reason: "Recipient is not a writer." });
    }

    const hasPurchased = await Script.exists({
      creator: writerId,
      unlockedBy: investor._id,
    });

    if (!hasPurchased) {
      return res.json({
        allowed: false,
        reason: "Purchase a project from this writer to unlock messaging.",
        code: "PURCHASE_REQUIRED",
      });
    }

    return res.json({ allowed: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
