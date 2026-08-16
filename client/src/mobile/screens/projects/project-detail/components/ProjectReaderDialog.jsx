/*
 * ProjectReaderDialog — the screenplay, as a full-screen task.
 *
 * A Dialog rather than a Sheet, by the D15 test the ledger settled: reading a screenplay REPLACES
 * the project page rather than sitting beside it, and a screenplay letterboxed into the top half
 * of a phone behind a scrim is not reading, it is squinting.
 *
 * WHAT IT RENDERS, AND IN WHICH ORDER
 * -----------------------------------
 * The same three sources the desktop panel uses, chosen by the same rules, because both platforms
 * must show the same screenplay:
 *   1. the stored PDF, through the AUTHENTICATED proxy (`/api/scripts/:id/pdf`) — never the
 *      private storage URL, which after DEF-25 a viewer without full access no longer receives at
 *      all;
 *   2. prose/book projects, whose `textContent` is HTML;
 *   3. `ScreenplayReadOnly`, the shared CodeMirror renderer the editor itself uses, so a
 *      screenplay looks identical here, in the editor and in the exported PDF.
 *
 * The preview case passes the writer's page window to the viewer rather than the whole document,
 * which is the desktop behaviour — and is also, on its own, NOT a security boundary. It is a
 * presentation limit over a document the server chose to serve; see DEF-27 in the plan ledger for
 * why that distinction is recorded rather than quietly relied on.
 */
import ScreenplayPdfViewer from "../../../../../components/ScreenplayPdfViewer";
import ScreenplayReadOnly from "../../../../../components/ScreenplayReadOnly";
import { formatScreenplayLikeText } from "../../../../../utils/screenplayText";
import { resolveMediaUrl } from "../../../../../utils/mediaUrl";
import Dialog from "../../../../components/overlays/Dialog";
import "./ProjectReaderDialog.css";

const text = (value) => (typeof value === "string" ? value : "");

export default function ProjectReaderDialog({ open, script, reader, onClose }) {
  if (!script || !reader?.canOpen) return null;

  const full = reader.mode === "full";
  const previewAccess = script?.scriptPreviewAccess || {};
  const previewPages = Array.isArray(script?.scriptPreviewPageTexts)
    ? script.scriptPreviewPageTexts.filter((page) => text(page).trim())
    : [];

  // Fountain is the source of truth when present; textContent also carries prose/book HTML.
  const body = text(script?.fountainContent).trim() || text(script?.textContent);
  const isHtml = body.trimStart().startsWith("<");
  const hasStoredPdf = Boolean(script?.hasUploadedScriptFile) || Boolean(text(script?.fileUrl).trim());
  const pdfUrl = hasStoredPdf && script?._id
    ? resolveMediaUrl(`/api/scripts/${script._id}/pdf`)
    : "";

  const sourceText = full ? body : text(script?.previewExcerpt);

  const title = full ? script.title || "Screenplay" : `${script.title || "Screenplay"} — preview`;
  const description = full
    ? (script.pageCount ? `About ${script.pageCount} pages.` : "Full screenplay.")
    : (reader.range ? `${reader.range} of ${script.pageCount || "?"}.` : "Preview pages.");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      bodyClassName="ckm-reader__body"
    >
      {pdfUrl ? (
        <ScreenplayPdfViewer
          pdfUrl={pdfUrl}
          title={title}
          showHeader={false}
          showAllPages={full}
          startPage={full ? 1 : Number(previewAccess?.start || 1)}
          endPage={full ? 1 : Number(previewAccess?.end || previewAccess?.start || 1)}
          fallbackPages={full ? [] : previewPages.map((page, index) => ({ pageNumber: index + 1, text: page }))}
          fallbackText={sourceText}
          className="ckm-reader__viewer"
        />
      ) : isHtml && full ? (
        // Prose and book projects are authored as HTML by the same editor that stores it; there is
        // no screenplay pagination to apply to them.
        <div className="ckm-reader__prose" dangerouslySetInnerHTML={{ __html: script.textContent || "" }} />
      ) : sourceText.trim() ? (
        <ScreenplayReadOnly
          text={formatScreenplayLikeText(sourceText)}
          sheet={false}
          className="ckm-reader__screenplay"
        />
      ) : (
        <p className="ckm-reader__empty">
          This screenplay has no readable pages yet. The writer has to add them before it can be opened.
        </p>
      )}
    </Dialog>
  );
}
