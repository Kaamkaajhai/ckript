import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
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

const SORT_OPTIONS = [
  { key: "", label: "Relevance", icon: "🔍" },
  { key: "engagement", label: "Trending", icon: "🔥" },
  { key: "views", label: "Most Viewed", icon: "👁" },
  { key: "score", label: "Top Rated", icon: "⭐" },
  { key: "price_high", label: "Highest Paid", icon: "💰" },
  { key: "price_low", label: "Price: Low→High", icon: "📈" },
];

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

const budgetLabel = { micro: "Micro", low: "Low", medium: "Medium", high: "High", blockbuster: "Blockbuster" };

/* ── Main Component ─────────────────────────────────── */
const Search = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "all");
  const [results, setResults] = useState({ users: [], scripts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  /* Filter state (project filters) */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("");
  const [selectedPremium, setSelectedPremium] = useState("all");
  const [selectedSort, setSelectedSort] = useState("");

  // Sync from URL params when navigating from navbar
  useEffect(() => {
    const urlQ = searchParams.get("q") || "";
    const urlType = searchParams.get("type") || "all";
    if (urlQ && urlQ !== query) setQuery(urlQ);
    if (urlType !== activeTab) setActiveTab(urlType);
  }, [searchParams]);

  const showProjectFilters = activeTab === "all" || activeTab === "projects";

  const activeFilterCount = [
    selectedGenre,
    selectedContentType,
    selectedBudget,
    selectedPremium !== "all" ? selectedPremium : "",
    selectedSort,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedGenre("");
    setSelectedContentType("");
    setSelectedBudget("");
    setSelectedPremium("all");
    setSelectedSort("");
  };

  const tabs = [
    { key: "all", label: "All" },
    { key: "projects", label: "Projects" },
    { key: "writers", label: "Writers" },
    { key: "investors", label: "Investors" },
    { key: "readers", label: "Readers" },
  ];

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.trim()) {
        doSearch();
      } else if (showProjectFilters && activeFilterCount > 0) {
        // Allow filter-only browsing (no search query)
        doSearch();
      } else {
        setResults({ users: [], scripts: [] });
        setSearched(false);
      }
    }, 400);
    return () => clearTimeout(debounce);
  }, [query, activeTab, selectedGenre, selectedContentType, selectedBudget, selectedPremium, selectedSort]);

  const doSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("q", query.trim());
      params.append("type", activeTab);

      // Add project filters
      if (showProjectFilters) {
        if (selectedGenre) params.append("genre", selectedGenre);
        if (selectedContentType) params.append("contentType", selectedContentType);
        if (selectedBudget) params.append("budget", selectedBudget);
        if (selectedPremium === "premium") params.append("premium", "true");
        else if (selectedPremium === "free") params.append("premium", "false");
      }

      const { data } = await api.get(`/search?${params.toString()}`);

      // Client-side sort for search results
      let scripts = data.scripts || [];
      if (selectedSort && showProjectFilters) {
        scripts = [...scripts].sort((a, b) => {
          switch (selectedSort) {
            case "views": return (b.views || 0) - (a.views || 0);
            case "score": return (b.scriptScore?.overall || 0) - (a.scriptScore?.overall || 0);
            case "price_high": return (b.price || 0) - (a.price || 0);
            case "price_low": return (a.price || 0) - (b.price || 0);
            case "engagement": return (b.unlockCount || 0) - (a.unlockCount || 0);
            default: return 0;
          }
        });
      }

      setResults({ ...data, scripts });
    } catch {
      setResults({ users: [], scripts: [] });
    }
    setLoading(false);
  };

  const totalResults = (results.users?.length || 0) + (results.scripts?.length || 0);

  const roleColors = {
    writer: "#1e3a5f", creator: "#1e3a5f", investor: "#1e3a5f",
    reader: "#1e3a5f", producer: "#1e3a5f", director: "#1e3a5f",
    actor: "#1e3a5f", industry: "#1e3a5f", professional: "#1e3a5f",
  };

  const getProfileImage = (user) => {
    if (!user.profileImage) return null;
    return user.profileImage.startsWith("http") ? user.profileImage : `http://localhost:5001${user.profileImage}`;
  };

  const getCoverImage = (script) => {
    if (!script.coverImage) return null;
    return script.coverImage.startsWith("http") ? script.coverImage : `http://localhost:5001${script.coverImage}`;
  };

  const ease = [0.25, 0.46, 0.45, 0.94];

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header + Search ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="mb-6"
      >
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#1e3a5f] to-[#3a7bd5]" />
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Search</h1>
            </div>
            <p className="text-[13px] text-gray-400 font-medium ml-[18px]">
              Discover talent & projects across the platform
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className={`relative bg-white rounded-xl border transition-all duration-300 ${focused ? "border-[#1e3a5f]/30 shadow-lg shadow-[#1e3a5f]/5" : "border-gray-200 shadow-sm"}`}>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-[18px] h-[18px] text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search by name, genre, title, skills..."
            className="w-full h-12 pl-12 pr-12 bg-transparent rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-300 border border-gray-200 rounded-md px-1.5 py-0.5 select-none pointer-events-none hidden sm:block">
              ⌘K
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Category tabs + Filter toggle ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease }}
        className="mb-6"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-3">
            {/* Category tabs */}
            <div className="inline-flex items-center bg-gray-50/80 rounded-full p-1 gap-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-250 whitespace-nowrap ${activeTab === tab.key
                    ? "bg-white text-[#1e3a5f] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter toggle — only when projects are visible */}
            {showProjectFilters && (
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
            )}
          </div>

          {/* Active filter tags */}
          {showProjectFilters && activeFilterCount > 0 && (
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
              {selectedSort && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-[11px] font-bold">
                  {SORT_OPTIONS.find(s => s.key === selectedSort)?.label}
                  <button onClick={() => setSelectedSort("")} className="hover:bg-[#1e3a5f]/10 rounded p-0.5 transition-colors"><XIcon /></button>
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
          {showProjectFilters && filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 mb-4">
                {/* Sort By */}
                <FilterSection label="Sort By">
                  {SORT_OPTIONS.map((opt) => (
                    <Pill key={opt.key} active={selectedSort === opt.key} onClick={() => setSelectedSort(selectedSort === opt.key ? "" : opt.key)}>
                      <span className="flex items-center gap-1.5">{opt.icon} {opt.label}</span>
                    </Pill>
                  ))}
                </FilterSection>

                <div className="border-t border-gray-100" />

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

      {/* ── States ── */}

      {/* Loading */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-28 gap-3"
          >
            <div className="w-8 h-8 border-[2.5px] border-gray-100 border-t-[#1e3a5f] rounded-full animate-spin" />
            <p className="text-[13px] text-gray-400 font-medium">Searching...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty — no query */}
      {!loading && !searched && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease }}
          className="text-center py-16"
        >
          <p className="text-[13px] text-gray-300 font-medium mb-6">Popular genres</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-lg mx-auto">
            {["Thriller", "Drama", "Comedy", "Sci-Fi", "Horror", "Romance", "Action", "Mystery"].map((g) => (
              <button
                key={g}
                onClick={() => setQuery(g)}
                className="px-4 py-2 text-[13px] font-medium text-gray-500 bg-white border border-gray-150 rounded-xl hover:border-[#1e3a5f]/30 hover:text-[#1e3a5f] hover:shadow-sm transition-all duration-200"
              >
                {g}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* No results */}
      {!loading && searched && totalResults === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24"
        >
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-gray-600 mb-1">No results{query ? ` for "${query}"` : ""}</p>
          <p className="text-[13px] text-gray-400 mb-4">Try different keywords or adjust your filters</p>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#162d4a] transition-colors shadow-sm">
              Clear all filters
            </button>
          )}
        </motion.div>
      )}

      {/* ── Results ── */}
      {!loading && searched && totalResults > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Result count */}
          <p className="text-[12px] font-medium text-gray-400 mb-6">
            {totalResults} result{totalResults !== 1 ? "s" : ""}
          </p>

          {/* ── People ── */}
          {results.users?.length > 0 && (
            <section className="mb-10">
              {activeTab === "all" && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-[#1e3a5f]" />
                  <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">People</h2>
                  <span className="text-[11px] font-medium text-gray-400 ml-1">{results.users.length}</span>
                </div>
              )}

              <div className="space-y-2">
                {results.users.map((user, i) => {
                  const img = getProfileImage(user);
                  const color = roleColors[user.role] || "#6b7280";

                  return (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3, ease }}
                    >
                      <Link
                        to={`/profile/${user._id}`}
                        className="flex items-center gap-4 bg-white rounded-xl border border-gray-100/80 px-4 py-3.5 hover:bg-gray-50/50 hover:border-gray-200 transition-all duration-200 group"
                      >
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {img ? (
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[14px] font-bold" style={{ color }}>
                              {user.name?.charAt(0)?.toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-[14px] font-semibold text-gray-900 truncate group-hover:text-[#1e3a5f] transition-colors">
                              {user.name}
                            </h3>
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide px-2 py-[2px] rounded-full"
                              style={{ color, backgroundColor: color + "10" }}
                            >
                              {user.role}
                            </span>
                            {user.writerProfile?.wgaMember && (
                              <span className="text-[9px] font-bold text-[#1e3a5f] bg-[#1e3a5f]/8 px-1.5 py-0.5 rounded-full tracking-wide">WGA</span>
                            )}
                          </div>
                          {user.bio && (
                            <p className="text-[12px] text-gray-400 line-clamp-1 mt-0.5">{user.bio}</p>
                          )}
                        </div>

                        {/* Right side — meta */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {user.writerProfile?.genres?.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1">
                              {user.writerProfile.genres.slice(0, 2).map((g) => (
                                <span key={g} className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{g}</span>
                              ))}
                            </div>
                          )}
                          <span className="text-[11px] text-gray-400 font-medium tabular-nums whitespace-nowrap">
                            {user.followerCount || 0} <span className="hidden sm:inline">follower{(user.followerCount || 0) !== 1 ? "s" : ""}</span>
                          </span>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Projects ── */}
          {results.scripts?.length > 0 && (
            <section>
              {activeTab === "all" && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-[#1e3a5f]" />
                  <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">Projects</h2>
                  <span className="text-[11px] font-medium text-gray-400 ml-1">{results.scripts.length}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.scripts.map((script, i) => {
                  const cover = getCoverImage(script);

                  return (
                    <motion.div
                      key={script._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3, ease }}
                    >
                      <Link
                        to={`/script/${script._id}`}
                        className="block bg-white rounded-2xl border border-gray-100/80 overflow-hidden hover:shadow-xl hover:shadow-gray-200/40 hover:-translate-y-1 transition-all duration-300 group"
                      >
                        {/* Cover */}
                        <div className="relative h-40 overflow-hidden">
                          {cover ? (
                            <img src={cover} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                          {/* Floating tags */}
                          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                            {(script.genre || script.contentType) && (
                              <span className="text-[10px] font-bold text-white/90 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                                {script.genre || script.contentType}
                              </span>
                            )}
                            {script.premium && (
                              <span className="text-[10px] font-bold text-white bg-[#1e3a5f] px-2.5 py-1 rounded-lg shadow-sm">
                                ${script.price}
                              </span>
                            )}
                          </div>

                          {/* Creator at bottom */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 overflow-hidden">
                              {script.creator?.profileImage ? (
                                <img
                                  src={script.creator.profileImage.startsWith("http") ? script.creator.profileImage : `http://localhost:5001${script.creator.profileImage}`}
                                  alt="" className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[9px] font-bold text-white">{script.creator?.name?.charAt(0)?.toUpperCase() || "?"}</span>
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-white/90 drop-shadow-sm">{script.creator?.name || "Unknown"}</span>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                          <h3 className="text-[14px] font-bold text-gray-900 leading-snug line-clamp-1 group-hover:text-[#1e3a5f] transition-colors mb-1.5">
                            {script.title}
                          </h3>
                          {script.description && (
                            <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-2 mb-3">{script.description}</p>
                          )}

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-[11px] font-semibold text-gray-500 tabular-nums">{(script.viewCount || script.views || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                              </svg>
                              <span className="text-[11px] font-semibold text-gray-500 tabular-nums">{script.unlockCount || 0}</span>
                            </div>
                            {script.scriptScore?.overall > 0 && (
                              <div className="flex items-center gap-1 ml-auto">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                                <span className="text-[11px] font-bold text-gray-600 tabular-nums">{script.scriptScore.overall}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default Search;
