import fs from "fs";
import path from "path";
import { Writable } from "stream";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { CONTACTS } from "./companyContacts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Real filenames, checked against client/public. These previously pointed at "cklogo-nobg.png" and
// "cklogo.png", neither of which exists, so pickLogoPath() always returned undefined and every
// invoice silently rendered the plain-text fallback instead of the logo.
//
// The fallback is still load-bearing: this path reaches out of server/ into client/public, which
// will not resolve on a server-only deploy.
const logoCandidates = [
  path.join(__dirname, "..", "..", "client", "public", "ckript-logo-official-nobg.png"),
  path.join(__dirname, "..", "..", "client", "public", "ckript_logo_no_bg.png"),
  path.join(__dirname, "..", "..", "client", "public", "ckript-logo-landscape-nobg.png"),
];

const COMPANY_NAME = process.env.COMPANY_NAME || "CKRIPT";
// Read at RENDER time via CONTACTS, not captured here: dotenv.config() runs in server.js's body,
// which is after every import in the graph has already been evaluated, so a module-level
// `process.env.COMPANY_EMAIL` is always undefined and the fallback wins permanently. This line used
// to be exactly that, which is why invoices kept printing the old gmail address.
const COMPANY_LOCATION = process.env.COMPANY_LOCATION || "Pune, Maharashtra, India";
const FOUNDER_NAME = process.env.FOUNDER_NAME || "Yash";

// The currency is a PARAMETER, not a constant. Competition registration is charged in INR or USD
// depending on what the entrant picked at checkout, and a hardcoded "INR" prefix would have printed
// a $2 entry fee as "INR 2.00" — a document stating the wrong currency is worse than none.
const asCurrency = (value = 0, currency = "INR") =>
  `${String(currency || "INR").toUpperCase()} ${Number(value || 0).toFixed(2)}`;
const asDate = (value) => new Date(value || Date.now()).toLocaleString();
const toSafeText = (value, fallback = "-") => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
};
const isWriterPayoutRow = (row = {}) => {
  const item = String(row?.item || "").trim().toLowerCase();
  const type = String(row?.type || "").trim().toLowerCase();
  return item === "writer payout" || type === "settlement";
};

const pickLogoPath = () => logoCandidates.find((candidate) => fs.existsSync(candidate));

/**
 * Render an invoice to PDF and upload it.
 *
 * `details` and `summary` exist because this document now serves two different purchases. A script
 * invoice describes a project (title, SID, access tier); a competition-registration invoice has no
 * script at all, and printing "Script SID: -" beside an empty project panel would look like a bug
 * in the buyer's tax record. Callers that omit them get the original script-shaped layout, so the
 * script path is unchanged.
 */
