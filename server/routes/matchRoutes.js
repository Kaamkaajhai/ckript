import express from "express";
import protect from "../middleware/authMiddleware.js";
import { 
  getSmartMatches, updatePreferences, recordScriptView, 
  swipeScript, getNotifications, markNotificationsRead 
} from "../controllers/matchController.js";

const router = express.Router();

router.get("/", protect, getSmartMatches);
router.put("/preferences", protect, updatePreferences);
router.post("/view", protect, recordScriptView);
router.post("/swipe", protect, swipeScript);
router.get("/notifications", protect, getNotifications);
router.put("/notifications/read", protect, markNotificationsRead);

export default router;
