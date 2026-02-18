import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";

const TopList = () => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("platform");

  useEffect(() => {
    fetchScripts();
  }, [sortBy]);

  const fetchScripts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/scripts?sort=${sortBy}`);
      setScripts(data);
    } catch {
      setScripts([]);
    }
    setLoading(false);
  };

  const sortTabs = [
    { key: "platform", label: "Platform", desc: "Combined platform insights" },
    { key: "score", label: "AI Score", desc: "AI analysis quality" },
    { key: "engagement", label: "Readers", desc: "Reader & provider engagement" },
    { key: "views", label: "Views", desc: "Total audience reach" },
  ];

  const getMetric = (script) => {
    if (sortBy === "platform") {
      const v = Math.round(script.platformScore || 0);
      return { value: v, label: "Platform", pct: Math.min(v, 100), color: v >= 70 ? "#7c3aed" : v >= 40 ? "#3b82f6" : "#9ca3af" };
    }
    if (sortBy === "score") {
      const v = script.scriptScore?.overall || 0;
      return { value: v, label: "AI Score", pct: Math.min(v, 100), color: v >= 80 ? "#059669" : v >= 60 ? "#d97706" : "#9ca3af" };
    }
    if (sortBy === "engagement") {
      const v = Math.round(script.engagementScore || 0);
      return { value: v, label: "Engage", pct: Math.min(v, 100), color: v >= 60 ? "#0891b2" : v >= 30 ? "#3b82f6" : "#9ca3af" };
    }
    const v = script.views || 0;
    return { value: v.toLocaleString(), label: "Views", pct: Math.min((v / 1000) * 100, 100), color: "#6366f1" };
  };

  // Summary stats
  const totalScripts = scripts.length;
  const avgMetric = totalScripts > 0 ? Math.round(
    scripts.reduce((sum, s) => {
      if (sortBy === "platform") return sum + (s.platformScore || 0);
      if (sortBy === "score") return sum + (s.scriptScore?.overall || 0);
      if (sortBy === "engagement") return sum + (s.engagementScore || 0);
      return sum + (s.views || 0);
    }, 0) / totalScripts
  ) : 0;
  const topScore = totalScripts > 0 ? Math.round(
    Math.max(...scripts.map(s => {
      if (sortBy === "platform") return s.platformScore || 0;
      if (sortBy === "score") return s.scriptScore?.overall || 0;
      if (sortBy === "engagement") return s.engagementScore || 0;
      return s.views || 0;
    }))
  ) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-10 h-10 border-[3px] border-gray-100 border-t-[#1e3a5f] rounded-full animate-spin"></div>
        <p className="text-[13px] text-gray-400 font-medium">Loading rankings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2439] via-[#1e3a5f] to-[#2d5a8e] p-6 sm:p-8">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.03] rounded-full -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.02] rounded-full translate-y-1/3 -translate-x-1/4"></div>
          <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-amber-400/40 rounded-full"></div>
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-blue-300/30 rounded-full"></div>

          <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Top List</h1>
                  <p className="text-[13px] text-blue-200/70 font-medium mt-0.5">
                    {sortTabs.find(t => t.key === sortBy)?.desc}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary pills */}
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                <p className="text-[18px] font-extrabold text-white tabular-nums">{totalScripts}</p>
                <p className="text-[10px] text-blue-200/60 uppercase tracking-wider font-bold">Scripts</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                <p className="text-[18px] font-extrabold text-amber-300 tabular-nums">{topScore.toLocaleString()}</p>
                <p className="text-[10px] text-blue-200/60 uppercase tracking-wider font-bold">Top</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                <p className="text-[18px] font-extrabold text-blue-200 tabular-nums">{avgMetric.toLocaleString()}</p>
                <p className="text-[10px] text-blue-200/60 uppercase tracking-wider font-bold">Average</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {sortTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSortBy(tab.key)}
              className={`relative px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-250 whitespace-nowrap ${
                sortBy === tab.key
                  ? "bg-[#1e3a5f] text-white shadow-lg shadow-[#1e3a5f]/20"
                  : "bg-white text-gray-500 border border-gray-200/80 hover:border-gray-300 hover:text-gray-700 hover:shadow-sm"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {scripts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm py-24 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-[16px] font-bold text-gray-800 mb-1">No projects found</p>
          <p className="text-[13px] text-gray-400">Check back later for top-ranked projects</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {scripts.map((script, index) => {
            const metric = getMetric(script);

            return (
              <motion.div
                key={script._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <Link
                  to={`/script/${script._id}`}
                  className="block bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 group hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 hover:border-gray-200"
                >
                  {/* Cover */}
                  <div className="relative h-40 overflow-hidden">
                    {script.coverImage ? (
                      <img
                        src={script.coverImage}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
                          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

                    {/* Tags overlay */}
                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                      {(script.genre || script.contentType) && (
                        <span className="text-[10px] font-bold text-white bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                          {script.genre || script.contentType}
                        </span>
                      )}
                      {script.premium && (
                        <span className="text-[11px] font-bold text-white bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-sm">
                          ${script.price}
                        </span>
                      )}
                    </div>

                    {/* Creator avatar at bottom */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 overflow-hidden">
                        {script.creator?.profileImage ? (
                          <img
                            src={script.creator.profileImage.startsWith("http") ? script.creator.profileImage : `http://localhost:5001${script.creator.profileImage}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-white">{script.creator?.name?.charAt(0)?.toUpperCase() || "?"}</span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-white/90 drop-shadow-sm">{script.creator?.name || "Unknown"}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 pb-5">
                    <h3 className="text-[15px] font-bold text-gray-900 leading-snug mb-3 line-clamp-2 group-hover:text-[#1e3a5f] transition-colors">
                      {script.title}
                    </h3>

                    {/* Score bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{metric.label}</span>
                        <span className="text-[14px] font-extrabold tabular-nums" style={{ color: metric.color }}>{metric.value}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.pct}%` }}
                          transition={{ duration: 0.8, delay: index * 0.04 + 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: metric.color }}
                        />
                      </div>
                    </div>

                    {/* Bottom stats */}
                    <div className="flex items-center gap-4 text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[12px] font-semibold text-gray-500 tabular-nums">{(script.views || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <span className="text-[12px] font-semibold text-gray-500 tabular-nums">{(script.unlockedBy?.length || script.unlockCount || 0)}</span>
                      </div>
                      {script.scriptScore?.overall > 0 && sortBy !== "score" && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-[12px] font-bold text-gray-600 tabular-nums">{script.scriptScore.overall}</span>
                        </div>
                      )}
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
