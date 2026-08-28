import express from "express";
import {
	join,
	login,
	googleAuth,
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
	getSessions,
	removeSession,
	removeAllOtherSessions,
	logout,
	checkJudgeInvite,
	acceptJudgeInvite,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/join", join);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Judge onboarding: the admin creates the account, the judge sets the password from a one-time link.
// Public by necessity (the judge has no session yet) and covered by the authLimiter that server.js
// applies to this whole router.
router.get("/judge-invite/:token", checkJudgeInvite);
router.post("/judge-invite/accept", acceptJudgeInvite);
router.post("/resend-reset-otp", resendPasswordResetOTP);
router.post("/validate-address", validateSignupAddress);
router.get("/validate-referral/:referralInput", validateReferral);
router.post("/apply-referral", protect, applyReferralCode);
router.get("/referral-summary", protect, getReferralSummary);
router.get("/zip-info/:pincode", lookupZipInfo);
router.get("/me", protect, getMe);

// Session Routes
router.get("/sessions", protect, getSessions);
router.delete("/sessions/all-others", protect, removeAllOtherSessions);
router.delete("/sessions/:sessionId", protect, removeSession);
router.post("/logout", protect, logout);

export default router;
