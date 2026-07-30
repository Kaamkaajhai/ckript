import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Search,
  Trophy,
  X,
} from "lucide-react";
import api from "../../services/api";
import CompetitionRecordRow from "./components/CompetitionRecordRow";
import {
  FILTERS,
  PAGE_SIZE,
  filterItems,
  formatDate,
  formatNumber,
  getFilterCount,
  getStats,
  toYear,
} from "./competitionRecord";
import "./MyCompetitionsPage.css";

const useServerCountdown = (target, startsAt, serverNow) => {
  const [remaining, setRemaining] = useState(0);
  const deviceBaseline = useRef(0);

  useEffect(() => {
    deviceBaseline.current = Date.now();
    if (!target) return undefined;
    const targetMs = new Date(target).getTime();
    if (!Number.isFinite(targetMs)) return undefined;
    const parsedServerBaseline = serverNow ? new Date(serverNow).getTime() : NaN;
    const serverBaseline = Number.isFinite(parsedServerBaseline) ? parsedServerBaseline : deviceBaseline.current;
    const update = () => {
      const elapsed = Date.now() - deviceBaseline.current;
      setRemaining(Math.max(0, targetMs - (serverBaseline + elapsed)));
    };
    const initialTimer = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [target, serverNow]);

  const targetMs = target ? new Date(target).getTime() : NaN;
  const startMs = startsAt ? new Date(startsAt).getTime() : NaN;
  const total = targetMs - startMs;

  return {
    hours: String(Math.floor(remaining / 3_600_000)).padStart(2, "0"),
    minutes: String(Math.floor((remaining % 3_600_000) / 60_000)).padStart(2, "0"),
    seconds: String(Math.floor((remaining % 60_000) / 1000)).padStart(2, "0"),
    progress: Number.isFinite(total) && total > 0
      ? Math.max(0, Math.min(100, ((total - remaining) / total) * 100))
      : 0,
  };
};

const FilterSelect = ({ label, value, onChange, options }) => {
  const selected = options.find((option) => option.value === value) || options[0];
  return (
    <label className={value !== "all" ? "competition-record-page__filter competition-record-page__filter--active" : "competition-record-page__filter"}>
      <span>{label}</span>
      <strong>{selected?.label}</strong>
      <select value={value} onChange={onChange} aria-label={`Filter by ${label.toLowerCase()}`}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}{option.count === undefined ? "" : ` · ${option.count}`}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" />
    </label>
  );
};

const LoadingRows = () => (
  <div className="competition-record-page__skeleton-list" aria-label="Loading your competitions">
    {[1, 2, 3, 4].map((item) => (
      <div key={item}>
        <span />
        <span />
        <span />
      </div>
    ))}
  </div>
);

const MyCompetitionsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [serverNow, setServerNow] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [award, setAward] = useState("all");
  const [year, setYear] = useState("all");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState("");
  const [menuId, setMenuId] = useState("");
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/competitions/mine");
      setItems(Array.isArray(data?.items) ? data.items : []);
      setServerNow(data?.serverNow || "");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load your competitions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!menuId) return undefined;
    const close = (event) => {
      if (event.key === "Escape" || event.type === "pointerdown") setMenuId("");
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [menuId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(() => getStats(items), [items]);
  const years = useMemo(() => [...new Set(items.map(toYear).filter(Boolean))].sort((a, b) => b.localeCompare(a)), [items]);
  const filters = useMemo(() => ({ query, status, award, year }), [award, query, status, year]);
  const filtered = useMemo(() => filterItems(items, filters), [filters, items]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visibleItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const noFilters = !query && status === "all" && award === "all" && year === "all";
  const liveItem = noFilters
    ? items.find((item) => item?.phase === "live" && item?.entry?.status === "writing")
    : null;
  const liveClock = useServerCountdown(
    liveItem?.competition?.dates?.endsAt,
    liveItem?.competition?.dates?.startsAt,
    serverNow,
  );

  const withCounts = (type, options) => options.map((option) => ({
    ...option,
    count: getFilterCount(items, type, option.value),
  }));

  const resetPage = (setter) => (event) => {
    setter(event.target.value);
    setPage(0);
    setExpandedId("");
    setMenuId("");
  };

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setAward("all");
    setYear("all");
    setPage(0);
    setExpandedId("");
  };

  const showNotice = (message, isError = false) => setNotice({ message, isError });
  const start = filtered.length ? safePage * PAGE_SIZE + 1 : 0;
  const end = Math.min(filtered.length, start + PAGE_SIZE - 1);

  return (
    <main className="competition-record-page">
      <div className="competition-record-page__inner">
        <header className="competition-record-page__hero">
          <div className="competition-record-page__hero-copy">
            <p>Your record · {loading ? "—" : items.length} challenges</p>
            <h1>My competitions<span aria-hidden="true" /></h1>
            <p>Every challenge you have entered, what you wrote against the clock, and how it went.</p>
          </div>

          <div className="competition-record-page__hero-aside">
            <dl className="competition-record-page__stats">
              <div><dd>{loading ? "—" : stats.awards}</dd><dt>Awards</dt></div>
              <div><dd>{loading ? "—" : formatNumber(stats.pages, "0")}</dd><dt>Pages written</dt></div>
              <div><dd>{loading ? "—" : stats.certificates}</dd><dt>Certificates</dt></div>
            </dl>
            <div className="competition-record-page__hero-actions">
              <Link to="/challenge" className="competition-record-page__text-action">Challenge hub</Link>
              <Link to="/challenge" className="competition-record-page__primary-action">
                See the current challenge<ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>

        <div className="competition-record-page__rule" />

        {liveItem ? (
          <section className="competition-record-page__live" aria-labelledby="competition-record-live-title">
            <div className="competition-record-page__live-copy">
              <p>01 — In play</p>
              <h2 id="competition-record-live-title">{liveItem.competition.name}</h2>
              {liveItem.competition.theme?.title ? <em>Theme — {liveItem.competition.theme.title}</em> : null}
              <p>You are registered and the writing window is open. Your draft saves as you write.</p>
              <div>
                <button
                  type="button"
                  className="competition-record-page__primary-action"
                  onClick={() => navigate(`/challenge/dashboard?c=${liveItem.competition.slug}`)}
                >
                  Continue writing
                </button>
                <Link to={`/challenge/dashboard?c=${liveItem.competition.slug}`} className="competition-record-page__text-action">
                  Competition dashboard
                </Link>
              </div>
            </div>
            <div className="competition-record-page__clock">
              <div>
                <p>Time remaining</p>
                <dl>
                  <div><dd>{liveClock.hours}</dd><dt>hours</dt></div>
                  <div><dd>{liveClock.minutes}</dd><dt>minutes</dt></div>
                  <div><dd>{liveClock.seconds}</dd><dt>seconds</dt></div>
                </dl>
              </div>
              <div>
                <span className="competition-record-page__clock-track">
                  <span style={{ width: `${liveClock.progress}%` }} />
                  <i style={{ left: `${liveClock.progress}%` }} />
                </span>
                <p>
                  <span>{liveItem.entry.eventId} · writing</span>
                  <span>closes {formatDate(liveItem.competition.dates.endsAt, true)}</span>
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="competition-record-page__ledger" aria-labelledby="competition-record-ledger-title">
          <div className="competition-record-page__ledger-heading">
            <div>
              <p>{liveItem ? "02" : "01"} — The ledger</p>
              <h2 id="competition-record-ledger-title">Every entry</h2>
            </div>
            {!loading && !error ? (
              <p>{filtered.length === items.length ? `${items.length} entries, newest first` : `${filtered.length} of ${items.length} entries match`}</p>
            ) : null}
          </div>

          {!loading && !error && items.length ? (
            <div className="competition-record-page__toolbar">
              <label className="competition-record-page__search">
                <Search aria-hidden="true" />
                <span className="competition-record-page__sr-only">Search your entries</span>
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                    setExpandedId("");
                  }}
                  placeholder="Search title, script or Event ID"
                />
                {query ? (
                  <button type="button" onClick={() => { setQuery(""); setPage(0); }} aria-label="Clear search">
                    <X aria-hidden="true" />
                  </button>
                ) : null}
              </label>
              <div className="competition-record-page__filters">
                <FilterSelect label="Status" value={status} onChange={resetPage(setStatus)} options={withCounts("status", FILTERS.status)} />
                <FilterSelect label="Award" value={award} onChange={resetPage(setAward)} options={withCounts("award", FILTERS.award)} />
                <FilterSelect
                  label="Year"
                  value={year}
                  onChange={resetPage(setYear)}
                  options={[
                    { value: "all", label: "All years", count: items.length },
                    ...years.map((value) => ({
                      value,
                      label: value,
                      count: items.filter((item) => toYear(item) === value).length,
                    })),
                  ]}
                />
              </div>
            </div>
          ) : null}

          {loading ? <LoadingRows /> : null}

          {!loading && error ? (
            <div className="competition-record-page__state">
              <Trophy aria-hidden="true" />
              <h3>Failed to load your competitions.</h3>
              <p>{error}</p>
              <button type="button" className="competition-record-page__primary-action" onClick={load}>Try again</button>
            </div>
          ) : null}

          {!loading && !error && !items.length ? (
            <div className="competition-record-page__empty">
              <div>
                <p>Nothing on record yet</p>
                <h3>You haven&apos;t entered a<br /><em>competition yet.</em></h3>
                <p>Ckript runs 48-hour scriptwriting challenges with real prizes. One theme, a fixed window, and a complete script at the end of it.</p>
                <Link to="/challenge" className="competition-record-page__primary-action">
                  See the current challenge<ArrowRight aria-hidden="true" />
                </Link>
              </div>
              <div><strong>48</strong><span>hours to write</span></div>
            </div>
          ) : null}

          {!loading && !error && items.length && !filtered.length ? (
            <div className="competition-record-page__state">
              <Search aria-hidden="true" />
              <h3>No entry matches {query ? <em>“{query}”</em> : "these filters"}.</h3>
              <p>Search covers the challenge name, the script title and the Event ID.</p>
              <button type="button" className="competition-record-page__text-action" onClick={clearFilters}>
                Clear search and filters
              </button>
            </div>
          ) : null}

          {!loading && !error && visibleItems.length ? (
            <div className="competition-record-page__entries">
              {visibleItems.map((item, itemIndex) => {
                const id = item.entry._id;
                return (
                  <CompetitionRecordRow
                    key={id}
                    item={item}
                    index={safePage * PAGE_SIZE + itemIndex}
                    expanded={expandedId === id}
                    menuOpen={menuId === id}
                    onToggle={() => {
                      setExpandedId((current) => current === id ? "" : id);
                      setMenuId("");
                    }}
                    onToggleMenu={(event) => {
                      event.stopPropagation();
                      setMenuId((current) => current === id ? "" : id);
                    }}
                    onCloseMenu={() => setMenuId("")}
                    onNotice={showNotice}
                  />
                );
              })}
            </div>
          ) : null}

          {!loading && !error && filtered.length ? (
            <footer className="competition-record-page__pagination">
              <p>Showing {start}–{end} of {filtered.length}</p>
              <div>
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => { setPage(Math.max(0, safePage - 1)); setExpandedId(""); setMenuId(""); }}
                  aria-label="Previous page"
                >
                  <ArrowLeft aria-hidden="true" />
                </button>
                <span>{String(safePage + 1).padStart(2, "0")} / {String(pages).padStart(2, "0")}</span>
                <button
                  type="button"
                  disabled={safePage >= pages - 1}
                  onClick={() => { setPage(Math.min(pages - 1, safePage + 1)); setExpandedId(""); setMenuId(""); }}
                  aria-label="Next page"
                >
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </footer>
          ) : null}
        </section>
      </div>

      {notice ? (
        <div
          className={notice.isError ? "competition-record-page__notice competition-record-page__notice--error" : "competition-record-page__notice"}
          role="status"
        >
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><X aria-hidden="true" /></button>
        </div>
      ) : null}
    </main>
  );
};

export default MyCompetitionsPage;
