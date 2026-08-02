/*
 * LeadStory — the editorial lead: one project at 620px, and the reason it leads.
 *
 * The `whyLead` line is the point of the composition. A page that sells paid
 * placement should say when placement is why something is at the top, so the
 * sentence distinguishes mandate fit from a purchased spotlight from raw
 * engagement (see getWhyLead).
 */
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import SaveButton from "./SaveButton";
import {
  getCompletionLabel,
  getCreatorName,
  getFormatLabel,
  getLoglineLabel,
  getPriceLabel,
  getRatingLabel,
  getReads,
  getScore,
  getSpotlightLabel,
  getViews,
  getWhyLead,
  formatCount,
  hasTrailer,
} from "../featuredBroadsheet";

const Fact = ({ label, value }) => (
  <span className="fbp-lead__fact">
    {label} <b>{value}</b>
  </span>
);

const LeadStory = ({
  script,
  mandate,
  sort,
  scriptPath,
  position,
  total,
  onOpenProject,
  onDetails,
  onTrailer,
  onPrev,
  onNext,
  onSelect,
}) => {
  const cover = resolveMediaUrl(script.coverImage);
  const spotlight = getSpotlightLabel(script, { isTop: position === 1 });
  const whyLead = getWhyLead(script, { mandate, sort });

  return (
    <section className="fbp-lead" aria-label="Lead project">
      <div className="fbp-lead__figure">
        {cover
          ? <img src={cover} alt={script.title} className="fbp-lead__img" />
          : <span className="fbp-lead__img-empty">No cover image</span>}
        {hasTrailer(script) && (
          <button type="button" className="fbp-lead__trailer" onClick={onTrailer}>
            <span className="fbp-icon" aria-hidden="true">play_arrow</span>
            Watch Trailer
          </button>
        )}
      </div>

      <div className="fbp-lead__body">
        {spotlight && (
          <div className="fbp-lead__spot">
            <span className="fbp-icon" aria-hidden="true">workspace_premium</span>
            {spotlight}
          </div>
        )}

        <h2 className="fbp-lead__title">{script.title}</h2>
        <p className="fbp-lead__logline">{getLoglineLabel(script)}</p>
        {whyLead && <p className="fbp-lead__why">{whyLead}</p>}

        <div className="fbp-lead__facts">
          <Fact label="Writer" value={getCreatorName(script)} />
          <Fact label="Score" value={getScore(script) ? `${getScore(script)} / 100` : "Not evaluated"} />
          <Fact
            label="Format"
            value={`${getFormatLabel(script)}${script.pageCount ? ` · ${script.pageCount}p` : ""}`}
          />
          <Fact
            label="Views"
            value={`${formatCount(getViews(script))} · ${formatCount(getReads(script))} reads`}
          />
          {script.budget && <Fact label="Budget" value={script.budget} />}
          <Fact label="Rating" value={getRatingLabel(script)} />
          <Fact label="Status" value={`Published · ${getCompletionLabel(script)}`} />
          <Fact label="Price" value={getPriceLabel(script)} />
        </div>

        <div className="fbp-lead__actions">
          <Link to={scriptPath} onClick={onOpenProject} className="fbp-btn fbp-btn--primary fbp-btn--lg">
            View Project
            <span className="fbp-icon" aria-hidden="true">arrow_forward</span>
          </Link>
          <button type="button" className="fbp-btn fbp-btn--quiet fbp-btn--lg" onClick={onDetails}>
            Details
          </button>
          <SaveButton script={script} variant="lead" />

          {total > 1 && (
            <div className="fbp-lead__nav">
              <span className="fbp-lead__pos">{position} of {total}</span>
              <span className="fbp-lead__dots">
                {Array.from({ length: total }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`fbp-lead__dot${i === position - 1 ? " is-on" : ""}`}
                    onClick={() => onSelect(i)}
                    aria-label={`Go to lead ${i + 1}`}
                    aria-current={i === position - 1}
                  />
                ))}
              </span>
              <button type="button" className="fbp-lead__arrow" onClick={onPrev} aria-label="Previous lead">
                <span className="fbp-icon" aria-hidden="true">chevron_left</span>
              </button>
              <button type="button" className="fbp-lead__arrow" onClick={onNext} aria-label="Next lead">
                <span className="fbp-icon" aria-hidden="true">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LeadStory;
