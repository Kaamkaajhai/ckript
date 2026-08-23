import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  READER_DISCOVER_FORMATS,
  READER_DISCOVER_GENRES,
  READER_HOME_STATUS,
  readReaderDiscoverQuery,
  writeReaderDiscoverQuery,
} from "../../../pages/reader-home/readerHome";
import { useReaderDiscover } from "../../../pages/reader-home/useReaderHome";
import PageHeader from "../../components/app-bars/PageHeader";
import Button from "../../components/buttons/Button";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import { useToast } from "../../components/feedback/toastContext";
import SelectField from "../../components/forms/SelectField";
import TextField from "../../components/forms/TextField";
import NavBar from "../../components/navigation/NavBar";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import { shareProject } from "../../data/shareProject";
import DiscoveryProjectCard from "../discovery/components/DiscoveryProjectCard";
import "./ReaderHomeMobile.css";

export default function ReaderDiscoverMobile({ user, previewData = null, previewState = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const query = useMemo(() => readReaderDiscoverQuery(searchParams), [searchParams]);
  const live = useReaderDiscover({ query, enabled: !previewState, previewData });
  const state = previewState || live;
  const data = state.data;

  const updateQuery = useCallback((patch) => {
    setSearchParams(writeReaderDiscoverQuery(searchParams, { ...patch, page: patch.page ?? 1 }), { replace: true });
  }, [searchParams, setSearchParams]);
  const openProject = useCallback((project) => {
    if (project?._id) navigate(`/reader/script/${encodeURIComponent(project._id)}`);
  }, [navigate]);
  const onShare = useCallback(async (project) => {
    const outcome = await shareProject(project);
    if (outcome === "copied") toast.success("Project link copied");
    if (outcome === "failed") toast.error("Could not share this project");
  }, [toast]);

  const genreOptions = [{ value: "", label: "All genres" }, ...READER_DISCOVER_GENRES.map((genre) => ({ value: genre, label: genre }))];

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="reader-discover"
      className="ckm-reader-home ckm-reader-home--discover"
      scrollClassName="ckm-reader-home__scroll"
      appBar={<PageHeader title="Discover" eyebrow="Reader" />}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={state.retry}
    >
      <section className="ckm-reader-home__discover-controls" aria-label="Discover projects">
        <TextField
          label="Search projects"
          purpose="search"
          icon="search"
          value={query.q}
          maxLength={120}
          placeholder="Title, genre, tag, or Ckript ID"
          onChange={(event) => updateQuery({ q: event.target.value })}
        />
        <div className="ckm-reader-home__filters">
          <SelectField label="Format" value={query.category} options={READER_DISCOVER_FORMATS} onChange={(event) => updateQuery({ category: event.target.value })} />
          <SelectField label="Genre" value={query.genre} options={genreOptions} onChange={(event) => updateQuery({ genre: event.target.value })} />
        </div>
      </section>

      {state.status === READER_HOME_STATUS.LOADING ? (
        <SkeletonGroup label="Loading reader discovery" className="ckm-reader-home__loading">
          <SkeletonShape height={230} radius="var(--ckm-r-lg)" />
          <SkeletonShape height={230} radius="var(--ckm-r-lg)" />
        </SkeletonGroup>
      ) : null}
      {state.status === READER_HOME_STATUS.FAILED ? (
        <InlineMessage variant="panel" title="Reader discovery is unavailable" onRetry={state.retry}>
          {state.failure?.message || "Check your connection and try again. Your search is still here."}
        </InlineMessage>
      ) : null}
      {state.status === READER_HOME_STATUS.READY && data?.total === 0 ? (
        <EmptyState
          icon="search_off"
          titleAs="h2"
          title={query.q ? `No projects for “${query.q}”` : "No projects match these filters"}
          body="Try different words or clear a filter."
          actions={(query.q || query.genre || query.category) ? <Button variant="secondary" onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}>Clear search</Button> : null}
        />
      ) : null}
      {state.status === READER_HOME_STATUS.READY && data?.total > 0 ? (
        <section className="ckm-reader-home__results" aria-labelledby="reader-results-title">
          <div className="ckm-reader-home__section-head">
            <div>
              <h2 id="reader-results-title">Projects</h2>
              <p role="status">{data.total} {data.total === 1 ? "result" : "results"} · page {data.page} of {data.totalPages}</p>
            </div>
          </div>
          <div className="ckm-reader-home__grid">
            {data.scripts.map((project) => <DiscoveryProjectCard key={project._id} project={project} onOpen={openProject} onShare={onShare} />)}
          </div>
          {data.totalPages > 1 ? (
            <nav className="ckm-reader-home__pagination" aria-label="Reader discovery pages">
              <Button variant="secondary" disabled={!data.hasPrevious} onClick={() => updateQuery({ page: data.page - 1 })}>Previous</Button>
              <span>Page {data.page} of {data.totalPages}</span>
              <Button variant="secondary" disabled={!data.hasNext} onClick={() => updateQuery({ page: data.page + 1 })}>Next</Button>
            </nav>
          ) : null}
        </section>
      ) : null}
    </MobileShell>
  );
}
