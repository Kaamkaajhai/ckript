import { Writable } from "stream";
import PDFDocument from "pdfkit";
// PDF classification rides the ONE classifier (classify.js — a copy of the client's, kept in
// lockstep by the parity test) so the PDF renders a line exactly as the editor/viewer do. The
// formatter (normalization) stays in screenplayParser.js.
import { formatScreenplayLikeText } from "./screenplayParser.js";
import { textToBlocks, parseInlineEmphasis } from "./classify.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// US screenplay standard: US Letter, 12pt Courier, 1" top/bottom/right, 1.5" left.
const PT = 72; // points per inch
const PAGE = { width: 8.5 * PT, height: 11 * PT };
const MARGIN = { top: 1 * PT, bottom: 1 * PT, left: 1.5 * PT, right: 1 * PT };
const FONT_REGULAR_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Regular.ttf");
const FONT_BOLD_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Bold.ttf");
const FONT_ITALIC_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Italic.ttf");
const FONT_BOLD_ITALIC_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-BoldItalic.ttf");

const FONT = "CourierPrime";
const FONT_BOLD = "CourierPrime-Bold";
const FONT_ITALIC = "CourierPrime-Italic";
const FONT_BOLD_ITALIC = "CourierPrime-BoldItalic";
const FONT_SIZE = 12;
const LINE = FONT_SIZE; // single-spaced
const CONTENT_RIGHT = PAGE.width - MARGIN.right;
const ACTION_WIDTH = CONTENT_RIGHT - MARGIN.left;

// Element layout, measured from the page left edge (industry-standard indents).
const LAYOUT = {
  scene: { x: MARGIN.left, width: ACTION_WIDTH, bold: true, upper: true, before: LINE, after: LINE },
  shot: { x: MARGIN.left, width: ACTION_WIDTH, bold: true, upper: true, before: LINE, after: 0 },
  action: { x: MARGIN.left, width: ACTION_WIDTH, before: 0, after: LINE },
  character: { x: 3.7 * PT, width: 2.5 * PT, upper: true, before: LINE, after: 0 },
  // dual-dialogue cue — Stage 1 renders stacked like a normal cue (the ^ is already stripped by
  // textToBlocks); true side-by-side columns are a later pass.
  dual: { x: 3.7 * PT, width: 2.5 * PT, upper: true, before: LINE, after: 0 },
  parenthetical: { x: 3.1 * PT, width: 2.0 * PT, before: 0, after: 0 },
  dialogue: { x: 2.5 * PT, width: 3.3 * PT, before: 0, after: LINE },
  transition: { x: MARGIN.left, width: ACTION_WIDTH, upper: true, align: "right", before: LINE, after: LINE },
  frontmatter: { x: MARGIN.left, width: ACTION_WIDTH, align: "center", before: 0, after: LINE * 0.5 },
  // Stage 2: act breaks centered + underlined with generous air (matches the editor); sequence
  // headers print as quiet subordinate structure; lyrics italic at the dialogue indent.
  act: { x: MARGIN.left, width: ACTION_WIDTH, bold: true, upper: true, align: "center", underline: true, before: LINE * 2, after: LINE * 1.5 },
  endact: { x: MARGIN.left, width: ACTION_WIDTH, bold: true, upper: true, align: "center", underline: true, before: LINE * 2, after: LINE * 1.5 },
  sequence: { x: MARGIN.left, width: ACTION_WIDTH, bold: true, upper: true, before: LINE * 1.5, after: LINE * 0.5 },
  lyrics: { x: 2.5 * PT, width: 3.3 * PT, italic: true, before: 0, after: LINE },
};

const drawWatermark = (doc, watermark) => {
  const label = String(watermark || "").trim();
  if (!label) return;
  doc.save();
  doc.rotate(-45, { origin: [PAGE.width / 2, PAGE.height / 2] });
  doc.font(FONT_BOLD).fontSize(46).fillColor("#000000").fillOpacity(0.07);
  const text = `${label}   ${label}   ${label}`;
  for (let row = -2; row <= 2; row += 1) {
    doc.text(text, -PAGE.width * 0.5, PAGE.height / 2 + row * 120, {
      width: PAGE.width * 2,
      align: "center",
      lineBreak: false,
    });
  }
  doc.restore();
  doc.fillOpacity(1).fillColor("#111111");
};

