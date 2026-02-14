import express from "express";
import protect from "../middleware/authMiddleware.js";
import { createCheckout } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-checkout", protect, createCheckout);

export default router;
