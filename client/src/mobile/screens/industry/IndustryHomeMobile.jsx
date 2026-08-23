import { useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  SORT_OPTIONS,
  buildShelves,
  collectFeedProjects,
  getBriefCompletion,
  getFirstName,
  sortProjects,
} from "../../../features/investor-desk/investorDesk";
import {
  INDUSTRY_HOME_STATUS,
  readIndustryHomeQuery,
  recordIndustryHomeOpen,
  writeIndustryHomeQuery,
} from "../../../features/investor-desk/industryHome";
import useIndustryHome from "../../../features/investor-desk/useIndustryHome";
import { getScriptCanonicalPath } from "../../../utils/scriptPath";
import AppBar from "../../components/app-bars/AppBar";
import Button from "../../components/buttons/Button";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import SelectField from "../../components/forms/SelectField";
import NavBar from "../../components/navigation/NavBar";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import DiscoveryProjectCard from "../discovery/components/DiscoveryProjectCard";
import "./IndustryHomeMobile.css";

export default function IndustryHomeMobile({ user, previewData = null, previewState = null }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => readIndustryHomeQuery(searchParams), [searchParams]);
  const liveHome = useIndustryHome({ enabled: !previewState, previewData });
  const home = previewState || liveHome;
  const feed = home.data?.feed;
  const shelves = useMemo(() => buildShelves(feed), [feed]);
  const activeShelf = shelves.some((shelf) => shelf.id === query.shelf) ? query.shelf : "all";
  const projects = useMemo(() => {
    const source = activeShelf === "all"
      ? collectFeedProjects(feed)
      : shelves.find((shelf) => shelf.id === activeShelf)?.items || [];
    return sortProjects(source, query.sort);
  }, [activeShelf, feed, query.sort, shelves]);
  const brief = useMemo(() => getBriefCompletion(home.data?.profile), [home.data?.profile]);

  const setQuery = useCallback((patch) => {
    setSearchParams(writeIndustryHomeQuery(searchParams, patch), { replace: true });
  }, [searchParams, setSearchParams]);

  const openProject = useCallback((project) => {
    recordIndustryHomeOpen(project?._id).catch(() => null);
    navigate(getScriptCanonicalPath(project));
  }, [navigate]);

  const shelfOptions = [
    { value: "all", label: "All matches" },
    ...shelves.map((shelf) => ({ value: shelf.id, label: shelf.title })),
  ];

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="industry-home"
      className="ckm-industry-home"
      scrollClassName="ckm-industry-home__scroll"
      appBar={<AppBar user={user} />}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={home.retry}
    >
      <header className="ckm-industry-home__header">
        <p className="ckm-industry-home__eyebrow">Industry desk · matched daily</p>
        <h1>{getFirstName(user)}, find your next project</h1>
        <p>Published work ranked against your genres, formats, budget and recent reading.</p>
      </header>

      {home.status === INDUSTRY_HOME_STATUS.LOADING && (
        <SkeletonGroup label="Loading your industry desk" className="ckm-industry-home__loading">
          <SkeletonShape height={116} radius="var(--ckm-r-lg)" />
          <SkeletonShape height={270} radius="var(--ckm-r-lg)" />
          <SkeletonShape height={270} radius="var(--ckm-r-lg)" />
        </SkeletonGroup>
      )}

      {home.status === INDUSTRY_HOME_STATUS.FAILED && (
        <InlineMessage variant="panel" title="Your industry desk is unavailable" onRetry={home.retry}>
          {home.failure?.message || "Check your connection and try again."}
        </InlineMessage>
      )}

      {home.status === INDUSTRY_HOME_STATUS.READY && home.data?.degraded && (
        <InlineMessage title="Showing latest projects">
          Personalised matching is temporarily unavailable. Your standing brief is unchanged.
        </InlineMessage>
      )}

      {home.status === INDUSTRY_HOME_STATUS.READY && (
        <>
          <section className="ckm-industry-home__brief" aria-label="Standing brief">
            <div>
              <span>Standing brief</span>
              <strong>{brief.percent}% complete</strong>
            </div>
            <div className="ckm-industry-home__meter" aria-hidden="true">
              <span style={{ width: `${brief.percent}%` }} />
            </div>
            <Link to="/mandates">Refine brief</Link>
          </section>

          <section className="ckm-industry-home__controls" aria-label="Project shelf and sort">
            <SelectField
              label="Shelf"
              value={activeShelf}
              options={shelfOptions}
              onChange={(event) => setQuery({ shelf: event.target.value })}
            />
            <SelectField
              label="Sort"
              value={query.sort}
              options={SORT_OPTIONS}
              onChange={(event) => setQuery({ sort: event.target.value })}
            />
          </section>

          {projects.length === 0 ? (
            <EmptyState
              icon="movie_filter"
              titleAs="h2"
              title="No project matches this shelf"
              body="Widen your standing brief or browse the full published catalogue."
              actions={<Button variant="secondary" to="/search">Browse all projects</Button>}
            />
          ) : (
            <section className="ckm-industry-home__projects" aria-labelledby="ckm-industry-home-projects">
              <div className="ckm-industry-home__section-head">
                <h2 id="ckm-industry-home-projects">{activeShelf === "all" ? "Best matches" : shelfOptions.find((item) => item.value === activeShelf)?.label}</h2>
                <span>{projects.length} {projects.length === 1 ? "project" : "projects"}</span>
              </div>
              <div className="ckm-industry-home__grid">
                {projects.map((project, index) => (
                  <DiscoveryProjectCard
                    key={project._id}
                    project={project}
                    rank={index + 1}
                    onOpen={openProject}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </MobileShell>
  );
}
