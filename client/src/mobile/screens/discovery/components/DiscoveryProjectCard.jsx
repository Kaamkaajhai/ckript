import useScriptBookmark from "../../../../hooks/useScriptBookmark";
import { resolveMediaUrl } from "../../../../utils/mediaUrl";
import { getScriptCanonicalPath } from "../../../../utils/scriptPath";
import Badge from "../../../components/badges/Badge";
import IconButton from "../../../components/buttons/IconButton";
import Card, {
  CardActions,
  CardBody,
  CardEyebrow,
  CardFooter,
  CardMedia,
  CardTags,
  CardText,
  CardTitle,
} from "../../../components/cards/Card";
import "./DiscoveryProjectCard.css";

const compactNumber = (value) => new Intl.NumberFormat(undefined, {
  notation: Number(value) >= 1000 ? "compact" : "standard",
  maximumFractionDigits: 1,
}).format(Number(value) || 0);

const resultScore = (project) => {
  const platform = typeof project?.platformScore === "object"
    ? project.platformScore?.overall
    : project?.platformScore;
  const raw = platform ?? project?.scriptScore?.overall ?? project?.rating;
  const score = Number(raw);
  return Number.isFinite(score) && score > 0 ? Math.round(score) : null;
};

export default function DiscoveryProjectCard({
  project,
  rank = null,
  metric = null,
  onOpen = null,
  onShare = null,
  className = "",
  // One annotation slot, under the tags and above the footer. Featured uses it
  // for the mandate conditions a project satisfies — a reason this card is in
  // THIS section, which is meaningless on Search and Top. A prop per caller
  // would turn the shared card into a union of three screens.
  children = null,
}) {
  const { isBookmarked, canBookmark, pending, toggleBookmark } = useScriptBookmark(project);
  const cover = resolveMediaUrl(project?.coverImage);
  const genre = project?.primaryGenre || project?.genre;
  const format = project?.contentType || project?.format;
  const score = resultScore(project);
  const price = project?.premium && Number(project?.price) > 0
    ? `₹${Number(project.price).toLocaleString()}`
    : "Free";
  const title = project?.title || "Untitled project";
  const titleProps = onOpen
    ? { onClick: () => onOpen(project) }
    : { to: getScriptCanonicalPath(project) };

  return (
    <Card className={["ckm-discovery-project", className].filter(Boolean).join(" ")}>
      <CardMedia
        src={cover}
        ratio="16 / 9"
        placeholderIcon="movie"
        overlay={(
          <>
            {rank != null && <Badge tone="accent" size="sm">Rank {rank}</Badge>}
            <Badge tone={project?.verifiedBadge ? "success" : "neutral"} size="sm">{price}</Badge>
          </>
        )}
      />
      <CardBody>
        <CardEyebrow>
          {project?.creator?.name || "Ckript writer"}{genre ? ` · ${genre}` : ""}
        </CardEyebrow>
        <CardTitle {...titleProps}>{title}</CardTitle>
        <CardText>{project?.logline || project?.description || project?.synopsis || "Open this project to learn more."}</CardText>
        {(genre || format) && (
          <CardTags>
            {genre && <Badge size="sm">{genre}</Badge>}
            {format && <Badge size="sm">{String(format).replace(/_/g, " ")}</Badge>}
          </CardTags>
        )}
        {children}
      </CardBody>
      <CardFooter>
        <span className="ckm-discovery-project__stats">
          {metric && (
            <span className="ckm-discovery-project__metric">
              <span className="material-symbols-outlined" aria-hidden="true">leaderboard</span>
              <span><b>{metric.value}</b> {metric.label}</span>
            </span>
          )}
          {!metric && (
            <>
              <span><span className="material-symbols-outlined" aria-hidden="true">visibility</span>{compactNumber(project?.views)}</span>
              {score != null && <span><span className="material-symbols-outlined" aria-hidden="true">star</span>{score}</span>}
            </>
          )}
        </span>
        <CardActions>
          {canBookmark && (
            <IconButton
              icon={isBookmarked ? "bookmark" : "bookmark_add"}
              label={`${isBookmarked ? "Remove" : "Save"} ${title}`}
              size="sm"
              active={isBookmarked}
              disabled={pending}
              onClick={toggleBookmark}
            />
          )}
          {onShare && (
            <IconButton
              icon="ios_share"
              label={`Share ${title}`}
              size="sm"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onShare(project);
              }}
            />
          )}
        </CardActions>
      </CardFooter>
    </Card>
  );
}
