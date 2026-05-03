import express from "express";
import { 
  checkUsernameAvailability,
  updateWriterProfile,
  uploadWriterMembershipProofFile,
  submitWriterMembershipProof,
  uploadScript,
  completeOnboarding,
  sendEmailVerification,
  verifyEmail,
  getOnboardingStatus,
  updateProfessionalIdentity,
  completeIndustryOnboarding,
  updateMandates,
  getWriterMembershipProofAccessUrl
} from "../controllers/onboardingController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// Public pre-checks used during onboarding before auth/session is established.
router.get("/check-username", checkUsernameAvailability);

// All routes require authentication
router.use(protect);

router.get("/status", getOnboardingStatus);
router.post("/send-verification", sendEmailVerification);
router.post("/verify-email", verifyEmail);

// Writer onboarding routes
router.put("/writer-profile", updateWriterProfile);
router.post("/writer-membership-proof", uploadWriterMembershipProofFile, submitWriterMembershipProof);
router.get("/writer-membership-proof/access-url", getWriterMembershipProofAccessUrl);
router.post("/upload-script", uploadScript);
router.post("/complete", completeOnboarding);

// Industry professional onboarding routes
router.put("/professional-identity", updateProfessionalIdentity);
router.post("/complete-industry", completeIndustryOnboarding);
router.put("/mandates", updateMandates);

export default router;
