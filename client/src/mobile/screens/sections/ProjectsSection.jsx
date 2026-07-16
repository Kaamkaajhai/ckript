import Icon from "../../components/Icon";
import EmptyState from "../../components/EmptyState";
import { PROJECTS } from "../../data/dashboardData";
import heroImg from "../../assets/hero-last-scene.jpg";
import "./ProjectsSection.css";

/*
 * ProjectsSection — the creator's slate: a pending-approval notice, rich
 * project cards (published carry a cover + score; drafts get a placeholder),
 * a "View all" entry into the paginated sheet, and a Collaborations list.
 * Unbuilt actions (filter, share, open) route through the Dynamic Island.
 */
export default function ProjectsSection({ onViewAll, onFilter, onOpenProject, onShare, onOpenCollab }) {
  const { total, pendingApproval, featured, collaborations } = PROJECTS;

  if (!featured.length) {
    return (
      <div className="ckm-proj">
        <EmptyState
          icon="movie"
          title="No projects yet"
          body="Upload your first script to get started."
          actions={
            <>
              <button type="button" className="ckm-btn ckm-btn--ghost" onClick={onOpenProject}>
                Create Project
              </button>
              <button type="button" className="ckm-btn ckm-btn--dark" onClick={onOpenProject}>
                Upload Script
              </button>
            </>
          }
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
        <span className="ckm-proj__spacer" />
        <button type="button" className="ckm-proj__filter" onClick={onFilter}>
          Filter
          <Icon name="expand_more" size={15} />
        </button>
      </div>

      {pendingApproval > 0 && (
        <div className="ckm-proj__pending">
          <span className="ckm-proj__pending-icon">
            <Icon name="schedule" size={18} />
          </span>
          <p className="ckm-proj__pending-text">
            <b>{pendingApproval} projects</b> pending admin approval — hidden from the public until approved.
          </p>
        </div>
      )}

      {featured.map((p) => (
        <ProjectCard key={p.id} project={p} onOpen={() => onOpenProject?.(p)} onShare={() => onShare?.(p)} />
      ))}

      <button type="button" className="ckm-viewmore ckm-viewmore--muted" onClick={onViewAll}>
        View all {total} projects
        <Icon name="expand_more" size={18} />
      </button>

      <div className="ckm-proj__collab-head">
        <Icon name="group" size={20} color="var(--ckm-muted)" />
        <h3 className="ckm-proj__collab-title">Collaborations</h3>
        <span className="ckm-proj__collab-count">{collaborations.length}</span>
      </div>
      {collaborations.map((c) => (
        <button key={c.id} type="button" className="ckm-proj__collab" onClick={() => onOpenCollab?.(c)}>
          <span className="ckm-proj__collab-thumb" style={{ background: c.swatch }}>
            <span className="ckm-proj__collab-dot" />
          </span>
          <span className="ckm-proj__collab-main">
            <span className="ckm-proj__collab-name">{c.title}</span>
            <span className="ckm-proj__collab-by">{c.by}</span>
          </span>
          <span className="ckm-proj__collab-status">{c.status}</span>
        </button>
      ))}
    </div>
  );
}

function ProjectCard({ project, onOpen, onShare }) {
  const p = project;
  return (
    <div className="ckm-pc">
      <div className={`ckm-pc__cover${p.cover === "placeholder" ? " ckm-pc__cover--ph" : ""}`}>
        {p.cover === "hero" ? (
          <>
            <img className="ckm-pc__cover-img" src={heroImg} alt="" />
            <div className="ckm-pc__cover-veil" />
          </>
        ) : (
          <div className="ckm-pc__cover-ph">
            <span className="ckm-pc__cover-ph-icon">
              <Icon name="image" size={24} color="#2b557f" />
            </span>
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
              {p.author} · {p.date}
            </div>
            <h4 className="ckm-pc__title">{p.title}</h4>
          </div>
          <button type="button" className="ckm-pc__share" onClick={onShare} aria-label="Share">
            <Icon name="ios_share" size={16} color="var(--ckm-muted-2)" />
          </button>
        </div>
        <p className="ckm-pc__logline">{p.logline}</p>
        <div className="ckm-pc__tags">
          {p.tags.map((t) => (
            <span key={t.label} className={`ckm-chip ckm-chip--${t.tone}`}>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="ckm-pc__foot">
        {p.score != null ? (
          <div className="ckm-pc__foot-stats">
            <span className="ckm-pc__stat">
              <Icon name="visibility" size={16} />
              {p.views}
            </span>
            <span className="ckm-pc__stat ckm-pc__stat--rating">
              <Icon name="star" size={16} fill color="#e0a92b" />
              {p.rating}
            </span>
          </div>
        ) : (
          <span className="ckm-pc__stat">
            <Icon name="visibility" size={16} />
            {p.publicNote}
          </span>
        )}
        <div className="ckm-pc__foot-right">
          {p.price === "Free" ? (
            <span className="ckm-pc__free">Free</span>
          ) : (
            <span className="ckm-pc__price">{p.price}</span>
          )}
          <button type="button" className="ckm-pc__go" onClick={onOpen} aria-label={`Open ${p.title}`}>
            <Icon name="arrow_forward" size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
