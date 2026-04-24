import express from "express";
import {
  getCurrentPurchaseTerms,
  getPurchaseTermsVersions,
} from "../controllers/legalController.js";

const router = express.Router();

router.get("/terms/current", getCurrentPurchaseTerms);
router.get("/terms/versions", getPurchaseTermsVersions);

export default router;
