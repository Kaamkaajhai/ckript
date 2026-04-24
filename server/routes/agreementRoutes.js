import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getAgreementById,
  getAgreementPdf,
  listAgreements,
} from "../controllers/agreementController.js";

const router = express.Router();

router.use(protect);
router.get("/", listAgreements);
router.get("/:id", getAgreementById);
router.get("/:id/pdf", getAgreementPdf);

export default router;
