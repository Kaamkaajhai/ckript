import { useState } from "react";
import { jsPDF } from "jspdf";
import api from "../../../services/api";
import { fountainToFdx } from "../../../components/screenplay/fdx";

/**
 * Owns the wizard's file exports: the "download main content as PDF" action,
 * the post-submit submission-summary PDF, and the screenplay export menu
 * (.fdx client-side; fountain/PDF/watermarked-PDF via the server). Reads the
 * relevant wizard state (editor, title, scriptId, screenplayValue, user) as
 * args so the export logic lives in one place.
 */
export function usePdfExport({ editor, title, scriptId, screenplayValue, user, setError, enforceGoldPlan }) {
  const [exportingScreenplay, setExportingScreenplay] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const sanitizePdfFileName = (value = "") => {
    const safe = String(value)
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, " ");
    return safe || "script";
  };

  const downloadSubmissionSummaryPdf = async (targetScriptId, currentTitle) => {
    if (!targetScriptId) return;

    const confirmed = window.confirm("Your project was submitted successfully! Would you like to download your submission summary PDF?");
    if (!confirmed) return;

    try {
      const response = await api.get(`/scripts/${targetScriptId}/submission-summary-pdf?download=1`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      const fileBase = sanitizePdfFileName(currentTitle || "script").replace(/\s+/g, "_");

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${fileBase}_submission_summary.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
    } catch {
      // Non-blocking: publishing should still succeed if the browser download fails.
    }
  };

  const handleDownloadMainContentPdf = () => {
    if (!editor) return;

    const plainText = editor.getText({ blockSeparator: "\n\n" }).trim();
    if (!plainText) {
      setError("Write some main content before downloading PDF.");
      return;
    }

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 48;
      const marginTop = 56;
      const lineHeight = 16;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - marginX * 2;
      const usableHeight = pageHeight - marginTop * 2;

      const scriptTitle = title?.trim() || "Untitled Draft";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const titleLines = doc.splitTextToSize(scriptTitle, usableWidth);
      let y = marginTop;
      doc.text(titleLines, marginX, y);
      y += titleLines.length * 22;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const contentLines = doc.splitTextToSize(plainText, usableWidth);

      for (const line of contentLines) {
        if (y + lineHeight > marginTop + usableHeight) {
          doc.addPage();
          y = marginTop;
        }
        doc.text(line, marginX, y);
        y += lineHeight;
      }

      const fileBase = sanitizePdfFileName(scriptTitle);
      doc.save(`${fileBase}.pdf`);
    } catch {
      setError("Failed to generate PDF. Please try again.");
    }
  };

  const handleExportScreenplay = async (kind) => {
    if (!enforceGoldPlan()) return;
    setExportMenuOpen(false);

    // .fdx is generated CLIENT-SIDE so its element types come from the editor's one classifier
    // (classifyText), never the server's separate parser (§0). No save/scriptId needed.
    if (kind === "fdx") {
      setExportingScreenplay(kind);
      setError("");
      try {
        const xml = fountainToFdx(screenplayValue);
        const url = window.URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(title || "script").replace(/[^\w.-]+/g, "_")}.fdx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch {
        setError("Could not generate the Final Draft file.");
      } finally {
        setExportingScreenplay("");
      }
      return;
    }

    if (!scriptId) {
      setError("Save your project once before exporting.");
      return;
    }
    setExportingScreenplay(kind);
    setError("");
    try {
      let path;
      if (kind === "fountain") {
        path = `/scripts/${scriptId}/export/fountain`;
      } else if (kind === "pdf-wm") {
        const stamp = encodeURIComponent(user?.email || user?.name || "Shared copy");
        path = `/scripts/${scriptId}/export/pdf?download=1&titlePage=1&watermark=${stamp}`;
      } else {
        path = `/scripts/${scriptId}/export/pdf?download=1&titlePage=1`;
      }
      const { data } = await api.get(path, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([data]));
      const ext = kind === "fountain" ? "fountain" : "pdf";
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "script").replace(/[^\w.-]+/g, "_")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Export failed. Try again after saving.");
    } finally {
      setExportingScreenplay("");
    }
  };

  return {
    exportingScreenplay,
    setExportingScreenplay,
    exportMenuOpen,
    setExportMenuOpen,
    sanitizePdfFileName,
    downloadSubmissionSummaryPdf,
    handleDownloadMainContentPdf,
    handleExportScreenplay,
  };
}
