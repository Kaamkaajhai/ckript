import express from "express";
import protect from "../middleware/authMiddleware.js";
import { getDashboardStats, getDashboardReviews, getInvestorDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", protect, getDashboardStats);
router.get("/stats", protect, getDashboardStats);
router.get("/reviews", protect, getDashboardReviews);
router.get("/investor", protect, getInvestorDashboard);

export default router;
