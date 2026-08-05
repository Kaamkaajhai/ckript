import { useState } from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../../utils/currency";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { getScriptCanonicalPath } from "../../../utils/scriptPath";
import { formatScriptCredit } from "../../../utils/writerCredits";
import { useScriptBookmark } from "../../../hooks/useScriptBookmark";
import {
  formatCompactCount,
  getAsk,
  getFormatLabel,
  getScore,
} from "../investorDesk";

/*
 * One column of a shelf rail: rank numeral, bookmark, plate, title, credit and
 * a ruled footer carrying format, score, reads and the ask. Every value is read
 * off the project the feed returned.
 */
const ProjectRailCard = ({ project, rank, onBlockedOpen }) => {
  const [coverError, setCoverError] = useState(false);
  const { isBookmarked, canBookmark, pending, toggleBookmark } = useScriptBookmark(project);

  const cover = coverError ? "" : resolveMediaUrl(project?.coverImage);
  const score = getScore(project);
  const ask = getAsk(project);
  const format = getFormatLabel(project);
  const credit = formatScriptCredit(project, { max: 2 }) || project?.creator?.name || "Unknown";

  const handleOpen = (event) => {
    if (onBlockedOpen) {
      event.preventDefault();
      onBlockedOpen();
    }
  };

  return (
    <div className="idp-card">
      <div className="idp-card__top">
        <span className="idp-card__rank">{String(rank).padStart(2, "0")}</span>
        {canBookmark && (
          <button
            type="button"
            className={`idp-btn idp-card__bookmark${isBookmarked ? " idp-card__bookmark--on" : ""}`}
            onClick={toggleBookmark}
            disabled={pending}
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? `Remove ${project?.title} from your watchlist` : `Save ${project?.title} to your watchlist`}
          >
            <span className={`idp-icon${isBookmarked ? " idp-icon--filled" : ""}`} style={{ fontSize: 17 }} aria-hidden="true">
              bookmark
            </span>
          </button>
        )}
      </div>

      <Link
        to={getScriptCanonicalPath(project)}
        className="idp-card__open"
        onClick={handleOpen}
      >
        <div className={`idp-card__plate${cover ? "" : " idp-plate"}`}>
          {cover && (
            <img
              className="idp-card__cover"
              src={cover}
              alt=""
              loading="lazy"
              onError={() => setCoverError(true)}
            />
          )}
        </div>

        <div className="idp-card__title">{project?.title || "Untitled project"}</div>
        <div className="idp-card__credit">{credit}</div>

        <div className="idp-card__foot">
          <span className="idp-card__format">{format || "—"}</span>
          {score != null && <span className="idp-card__score">{score}</span>}
        </div>

        <div className="idp-card__stats">
          <span>{formatCompactCount(project?.readsCount)} reads</span>
          <span className={`idp-card__ask idp-card__ask--${ask.kind}`}>
            {ask.kind === "money" ? formatCurrency(ask.value) : ask.text}
          </span>
        </div>
      </Link>
    </div>
  );
};

export default ProjectRailCard;
