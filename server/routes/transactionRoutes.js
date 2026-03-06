import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getUserTransactions,
  getTransactionById,
  getWalletBalance,
  requestWithdrawal,
  updateBankDetails,
  getBankDetails,
  getTransactionStats
} from "../controllers/transactionController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Transaction routes
router.get("/", getUserTransactions);
router.get("/stats", getTransactionStats);
router.get("/wallet/balance", getWalletBalance);
router.get("/:id", getTransactionById);

// Withdrawal routes
router.post("/withdraw", requestWithdrawal);

// Bank details routes
router.get("/bank-details", getBankDetails);
router.put("/bank-details", updateBankDetails);

export default router;
