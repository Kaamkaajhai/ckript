import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../services/api";
import AppBar from "../../components/app-bars/AppBar";
import Button from "../../components/buttons/Button";
import Chip, { ChipRow } from "../../components/chips/Chip";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import { useToast } from "../../components/feedback/toastContext";
import SelectField from "../../components/forms/SelectField";
import LoadMore from "../../components/lists/LoadMore";
import NavBar from "../../components/navigation/NavBar";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import { shareProject } from "../../data/shareProject";
import DiscoveryFiltersDialog from "./components/DiscoveryFiltersDialog";
import DiscoveryProjectCard from "./components/DiscoveryProjectCard";
import {
  EMPTY_TOP_SCRIPTS_STATE,
  TOP_SCRIPTS_BUDGETS,
  TOP_SCRIPTS_CONTENT_TYPES,
  TOP_SCRIPTS_GENRES,
  TOP_SCRIPTS_PRICING,
  TOP_SCRIPTS_SORTS,
  activeTopScriptsFilters,
  appendTopScriptsPage,
  buildTopScriptsApiParams,
  describeTopScriptMetric,
  normalizeTopScriptsPage,
  readTopScriptsState,
  topScriptsStateToParams,
} from "./topScriptsModel";
import "./TopScriptsMobile.css";

const emptyPage = () => normalizeTopScriptsPage({ scripts: [], pagination: {} });

function TopScriptsLoading() {
  return (
    <SkeletonGroup label="Loading top scripts" className="ckm-top-scripts__loading">
      <SkeletonShape height={244} radius="var(--ckm-r-lg)" />
      <SkeletonShape height={244} radius="var(--ckm-r-lg)" />
      <SkeletonShape height={244} radius="var(--ckm-r-lg)" />
    </SkeletonGroup>
  );
}

