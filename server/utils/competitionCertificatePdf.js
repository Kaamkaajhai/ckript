import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Writable } from "stream";
import PDFDocument from "pdfkit";
import { LOGO } from "./brandAssets.js";
import { CONTACTS } from "./companyContacts.js";

// Participation / achievement certificate for a judged competition entry.
//
// Deliberately built on PDFKit's standard-14 faces (Helvetica) with NO registerFont call — every
// business document in this repo does the same, and it sidesteps the corrupt-font class of failure
// entirely (PDFKit parses registered fonts lazily, so a damaged TTF throws at first use, not at
// registration). Only the screenplay exporter needs real Courier Prime.
//
// Generated per request and returned as a Buffer: a certificate is cheap to render, always
// reproducible from the entry, and this avoids a hard dependency on Cloudinary env vars.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Real files, checked against client/public. invoicePdf.js points at two names that do not exist,
// which is why every invoice silently falls back to plain text — don't inherit that.

const COMPANY_NAME = process.env.COMPANY_NAME || "CKRIPT";
// Read at RENDER time via CONTACTS rather than captured here — see the note in companyContacts.js:
// dotenv.config() runs after every import is evaluated, so a module-level env read never sees .env.
const FOUNDER_NAME = process.env.FOUNDER_NAME || "Yash";

const ACCENT = "#D14D37";
const INK = "#111111";
const MUTED = "#6b6b6b";

const AWARD_TITLES = {
  winner: "Winner",
  runner_up: "Runner-Up",
  special: "Special Award",
  participant: "Certificate of Participation",
  none: "Certificate of Participation",
};

const pickLogo = () => LOGO.path;

const safe = (value, fallback = "") => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

/**
 * @returns {Promise<Buffer>} a single-page A4 landscape certificate.
 */
export const generateCompetitionCertificate = async ({
  writerName,
  competitionName,
  scriptTitle = "",
  award = "participant",
  specialTitle = "",
  eventId = "",
  declaredAt = null,
  stats = {},
} = {}) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    // Landscape: a certificate reads as a wall document, not a letter.
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });

    doc.on("error", reject);
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    // The null sink is load-bearing: pdfkit is a readable stream and nothing flows without a consumer.
    doc.pipe(new Writable({ write(_chunk, _enc, cb) { cb(); } }));

    const W = doc.page.width;
    const H = doc.page.height;

    // ── Border ────────────────────────────────────────────────────────────
    doc.save();
    doc.rect(0, 0, W, H).fill("#ffffff");
    doc.lineWidth(6).strokeColor(ACCENT).rect(22, 22, W - 44, H - 44).stroke();
    doc.lineWidth(1).strokeColor("#e2e2e2").rect(34, 34, W - 68, H - 68).stroke();
    doc.restore();

    // ── Header ────────────────────────────────────────────────────────────
    let y = 62;
    const logo = pickLogo();
    if (logo) {
      try {
        // Width from the mark's real aspect, so it is centred on its ink rather than on the box a
        // `fit` would have letterboxed it inside.
        const [logoW, logoH] = LOGO.boxForHeight(40);
        doc.image(logo, W / 2 - logoW / 2, y, { width: logoW, height: logoH });
        y += logoH + 10;
      } catch {
        // A missing or unreadable image must never take the certificate down.
        doc.font("Helvetica-Bold").fontSize(18).fillColor(INK)
          .text(COMPANY_NAME, 0, y, { width: W, align: "center" });
        y += 30;
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(18).fillColor(INK)
        .text(COMPANY_NAME, 0, y, { width: W, align: "center" });
      y += 30;
    }

    doc.font("Helvetica").fontSize(10).fillColor(MUTED)
      .text(safe(competitionName, "Global Script Challenge").toUpperCase(), 0, y, {
        width: W, align: "center", characterSpacing: 2,
      });
    y += 34;

    // ── Award title ───────────────────────────────────────────────────────
    const title = award === "special" && specialTitle ? specialTitle : (AWARD_TITLES[award] || AWARD_TITLES.participant);
    doc.font("Helvetica-Bold").fontSize(34).fillColor(ACCENT)
      .text(title, 0, y, { width: W, align: "center" });
    y += 52;

    doc.font("Helvetica").fontSize(12).fillColor(MUTED)
      .text("This is to certify that", 0, y, { width: W, align: "center" });
    y += 26;

    // ── Recipient ─────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(30).fillColor(INK)
      .text(safe(writerName, "Writer"), 60, y, { width: W - 120, align: "center" });
    y += 42;

    // A rule under the name, sized to the page rather than the text.
    doc.lineWidth(1).strokeColor("#dcdcdc")
      .moveTo(W / 2 - 150, y).lineTo(W / 2 + 150, y).stroke();
    y += 22;

    // ── Body ──────────────────────────────────────────────────────────────
    const completed = scriptTitle
      ? `completed and submitted the screenplay “${safe(scriptTitle)}” during the 48-hour writing window of the ${safe(competitionName)}.`
      : `took part in the 48-hour writing window of the ${safe(competitionName)}.`;
    doc.font("Helvetica").fontSize(12).fillColor("#333333")
      .text(completed, 110, y, { width: W - 220, align: "center", lineGap: 4 });
    y += doc.heightOfString(completed, { width: W - 220, lineGap: 4 }) + 18;

    // ── Stats strip ───────────────────────────────────────────────────────
    const cells = [
      ["Pages", stats.pageCount],
      ["Words", stats.wordCount],
      ["Scenes", stats.sceneCount],
    ].filter(([, v]) => Number(v) > 0);

    if (cells.length) {
      const cellW = 120;
      const startX = W / 2 - (cells.length * cellW) / 2;
      cells.forEach(([label, value], i) => {
        const x = startX + i * cellW;
        doc.font("Helvetica-Bold").fontSize(16).fillColor(INK)
          .text(String(value), x, y, { width: cellW, align: "center" });
        doc.font("Helvetica").fontSize(8).fillColor(MUTED)
          .text(label.toUpperCase(), x, y + 20, { width: cellW, align: "center", characterSpacing: 1 });
      });
      y += 46;
    }

    // ── Footer: signature left, verification right ────────────────────────
    const footerY = H - 108;
    doc.lineWidth(1).strokeColor("#cccccc")
      .moveTo(96, footerY).lineTo(266, footerY).stroke();
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK)
      .text(FOUNDER_NAME, 96, footerY + 8, { width: 170, align: "center" });
    doc.font("Helvetica").fontSize(8).fillColor(MUTED)
      .text(`Founder, ${COMPANY_NAME}`, 96, footerY + 22, { width: 170, align: "center" });

    const right = W - 266;
    doc.lineWidth(1).strokeColor("#cccccc")
      .moveTo(right, footerY).lineTo(right + 170, footerY).stroke();
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK)
      .text(formatDate(declaredAt) || formatDate(new Date()), right, footerY + 8, { width: 170, align: "center" });
    doc.font("Helvetica").fontSize(8).fillColor(MUTED)
      .text("Date of issue", right, footerY + 22, { width: 170, align: "center" });

    // The event ID is what makes the certificate checkable against a real entry.
    if (eventId) {
      doc.font("Helvetica").fontSize(8).fillColor(MUTED)
        .text(`Event ID ${eventId}  ·  Verify at ${CONTACTS.company}`, 0, H - 52, { width: W, align: "center" });
    }

    doc.end();
  });
};

export default generateCompetitionCertificate;
