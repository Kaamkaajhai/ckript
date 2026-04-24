import { Writable } from "stream";
import PDFDocument from "pdfkit";
import { uploadToCloudinary } from "../config/cloudinary.js";

const RIGHTS_TYPE_LABELS = {
  full_rights_sale: "Full Rights Sale (Ownership Transfer)",
  exclusive_license: "Exclusive License",
  custom_negotiation_required: "Custom Negotiation Required",
};

const MODIFICATION_RIGHTS_LABELS = {
  buyer_can_modify_freely: "Buyer can modify freely",
  buyer_must_consult_writer: "Buyer must consult writer before modification",
  writer_retains_creative_approval_rights: "Writer retains creative approval rights",
};

const PAYMENT_STRUCTURE_LABELS = {
  one_time_upfront_payment: "One-time upfront payment",
  lower_upfront_plus_royalty_percent: "Lower upfront + royalty %",
  revenue_sharing_model: "Revenue sharing model",
  custom_deal: "Custom deal",
};

const NEGOTIATION_MODE_LABELS = {
  fixed_terms_non_negotiable: "Fixed terms (non-negotiable)",
  open_to_discussion_after_purchase: "Open to discussion after purchase",
  ckript_not_involved: "Ckript not involved in negotiation",
};

const toSafeText = (value, fallback = "-") => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (_error) {
    return String(value);
  }
};

const formatCurrency = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const normalizeParagraph = (value, fallback = "-") =>
  toSafeText(value, fallback).replace(/\r\n/g, "\n");

const addTitle = (doc, text, subtext = "") => {
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0F172A").text(text);
  if (subtext) {
    doc.moveDown(0.15);
    doc.font("Helvetica").fontSize(10).fillColor("#475569").text(subtext);
  }
  doc.moveDown(0.6);
};

const addSectionHeader = (doc, text) => {
  doc.moveDown(0.35);
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#0F172A").text(text);
  doc.moveDown(0.2);
};

const addKeyValue = (doc, label, value) => {
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#334155")
    .text(`${label}: `, { continued: true })
    .font("Helvetica")
    .fillColor("#0F172A")
    .text(toSafeText(value));
};

const addParagraph = (doc, value) => {
  doc.font("Helvetica").fontSize(10).fillColor("#1E293B").text(normalizeParagraph(value), {
    lineGap: 2,
  });
};

const buildRoyaltyLabel = (rightsLicensing = {}) => {
  const pct = Number(rightsLicensing?.royaltySettings?.percentage || 0);
  const durationType = rightsLicensing?.royaltySettings?.durationType || "none";
  const durationYears = Number(rightsLicensing?.royaltySettings?.durationYears || 0);

  if (!pct) return "Not applicable";
  if (durationType === "years" && durationYears > 0) {
    return `${pct}% for ${durationYears} year(s)`;
  }
  if (durationType === "project_lifetime") {
    return `${pct}% for project lifetime`;
  }
  return `${pct}%`;
};

