import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon";
import Button from "../../components/buttons/Button";
import EmptyState from "../../components/EmptyState";
import SegmentedControl from "../../components/tabs/SegmentedControl";
import LoadMore from "../../components/lists/LoadMore";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import "./ProjectsSection.css";

/*
 * ProjectsSection — the creator's slate: pending / rejected notices, project
 * cards, a real status filter, a "View all" entry into the paginated sheet,
 * and Collaborations.
 *
 * 2026-08-07 (plan §11 Phase 2). Four things stopped being pretend:
 *
 *   • Opening a project is a `Link` to `getScriptCanonicalPath(script)` — the
 *     same path desktop's ProjectCard uses — not a `desktopOnly()` toast.
 *   • Filter is a real `ckm-segmented` status filter over the list that is
 *     already loaded. §11's exit gate wants a real in-place behaviour, and
 *     filtering client-side is the honest one: the dashboard fetches every
 *     script the writer owns in a single call, so there is nothing to request.
 *   • Share uses the Web Share API, falling back to the clipboard. Both are
 *     real outcomes on a phone; the sheet the OS opens is the native one.
 *   • Covers are the script's real `coverImage`, not a decorative gradient.
 *
 * The card is a whole tappable surface whose accessible name is the title
 * alone, with Share as a separate control that is NOT nested inside the link —
 * the same `::after` overlay arrangement `ckm-row` uses.
 */

const FILTERS = [
  { value: "all", label: "All" },
  { value: "published", label: "Live" },
  { value: "pending_approval", label: "In review" },
  { value: "draft", label: "Drafts" },
];

const INITIAL_SHOWN = 4;

const matchesFilter = (project, filter) => {
  if (filter === "all") return true;
  if (filter === "published") return project.status?.label === "Published";
  if (filter === "pending_approval") return project.status?.label === "In Review";
  return project.status?.label === "Draft" || project.status?.label === "Not approved";
};

