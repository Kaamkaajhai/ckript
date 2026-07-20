import { PDFDocument, rgb, degrees } from 'pdf-lib';

const WATERMARK_TEXT = "CKRIPT   CKRIPT   CKRIPT";

const clampPages = ({ pageCount, startPage = 1, endPage = pageCount } = {}) => {
  const first = Math.max(1, Number(startPage || 1));
  const last = Math.min(pageCount, Math.max(first, Number(endPage || pageCount)));
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
};

export const buildWatermarkedPdfFromPdfBlob = async (blob, options = {}) => {
  const data = await blob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(data);
  const totalPages = pdfDoc.getPageCount();
  
  const pageNumbers = options.pages?.length
    ? options.pages.map((page) => Number(page)).filter((page) => page >= 1 && page <= totalPages)
    : clampPages({ pageCount: totalPages, startPage: options.startPage, endPage: options.endPage });
    
  // We remove pages that are NOT in pageNumbers.
  // We must iterate backwards to remove pages safely.
  for (let i = totalPages - 1; i >= 0; i--) {
    if (!pageNumbers.includes(i + 1)) {
      pdfDoc.removePage(i);
    }
  }
  
  const pages = pdfDoc.getPages();
  if (pages.length === 0) throw new Error("No PDF pages available to watermark.");

  for (const page of pages) {
    const { width, height } = page.getSize();
    const fontSize = Math.max(34, Math.min(54, width * 0.075));
    
    // We center the text by estimating text width (0.6 * fontSize * length)
    const textWidth = WATERMARK_TEXT.length * (fontSize * 0.6);
    
    for (let row = -2; row <= 2; row += 1) {
      page.drawText(WATERMARK_TEXT, {
        x: (width - textWidth) / 2 + 50,
        y: height / 2 - row * 120,
        size: fontSize,
        color: rgb(0, 0, 0),
        opacity: 0.08,
        rotate: degrees(45),
      });
    }
  }

  if (options.title) {
    pdfDoc.setTitle(options.title || "Script");
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
};

export const addCkriptWatermarkToJsPdf = (doc) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.saveGraphicsState();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.max(34, Math.min(54, pageWidth * 0.075)));
  doc.setTextColor(0, 0, 0);
  doc.setGState(new doc.GState({ opacity: 0.08 }));
  for (let row = -2; row <= 2; row += 1) {
    doc.text(WATERMARK_TEXT, pageWidth / 2, pageHeight / 2 + row * 120, {
      align: "center",
      angle: -45,
    });
  }
  doc.restoreGraphicsState();
};
