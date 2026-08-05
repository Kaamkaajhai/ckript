/*
 * WriterRosterPage — "the desk", /writers.
 *
 * WHAT THIS PAGE IS
 * -----------------
 * Three panes inside a fill mount: a permanent facet rail, a 44px register, and
 * a detail pane that fills from the selected row. Evaluating twenty writers is
 * one continuous session — the list never reloads and you never leave the page,
 * because the only navigation is one button in the pane.
 *
 * It replaces a card grid that ranked writers without ever saying what the
 * ranking meant, hid its filters behind a pill strip that could only be cleared
 * from the empty state, and printed "Business email required" on rows it had
 * quietly made inert.
 *
 * WHERE THE DATA COMES FROM
 * -------------------------
 *   /users/writers?sort=&search=   the register. Sort and search only — see the
 *                                  header of writerRoster.js for why the facets
 *                                  are not query parameters.
 *   /users/me                      the viewer's mandate genres. A second call
 *                                  because /auth/me, which hydrates AuthContext,
 *                                  does not return industryProfile. Failure here
 *                                  degrades to "no mandate" and nothing else.
 *
 * All derivation lives in writerRoster.js and is unit tested. This file is
 * fetching, state and wiring.
 *
 * TWO SERVER PROBLEMS THIS PAGE DOES NOT FIX
 * ------------------------------------------
 * 1. `getWriters` uses an EXCLUSION projection, so every row in the response
 *    carries email, phone, address, subscription and activeSessions — including
 *    per-session IP addresses. This page binds none of it (writerRoster.js is
 *    the only thing that reads a writer field, and it reads eleven of them),
 *    but that is containment, not a fix: the data is in the response body
 *    whatever the UI renders. The fix is an inclusion projection server-side.
 *    Until then the profile gate below protects a page whose protected content
 *    has already been sent.
 * 2. `getWriters` builds a regex from the raw search string with no
 *    escapeRegExp, unlike search.js. Typing "(" returns a 500, which this page
 *    renders as its error state — correct behaviour, incorrect cause.
 */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { usesAppShell } from "../../layouts/app-shell/shellPolicy";
import {
  hasActiveFilmIndustryProfessionalAccess,
  hasBusinessEmail,
  isFilmIndustryProfessionalRole,
} from "../../utils/industryAccess";
import { getProfileCanonicalPath } from "../../utils/profilePath";
import RosterRail from "./components/RosterRail";
import RosterRow from "./components/RosterRow";
import RosterPane from "./components/RosterPane";
import RosterRestrictDialog from "./components/RosterRestrictDialog";
import PanelResizeHandle from "./components/PanelResizeHandle";
import RosterIcon from "./components/RosterIcon";
import useResizablePanel from "./useResizablePanel";
import {
  EMPTY_FACETS,
  SORTS,
  WRITER_CAP,
  buildBoardStats,
  buildChips,
  buildFacetCounts,
  buildRequestParams,
  countActiveFacets,
  filterWriters,
  getMandate,
  getSortLabel,
  isAtCap,
  matchesMandate,
  readUrlState,
  writeUrlState,
} from "./writerRoster";
import "./WriterRosterPage.css";

const SEARCH_DEBOUNCE_MS = 320;
// A fresh [] each render would give every useMemo below a new dependency.
const NO_WRITERS = Object.freeze([]);

const PANEL_CONFIG = Object.freeze({
  filters: Object.freeze({
    storageKey: "ckript:writers:filter-width",
    initialWidth: 236,
    minWidth: 184,
    maxWidth: 340,
  }),
  profile: Object.freeze({
    storageKey: "ckript:writers:profile-width",
    initialWidth: 400,
    minWidth: 280,
    maxWidth: 540,
  }),
});

const COLUMNS = [
  { key: "scripts", label: "Scr", full: "Scripts" },
  { key: "views", label: "Views", full: "Views" },
  { key: "score", label: "Score", full: "AI score" },
  { key: "followers", label: "Fans", full: "Followers" },
];

