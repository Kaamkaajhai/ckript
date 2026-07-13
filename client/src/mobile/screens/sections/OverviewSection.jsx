import Icon from "../../components/Icon";
import { OVERVIEW } from "../../data/dashboardData";
import heroImg from "../../assets/hero-last-scene.jpg";
import "./OverviewSection.css";

/*
 * OverviewSection — the dashboard's home. Recovers the desktop right-rail
 * "At a Glance" stats that plain mobile drops, and leads with a profile-
 * completion nudge + the editorial hero, then Avg Score / Biggest Mover and
 * a Top Scripts leaderboard. `onFullAnalytics` jumps to the Performance tab.
 */
export default function OverviewSection({ onCreate, onUpload, onEditProfile, onFullAnalytics }) {
  const { profileCompletion, hero, glance, avgScore, biggestMover, topScripts } = OVERVIEW;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - profileCompletion / 100);

  return (
    <div className="ckm-ov">
      {/* Profile completion */}
      <div className="ckm-ov__profile">
        <div className="ckm-ov__ring">
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r={r} fill="none" stroke="#eee6d5" strokeWidth="4" />
            <circle
              cx="20"
              cy="20"
              r={r}
              fill="none"
              stroke="var(--ckm-accent)"
              strokeWidth="4"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 20 20)"
            />
          </svg>
          <span className="ckm-ov__ring-val">{profileCompletion}%</span>
        </div>
        <div className="ckm-ov__profile-text">
          <div className="ckm-ov__profile-title">Complete your profile</div>
          <div className="ckm-ov__profile-sub">Improve visibility &amp; recommendations.</div>
        </div>
        <button type="button" className="ckm-ov__edit" onClick={onEditProfile}>
          Edit
        </button>
      </div>

      {/* Editorial hero */}
      <div className="ckm-ov__hero">
        <img className="ckm-ov__hero-img" src={heroImg} alt="" />
        <div className="ckm-ov__hero-veil" />
        <div className="ckm-ov__hero-body">
          <h2 className="ckm-ov__hero-title">{hero.title}</h2>
          <p className="ckm-ov__hero-copy">{hero.body}</p>
          <div className="ckm-ov__hero-actions">
            <button type="button" className="ckm-btn ckm-btn--dark" onClick={onCreate}>
              <Icon name="add" size={18} />
              Create
            </button>
            <button type="button" className="ckm-btn ckm-btn--ghost" onClick={onUpload}>
              <Icon name="upload" size={18} />
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* At a Glance */}
      <div className="ckm-ov__section-head">
        <h3 className="ckm-ov__section-title ckm-ov__section-title--lg">At a Glance</h3>
        <span className="ckm-ov__rule" />
        <span className="ckm-ov__badge">Placeholder</span>
      </div>
      <div className="ckm-ov__glance">
        {glance.map((g) => (
          <div key={g.label} className="ckm-ov__glance-cell">
            <div className="ckm-ov__glance-label">
              <Icon name={g.icon} size={14} color="var(--ckm-accent)" />
              {g.label}
            </div>
            <div className="ckm-ov__glance-value">{g.value}</div>
            <div className={`ckm-ov__glance-note${g.tone === "up" ? " is-up" : ""}`}>{g.note}</div>
          </div>
        ))}
      </div>

      {/* Avg score + biggest mover */}
      <div className="ckm-ov__duo">
        <div className="ckm-ov__score">
          <div className="ckm-ov__score-head">
            <span>Avg Score</span>
            <span className="ckm-ov__score-tick" />
          </div>
          <div className="ckm-ov__score-value">
            {avgScore.value}
            <span className="ckm-ov__score-out">/{avgScore.out}</span>
          </div>
          <div className="ckm-ov__score-note">{avgScore.note}</div>
        </div>
        <div className="ckm-ov__mover">
          <div className="ckm-ov__mover-head">
            <Icon name="trending_up" size={14} />
            Biggest Mover
          </div>
          <div className="ckm-ov__mover-title">{biggestMover.title}</div>
          <div className="ckm-ov__mover-note">{biggestMover.note}</div>
        </div>
      </div>

      {/* Top scripts */}
      <div className="ckm-ov__section-head ckm-ov__section-head--tight">
        <h3 className="ckm-ov__section-title">Top Scripts</h3>
        <span className="ckm-ov__rule" />
      </div>
      <div className="ckm-ov__top">
        {topScripts.map((s, i) => (
          <div key={s.rank} className={`ckm-ov__top-row${i < topScripts.length - 1 ? " has-divider" : ""}`}>
            <span className={`ckm-ov__top-rank${s.rank === 1 ? " is-first" : ""}`}>{s.rank}</span>
            <div className="ckm-ov__top-main">
              <div className="ckm-ov__top-title">{s.title}</div>
              <div className="ckm-ov__top-meta">{s.meta}</div>
            </div>
            <span className="ckm-ov__top-views">{s.views}</span>
          </div>
        ))}
      </div>

      <button type="button" className="ckm-ov__full" onClick={onFullAnalytics}>
        <Icon name="query_stats" size={18} color="var(--ckm-accent)" />
        Full Analytics
      </button>
    </div>
  );
}
