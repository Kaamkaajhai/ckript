/*
 * ProjectReaderDialog — the screenplay, as a full-screen task.
 *
 * A Dialog rather than a Sheet, by the D15 test the ledger settled: reading a screenplay REPLACES
 * the project page rather than sitting beside it, and a screenplay letterboxed into the top half
 * of a phone behind a scrim is not reading, it is squinting.
 *
 * WHAT IT RENDERS, AND IN WHICH ORDER
 * -----------------------------------
 * Full-access viewers receive the stored PDF through the authenticated proxy, prose HTML, or the
 * shared CodeMirror read-only renderer. Preview-only viewers never receive the PDF URL: they read
 * only `scriptPreviewPageTexts` / `previewExcerpt`, the fields the detail controller deliberately
 * projects for them. That split is authorization, not page-hiding chrome, and closes DEF-27.
 */
import ScreenplayPdfViewer from "../../../../../components/ScreenplayPdfViewer";
import ScreenplayReadOnly from "../../../../../components/ScreenplayReadOnly";
import { formatScreenplayLikeText } from "../../../../../utils/screenplayText";
import Dialog from "../../../../components/overlays/Dialog";
import { resolveProjectReaderSource } from "./projectReaderSource";
import "./ProjectReaderDialog.css";

export default function ProjectReaderDialog({ open, script, reader, onClose }) {
  if (!script || !reader?.canOpen) return null;

  const full = reader.mode === "full";
  const source = resolveProjectReaderSource({ script, mode: reader.mode });

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
      {source.kind === "pdf" ? (
        <ScreenplayPdfViewer
          pdfUrl={source.pdfUrl}
          title={title}
          showHeader={false}
          showAllPages
          className="ckm-reader__viewer"
        />
      ) : source.kind === "prose" ? (
        // Prose and book projects are authored as HTML by the same editor that stores it; there is
        // no screenplay pagination to apply to them.
        <div className="ckm-reader__prose" dangerouslySetInnerHTML={{ __html: source.text }} />
      ) : source.kind === "screenplay" || source.kind === "preview-pages" ? (
        <ScreenplayReadOnly
          text={formatScreenplayLikeText(source.text)}
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
