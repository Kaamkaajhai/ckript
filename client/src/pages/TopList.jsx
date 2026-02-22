import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";

/* ── Filter Constants ───────────────────────────────── */
const GENRES = [
  "Thriller", "Drama", "Comedy", "Sci-Fi", "Horror", "Romance",
  "Action", "Mystery", "Fantasy", "Animation", "Crime", "Adventure",
];

const CONTENT_TYPES = [
  { key: "movie", label: "Movie" },
  { key: "tv_series", label: "TV Series" },
  { key: "short_film", label: "Short Film" },
  { key: "web_series", label: "Web Series" },
  { key: "documentary", label: "Documentary" },
  { key: "anime", label: "Anime" },
  { key: "book", label: "Book" },
  { key: "startup", label: "Startup" },
];

const BUDGETS = [
  { key: "micro", label: "Micro" },
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "blockbuster", label: "Blockbuster" },
];

const PREMIUM_OPTIONS = [
  { key: "all", label: "All" },
  { key: "free", label: "Free Only" },
  { key: "premium", label: "Premium Only" },
];

const budgetLabel = { micro: "Micro", low: "Low", medium: "Medium", high: "High", blockbuster: "Blockbuster" };

/* ── Icons ──────────────────────────────────────────── */
const FilterIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
  </svg>
);

