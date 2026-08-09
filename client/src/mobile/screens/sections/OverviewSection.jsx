import { Link } from "react-router-dom";
import Icon from "../../components/Icon";
import Button from "../../components/buttons/Button";
import heroImg from "../../assets/hero-last-scene.jpg";
import "./OverviewSection.css";

/*
 * OverviewSection — the dashboard's home. Recovers the desktop right-rail
 * "At a Glance" stats that plain mobile drops, and leads with a profile-
 * completion nudge + the editorial hero, then Avg Score / Biggest Mover and
 * a Top Scripts leaderboard. `onFullAnalytics` jumps to the Performance tab.
 *
 * 2026-08-07 (plan §11 Phase 2): every destination here is now a real `Link`
 * to the same path desktop uses — Create, Upload, Edit profile, and each Top
 * Scripts row. They were `desktopOnly()` toasts, which is a dead end on a
 * destination that exists. A row that names a script and does not open it is
 * worse than no row.
 */
export default function OverviewSection({ createHref, uploadHref, profileHref, onFullAnalytics, data }) {
  const { profileCompletion, hero, glance, avgScore, biggestMover, topScripts } = data;
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
        <Link className="ckm-ov__edit" to={profileHref}>
          Edit
        </Link>
      </div>

      {/* Editorial hero */}
      <div className="ckm-ov__hero">
        <img className="ckm-ov__hero-img" src={heroImg} alt="" />
        <div className="ckm-ov__hero-veil" />
        <div className="ckm-ov__hero-body">
          <h2 className="ckm-ov__hero-title">{hero.title}</h2>
          <p className="ckm-ov__hero-copy">{hero.body}</p>
          <div className="ckm-ov__hero-actions">
            {/* `startFresh` matches the desktop hero's Create link — without it
                the route resumes the last draft instead of starting one. */}
            <Button variant="primary" icon="add" to={createHref} state={{ startFresh: true }}>
              Create
            </Button>
            <Button variant="secondary" icon="upload" to={uploadHref}>
              Upload
            </Button>
          </div>
        </div>
      </div>

      {/* At a Glance */}
      <div className="ckm-ov__section-head">
        <h3 className="ckm-ov__section-title ckm-ov__section-title--lg">At a Glance</h3>
        <span className="ckm-ov__rule" />
        {/* Free writers get `null` analytics from the server, not zeros. Saying
            so is the honest reading; a bare "0" claims nobody looked. */}
        {data.analyticsLocked && <span className="ckm-ov__badge">Upgrade to view</span>}
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
        {biggestMover && (
          <Link className="ckm-ov__mover" to={biggestMover.href}>
            <span className="ckm-ov__mover-head">
              <Icon name="trending_up" size={14} />
              Biggest Mover
            </span>
            <span className="ckm-ov__mover-title">{biggestMover.title}</span>
            <span className="ckm-ov__mover-note">{biggestMover.note}</span>
          </Link>
        )}
      </div>

      {/* Top scripts */}
      {topScripts.length > 0 && (
        <>
          <div className="ckm-ov__section-head ckm-ov__section-head--tight">
            <h3 className="ckm-ov__section-title">Top Scripts</h3>
            <span className="ckm-ov__rule" />
          </div>
          {/* A real list, so a screen reader is told how many there are and
              which position each script holds. */}
          <ol className="ckm-ov__top">
            {topScripts.map((s, i) => (
              <li key={s.id ?? s.rank} className={`ckm-ov__top-row${i < topScripts.length - 1 ? " has-divider" : ""}`}>
                <Link className="ckm-ov__top-link" to={s.href}>
                  <span className={`ckm-ov__top-rank${s.rank === 1 ? " is-first" : ""}`} aria-hidden="true">{s.rank}</span>
                  <span className="ckm-ov__top-main">
                    <span className="ckm-ov__top-title">{s.title}</span>
                    {s.meta && <span className="ckm-ov__top-meta">{s.meta}</span>}
                  </span>
                  <span className="ckm-ov__top-views">{s.views}</span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}

      <button type="button" className="ckm-ov__full" onClick={onFullAnalytics}>
        <Icon name="query_stats" size={18} color="var(--ckm-accent)" />
        Full Analytics
      </button>
    </div>
  );
}
