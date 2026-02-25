import express from "express";
import protect from "../middleware/authMiddleware.js";
import { sendMessage, getMessages, getConversations, checkCanMessage } from "../controllers/messageController.js";

const router = express.Router();

router.get("/conversations", protect, getConversations);
router.get("/can-message/:writerId", protect, checkCanMessage);
router.post("/send", protect, sendMessage);
router.get("/:chatId", protect, getMessages);

export default router;
