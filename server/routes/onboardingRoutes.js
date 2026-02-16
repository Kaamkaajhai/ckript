import express from "express";
import { 
  updateWriterProfile,
  uploadScript,
  completeOnboarding,
  sendEmailVerification,
  verifyEmail,
  getOnboardingStatus,
  updateProfessionalIdentity,
  completeIndustryOnboarding
} from "../controllers/onboardingController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get("/status", getOnboardingStatus);
router.post("/send-verification", sendEmailVerification);
router.post("/verify-email", verifyEmail);

// Writer onboarding routes
router.put("/writer-profile", updateWriterProfile);
router.post("/upload-script", uploadScript);
router.post("/complete", completeOnboarding);

// Industry professional onboarding routes
router.put("/professional-identity", updateProfessionalIdentity);
router.post("/complete-industry", completeIndustryOnboarding);

export default router;
