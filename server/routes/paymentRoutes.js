import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  activateFilmIndustryProfessionalTestCheckout,
  createCheckout,
  getFilmIndustryProfessionalTestCheckoutStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  revealWriterContact,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-checkout", protect, createCheckout);
router.get("/film-industry-professional/test-checkout", protect, getFilmIndustryProfessionalTestCheckoutStatus);
router.post("/film-industry-professional/test-checkout", protect, activateFilmIndustryProfessionalTestCheckout);
router.post("/film-industry-professional/create-razorpay-order", protect, createRazorpayOrder);
router.post("/film-industry-professional/verify-razorpay-payment", protect, verifyRazorpayPayment);

// TEMPORARY DEBUG ROUTE
router.get("/debug-razorpay", (req, res) => {
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID || "undefined",
    keySecret: process.env.RAZORPAY_KEY_SECRET ? "exists" : "undefined",
  });
});
router.post("/reveal-contact/:writerId", protect, revealWriterContact);

export default router;
