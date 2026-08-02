/*
 * SpotlightCard — shelf 01's card, for projects holding paid placement.
 *
 * The spotlight badge names the purchase and its remaining window, because
 * that is what distinguishes this shelf from the ranked list below it.
 */
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import SaveButton from "./SaveButton";
import {
  getLoglineLabel,
  getMetaLine,
  getPriceLabel,
  getScore,
  getSpotlightLabel,
  getViews,
  formatCount,
  hasTrailer,
} from "../featuredBroadsheet";

const SpotlightCard = ({ script, scriptPath, onOpenProject, onDetails, onTrailer, onShare }) => {
  const cover = resolveMediaUrl(script.coverImage);
  const spotlight = getSpotlightLabel(script);
  const score = getScore(script);

  return (
    <article className="fbp-card">
      <div className="fbp-card__figure">
        {cover
          ? <img src={cover} alt="" loading="lazy" />
          : <span className="fbp-card__figure-empty" aria-hidden="true" />}

        {script.verifiedBadge && (
          <span className="fbp-card__verified">
            <span className="fbp-icon" aria-hidden="true">verified</span>
            VERIFIED
          </span>
        )}

        <SaveButton script={script} variant="card" />

        {spotlight && <span className="fbp-card__spot">{spotlight}</span>}
      </div>

      <div className="fbp-card__body">
        <h3 className="fbp-card__title">{script.title}</h3>
        <p className="fbp-card__meta">{getMetaLine(script)}</p>
        <p className="fbp-card__logline">{getLoglineLabel(script)}</p>

        <div className="fbp-card__foot">
          <span className="fbp-card__stats">
            {score ? `${score}/100 · ` : ""}{formatCount(getViews(script))} views ·{" "}
            <b>{getPriceLabel(script)}</b>
          </span>
          <Link to={scriptPath} onClick={onOpenProject} className="fbp-btn fbp-btn--primary fbp-btn--sm">
            View Project
          </Link>
        </div>

        <div className="fbp-card__links">
          <button type="button" className="fbp-linkbtn" onClick={onDetails}>Details</button>
          {hasTrailer(script) && (
            <button type="button" className="fbp-linkbtn" onClick={onTrailer}>Trailer</button>
          )}
          <button type="button" className="fbp-linkbtn" onClick={onShare}>Share</button>
        </div>
      </div>
    </article>
  );
};

export default SpotlightCard;
