import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getGoogleCalendarAuthUrl,
  handleGoogleCalendarCallback,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
} from "../controllers/googleCalendarController.js";

const router = express.Router();

router.post("/auth-url", protect, getGoogleCalendarAuthUrl);
router.get("/callback", handleGoogleCalendarCallback); // public: Google redirects the browser here
router.get("/status", protect, getGoogleCalendarStatus);
router.delete("/", protect, disconnectGoogleCalendar);

export default router;
