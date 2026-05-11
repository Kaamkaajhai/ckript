import express from "express";
import protect from "../middleware/authMiddleware.js";
import { registerForEvent, getMyEventRegistration } from "../controllers/eventController.js";

const router = express.Router();

router.post("/:slug/register", protect, registerForEvent);
router.get("/:slug/registration", protect, getMyEventRegistration);

export default router;
