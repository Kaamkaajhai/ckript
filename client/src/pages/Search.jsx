import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

const Search = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "all");
  const [results, setResults] = useState({ users: [], scripts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // Sync from URL params when navigating from navbar
  useEffect(() => {
    const urlQ = searchParams.get("q") || "";
    const urlType = searchParams.get("type") || "all";
    if (urlQ && urlQ !== query) setQuery(urlQ);
    if (urlType !== activeTab) setActiveTab(urlType);
  }, [searchParams]);

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
      } else {
        setResults({ users: [], scripts: [] });
        setSearched(false);
      }
    }, 400);
    return () => clearTimeout(debounce);
  }, [query, activeTab]);

  const doSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(query.trim())}&type=${activeTab}`);
      setResults(data);
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

      {/* ── Hero search area ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="relative mb-10"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2439] via-[#1e3a5f] to-[#2d5a8e] px-6 sm:px-10 pt-10 pb-14">
          {/* Ambient shapes */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/[0.025] rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/[0.02] rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/4 right-[15%] w-1.5 h-1.5 bg-white/15 rounded-full" />
          <div className="absolute bottom-1/3 left-[20%] w-1 h-1 bg-white/10 rounded-full" />

          <div className="relative text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Discover&nbsp;Talent&nbsp;&&nbsp;Projects
            </h1>
            <p className="text-[14px] text-white/50 font-medium max-w-md mx-auto leading-relaxed">
              Search across writers, investors, readers, and&nbsp;projects
            </p>
          </div>

          {/* Search bar — floating at bottom edge */}
          <div className="relative max-w-2xl mx-auto">
            <div className={`relative bg-white rounded-2xl shadow-2xl shadow-black/20 transition-all duration-300 ${focused ? "ring-2 ring-white/50" : ""}`}>
              <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
                className="w-full h-14 pl-14 pr-12 bg-transparent rounded-2xl text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
              {query ? (
                <button
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-300 border border-gray-200 rounded-lg px-2 py-1 select-none pointer-events-none hidden sm:block">
                  &#8984; K
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Filter tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease }}
        className="mb-8 flex items-center justify-center"
      >
        <div className="inline-flex items-center bg-gray-50/80 rounded-full p-1 gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-5 py-2 rounded-full text-[13px] font-semibold transition-all duration-250 whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-white text-[#1e3a5f] shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
          <p className="text-[15px] font-semibold text-gray-600 mb-1">No results for "{query}"</p>
          <p className="text-[13px] text-gray-400">Try different keywords or switch category</p>
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
