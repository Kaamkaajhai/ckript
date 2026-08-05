import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { usesAppShell } from "../../layouts/app-shell";
import {
  hasActiveFilmIndustryProfessionalAccess,
  hasBusinessEmail,
  isFilmIndustryProfessionalRole,
} from "../../utils/industryAccess";
import { getScriptCanonicalPath } from "../../utils/scriptPath";
import LeadStory from "./components/LeadStory";
import ShelfRail from "./components/ShelfRail";
import ProjectRailCard from "./components/ProjectRailCard";
import {
  SORT_OPTIONS,
  buildShelves,
  collectFeedProjects,
  countBookmarks,
  formatCount,
  formatDateline,
  getAverageScore,
  getBriefCompletion,
  getFirstName,
  getGreeting,
  getWorkspaceLabel,
  sortProjects,
} from "./investorDesk";
import "./InvestorDeskPage.css";

const ALL_TAB = "all";

const Skeleton = ({ style }) => <div className="idp-skel" style={style} />;

const InvestorDeskPage = () => {
  const { user } = useContext(AuthContext);
  const { openPricingModal } = useAuthModal();
  const navigate = useNavigate();

  const [feed, setFeed] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  /* `degraded` means the personalised endpoint failed and the page is showing
     the /scripts/latest fallback the previous implementation also used. */
  const [degraded, setDegraded] = useState(false);
  const [tab, setTab] = useState(ALL_TAB);
  const [sort, setSort] = useState("match");
  const [openIndex, setOpenIndex] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const blocked = isFilmIndustryProfessionalRole(user)
    && !hasBusinessEmail(user?.email)
    && !hasActiveFilmIndustryProfessionalAccess(user);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/scripts/investor-home");
      setFeed(data);
      setDegraded(false);
    } catch {
      try {
        const { data } = await api.get("/scripts/latest");
        setFeed({ detectedGenres: [], genreSections: [], trending: data, newReleases: [], explore: [] });
      } catch {
        setFeed({ detectedGenres: [], genreSections: [], trending: [], newReleases: [], explore: [] });
      }
      setDegraded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  /* The standing brief and the watchlist count live on the member record, the
     same document MandatesPage reads and writes. */
  useEffect(() => {
    let active = true;
    api.get("/users/me")
      .then(({ data }) => { if (active) setProfile(data); })
      .catch(() => { /* the meter simply reads 0% if the record is unavailable */ });
    return () => { active = false; };
  }, []);

  /* ── Derived ─────────────────────────────────────────────────────────── */

  const shelves = useMemo(() => buildShelves(feed), [feed]);
  const allProjects = useMemo(() => collectFeedProjects(feed), [feed]);
  const brief = useMemo(() => getBriefCompletion(profile), [profile]);
  const watchlistCount = countBookmarks(profile) || countBookmarks(user);

  const visibleShelves = useMemo(() => {
    const chosen = tab === ALL_TAB ? shelves : shelves.filter((shelf) => shelf.id === tab);
    return chosen.map((shelf) => ({ ...shelf, items: sortProjects(shelf.items, sort) }));
  }, [shelves, tab, sort]);

  const lead = useMemo(() => {
    const pool = tab === ALL_TAB ? allProjects : (visibleShelves[0]?.items || []);
    return sortProjects(pool, sort)[0] || null;
  }, [allProjects, visibleShelves, tab, sort]);

  const newReleases = feed?.newReleases || [];
  const explore = feed?.explore || [];

  const isEmpty = !loading && allProjects.length === 0;
  const greeting = getGreeting();
  const firstName = getFirstName(user);
  const avgScore = getAverageScore(allProjects);

  /* ── Handlers ────────────────────────────────────────────────────────── */

  /*
   * Opening a project is the one action a personal-email account cannot
   * complete — the same rule the previous page enforced. Everything else
   * (browsing, sorting, saving) stays open.
   */
  const handleOpenProject = useCallback((project) => {
    if (blocked) {
      setShowUpgradeModal(true);
      return;
    }
    if (project?._id) {
      api.post(`/scripts/${project._id}/interactions`, {
        type: "click",
        source: "investor_desk",
        metadata: { from: "lead" },
      }).catch(() => null);
    }
    navigate(getScriptCanonicalPath(project));
  }, [blocked, navigate]);

  const handleBlockedOpen = blocked ? () => setShowUpgradeModal(true) : undefined;

  const toggleIndexPanel = (key) => setOpenIndex((current) => (current === key ? null : key));

  /* ── Render ──────────────────────────────────────────────────────────── */

  /*
   * The app shell hands this route a padded white column; the design wants the
   * desk to own that area with its own field and rhythm, so the bleed class is
   * applied only for that shell. MainLayout (reader/admin) pads differently and
   * keeps its own column.
   */
  const rootClass = `investor-desk-page${usesAppShell(user?.role) ? " investor-desk-page--bleed" : ""}`;

  const indexRows = [
    {
      key: "new",
      title: "New releases",
      sub: "Published in the last 30 days",
      count: newReleases.length,
      items: newReleases,
    },
    {
      key: "explore",
      title: "Explore",
      sub: "Ranked, but outside the genres in your brief",
      count: explore.length,
      items: explore,
    },
  ].filter((row) => row.count > 0);

  const indexLinks = [
    { key: "featured", title: "Featured", sub: "Spotlight-promoted projects", to: "/featured" },
    { key: "top", title: "Top scripts", sub: "Platform score, AI score and trending", to: "/top-script" },
    { key: "writers", title: "Browse writers", sub: "Filter by genre, format and credits", to: "/writers" },
  ];

  return (
    <div className={rootClass}>
      <div className="investor-desk-page__inner">

        {degraded && (
          <div className="idp-banner idp-banner--error" role="status">
            <span className="idp-icon" style={{ fontSize: 20 }} aria-hidden="true">error</span>
            <div className="idp-banner__body">
              <div className="idp-banner__title">Personalisation is unavailable — showing the latest published projects</div>
              <div className="idp-banner__note">
                Your brief could not be applied to this feed. Genre shelves and match reasons return once it recovers.
              </div>
            </div>
            <button type="button" className="idp-btn idp-btn--ghost-sm" onClick={fetchFeed} disabled={loading}>
              {loading ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}

        {blocked && (
          <div className="idp-banner idp-banner--locked" role="status">
            <span className="idp-icon" style={{ fontSize: 20 }} aria-hidden="true">lock</span>
            <div className="idp-banner__body">
              <div className="idp-banner__title">Reading is restricted on personal-email accounts</div>
              <div className="idp-banner__note">
                Browse and save freely. Opening a script asks you to upgrade or switch to a business email.
              </div>
            </div>
            <button type="button" className="idp-btn idp-banner__action" onClick={() => setShowUpgradeModal(true)}>
              Resolve
            </button>
          </div>
        )}

        {loading && !feed && (
          <div aria-busy="true" aria-label="Loading your desk">
            <Skeleton style={{ height: 14, width: 180 }} />
            <Skeleton style={{ height: 44, width: "60%", marginTop: 16 }} />
            <div className="idp-skel-stats">
              {[0, 1, 2, 3].map((key) => (
                <div className="idp-skel-stat" key={key}>
                  <Skeleton style={{ height: 11, width: 70 }} />
                  <Skeleton style={{ height: 38, width: 90, marginTop: 12 }} />
                </div>
              ))}
            </div>
            <div className="idp-skel-lead">
              <Skeleton style={{ width: 344, height: 260, flex: "none" }} />
              <div style={{ flex: 1 }}>
                <Skeleton style={{ height: 12, width: 180 }} />
                <Skeleton style={{ height: 34, width: "70%", marginTop: 14 }} />
                <Skeleton style={{ height: 12, width: "90%", marginTop: 18 }} />
                <Skeleton style={{ height: 12, width: "76%", marginTop: 8 }} />
                <Skeleton style={{ height: 40, width: 300, marginTop: 26 }} />
              </div>
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="idp-empty">
            <div className="idp-eyebrow">Nothing on the desk yet</div>
            <h1 className="idp-empty__title">No published project matches your brief this week.</h1>
            <p className="idp-empty__lede">
              Your profile and mandate are used automatically to surface scripts. Widen the brief, or read
              across the whole catalogue while the shelves fill.
            </p>
            <div className="idp-empty__actions">
              <Link to="/mandates" className="idp-btn--ink">Widen the brief</Link>
              <Link to="/search" className="idp-btn--ghost">Browse all published</Link>
            </div>
            {brief.setCount < brief.total && (
              <div className="idp-empty__note">
                Your brief is {brief.percent}% complete —{" "}
                {brief.facets.filter((facet) => !facet.set).map((facet) => facet.label).join(", ")} not set yet.
              </div>
            )}
          </div>
        )}

        {!loading && !isEmpty && (
          <>
            {/* ── Masthead ────────────────────────────────────────────── */}
            <header className="idp-masthead">
              <div>
                <div className="idp-eyebrow">
                  {greeting} · {getWorkspaceLabel(user?.role)} · {formatDateline()}
                </div>
                <h1 className="idp-masthead__title">
                  {firstName}, {allProjects.length} {allProjects.length === 1 ? "project fits" : "projects fit"} your brief today
                </h1>
              </div>

              <div className="idp-brief">
                <div className="idp-brief__label">Standing brief</div>
                <div className="idp-brief__reading">
                  <span className="idp-brief__value">{brief.percent}%</span>
                  <span className="idp-brief__unit">complete</span>
                </div>
                <div className="idp-brief__track">
                  <div className="idp-brief__fill" style={{ width: `${brief.percent}%` }} />
                </div>
                <Link to="/mandates" className="idp-btn--ghost-sm idp-brief__cta">Refine brief</Link>
              </div>
            </header>

            {/* ── Stat band ───────────────────────────────────────────── */}
            <div className="idp-stats">
              <div className="idp-stat">
                <div className="idp-stat__label">Matched</div>
                <div className="idp-stat__value">{allProjects.length}</div>
                <div className="idp-stat__sub">
                  across {shelves.length} {shelves.length === 1 ? "shelf" : "shelves"}
                </div>
              </div>
              <div className="idp-stat">
                <div className="idp-stat__label">New releases</div>
                <div className="idp-stat__value">{newReleases.length}</div>
                <div className="idp-stat__sub">in the last 30 days</div>
              </div>
              <div className="idp-stat">
                <div className="idp-stat__label">Watchlist</div>
                <div className="idp-stat__value">{watchlistCount}</div>
                <div className="idp-stat__sub">saved projects</div>
              </div>
              <div className="idp-stat">
                <div className="idp-stat__label">Avg score</div>
                <div className="idp-stat__value">{avgScore == null ? "—" : avgScore}</div>
                <div className="idp-stat__sub">
                  {avgScore == null ? "not scored yet" : "across your matches"}
                </div>
              </div>
            </div>

            {/* ── The lead ────────────────────────────────────────────── */}
            {/* Keyed on the project so changing tab or sort remounts the lead
                with a clean cover, menu and reasons panel. */}
            {lead && (
              <LeadStory
                key={lead._id}
                project={lead}
                viewer={user}
                blocked={blocked}
                onOpen={handleOpenProject}
              />
            )}

            {/* ── Tabs + sort ─────────────────────────────────────────── */}
            {shelves.length > 0 && (
              <div className="idp-toolbar">
                <div className="idp-tabs" role="tablist" aria-label="Filter shelves">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === ALL_TAB}
                    className={`idp-btn idp-tab${tab === ALL_TAB ? " idp-tab--active" : ""}`}
                    onClick={() => setTab(ALL_TAB)}
                  >
                    All matches <span className="idp-tab__count">{allProjects.length}</span>
                  </button>
                  {shelves.map((shelf) => (
                    <button
                      key={shelf.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === shelf.id}
                      className={`idp-btn idp-tab${tab === shelf.id ? " idp-tab--active" : ""}`}
                      onClick={() => setTab(shelf.id)}
                    >
                      {shelf.title} <span className="idp-tab__count">{shelf.items.length}</span>
                    </button>
                  ))}
                </div>

                <div className="idp-sort">
                  <label htmlFor="idp-sort-select">Sort</label>
                  <select
                    id="idp-sort-select"
                    className="idp-select"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ── Shelves ─────────────────────────────────────────────── */}
            {visibleShelves.map((shelf) => (
              <ShelfRail
                key={shelf.id}
                icon={shelf.icon}
                title={shelf.title}
                caption={shelf.caption}
                items={shelf.items}
                viewAllTo={shelf.searchTerm ? `/search?q=${encodeURIComponent(shelf.searchTerm)}` : "/search"}
                onBlockedOpen={handleBlockedOpen}
              />
            ))}

            {/* ── Elsewhere in the catalogue ──────────────────────────── */}
            <section className="idp-elsewhere">
              <div className="idp-eyebrow">Elsewhere in the catalogue</div>

              {indexRows.map((row) => (
                <div key={row.key}>
                  <button
                    type="button"
                    className="idp-btn idp-elsewhere__row"
                    onClick={() => toggleIndexPanel(row.key)}
                    aria-expanded={openIndex === row.key}
                  >
                    <span className="idp-elsewhere__title">{row.title}</span>
                    <span className="idp-elsewhere__sub">{row.sub}</span>
                    <span className="idp-elsewhere__count">{formatCount(row.count)}</span>
                    <span className="idp-icon" style={{ fontSize: 18 }} aria-hidden="true">
                      {openIndex === row.key ? "expand_less" : "chevron_right"}
                    </span>
                  </button>
                  {openIndex === row.key && (
                    <div className="idp-elsewhere__panel">
                      <div className="idp-rail">
                        {sortProjects(row.items, sort).map((project, index) => (
                          <ProjectRailCard
                            key={project?._id || index}
                            project={project}
                            rank={index + 1}
                            onBlockedOpen={handleBlockedOpen}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {indexLinks.map((row) => (
                <Link key={row.key} to={row.to} className="idp-elsewhere__row">
                  <span className="idp-elsewhere__title">{row.title}</span>
                  <span className="idp-elsewhere__sub">{row.sub}</span>
                  <span className="idp-icon" style={{ fontSize: 18 }} aria-hidden="true">chevron_right</span>
                </Link>
              ))}
            </section>
          </>
        )}
      </div>

      {/* ── Upgrade modal ────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div
          className="idp-modal-scrim"
          role="presentation"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className="idp-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Access restricted"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="idp-modal__head">
              <div>
                <div className="idp-modal__eyebrow">Access restricted</div>
                <h2 className="idp-modal__title">Reading needs a business account</h2>
              </div>
              <button
                type="button"
                className="idp-btn idp-modal__close"
                onClick={() => setShowUpgradeModal(false)}
                aria-label="Close"
              >
                <span className="idp-icon" style={{ fontSize: 18 }} aria-hidden="true">close</span>
              </button>
            </div>
            <div className="idp-modal__body">
              <p className="idp-modal__note">
                Your account uses a personal email. Choose an option to continue reading scripts.
              </p>
              <button
                type="button"
                className="idp-btn idp-modal__option"
                onClick={() => { setShowUpgradeModal(false); openPricingModal("industry"); }}
              >
                <span>
                  <span className="idp-modal__option-kind">Premium</span>
                  <span className="idp-modal__option-label">Get the Film Industry Professional plan</span>
                </span>
                <span className="idp-icon" style={{ fontSize: 18 }} aria-hidden="true">chevron_right</span>
              </button>
              <button
                type="button"
                className="idp-btn idp-modal__option"
                onClick={() => { setShowUpgradeModal(false); navigate("/producer-director-onboarding"); }}
              >
                <span>
                  <span className="idp-modal__option-kind">Free</span>
                  <span className="idp-modal__option-label">Update to a business email</span>
                </span>
                <span className="idp-icon" style={{ fontSize: 18 }} aria-hidden="true">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorDeskPage;