const drawPageNumber = (doc, n) => {
  doc.font(FONT).fontSize(10).fillColor("#111111").fillOpacity(1);
  doc.text(`${n}.`, MARGIN.left, MARGIN.top - 22, {
    width: ACTION_WIDTH,
    align: "right",
    lineBreak: false,
  });
};

/**
 * Render a screenplay (Fountain / plain script text) to a properly formatted PDF buffer.
 * @param {string} scriptText - canonical Fountain / screenplay text
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.author]
 * @param {object} [opts.titlePage] - industry title-page fields { title, credit, author, source, draftDate }
 * @param {string} [opts.watermark] - per-page identity stamp (e.g. buyer email)
 * @returns {Promise<Buffer>}
 */
export const generateScreenplayPdf = (scriptText, opts = {}) =>
  new Promise((resolve, reject) => {
    const { title, author, watermark } = opts;
    // Title page can come as the structured object (preferred) or be synthesized from title/author.
    const tp = opts.titlePage && typeof opts.titlePage === "object" ? opts.titlePage : null;
    const blocks = textToBlocks(formatScreenplayLikeText(scriptText));

    const doc = new PDFDocument({
      size: [PAGE.width, PAGE.height],
      bufferPages: true,
      margins: { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: MARGIN.right },
    });

    // PDFKit parses a registered font LAZILY, so a missing or damaged TTF does not throw at
    // registerFont — it throws at the first doc.font() call and fails the whole export with
    // "Unknown font format". Register, then force the parse immediately so the problem is caught
    // here, and fall back to PDFKit's built-in Courier family (the standard screenplay face) so a
    // bad font asset degrades the typeface instead of taking PDF export down entirely.
    try {
      doc.registerFont(FONT, FONT_REGULAR_PATH);
      doc.registerFont(FONT_BOLD, FONT_BOLD_PATH);
      doc.registerFont(FONT_ITALIC, FONT_ITALIC_PATH);
      doc.registerFont(FONT_BOLD_ITALIC, FONT_BOLD_ITALIC_PATH);
      for (const face of [FONT, FONT_BOLD, FONT_ITALIC, FONT_BOLD_ITALIC]) doc.font(face);
    } catch (err) {
      console.warn(`[screenplayPdf] CourierPrime unusable (${err?.message || err}); using built-in Courier.`);
      doc.registerFont(FONT, "Courier");
      doc.registerFont(FONT_BOLD, "Courier-Bold");
      doc.registerFont(FONT_ITALIC, "Courier-Oblique");
      doc.registerFont(FONT_BOLD_ITALIC, "Courier-BoldOblique");
    }

    const chunks = [];
    doc.on("error", reject);
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.pipe(new Writable({ write(_c, _e, cb) { cb(); } }));

    const bottomLimit = PAGE.height - MARGIN.bottom;
    let y = MARGIN.top;

    const ensureSpace = (needed) => {
      if (y + needed > bottomLimit) {
        doc.addPage();
        y = MARGIN.top;
      }
    };

    // Title page — industry layout: TITLE centered upper-third, "Credit" + Author centered just
    // below, and Source / Draft date lower on the page. Falls back to title/author when no structured
    // titlePage was given. Rendered on its own page; the body starts on a fresh page after it.
    const tpTitle = (tp?.title || title || "").trim();
    const tpCredit = (tp?.credit || (author ? "Written by" : "")).trim();
    const tpAuthor = (tp?.author || author || "").trim();
    const tpSource = (tp?.source || "").trim();
    const tpDraft = (tp?.draftDate || "").trim();
    const tpContact = (tp?.contact || tp?.Contact || "").trim();
    if (tpTitle || tpAuthor || tpSource || tpDraft || tpContact) {
      const cx = MARGIN.left;
      doc.fillColor("#111111").fillOpacity(1);
      let ty = PAGE.height * 0.38;
      if (tpTitle) {
        doc.font(FONT_BOLD).fontSize(FONT_SIZE);
        doc.text(tpTitle.toUpperCase(), cx, ty, { width: ACTION_WIDTH, align: "center" });
        ty += LINE * 2.4;
      }
      if (tpCredit) {
        doc.font(FONT).fontSize(FONT_SIZE);
        doc.text(tpCredit, cx, ty, { width: ACTION_WIDTH, align: "center" });
        ty += LINE * 1.2;
      }
      if (tpAuthor) {
        doc.font(FONT).fontSize(FONT_SIZE);
        doc.text(tpAuthor, cx, ty, { width: ACTION_WIDTH, align: "center" });
        ty += LINE * 1.4;
      }
      if (tpSource) {
        doc.font(FONT).fontSize(FONT_SIZE);
        doc.text(tpSource, cx, ty, { width: ACTION_WIDTH, align: "center" });
      }
      // Draft date sits low on the page (industry bottom-left)
      let bottomY = PAGE.height * 0.78;
      if (tpDraft) {
        doc.font(FONT).fontSize(FONT_SIZE);
        doc.text(tpDraft, cx, bottomY, { width: ACTION_WIDTH, align: "left" });
        bottomY += doc.heightOfString(tpDraft, { width: ACTION_WIDTH }) + LINE;
      }
      if (tpContact) {
        doc.font(FONT).fontSize(FONT_SIZE);
        doc.text(tpContact, cx, bottomY, { width: ACTION_WIDTH, align: "left" });
      }
      doc.addPage();
      y = MARGIN.top;
    }

    for (const block of blocks) {
      const cfg = LAYOUT[block.type];
      if (!cfg) {
        // spacer or unknown — advance a line
        y += LINE;
        continue;
      }

      let text = String(block.text || "");
      if (cfg.upper) text = text.toUpperCase();
      if (!text.trim()) {
        y += LINE;
        continue;
      }

      // ">words<" centers the line (block.centered from the classifier); otherwise use the element's
      // own alignment. Inline emphasis (*italic* **bold** ***both*** _underline_) renders as styled
      // runs so the downloaded PDF matches the editor and the on-screen viewer exactly.
      const align = block.centered ? "center" : (cfg.align || "left");
      const runs = parseInlineEmphasis(text);
      const plain = runs.map((r) => r.text).join(""); // marker-free; Courier is monospace so metrics match

      doc.fillColor("#111111").fillOpacity(1);
      doc.font(cfg.bold ? FONT_BOLD : cfg.italic ? FONT_ITALIC : FONT).fontSize(FONT_SIZE);
      const height = doc.heightOfString(plain, { width: cfg.width, align, lineGap: 0 });

      ensureSpace((cfg.before || 0) + height);
      y += cfg.before || 0;
      // Render inline emphasis as continued styled runs. pdfkit wraps a continued sequence correctly
      // ONLY when the layout options (x/y/width/align) are given on the FIRST piece and omitted on the
      // continuations — otherwise each run re-anchors and breaks onto its own line.
      for (let ri = 0; ri < runs.length; ri += 1) {
        const r = runs[ri];
        const bold = Boolean(cfg.bold) || r.bold;
        const italic = Boolean(cfg.italic) || r.italic;
        doc.font(bold && italic ? FONT_BOLD_ITALIC : bold ? FONT_BOLD : italic ? FONT_ITALIC : FONT).fontSize(FONT_SIZE);
        const continued = ri < runs.length - 1;
        const underline = Boolean(cfg.underline) || r.underline;
        if (ri === 0) {
          doc.text(r.text, cfg.x, y, { width: cfg.width, align, lineGap: 0, continued, underline });
        } else {
          doc.text(r.text, { continued, underline });
        }
      }
      y += height + (cfg.after || 0);
    }

    // Post-pass: watermark + page numbers on every page.
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      drawWatermark(doc, watermark);
      // Number every page after the first content page (skip the title page if present)
      const pageNo = title ? i : i + 1;
      if (pageNo >= 1) drawPageNumber(doc, pageNo);
    }

    doc.end();
  });
