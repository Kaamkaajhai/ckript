import { Writable } from "stream";
import PDFDocument from "pdfkit";

const PAGE_MARGIN = 72;
const PAGE_SIZE = "A4";
const FONT_NAME = "Courier";
const FONT_SIZE = 12;
const LINE_GAP = 2;

const normalizeScriptText = (value = "") =>
  String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

const drawPageNumber = (doc, pageNumber) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const footerY = pageHeight - PAGE_MARGIN + 18;

  doc
    .font(FONT_NAME)
    .fontSize(10)
    .fillColor("#111111")
    .text(String(pageNumber), PAGE_MARGIN, footerY, {
      width: pageWidth - PAGE_MARGIN * 2,
      align: "right",
      lineBreak: false,
    });
};

export const generateScriptPdf = async (plainText) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: PAGE_SIZE,
      bufferPages: true,
      margins: {
        top: PAGE_MARGIN,
        bottom: PAGE_MARGIN,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
      },
    });
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

    doc.on("pageAdded", () => {
      doc.font(FONT_NAME).fontSize(FONT_SIZE).fillColor("#111111");
    });

    doc.font(FONT_NAME).fontSize(FONT_SIZE).fillColor("#111111");
    doc.text(normalizeScriptText(plainText), {
      align: "left",
      lineGap: LINE_GAP,
    });

    const totalPages = doc.bufferedPageRange().count;
    for (let index = 0; index < totalPages; index += 1) {
      doc.switchToPage(index);
      drawPageNumber(doc, index + 1);
    }

    doc.end();
  });
