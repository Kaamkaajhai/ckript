import { Link } from "react-router-dom";
import { PROFILE_COLLECTION_STATUS } from "../../../../pages/profile/profileCollections";
import { safeMediaSrc } from "../../../../utils/safeMediaSrc";
import Badge from "../../../components/badges/Badge";
import Button from "../../../components/buttons/Button";
import InlineMessage from "../../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../../components/feedback/Skeletons";
import SegmentedControl from "../../../components/tabs/SegmentedControl";
import "./ProfileCollectionsMobile.css";

const POST_MEDIA = { media: ["image", "video"] };

const dateLabel = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const idOf = (item) => String(item?._id || item?.id || "");

function ActivityCard({ post }) {
  const image = safeMediaSrc(post.image, POST_MEDIA);
  const video = safeMediaSrc(post.video, POST_MEDIA);
  return (
    <article className="ckm-profile-collection__post">
      {post.content ? <p>{post.content}</p> : null}
      {image ? <img src={image} alt={post.content ? "" : "Image shared with this post"} loading="lazy" /> : null}
      {video ? <video src={video} controls preload="metadata" aria-label="Video shared with this post">Your browser cannot play this video.</video> : null}
      <footer>
        <time dateTime={post.createdAt || undefined}>{dateLabel(post.createdAt)}</time>
        <span>{post.counts?.likes || 0} likes</span>
        <span>{post.counts?.comments || 0} comments</span>
        <span>{post.counts?.saves || 0} saves</span>
      </footer>
    </article>
  );
}

function SavedProjectRow({ project, removing, onRemove }) {
  const id = idOf(project);
  const path = project.canonicalPath || (id ? `/script/${encodeURIComponent(id)}` : "");
  const genre = project.primaryGenre || project.genre || project.classification?.genres?.[0] || "Project";
  return (
    <article className="ckm-profile-collection__project">
      <div>
        <Badge tone="accent">{genre}</Badge>
        <span>{dateLabel(project.updatedAt || project.publishedAt || project.createdAt)}</span>
      </div>
      {path ? <Link to={path}>{project.title || "Untitled project"} <span aria-hidden="true">→</span></Link> : <strong>{project.title || "Untitled project"}</strong>}
      <p>{project.logline || project.synopsis || "No logline provided."}</p>
      <Button variant="tertiary" pending={removing} disabled={!id} onClick={() => onRemove(id)}>
        Remove from saved
      </Button>
    </article>
  );
}

export default function ProfileCollectionsMobile({
  state,
  section,
  page,
  own = false,
  onLocationChange,
  onRemoveSaved,
}) {
  const tabs = own ? [
    { value: "activity", label: "Activity", count: state.data?.counts?.activity },
    { value: "bookmarks", label: "Saved", count: state.data?.counts?.bookmarks },
  ] : [];
  const title = own
    ? section === "bookmarks" ? "Your saved projects" : "Your activity"
    : "Recent activity";

  return (
    <section className="ckm-profile-collection" aria-labelledby="profile-collection-title">
      <h2 id="profile-collection-title">{title}</h2>
      {own ? (
        <SegmentedControl
          label="Profile collection"
          name="profile-collection"
          value={section}
          options={tabs}
          onChange={(value) => onLocationChange(value, 1)}
        />
      ) : null}

      {state.status === PROFILE_COLLECTION_STATUS.LOADING ? (
        <SkeletonGroup label={`Loading ${section === "bookmarks" ? "saved projects" : "activity"}`}>
          <SkeletonShape height={150} />
          <SkeletonShape height={150} />
        </SkeletonGroup>
      ) : state.status === PROFILE_COLLECTION_STATUS.FAILED ? (
        <InlineMessage variant="panel" tone="error" title={`Could not load ${section === "bookmarks" ? "saved projects" : "activity"}`} onRetry={state.reload}>
          {state.failure?.message}
        </InlineMessage>
      ) : state.data?.items?.length ? (
        <div className="ckm-profile-collection__items">
          {section === "bookmarks"
            ? state.data.items.map((project) => (
              <SavedProjectRow
                key={idOf(project)}
                project={project}
                removing={state.removingId === idOf(project)}
                onRemove={onRemoveSaved}
              />
            ))
            : state.data.items.map((post) => <ActivityCard key={idOf(post)} post={post} />)}
        </div>
      ) : state.status === PROFILE_COLLECTION_STATUS.READY ? (
        <InlineMessage variant="panel" title={section === "bookmarks" ? "No saved projects" : "No activity yet"}>
          {section === "bookmarks"
            ? "Projects you save will stay private and appear here."
            : own ? "Posts you share will appear here." : "This member has not shared any posts yet."}
        </InlineMessage>
      ) : null}

      {state.actionError ? <InlineMessage tone="error">{state.actionError}</InlineMessage> : null}
      {state.data?.pagination?.totalPages > 1 ? (
        <nav className="ckm-profile-collection__pagination" aria-label={`${section === "bookmarks" ? "Saved project" : "Activity"} pages`}>
          <Button variant="secondary" disabled={!state.data.pagination.hasPrevious} onClick={() => onLocationChange(section, page - 1)}>Previous</Button>
          <span>Page {page} of {state.data.pagination.totalPages}</span>
          <Button variant="secondary" disabled={!state.data.pagination.hasNext} onClick={() => onLocationChange(section, page + 1)}>Next</Button>
        </nav>
      ) : null}
    </section>
  );
}
