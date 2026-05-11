import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createEventPaymentOrder,
  getMyEventEditor,
  getMyEventDashboard,
  getMyEventRegistration,
  registerForEvent,
  saveMyEventDraft,
  submitMyEventScript,
  verifyEventPayment,
} from "../controllers/eventController.js";

const router = express.Router();

router.post("/:slug/register", protect, registerForEvent);
router.post("/:slug/create-order", protect, createEventPaymentOrder);
router.post("/:slug/verify-payment", protect, verifyEventPayment);
router.get("/:slug/dashboard", protect, getMyEventDashboard);
router.get("/:slug/editor", protect, getMyEventEditor);
router.put("/:slug/editor", protect, saveMyEventDraft);
router.post("/:slug/submit", protect, submitMyEventScript);
router.get("/:slug/registration", protect, getMyEventRegistration);

export default router;
