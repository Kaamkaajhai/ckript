/*
 * FeaturedProjectsPage — "the broadsheet", /featured.
 *
 * WHAT THIS PAGE IS
 * -----------------
 * A masthead with an at-a-glance strip, one editorial lead that explains why it
 * leads, then three named shelves: Spotlight (writers who bought placement),
 * Ranked (the full list under the active sort), and Matches your mandate.
 *
 * It replaces a page whose hero, sponsored grid and filter pills were written
 * in a dark-navy Tailwind palette while the shell around it is the
 * cream/terracotta Broadsheet system. More importantly, that page never said
 * WHY anything was at the top — on a surface that sells paid placement, the
 * lead's one-line explanation is the honest part of the design.
 *
 * WHERE THE DATA COMES FROM
 * -------------------------
 * Two pre-existing endpoints, fetched together so a failure in either degrades
 * one region rather than blanking the page:
 *
 *   /scripts/featured   spotlight + editorially featured projects, already
 *                       ranked server-side by verified/trailer/evaluation/
 *                       spotlight priority then trend score
 *   /scripts?…          the full list under the active sort and facets
 *
 * Derivation lives in featuredBroadsheet.js and is unit tested. This file is
 * fetching, state and wiring.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * The prototype carried a compare tray, bulk selection and a CSV export. The
 * product has no compare surface, no bulk endpoint and nothing to export
 * against, and its own design notes label all three as proposals rather than
 * existing functionality — so they are omitted rather than mocked. The card
 * action rows reflow around their absence.
 */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { usesAppShell, isWriterAudience } from "../../layouts/app-shell/shellPolicy";
import {
  hasActiveFilmIndustryProfessionalAccess,
  hasBusinessEmail,
  isFilmIndustryProfessionalRole,
} from "../../utils/industryAccess";
import { getScriptCanonicalPath } from "../../utils/scriptPath";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import LeadStory from "./components/LeadStory";
import SpotlightCard from "./components/SpotlightCard";
import RefineDrawer from "./components/RefineDrawer";
import DetailSheet from "./components/DetailSheet";
import TrailerModal from "./components/TrailerModal";
import FeaturedIcon from "./components/FeaturedIcon";
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  buildChipRow,
  buildQueryParams,
  countActiveFilters,
  filterScripts,
  formatCount,
  getBarWidth,
  getContentTypeLabel,
  getCreatorName,
  getMandate,
  getMandateMatches,
  getMaxMetric,
  getMetaLine,
  getPriceLabel,
  getScore,
  getSortLabel,
  getViews,
  isSpotlightActive,
  matchesMandate,
  sortScripts,
} from "./featuredBroadsheet";
import "./FeaturedProjectsPage.css";

const PAGE_SIZE = 8;
// A shared frozen fallback: a fresh [] each render would give every useMemo below
// a new dependency and defeat the memoisation.
const NO_SCRIPTS = Object.freeze([]);
const HINT_KEY = "ckript:featured:hint-dismissed";

const Shelf = ({ number, title, note, action }) => (
  <div className="fbp-shelf">
    <div>
      <div className="fbp-shelf__num">SHELF {number}</div>
      <h2 className="fbp-shelf__title">{title}</h2>
      {note && <p className="fbp-shelf__note">{note}</p>}
    </div>
    {action}
  </div>
);

const CardSkeleton = () => (
  <div className="fbp-skel-card">
    <div className="fbp-skel-card__fig fbp-shimmer" />
    <div className="fbp-skel-card__body">
      <span className="fbp-skel" style={{ width: "72%", height: 20 }} />
      <span className="fbp-skel" style={{ width: "52%", height: 12 }} />
      <span className="fbp-skel" style={{ width: "88%", height: 12 }} />
    </div>
  </div>
);

