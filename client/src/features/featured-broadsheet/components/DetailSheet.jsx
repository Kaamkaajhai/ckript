/*
 * DetailSheet — the design's right-hand project panel.
 *
 * Progressive disclosure for the whole page: every card, row and the lead all
 * open the same sheet, so "Details" means one thing everywhere.
 *
 * Each tab is backed by a real field, and a tab whose data the project does not
 * carry is not rendered at all rather than shown empty — an unevaluated script
 * has no Score tab, and a project with no paid services has no Services tab.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { getProfileCanonicalPath } from "../../../utils/profilePath";
import SaveButton from "./SaveButton";
import {
  getCompletionLabel,
  getCraftRows,
  getCreatorName,
  getFormatLabel,
  getLoglineLabel,
  getMatchLine,
  getPriceLabel,
  getRatingLabel,
  getReads,
  getScore,
  getServiceRows,
  getViews,
  formatCount,
  hasTrailer,
} from "../featuredBroadsheet";

const Stat = ({ label, value }) => (
  <span className="fbp-sheet__stat">
    <span className="fbp-sheet__stat-label">{label}</span>
    <span className="fbp-sheet__stat-value">{value}</span>
  </span>
);

const DetailSheet = ({
  script,
  mandate,
  scriptPath,
  onClose,
  onOpenProject,
  onTrailer,
  onCopyLink,
}) => {
  const craftRows = useMemo(() => getCraftRows(script), [script]);
  const serviceRows = useMemo(() => getServiceRows(script), [script]);

  /*
   * Only offer tabs that have something behind them. Overview and Share always
   * do; the other three depend on what the writer bought and filled in.
   */
  const tabs = useMemo(() => {
    const list = ["Overview"];
    if (craftRows.length) list.push("Score");
    if (serviceRows.length) list.push("Services");
    if (script?.creator) list.push("Writer");
    list.push("Share");
    return list;
  }, [craftRows.length, serviceRows.length, script?.creator]);

  /*
   * Derived rather than synced: a project without an evaluation has no Score
   * tab, so the requested tab falls back to Overview during render instead of
   * an effect correcting it after a frame on the wrong one.
   */
  const [requestedTab, setRequestedTab] = useState("Overview");
  const tab = tabs.includes(requestedTab) ? requestedTab : "Overview";

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!script) return null;

  const cover = resolveMediaUrl(script.coverImage);
  const creatorName = getCreatorName(script);
  const profilePath = script.creator ? getProfileCanonicalPath(script.creator) : null;
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}${scriptPath}`
    : scriptPath;

  return (
    <div className="fbp-overlay fbp-overlay--right" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="fbp-sheet" role="dialog" aria-modal="true" aria-label="Project details">
        <header className="fbp-sheet__head">
          <div className="fbp-sheet__head-row">
            <div className="fbp-sheet__head-text">
              <div className="fbp-sheet__eyebrow">{creatorName}</div>
              <h2 className="fbp-sheet__title">{script.title}</h2>
              <div className="fbp-sheet__sub">
                {[script.genre, getFormatLabel(script), script.pageCount ? `${script.pageCount}p` : null, getCompletionLabel(script)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <button type="button" className="fbp-sheet__close" onClick={onClose} aria-label="Close details">
              <span className="fbp-icon" aria-hidden="true">close</span>
            </button>
          </div>
          <div className="fbp-sheet__tabs" role="tablist">
            {tabs.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={tab === name}
                className={`fbp-sheet__tab${tab === name ? " is-active" : ""}`}
                onClick={() => setRequestedTab(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </header>

        <div className="fbp-sheet__body">
          {tab === "Overview" && (
            <div>
              <div className="fbp-sheet__cover">
                {cover
                  ? <img src={cover} alt="" loading="lazy" />
                  : <span className="fbp-sheet__cover-empty">No cover image</span>}
              </div>
              <p className="fbp-sheet__logline">{getLoglineLabel(script)}</p>
              <div className="fbp-sheet__stats">
                <Stat label="Score" value={getScore(script) || "—"} />
                <Stat label="Views" value={formatCount(getViews(script))} />
                <Stat label="Reads" value={formatCount(getReads(script))} />
                <Stat label="Rating" value={getRatingLabel(script)} />
                <Stat label="Price" value={getPriceLabel(script)} />
              </div>
              {mandate?.isSet && (
                <p className="fbp-sheet__note">
                  <b>Mandate fit:</b> {getMatchLine(script, mandate)}.
                  {script.budget ? ` ${script.budget} budget.` : ""}
                </p>
              )}
            </div>
          )}

          {tab === "Score" && (
            <div>
              <div className="fbp-sheet__label">PLATFORM SCORE · {getScore(script)}/100</div>
              {craftRows.map((row) => (
                <div key={row.label} className="fbp-sheet__craft">
                  <div className="fbp-sheet__craft-head">
                    <span>{row.label}</span>
                    <b>{row.value}</b>
                  </div>
                  <div className="fbp-sheet__craft-track">
                    <span style={{ width: row.bar }} />
                  </div>
                </div>
              ))}
              <p className="fbp-sheet__hint">
                Scores come from the platform evaluation the writer paid for. Sub-scores are
                only shown when a full evaluation exists.
              </p>
            </div>
          )}

          {tab === "Services" && (
            <div>
              <div className="fbp-sheet__label">WHY THIS IS FEATURED</div>
              {serviceRows.map((row) => (
                <div key={row} className="fbp-sheet__service">
                  <span className="fbp-icon fbp-sheet__service-icon" aria-hidden="true">check_circle</span>
                  {row}
                </div>
              ))}
              <p className="fbp-sheet__hint">
                Placement ends when the spotlight window closes; the project then returns to
                the normal list.
              </p>
            </div>
          )}

          {tab === "Writer" && (
            <div>
              <div className="fbp-sheet__writer">
                <span className="fbp-sheet__avatar">
                  {resolveMediaUrl(script.creator?.profileImage)
                    ? <img src={resolveMediaUrl(script.creator.profileImage)} alt="" />
                    : creatorName.charAt(0).toUpperCase()}
                </span>
                <span>
                  <span className="fbp-sheet__writer-name">{creatorName}</span>
                  <span className="fbp-sheet__writer-meta">
                    {script.verifiedBadge ? "Verified writer" : "Writer"}
                  </span>
                </span>
              </div>
              <p className="fbp-sheet__hint">
                Contact happens through the platform once the project is unlocked.
              </p>
              {profilePath && (
                <Link to={profilePath} className="fbp-sheet__wide-btn">Open writer profile</Link>
              )}
            </div>
          )}

          {tab === "Share" && (
            <div>
              <div className="fbp-sheet__label">SHARE</div>
              <div className="fbp-sheet__url">{shareUrl}</div>
              <button type="button" className="fbp-sheet__wide-btn fbp-sheet__wide-btn--dark" onClick={onCopyLink}>
                Copy link
              </button>
              <p className="fbp-sheet__hint">
                Sharing a featured project keeps the writer&apos;s spotlight attribution in the
                preview card.
              </p>
            </div>
          )}
        </div>

        <footer className="fbp-sheet__foot">
          <button type="button" className="fbp-btn fbp-btn--primary fbp-btn--block" onClick={onOpenProject}>
            View Project
          </button>
          <div className="fbp-sheet__foot-row">
            <SaveButton script={script} variant="text" />
            {hasTrailer(script) && (
              <button type="button" className="fbp-btn fbp-btn--quiet" onClick={onTrailer}>
                Trailer
              </button>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
};

export default DetailSheet;