export default function ProjectsSection({ onViewAll, onShare, data, createHref, uploadHref }) {
  const { total, pendingApproval, rejectedCount, featured, collaborations } = data;
  const [filter, setFilter] = useState("all");
  const [shown, setShown] = useState(INITIAL_SHOWN);

  const visible = useMemo(
    () => featured.filter((p) => matchesFilter(p, filter)),
    [featured, filter]
  );

  if (!featured.length) {
    return (
      <div className="ckm-proj">
        <EmptyState
          icon="movie"
          title="No projects yet"
          body="Upload your first script to get started."
          actions={(
            <>
              <Button variant="secondary" to={createHref} state={{ startFresh: true }}>
                Create Project
              </Button>
              <Button variant="primary" to={uploadHref}>
                Upload Script
              </Button>
            </>
          )}
        />
      </div>
    );
  }

  return (
    <div className="ckm-proj">
      <div className="ckm-proj__head">
        <Icon name="movie" size={22} color="var(--ckm-accent)" />
        <h3 className="ckm-proj__title">My Projects</h3>
        <span className="ckm-proj__count">{total}</span>
      </div>

      <SegmentedControl
        name="project-status"
        label="Filter projects by status"
        options={FILTERS}
        value={filter}
        onChange={(next) => { setFilter(next); setShown(INITIAL_SHOWN); }}
        className="ckm-proj__filter"
      />

      {pendingApproval > 0 && (
        <div className="ckm-proj__notice">
          <span className="ckm-proj__notice-icon">
            <Icon name="schedule" size={18} />
          </span>
          <p className="ckm-proj__notice-text">
            <b>{pendingApproval} {pendingApproval === 1 ? "project" : "projects"}</b> pending admin
            approval — {pendingApproval === 1 ? "it is" : "they are"} hidden from the public until approved.
          </p>
        </div>
      )}
      {/* Desktop renders this notice too, but computes it from a list it has
          already filtered to published — so it can never fire there. Mobile
          does not filter, so this is the first place it actually appears. */}
      {rejectedCount > 0 && (
        <div className="ckm-proj__notice ckm-proj__notice--error">
          <span className="ckm-proj__notice-icon">
            <Icon name="error" size={18} />
          </span>
          <p className="ckm-proj__notice-text">
            <b>{rejectedCount} {rejectedCount === 1 ? "project was" : "projects were"}</b> not
            approved. Review the feedback and revise, then re-upload.
          </p>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon="filter_alt"
          title="Nothing in this status"
          body="No project matches the filter you picked."
          actions={<Button variant="tertiary" onClick={() => setFilter("all")}>Show all projects</Button>}
        />
      ) : (
        <>
          <ul className="ckm-proj__list">
            {visible.slice(0, shown).map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} onShare={() => onShare?.(p)} />
              </li>
            ))}
          </ul>

          {visible.length > shown && (
            <LoadMore
              loaded={Math.min(shown, visible.length)}
              total={visible.length}
              pageSize={INITIAL_SHOWN}
              noun="projects"
              onLoadMore={() => setShown((n) => n + INITIAL_SHOWN)}
            />
          )}
        </>
      )}

      {total > visible.length && filter === "all" && (
        <Button variant="secondary" fullWidth trailingIcon="expand_more" onClick={onViewAll}>
          View all {total} projects
        </Button>
      )}

      {collaborations.length > 0 && (
        <>
          <div className="ckm-proj__collab-head">
            <Icon name="group" size={20} color="var(--ckm-text-3)" />
            <h3 className="ckm-proj__collab-title">Collaborations</h3>
            <span className="ckm-proj__collab-count">{collaborations.length}</span>
          </div>
          <ul className="ckm-proj__collab-list">
            {collaborations.map((c) => (
              <li key={c.id}>
                <Link className="ckm-proj__collab" to={c.href}>
                  <span className="ckm-proj__collab-thumb" aria-hidden="true">
                    <Icon name="group" size={18} color="var(--ckm-text-3)" />
                  </span>
                  <span className="ckm-proj__collab-main">
                    <span className="ckm-proj__collab-name">{c.title}</span>
                    <span className="ckm-proj__collab-by">
                      {c.by}{c.role ? ` · ${c.role}` : ""}
                    </span>
                  </span>
                  <span className="ckm-proj__collab-status">{c.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ProjectCard({ project: p, onShare }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const cover = coverFailed ? "" : resolveMediaUrl(p.coverImage);

  return (
    <article className="ckm-pc">
      <div className="ckm-pc__cover">
        {cover ? (
          <>
            <img className="ckm-pc__cover-img" src={cover} alt="" onError={() => setCoverFailed(true)} />
            <div className="ckm-pc__cover-veil" />
          </>
        ) : (
          // Not "no image yet" dressed as art: the initials say which project
          // this is, which is the only thing the missing cover was carrying.
          <div className="ckm-pc__cover-ph" aria-hidden="true">
            <span className="ckm-pc__cover-ph-mark">{initialsOf(p.title)}</span>
          </div>
        )}
        <span className="ckm-pc__status">
          <span className="ckm-pc__status-dot" style={{ background: p.status.dot }} />
          {p.status.label}
        </span>
        {p.score != null && (
          <span className="ckm-pc__score">
            <span className="ckm-pc__score-num">{p.score}</span>
            <span className="ckm-pc__score-out">/100</span>
          </span>
        )}
      </div>

      <div className="ckm-pc__body">
        <div className="ckm-pc__body-top">
          <div className="ckm-pc__meta">
            <div className="ckm-pc__eyebrow">
              {p.author}{p.date ? ` · ${p.date}` : ""}
            </div>
            {/* The link's ::after covers the whole card, so the card is one
                tap target while its accessible name stays the title alone. */}
            <h4 className="ckm-pc__title">
              <Link className="ckm-pc__link" to={p.href}>{p.title}</Link>
            </h4>
          </div>
          <button
            type="button"
            className="ckm-pc__share"
            onClick={onShare}
            aria-label={`Share ${p.title}`}
          >
            <Icon name="ios_share" size={18} color="var(--ckm-text-3)" />
          </button>
        </div>
        <p className="ckm-pc__logline">{p.logline}</p>
        {p.tags.length > 0 && (
          <div className="ckm-pc__tags">
            {p.tags.map((t) => (
              <span key={t.label} className={`ckm-chip ckm-chip--${t.tone}`}>{t.label}</span>
            ))}
          </div>
        )}
      </div>

      <div className="ckm-pc__foot">
        <span className="ckm-pc__stat">
          <Icon name="visibility" size={16} />
          {p.publicNote}
        </span>
        {p.price ? (
          <span className="ckm-pc__price">₹{Number(p.price).toLocaleString()}</span>
        ) : (
          <span className="ckm-pc__free">Free</span>
        )}
      </div>
    </article>
  );
}

const initialsOf = (title = "") =>
  String(title)
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SC";
