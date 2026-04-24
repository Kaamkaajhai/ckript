import { Writable } from "stream";
import PDFDocument from "pdfkit";
import { uploadToCloudinary } from "../config/cloudinary.js";

const toSafeText = (value, fallback = "-") => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const normalizeParagraph = (value, fallback = "-") =>
  toSafeText(value, fallback).replace(/\r\n/g, "\n");

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

const createPurchaseRequestAcceptancePdfBuffer = async ({
  purchaseRequest,
  script,
  investor,
  writer,
  agreementPdfUrl = "",
}) =>
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

    const terms = purchaseRequest?.termsAcceptance || {};
    const rights = terms?.rightsTermsSnapshot || {};

    addTitle(
      doc,
      "Ckript Buyer Legal Acceptance Record",
      "System-generated PDF confirming the investor/industry professional accepted the purchase terms."
    );

    addSectionHeader(doc, "Purchase Request");
    addKeyValue(doc, "Request ID", purchaseRequest?._id);
    addKeyValue(doc, "Status", purchaseRequest?.status);
    addKeyValue(doc, "Payment Status", purchaseRequest?.paymentStatus);
    addKeyValue(doc, "Requested At", formatDateTime(purchaseRequest?.createdAt));
    addKeyValue(doc, "Accepted At", formatDateTime(terms?.acceptedAt));
    addKeyValue(doc, "Settled At", formatDateTime(purchaseRequest?.settledAt));

    addSectionHeader(doc, "Script");
    addKeyValue(doc, "Title", script?.title);
    addKeyValue(doc, "Script ID", script?.sid || script?._id);
    addKeyValue(doc, "Price", formatCurrency(purchaseRequest?.amount || script?.price || 0));

    addSectionHeader(doc, "Buyer");
    addKeyValue(doc, "Name", investor?.name);
    addKeyValue(doc, "Email", investor?.email);
    addKeyValue(doc, "Buyer ID", investor?.sid || investor?._id);
    addKeyValue(doc, "Role", investor?.role);

    addSectionHeader(doc, "Writer");
    addKeyValue(doc, "Name", writer?.name);
    addKeyValue(doc, "Email", writer?.email);
    addKeyValue(doc, "Writer ID", writer?.sid || writer?._id);

    addSectionHeader(doc, "Accepted Legal Terms");
    addKeyValue(doc, "Platform Terms Accepted", terms?.platformTermsAccepted ? "Yes" : "No");
    addKeyValue(doc, "Writer Terms Accepted", terms?.writerTermsAccepted ? "Yes" : "No");
    addKeyValue(doc, "Rights Summary Accepted", terms?.rightsSummaryAccepted ? "Yes" : "No");
    addKeyValue(doc, "Legal Disclaimer Accepted", terms?.legalDisclaimerAccepted ? "Yes" : "No");
    addKeyValue(doc, "Custom Writer Terms Accepted", terms?.customWriterTermsAccepted ? "Yes" : "No");
    addKeyValue(doc, "Terms Policy Version", terms?.termsPolicyVersion || "-");
    addKeyValue(doc, "Accepted IP", terms?.acceptedIp || "-");
    addKeyValue(doc, "Accepted User Agent", terms?.acceptedUserAgent || "-");

    addSectionHeader(doc, "Rights & Licensing Snapshot");
    addKeyValue(doc, "Rights Type", rights?.rightsTypeLabel || rights?.rightsType || "-");
    addKeyValue(doc, "Modification Rights", rights?.modificationRightsLabel || rights?.modificationRights || "-");
    addKeyValue(doc, "Payment Structure", rights?.paymentStructureLabel || rights?.paymentStructure || "-");
    addKeyValue(doc, "Negotiation Mode", rights?.negotiationModeLabel || rights?.negotiationMode || "-");
    addKeyValue(doc, "License Duration", rights?.licenseDurationLabel || "-");
    addKeyValue(doc, "Royalty", rights?.royaltySettings?.percentage ? `${rights.royaltySettings.percentage}%` : "Not applicable");

    addSectionHeader(doc, "Buyer Request Note");
    addParagraph(doc, purchaseRequest?.note || "No note provided.");

    addSectionHeader(doc, "Writer Custom Terms Snapshot");
    addParagraph(doc, terms?.customWriterTermsSnapshot || "No custom writer terms were attached.");

    addSectionHeader(doc, "Custom Rights Conditions Snapshot");
    addParagraph(doc, rights?.customConditions || "No custom rights conditions were attached.");

    if (agreementPdfUrl) {
      addSectionHeader(doc, "Related Agreement");
      addParagraph(doc, `Final agreement PDF stored by Ckript: ${agreementPdfUrl}`);
    }

    doc.moveDown(1);
    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .fillColor("#475569")
      .text("This PDF is generated automatically for buyer/legal acceptance tracking and admin records.");

    doc.end();
  });

export const generateAndUploadPurchaseRequestAcceptancePdf = async ({
  purchaseRequest,
  script,
  investor,
  writer,
  agreementPdfUrl = "",
}) => {
  const requestId = String(purchaseRequest?._id || "").trim();
  if (!requestId) {
    throw new Error("Purchase request id is required to generate acceptance PDF.");
  }

  const pdfBuffer = await createPurchaseRequestAcceptancePdfBuffer({
    purchaseRequest,
    script,
    investor,
    writer,
    agreementPdfUrl,
  });

  const uploadResult = await uploadToCloudinary(pdfBuffer, {
    folder: "scriptbridge/purchase-request-acceptance",
    resource_type: "raw",
    public_id: `purchase-request-acceptance-${requestId}`,
    originalFilename: `purchase-request-acceptance-${requestId}.pdf`,
    mimeType: "application/pdf",
  });

  return {
    url: uploadResult?.secure_url || "",
    publicId: uploadResult?.public_id || "",
    generatedAt: new Date(),
  };
};
