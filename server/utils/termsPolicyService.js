import TermsPolicy from "../models/TermsPolicy.js";

const DEFAULT_TERMS_VERSION = "2026-04-23";

const DEFAULT_PURCHASE_TERMS = `
CKRIPT MARKETPLACE PURCHASE TERMS

1. Platform Role
The platform facilitates discovery, payment rails, and transaction records.

2. Script Ownership and Authority
Writers represent they hold rights required to list and transact the script.

3. Exclusivity
When a script is sold or licensed under an exclusive deal, the listing is restricted from parallel buyer transactions while that agreement remains active.

4. Buyer Acknowledgement
Buyers must review writer-selected rights terms, payment structure, modification rights, custom conditions, and explicitly consent before payment.

5. Payment and Commercial Terms
Commercial outcomes are governed by the accepted agreement snapshot attached to each transaction record.

6. Negotiation Scope
Where marked as negotiation-enabled by the writer, any post-purchase discussions are solely between users.

7. Disputes and Platform Role
Ckript may provide logs and records for operational support but does not provide legal representation for user disputes.

8. Governing Law
Unless superseded by a signed contract between users, platform operations are governed by applicable Indian law.
`.trim();

const buildDefaultPolicyDoc = () => ({
  key: "purchase_agreement",
  version: DEFAULT_TERMS_VERSION,
  title: "Ckript Marketplace Purchase Terms",
  content: DEFAULT_PURCHASE_TERMS,
  isCurrent: true,
  effectiveAt: new Date(),
});

export const getCurrentPurchaseTermsPolicy = async () => {
  let current = await TermsPolicy.findOne({ key: "purchase_agreement", isCurrent: true }).lean();

  if (!current) {
    await TermsPolicy.create(buildDefaultPolicyDoc());
    current = await TermsPolicy.findOne({ key: "purchase_agreement", isCurrent: true }).lean();
  }

  return current;
};

export const listPurchaseTermsPolicyVersions = async () => {
  return TermsPolicy.find({ key: "purchase_agreement" })
    .sort({ effectiveAt: -1, createdAt: -1 })
    .select("key version title effectiveAt isCurrent updatedBy createdAt")
    .lean();
};

export const createNewPurchaseTermsPolicyVersion = async ({
  version,
  title,
  content,
  updatedBy,
}) => {
  const nextVersion = String(version || "").trim();
  const nextTitle = String(title || "").trim() || "Ckript Marketplace Purchase Terms";
  const nextContent = String(content || "").trim();

  if (!nextVersion) {
    throw new Error("Terms version is required.");
  }
  if (!nextContent) {
    throw new Error("Terms content is required.");
  }

  const existing = await TermsPolicy.findOne({ key: "purchase_agreement", version: nextVersion }).lean();
  if (existing) {
    throw new Error(`Version ${nextVersion} already exists.`);
  }

  await TermsPolicy.updateMany(
    { key: "purchase_agreement", isCurrent: true },
    { $set: { isCurrent: false } }
  );

  const created = await TermsPolicy.create({
    key: "purchase_agreement",
    version: nextVersion,
    title: nextTitle,
    content: nextContent,
    isCurrent: true,
    effectiveAt: new Date(),
    updatedBy,
  });

  return created;
};