const createScriptSubmissionPdfBuffer = async ({ script, creator }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];

    doc.on("error", reject);
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.pipe(
      new Writable({
        write(_chunk, _enc, cb) {
          cb();
        },
      })
    );

    const rightsLicensing = script?.rightsLicensing || {};
    const legal = script?.legal || {};
    const services = script?.services || {};
    const buyerCommissionRate = 0.05;
    const basePrice = Number(script?.price || 0);
    const buyerCommission = Math.round(basePrice * buyerCommissionRate * 100) / 100;
    const buyerTotal = Math.round((basePrice + buyerCommission) * 100) / 100;

    addTitle(
      doc,
      "Ckript Script Submission Summary",
      "System-generated PDF for the writer submission record and admin review."
    );

    addSectionHeader(doc, "Writer");
    addKeyValue(doc, "Writer Name", creator?.name);
    addKeyValue(doc, "Writer Email", creator?.email);
    addKeyValue(doc, "Writer ID", creator?.sid || creator?._id);

    addSectionHeader(doc, "Script");
    addKeyValue(doc, "Script Title", script?.title);
    addKeyValue(doc, "Script ID", script?.sid || script?._id);
    addKeyValue(doc, "Company Name", script?.companyName || "-");
    addKeyValue(doc, "Format", script?.formatOther ? `${toSafeText(script?.format)} (${script?.formatOther})` : script?.format);
    addKeyValue(doc, "Genre", script?.primaryGenre || script?.genre);
    addKeyValue(doc, "Page Count", script?.pageCount);
    addKeyValue(doc, "Status", script?.status);
    addKeyValue(doc, "Submitted At", formatDateTime(script?.updatedAt || script?.createdAt));
    addKeyValue(doc, "Script File URL", script?.fileUrl || "-");

    addSectionHeader(doc, "Commercial Terms");
    addKeyValue(doc, "Premium Listing", script?.premium ? "Yes" : "No");
    addKeyValue(doc, "Writer Price", formatCurrency(basePrice));
    addKeyValue(doc, "Buyer Platform Fee", formatCurrency(buyerCommission));
    addKeyValue(doc, "Buyer Total Payable", formatCurrency(buyerTotal));
    addKeyValue(doc, "Hosting", services?.hosting ? "Yes" : "No");
    addKeyValue(doc, "AI Evaluation", services?.evaluation ? "Yes" : "No");
    addKeyValue(doc, "AI Trailer", services?.aiTrailer ? "Yes" : "No");
    addKeyValue(doc, "Spotlight", services?.spotlight ? "Yes" : "No");

    addSectionHeader(doc, "Writer Legal Acceptance");
    addKeyValue(doc, "Upload Terms Accepted", legal?.agreedToTerms ? "Yes" : "No");
    addKeyValue(doc, "Terms Version", legal?.termsVersion);
    addKeyValue(doc, "Accepted At", formatDateTime(legal?.timestamp));
    addKeyValue(doc, "Accepted IP", legal?.ipAddress || "-");

    addSectionHeader(doc, "Rights and Licensing");
    addKeyValue(doc, "Rights Type", RIGHTS_TYPE_LABELS[rightsLicensing?.rightsType] || rightsLicensing?.rightsType);
    addKeyValue(doc, "Exclusivity", rightsLicensing?.exclusivity ? "Exclusive" : "Non-exclusive");
    addKeyValue(doc, "Modification Rights", MODIFICATION_RIGHTS_LABELS[rightsLicensing?.modificationRights] || rightsLicensing?.modificationRights);
    addKeyValue(doc, "Payment Structure", PAYMENT_STRUCTURE_LABELS[rightsLicensing?.paymentStructure] || rightsLicensing?.paymentStructure);
    addKeyValue(doc, "Royalty Terms", buildRoyaltyLabel(rightsLicensing));
    addKeyValue(
      doc,
      "License Duration",
      rightsLicensing?.rightsType === "exclusive_license"
        ? `${Number(rightsLicensing?.timeBound?.licenseDurationMonths || 0)} month(s)`
        : "Not time-bound"
    );
    addKeyValue(doc, "Auto Revert To Writer", rightsLicensing?.timeBound?.autoRevertToWriter ? "Yes" : "No");
    addKeyValue(doc, "Negotiation Mode", NEGOTIATION_MODE_LABELS[rightsLicensing?.negotiationMode] || rightsLicensing?.negotiationMode);
    addKeyValue(doc, "Rights Terms Version", rightsLicensing?.termsVersion);
    addKeyValue(doc, "Rights Accepted At", formatDateTime(rightsLicensing?.legalAcknowledgement?.acknowledgedAt));
    addKeyValue(doc, "Rights Accepted IP", rightsLicensing?.legalAcknowledgement?.ipAddress || "-");

    addSectionHeader(doc, "Logline");
    addParagraph(doc, script?.logline || "No logline provided.");

    addSectionHeader(doc, "Synopsis");
    addParagraph(doc, script?.synopsis || "No synopsis provided.");

    addSectionHeader(doc, "Writer Custom Terms For Investors");
    addParagraph(doc, legal?.customInvestorTerms || "No custom investor terms were provided.");

    addSectionHeader(doc, "Custom Rights Conditions");
    addParagraph(doc, rightsLicensing?.customConditions || "No custom rights conditions were provided.");

    doc.moveDown(1);
    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .fillColor("#475569")
      .text("This PDF is automatically created when a writer submits or resubmits a script.");

    doc.end();
  });

export const generateAndUploadScriptSubmissionPdf = async ({ script, creator }) => {
  const scriptId = String(script?._id || "").trim();
  if (!scriptId) {
    throw new Error("Script id is required to generate submission PDF.");
  }

  const pdfBuffer = await createScriptSubmissionPdfBuffer({ script, creator });
  const uploadResult = await uploadToCloudinary(pdfBuffer, {
    folder: "scriptbridge/script-submissions",
    resource_type: "raw",
    public_id: `script-submission-${scriptId}`,
    originalFilename: `script-submission-${scriptId}.pdf`,
    mimeType: "application/pdf",
  });

  return {
    url: uploadResult?.secure_url || "",
    publicId: uploadResult?.public_id || "",
    generatedAt: new Date(),
  };
};
