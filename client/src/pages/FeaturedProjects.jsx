import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";

const sortTabs = [
  { key: "trending", label: "Trending", icon: "flame", sort: "engagement" },
  { key: "highest_paid", label: "Highest Paid", icon: "dollar", sort: "price_high" },
];

const budgetLabel = {
  micro: "Micro", low: "Low", medium: "Medium", high: "High", blockbuster: "Blockbuster",
};

const FeaturedProjects = () => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSort, setActiveSort] = useState("trending");

  useEffect(() => {
    fetchFeatured();
  }, [activeSort]);

  const fetchFeatured = async () => {
    setLoading(true);
    try {
      const sortParam = sortTabs.find((t) => t.key === activeSort)?.sort || "engagement";
      const { data } = await api.get(`/scripts?sort=${sortParam}`);
      setScripts(data.slice(0, 18));
    } catch {
      setScripts([]);
    }
    setLoading(false);
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `http://localhost:5001${url}`;
  };

  const rankBadge = (index) => {
    if (index === 0) return { bg: "bg-[#1e3a5f]", text: "text-white", label: "#1" };
    if (index === 1) return { bg: "bg-gray-300", text: "text-gray-800", label: "#2" };
    if (index === 2) return { bg: "bg-gray-400", text: "text-white", label: "#3" };
    return null;
  };

  const ease = [0.25, 0.46, 0.45, 0.94];

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Hero header ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="relative mb-8"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2439] via-[#1e3a5f] to-[#2d5a8e] px-6 sm:px-10 pt-10 pb-12">
          {/* Ambient shapes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/[0.02] rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/[0.015] rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/4 right-[12%] w-1.5 h-1.5 bg-white/20 rounded-full" />
          <div className="absolute bottom-1/3 left-[18%] w-1 h-1 bg-white/15 rounded-full" />

          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.08] rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse"></span>
              <span className="text-[11px] text-white/60 font-semibold tracking-widest uppercase">Featured Collection</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Featured Projects
            </h1>
            <p className="text-sm text-white/50 font-medium max-w-lg mx-auto leading-relaxed">
              Discover the most talked-about scripts and highest-value projects on the platform
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Sort toggle ── */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {sortTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSort(tab.key)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeSort === tab.key
                  ? "bg-white text-[#1e3a5f] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon === "flame" && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                </svg>
              )}
              {tab.icon === "dollar" && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-400 font-medium">
          {scripts.length} project{scripts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-28">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[2.5px] border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin"></div>
            <p className="text-sm text-gray-400 font-medium">Loading projects…</p>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && scripts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 bg-white border border-gray-100 rounded-2xl"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-700 mb-1">No projects found</p>
          <p className="text-sm text-gray-400">Check back later for featured projects</p>
        </motion.div>
      )}

      {/* ── Hero card (top #1) ── */}
      {!loading && scripts.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSort}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
          >
            {/* #1 Spotlight card */}
            <Link
              to={`/script/${scripts[0]._id}`}
              className="group block mb-6"
            >
              <div className="relative bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-all duration-300 shadow-sm hover:shadow-md">
                <div className="flex flex-col sm:flex-row">
                  {/* Cover */}
                  <div className="relative sm:w-80 h-52 sm:h-auto bg-gradient-to-br from-[#0f2439] to-[#1e3a5f] shrink-0 overflow-hidden">
                    {scripts[0].coverImage ? (
                      <img
                        src={getImageUrl(scripts[0].coverImage)}
                        alt={scripts[0].title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center min-h-[200px]">
                        <svg className="w-16 h-16 text-white/10" fill="none" stroke="currentColor" strokeWidth={0.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    )}
                    {/* Rank badge */}
                    <div className="absolute top-3 left-3 w-9 h-9 bg-[#1e3a5f] rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-sm font-extrabold text-white">#1</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {scripts[0].genre && (
                          <span className="px-2.5 py-1 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-xs font-bold uppercase tracking-wide">
                            {scripts[0].genre}
                          </span>
                        )}
                        {scripts[0].contentType && (
                          <span className="px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg text-xs font-semibold capitalize">
                            {scripts[0].contentType.replace(/_/g, " ")}
                          </span>
                        )}
                        {scripts[0].premium && (
                          <span className="px-2.5 py-1 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-xs font-bold">
                            Premium
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 group-hover:text-[#1e3a5f] transition-colors">
                        {scripts[0].title}
                      </h2>
                      <p className="text-base text-gray-500 leading-relaxed line-clamp-2 mb-4">
                        {scripts[0].description || scripts[0].synopsis || "No description available"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        {scripts[0].creator?.profileImage ? (
                          <img src={getImageUrl(scripts[0].creator.profileImage)} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#1e3a5f]/[0.08] flex items-center justify-center text-xs font-bold text-[#1e3a5f]">
                            {scripts[0].creator?.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                        )}
                        <span className="text-sm font-semibold text-gray-700">{scripts[0].creator?.name || "Unknown"}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="text-sm font-medium">{scripts[0].views || 0}</span>
                        </div>
                        {scripts[0].price > 0 && (
                          <span className="text-lg font-extrabold text-[#1e3a5f]">${scripts[0].price}</span>
                        )}
                        {scripts[0].scriptScore?.overall && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e3a5f]/[0.06] rounded-lg">
                            <svg className="w-3.5 h-3.5 text-[#1e3a5f]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-bold text-[#1e3a5f]">{scripts[0].scriptScore.overall}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* ── Grid cards (#2+) ── */}
            {scripts.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scripts.slice(1).map((script, idx) => {
                  const rank = rankBadge(idx + 1);
                  return (
                    <motion.div
                      key={script._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.4), duration: 0.3, ease }}
                    >
                      <Link
                        to={`/script/${script._id}`}
                        className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 hover:shadow-md transition-all duration-300"
                      >
                        {/* Cover */}
                        <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                          {script.coverImage ? (
                            <img
                              src={getImageUrl(script.coverImage)}
                              alt={script.title}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0f2439]/[0.03] to-[#1e3a5f]/[0.06]">
                              <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </div>
                          )}

                          {/* Top row badges */}
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
                            {rank ? (
                              <div className={`w-7 h-7 ${rank.bg} rounded-lg flex items-center justify-center shadow`}>
                                <span className={`text-[10px] font-extrabold ${rank.text}`}>{rank.label}</span>
                              </div>
                            ) : (
                              <div className="w-7 h-7 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                <span className="text-[10px] font-bold text-gray-500">#{idx + 2}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              {script.premium && (
                                <span className="px-2 py-0.5 bg-[#1e3a5f]/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-md shadow-sm">
                                  Premium
                                </span>
                              )}
                              {script.scriptScore?.overall && (
                                <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-bold rounded-md shadow-sm">
                                  ★ {script.scriptScore.overall}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            {script.genre && (
                              <span className="px-2 py-0.5 bg-[#1e3a5f]/[0.05] text-[#1e3a5f] rounded text-[10px] font-bold uppercase tracking-wider">
                                {script.genre}
                              </span>
                            )}
                            {script.budget && (
                              <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded text-[10px] font-semibold uppercase tracking-wider">
                                {budgetLabel[script.budget] || script.budget}
                              </span>
                            )}
                          </div>

                          <h3 className="text-[15px] font-bold text-gray-900 truncate group-hover:text-[#1e3a5f] transition-colors">
                            {script.title}
                          </h3>
                          <p className="text-[13px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                            {script.description || script.synopsis || "No description"}
                          </p>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-gray-50">
                            <div className="flex items-center gap-2 min-w-0">
                              {script.creator?.profileImage ? (
                                <img src={getImageUrl(script.creator.profileImage)} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-100 shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-[#1e3a5f]/[0.06] flex items-center justify-center text-[10px] font-bold text-[#1e3a5f] shrink-0">
                                  {script.creator?.name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                              )}
                              <span className="text-[13px] text-gray-500 font-medium truncate">{script.creator?.name || "Unknown"}</span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="flex items-center gap-1 text-gray-300">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-xs font-medium">{script.views || 0}</span>
                              </span>
                              {script.price > 0 && (
                                <span className="text-sm font-extrabold text-[#1e3a5f]">${script.price}</span>
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
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default FeaturedProjects;
