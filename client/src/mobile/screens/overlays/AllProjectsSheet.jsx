import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon";
import Sheet from "../../components/overlays/Sheet";
import { ALL_PROJECTS_PAGE_SIZE } from "../../data/dashboardData";
import { statusPresentation } from "../../data/dashboardModel";
import "./AllProjectsSheet.css";

/*
 * AllProjectsSheet — the full slate, paginated.
 *
 * 2026-08-07 (plan §11 Phase 2):
 *
 *  • It is a real `Sheet` (ckm-bottom-sheet), so it has the focus trap, scroll
 *    lock, inert background and focus restoration `BottomSheet` never had, and
 *    a drag on the list scrolls the list.
 *  • Every row is a `Link` to the project. It used to be a `<button>` calling
 *    `desktopOnly("Project pages")` — a full-screen list of a writer's own work
 *    where tapping any of it said "use a computer".
 *  • The pager no longer prints one button per page. A writer with 200 scripts
 *    got 23 numbered buttons wrapped across a phone; it is now the windowed
 *    1 … n-1 n n+1 … N list desktop uses, for the same reason.
 */

/* Windowed page list — desktop's `pageList`, same shape. */
const pageList = (current, total) => {
  const range = [];
  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) range.push(i);
  if (range[0] > 1) {
    if (range[0] > 2) range.unshift("…");
    range.unshift(1);
  }
  const last = range[range.length - 1];
  if (last < total) {
    if (last < total - 1) range.push("…");
    range.push(total);
  }
  return range;
};

export default function AllProjectsSheet({ open, onClose, allProjects, returnFocusTo = null }) {
  const [page, setPage] = useState(1);
  const listRef = useRef(null);

  const projectsList = allProjects || [];
  const totalPages = Math.max(1, Math.ceil(projectsList.length / ALL_PROJECTS_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * ALL_PROJECTS_PAGE_SIZE;
  const slice = projectsList.slice(start, start + ALL_PROJECTS_PAGE_SIZE);

  /*
   * Changing page must put you at the top of the new page, not halfway down it.
   * The scroll surface is the Sheet's body, not this element — the sheet owns
   * scrolling so its header and footer stay put — so the reset walks up to it.
   */
  useEffect(() => {
    const surface = listRef.current?.closest(".ckm-bottom-sheet__body");
    if (surface) surface.scrollTop = 0;
  }, [current]);
  /*
   * A sheet that is closed and reopened starts at the beginning again. Every
   * dismissal path — the close button, the scrim, Escape and the flick-down —
   * goes through Overlay's onClose, so wrapping it here is complete, and it
   * avoids resetting state from inside an effect.
   */
  const close = () => {
    setPage(1);
    onClose?.();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="My Projects"
      description={`${projectsList.length} ${projectsList.length === 1 ? "project" : "projects"}`}
      returnFocusTo={returnFocusTo}
      className="ckm-allp__sheet"
      bodyClassName="ckm-allp__body"
    >
      <div className="ckm-allp" ref={listRef}>
        <ul className="ckm-allp__list">
          {slice.map((p) => {
            const state = statusPresentation(p.state);
            return (
              <li key={p.id}>
                <Link className="ckm-allp__row" to={p.href}>
                  <span className="ckm-allp__thumb" aria-hidden="true">
                    <span className="ckm-allp__thumb-dot" style={{ background: state.dot }} />
                  </span>
                  <span className="ckm-allp__main">
                    <span className="ckm-allp__name">{p.title}</span>
                    <span className={`ckm-allp__meta${p.state === "rejected" ? " is-rejected" : ""}`}>
                      {state.label} · {p.meta}
                    </span>
                  </span>
                  {p.score != null ? (
                    <span className="ckm-allp__score">
                      <span className="ckm-allp__score-num">{p.score}</span>
                      <span className="ckm-allp__score-out">/100</span>
                    </span>
                  ) : (
                    <span className="ckm-allp__badge">{state.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {totalPages > 1 && (
          <nav className="ckm-allp__pager" aria-label="Project pages">
            <button
              type="button"
              className="ckm-allp__pnav"
              onClick={() => setPage(current - 1)}
              disabled={current === 1}
              aria-label="Previous page"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            {pageList(current, totalPages).map((p, i) => (
              p === "…" ? (
                <span key={`gap-${i}`} className="ckm-allp__pgap" aria-hidden="true">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`ckm-allp__pnum${p === current ? " is-active" : ""}`}
                  aria-current={p === current ? "page" : undefined}
                  aria-label={`Page ${p} of ${totalPages}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            ))}
            <button
              type="button"
              className="ckm-allp__pnav"
              onClick={() => setPage(current + 1)}
              disabled={current === totalPages}
              aria-label="Next page"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </nav>
        )}
      </div>
    </Sheet>
  );
}
