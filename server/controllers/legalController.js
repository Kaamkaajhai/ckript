import {
  getCurrentPurchaseTermsPolicy,
  listPurchaseTermsPolicyVersions,
} from "../utils/termsPolicyService.js";

export const getCurrentPurchaseTerms = async (_req, res) => {
  try {
    const terms = await getCurrentPurchaseTermsPolicy();
    res.json({
      key: terms?.key || "purchase_agreement",
      version: terms?.version || "",
      title: terms?.title || "",
      content: terms?.content || "",
      effectiveAt: terms?.effectiveAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load purchase terms." });
  }
};

export const getPurchaseTermsVersions = async (_req, res) => {
  try {
    const versions = await listPurchaseTermsPolicyVersions();
    res.json({ versions });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to load terms versions." });
  }
};