const ChevronDown = ({ open }) => (
  <svg className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const XIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ── Reusable Components ────────────────────────────── */
const Pill = ({ active, onClick, children }) => {
  const base = "px-3.5 py-[7px] rounded-xl text-[12px] font-semibold transition-all duration-200 whitespace-nowrap border cursor-pointer select-none";
  const styles = active
    ? "bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm shadow-[#1e3a5f]/15"
    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 hover:shadow-sm";
  return <button onClick={onClick} className={`${base} ${styles}`}>{children}</button>;
};

const FilterSection = ({ label, children }) => (
  <div className="space-y-2.5">
    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">{label}</h4>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

/* ── Main Component ─────────────────────────────────── */
const TopList = () => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("platform");
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* Filter state */
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("");
  const [selectedPremium, setSelectedPremium] = useState("all");

  const activeFilterCount = [
    selectedGenre,
    selectedContentType,
    selectedBudget,
    selectedPremium !== "all" ? selectedPremium : "",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedGenre("");
    setSelectedContentType("");
    setSelectedBudget("");
    setSelectedPremium("all");
  };

  useEffect(() => {
    fetchScripts();
  }, [sortBy, selectedGenre, selectedContentType, selectedBudget, selectedPremium]);

  const fetchScripts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("sort", sortBy);
      if (selectedGenre) params.append("genre", selectedGenre);
      if (selectedContentType) params.append("contentType", selectedContentType);
      if (selectedBudget) params.append("budget", selectedBudget);
      if (selectedPremium === "premium") params.append("premium", "true");
      else if (selectedPremium === "free") params.append("premium", "false");

      const { data } = await api.get(`/scripts?${params.toString()}`);
      setScripts(Array.isArray(data) ? data : []);
    } catch {
      setScripts([]);
    }
    setLoading(false);
  };

  const sortTabs = [
    { key: "platform", label: "Platform", icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" },
    { key: "score", label: "AI Score", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" },
    { key: "engagement", label: "Readers", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" },
    { key: "views", label: "Views", icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" },
  ];

  const getMetric = (script) => {
    if (sortBy === "platform") { const v = Math.round(script.platformScore || 0); return { value: v, pct: Math.min(v, 100) }; }
    if (sortBy === "score") { const v = script.scriptScore?.overall || 0; return { value: v, pct: Math.min(v, 100) }; }
    if (sortBy === "engagement") { const v = Math.round(script.engagementScore || 0); return { value: v, pct: Math.min(v, 100) }; }
    const v = script.views || 0; return { value: v.toLocaleString(), pct: Math.min((v / 1000) * 100, 100) };
  };

  const resolveImg = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5001${url}`;
  };

  const totalScripts = scripts.length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <div className="w-10 h-10 border-[3px] border-gray-100 border-t-[#1e3a5f] rounded-full animate-spin"></div>
      <p className="text-[13px] text-gray-400 font-medium">Loading rankings...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#1e3a5f] to-[#3a7bd5]" />
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Top List</h1>
            </div>
            <p className="text-[13px] text-gray-400 font-medium ml-[18px]">
              {sortTabs.find(t => t.key === sortBy)?.desc}
            </p>
          </div>

          {/* Summary stats — compact inline badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f]/[0.05] rounded-lg">
              <span className="text-[11px] font-semibold text-gray-400">Scripts</span>
              <span className="text-[14px] font-extrabold text-[#1e3a5f] tabular-nums">{totalScripts}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f]/[0.05] rounded-lg">
              <span className="text-[11px] font-semibold text-gray-400">Top</span>
              <span className="text-[14px] font-extrabold text-[#1e3a5f] tabular-nums">{topScore.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg">
              <span className="text-[11px] font-semibold text-gray-400">Avg</span>
              <span className="text-[14px] font-extrabold text-gray-500 tabular-nums">{avgMetric.toLocaleString()}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Top List</h1>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md tabular-nums">{totalScripts}</span>
          </div>
          <p className="text-sm text-gray-400 font-medium ml-[42px]">Ranked by performance, quality, and engagement</p>
        </div>

      {/* Sort tabs + Filter toggle */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-3">
            {/* Sort tabs */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {sortTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSortBy(tab.key)}
                  className={`relative px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-250 whitespace-nowrap ${sortBy === tab.key
                    ? "bg-[#1e3a5f] text-white shadow-lg shadow-[#1e3a5f]/20"
                    : "bg-white text-gray-500 border border-gray-200/80 hover:border-gray-300 hover:text-gray-700 hover:shadow-sm"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 border ${filtersOpen || activeFilterCount > 0
                ? "bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
            >
              <FilterIcon />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 bg-white/20 rounded-md text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown open={filtersOpen} />
            </button>
          </div>

          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              {selectedGenre && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-[11px] font-bold">
                  {selectedGenre}
                  <button onClick={() => setSelectedGenre("")} className="hover:bg-[#1e3a5f]/10 rounded p-0.5 transition-colors"><XIcon /></button>
                </span>
              )}
              {selectedContentType && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-[11px] font-bold">
                  {CONTENT_TYPES.find(c => c.key === selectedContentType)?.label || selectedContentType}
                  <button onClick={() => setSelectedContentType("")} className="hover:bg-[#1e3a5f]/10 rounded p-0.5 transition-colors"><XIcon /></button>
                </span>
              )}
              {selectedBudget && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-[11px] font-bold">
                  {budgetLabel[selectedBudget]} Budget
                  <button onClick={() => setSelectedBudget("")} className="hover:bg-[#1e3a5f]/10 rounded p-0.5 transition-colors"><XIcon /></button>
                </span>
              )}
              {selectedPremium !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-[11px] font-bold">
                  {selectedPremium === "premium" ? "Premium" : "Free"}
                  <button onClick={() => setSelectedPremium("all")} className="hover:bg-[#1e3a5f]/10 rounded p-0.5 transition-colors"><XIcon /></button>
                </span>
              )}
              <button onClick={clearAllFilters} className="text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors px-2 py-1">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Collapsible filter panel ── */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 mb-4">
                {/* Genre */}
                <FilterSection label="Genre">
                  <Pill active={!selectedGenre} onClick={() => setSelectedGenre("")}>All Genres</Pill>
                  {GENRES.map((g) => (
                    <Pill key={g} active={selectedGenre === g} onClick={() => setSelectedGenre(selectedGenre === g ? "" : g)}>{g}</Pill>
                  ))}
                </FilterSection>

                <div className="border-t border-gray-100" />

                {/* Content Type */}
                <FilterSection label="Content Type">
                  <Pill active={!selectedContentType} onClick={() => setSelectedContentType("")}>All Types</Pill>
                  {CONTENT_TYPES.map((ct) => (
                    <Pill key={ct.key} active={selectedContentType === ct.key} onClick={() => setSelectedContentType(selectedContentType === ct.key ? "" : ct.key)}>{ct.label}</Pill>
                  ))}
                </FilterSection>

                <div className="border-t border-gray-100" />

                {/* Budget + Premium row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FilterSection label="Budget Range">
                    <Pill active={!selectedBudget} onClick={() => setSelectedBudget("")}>Any</Pill>
                    {BUDGETS.map((b) => (
                      <Pill key={b.key} active={selectedBudget === b.key} onClick={() => setSelectedBudget(selectedBudget === b.key ? "" : b.key)}>{b.label}</Pill>
                    ))}
                  </FilterSection>

                  <FilterSection label="Pricing">
                    {PREMIUM_OPTIONS.map((p) => (
                      <Pill key={p.key} active={selectedPremium === p.key} onClick={() => setSelectedPremium(p.key)}>{p.label}</Pill>
                    ))}
                  </FilterSection>
                </div>

                {/* Clear All (mobile) */}
                {activeFilterCount > 0 && (
                  <div className="flex sm:hidden justify-end pt-2">
                    <button onClick={clearAllFilters} className="text-[12px] font-semibold text-red-500 hover:text-red-600 transition-colors px-3 py-1.5 border border-red-200 rounded-xl bg-red-50">
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

        {scripts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-24 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-800 mb-1">No projects found</p>
            <p className="text-sm text-gray-400">Check back later for top-ranked projects</p>
          </div>
          <p className="text-[16px] font-bold text-gray-800 mb-1">No projects found</p>
          <p className="text-[13px] text-gray-400 mb-4">Try adjusting your filters or check back later</p>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#162d4a] transition-colors shadow-sm">
              Clear all filters
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {scripts.map((script, index) => {
            const metric = getMetric(script);

                          {/* Genre */}
                          {(script.genre || script.primaryGenre) && (
                            <span className="absolute top-3 right-3 text-[10px] font-bold text-white/90 bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                              {script.primaryGenre || script.genre}
                            </span>
                          )}

                          {/* Creator */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/20 overflow-hidden">
                              {script.creator?.profileImage ? (
                                <img src={resolveImg(script.creator.profileImage)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] font-bold text-white">{script.creator?.name?.charAt(0)?.toUpperCase()}</span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-white/80 drop-shadow">{script.creator?.name}</span>
                          </div>

                          {/* Score circle */}
                          <div className="absolute bottom-3 right-3">
                            <div className="relative w-10 h-10">
                              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                                <circle cx="20" cy="20" r="16" fill="none" stroke="white" strokeWidth="3"
                                  strokeDasharray={`${(metric.pct / 100) * 100.5} 100.5`}
                                  strokeLinecap="round" className="drop-shadow" />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-extrabold text-white drop-shadow tabular-nums">{metric.value}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                          <h3 className="text-[15px] font-bold text-gray-900 leading-snug mb-1.5 line-clamp-1 group-hover:text-[#1e3a5f] transition-colors tracking-tight">
                            {script.title}
                          </h3>
                          {script.logline && (
                            <p className="text-[12px] text-gray-400 line-clamp-2 leading-relaxed mb-3 font-medium">{script.logline}</p>
                          )}
                          <div className="flex items-center gap-3 text-gray-400">
                            <div className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-[11px] font-semibold tabular-nums">{(script.views || 0).toLocaleString()}</span></div>
                            {script.pageCount && <div className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg><span className="text-[11px] font-semibold tabular-nums">{script.pageCount}p</span></div>}
                            {script.premium && <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">${script.price}</span>}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ── Ranked List ── */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((script, i) => {
                  const metric = getMetric(script);
                  const rank = i + 4;
                  return (
                    <motion.div key={script._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}>
                      <Link to={`/script/${script._id}`}
                        className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 transition-all duration-300 group">

                        {/* Rank number */}
                        <div className="w-8 flex-shrink-0 text-center">
                          <span className="text-lg font-extrabold text-gray-200 tabular-nums">{rank}</span>
                        </div>

                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          {script.coverImage ? (
                            <img src={resolveImg(script.coverImage)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#0f2544] to-[#1e3a5f] flex items-center justify-center">
                              <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-[14px] font-bold text-gray-900 truncate group-hover:text-[#1e3a5f] transition-colors tracking-tight">{script.title}</h3>
                            {(script.primaryGenre || script.genre) && (
                              <span className="hidden sm:inline text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md flex-shrink-0">{script.primaryGenre || script.genre}</span>
                            )}
                          </div>
                          {script.logline ? (
                            <p className="text-[12px] text-gray-400 truncate font-medium">{script.logline}</p>
                          ) : (
                            <p className="text-[12px] text-gray-400 truncate font-medium">by {script.creator?.name || "Unknown"}</p>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                          <div className="text-center px-2">
                            <p className="text-[11px] font-extrabold text-gray-800 tabular-nums">{(script.views || 0).toLocaleString()}</p>
                            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">views</p>
                          </div>
                          {script.scriptScore?.overall > 0 && (
                            <div className="text-center px-2">
                              <p className="text-[11px] font-extrabold text-gray-800 tabular-nums">{script.scriptScore.overall}</p>
                              <p className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">score</p>
                            </div>
                          )}
                        </div>

                        {/* Metric */}
                        <div className="flex-shrink-0 w-16 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${metric.pct}%` }}
                                transition={{ duration: 0.6, delay: i * 0.03 + 0.3 }}
                                className="h-full rounded-full bg-[#1e3a5f]" />
                            </div>
                            <span className="text-[13px] font-extrabold text-[#1e3a5f] tabular-nums w-8 text-right">{metric.value}</span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <svg className="w-4 h-4 text-gray-200 group-hover:text-[#1e3a5f] transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default TopList;
