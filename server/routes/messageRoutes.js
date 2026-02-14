import express from "express";
import protect from "../middleware/authMiddleware.js";
import { sendMessage, getMessages } from "../controllers/messageController.js";

const router = express.Router();

router.post("/send", protect, sendMessage);
router.get("/:chatId", protect, getMessages);

export default router;
