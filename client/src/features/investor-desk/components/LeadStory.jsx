import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../../utils/currency";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { getScriptCanonicalPath } from "../../../utils/scriptPath";
import { getProfileCanonicalPath } from "../../../utils/profilePath";
import { formatScriptCredit } from "../../../utils/writerCredits";
import {
  getScriptCompletionProgressText,
  getScriptCompletionStatusLabel,
} from "../../../utils/scriptCompletion";
import { useScriptBookmark } from "../../../hooks/useScriptBookmark";
import SocialShareButton from "../../../components/SocialShareButton";
import {
  formatCount,
  formatRating,
  formatShortDate,
  getAsk,
  getFormatLabel,
  getGenreLabel,
  getMatchReasons,
  getPublishedAt,
  getScore,
  hasVerifiedBadge,
  isPublishedProject,
} from "../investorDesk";

const STATUS_META = {
  published: { label: "Published", modifier: "" },
  approved: { label: "Published", modifier: "" },
  pending_approval: { label: "In review", modifier: " idp-meta__dot--review" },
  rejected: { label: "Rejected", modifier: " idp-meta__dot--rejected" },
  draft: { label: "Draft", modifier: " idp-meta__dot--draft" },
};

const Divider = () => <span className="idp-meta__rule" aria-hidden="true" />;

/*
 * The lead story — the highest-ranked project against the member's brief, given
 * the front-page treatment. Its actions are the real ones: open the script
 * (through the canonical path, with the same click interaction the cards
 * record), toggle the favourite, open the shared share sheet, or reach the
 * writer. "Why it matched" reads the ranking breakdown the feed already sends.
 */
