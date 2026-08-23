/*
 * FeaturedLeadCard — one project, and the reason it is at the top.
 *
 * The `whyLead` sentence is the point of the composition and the reason this
 * is not simply the first DiscoveryProjectCard. A page that sells paid
 * placement should say when placement is why something leads, and
 * `getWhyLead` distinguishes mandate fit from a purchased spotlight from raw
 * engagement. It is imported from the shared broadsheet module, so desktop
 * and mobile cannot drift on that claim.
 *
 * The rotator is prev/next plus a stated position, not dots. Desktop draws one
 * dot per lead; five 8px dots are five sub-44px targets in a row, and "3 of 5"
 * in text says the same thing to a screen reader without them. The position is
 * a live region, because pressing Next changes content elsewhere on the card.
 */
import useScriptBookmark from "../../../../hooks/useScriptBookmark";
import { resolveMediaUrl } from "../../../../utils/mediaUrl";
import { getScriptCanonicalPath } from "../../../../utils/scriptPath";
import Badge from "../../../components/badges/Badge";
import Button from "../../../components/buttons/Button";
import IconButton from "../../../components/buttons/IconButton";
import Card, {
  CardBody,
  CardEyebrow,
  CardMedia,
  CardText,
  CardTitle,
} from "../../../components/cards/Card";
import {
  getCompletionLabel,
  getCreatorName,
  getFormatLabel,
  getLoglineLabel,
  getPriceLabel,
  getScore,
  getSpotlightLabel,
  getViews,
  getWhyLead,
  formatCount,
  hasTrailer,
} from "../../../../features/featured-broadsheet/featuredBroadsheet";
import "./FeaturedLeadCard.css";

const Fact = ({ label, value }) => (
  <div className="ckm-featured-lead__fact">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

export default function FeaturedLeadCard({
  project,
  mandate,
  sort,
  position,
  total,
  onPrev,
  onNext,
  onTrailer,
  onShare = null,
  projectTo = null,
}) {
  const { isBookmarked, canBookmark, pending, toggleBookmark } = useScriptBookmark(project);
  if (!project) return null;

  const title = project.title || "Untitled project";
  const spotlight = getSpotlightLabel(project, { isTop: position === 1 });
  const why = getWhyLead(project, { mandate, sort });
  const score = getScore(project);
  const destination = projectTo || getScriptCanonicalPath(project);

  return (
    <Card className="ckm-featured-lead">
      <CardMedia
        src={resolveMediaUrl(project.coverImage)}
        ratio="16 / 9"
        placeholderIcon="movie"
        overlay={spotlight ? <Badge tone="accent" size="sm">{spotlight}</Badge> : null}
      />
      <CardBody>
        <CardEyebrow>{getCreatorName(project)}{project.genre ? ` · ${project.genre}` : ""}</CardEyebrow>
        <CardTitle to={destination}>{title}</CardTitle>
        <CardText>{getLoglineLabel(project)}</CardText>

        {why && <p className="ckm-featured-lead__why">{why}</p>}

        <dl className="ckm-featured-lead__facts">
          <Fact label="Score" value={score ? `${score} / 100` : "Not evaluated"} />
          <Fact
            label="Format"
            value={`${getFormatLabel(project)}${project.pageCount ? ` · ${project.pageCount}p` : ""}`}
          />
          <Fact label="Views" value={formatCount(getViews(project))} />
          <Fact label="Price" value={getPriceLabel(project)} />
          <Fact label="Status" value={getCompletionLabel(project)} />
        </dl>

        <div className="ckm-featured-lead__actions">
          <Button to={destination} fullWidth>View project</Button>
          <div className="ckm-featured-lead__action-row">
            {canBookmark && (
              <IconButton
                icon={isBookmarked ? "bookmark" : "bookmark_add"}
                label={`${isBookmarked ? "Remove" : "Save"} ${title}`}
                active={isBookmarked}
                disabled={pending}
                onClick={toggleBookmark}
              />
            )}
            {onShare && (
              <IconButton icon="ios_share" label={`Share ${title}`} onClick={() => onShare(project)} />
            )}
            {hasTrailer(project) && (
              <Button variant="secondary" icon="play_arrow" onClick={onTrailer}>Trailer</Button>
            )}
          </div>
        </div>

        {total > 1 && (
          <div className="ckm-featured-lead__nav">
            <IconButton icon="chevron_left" label="Previous lead project" onClick={onPrev} />
            <span role="status" className="ckm-featured-lead__position">
              Lead {position} of {total}
            </span>
            <IconButton icon="chevron_right" label="Next lead project" onClick={onNext} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
