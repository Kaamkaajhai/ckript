import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  activateFilmIndustryProfessionalTestCheckout,
  createCheckout,
  getFilmIndustryProfessionalTestCheckoutStatus,
  revealWriterContact,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-checkout", protect, createCheckout);
router.get("/film-industry-professional/test-checkout", protect, getFilmIndustryProfessionalTestCheckoutStatus);
router.post("/film-industry-professional/test-checkout", protect, activateFilmIndustryProfessionalTestCheckout);
router.post("/reveal-contact/:writerId", protect, revealWriterContact);

export default router;