const FeaturedProjectsPage = () => {
  const { user } = useContext(AuthContext);
  const { openPricingModal } = useAuthModal();
  const navigate = useNavigate();

  /*
   * ── Data ───────────────────────────────────────────────────────────────
   * One state cell holding the response AND the request it answers. Loading is
   * then derived — "the newest request has no result yet" — rather than a flag
   * an effect has to remember to raise and lower, which is what makes a stale
   * response for a filter the viewer has already changed impossible to render.
   */
  const [result, setResult] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  /* ── View state ───────────────────────────────────────────────────────── */
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("engagement");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [leadIndex, setLeadIndex] = useState(0);
  const [asTable, setAsTable] = useState(false);

  /* ── Surfaces ─────────────────────────────────────────────────────────── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sheetId, setSheetId] = useState(null);
  const [trailerId, setTrailerId] = useState(null);
  const [restrictedFor, setRestrictedFor] = useState(null);
  const [toast, setToast] = useState(null);
  const [hintDismissed, setHintDismissed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(HINT_KEY) === "1",
  );

  const sortRef = useRef(null);
  const toastTimer = useRef(null);

  /*
   * The gate the previous page enforced and this keeps: an industry account on
   * a personal email address may browse featured metadata but not open a
   * project until it verifies a business email or takes the FIP plan.
   */
  const isBlocked = isIndustryProfessionalWithPersonalEmail(user)
    && !hasActiveFilmIndustryProfessionalAccess(user);

  const mandate = useMemo(() => getMandate(user), [user]);

  const flash = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* The watchlist toast rides the event useScriptBookmark already dispatches. */
  useEffect(() => {
    const onBookmark = (e) => {
      flash(e.detail?.bookmarked ? "Added to your watchlist" : "Removed from your watchlist");
    };
    window.addEventListener("bookmarkUpdated", onBookmark);
    return () => window.removeEventListener("bookmarkUpdated", onBookmark);
  }, [flash]);

  /* Escape closes whichever surface is open, outermost first. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setSortOpen(false);
      setRestrictedFor(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* The sort menu is a popover, so a click anywhere else dismisses it. */
  useEffect(() => {
    if (!sortOpen) return undefined;
    const onDown = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [sortOpen]);

  /* Identifies a request. A retry bumps the token to re-run an identical one. */
  const requestKey = useMemo(
    () => `${reloadToken}|${buildQueryParams({ sort, filters })}`,
    [reloadToken, sort, filters],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      const [featuredRes, listRes] = await Promise.allSettled([
        api.get("/scripts/featured"),
        api.get(`/scripts?${buildQueryParams({ sort, filters })}`),
      ]);
      // Every state write happens past this await, so a response that arrives
      // after the viewer moved on is dropped instead of overwriting the page.
      if (!active) return;

      const pick = (res) => (res.status === "fulfilled" && Array.isArray(res.value.data)
        ? res.value.data
        : []);

      setResult({
        key: requestKey,
        featured: pick(featuredRes),
        listed: pick(listRes),
        // Only a total failure is an error — one endpoint answering still gives
        // the page something honest to render.
        failed: featuredRes.status === "rejected" && listRes.status === "rejected",
      });
    })();

    return () => { active = false; };
  }, [requestKey, sort, filters]);

  const isLoading = result?.key !== requestKey;
  const status = isLoading ? "loading" : (result.failed ? "error" : "ok");
  const featured = result?.featured || NO_SCRIPTS;
  const listed = result?.listed || NO_SCRIPTS;

  const retry = useCallback(() => setReloadToken((t) => t + 1), []);

  /*
   * Narrowing the list should not leave the reader on page 4 of the old one.
   * Adjusted during render (the pattern React documents for "reset state when a
   * prop changes") rather than in an effect that would paint the wrong page once.
   */
  const pageKey = `${query}|${requestKey}`;
  const [lastPageKey, setLastPageKey] = useState(pageKey);
  if (lastPageKey !== pageKey) {
    setLastPageKey(pageKey);
    setPage(1);
  }

  /* ── Derived collections ──────────────────────────────────────────────── */

  const visible = useMemo(
    () => sortScripts(filterScripts(listed, { query, filters, mandate }), sort),
    [listed, query, filters, mandate, sort],
  );

  const spotlightShelf = useMemo(
    () => filterScripts(featured, { query, filters, mandate }).filter((s) => isSpotlightActive(s)),
    [featured, query, filters, mandate],
  );

  /* The lead rotates through spotlights when there are any, else the ranked list. */
  const leadPool = useMemo(
    () => (spotlightShelf.length ? spotlightShelf : visible.slice(0, 5)),
    [spotlightShelf, visible],
  );

  const mandateShelf = useMemo(
    () => (mandate.isSet ? visible.filter((s) => matchesMandate(s, mandate)).slice(0, 3) : []),
    [visible, mandate],
  );

  const shown = visible.slice(0, page * PAGE_SIZE);
  const maxMetric = useMemo(() => getMaxMetric(visible, sort), [visible, sort]);
  const activeCount = countActiveFilters(filters);
  const chips = useMemo(() => buildChipRow(filters), [filters]);
  const hasQueryOrFilters = activeCount > 0 || query.trim().length > 0;

  const liveSpotlights = useMemo(
    () => featured.filter((s) => isSpotlightActive(s)).length,
    [featured],
  );

  const safeLeadIndex = Math.min(leadIndex, Math.max(0, leadPool.length - 1));
  const lead = leadPool[safeLeadIndex] || null;
  const sheetScript = useMemo(
    () => [...featured, ...listed].find((s) => s._id === sheetId) || null,
    [featured, listed, sheetId],
  );
  const trailerScript = useMemo(
    () => [...featured, ...listed].find((s) => s._id === trailerId) || null,
    [featured, listed, trailerId],
  );

  /* ── Actions ──────────────────────────────────────────────────────────── */

  const pathFor = useCallback((script) => getScriptCanonicalPath(script), []);

  /*
   * Every route into a project funnels through here so the permission gate
   * cannot be bypassed by a surface that forgot to check it.
   */
  const openProject = useCallback((script) => (event) => {
    if (!isBlocked) return;
    event?.preventDefault?.();
    setSheetId(null);
    setTrailerId(null);
    setRestrictedFor(script);
  }, [isBlocked]);

  const toggleFacet = useCallback((kind, value) => {
    setFilters((prev) => {
      const list = prev[kind];
      return {
        ...prev,
        [kind]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setQuery("");
  }, []);

  const dismissHint = () => {
    setHintDismissed(true);
    try { window.localStorage.setItem(HINT_KEY, "1"); } catch { /* private mode */ }
  };

  const copyShareLink = useCallback(async (script) => {
    if (!script) return;
    const url = `${window.location.origin}${pathFor(script)}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("Share link copied to clipboard");
    } catch {
      // Clipboard access can be refused outright (permissions, insecure origin).
      flash("Could not copy the link");
    }
  }, [pathFor, flash]);

  /*
   * The toolbar's primary action is whoever's action it actually is. Writers
   * buy spotlight placement during project setup; industry viewers set the
   * mandate that groups shelf 03. Readers get neither, so the slot stays empty
   * rather than showing a control that leads nowhere.
   */
  const primaryCta = isWriterAudience(user?.role)
    ? { label: "Promote a project", icon: "promote", to: "/create-project" }
    : (isFilmIndustryProfessionalRole(user)
      ? { label: mandate.isSet ? "Edit mandate" : "Set a mandate", icon: "flag", to: "/mandates" }
      : null);

  const showHint = !hintDismissed && status === "ok" && !mandate.isSet
    && isFilmIndustryProfessionalRole(user);

  /*
   * The app shell hands the page a padded white column; the design owns its own
   * padding so the sticky toolbar can span the full content width. MainLayout
   * pads differently, so the cancel only applies under the app shell.
   */
  const bleed = usesAppShell(user?.role);

  return (
    <div className={`fbp${bleed ? " fbp--bleed" : ""}`}>
      <div className="fbp__inner">

        {/* ── Mandate hint ─────────────────────────────────────────────── */}
        {showHint && (
          <div className="fbp-hint">
            <FeaturedIcon name="info" className="fbp-hint__icon" />
            <span className="fbp-hint__text">
              Featured shows projects whose writers bought spotlight placement. Set a mandate
              and matching scripts are grouped for you first.
            </span>
            <Link to="/mandates" className="fbp-hint__cta">Set mandate</Link>
            <button type="button" className="fbp-hint__dismiss" onClick={dismissHint}>Dismiss</button>
          </div>
        )}

        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <header className="fbp-masthead">
          <div className="fbp-masthead__text">
            <div className="fbp-eyebrow">Spotlight placement · updated hourly</div>
            <h1 className="fbp-masthead__title">Featured Projects</h1>
            <p className="fbp-masthead__sub">
              Promoted screenplays from verified writers. Spotlight your scripts, reach
              investors faster.
            </p>
          </div>

          <div className="fbp-glance">
            <div className="fbp-glance__cell">
              <div className="fbp-glance__label">Live spotlights</div>
              <div className="fbp-glance__value fbp-glance__value--phrase">
                {status === "loading" ? "—" : `${liveSpotlights} live now`}
              </div>
            </div>
            <div className="fbp-glance__cell">
              <div className="fbp-glance__label">In this list</div>
              <div className="fbp-glance__value">{status === "loading" ? "—" : visible.length}</div>
            </div>
            <div className="fbp-glance__cell">
              <div className="fbp-glance__label">Your mandate</div>
              <div className="fbp-glance__value fbp-glance__value--text">{mandate.label}</div>
            </div>
          </div>
        </header>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div className="fbp-toolbar">
          <label className="fbp-search">
            <FeaturedIcon name="search" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search featured projects…"
              aria-label="Search featured projects"
            />
          </label>

          <button type="button" className="fbp-refine" onClick={() => setDrawerOpen(true)}>
            <FeaturedIcon name="tune" />
            Refine
            {activeCount > 0 && <span className="fbp-refine__count">{activeCount}</span>}
          </button>

          <div className="fbp-sortwrap" ref={sortRef}>
            <button
              type="button"
              className="fbp-sortbtn"
              onClick={() => setSortOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
            >
              Sort: {getSortLabel(sort)}
              <FeaturedIcon name="chevronDown" />
            </button>
            {sortOpen && (
              <div className="fbp-sortmenu" role="menu">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    role="menuitem"
                    className={`fbp-sortmenu__item${sort === option.key ? " is-active" : ""}`}
                    onClick={() => { setSort(option.key); setSortOpen(false); }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="fbp-toolbar__spacer" />

          {primaryCta && (
            <Link to={primaryCta.to} className="fbp-btn fbp-btn--primary fbp-btn--tool">
              <FeaturedIcon name={primaryCta.icon} />
              {primaryCta.label}
            </Link>
          )}
        </div>

        {/* ── Active filter chips ──────────────────────────────────────── */}
        {hasQueryOrFilters && (
          <div className="fbp-chips">
            <span className="fbp-chips__label">FILTERS</span>
            {query.trim() && (
              <button type="button" className="fbp-chip" onClick={() => setQuery("")}>
                “{query.trim()}”
                <FeaturedIcon name="close" />
              </button>
            )}
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className="fbp-chip"
                onClick={() => (chip.kind === "premium"
                  ? setFilters((p) => ({ ...p, premium: "all" }))
                  : toggleFacet(chip.kind, chip.value))}
              >
                {chip.label}
                <FeaturedIcon name="close" />
              </button>
            ))}
            <button type="button" className="fbp-chips__clear" onClick={clearFilters}>Clear all</button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {status === "loading" && (
          <div className="fbp-loading">
            <div className="fbp-loading__lead">
              <div className="fbp-loading__fig fbp-shimmer" />
              <div className="fbp-loading__col">
                <span className="fbp-skel" style={{ width: "40%", height: 16 }} />
                <span className="fbp-skel" style={{ width: "78%", height: 38 }} />
                <span className="fbp-skel" style={{ width: "92%", height: 14 }} />
                <span className="fbp-skel" style={{ width: "66%", height: 14 }} />
                <span className="fbp-skel" style={{ width: "100%", height: 96 }} />
                <span className="fbp-skel" style={{ width: "52%", height: 44 }} />
              </div>
            </div>
            <div className="fbp-grid fbp-grid--3">
              {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {status === "error" && (
          <div className="fbp-error">
            <FeaturedIcon name="error" className="fbp-error__icon" />
            <div className="fbp-error__body">
              <h2 className="fbp-error__title">We couldn’t load featured projects</h2>
              <p className="fbp-error__text">
                The request failed. Your filters are kept — retrying will not lose them.
              </p>
              <div className="fbp-error__actions">
                <button type="button" className="fbp-btn fbp-btn--primary" onClick={retry}>Retry</button>
                <Link to="/top" className="fbp-btn fbp-btn--quiet">Browse Top Scripts instead</Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Nothing promoted at all ──────────────────────────────────── */}
        {status === "ok" && visible.length === 0 && !hasQueryOrFilters && (
          <div className="fbp-empty">
            <span className="fbp-empty__badge">
              <FeaturedIcon name="emptyProjects" />
            </span>
            <h2 className="fbp-empty__title">No spotlights running right now</h2>
            <p className="fbp-empty__text">
              Nothing is promoted at the moment. Two things you can still do while writers buy
              placement.
            </p>
            <div className="fbp-empty__actions">
              <Link to="/top" className="fbp-btn fbp-btn--primary">Browse Top Scripts</Link>
              {isFilmIndustryProfessionalRole(user) && (
                <Link to="/mandates" className="fbp-btn fbp-btn--quiet">
                  Set a mandate so we can alert you
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Filtered to nothing ──────────────────────────────────────── */}
        {status === "ok" && visible.length === 0 && hasQueryOrFilters && (
          <div className="fbp-none">
            <h2 className="fbp-none__title">Nothing matches these filters</h2>
            <p className="fbp-none__text">
              {activeCount} {activeCount === 1 ? "filter" : "filters"} active. Widen the budget
              range or clear a genre to see more.
            </p>
            <button type="button" className="fbp-btn fbp-btn--primary" onClick={clearFilters}>
              Clear all filters
            </button>
          </div>
        )}

        {/* ── The page proper ──────────────────────────────────────────── */}
        {status === "ok" && visible.length > 0 && (
          <>
            {lead && (
              <LeadStory
                script={lead}
                mandate={mandate}
                sort={sort}
                scriptPath={pathFor(lead)}
                position={safeLeadIndex + 1}
                total={leadPool.length}
                onOpenProject={openProject(lead)}
                onDetails={() => setSheetId(lead._id)}
                onTrailer={() => setTrailerId(lead._id)}
                onPrev={() => setLeadIndex((i) => (i - 1 + leadPool.length) % leadPool.length)}
                onNext={() => setLeadIndex((i) => (i + 1) % leadPool.length)}
                onSelect={setLeadIndex}
              />
            )}

            {/* Shelf 01 — Spotlight */}
            <Shelf
              number="01"
              title="Spotlight"
              note={`Writers bought this placement — ${spotlightShelf.length} live now`}
            />
            {spotlightShelf.length > 0 ? (
              <div className="fbp-grid fbp-grid--3">
                {spotlightShelf.map((script) => (
                  <SpotlightCard
                    key={script._id}
                    script={script}
                    scriptPath={pathFor(script)}
                    onOpenProject={openProject(script)}
                    onDetails={() => setSheetId(script._id)}
                    onTrailer={() => setTrailerId(script._id)}
                    onShare={() => copyShareLink(script)}
                  />
                ))}
              </div>
            ) : (
              <div className="fbp-shelfnote">
                <FeaturedIcon name="filterOff" />
                <span className="fbp-shelfnote__text">
                  {hasQueryOrFilters
                    ? "No spotlight projects match these filters."
                    : "No writer currently holds a spotlight placement."}
                </span>
                {hasQueryOrFilters && (
                  <button type="button" className="fbp-btn fbp-btn--quiet fbp-btn--sm" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Shelf 02 — Ranked */}
            <Shelf
              number="02"
              title={`Ranked by ${getSortLabel(sort)}`}
              note={`The full featured list · ${visible.length} ${visible.length === 1 ? "project" : "projects"}`}
              action={(
                <button type="button" className="fbp-btn fbp-btn--quiet fbp-btn--sm" onClick={() => setAsTable((t) => !t)}>
                  <FeaturedIcon name="swap" />
                  {asTable ? "Back to cards" : "Open as table"}
                </button>
              )}
            />

            {asTable ? (
              <div className="fbp-table">
                <div className="fbp-table__head" role="row">
                  <span className="fbp-table__rank">#</span>
                  <span className="fbp-table__project">PROJECT</span>
                  <span className="fbp-table__genre">GENRE</span>
                  <span className="fbp-table__format">FORMAT</span>
                  <span className="fbp-table__score">SCORE</span>
                  <span className="fbp-table__views">VIEWS</span>
                  <span className="fbp-table__price">PRICE</span>
                  <span className="fbp-table__go" />
                </div>
                {shown.map((script, i) => (
                  <div key={script._id} className="fbp-table__row">
                    <span className="fbp-table__rank">#{i + 1}</span>
                    <span className="fbp-table__project" title={script.title}>{script.title}</span>
                    <span className="fbp-table__genre">{script.genre || "—"}</span>
                    <span className="fbp-table__format">{getContentTypeLabel(script.contentType)}</span>
                    <span className="fbp-table__score">{getScore(script) || "—"}</span>
                    <span className="fbp-table__views">{formatCount(getViews(script))}</span>
                    <span className="fbp-table__price">{getPriceLabel(script)}</span>
                    <button
                      type="button"
                      className="fbp-table__go"
                      onClick={() => setSheetId(script._id)}
                      aria-label={`Open details for ${script.title}`}
                    >
                      <FeaturedIcon name="chevronRight" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="fbp-grid fbp-grid--4">
                {shown.map((script, i) => (
                  <article key={script._id} className="fbp-rank">
                    <div className="fbp-rank__head">
                      <span className="fbp-rank__num">#{i + 1}</span>
                      <span className="fbp-rank__score">
                        {getScore(script) || "—"}<span>/100</span>
                      </span>
                    </div>
                    <Link to={pathFor(script)} onClick={openProject(script)} className="fbp-rank__fig">
                      {resolveMediaUrl(script.coverImage)
                        ? <img src={resolveMediaUrl(script.coverImage)} alt="" loading="lazy" />
                        : <span className="fbp-rank__fig-empty" aria-hidden="true" />}
                    </Link>
                    <div className="fbp-rank__title">{script.title}</div>
                    <div className="fbp-rank__meta">
                      {getCreatorName(script)}{script.genre ? ` · ${script.genre}` : ""}
                    </div>
                    <div className="fbp-rank__track">
                      <span style={{ width: getBarWidth(script, sort, maxMetric) }} />
                    </div>
                    <div className="fbp-rank__foot">
                      <span>{formatCount(getViews(script))} views</span>
                      <b>{getPriceLabel(script)}</b>
                    </div>
                    <button type="button" className="fbp-rank__btn" onClick={() => setSheetId(script._id)}>
                      Details
                    </button>
                  </article>
                ))}
              </div>
            )}

            {shown.length < visible.length && (
              <div className="fbp-more">
                <button type="button" className="fbp-btn fbp-btn--quiet" onClick={() => setPage((p) => p + 1)}>
                  {`Load next ${Math.min(PAGE_SIZE, visible.length - shown.length)} of ${visible.length}`}
                </button>
              </div>
            )}

            {/* Shelf 03 — Mandate. Hidden entirely when there is no brief to match. */}
            {mandate.isSet && (
              <>
                <Shelf
                  number="03"
                  title="Matches your mandate"
                  note={(
                    <>
                      {mandate.label} — <Link to="/mandates" className="fbp-shelf__link">edit mandate</Link>
                    </>
                  )}
                />
                {mandateShelf.length > 0 ? (
                  <div className="fbp-grid fbp-grid--3">
                    {mandateShelf.map((script) => (
                      <article key={script._id} className="fbp-match">
                        <Link to={pathFor(script)} onClick={openProject(script)} className="fbp-match__fig">
                          {resolveMediaUrl(script.coverImage)
                            ? <img src={resolveMediaUrl(script.coverImage)} alt="" loading="lazy" />
                            : <span className="fbp-match__fig-empty" aria-hidden="true" />}
                        </Link>
                        <div className="fbp-match__body">
                          <div className="fbp-match__title">{script.title}</div>
                          <div className="fbp-match__meta">{getMetaLine(script)}</div>
                          <div className="fbp-match__chips">
                            {getMandateMatches(script, mandate).map((label) => (
                              <span key={label} className="fbp-matchchip">{label}</span>
                            ))}
                          </div>
                          <div className="fbp-match__foot">
                            <span>
                              {getScore(script) ? `${getScore(script)}/100 · ` : ""}
                              {getPriceLabel(script)}
                            </span>
                            <Link to={pathFor(script)} onClick={openProject(script)} className="fbp-btn fbp-btn--primary fbp-btn--xs">
                              View
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="fbp-shelfnote">
                    <FeaturedIcon name="flag" />
                    <span className="fbp-shelfnote__text">
                      Nothing in the current results satisfies two or more mandate conditions.
                    </span>
                    <Link to="/mandates" className="fbp-btn fbp-btn--quiet fbp-btn--sm">Edit mandate</Link>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Overlays ───────────────────────────────────────────────────── */}
      {drawerOpen && (
        <RefineDrawer
          sort={sort}
          filters={filters}
          resultCount={visible.length}
          mandateSet={mandate.isSet}
          onSort={setSort}
          onToggle={toggleFacet}
          onPremium={(key) => setFilters((p) => ({ ...p, premium: key }))}
          onClear={clearFilters}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {sheetScript && (
        <DetailSheet
          script={sheetScript}
          mandate={mandate}
          scriptPath={pathFor(sheetScript)}
          onClose={() => setSheetId(null)}
          onOpenProject={(e) => {
            if (isBlocked) { openProject(sheetScript)(e); return; }
            setSheetId(null);
            navigate(pathFor(sheetScript));
          }}
          onTrailer={() => { setSheetId(null); setTrailerId(sheetScript._id); }}
          onCopyLink={() => copyShareLink(sheetScript)}
        />
      )}

      {trailerScript && (
        <TrailerModal
          key={trailerScript._id}
          script={trailerScript}
          onClose={() => setTrailerId(null)}
          onOpenProject={(e) => {
            if (isBlocked) { openProject(trailerScript)(e); return; }
            setTrailerId(null);
            navigate(pathFor(trailerScript));
          }}
        />
      )}

      {restrictedFor && (
        <div className="fbp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setRestrictedFor(null); }}>
          <div className="fbp-restrict" role="dialog" aria-modal="true" aria-label="Access restricted">
            <div className="fbp-restrict__head">
              <div>
                <div className="fbp-restrict__eyebrow">PERMISSION</div>
                <h2 className="fbp-restrict__title">Access Restricted</h2>
              </div>
              <button
                type="button"
                className="fbp-sheet__close"
                onClick={() => setRestrictedFor(null)}
                aria-label="Close"
              >
                <FeaturedIcon name="close" />
              </button>
            </div>
            <div className="fbp-restrict__body">
              <p className="fbp-restrict__text">
                Industry accounts on a personal email address can browse featured metadata —
                title, logline, score, format, price — but opening{" "}
                <b>{restrictedFor.title}</b> needs a verified business email or the Film
                Industry Professional plan.
              </p>
              <div className="fbp-restrict__still">
                Still visible without upgrading: {getScore(restrictedFor) ? `score ${getScore(restrictedFor)}/100 · ` : ""}
                {formatCount(getViews(restrictedFor))} views · {getPriceLabel(restrictedFor)}
              </div>
              <div className="fbp-restrict__actions">
                <button
                  type="button"
                  className="fbp-btn fbp-btn--primary"
                  onClick={() => { setRestrictedFor(null); openPricingModal("industry"); }}
                >
                  Get Film Industry Professional
                </button>
                <button
                  type="button"
                  className="fbp-btn fbp-btn--quiet"
                  onClick={() => { setRestrictedFor(null); navigate("/producer-director-onboarding"); }}
                >
                  Update to a business email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fbp-toast" role="status">
          <FeaturedIcon name="checkCircle" className="fbp-toast__icon" />
          {toast}
        </div>
      )}
    </div>
  );
};

export default FeaturedProjectsPage;
