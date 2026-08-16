import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../services/api";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { getProfileCanonicalPath } from "../../../utils/profilePath";
import AppBar from "../../components/app-bars/AppBar";
import Button from "../../components/buttons/Button";
import Chip, { ChipRow } from "../../components/chips/Chip";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonRows, SkeletonShape } from "../../components/feedback/Skeletons";
import { useToast } from "../../components/feedback/toastContext";
import TextField from "../../components/forms/TextField";
import List from "../../components/lists/List";
import ListRow from "../../components/lists/ListRow";
import LoadMore from "../../components/lists/LoadMore";
import NavBar from "../../components/navigation/NavBar";
import SegmentedControl from "../../components/tabs/SegmentedControl";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import { shareProject } from "../../data/shareProject";
import DiscoveryFiltersDialog from "./components/DiscoveryFiltersDialog";
import DiscoveryProjectCard from "./components/DiscoveryProjectCard";
import {
  EMPTY_SEARCH_STATE,
  SEARCH_BUDGETS,
  SEARCH_CONTENT_TYPES,
  SEARCH_GENRES,
  SEARCH_PAGE_SIZE,
  SEARCH_PRICING,
  SEARCH_SCOPES,
  SEARCH_SORTS,
  activeSearchFilters,
  appendSearchPage,
  buildSearchApiParams,
  hasSearchIntent,
  normalizeSearchPage,
  readSearchState,
  searchStateToParams,
} from "./searchModel";
import "./SearchMobile.css";

const POPULAR_GENRES = SEARCH_GENRES.slice(0, 8);

const emptyResults = () => normalizeSearchPage({});

const compactNumber = (value) => new Intl.NumberFormat(undefined, {
  notation: Number(value) >= 1000 ? "compact" : "standard",
  maximumFractionDigits: 1,
}).format(Number(value) || 0);

const roleLabel = (role) => {
  if (role === "investor") return "Industry";
  if (role === "creator" || role === "writer") return "Writer";
  const label = String(role || "Member").replace(/_/g, " ");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
};

function PersonAvatar({ person }) {
  const image = resolveMediaUrl(person?.profileImage);
  const initials = String(person?.name || "CK")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="ckm-search__avatar">
      {image ? <img src={image} alt="" loading="lazy" /> : <span aria-hidden="true">{initials}</span>}
    </span>
  );
}

function SearchLoading() {
  return (
    <SkeletonGroup label="Searching Ckript" className="ckm-search__loading">
      <SkeletonRows rows={3} media />
      <span className="ckm-search__skeleton-cards">
        <SkeletonShape height={210} radius="var(--ckm-r-lg)" />
        <SkeletonShape height={210} radius="var(--ckm-r-lg)" />
      </span>
    </SkeletonGroup>
  );
}

