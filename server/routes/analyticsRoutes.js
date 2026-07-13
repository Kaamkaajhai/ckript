import express from "express";
import { trackEvent, trackSession, getCurrencyForRequest } from "../controllers/analyticsController.js";

const router = express.Router();

router.post("/track-event", trackEvent);
router.post("/track-session", trackSession);
router.get("/geo/currency", getCurrencyForRequest);

export default router;
