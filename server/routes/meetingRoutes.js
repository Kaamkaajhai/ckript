import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  requestMeeting,
  getMeetings,
  updateMeetingStatus,
} from "../controllers/meetingController.js";

const router = express.Router();

router.post("/", protect, requestMeeting);
router.get("/", protect, getMeetings);
router.patch("/:id/status", protect, updateMeetingStatus);

export default router;
