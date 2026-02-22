import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";

const TopList = () => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("platform");

  useEffect(() => { fetchScripts(); }, [sortBy]);

  const fetchScripts = async () => {
    setLoading(true);
    try { const { data } = await api.get(`/scripts?sort=${sortBy}`); setScripts(data); }
    catch { setScripts([]); }
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

  const top3 = scripts.slice(0, 3);
  const rest = scripts.slice(3);

  // Rank badge styles
  const rankStyle = (i) => {
    if (i === 0) return { bg: "bg-gradient-to-br from-amber-400 to-amber-500", text: "text-white", ring: "ring-amber-200", shadow: "shadow-amber-200/40" };
    if (i === 1) return { bg: "bg-gradient-to-br from-gray-300 to-gray-400", text: "text-white", ring: "ring-gray-200", shadow: "shadow-gray-200/40" };
    return { bg: "bg-gradient-to-br from-orange-300 to-orange-400", text: "text-white", ring: "ring-orange-200", shadow: "shadow-orange-200/40" };
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#1e3a5f] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Top List</h1>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md tabular-nums">{totalScripts}</span>
          </div>
          <p className="text-sm text-gray-400 font-medium ml-[42px]">Ranked by performance, quality, and engagement</p>
        </div>

        {/* ── Sort Tabs ── */}
        <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1">
          {sortTabs.map((tab) => (
            <button key={tab.key} onClick={() => setSortBy(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap ${sortBy === tab.key
                  ? "bg-[#1e3a5f] text-white shadow-lg shadow-[#1e3a5f]/15"
                  : "bg-white text-gray-400 border border-gray-100 hover:border-gray-200 hover:text-gray-600"
                }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

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
        ) : (
          <>
            {/* ── Top 3 Podium ── */}
            {top3.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {top3.map((script, i) => {
                  const metric = getMetric(script);
                  const rs = rankStyle(i);
                  return (
                    <motion.div key={script._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}>
                      <Link to={`/script/${script._id}`}
                        className={`block bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 ${i === 0 ? "sm:row-span-1" : ""}`}>
                        {/* Cover */}
                        <div className="relative h-44 overflow-hidden">
                          {script.coverImage ? (
                            <img src={resolveImg(script.coverImage)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#0a1628] via-[#1e3a5f] to-[#2d5a8e]">
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]"></div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                          {/* Rank badge */}
                          <div className={`absolute top-3 left-3 w-9 h-9 rounded-xl ${rs.bg} flex items-center justify-center shadow-lg ${rs.shadow} ring-2 ${rs.ring}`}>
                            <span className={`text-sm font-extrabold ${rs.text}`}>{i + 1}</span>
                          </div>

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