export const generateAndSaveInvoicePdf = async ({
  invoice,
  creatorName,
  creatorEmail,
  creatorSid,
  scriptTitle,
  scriptSid,
  details,
  summary,
}) => {
  if (!invoice?._id || !invoice?.invoiceNumber) {
    throw new Error("Invoice details are required to generate PDF");
  }

  const safeInvoiceNumber = String(invoice.invoiceNumber).replace(/[^a-zA-Z0-9-_]/g, "_");
  const logoPath = pickLogoPath();
  const resolvedCreatorSid = creatorSid || invoice.creatorSid || "-";
  const resolvedScriptSid = scriptSid || invoice.scriptSid || "-";
  const resolvedCreatorName = toSafeText(creatorName);
  const resolvedCreatorEmail = toSafeText(creatorEmail, "");
  const resolvedScriptTitle = toSafeText(scriptTitle);
  const resolvedInvoiceId = toSafeText(invoice._id);
  const resolvedCreatorId = toSafeText(invoice.creator?._id || invoice.creator);
  const resolvedScriptId = toSafeText(invoice.script?._id || invoice.script);
  const resolvedPaymentReference = toSafeText(invoice.paymentReference || "", "Pending");
  const issuedAt = asDate(invoice.invoiceDate || invoice.createdAt);

  const pdfBuffer = await new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: "A4", margin: 42 });
    doc.on("error", reject);
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.pipe(new Writable({
      write(_chunk, _enc, cb) {
        cb();
      },
    }));

    const pageWidth = doc.page.width;
    const left = 42;
    const right = pageWidth - 42;
    const contentWidth = right - left;
    const pageBottom = doc.page.height - 42;
    let y = 40;

    const drawRoundedBox = (x, boxY, width, height, fill, stroke = null, radius = 10) => {
      doc.save();
      doc.roundedRect(x, boxY, width, height, radius);
      if (fill) doc.fill(fill);
      if (stroke) {
        doc.roundedRect(x, boxY, width, height, radius).lineWidth(0.8).stroke(stroke);
      }
      doc.restore();
    };

    const ensureSpace = (required, redrawHeader) => {
      if (y + required <= pageBottom) return;
      doc.addPage();
      y = 40;
      if (typeof redrawHeader === "function") {
        redrawHeader();
      }
    };

    const drawKeyValue = (x, textY, label, value, width, align = "left") => {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569").text(`${label}:`, x, textY, { width, align });
      const labelHeight = doc.heightOfString(`${label}:`, { width, align });
      doc.font("Helvetica").fontSize(9.5).fillColor("#0F172A").text(toSafeText(value), x, textY + labelHeight + 1, { width, align });
      const valueHeight = doc.heightOfString(toSafeText(value), { width, align });
      return labelHeight + valueHeight + 5;
    };

    // Header block
    const headerHeight = 146;
    drawRoundedBox(left, y, contentWidth, headerHeight, "#F8FBFF", "#DCE7F4", 12);

    if (logoPath) {
      try {
        doc.image(logoPath, left + 16, y + 16, { fit: [132, 40], align: "left" });
      } catch {
        doc.font("Helvetica-Bold").fontSize(24).fillColor("#0F2A4A").text(COMPANY_NAME, left + 16, y + 22);
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(24).fillColor("#0F2A4A").text(COMPANY_NAME, left + 16, y + 22);
    }

    doc.font("Helvetica").fontSize(10).fillColor("#334155").text(CONTACTS.company, left + 16, y + 74, { width: 260 });
    doc.text(COMPANY_LOCATION, left + 16, y + 90, { width: 260 });

    const invoiceMetaX = right - 240;
    const invoiceMetaW = 220;
    doc.font("Helvetica-Bold").fontSize(32).fillColor("#0B1D3A").text("INVOICE", invoiceMetaX, y + 10, {
      width: invoiceMetaW,
      align: "right",
    });

    let metaY = y + 58;
    metaY += drawKeyValue(invoiceMetaX, metaY, "Invoice No", invoice.invoiceNumber, invoiceMetaW, "right");
    metaY += drawKeyValue(invoiceMetaX, metaY, "Issued", issuedAt, invoiceMetaW, "right");
    drawKeyValue(invoiceMetaX, metaY, "Invoice ID", resolvedInvoiceId, invoiceMetaW, "right");

    y += headerHeight + 16;

    // Party and project cards
    const gap = 14;
    const colW = (contentWidth - gap) / 2;
    const cardTextW = colW - 24;

    const leftLines = [
      resolvedCreatorName,
      resolvedCreatorEmail || "-",
      `Buyer SID: ${resolvedCreatorSid}`,
      `Buyer ID: ${resolvedCreatorId}`,
    ];

    const invoiceCurrency = invoice.currency || "INR";

    const detailsTitle = details?.title || "Project Details";
    const rightLines = details?.lines || [
      resolvedScriptTitle,
      `Script SID: ${resolvedScriptSid}`,
      `Content ID: ${resolvedScriptId}`,
      invoice.accessType === "premium"
        ? `Access: Premium (${asCurrency(invoice.scriptPrice || 0, invoiceCurrency)})`
        : "Access: Free",
      `Payment Ref: ${resolvedPaymentReference}`,
    ];

    const measureCardHeight = (title, lines) => {
      let h = 34;
      doc.font("Helvetica-Bold").fontSize(12);
      h += doc.heightOfString(title, { width: cardTextW }) + 8;
      doc.font("Helvetica").fontSize(10);
      lines.forEach((line) => {
        h += doc.heightOfString(toSafeText(line), { width: cardTextW }) + 4;
      });
      return Math.max(120, h + 10);
    };

    const leftCardH = measureCardHeight("Bill To", leftLines);
    const rightCardH = measureCardHeight(detailsTitle, rightLines);
    const cardsH = Math.max(leftCardH, rightCardH);

    drawRoundedBox(left, y, colW, cardsH, "#FFFFFF", "#DFE8F5", 10);
    drawRoundedBox(left + colW + gap, y, colW, cardsH, "#FFFFFF", "#DFE8F5", 10);

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0F172A").text("Bill To", left + 12, y + 12, { width: cardTextW });
    let lineY = y + 34;
    doc.font("Helvetica").fontSize(10).fillColor("#334155");
    leftLines.forEach((line) => {
      doc.text(toSafeText(line), left + 12, lineY, { width: cardTextW });
      lineY += doc.heightOfString(toSafeText(line), { width: cardTextW }) + 4;
    });

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0F172A").text(detailsTitle, left + colW + gap + 12, y + 12, { width: cardTextW });
    lineY = y + 34;
    doc.font("Helvetica").fontSize(10).fillColor("#334155");
    rightLines.forEach((line) => {
      doc.text(toSafeText(line), left + colW + gap + 12, lineY, { width: cardTextW });
      lineY += doc.heightOfString(toSafeText(line), { width: cardTextW }) + 4;
    });

    y += cardsH + 18;

    // Table
    const tableX = left;
    const tableW = contentWidth;
    const itemW = Math.round(tableW * 0.56);
    const typeW = Math.round(tableW * 0.18);
    const amountW = tableW - itemW - typeW;

    const drawTableHeader = () => {
      drawRoundedBox(tableX, y, tableW, 28, "#0F2A4A", null, 8);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#FFFFFF");
      doc.text("ITEM", tableX + 10, y + 9, { width: itemW - 14 });
      doc.text("TYPE", tableX + itemW + 4, y + 9, { width: typeW - 8 });
      doc.text("AMOUNT", tableX + itemW + typeW + 4, y + 9, { width: amountW - 10, align: "right" });
      y += 34;
    };

    drawTableHeader();

    const rows = Array.isArray(invoice.rows)
      ? invoice.rows.filter((row) => !isWriterPayoutRow(row))
      : [];
    if (!rows.length) {
      doc.font("Helvetica").fontSize(10).fillColor("#64748B").text("No line items available.", tableX + 10, y + 8, {
        width: tableW - 20,
      });
      y += 32;
    }

    rows.forEach((row, idx) => {
      const itemTitle = `${idx + 1}. ${toSafeText(row.item, "Item")}`;
      const itemDetail = toSafeText(row.detail, "");
      const itemBlock = itemDetail ? `${itemTitle}\n${itemDetail}` : itemTitle;
      const typeText = toSafeText(row.type);
      const amountText = toSafeText(row.amountLabel);

      doc.font("Helvetica-Bold").fontSize(10);
      const itemTitleHeight = doc.heightOfString(itemTitle, { width: itemW - 16 });
      doc.font("Helvetica").fontSize(9.5);
      const itemBlockHeight = doc.heightOfString(itemBlock, { width: itemW - 16 });
      const typeHeight = doc.heightOfString(typeText, { width: typeW - 8 });
      const amountHeight = doc.heightOfString(amountText, { width: amountW - 10 });
      const rowHeight = Math.max(34, itemBlockHeight + 10, typeHeight + 10, amountHeight + 10);

      ensureSpace(rowHeight + 130, drawTableHeader);

      doc.save();
      doc.rect(tableX, y - 2, tableW, rowHeight).fill(idx % 2 === 0 ? "#F8FAFC" : "#FFFFFF");
      doc.restore();

      doc.font("Helvetica-Bold").fontSize(10).fillColor("#0F172A").text(itemTitle, tableX + 10, y + 4, {
        width: itemW - 16,
      });

      if (itemDetail) {
        doc.font("Helvetica").fontSize(9.5).fillColor("#64748B").text(itemDetail, tableX + 10, y + 6 + itemTitleHeight, {
          width: itemW - 16,
        });
      }

      doc.font("Helvetica").fontSize(9.5).fillColor("#334155").text(typeText, tableX + itemW + 4, y + 4, {
        width: typeW - 8,
      });

      doc.font("Helvetica-Bold").fontSize(10).fillColor("#0F172A").text(amountText, tableX + itemW + typeW + 4, y + 4, {
        width: amountW - 10,
        align: "right",
      });

      doc.save();
      doc.moveTo(tableX, y + rowHeight).lineTo(tableX + tableW, y + rowHeight).lineWidth(0.6).strokeColor("#E2E8F0").stroke();
      doc.restore();

      y += rowHeight + 4;
    });

    y += 6;
    ensureSpace(176);

    // Footer meta and summary cards
    const summaryW = 252;
    const metaW = contentWidth - summaryW - 14;
    const footerCardH = 120;

    drawRoundedBox(left, y, metaW, footerCardH, "#FFFFFF", "#DFE8F5", 10);
    drawRoundedBox(left + metaW + 14, y, summaryW, footerCardH, "#F8FBFF", "#DCE7F4", 10);

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0F172A").text("Transaction Metadata", left + 12, y + 12, { width: metaW - 24 });
    doc.font("Helvetica").fontSize(9.5).fillColor("#334155");
    doc.text(`Invoice ID: ${resolvedInvoiceId}`, left + 12, y + 32, { width: metaW - 24 });
    doc.text(`Payment Ref: ${resolvedPaymentReference}`, left + 12, y + 48, { width: metaW - 24 });
    doc.text(`Content ID: ${resolvedScriptId}`, left + 12, y + 64, { width: metaW - 24 });
    doc.text(`Buyer ID: ${resolvedCreatorId}`, left + 12, y + 80, { width: metaW - 24 });

    const summaryX = left + metaW + 26;
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0F172A").text("Summary", summaryX, y + 12, { width: summaryW - 36 });
    doc.font("Helvetica-Bold").fillColor("#0F172A").text(
      summary
        ? `${summary.label}: ${asCurrency(summary.value || 0, invoiceCurrency)}`
        : `Net Per Premium Sale: ${asCurrency(invoice.writerEarnsPerSale || 0, invoiceCurrency)}`,
      summaryX, y + 36, {
      width: summaryW - 36,
    });

    y += footerCardH + 14;

    // Signature
    ensureSpace(72);
    doc.font("Helvetica").fontSize(9).fillColor("#64748B").text("Authorized by", left, y);
    doc.font("Helvetica-Oblique").fontSize(22).fillColor("#0F172A").text(FOUNDER_NAME, left, y + 10);
    doc.save();
    doc.moveTo(left, y + 42).lineTo(left + 178, y + 42).lineWidth(0.8).strokeColor("#94A3B8").stroke();
    doc.restore();
    doc.font("Helvetica").fontSize(9).fillColor("#475569").text(`Founder, ${COMPANY_NAME}`, left, y + 47);

    doc.end();
  });

  const uploadResult = await uploadToCloudinary(pdfBuffer, {
    folder: "scriptbridge/invoices",
    resource_type: "raw",
    public_id: `invoice-${safeInvoiceNumber}-${invoice._id}`,
    originalFilename: `${safeInvoiceNumber}.pdf`,
    mimeType: "application/pdf",
  });

  return {
    absolutePath: "",
    relativePath: uploadResult.secure_url,
    secureUrl: uploadResult.secure_url,
    publicId: uploadResult.public_id,
  };
};
