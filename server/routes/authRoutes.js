import express from "express";
import {
	join,
	login,
	getMe,
	verifyOTP,
	resendOTP,
	forgotPassword,
	resetPassword,
	resendPasswordResetOTP,
	validateSignupAddress,
	lookupZipInfo,
	validateReferral,
	applyReferralCode,
	getReferralSummary,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/join", join);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend-reset-otp", resendPasswordResetOTP);
router.post("/validate-address", validateSignupAddress);
router.get("/validate-referral/:referralInput", validateReferral);
router.post("/apply-referral", protect, applyReferralCode);
router.get("/referral-summary", protect, getReferralSummary);
router.get("/zip-info/:zipCode", lookupZipInfo);
router.get("/me", protect, getMe);

export default router;