export default function SearchMobile({ user, previewData = null }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => readSearchState(searchParams), [searchParams]);
  const queryKey = searchStateToParams(state).toString();
  const intent = Boolean(previewData) || hasSearchIntent(state);
  const projectScope = state.type === "all" || state.type === "projects";

  const [results, setResults] = useState(emptyResults);
  const [status, setStatus] = useState("idle");
  const [appendPending, setAppendPending] = useState(false);
  const [appendError, setAppendError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState(EMPTY_SEARCH_STATE);
  const [retryNonce, setRetryNonce] = useState(0);
  const appendControllerRef = useRef(null);
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const setState = useCallback((patch) => {
    const next = { ...state, ...patch };
    setSearchParams(searchStateToParams(next), { replace: true });
  }, [setSearchParams, state]);

  useEffect(() => {
    appendControllerRef.current?.abort();
    setAppendPending(false);
    setAppendError("");

    if (previewData) {
      setResults(normalizeSearchPage(previewData));
      setStatus("ready");
      return undefined;
    }

    if (!intent) {
      setResults(emptyResults());
      setStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const { data } = await api.get("/search", {
          params: buildSearchApiParams(state, 1),
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setResults(normalizeSearchPage(data));
          setStatus("ready");
        }
      } catch (cause) {
        if (!controller.signal.aborted && cause?.code !== "ERR_CANCELED") setStatus("error");
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [intent, previewData, queryKey, retryNonce, state]);

  const loadMore = useCallback(async () => {
    if (appendPending) return;
    const requestedKey = queryKeyRef.current;
    const controller = new AbortController();
    appendControllerRef.current?.abort();
    appendControllerRef.current = controller;
    setAppendPending(true);
    setAppendError("");

    try {
      const { data } = await api.get("/search", {
        params: buildSearchApiParams(state, results.page + 1),
        signal: controller.signal,
      });
      if (!controller.signal.aborted && requestedKey === queryKeyRef.current) {
        setResults((current) => appendSearchPage(current, normalizeSearchPage(data)));
      }
    } catch (cause) {
      if (!controller.signal.aborted && cause?.code !== "ERR_CANCELED") {
        setAppendError("The next page could not be loaded.");
      }
    } finally {
      if (!controller.signal.aborted && requestedKey === queryKeyRef.current) setAppendPending(false);
    }
  }, [appendPending, results.page, state]);

  useEffect(() => () => appendControllerRef.current?.abort(), []);

  const openFilters = () => {
    setFilterDraft(state);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setState({
      genre: filterDraft.genre,
      contentType: filterDraft.contentType,
      budget: filterDraft.budget,
      pricing: filterDraft.pricing,
      sort: filterDraft.sort,
    });
    setFiltersOpen(false);
  };

  const clearProjectFilters = () => setState({
    genre: "",
    contentType: "",
    budget: "",
    pricing: "all",
    sort: "newest",
  });

  const changeScope = (type) => setState(projectScope && type !== "all" && type !== "projects"
    ? { type, genre: "", contentType: "", budget: "", pricing: "all", sort: "newest" }
    : { type });

  const onShare = useCallback(async (project) => {
    const outcome = await shareProject(project);
    if (outcome === "copied") toast.success("Link copied", project?.title);
    if (outcome === "failed") toast.error("Could not share this project", "Open the project and copy its public link instead.");
  }, [toast]);

  const filters = activeSearchFilters(state);
  const total = results.usersTotal + results.scriptsTotal;
  const loaded = results.users.length + results.scripts.length;
  const hasMore = results.usersHasMore || results.scriptsHasMore;
  const resultWord = total === 1 ? "result" : "results";

  const shell = {
    mode: MOBILE_SHELL_MODE.STANDARD,
    screenId: "search",
    className: "ckm-search",
    scrollClassName: "ckm-search__scroll",
    appBar: <AppBar user={user} />,
    bottomNav: <NavBar user={user} />,
    onConnectionRestored: () => setRetryNonce((value) => value + 1),
  };

  return (
    <MobileShell
      {...shell}
      overlays={(
        <DiscoveryFiltersDialog
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          description="Refine the project results. People are matched by your search words."
          draft={filterDraft}
          setDraft={setFilterDraft}
          onReset={() => setFilterDraft({ ...filterDraft, genre: "", contentType: "", budget: "", pricing: "all", sort: "newest" })}
          onApply={applyFilters}
          sortOptions={SEARCH_SORTS}
          genres={SEARCH_GENRES}
          contentTypes={SEARCH_CONTENT_TYPES}
          budgets={SEARCH_BUDGETS}
          pricingOptions={SEARCH_PRICING}
        />
      )}
    >
      <header className="ckm-search__header">
        <p className="ckm-search__eyebrow">Ckript discovery</p>
        <h1 className="ckm-search__heading">Discover</h1>
        <p className="ckm-search__intro">Find projects, writers, and industry collaborators.</p>
      </header>

      <section className="ckm-search__controls" aria-label="Search controls">
        <TextField
          label="Search Ckript"
          purpose="search"
          icon="search"
          value={state.q}
          maxLength={120}
          placeholder="Title, writer, genre, or SID"
          onChange={(event) => setState({ q: event.target.value })}
        />
        <SegmentedControl
          label="Search in"
          name="ckm-search-scope"
          value={state.type}
          options={SEARCH_SCOPES}
          onChange={changeScope}
        />

        {projectScope && (
          <div className="ckm-search__filter-row">
            <Button
              variant="secondary"
              icon="tune"
              onClick={openFilters}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
            >
              Filters{filters.length ? ` (${filters.length})` : ""}
            </Button>
            {filters.length > 0 && <Button variant="tertiary" onClick={clearProjectFilters}>Clear all</Button>}
          </div>
        )}

        {projectScope && filters.length > 0 && (
          <ChipRow label="Active search filters">
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

      {!intent && (
        <EmptyState
          icon="search"
          titleAs="h2"
          title="What are you looking for?"
          body="Search by title, person, genre, or Ckript ID. Or start with a popular genre."
          actions={(
            <ChipRow label="Popular genres" wrap>
              {POPULAR_GENRES.map((genre) => (
                <Chip key={genre} onSelect={() => setState({ type: "projects", genre })}>{genre}</Chip>
              ))}
            </ChipRow>
          )}
        />
      )}

      {intent && status === "loading" && <SearchLoading />}

      {intent && status === "error" && (
        <InlineMessage
          variant="panel"
          title="Search is unavailable"
          onRetry={() => setRetryNonce((value) => value + 1)}
        >
          Check your connection and try again. Your search and filters are still here.
        </InlineMessage>
      )}

      {intent && status === "ready" && total === 0 && (
        <EmptyState
          icon="search_off"
          titleAs="h2"
          title={state.q ? `No results for “${state.q}”` : "No matching projects"}
          body="Try different words or remove one of the filters."
          actions={filters.length > 0 ? <Button variant="secondary" onClick={clearProjectFilters}>Clear filters</Button> : null}
        />
      )}

      {intent && status === "ready" && total > 0 && (
        <div className="ckm-search__results">
          <p className="ckm-search__result-count" role="status">
            {total} {resultWord}
          </p>

          {results.users.length > 0 && (
            <List heading="People" className="ckm-search__people">
              {results.users.map((person) => (
                <ListRow
                  key={person._id}
                  to={getProfileCanonicalPath(person, { viewerId: user?._id, viewerRole: user?.role })}
                  leading={<PersonAvatar person={person} />}
                  overline={roleLabel(person.role)}
                  title={person.name || person.username || "Ckript member"}
                  subtitle={person.bio || person.writerProfile?.genres?.slice(0, 3).join(" · ")}
                  trailing={`${compactNumber(person.followerCount)} followers`}
                  chevron
                />
              ))}
            </List>
          )}

          {results.scripts.length > 0 && (
            <section className="ckm-search__projects" aria-labelledby="ckm-search-projects-title">
              <h2 id="ckm-search-projects-title">Projects</h2>
              <div className="ckm-search__project-grid">
                {results.scripts.map((project) => (
                  <DiscoveryProjectCard key={project._id} project={project} onShare={onShare} />
                ))}
              </div>
            </section>
          )}

          <LoadMore
            loaded={loaded}
            total={total}
            pageSize={state.type === "all" ? SEARCH_PAGE_SIZE * 2 : SEARCH_PAGE_SIZE}
            pending={appendPending}
            error={appendError}
            onLoadMore={hasMore ? loadMore : undefined}
            onRetry={loadMore}
            noun="results"
            endMessage="End of results"
          />
        </div>
      )}
    </MobileShell>
  );
}
