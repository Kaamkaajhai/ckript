import express from "express";
import protect from "../middleware/authMiddleware.js";
import financeOnly from "../middleware/financeMiddleware.js";
import {
  getFinanceSummary,
  listFinanceEntries,
  exportFinanceCsv,
} from "../controllers/financeController.js";
// The payment surfaces moved out of the admin console live here now. These REUSE the admin
// controllers rather than reimplementing them — one query per dataset, so the finance page and any
// remaining admin view can never disagree about what a payment was.
import {
  getPayments,
  getInvoices,
  getUsers,
  getBankDetailReviews,
  getInvestorPurchases,
} from "../controllers/adminController.js";

const router = express.Router();

// Every route is read-only and behind both gates. There is deliberately no POST/PATCH/DELETE here:
// the panel is for an external accountant, and the ledger is append-only by design.
router.use(protect, financeOnly);

router.get("/summary", getFinanceSummary);
router.get("/entries", listFinanceEntries);
router.get("/export.csv", exportFinanceCsv);

// ── Payment surfaces, READ-ONLY ─────────────────────────────────────────────
// Every route below is a GET behind financeOnly, so an accountant can read the books while the
// actions that CHANGE anything (grants, plan changes, bank-review decisions) stay on adminRoutes
// behind adminOnly. The finance page renders those controls only for an admin viewer; this router
// is what makes that split real rather than cosmetic.
router.get("/payments", getPayments);
router.get("/invoices", getInvoices);
router.get("/users", getUsers);
router.get("/purchases", getInvestorPurchases);
router.get("/bank-reviews", getBankDetailReviews);

export default router;
