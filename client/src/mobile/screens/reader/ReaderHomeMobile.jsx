import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { READER_HOME_STATUS } from "../../../pages/reader-home/readerHome";
import { useReaderHome } from "../../../pages/reader-home/useReaderHome";
import AppBar from "../../components/app-bars/AppBar";
import Button from "../../components/buttons/Button";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import { useToast } from "../../components/feedback/toastContext";
import NavBar from "../../components/navigation/NavBar";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import { shareProject } from "../../data/shareProject";
import DiscoveryProjectCard from "../discovery/components/DiscoveryProjectCard";
import "./ReaderHomeMobile.css";

const firstName = (user) => String(user?.name || "Reader").trim().split(/\s+/, 1)[0] || "Reader";
const readerProjectPath = (project) => project?._id
  ? `/reader/script/${encodeURIComponent(project._id)}`
  : "/reader/search";

function ReaderShelf({ title, note, projects, total = null, onOpen, onShare, action = null }) {
  if (!projects.length) return null;
  return (
    <section className="ckm-reader-home__shelf" aria-labelledby={`reader-shelf-${title.toLowerCase().replace(/\W+/g, "-")}`}>
      <div className="ckm-reader-home__section-head">
        <div>
          <h2 id={`reader-shelf-${title.toLowerCase().replace(/\W+/g, "-")}`}>{title}</h2>
          {note ? <p>{note}</p> : null}
        </div>
        {action}
      </div>
      <div className="ckm-reader-home__grid">
        {projects.map((project) => (
          <DiscoveryProjectCard key={project._id} project={project} onOpen={onOpen} onShare={onShare} />
        ))}
      </div>
      {total != null && total > projects.length ? <p className="ckm-reader-home__count">Showing {projects.length} of {total}</p> : null}
    </section>
  );
}

export default function ReaderHomeMobile({ user, previewData = null, previewState = null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const live = useReaderHome({ readerId: user?._id || user?.id, enabled: !previewState, previewData });
  const state = previewState || live;
  const data = state.data || { fresh: [], read: [], favorites: [], counts: {}, degraded: {} };
  const openProject = useCallback((project) => navigate(readerProjectPath(project)), [navigate]);
  const onShare = useCallback(async (project) => {
    const outcome = await shareProject(project);
    if (outcome === "copied") toast.success("Project link copied");
    if (outcome === "failed") toast.error("Could not share this project");
  }, [toast]);
  const allEmpty = !data.read.length && !data.favorites.length && !data.fresh.length;
  const degraded = Object.entries(data.degraded || {}).filter(([, failed]) => failed).map(([key]) => key);

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="reader-home"
      className="ckm-reader-home"
      scrollClassName="ckm-reader-home__scroll"
      appBar={<AppBar user={user} />}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={state.retry}
    >
      <header className="ckm-reader-home__header">
        <p>Reader home · your library</p>
        <h1>{firstName(user)}, what will you read next?</h1>
        <span>Return to saved stories or discover newly published work.</span>
      </header>

      {state.status === READER_HOME_STATUS.LOADING ? (
        <SkeletonGroup label="Loading reader home" className="ckm-reader-home__loading">
          <SkeletonShape height={220} radius="var(--ckm-r-lg)" />
          <SkeletonShape height={220} radius="var(--ckm-r-lg)" />
          <SkeletonShape height={220} radius="var(--ckm-r-lg)" />
        </SkeletonGroup>
      ) : null}

      {state.status === READER_HOME_STATUS.FAILED ? (
        <InlineMessage variant="panel" title="Your reader home is unavailable" onRetry={state.retry}>
          {state.failure?.message || "Check your connection and try again."}
        </InlineMessage>
      ) : null}

      {state.status === READER_HOME_STATUS.READY && degraded.length ? (
        <InlineMessage title="Some shelves are unavailable">
          {degraded.includes("fresh") ? "Fresh projects could not be loaded. " : ""}
          {degraded.includes("read") || degraded.includes("favorites") ? "Part of your private library could not be loaded." : ""}
        </InlineMessage>
      ) : null}

      {state.status === READER_HOME_STATUS.READY && allEmpty ? (
        <EmptyState
          icon="auto_stories"
          titleAs="h2"
          title="Your reading desk is ready"
          body="Search the published catalogue, save projects, and your private reading shelves will appear here."
          actions={<Button to="/reader/search">Discover projects</Button>}
        />
      ) : null}

      {state.status === READER_HOME_STATUS.READY && !allEmpty ? (
        <div className="ckm-reader-home__shelves">
          <ReaderShelf
            title="Read again"
            note="Your recently updated reading history"
            projects={data.read.slice(0, 4)}
            total={data.counts.read}
            onOpen={openProject}
            onShare={onShare}
            action={<Link to="/reader/profile?tab=read">View all</Link>}
          />
          <ReaderShelf
            title="Favorites"
            note="Projects you saved for later"
            projects={data.favorites.slice(0, 4)}
            total={data.counts.favorites}
            onOpen={openProject}
            onShare={onShare}
            action={<Link to="/reader/profile?tab=favorites">View all</Link>}
          />
          <ReaderShelf
            title="Fresh projects"
            note="Recently published and available to read"
            projects={data.fresh}
            onOpen={openProject}
            onShare={onShare}
            action={<Link to="/reader/search">Discover</Link>}
          />
          <nav className="ckm-reader-home__more" aria-label="More reader discovery">
            <Button variant="secondary" to="/featured">Featured projects</Button>
            <Button variant="secondary" to="/top-script">Top scripts</Button>
          </nav>
        </div>
      ) : null}
    </MobileShell>
  );
}
