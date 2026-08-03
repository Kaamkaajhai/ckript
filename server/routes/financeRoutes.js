import express from "express";
import protect from "../middleware/authMiddleware.js";
import financeOnly from "../middleware/financeMiddleware.js";
import {
  getFinanceSummary,
  listFinanceEntries,
  exportFinanceCsv,
} from "../controllers/financeController.js";

const router = express.Router();

// Every route is read-only and behind both gates. There is deliberately no POST/PATCH/DELETE here:
// the panel is for an external accountant, and the ledger is append-only by design.
router.use(protect, financeOnly);

router.get("/summary", getFinanceSummary);
router.get("/entries", listFinanceEntries);
router.get("/export.csv", exportFinanceCsv);

export default router;