const WriterRosterPage = () => {
  const { user } = useContext(AuthContext);
  const { openPricingModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();

  /* ── View state, seeded from the URL so a filtered roster is shareable ── */
  const initial = useRef(readUrlState(location.search)).current;
  const [sort, setSort] = useState(initial.sort);
  const [query, setQuery] = useState(initial.query);
  const [queryInput, setQueryInput] = useState(initial.query);
  const [facets, setFacets] = useState({ ...EMPTY_FACETS, ...initial.facets });

  /* ── Data. One cell holding the response AND the request it answers, so a
   * response for a search the viewer has already changed cannot be rendered. */
  const [result, setResult] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [mandateSource, setMandateSource] = useState(null);

  /* ── Surfaces ── */
  const [selectedId, setSelectedId] = useState(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [restrictedFor, setRestrictedFor] = useState(null);

  const filtersPanel = useResizablePanel(PANEL_CONFIG.filters);
  const profilePanel = useResizablePanel(PANEL_CONFIG.profile);

  const searchRef = useRef(null);
  const rowRefs = useRef([]);
  const retryRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [queryInput]);

  /*
   * The gate. Identical predicate to /featured and to the profile this page
   * links to: an industry account on a personal address, with no active paid
   * access, may browse but not open a profile. The page this replaces checked
   * hasBusinessEmail alone, which locked out FIP subscribers on a personal
   * address and told writers and readers they needed a business email.
   */
  const isBlocked = isFilmIndustryProfessionalRole(user)
    && !hasBusinessEmail(user?.email)
    && !hasActiveFilmIndustryProfessionalAccess(user);

  /* ── The register ─────────────────────────────────────────────────────── */

  const requestKey = useMemo(
    () => `${reloadToken}|${buildRequestParams({ sort, query })}`,
    [reloadToken, sort, query],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    (async () => {
      try {
        const { data } = await api.get(
          `/users/writers?${buildRequestParams({ sort, query })}`,
          { signal: controller.signal },
        );
        if (!active) return;
        setResult({ key: requestKey, writers: Array.isArray(data) ? data : [], failed: false });
      } catch {
        // An aborted request is a superseded one, not a failure to report.
        if (!active || controller.signal.aborted) return;
        setResult({ key: requestKey, writers: [], failed: true });
      }
    })();

    return () => { active = false; controller.abort(); };
  }, [requestKey, sort, query]);

  /*
   * The mandate. Industry roles only — nobody else has one — and a failure is
   * silent: the facet and the fit block simply do not appear.
   */
  useEffect(() => {
    if (!isFilmIndustryProfessionalRole(user)) { setMandateSource(null); return undefined; }
    const controller = new AbortController();
    (async () => {
      try {
        const { data } = await api.get("/users/me", { signal: controller.signal });
        setMandateSource(data);
      } catch { /* no mandate is a valid state, not an error worth a banner */ }
    })();
    return () => controller.abort();
  }, [user]);

  const isLoading = result?.key !== requestKey;
  const status = isLoading ? "loading" : (result.failed ? "error" : "ok");
  const writers = result?.writers || NO_WRITERS;

  const retry = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    if (status === "error") retryRef.current?.focus();
  }, [status]);

  /* ── Derived ──────────────────────────────────────────────────────────── */

  const mandate = useMemo(() => getMandate(mandateSource), [mandateSource]);

  const visible = useMemo(
    () => filterWriters(writers, { facets, mandate }),
    [writers, facets, mandate],
  );

  const counts = useMemo(
    () => buildFacetCounts(writers, facets, mandate),
    [writers, facets, mandate],
  );

  const board = useMemo(() => buildBoardStats(visible), [visible]);
  const chips = useMemo(() => buildChips(facets, query), [facets, query]);
  const activeCount = countActiveFacets(facets);
  const hasActive = activeCount > 0 || query.trim().length > 0;

  const selected = useMemo(
    () => visible.find((w) => w._id === selectedId) || null,
    [visible, selectedId],
  );

  /*
   * Filtering to a set that no longer contains the selection should empty the
   * pane rather than leave it describing a writer who is not on screen.
   * Adjusted during render, the pattern React documents for "reset state when
   * something it derives from changes", rather than an effect that would paint
   * the stale pane once first.
   */
  const [lastVisibleKey, setLastVisibleKey] = useState("");
  const visibleKey = `${requestKey}|${JSON.stringify(facets)}`;
  if (lastVisibleKey !== visibleKey) {
    setLastVisibleKey(visibleKey);
    // Row 5 of the old list is not row 5 of the new one.
    setFocusIndex(-1);
    // The selection only drops when the writer has left the DATA. Filtered out
    // of view it is kept, so widening a facet brings the pane back rather than
    // making the viewer find them again — `selected` reads from `visible`, so
    // the pane rests in the meantime instead of describing an off-screen row.
    if (selectedId && !writers.some((w) => w._id === selectedId)) setSelectedId(null);
  }

  const profilePath = selected
    ? getProfileCanonicalPath(selected, { viewerId: user?._id, viewerRole: user?.role })
    : "";

  /* ── URL state ────────────────────────────────────────────────────────── */

  useEffect(() => {
    const next = writeUrlState({ sort, query, facets });
    if (next !== location.search) {
      // `replace`, so the back button leaves /writers rather than stepping
      // backwards through every checkbox ticked on the way in.
      navigate({ pathname: "/writers", search: next }, { replace: true });
    }
    // location.search is deliberately not a dependency — this effect writes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, query, facets, navigate]);

  /* ── Actions ──────────────────────────────────────────────────────────── */

  const toggleFacet = useCallback((kind, value) => {
    setFacets((prev) => {
      const list = prev[kind];
      return {
        ...prev,
        [kind]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
  }, []);

  const toggleMandate = useCallback(() => {
    setFacets((prev) => ({ ...prev, mandate: !prev.mandate }));
  }, []);

  const clearAll = useCallback(() => {
    setFacets(EMPTY_FACETS);
    setQuery("");
    setQueryInput("");
  }, []);

  const removeChip = useCallback((chip) => {
    if (chip.kind === "query") { setQuery(""); setQueryInput(""); return; }
    if (chip.kind === "mandate") { toggleMandate(); return; }
    toggleFacet(chip.kind, chip.value);
  }, [toggleFacet, toggleMandate]);

  /*
   * Every route into a profile funnels through here, so the gate cannot be
   * bypassed by a surface that forgot to check it.
   */
  const openProfile = useCallback((writer) => {
    if (!writer) return;
    if (isBlocked) { setRestrictedFor(writer); return; }
    navigate(getProfileCanonicalPath(writer, { viewerId: user?._id, viewerRole: user?.role }));
  }, [isBlocked, navigate, user]);

  /* ── Keyboard ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (drawerOpen) { setDrawerOpen(false); return; }
        if (queryInput) { setQueryInput(""); setQuery(""); }
        return;
      }
      if (e.key !== "/") return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, queryInput]);

  const moveFocus = useCallback((delta, absolute) => {
    setFocusIndex((current) => {
      const last = visible.length - 1;
      if (last < 0) return -1;
      const next = absolute !== undefined
        ? absolute
        : (current < 0 ? 0 : current + delta);
      const clamped = Math.max(0, Math.min(last, next));
      rowRefs.current[clamped]?.focus();
      rowRefs.current[clamped]?.scrollIntoView({ block: "nearest" });
      return clamped;
    });
  }, [visible.length]);

  const onRowsKeyDown = useCallback((e) => {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); moveFocus(1); break;
      case "ArrowUp": e.preventDefault(); moveFocus(-1); break;
      case "Home": e.preventDefault(); moveFocus(0, 0); break;
      case "End": e.preventDefault(); moveFocus(0, visible.length - 1); break;
      /* Space selects into the pane; Enter goes the whole way to the profile. */
      case " ": {
        e.preventDefault();
        const writer = visible[focusIndex];
        if (writer) setSelectedId(writer._id);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const writer = visible[focusIndex];
        if (writer) { setSelectedId(writer._id); openProfile(writer); }
        break;
      }
      default: break;
    }
  }, [moveFocus, visible, focusIndex, openProfile]);

  /* ── Render ───────────────────────────────────────────────────────────── */

  const atCap = status === "ok" && isAtCap(writers);
  const bleed = usesAppShell(user?.role);

  /*
   * One facet component, two places it can be mounted. Rendered as a function
   * rather than a shared element so each mount gets its own props — the rail
   * still shows its display title while the drawer, which has its own heading,
   * does not repeat it.
   */
  const renderRail = (inDrawer) => (
    <RosterRail
      facets={facets}
      counts={counts}
      mandate={mandate}
      total={writers.length}
      shown={visible.length}
      status={status}
      showAllGenres={showAllGenres}
      onShowAllGenres={() => setShowAllGenres(true)}
      onToggle={toggleFacet}
      onToggleMandate={toggleMandate}
      onReset={clearAll}
      hasActive={hasActive}
      inDrawer={inDrawer}
    />
  );

  return (
    <div className={`ckr${bleed ? " ckr--fill" : " ckr--boxed"}`}>
      <aside
        className={`ckr-rail${filtersPanel.collapsed ? " is-collapsed" : ""}`}
        style={{ "--ckr-panel-width": `${filtersPanel.width}px` }}
        aria-label="Writer filters"
      >
        {filtersPanel.collapsed ? (
          <button
            type="button"
            className="ckr-panel-restore"
            onClick={filtersPanel.toggleCollapsed}
            aria-label="Show filters panel"
            title="Show filters panel"
          >
            <RosterIcon name="showFilters" />
          </button>
        ) : (
          <>
            <button
              type="button"
              className="ckr-panel-toggle ckr-panel-toggle--rail"
              onClick={filtersPanel.toggleCollapsed}
              aria-label="Hide filters panel"
              title="Hide filters panel"
            >
              <RosterIcon name="hideFilters" />
            </button>
            <div className="ckr-rail__content">{renderRail(false)}</div>
          </>
        )}
      </aside>

      {!filtersPanel.collapsed && (
        <PanelResizeHandle
          label="Resize filters panel"
          min={PANEL_CONFIG.filters.minWidth}
          max={PANEL_CONFIG.filters.maxWidth}
          value={filtersPanel.width}
          onResize={filtersPanel.resize}
          side="left"
        />
      )}

      <div className="ckr-list">
        {/* The page's only <h1>. The rail shows a display copy of it, but the
            rail is display:none once the layout folds, so the heading lives
            here where it is present at every width. */}
        <h1 className="ckr-sr">Writers</h1>
        {/* Refetch only ever follows a sort or search change — a facet toggle
            filters what is already in hand and never reaches this. */}
        {status === "loading" && result && (
          <div className="ckr-progress" aria-hidden="true"><i /></div>
        )}

        <div className="ckr-tools">
          <button
            type="button"
            className="ckr-btn ckr-btn--quiet ckr-refine"
            onClick={() => setDrawerOpen(true)}
          >
            <RosterIcon name="filters" className="ckr-btn__ic" />
            Refine
            {activeCount > 0 && <span className="ckr-refine__count">{activeCount}</span>}
          </button>

          <label className="ckr-search">
            <RosterIcon name="search" />
            <input
              ref={searchRef}
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search writers by name…"
              aria-label="Search writers by name"
              spellCheck={false}
              autoComplete="off"
            />
            <kbd className="ckr-kbd" aria-hidden="true">/</kbd>
          </label>

          <div className="ckr-sortfield">
            <label className="ckr-sr" htmlFor="ckr-sort">Sort writers by</label>
            <select
              id="ckr-sort"
              className="ckr-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORTS.map(({ key, label }) => (
                <option key={key} value={key}>{`Sort: ${label}`}</option>
              ))}
            </select>
            <RosterIcon name="chevronDown" className="ckr-sortfield__ic" />
          </div>

          {isFilmIndustryProfessionalRole(user) && (
            <Link to="/mandates" className="ckr-btn ckr-btn--primary">
              {mandate.isSet ? "Edit mandate" : "Set mandate"}
            </Link>
          )}
        </div>

        <div className="ckr-chips">
          {chips.length > 0 && (
            <>
              <span className="ckr-chips__lab">Filters</span>
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className="ckr-chip"
                  onClick={() => removeChip(chip)}
                >
                  {chip.label}
                  <RosterIcon name="close" />
                  <span className="ckr-sr">Remove filter</span>
                </button>
              ))}
              <button type="button" className="ckr-linkbtn" onClick={clearAll}>Clear</button>
            </>
          )}
          <span className="ckr-chips__spacer" />
          <span className="ckr-board" role="status">
            {status === "ok" ? (
              <>
                <b>{board.writers}</b> writers · <b>{board.scripts}</b> scripts
                {board.medianScore > 0 && <> · median score <b>{board.medianScore}</b></>}
                {/* The three figures describe the rows on screen, and say so. */}
                <span className="ckr-board__scope"> · this page</span>
              </>
            ) : <span className="ckr-board__scope">— writers · — scripts · this page</span>}
          </span>
        </div>

        {/*
          * A real grid: two rowgroups under one `role="grid"`, so a screen
          * reader announces "row 12, Score 72" rather than reading six
          * unrelated spans. The column strip and the rows share ONE CSS grid
          * declaration, which is what makes the metrics comparable down the
          * whole list.
          */}
        {status !== "error" && (
          <div
            className="ckr-grid"
            role="grid"
            aria-label="Writer roster"
            aria-rowcount={visible.length + 1}
          >
            <div className="ckr-grid__head" role="rowgroup">
              <div className="ckr-cols" role="row" aria-rowindex={1}>
                <span
                  className="ckr-cols__rank"
                  role="columnheader"
                  title={`Ranked by ${getSortLabel(sort)}`}
                >
                  #<span className="ckr-sr">{` Rank, by ${getSortLabel(sort)}`}</span>
                </span>
                <span className="ckr-lab" role="columnheader">Writer</span>
                {COLUMNS.map(({ key, label, full }) => (
                  <span
                    key={key}
                    role="columnheader"
                    aria-sort={sort === key ? "descending" : "none"}
                    className={`ckr-sortcell${sort === key ? " is-on" : ""}`}
                  >
                    <button type="button" className="ckr-sort" onClick={() => setSort(key)}>
                      {label}
                      <span className="ckr-sr">{` — sort by ${full}`}</span>
                      {sort === key && <RosterIcon name="arrowDown" />}
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {status === "loading" && !result && (
              <div className="ckr-rows" role="rowgroup" aria-busy="true">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div className="ckr-row ckr-row--skel" role="row" key={i}>
                    <span className="ckr-rank" role="gridcell" />
                    <span className="ckr-id" role="gridcell">
                      <span className="ckr-sk ckr-sk--av" />
                      <span className="ckr-sk" style={{ width: `${28 + (i % 4) * 9}%` }} />
                      <span className="ckr-sk ckr-sk--dim" style={{ width: `${30 + (i % 3) * 8}%` }} />
                    </span>
                    {COLUMNS.map(({ key }) => (
                      <span className="ckr-m" role="gridcell" key={key}>
                        <span className="ckr-sk ckr-sk--m" />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {visible.length > 0 && (
              <div
                className={`ckr-rows${isLoading ? " is-dim" : ""}`}
                role="rowgroup"
                aria-busy={isLoading}
                onKeyDown={onRowsKeyDown}
              >
                {visible.map((writer, index) => (
                  <RosterRow
                    key={writer._id}
                    writer={writer}
                    rank={index + 1}
                    /* "Top 3" always means top 3 under the active sort, so the
                       marker survives filtering without needing to re-title. */
                    isLead={index < 3}
                    selected={writer._id === selectedId}
                    focused={index === Math.max(0, focusIndex)}
                    matchesMandate={mandate.isSet && matchesMandate(writer, mandate)}
                    onSelect={setSelectedId}
                    rowRef={(el) => { rowRefs.current[index] = el; }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="ckr-errwrap">
            <div className="ckr-err" role="alert">
              <RosterIcon name="error" className="ckr-err__ic" />
              <div>
                <h2 className="ckr-err__t">We couldn’t load the writer roster</h2>
                <p className="ckr-err__n">
                  The request failed. Your filters and search term are kept — retrying will not
                  lose them.
                </p>
                <div className="ckr-err__actions">
                  <button type="button" ref={retryRef} className="ckr-btn ckr-btn--primary" onClick={retry}>
                    <RosterIcon name="refresh" className="ckr-btn__ic" />
                    Retry
                  </button>
                  <Link to="/featured" className="ckr-btn ckr-btn--quiet">Browse featured instead</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === "ok" && visible.length === 0 && !hasActive && (
          <div className="ckr-state">
            <span className="ckr-state__badge"><RosterIcon name="users" /></span>
            <h2 className="ckr-state__t">No writers in the roster yet</h2>
            <p className="ckr-state__n">
              Nobody has published a script under a writer account. Featured is where the first
              ones will show up.
            </p>
            <Link to="/featured" className="ckr-btn ckr-btn--primary">Browse featured projects</Link>
          </div>
        )}

        {status === "ok" && visible.length === 0 && hasActive && (
          <div className="ckr-state">
            <h2 className="ckr-state__t">Nothing matches these filters</h2>
            <p className="ckr-state__n">
              {activeCount > 0
                ? `${activeCount} ${activeCount === 1 ? "filter" : "filters"} active. Widen a genre or clear a credential to see more.`
                : `No writer's name matches “${query.trim()}”.`}
            </p>
            <button type="button" className="ckr-btn ckr-btn--primary" onClick={clearAll}>
              Clear all filters
            </button>
          </div>
        )}

        {atCap && visible.length > 0 && (
          <p className="ckr-cap">
            Showing the top {WRITER_CAP} writers by {getSortLabel(sort).toLowerCase()}. Refine to
            narrow the list.
          </p>
        )}

        {status !== "error" && (
          <div className="ckr-keys">
            <span><kbd>↑ ↓</kbd> move</span>
            <span><kbd>Enter</kbd> open profile</span>
            <span><kbd>/</kbd> search</span>
            <span><kbd>Esc</kbd> clear</span>
          </div>
        )}
      </div>

      {!profilePanel.collapsed && (
        <PanelResizeHandle
          label="Resize profile panel"
          min={PANEL_CONFIG.profile.minWidth}
          max={PANEL_CONFIG.profile.maxWidth}
          value={profilePanel.width}
          onResize={profilePanel.resize}
          side="right"
        />
      )}

      <aside
        className={`ckr-pane${profilePanel.collapsed ? " is-collapsed" : ""}`}
        style={{ "--ckr-panel-width": `${profilePanel.width}px` }}
        aria-label={selected ? selected.name : "No writer selected"}
      >
        {profilePanel.collapsed ? (
          <button
            type="button"
            className="ckr-panel-restore"
            onClick={profilePanel.toggleCollapsed}
            aria-label="Show profile panel"
            title="Show profile panel"
          >
            <RosterIcon name="showProfile" />
          </button>
        ) : (
          <>
            <button
              type="button"
              className="ckr-panel-toggle ckr-panel-toggle--pane"
              onClick={profilePanel.toggleCollapsed}
              aria-label="Hide profile panel"
              title="Hide profile panel"
            >
              <RosterIcon name="hideProfile" />
            </button>
            <div className="ckr-pane__content">
              <RosterPane
                writer={selected}
                mandate={mandate}
                profilePath={profilePath}
                restricted={isBlocked}
                onOpenProfile={() => openProfile(selected)}
              />
            </div>
          </>
        )}
      </aside>

      {/* Below the container-query breakpoint the rail is not in the flow, so
          the same markup is offered here instead. One facet component, two
          places to put it. */}
      {drawerOpen && (
        <div
          className="ckr-overlay ckr-overlay--right"
          onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}
        >
          <aside className="ckr-drawer" role="dialog" aria-modal="true" aria-label="Refine writers">
            <div className="ckr-drawer__head">
              <div>
                <span className="ckr-lab">Filters</span>
                <h2 className="ckr-drawer__t">Refine</h2>
              </div>
              <button type="button" className="ckr-iconbtn" onClick={() => setDrawerOpen(false)} aria-label="Close refine">
                <RosterIcon name="close" />
              </button>
            </div>
            {renderRail(true)}
            <div className="ckr-drawer__foot">
              <button type="button" className="ckr-btn ckr-btn--primary ckr-btn--wide" onClick={() => setDrawerOpen(false)}>
                {`Show ${visible.length} ${visible.length === 1 ? "writer" : "writers"}`}
              </button>
            </div>
          </aside>
        </div>
      )}

      {restrictedFor && (
        <RosterRestrictDialog
          writer={restrictedFor}
          onClose={() => setRestrictedFor(null)}
          onUpgrade={() => { setRestrictedFor(null); openPricingModal("industry"); }}
          onBusinessEmail={() => { setRestrictedFor(null); navigate("/producer-director-onboarding"); }}
        />
      )}
    </div>
  );
};

export default WriterRosterPage;
