import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";

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
  { key: "micro", label: "Micro (<$10k)" },
  { key: "low", label: "Low ($10k–$100k)" },
  { key: "mid", label: "Mid ($100k–$1M)" },
  { key: "high", label: "High ($1M–$10M)" },
  { key: "blockbuster", label: "Blockbuster (>$10M)" },
];

const PREMIUM_OPTIONS = [
  { key: "all", label: "All" },
  { key: "premium", label: "Premium" },
  { key: "free", label: "Free" },
];

const budgetLabel = {
  micro: "Micro",
  low: "Low",
  mid: "Mid",
  high: "High",
  blockbuster: "Blockbuster",
};

/* ── Icon components ─────────────────────────────────── */
const FilterIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
  </svg>
);

const ChevronDown = ({ open }) => (
  <svg
    className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const XIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ── Rank Badge ──────────────────────────────────────── */
const RankBadge = ({ rank, dark }) => {
  const medals = {
    1: { bg: "from-amber-400 to-yellow-300", text: "text-amber-900", shadow: "shadow-amber-400/40" },
    2: { bg: "from-slate-300 to-gray-200",   text: "text-slate-700", shadow: "shadow-slate-300/40" },
    3: { bg: "from-orange-400 to-amber-300", text: "text-orange-900", shadow: "shadow-orange-400/40" },
  };
  const medal = medals[rank];
  if (medal) {
    return (
      <div className={`absolute top-3 left-3 w-8 h-8 rounded-full bg-gradient-to-br ${medal.bg} ${medal.text} flex items-center justify-center text-[12px] font-black shadow-lg ${medal.shadow} z-10`}>
        {rank}
      </div>
    );
  }
  return (
    <div className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold z-10 ${
      dark ? "bg-white/10 text-white/60 border border-white/10" : "bg-black/20 text-white/70"
    }`}>
      {rank}
    </div>
  );
};

/* ── Pill ─────────────────────────────────────────────── */
const Pill = ({ active, onClick, children, dark }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-200 border ${
      active
        ? "bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm"
        : dark
          ? "bg-white/[0.04] text-gray-300 border-[#444] hover:bg-white/[0.08] hover:text-gray-200"
          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 hover:shadow-sm"
    }`}
  >
    {children}
  </button>
);

/* ── FilterSection ───────────────────────────────────── */
const FilterSection = ({ label, children, dark }) => (
  <div className="space-y-2.5">
    <span className={`text-[11px] font-bold uppercase tracking-wider ${dark ? "text-gray-400" : "text-gray-400"}`}>
      {label}
    </span>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

/* ── Loading Skeleton ────────────────────────────────── */
const SkeletonCard = ({ dark }) => (
  <div className={`rounded-2xl overflow-hidden border ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
    <div className={`h-[200px] animate-pulse ${dark ? "bg-[#333]" : "bg-gray-100"}`} />
    <div className="p-4 space-y-3">
      <div className={`h-3 rounded-full animate-pulse ${dark ? "bg-[#444]" : "bg-gray-100"}`} />
      <div className={`h-3 rounded-full w-2/3 animate-pulse ${dark ? "bg-[#333]" : "bg-gray-50"}`} />
    </div>
  </div>
);

/* ── Main Component ──────────────────────────────────── */
const TopList = () => {
  const { isDarkMode: dark } = useDarkMode();

  /* Design tokens — content area: #202020 in dark, #f8f9fb in light */
  const t = {
    card:        dark ? "bg-[#101e30] border-[#333] hover:border-[#444]" : "bg-white border-gray-100 hover:border-gray-200",
    cardShadow:  dark ? "hover:shadow-xl hover:shadow-[#020609]/20" : "hover:shadow-xl",
    header:      dark ? "text-gray-100" : "text-gray-900",
    sub:         dark ? "text-gray-400" : "text-gray-400",
    divider:     dark ? "border-[#333]" : "border-gray-100",
    stat:        dark ? "bg-white/[0.04] border-[#333]" : "bg-[#1e3a5f]/[0.05] border-transparent",
    statLabel:   dark ? "text-gray-400" : "text-gray-400",
    statValue:   dark ? "text-cyan-300" : "text-[#1e3a5f]",
    filterPanel: dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100",
    sortActive:  "bg-[#1e3a5f] text-white shadow-lg shadow-[#1e3a5f]/30",
    sortIdle:    dark ? "bg-white/[0.04] text-gray-300 border-[#444] hover:bg-white/[0.08] hover:text-gray-200" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 hover:shadow-sm",
    filterBtn:   dark ? "bg-white/[0.04] border-[#444] text-gray-300 hover:bg-white/[0.08] hover:text-gray-200" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm",
    filterBtnActive: "bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm",
    tag:         dark ? "bg-blue-500/15 text-blue-300 border-blue-400/25" : "bg-[#1e3a5f]/[0.06] text-[#1e3a5f] border-transparent",
    tagX:        dark ? "hover:bg-blue-500/25" : "hover:bg-[#1e3a5f]/10",
    statPill:    dark ? "text-gray-400" : "text-gray-400",
    emptyCard:   dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100",
    emptyTitle:  dark ? "text-gray-100" : "text-gray-800",
    metricBar:   dark ? "bg-[#333]" : "bg-gray-100",
    iconMuted:   dark ? "text-gray-500" : "text-gray-300",
  };

  /* State */
  const [scripts, setScripts]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [sortBy, setSortBy]             = useState("platform");
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [selectedGenre, setSelectedGenre]             = useState("");
  const [selectedContentType, setSelectedContentType] = useState("");
  const [selectedBudget, setSelectedBudget]           = useState("");
  const [selectedPremium, setSelectedPremium]         = useState("all");

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
      if (selectedGenre)      params.append("genre", selectedGenre);
      if (selectedContentType) params.append("contentType", selectedContentType);
      if (selectedBudget)     params.append("budget", selectedBudget);
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
    { key: "platform",   label: "Platform", desc: "Ranked by overall platform performance" },
    { key: "score",      label: "AI Score", desc: "Ranked by script quality score"         },
    { key: "engagement", label: "Readers",  desc: "Ranked by reader engagement"            },
    { key: "views",      label: "Views",    desc: "Ranked by total views"                  },
  ];

  const getMetric = (script) => {
    if (sortBy === "platform")   { const v = Math.round(script.platformScore || 0);   return { value: v, pct: Math.min(v, 100) }; }
    if (sortBy === "score")      { const v = script.scriptScore?.overall || 0;         return { value: v, pct: Math.min(v, 100) }; }
    if (sortBy === "engagement") { const v = Math.round(script.engagementScore || 0); return { value: v, pct: Math.min(v, 100) }; }
    const v = script.views || 0; return { value: v.toLocaleString(), pct: Math.min((v / 1000) * 100, 100) };
  };

  const resolveImg = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5001${url}`;
  };

  const numericMetrics = scripts.map((s) => {
    const v = getMetric(s).value;
    return typeof v === "string" ? Number(v.replaceAll(",", "")) || 0 : Number(v) || 0;
  });
  const topScore  = numericMetrics.length ? Math.max(...numericMetrics) : 0;
  const avgMetric = numericMetrics.length
    ? Math.round(numericMetrics.reduce((a, b) => a + b, 0) / numericMetrics.length)
    : 0;

  /* ── Loading state ── */
  if (loading) return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className={`h-8 w-40 rounded-xl animate-pulse mb-2 ${dark ? "bg-slate-200" : "bg-gray-100"}`} />
        <div className={`h-4 w-64 rounded-lg animate-pulse ${dark ? "bg-[#6a6a6a]" : "bg-gray-50"}`} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} dark={dark} />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#1e3a5f] to-[#3a7bd5]" />
              <h1 className={`text-2xl font-extrabold tracking-tight ${t.header}`}>Top List</h1>
            </div>
            <p className={`text-[13px] font-medium ml-[18px] ${t.sub}`}>
              {sortTabs.find(tab => tab.key === sortBy)?.desc}
            </p>
          </div>

          {/* Summary stat badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${t.stat}`}>
              <span className={`text-[11px] font-semibold ${t.statLabel}`}>Scripts</span>
              <span className={`text-[14px] font-extrabold tabular-nums ${t.statValue}`}>{scripts.length}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${t.stat}`}>
              <span className={`text-[11px] font-semibold ${t.statLabel}`}>Top</span>
              <span className={`text-[14px] font-extrabold tabular-nums ${t.statValue}`}>{topScore.toLocaleString()}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
              dark ? "bg-[#4e4e4e] border-[#5a5a5a]" : "bg-gray-50 border-transparent"
            }`}>
              <span className={`text-[11px] font-semibold ${t.statLabel}`}>Avg</span>
              <span className={`text-[14px] font-extrabold tabular-nums ${dark ? "text-gray-200" : "text-gray-500"}`}>{avgMetric.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════ SORT TABS + FILTER TOGGLE ═══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="mb-5"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {sortTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSortBy(tab.key)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 whitespace-nowrap border ${
                    sortBy === tab.key ? t.sortActive : t.sortIdle
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 border ${
                filtersOpen || activeFilterCount > 0 ? t.filterBtnActive : t.filterBtn
              }`}
            >
              <FilterIcon />
              Filters
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 bg-white/20 rounded-md text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown open={filtersOpen} />
            </button>
          </div>

          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              {selectedGenre && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${t.tag}`}>
                  {selectedGenre}
                  <button onClick={() => setSelectedGenre("")} className={`rounded p-0.5 transition-colors ${t.tagX}`}><XIcon /></button>
                </span>
              )}
              {selectedContentType && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${t.tag}`}>
                  {CONTENT_TYPES.find(c => c.key === selectedContentType)?.label || selectedContentType}
                  <button onClick={() => setSelectedContentType("")} className={`rounded p-0.5 transition-colors ${t.tagX}`}><XIcon /></button>
                </span>
              )}
              {selectedBudget && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${t.tag}`}>
                  {budgetLabel[selectedBudget]} Budget
                  <button onClick={() => setSelectedBudget("")} className={`rounded p-0.5 transition-colors ${t.tagX}`}><XIcon /></button>
                </span>
              )}
              {selectedPremium !== "all" && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${t.tag}`}>
                  {selectedPremium === "premium" ? "Premium" : "Free"}
                  <button onClick={() => setSelectedPremium("all")} className={`rounded p-0.5 transition-colors ${t.tagX}`}><XIcon /></button>
                </span>
              )}
              <button onClick={clearAllFilters} className={`text-[11px] font-semibold px-2 py-1 transition-colors ${dark ? "text-gray-300 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}>
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
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm space-y-5 mb-4 ${t.filterPanel}`}>
                <FilterSection label="Genre" dark={dark}>
                  <Pill active={!selectedGenre} onClick={() => setSelectedGenre("")} dark={dark}>All Genres</Pill>
                  {GENRES.map((g) => (
                    <Pill key={g} active={selectedGenre === g} onClick={() => setSelectedGenre(selectedGenre === g ? "" : g)} dark={dark}>{g}</Pill>
                  ))}
                </FilterSection>

                <div className={`border-t ${t.divider}`} />

                <FilterSection label="Content Type" dark={dark}>
                  <Pill active={!selectedContentType} onClick={() => setSelectedContentType("")} dark={dark}>All Types</Pill>
                  {CONTENT_TYPES.map((ct) => (
                    <Pill key={ct.key} active={selectedContentType === ct.key} onClick={() => setSelectedContentType(selectedContentType === ct.key ? "" : ct.key)} dark={dark}>{ct.label}</Pill>
                  ))}
                </FilterSection>

                <div className={`border-t ${t.divider}`} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FilterSection label="Budget Range" dark={dark}>
                    <Pill active={!selectedBudget} onClick={() => setSelectedBudget("")} dark={dark}>Any</Pill>
                    {BUDGETS.map((b) => (
                      <Pill key={b.key} active={selectedBudget === b.key} onClick={() => setSelectedBudget(selectedBudget === b.key ? "" : b.key)} dark={dark}>{b.label}</Pill>
                    ))}
                  </FilterSection>
                  <FilterSection label="Pricing" dark={dark}>
                    {PREMIUM_OPTIONS.map((p) => (
                      <Pill key={p.key} active={selectedPremium === p.key} onClick={() => setSelectedPremium(p.key)} dark={dark}>{p.label}</Pill>
                    ))}
                  </FilterSection>
                </div>

                {activeFilterCount > 0 && (
                  <div className="flex sm:hidden justify-end pt-1">
                    <button onClick={clearAllFilters} className="text-[12px] font-semibold text-red-500 hover:text-red-600 transition-colors px-3 py-1.5 border border-red-400/30 rounded-xl bg-red-500/10">
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══════════════════ CONTENT ═══════════════════ */}
      {scripts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`rounded-2xl border py-24 text-center ${t.emptyCard}`}
        >
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${dark ? "bg-[#4e4e4e]" : "bg-gray-50"}`}>
            <svg className={`w-7 h-7 ${t.iconMuted}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className={`text-[16px] font-bold mb-1 ${t.emptyTitle}`}>No projects found</p>
          <p className={`text-[13px] mb-5 ${t.sub}`}>Try adjusting your filters or check back later</p>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#162d4a] transition-colors shadow-sm">
              Clear all filters
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {scripts.map((script, index) => {
            const metric   = getMetric(script);
            const hasCover = !!script.coverImage;
            const rank     = index + 1;
            return (
              <motion.div
                key={script._id || index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Link
                  to={`/script/${script._id}`}
                  className={`group block rounded-2xl overflow-hidden transition-all duration-300 border ${t.card} ${t.cardShadow} hover:-translate-y-1`}
                >
                  {/* ── Cover ── */}
                  <div className="relative h-[200px] bg-gradient-to-br from-[#091a2f] via-[#0f2d52] to-[#1a4a7a] overflow-hidden">
                    {hasCover ? (
                      <>
                        <img
                          src={resolveImg(script.coverImage)}
                          alt={script.title}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#091a2f]/80 via-[#091a2f]/20 to-transparent" />
                      </>
                    ) : (
                      <>
                        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full border border-white/[0.04]" />
                        <div className="absolute top-16 -right-4 w-20 h-20 rounded-full border border-white/[0.03]" />
                        <div className="absolute bottom-12 -left-4 w-24 h-24 rounded-full border border-white/[0.03]" />
                        <div className="absolute top-6 right-6 flex flex-col gap-1.5 items-end">
                          <div className="w-10 h-[2px] rounded-full bg-white/10" />
                          <div className="w-6 h-[2px] rounded-full bg-white/[0.06]" />
                          <div className="w-8 h-[2px] rounded-full bg-white/[0.04]" />
                        </div>
                        <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-6">
                          <h4 className="text-lg font-extrabold text-white leading-tight line-clamp-2 tracking-tight mb-2">
                            {script.title}
                          </h4>
                          <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed font-medium">
                            {script.logline || script.description || script.synopsis || "No description available"}
                          </p>
                        </div>
                      </>
                    )}

                    {/* Rank badge */}
                    <RankBadge rank={rank} dark={dark} />

                    {(script.primaryGenre || script.genre) && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold text-white/90 bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                        {script.primaryGenre || script.genre}
                      </span>
                    )}

                    {script.premium ? (
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-amber-500/90 backdrop-blur-sm rounded-lg shadow-lg">
                        <span className="text-[11px] font-extrabold text-white">${script.price}</span>
                      </div>
                    ) : (
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-emerald-500/80 backdrop-blur-sm rounded-lg">
                        <span className="text-[10px] font-bold text-white">Free</span>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/20 overflow-hidden">
                        {script.creator?.profileImage ? (
                          <img src={resolveImg(script.creator.profileImage)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-bold text-white">{script.creator?.name?.charAt(0)?.toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-white/80 drop-shadow">{script.creator?.name || "Unknown"}</span>
                    </div>
                  </div>

                  {/* ── Info Section ── */}
                  <div className="p-4">
                    {/* Metric bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${t.sub}`}>
                          {sortTabs.find(tab => tab.key === sortBy)?.label}
                        </span>
                        <span className={`text-[13px] font-extrabold tabular-nums ${dark ? "text-white" : "text-gray-800"}`}>
                          {metric.value}
                        </span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${t.metricBar}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.pct}%` }}
                          transition={{ duration: 0.6, delay: index * 0.04 + 0.2, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-[#1e3a5f] to-[#3a7bd5]"
                        />
                      </div>
                    </div>

                    <div className={`border-t ${t.divider} mb-3`} />

                    {/* Stats row */}
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-1 ${t.statPill}`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[11px] font-semibold tabular-nums">{(script.views || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {script.scriptScore?.overall > 0 && (
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                            </svg>
                            <span className={`text-[11px] font-semibold tabular-nums ${t.statPill}`}>{script.scriptScore.overall}</span>
                          </div>
                        )}
                        {script.pageCount && (
                          <div className={`flex items-center gap-1 ${t.statPill}`}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <span className="text-[11px] font-semibold tabular-nums">{script.pageCount}p</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TopList;
