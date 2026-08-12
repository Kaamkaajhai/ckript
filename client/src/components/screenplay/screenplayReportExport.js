import { jsPDF } from "jspdf";

/*
 * Report downloads shared by the desktop rail and the mobile Reports dialog.
 *
 * The report rows themselves stay in `screenplayReports.js`; this module owns
 * only their file representation. Keeping that boundary means both surfaces
 * export the same columns, headings and filenames without sharing any layout.
 */

const DEFINITIONS = Object.freeze({
  scenes: {
    suffix: "Scenes",
    heading: "Scene Report",
    headers: ["#", "Heading", "Page", "Length (elements)", "Lines"],
    columns: [
      { label: "#", w: 1 },
      { label: "Heading", w: 6 },
      { label: "Page", w: 1.2 },
      { label: "Elements", w: 1.5 },
      { label: "Lines", w: 1.2 },
    ],
    values: (row) => [row.number, row.heading, row.page, row.elements, row.lineLength],
  },
  characters: {
    suffix: "Characters",
    heading: "Character Report",
    headers: ["Character", "Lines", "Scenes", "First", "Last"],
    columns: [
      { label: "Character", w: 4 },
      { label: "Lines", w: 1.5 },
      { label: "Scenes", w: 1.5 },
      { label: "First", w: 1.2 },
      { label: "Last", w: 1.2 },
    ],
    values: (row) => [row.name, row.lines, row.scenes, row.first, row.last],
  },
});

export const safeReportTitle = (title) => String(title || "Script").trim() || "Script";

const reportDefinition = (kind) => {
  const definition = DEFINITIONS[kind];
  if (!definition) throw new Error(`Unknown screenplay report: ${kind}`);
  return definition;
};

// RFC-4180-compatible escaping for the values screenplay reports can contain.
export const reportCsvCell = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const serializeScreenplayReportCsv = (kind, rows = []) => {
  const definition = reportDefinition(kind);
  return [
    definition.headers.map(reportCsvCell).join(","),
    ...rows.map((row) => definition.values(row).map(reportCsvCell).join(",")),
  ].join("\r\n");
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  /* MDN is explicit that `download` suggests a filename; it cannot prove the
     browser completed the download. The UI therefore says "Download", never
     "Saved". */
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const downloadPdf = ({ definition, rows, title, filename }) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - marginX * 2;
  const totalWeight = definition.columns.reduce((total, column) => total + column.w, 0);
  const columnX = [];
  let x = marginX;
  for (const column of definition.columns) {
    columnX.push(x);
    x += (column.w / totalWeight) * usableWidth;
  }
  const rowHeight = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`${title} — ${definition.heading}`, marginX, 48);

  let y = 78;
  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    definition.columns.forEach((column, index) => {
      doc.text(String(column.label).toUpperCase(), columnX[index], y);
    });
    y += 6;
    doc.setDrawColor(180);
    doc.line(marginX, y, marginX + usableWidth, y);
    y += rowHeight - 6;
  };
  drawHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const row of rows.map(definition.values)) {
    if (y + rowHeight > pageHeight - 40) {
      doc.addPage();
      y = 56;
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    definition.columns.forEach((column, index) => {
      const cellWidth = ((column.w / totalWeight) * usableWidth) - 6;
      const text = doc.splitTextToSize(String(row[index] ?? ""), cellWidth)[0] || "";
      doc.text(text, columnX[index], y);
    });
    y += rowHeight;
  }
  doc.save(filename);
};

export const downloadScreenplayReport = ({ kind, format, rows = [], title }) => {
  const definition = reportDefinition(kind);
  const safeTitle = safeReportTitle(title);
  const baseName = `${safeTitle} - ${definition.suffix}`;

  if (format === "csv") {
    const csv = serializeScreenplayReportCsv(kind, rows);
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${baseName}.csv`);
    return;
  }

  if (format === "pdf") {
    downloadPdf({ definition, rows, title: safeTitle, filename: `${baseName}.pdf` });
    return;
  }

  throw new Error(`Unknown screenplay report format: ${format}`);
};
