/*
 * FeaturedProjectsMobile — the native `/featured` screen (D27).
 *
 * WHAT IT KEEPS FROM THE BROADSHEET
 * ---------------------------------
 * The desktop page's defining idea: on a surface that sells paid placement,
 * the lead says WHY it leads. `getWhyLead` is imported, not reimplemented, so
 * the two platforms cannot start telling different stories about which
 * projects are promoted.
 *
 * The three shelves survive as three sections — Spotlight (bought placement),
 * Ranked (the full list under the active sort), Matches your mandate — because
 * they answer three different questions, and collapsing them into one list is
 * exactly the flattening that would hide paid placement.
 *
 * WHAT IT DELIBERATELY DROPS, AND WHY
 * -----------------------------------
 *   • The restriction modal. `isIndustryProfessionalWithPersonalEmail` has
 *     returned a hardcoded false since commit edf3743 ("Remove access
 *     restrictions for industry professionals with personal emails"), so
 *     desktop's `fbp-restrict` dialog is unreachable. Porting dead UI would
 *     revive a policy the product removed. Same correction as D26.
 *   • The "Open as table" toggle. An eight-column table is a desktop
 *     affordance; at 320px it is a horizontal scroller nobody asked for, and
 *     the cards already carry every column that is not rank.
 *   • Multi-select facets. Desktop's drawer allows several genres, but its own
 *     `buildQueryParams` only sends a facet when exactly one is chosen — pick
 *     two and the server receives neither, then the page narrows client-side
 *     over an unbounded fetch. With real server paging that silently drops
 *     results, so the facets are single-value here, matching Search and Top.
 *
 * WHERE THE DATA COMES FROM
 * -------------------------
 * The same two endpoints as desktop, now both bounded and both paged:
 *   GET /scripts/featured?page=…   the editorial/spotlight set
 *   GET /scripts?…&goldOnly=true   the ranked list under the active sort
 * They are fetched together and settled independently, so a failure in one
 * degrades one section rather than blanking the screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../../services/api";
import AppBar from "../../components/app-bars/AppBar";
import Badge from "../../components/badges/Badge";
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
import FeaturedLeadCard from "./components/FeaturedLeadCard";
import TrailerDialog from "../../components/media/TrailerDialog";
import {
  EMPTY_FEATURED_STATE,
  FEATURED_BUDGETS,
  FEATURED_CONTENT_TYPES,
  FEATURED_GENRES,
  FEATURED_PRICING,
  FEATURED_SORTS,
  activeFeaturedFilters,
  appendFeaturedPage,
  buildFeaturedApiParams,
  buildFeaturedEditorialParams,
  describeFeaturedMetric,
  featuredStateToParams,
  getMandate,
  getMandateMatches,
  isSpotlightActive,
  matchesMandate,
  normalizeFeaturedPage,
  readFeaturedState,
} from "./featuredModel";
import "./FeaturedProjectsMobile.css";

const emptyPage = () => normalizeFeaturedPage({ scripts: [], pagination: {} });

function FeaturedLoading() {
  return (
    <SkeletonGroup label="Loading featured projects" className="ckm-featured__loading">
      <SkeletonShape height={300} radius="var(--ckm-r-lg)" />
      <SkeletonShape height={244} radius="var(--ckm-r-lg)" />
      <SkeletonShape height={244} radius="var(--ckm-r-lg)" />
    </SkeletonGroup>
  );
}

export default function FeaturedProjectsMobile({ user, previewData = null }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => readFeaturedState(searchParams), [searchParams]);
  const queryKey = featuredStateToParams(state).toString();
  const activeSort = FEATURED_SORTS.find(({ value }) => value === state.sort) || FEATURED_SORTS[0];

  const [results, setResults] = useState(emptyPage);
  const [editorial, setEditorial] = useState(emptyPage);
  const [status, setStatus] = useState("loading");
  const [appendPending, setAppendPending] = useState(false);
  const [appendError, setAppendError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState(EMPTY_FEATURED_STATE);
  const [leadIndex, setLeadIndex] = useState(0);
  const [trailerId, setTrailerId] = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const appendControllerRef = useRef(null);
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const mandate = useMemo(() => getMandate(user), [user]);
  const readerViewer = String(user?.role || "").toLowerCase() === "reader";
  const openProject = useCallback((project) => {
    if (readerViewer && project?._id) navigate(`/reader/script/${encodeURIComponent(project._id)}`);
  }, [navigate, readerViewer]);

  const setState = useCallback((patch) => {
    setSearchParams(featuredStateToParams({ ...state, ...patch }), { replace: true });
  }, [setSearchParams, state]);

  useEffect(() => {
    appendControllerRef.current?.abort();
    setAppendPending(false);
    setAppendError("");

    if (previewData) {
      setResults(normalizeFeaturedPage(previewData.ranked ?? previewData));
      setEditorial(normalizeFeaturedPage(previewData.featured ?? { scripts: [] }));
      setStatus("ready");
      return undefined;
    }

    const controller = new AbortController();
    setStatus("loading");

    (async () => {
      const [featuredRes, rankedRes] = await Promise.allSettled([
        api.get(`/scripts/featured?${buildFeaturedEditorialParams()}`, { signal: controller.signal }),
        api.get(`/scripts?${buildFeaturedApiParams(state, 1)}`, { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;

      const page = (settled) => (settled.status === "fulfilled"
        ? normalizeFeaturedPage(settled.value.data)
        : emptyPage());

      setEditorial(page(featuredRes));
      setResults(page(rankedRes));
      // Only a total failure is an error — one endpoint answering still gives
      // the screen something honest to show.
      setStatus(featuredRes.status === "rejected" && rankedRes.status === "rejected" ? "error" : "ready");
    })();

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
      const { data } = await api.get(
        `/scripts?${buildFeaturedApiParams(state, results.page + 1)}`,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted && requestedKey === queryKeyRef.current) {
        setResults((current) => appendFeaturedPage(current, normalizeFeaturedPage(data)));
      }
    } catch (cause) {
      if (!controller.signal.aborted && cause?.code !== "ERR_CANCELED") {
        setAppendError("The next page of featured projects could not be loaded.");
      }
    } finally {
      if (!controller.signal.aborted && requestedKey === queryKeyRef.current) setAppendPending(false);
    }
  }, [appendPending, results.page, state]);

  /*
   * Shelf 01. The server ranks placements first, but whether a placement is
   * STILL RUNNING is a date comparison against this device's clock — a
   * response cached for an hour can outlive the window it describes.
   */
  const spotlights = useMemo(
    () => editorial.scripts.filter((script) => isSpotlightActive(script)),
    [editorial.scripts],
  );

  /*
   * The lead rotates through paid placements when there are any, and falls
   * back to the top of the ranked list when there are none — so the lead is
   * never empty merely because nobody bought placement this week.
   */
  const leadPool = useMemo(
    () => (spotlights.length ? spotlights : results.scripts.slice(0, 5)),
    [spotlights, results.scripts],
  );
  const safeLeadIndex = Math.min(leadIndex, Math.max(0, leadPool.length - 1));
  const lead = leadPool[safeLeadIndex] || null;

  const mandateMatches = useMemo(
    () => (mandate.isSet ? results.scripts.filter((script) => matchesMandate(script, mandate)).slice(0, 3) : []),
    [results.scripts, mandate],
  );

  const openFilters = () => {
    setFilterDraft(state);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setState(filterDraft);
    setFiltersOpen(false);
  };

  const clearFilters = () => setState({ genre: "", contentType: "", budget: "", pricing: "all" });
  const filters = activeFeaturedFilters(state);

  const onShare = useCallback(async (project) => {
    const outcome = await shareProject(project);
    if (outcome === "copied") toast.success("Link copied", project?.title);
    if (outcome === "failed") toast.error("Could not share this project", "Open it and copy the public link instead.");
  }, [toast]);

  const trailerProject = useMemo(
    () => [...editorial.scripts, ...results.scripts].find((script) => script._id === trailerId) || null,
    [editorial.scripts, results.scripts, trailerId],
  );

  const hasNothingAtAll = status === "ready" && results.total === 0 && spotlights.length === 0;

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="featured"
      className="ckm-featured"
      scrollClassName="ckm-featured__scroll"
      appBar={<AppBar user={user} />}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={() => setRetryNonce((value) => value + 1)}
      overlays={(
        <>
          <DiscoveryFiltersDialog
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            title="Filter featured projects"
            description="Narrow the ranked list. Spotlight placements are not filtered."
            draft={filterDraft}
            setDraft={setFilterDraft}
            onReset={() => setFilterDraft({ ...EMPTY_FEATURED_STATE, sort: filterDraft.sort })}
            onApply={applyFilters}
            sortOptions={FEATURED_SORTS}
            genres={FEATURED_GENRES}
            contentTypes={FEATURED_CONTENT_TYPES}
            budgets={FEATURED_BUDGETS}
            pricingOptions={FEATURED_PRICING}
          />
          <TrailerDialog
            key={trailerProject?._id || "no-trailer"}
            open={Boolean(trailerProject)}
            project={trailerProject}
            onClose={() => setTrailerId(null)}
          />
        </>
      )}
    >
      <header className="ckm-featured__header">
        <p className="ckm-featured__eyebrow">Spotlight placement · updated hourly</p>
        <h1>Featured projects</h1>
        <p>
          Promoted screenplays from verified writers. Writers buy spotlight placement;
          the ranked list below is ordered by {activeSort.label.toLowerCase()}.
        </p>
      </header>

      <dl className="ckm-featured__glance">
        <div>
          <dt>Live spotlights</dt>
          <dd>{status === "loading" ? "—" : spotlights.length}</dd>
        </div>
        <div>
          <dt>In this list</dt>
          <dd>{status === "loading" ? "—" : results.total}</dd>
        </div>
        <div>
          <dt>{readerViewer ? "Reader access" : "Your mandate"}</dt>
          <dd className="ckm-featured__glance-text">{readerViewer ? "Published catalogue" : mandate.label}</dd>
        </div>
      </dl>

      <section className="ckm-featured__controls" aria-label="Sort and filters">
        <SelectField
          label="Sort ranked list by"
          hint={activeSort.description}
          value={state.sort}
          options={FEATURED_SORTS}
          onChange={(event) => setState({ sort: event.target.value })}
        />
        <div className="ckm-featured__filter-row">
          <Button variant="secondary" icon="tune" onClick={openFilters} aria-haspopup="dialog" aria-expanded={filtersOpen}>
            Filters{filters.length ? ` (${filters.length})` : ""}
          </Button>
          {filters.length > 0 && <Button variant="tertiary" onClick={clearFilters}>Clear all</Button>}
        </div>
        {filters.length > 0 && (
          <ChipRow label="Active featured filters">
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

      {status === "loading" && <FeaturedLoading />}

      {status === "error" && (
        <InlineMessage
          variant="panel"
          title="Featured projects are unavailable"
          onRetry={() => setRetryNonce((value) => value + 1)}
        >
          Check your connection and try again. Your sort and filters are still here.
        </InlineMessage>
      )}

      {hasNothingAtAll && (
        <EmptyState
          icon="stars"
          titleAs="h2"
          title={filters.length > 0 ? "Nothing matches these filters" : "No spotlights running right now"}
          body={filters.length > 0
            ? "Widen the budget range or clear a genre to see more featured projects."
            : "Nothing is promoted at the moment. Top scripts still ranks every published project."}
          actions={filters.length > 0
            ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
            : <Button variant="secondary" to="/top-script">Browse top scripts</Button>}
        />
      )}

      {status === "ready" && lead && (
        <section className="ckm-featured__lead" aria-labelledby="ckm-featured-lead-title">
          <h2 id="ckm-featured-lead-title" className="ckm-featured__section-title">Today&apos;s lead</h2>
          <FeaturedLeadCard
            project={lead}
            mandate={mandate}
            sort={state.sort}
            position={safeLeadIndex + 1}
            total={leadPool.length}
            onPrev={() => setLeadIndex((i) => (i - 1 + leadPool.length) % leadPool.length)}
            onNext={() => setLeadIndex((i) => (i + 1) % leadPool.length)}
            onTrailer={() => setTrailerId(lead._id)}
            onShare={onShare}
            projectTo={readerViewer ? `/reader/script/${encodeURIComponent(lead._id)}` : null}
          />
        </section>
      )}

      {status === "ready" && spotlights.length > 0 && (
        <section className="ckm-featured__section" aria-labelledby="ckm-featured-spotlight-title">
          <div className="ckm-featured__section-head">
            <h2 id="ckm-featured-spotlight-title" className="ckm-featured__section-title">Spotlight</h2>
            <p>Writers bought this placement — {spotlights.length} live now</p>
          </div>
          <div className="ckm-featured__grid">
            {spotlights.map((project) => (
              <DiscoveryProjectCard
                key={project._id}
                project={project}
                onShare={onShare}
                onOpen={readerViewer ? openProject : null}
              />
            ))}
          </div>
        </section>
      )}

      {status === "ready" && results.total > 0 && (
        <section className="ckm-featured__section" aria-labelledby="ckm-featured-ranked-title">
          <div className="ckm-featured__section-head">
            <h2 id="ckm-featured-ranked-title" className="ckm-featured__section-title">
              Ranked by {activeSort.label.toLowerCase()}
            </h2>
            <p role="status">
              {results.total} featured {results.total === 1 ? "project" : "projects"}
            </p>
          </div>
          <div className="ckm-featured__grid">
            {results.scripts.map((project, index) => (
              <DiscoveryProjectCard
                key={project._id}
                project={project}
                rank={index + 1}
                metric={describeFeaturedMetric(project, state.sort)}
                onShare={onShare}
                onOpen={readerViewer ? openProject : null}
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
            endMessage="End of the featured list"
          />
        </section>
      )}

      {/* Hidden entirely when there is no brief to match, rather than shown empty. */}
      {status === "ready" && mandate.isSet && (
        <section className="ckm-featured__section" aria-labelledby="ckm-featured-mandate-title">
          <div className="ckm-featured__section-head">
            <h2 id="ckm-featured-mandate-title" className="ckm-featured__section-title">Matches your mandate</h2>
            <p>{mandate.label}</p>
          </div>
          {mandateMatches.length > 0 ? (
            <div className="ckm-featured__grid">
              {mandateMatches.map((project) => (
                <DiscoveryProjectCard
                  key={project._id}
                  project={project}
                  onShare={onShare}
                  onOpen={readerViewer ? openProject : null}
                  className="ckm-featured__match"
                >
                  <span className="ckm-featured__match-chips">
                    {getMandateMatches(project, mandate).map((label) => (
                      <Badge key={label} tone="success" size="sm">{label}</Badge>
                    ))}
                  </span>
                </DiscoveryProjectCard>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon="flag"
              titleAs="h3"
              title="Nothing matches yet"
              body="No project in the current results satisfies two or more of your mandate conditions."
              actions={<Button variant="tertiary" to="/mandates">Edit mandate</Button>}
            />
          )}
        </section>
      )}
    </MobileShell>
  );
}
