import { useState } from "react";
import Icon from "../../components/Icon";
import BottomSheet from "../../components/BottomSheet";
import { ALL_PROJECTS, ALL_PROJECTS_PAGE_SIZE } from "../../data/dashboardData";
import "./AllProjectsSheet.css";

/*
 * AllProjectsSheet — the full slate, paginated (reference screen 03).
 * Pagination is driven by the real catalogue length rather than a fixed set
 * of page dots, so "next/prev" always land on real content.
 */

const STATE_LABEL = {
  published: "Published",
  draft: "Draft",
  rejected: "Rejected",
  review: "In Review",
};

const STATE_TONE = {
  draft: "gold",
  rejected: "red",
  review: "gold",
};

export default function AllProjectsSheet({ open, onClose, onOpenProject }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(ALL_PROJECTS.length / ALL_PROJECTS_PAGE_SIZE));
  const start = page * ALL_PROJECTS_PAGE_SIZE;
  const slice = ALL_PROJECTS.slice(start, start + ALL_PROJECTS_PAGE_SIZE);

  const go = (p) => setPage(Math.max(0, Math.min(totalPages - 1, p)));

  return (
    <BottomSheet open={open} onClose={onClose} height="92%" label="All projects">
      <div className="ckm-allp">
        <div className="ckm-allp__head">
          <div>
            <div className="ckm-allp__eyebrow">My Projects</div>
            <h3 className="ckm-allp__title">{ALL_PROJECTS.length} projects</h3>
          </div>
          <button type="button" className="ckm-allp__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={20} color="var(--ckm-text-3)" />
          </button>
        </div>

        <div className="ckm-allp__list">
          {slice.map((p) => (
            <button key={p.id} type="button" className="ckm-allp__row" onClick={() => onOpenProject?.(p)}>
              <span className="ckm-allp__thumb" style={{ background: p.swatch }} />
              <span className="ckm-allp__main">
                <span className="ckm-allp__name">{p.title}</span>
                <span className={`ckm-allp__meta${p.state === "rejected" ? " is-rejected" : ""}`}>
                  {STATE_LABEL[p.state]} · {p.meta}
                </span>
              </span>
              {p.score != null ? (
                <span className="ckm-allp__score">
                  <span className="ckm-allp__score-num">{p.score}</span>
                  <span className="ckm-allp__score-out">/100</span>
                </span>
              ) : (
                <span className={`ckm-allp__badge ckm-allp__badge--${STATE_TONE[p.state] || "gold"}`}>
                  {STATE_LABEL[p.state]}
                </span>
              )}
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="ckm-allp__pager">
            <button
              type="button"
              className="ckm-allp__pnav"
              onClick={() => go(page - 1)}
              disabled={page === 0}
              aria-label="Previous page"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                className={`ckm-allp__pnum${i === page ? " is-active" : ""}`}
                onClick={() => go(i)}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              className="ckm-allp__pnav"
              onClick={() => go(page + 1)}
              disabled={page === totalPages - 1}
              aria-label="Next page"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
