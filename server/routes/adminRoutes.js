import express from "express";
import protect from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminMiddleware.js";
import {
    getStats,
    getUsers,
    getUserNotableCreditAttachmentFile,
    getDeletedAccountRequests,
    freezeUserAccount,
    unfreezeUserAccount,
    deleteUserAccountAsAdmin,
    grantCreditsToUser,
    getScripts,
    getAIUsageScripts,
    getEvaluationPurchases,
    getInvestorPurchases,
    getInvoices,
    getPayments,
    getAIScores,
    getPlatformScores,
    getReaderScores,
    getPendingScripts,
    approveScript,
    rejectScript,
    scoreScript,
    getTrailerRequests,
    approveTrailer,
    uploadAdminTrailerFile,
    uploadTrailerAsAdmin,
    loginAsUser,
    getScriptDetail,
    deleteScriptAsAdmin,
    getPendingInvestors,
    getPendingWriterMembershipReviews,
    approveInvestor,
    rejectInvestor,
    reviewWriterMembership,
    getBankDetailReviews,
    approveBankDetailReview,
    rejectBankDetailReview,
    unblockBankDetailUpdates,
    getAdminAlertSummary,
    getAdminAgreements,
    getAdminAgreementById,
    getAdminAgreementPdf,
    getAdminPurchaseTermsCurrent,
    getAdminPurchaseTermsVersions,
    createAdminPurchaseTermsVersion,
    getDiscountCodes,
    createDiscountCode,
    updateDiscountCode,
    deleteDiscountCode,
} from "../controllers/adminController.js";
import { getContactSubmissions } from "../controllers/contactController.js";
import { getAdminAnalytics, getAdminAnalyticsAnonymousDetail, getAdminAnalyticsUserDetail } from "../controllers/analyticsController.js";

const router = express.Router();

// All routes require auth + admin
router.use(protect, adminOnly);

// Dashboard
router.get("/stats", getStats);
router.get("/alerts/summary", getAdminAlertSummary);
router.get("/analytics", getAdminAnalytics);
router.get("/analytics/anonymous/:anonymousId", getAdminAnalyticsAnonymousDetail);
router.get("/analytics/users/:userId", getAdminAnalyticsUserDetail);

// Users
router.get("/users", getUsers);
router.get("/users/:id/industry-credit-attachments/file", getUserNotableCreditAttachmentFile);
router.get("/users/deleted-requests", getDeletedAccountRequests);
router.put("/users/:id/freeze", freezeUserAccount);
router.put("/users/:id/unfreeze", unfreezeUserAccount);
router.delete("/users/:id", deleteUserAccountAsAdmin);
router.post("/users/:id/credits", grantCreditsToUser);

// Scripts
router.get("/scripts", getScripts);
router.get("/scripts/ai-usage", getAIUsageScripts);
router.get("/scripts/evaluation-purchases", getEvaluationPurchases);
router.get("/scripts/investor-purchases", getInvestorPurchases);
router.get("/scripts/pending", getPendingScripts);
router.get("/scripts/trailer-requests", getTrailerRequests);
router.get("/scripts/:id", getScriptDetail);
router.delete("/scripts/:id", deleteScriptAsAdmin);
router.put("/scripts/:id/approve", approveScript);
router.put("/scripts/:id/reject", rejectScript);
router.put("/scripts/:id/score", scoreScript);
router.put("/scripts/:id/trailer-approve", approveTrailer);
router.post("/scripts/:id/upload-trailer", uploadAdminTrailerFile, uploadTrailerAsAdmin);

// Payments
router.get("/payments", getPayments);
router.get("/invoices", getInvoices);

// Scores
router.get("/scores/ai", getAIScores);
router.get("/scores/platform", getPlatformScores);
router.get("/scores/reader", getReaderScores);

// Impersonation
router.post("/login-as/:userId", loginAsUser);

// Investor Approval
router.get("/investors/pending", getPendingInvestors);
router.get("/writer-membership/pending", getPendingWriterMembershipReviews);
router.put("/investors/:id/approve", approveInvestor);
router.put("/investors/:id/reject", rejectInvestor);

// Writer membership proof review
router.put("/writer-membership/:id/:membershipType/:decision", reviewWriterMembership);

// Bank details review
router.get("/bank-details/reviews", getBankDetailReviews);
router.put("/bank-details/reviews/:id/approve", approveBankDetailReview);
router.put("/bank-details/reviews/:id/reject", rejectBankDetailReview);
router.put("/bank-details/reviews/:id/unblock", unblockBankDetailUpdates);

// Legal agreements and terms management
router.get("/agreements", getAdminAgreements);
router.get("/agreements/:id", getAdminAgreementById);
router.get("/agreements/:id/pdf", getAdminAgreementPdf);
router.get("/legal/terms/current", getAdminPurchaseTermsCurrent);
router.get("/legal/terms/versions", getAdminPurchaseTermsVersions);
router.post("/legal/terms/versions", createAdminPurchaseTermsVersion);

// Contact Queries
router.get("/queries", getContactSubmissions);

// Discount Codes
router.get("/discount-codes", getDiscountCodes);
router.post("/discount-codes", createDiscountCode);
router.put("/discount-codes/:id", updateDiscountCode);
router.delete("/discount-codes/:id", deleteDiscountCode);

export default router;