export default function TopScriptsMobile({ user, previewData = null }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => readTopScriptsState(searchParams), [searchParams]);
  const queryKey = topScriptsStateToParams(state).toString();
  const activeRanking = TOP_SCRIPTS_SORTS.find(({ value }) => value === state.sort) || TOP_SCRIPTS_SORTS[0];

  const [results, setResults] = useState(emptyPage);
  const [status, setStatus] = useState("loading");
  const [appendPending, setAppendPending] = useState(false);
  const [appendError, setAppendError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState(EMPTY_TOP_SCRIPTS_STATE);
  const [retryNonce, setRetryNonce] = useState(0);
  const appendControllerRef = useRef(null);
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const setState = useCallback((patch) => {
    setSearchParams(topScriptsStateToParams({ ...state, ...patch }), { replace: true });
  }, [setSearchParams, state]);

  useEffect(() => {
    appendControllerRef.current?.abort();
    setAppendPending(false);
    setAppendError("");

    if (previewData) {
      setResults(normalizeTopScriptsPage(previewData));
      setStatus("ready");
      return undefined;
    }

    const controller = new AbortController();
    setStatus("loading");
    api.get("/scripts/top-list", {
      params: buildTopScriptsApiParams(state, 1),
      signal: controller.signal,
    }).then(({ data }) => {
      if (!controller.signal.aborted) {
        setResults(normalizeTopScriptsPage(data));
        setStatus("ready");
      }
    }).catch((cause) => {
      if (!controller.signal.aborted && cause?.code !== "ERR_CANCELED") setStatus("error");
    });

    return () => controller.abort();
  }, [previewData, queryKey, retryNonce, state]);

  useEffect(() => () => appendControllerRef.current?.abort(), []);

  const loadMore = useCallback(async () => {
    if (appendPending) return;
    const requestedKey = queryKeyRef.current;
    const controller = new AbortController();
    appendControllerRef.current?.abort();
    appendControllerRef.current = controller;
    setAppendPending(true);
    setAppendError("");
    try {
      const { data } = await api.get("/scripts/top-list", {
        params: buildTopScriptsApiParams(state, results.page + 1),
        signal: controller.signal,
      });
      if (!controller.signal.aborted && requestedKey === queryKeyRef.current) {
        setResults((current) => appendTopScriptsPage(current, normalizeTopScriptsPage(data)));
      }
    } catch (cause) {
      if (!controller.signal.aborted && cause?.code !== "ERR_CANCELED") {
        setAppendError("The next ranked page could not be loaded.");
      }
    } finally {
      if (!controller.signal.aborted && requestedKey === queryKeyRef.current) setAppendPending(false);
    }
  }, [appendPending, results.page, state]);

  const openFilters = () => {
    setFilterDraft(state);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setState(filterDraft);
    setFiltersOpen(false);
  };

  const clearFilters = () => setState({ genre: "", contentType: "", budget: "", pricing: "all" });
  const filters = activeTopScriptsFilters(state);

  const onShare = useCallback(async (project) => {
    const outcome = await shareProject(project);
    if (outcome === "copied") toast.success("Link copied", project?.title);
    if (outcome === "failed") toast.error("Could not share this project", "Open it and copy the public link instead.");
  }, [toast]);

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="top-scripts"
      className="ckm-top-scripts"
      scrollClassName="ckm-top-scripts__scroll"
      appBar={<AppBar user={user} />}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={() => setRetryNonce((value) => value + 1)}
      overlays={(
        <DiscoveryFiltersDialog
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filter top scripts"
          description="Apply the same facets to this ranked collection."
          draft={filterDraft}
          setDraft={setFilterDraft}
          onReset={() => setFilterDraft({ ...EMPTY_TOP_SCRIPTS_STATE, sort: filterDraft.sort })}
          onApply={applyFilters}
          sortOptions={TOP_SCRIPTS_SORTS}
          genres={TOP_SCRIPTS_GENRES}
          contentTypes={TOP_SCRIPTS_CONTENT_TYPES}
          budgets={TOP_SCRIPTS_BUDGETS}
          pricingOptions={TOP_SCRIPTS_PRICING}
        />
      )}
    >
      <header className="ckm-top-scripts__header">
        <p className="ckm-top-scripts__eyebrow">Ckript rankings</p>
        <h1>Top scripts</h1>
        <p>{activeRanking.description}. Rankings use published projects visible to your account.</p>
      </header>

      <section className="ckm-top-scripts__controls" aria-label="Ranking and filters">
        <SelectField
          label="Ranking"
          hint={activeRanking.description}
          value={state.sort}
          options={TOP_SCRIPTS_SORTS}
          onChange={(event) => setState({ sort: event.target.value })}
        />
        <div className="ckm-top-scripts__filter-row">
          <Button variant="secondary" icon="tune" onClick={openFilters} aria-haspopup="dialog" aria-expanded={filtersOpen}>
            Filters{filters.length ? ` (${filters.length})` : ""}
          </Button>
          {filters.length > 0 && <Button variant="tertiary" onClick={clearFilters}>Clear all</Button>}
        </div>
        {filters.length > 0 && (
          <ChipRow label="Active top-script filters">
            {filters.map((filter) => (
              <Chip
                key={filter.key}
                selected
                onRemove={() => setState({ [filter.key]: filter.reset })}
                removeLabel={`Remove ${filter.label}`}
              >
                {filter.label}
              </Chip>
            ))}
          </ChipRow>
        )}
      </section>

      {status === "loading" && <TopScriptsLoading />}

      {status === "error" && (
        <InlineMessage
          variant="panel"
          title="Rankings are unavailable"
          onRetry={() => setRetryNonce((value) => value + 1)}
        >
          Check your connection and try again. Your ranking and filters are still here.
        </InlineMessage>
      )}

      {status === "ready" && results.total === 0 && (
        <EmptyState
          icon="leaderboard"
          titleAs="h2"
          title="No ranked projects match"
          body="Try another ranking or remove one of the filters."
          actions={filters.length > 0 ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : null}
        />
      )}

      {status === "ready" && results.total > 0 && (
        <section className="ckm-top-scripts__results" aria-labelledby="ckm-top-scripts-results-title">
          <div className="ckm-top-scripts__results-heading">
            <h2 id="ckm-top-scripts-results-title">{activeRanking.label}</h2>
            <p role="status">{results.total} ranked {results.total === 1 ? "project" : "projects"}</p>
          </div>
          <div className="ckm-top-scripts__grid">
            {results.scripts.map((project, index) => (
              <DiscoveryProjectCard
                key={project._id}
                project={project}
                rank={index + 1}
                metric={describeTopScriptMetric(project, state.sort)}
                onShare={onShare}
              />
            ))}
          </div>
          <LoadMore
            loaded={results.scripts.length}
            total={results.total}
            pageSize={results.limit}
            pending={appendPending}
            error={appendError}
            onLoadMore={results.hasMore ? loadMore : undefined}
            onRetry={loadMore}
            noun="projects"
            endMessage="End of rankings"
          />
        </section>
      )}
    </MobileShell>
  );
}
