import express from "express";
import { join, login, getMe, verifyOTP, resendOTP } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/join", join);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.get("/me", protect, getMe);

export default router;