const LeadStory = ({ project, onOpen, blocked, viewer }) => {
  const [coverError, setCoverError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const menuRef = useRef(null);

  const { isBookmarked, canBookmark, pending, toggleBookmark } = useScriptBookmark(project);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (!project) return null;

  const cover = coverError ? "" : resolveMediaUrl(project?.coverImage);
  const status = STATUS_META[project?.status] || STATUS_META.draft;
  const score = getScore(project);
  const ask = getAsk(project);
  const genre = getGenreLabel(project);
  const format = getFormatLabel(project);
  const completion = getScriptCompletionStatusLabel(project);
  const completionProgress = getScriptCompletionProgressText(project);
  const credit = formatScriptCredit(project, { max: 2 }) || project?.creator?.name || "Unknown";
  const publishedAt = formatShortDate(getPublishedAt(project));
  const scriptPath = getScriptCanonicalPath(project);
  const reasons = getMatchReasons(project);

  const writerId = project?.creator?._id;
  const writerPath = writerId
    ? getProfileCanonicalPath(project.creator, { viewerId: viewer?._id, viewerRole: viewer?.role })
    : "";

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const share = {
    url: project?.shareMeta?.url || (project?._id ? `${origin}/share/project/${project._id}` : ""),
    title: project?.shareMeta?.title || `${project?.title || "Project"} | Ckript`,
    text: project?.shareMeta?.text || project?.logline || project?.synopsis || "Check out this project on Ckript.",
  };

  const handleRead = (event) => {
    event.preventDefault();
    onOpen(project);
  };

  return (
    <>
      <div className="idp-lead__head">
        <span className="idp-icon" style={{ fontSize: 20 }} aria-hidden="true">bolt</span>
        <h2 className="idp-lead__heading">The lead</h2>
        <span className="idp-caption">highest-ranked match against your brief</span>
        <span className="idp-lead__spacer" />
        {reasons.length > 0 && (
          <button
            type="button"
            className="idp-btn idp-link"
            onClick={() => setWhyOpen((open) => !open)}
            aria-expanded={whyOpen}
          >
            {whyOpen ? "Hide reasons ‹" : "Why it matched ›"}
          </button>
        )}
      </div>

      <div className="idp-lead">
        <Link
          to={scriptPath}
          onClick={handleRead}
          className={`idp-lead__plate${cover ? "" : " idp-plate"}`}
          aria-label={`Open ${project?.title}`}
        >
          {cover ? (
            <img
              className="idp-lead__cover"
              src={cover}
              alt=""
              onError={() => setCoverError(true)}
            />
          ) : (
            <>
              <span className="idp-lead__plate-frame" />
              <span className="idp-lead__plate-note">no cover supplied</span>
            </>
          )}
          <span className="idp-lead__flag">Top match</span>
        </Link>

        <div className="idp-lead__body">
          <div className="idp-lead__meta">
            <span className="idp-meta">
              <span className={`idp-meta__dot${status.modifier}`} aria-hidden="true" />
              {status.label}
            </span>
            {hasVerifiedBadge(project) && (
              <>
                <Divider />
                <span className="idp-meta">
                  <span className="idp-icon" style={{ fontSize: 13 }} aria-hidden="true">verified</span>
                  Verified
                </span>
              </>
            )}
            {completion && (
              <>
                <Divider />
                <span className="idp-meta">
                  {completion}
                  {completionProgress ? ` · ${completionProgress}` : ""}
                </span>
              </>
            )}
            {(genre || format) && (
              <>
                <Divider />
                <span className="idp-meta">{[genre, format].filter(Boolean).join(" · ")}</span>
              </>
            )}
            {score != null && (
              <span className="idp-lead__scoreblock">
                <span className="idp-lead__score">{score}</span>
                <span className="idp-lead__score-unit">/100</span>
              </span>
            )}
          </div>

          <h3 className="idp-lead__title">
            <Link to={scriptPath} onClick={handleRead} className="idp-lead__title-link">
              {project?.title || "Untitled project"}
            </Link>
          </h3>

          <div className="idp-lead__byline">
            by {credit}
            {project?.sid ? ` · SID ${project.sid}` : ""}
            {publishedAt ? ` · ${isPublishedProject(project) ? "published" : "uploaded"} ${publishedAt}` : ""}
          </div>

          {(project?.logline || project?.synopsis) && (
            <p className="idp-lead__logline">{project.logline || project.synopsis}</p>
          )}

          <div className="idp-lead__figures">
            <div>
              <div className="idp-lead__figure-label">Reads</div>
              <div className="idp-lead__figure">{formatCount(project?.readsCount)}</div>
            </div>
            <div>
              <div className="idp-lead__figure-label">Views</div>
              <div className="idp-lead__figure">{formatCount(project?.views)}</div>
            </div>
            <div>
              <div className="idp-lead__figure-label">Rating</div>
              <div className="idp-lead__figure">{formatRating(project?.rating)}</div>
            </div>
            <div>
              <div className="idp-lead__figure-label">Ask</div>
              <div className={`idp-lead__figure${ask.kind === "sold" ? " idp-lead__figure--sold" : ""}${ask.kind === "hold" ? " idp-lead__figure--hold" : ""}`}>
                {ask.kind === "money" ? formatCurrency(ask.value) : ask.text}
              </div>
            </div>
          </div>

          <div className="idp-lead__actions">
            <Link to={scriptPath} onClick={handleRead} className="idp-btn--ink">
              Read script
            </Link>

            {canBookmark && (
              <button
                type="button"
                className={`idp-btn idp-btn--ghost${isBookmarked ? " idp-btn--bookmarked" : ""}`}
                onClick={toggleBookmark}
                disabled={pending}
                aria-pressed={isBookmarked}
              >
                <span className={`idp-icon${isBookmarked ? " idp-icon--filled" : ""}`} style={{ fontSize: 17 }} aria-hidden="true">
                  bookmark
                </span>
                {isBookmarked ? "Saved" : "Save"}
              </button>
            )}

            {share.url && (
              <SocialShareButton
                share={share}
                buttonLabel="Share"
                className="idp-btn idp-btn--ghost"
              />
            )}

            <div className="idp-menu-anchor" ref={menuRef}>
              <button
                type="button"
                className="idp-btn idp-btn--icon"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="More actions"
              >
                <span className="idp-icon" style={{ fontSize: 18 }} aria-hidden="true">more_horiz</span>
              </button>

              {menuOpen && (
                <div className="idp-menu" role="menu">
                  <Link
                    to={scriptPath}
                    role="menuitem"
                    className="idp-menu__item"
                    onClick={(event) => { setMenuOpen(false); handleRead(event); }}
                  >
                    <span className="idp-icon" style={{ fontSize: 16 }} aria-hidden="true">description</span>
                    Open project page
                  </Link>
                  {writerId && !blocked && (
                    <Link
                      to={`/messages?recipientId=${writerId}&recipientName=${encodeURIComponent(project?.creator?.name || "Writer")}`}
                      role="menuitem"
                      className="idp-menu__item"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="idp-icon" style={{ fontSize: 16 }} aria-hidden="true">chat</span>
                      Message writer
                    </Link>
                  )}
                  {writerPath && (
                    <Link
                      to={writerPath}
                      role="menuitem"
                      className="idp-menu__item"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="idp-icon" style={{ fontSize: 16 }} aria-hidden="true">person</span>
                      Open writer profile
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {whyOpen && reasons.length > 0 && (
            <div className="idp-why">
              {reasons.map((reason) => (
                <div key={reason.key} className={`idp-why__row${reason.met ? "" : " idp-why__row--off"}`}>
                  <span className="idp-icon" style={{ fontSize: 16 }} aria-hidden="true">
                    {reason.met ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span>{reason.text}</span>
                  <span className="idp-why__pct">{reason.percent}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LeadStory;
