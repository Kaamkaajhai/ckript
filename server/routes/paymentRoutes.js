import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  activateFilmIndustryProfessionalTestCheckout,
  getFilmIndustryProfessionalTestCheckoutStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  revealWriterContact,
  consumeMessageWriterSlot,
  activateTestWriterSubscription,
  createWriterRazorpayOrder,
  verifyWriterRazorpayPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.get("/film-industry-professional/test-checkout", protect, getFilmIndustryProfessionalTestCheckoutStatus);
router.post("/film-industry-professional/test-checkout", protect, activateFilmIndustryProfessionalTestCheckout);
router.post("/film-industry-professional/create-razorpay-order", protect, createRazorpayOrder);
router.post("/film-industry-professional/verify-razorpay-payment", protect, verifyRazorpayPayment);

router.post("/writer/activate-test-subscription", protect, activateTestWriterSubscription);
router.post("/writer/create-razorpay-order", protect, createWriterRazorpayOrder);
router.post("/writer/verify-razorpay-payment", protect, verifyWriterRazorpayPayment);

router.post("/reveal-contact/:writerId", protect, revealWriterContact);
router.post("/message-writer/:writerId", protect, consumeMessageWriterSlot);

export default router;
