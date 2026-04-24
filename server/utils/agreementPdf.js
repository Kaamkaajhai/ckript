import { Writable } from "stream";
import PDFDocument from "pdfkit";
import { uploadToCloudinary } from "../config/cloudinary.js";

const PARTY_LABEL = {
  writer: "Writer Agreement Copy",
  buyer: "Buyer Agreement Copy",
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

const toSafeText = (value, fallback = "-") => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const normalizeMultiLine = (value, fallback = "-") => {
  const clean = toSafeText(value, fallback);
  return clean.replace(/\r\n/g, "\n");
};

const addTitle = (doc, text) => {
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0F172A").text(text, { align: "left" });
  doc.moveDown(0.5);
};

const addSectionHeader = (doc, text) => {
  doc.moveDown(0.35);
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#0F172A").text(text);
  doc.moveDown(0.25);
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

const addParagraph = (doc, text) => {
  doc.font("Helvetica").fontSize(10).fillColor("#1E293B").text(normalizeMultiLine(text), {
    lineGap: 2,
  });
};

const createAgreementPdfBuffer = async ({ party, agreement }) => {
  return new Promise((resolve, reject) => {
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

    const terms = agreement?.terms_json || {};
    const script = terms?.script || {};
    const writer = terms?.writer || {};
    const buyer = terms?.buyer || {};
    const rights = terms?.rights || {};
    const payment = terms?.payment || {};

    addTitle(doc, "Ckript Script Rights Agreement");
    addKeyValue(doc, "Document Type", PARTY_LABEL[party] || "Agreement Copy");
    addKeyValue(doc, "Agreement ID", agreement?._id);
    addKeyValue(doc, "Generated At", formatDateTime(new Date()));
    addKeyValue(doc, "Status", agreement?.status || "active");

    addSectionHeader(doc, "Script Details");
    addKeyValue(doc, "Script Title", script?.title);
    addKeyValue(doc, "Script ID", script?.scriptId || script?.sid);
    addKeyValue(doc, "Genre", script?.genre);

    addSectionHeader(doc, "Parties");
    addKeyValue(doc, "Writer", writer?.name);
    addKeyValue(doc, "Writer ID", writer?.userId || writer?.sid);
    addKeyValue(doc, "Buyer", buyer?.name);
    addKeyValue(doc, "Buyer ID", buyer?.userId || buyer?.sid);

    addSectionHeader(doc, "Rights and Licensing");
    addKeyValue(doc, "Rights Type", rights?.rightsTypeLabel || rights?.rightsType);
    addKeyValue(doc, "Exclusivity", rights?.exclusivityClause || "Exclusive - no parallel sales while active");
    addKeyValue(doc, "Modification Rights", rights?.modificationRightsLabel || rights?.modificationRights);
    addKeyValue(doc, "Negotiation Mode", rights?.negotiationModeLabel || rights?.negotiationMode);

    if (rights?.licenseDurationLabel) {
      addKeyValue(doc, "License Duration", rights.licenseDurationLabel);
    }
    if (rights?.licenseExpiryAt) {
      addKeyValue(doc, "License Expiry", formatDateTime(rights.licenseExpiryAt));
    }
    if (rights?.autoRevertToWriter !== undefined) {
      addKeyValue(doc, "Auto Revert To Writer", rights.autoRevertToWriter ? "Yes" : "No");
    }

    addSectionHeader(doc, "Payment and Royalties");
    addKeyValue(doc, "Payment Structure", payment?.paymentStructureLabel || payment?.paymentStructure);
    addKeyValue(doc, "Base Amount", payment?.baseAmountLabel || payment?.baseAmount);
    addKeyValue(doc, "Platform Charges", payment?.platformChargesLabel || payment?.platformCharges);
    addKeyValue(doc, "Total Amount", payment?.totalAmountLabel || payment?.totalAmount);

    if (payment?.royaltyTerms) {
      addKeyValue(doc, "Royalty Terms", payment.royaltyTerms);
    }

    if (rights?.customConditions) {
      addSectionHeader(doc, "Custom Conditions");
      addParagraph(doc, rights.customConditions);
    }

    addSectionHeader(doc, "Digital Acknowledgement");
    addKeyValue(doc, "Writer Acknowledged", formatDateTime(agreement?.consent_logs?.writer?.acknowledgedAt));
    addKeyValue(doc, "Buyer Acknowledged", formatDateTime(agreement?.consent_logs?.buyer?.acknowledgedAt));
    addKeyValue(doc, "Consent Timestamp", formatDateTime(terms?.consentTimestamp || agreement?.createdAt));

    addSectionHeader(doc, `Platform Terms (${toSafeText(agreement?.terms_policy_version, "unversioned")})`);
    addParagraph(doc, agreement?.terms_json?.platformTermsContent || "No platform terms content attached.");

    doc.moveDown(1);
    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .fillColor("#475569")
      .text("This document is system-generated and stored by Ckript for record-keeping.");

    doc.end();
  });
};

const uploadAgreementPdf = async ({ buffer, publicId }) => {
  const uploadResult = await uploadToCloudinary(buffer, {
    folder: "scriptbridge/agreements",
    resource_type: "raw",
    public_id: publicId,
    originalFilename: `${publicId}.pdf`,
    mimeType: "application/pdf",
  });

  return {
    url: uploadResult?.secure_url || "",
    publicId: uploadResult?.public_id || "",
  };
};

export const generateAndUploadAgreementPdfs = async ({ agreement }) => {
  const agreementId = String(agreement?._id || "").trim();
  if (!agreementId) {
    throw new Error("Agreement id is required to generate PDFs.");
  }

  const writerBuffer = await createAgreementPdfBuffer({ party: "writer", agreement });
  const buyerBuffer = await createAgreementPdfBuffer({ party: "buyer", agreement });

  const writerUpload = await uploadAgreementPdf({
    buffer: writerBuffer,
    publicId: `agreement-writer-${agreementId}`,
  });

  const buyerUpload = await uploadAgreementPdf({
    buffer: buyerBuffer,
    publicId: `agreement-buyer-${agreementId}`,
  });

  return {
    writerPdfUrl: writerUpload.url,
    writerPdfPublicId: writerUpload.publicId,
    buyerPdfUrl: buyerUpload.url,
    buyerPdfPublicId: buyerUpload.publicId,
  };
};
