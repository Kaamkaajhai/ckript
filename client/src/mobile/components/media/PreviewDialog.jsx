import ScreenplayReadOnly from "../../../components/ScreenplayReadOnly";
import Dialog from "../overlays/Dialog";
import "./Media.css";

/*
 * PreviewDialog — the page window a buyer will be allowed to read
 * (prefix: ckm-media, surface: ckm-dialog).
 *
 * Shared by `/create-project` and `/upload`. Promoted out of
 * `screens/create/overlays/` on 2026-08-09 (decision D12): it was already fully
 * prop-driven, so the promotion is a move, and both routes now show a buyer the
 * same thing because they render the same component.
 *
 * WHY A DIALOG AND NOT AN INLINE BLOCK
 * ------------------------------------
 * Desktop renders this range inside the Access panel, one `ScreenplayReadOnly`
 * per page. Each of those mounts a real CodeMirror instance, so an eight-page
 * window is eight editors living inside a scrolling form — on desktop an
 * expense, on a phone a stall, and behind a virtual keyboard for most of the
 * panel's life. A screenplay page also needs the whole frame to be legible: at
 * 320px, inside a card, inside a form, it is a grey smudge.
 *
 * So it is summoned. Mounted when the writer asks to see it, disposed when they
 * close it, and given the full screen while it is open. `Dialog` is the right
 * surface by the Phase 1 rule — a task that *replaces* the screen for its
 * duration, is not addressable, and must not survive a refresh.
 *
 * It renders the SAME `ScreenplayReadOnly` every other surface uses (the
 * producer view, the admin view, the desktop panel), so what the writer checks
 * here is byte-for-byte what a buyer is shown. `sheet={false}` because the
 * dialog is already the sheet: the component's own drop-shadowed paper would be
 * a second card inside a full-screen surface.
 */
export default function PreviewDialog({
  open = false,
  onClose = null,
  pages = [],
  firstPageNumber = 1,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Buyer preview"
      description={pages.length === 1
        ? `Page ${firstPageNumber}, exactly as a buyer sees it.`
        : `Pages ${firstPageNumber}–${firstPageNumber + pages.length - 1}, exactly as a buyer sees them.`}
      className="ckm-media__preview-dialog"
    >
      {/*
        * An ordered list: the page numbers are content, not decoration. A screen
        * reader hears "list, 8 items" and knows how much is here before reading
        * any of it, and `start` keeps the numbering honest when the window does
        * not begin at page 1.
        */}
      <ol className="ckm-media__pages" start={firstPageNumber}>
        {pages.map((pageText, index) => (
          <li className="ckm-media__page" key={`preview-page-${firstPageNumber + index}`}>
            <p className="ckm-media__page-number">Page {firstPageNumber + index}</p>
            <ScreenplayReadOnly text={pageText} sheet={false} />
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
