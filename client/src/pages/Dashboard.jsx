import { useEffect, useState, useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, AreaChart, Area } from "recharts";
import api from "../services/api";
import ProjectCard from "../components/ProjectCard";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();
  const [myScripts, setMyScripts] = useState([]);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [reviewTab, setReviewTab] = useState("ai");
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scriptsRes, statsRes, reviewsRes] = await Promise.allSettled([
        api.get("/scripts/mine"),
        api.get("/dashboard"),
        api.get("/dashboard/reviews"),
      ]);

      if (scriptsRes.status === "fulfilled") {
        setMyScripts(scriptsRes.value.data);
      } else {
        setMyScripts([]);
      }

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data.stats ?? statsRes.value.data);
      } else {
        // Demo stats
        setStats({
          totalScripts: 3, totalEarnings: 450, totalUnlocks: 12, holdEarnings: 360,
          totalViews: 1247, trailersGenerated: 2, scoredScripts: 3, avgScore: 84,
          auditionCount: 15, activeHolds: 1, scriptScoreCredits: 5, plan: "free",
        });
      }

      if (reviewsRes.status === "fulfilled") {
        setReviews(reviewsRes.value.data);
      } else {
        setReviews(null);
      }
    } catch { } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className={`w-10 h-10 border-[3px] rounded-full animate-spin ${dark ? 'border-gray-700 border-t-blue-400' : 'border-gray-200 border-t-[#1e3a5f]'}`}></div>
          <p className={`text-sm font-medium animate-pulse ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: "Total Views", value: stats.totalViews || 0 },
    { label: "Earnings", value: `$${stats.totalEarnings || 0}` },

    { label: "Unlocks", value: stats.totalUnlocks || 0 },
    { label: "AI Trailers", value: stats.trailersGenerated || 0 },
    { label: "Avg Score", value: stats.avgScore ?? "N/A" },

  ] : [];

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Page heading */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[13px] font-semibold mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Welcome back{user?.name ? `, ${user.name}` : ""}</p>
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {stats?.plan && (
                <span className={`hidden sm:inline-flex px-3 py-1.5 rounded-lg text-[12px] font-bold tracking-wide uppercase ${stats.plan === "pro" ? "bg-[#1e3a5f]/[0.06] text-[#1e3a5f] ring-1 ring-[#1e3a5f]/10" : dark ? "bg-white/[0.06] text-gray-400 ring-1 ring-white/10" : "bg-gray-50 text-gray-500 ring-1 ring-gray-200/60"
                  }`}>
                  {stats.plan === "pro" ? "Pro" : "Free"}
                </span>
              )}
              <Link to="/create-project"
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 shadow-sm hover:-translate-y-0.5 ${dark ? 'bg-white/[0.06] text-gray-200 hover:bg-white/[0.1] ring-1 ring-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                <span className="hidden sm:inline">Create Project</span>
                <span className="sm:hidden">Create</span>
              </Link>
              <Link to="/upload"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-[13px] font-bold hover:bg-[#162d4a] transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-[#1e3a5f]/20 hover:-translate-y-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                <span className="hidden sm:inline">Upload Project</span>
                <span className="sm:hidden">Upload</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {statCards.map((card, idx) => {
              return (
                <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`rounded-xl border-2 p-4 hover:-translate-y-0.5 transition-all duration-200 group/card cursor-default ${dark ? 'bg-[#101e30] border-[#182840] hover:shadow-lg hover:shadow-[#020609]/20' : 'bg-white border-[#1e3a5f]/25 hover:shadow-lg hover:shadow-gray-100'}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 transition-colors ${dark ? 'text-gray-500 group-hover/card:text-gray-400' : 'text-gray-400 group-hover/card:text-gray-500'}`}>{card.label}</p>
                  <p className={`text-2xl font-extrabold tabular-nums ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{card.value}</p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Content Views */}
        {myScripts.length > 0 && (() => {
          const publishedScripts = myScripts.filter(s => s.status === "published");
          if (publishedScripts.length === 0) return null;
          const totalViews = publishedScripts.reduce((sum, s) => sum + (s.views || 0), 0);
          const topScript = publishedScripts.reduce((a, b) => ((a.views || 0) >= (b.views || 0) ? a : b), publishedScripts[0]);
          const avgViews = publishedScripts.length > 0 ? Math.round(totalViews / publishedScripts.length) : 0;
          const chartData = publishedScripts.map(s => ({
            name: s.title?.length > 14 ? s.title.slice(0, 14) + "…" : s.title,
            views: s.views || 0,
            fullName: s.title,
          })).sort((a, b) => b.views - a.views).slice(0, 8);

          return (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
              className={`rounded-2xl border shadow-sm mb-8 overflow-hidden ${dark ? 'bg-[#101e30] border-[#182840]' : 'bg-white border-gray-100'}`}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-0">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/[0.06] flex items-center justify-center">
                      <svg className="w-[18px] h-[18px] text-[#1e3a5f]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className={`text-[16px] font-bold tracking-tight ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Content Views</h2>
                      <p className={`text-[12px] font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Performance across your scripts</p>
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3 mb-1">
                  <div className={`rounded-xl px-4 py-3 ${dark ? 'bg-white/[0.04] ring-1 ring-white/[0.06]' : 'bg-gray-50/60 ring-1 ring-gray-200/40'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]"></div>
                      <p className={`text-[11px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Total Views</p>
                    </div>
                    <p className={`text-xl font-extrabold tabular-nums ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{totalViews.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-xl px-4 py-3 ${dark ? 'bg-white/[0.04] ring-1 ring-white/[0.06]' : 'bg-gray-50/60 ring-1 ring-gray-200/40'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]"></div>
                      <p className={`text-[11px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Top Script</p>
                    </div>
                    <p className={`text-xl font-extrabold tabular-nums ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{(topScript.views || 0).toLocaleString()}</p>
                    <p className={`text-[10px] font-medium truncate ${dark ? 'text-gray-600' : 'text-gray-400/80'}`}>{topScript.title}</p>
                  </div>
                  <div className={`rounded-xl px-4 py-3 ${dark ? 'bg-white/[0.04] ring-1 ring-white/[0.06]' : 'bg-gray-50/60 ring-1 ring-gray-200/40'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]"></div>
                      <p className={`text-[11px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Avg / Script</p>
                    </div>
                    <p className={`text-xl font-extrabold tabular-nums ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{avgViews.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Sparkline */}
              <div className="h-[48px] w-full">
                {chartsReady && (
                  <ResponsiveContainer width="100%" height={48} minWidth={0}>
                    <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.12} />
                          <stop offset="50%" stopColor="#1e3a5f" stopOpacity={0.06} />
                          <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="views" stroke="#1e3a5f" strokeWidth={1.5} fill="url(#sparkGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Bar Chart */}
              <div className="px-5 sm:px-6 pb-2 pt-1">
                <div className="h-[220px]">
                  {chartsReady && (
                    <ResponsiveContainer width="100%" height={220} minWidth={0}>
                      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barSize={26}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#182840' : '#f5f5f5'} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fontWeight: 600, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          height={45}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fontWeight: 500, fill: "#d1d5db" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: dark ? '#101e30' : '#fff',
                            border: `1px solid ${dark ? '#182840' : '#f3f4f6'}`,
                            borderRadius: 12,
                            fontSize: 13,
                            fontWeight: 600,
                            boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.06)',
                            padding: '10px 16px',
                            color: dark ? '#e5e7eb' : undefined,
                          }}
                          labelStyle={{ color: dark ? '#f3f4f6' : '#111827', fontWeight: 700, marginBottom: 2, fontSize: 13 }}
                          itemStyle={{ color: dark ? '#9ca3af' : '#6b7280' }}
                          formatter={(value) => [value.toLocaleString() + " views", ""]}
                          cursor={{ fill: "rgba(30,58,95,0.03)", radius: 6 }}
                        />
                        <defs>
                          <linearGradient id="barGradTop" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1e3a5f" />
                            <stop offset="100%" stopColor="#162d4a" />
                          </linearGradient>
                          <linearGradient id="barGradMid" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4a6d8c" />
                            <stop offset="100%" stopColor="#3d5f7e" />
                          </linearGradient>
                          <linearGradient id="barGradLow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a8c4d8" />
                            <stop offset="100%" stopColor="#8ab0c8" />
                          </linearGradient>
                        </defs>
                        <Bar dataKey="views" radius={[6, 6, 2, 2]}>
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? "url(#barGradTop)" : i <= 2 ? "url(#barGradMid)" : "url(#barGradLow)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Script Breakdown */}
              <div className={`border-t px-6 py-4 ${dark ? 'border-[#182840]' : 'border-gray-100'}`}>
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Breakdown</p>
                <div className="space-y-2.5">
                  {chartData.slice(0, 5).map((s, i) => {
                    const pct = totalViews > 0 ? Math.round((s.views / totalViews) * 100) : 0;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-[11px] font-bold text-gray-300 w-4 text-right tabular-nums">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[13px] font-semibold truncate ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{s.fullName}</span>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              <span className={`text-[12px] font-bold tabular-nums ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{s.views.toLocaleString()}</span>
                              <span className={`text-[10px] font-medium tabular-nums w-7 text-right ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{pct}%</span>
                            </div>
                          </div>
                          <div className={`h-[3px] rounded-full overflow-hidden ${dark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, delay: 0.4 + i * 0.06 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: i === 0 ? "#1e3a5f" : i <= 2 ? "#4a6d8c" : "#a8c4d8" }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Reviews & Insights Section */}
        <div className="mb-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
            </div>
            <div>
              <h2 className={`text-xl font-bold tracking-tight ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Reviews & Insights</h2>
              <p className={`text-sm font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Performance analytics and AI-powered feedback</p>
            </div>
          </div>

          {/* Tab Navigation */}
          {reviews && (
            <div className={`rounded-2xl border shadow-sm overflow-hidden mb-8 ${dark ? 'bg-[#101e30] border-[#182840]' : 'bg-white border-gray-100'}`}>
              <div className="px-6 pt-5 pb-0">
                <div className={`inline-flex items-center rounded-xl p-1 gap-1 ${dark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                  {[
                    {
                      key: "ai", label: "AI Analysis", shortLabel: "AI",
                      icon: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5",
                      gradient: "from-[#1e3a5f] to-[#162d4a]"
                    },
                    {
                      key: "reader", label: "Reader Engagement", shortLabel: "Readers",
                      icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
                      gradient: "from-[#1e3a5f] to-[#162d4a]"
                    },
                    {
                      key: "platform", label: "Platform Insights", shortLabel: "Platform",
                      icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6",
                      gradient: "from-[#1e3a5f] to-[#162d4a]"
                    },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setReviewTab(tab.key)}
                      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${reviewTab === tab.key
                        ? dark ? 'bg-white/[0.08] text-blue-400 shadow-sm' : 'bg-white text-[#1e3a5f] shadow-sm'
                        : dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                      </svg>
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {/* AI Analysis Tab */}
                {reviewTab === "ai" && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    {reviews.ai?.length > 0 ? (
                      <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
                        {reviews.ai.map((r, idx) => {
                          const scoreColor = r.rating >= 80 ? { ring: "#1e3a5f", bg: "bg-[#1e3a5f]/[0.06]", text: "text-[#1e3a5f]", label: "Excellent" }
                            : r.rating >= 60 ? { ring: "#6b7280", bg: "bg-gray-50", text: "text-gray-600", label: "Good" }
                              : { ring: "#9ca3af", bg: "bg-gray-50", text: "text-gray-500", label: "Needs Work" };
                          return (
                            <motion.div key={r.scriptId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.08 }}
                              className={`group border rounded-2xl p-6 transition-all duration-300 ${dark ? 'border-[#182840] hover:border-[#1d3350] hover:shadow-md hover:shadow-[#020609]/20' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}`}
                            >
                              <div className="flex items-start gap-5">
                                {/* Circular Score */}
                                <div className="relative shrink-0">
                                  <svg className="w-[72px] h-[72px] -rotate-90" viewBox="0 0 72 72">
                                    <circle cx="36" cy="36" r="30" fill="none" stroke={dark ? '#182840' : '#f3f4f6'} strokeWidth="5" />
                                    <circle cx="36" cy="36" r="30" fill="none" stroke={scoreColor.ring} strokeWidth="5"
                                      strokeDasharray={`${(r.rating / 100) * 188.5} 188.5`}
                                      strokeLinecap="round" className="transition-all duration-700" />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-lg font-extrabold ${scoreColor.text}`}>{r.rating}</span>
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-1">
                                    <div>
                                      <h3 className={`text-[15px] font-bold tracking-tight ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{r.scriptTitle}</h3>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${scoreColor.bg} ${scoreColor.text}`}>
                                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scoreColor.ring }}></span>
                                          {scoreColor.label}
                                        </span>
                                        <span className="text-[11px] text-gray-300 font-medium">AI-powered analysis</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Score Breakdown */}
                                  {Object.keys(r.scores || {}).length > 0 && (
                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                                      {Object.entries(r.scores).map(([key, val]) => {
                                        const barColor = val >= 80 ? "bg-[#1e3a5f]" : val >= 60 ? "bg-gray-400" : "bg-gray-300";
                                        return (
                                          <div key={key} className={`rounded-lg px-3 py-2.5 ${dark ? 'bg-white/[0.04]' : 'bg-gray-50/80'}`}>
                                            <div className="flex items-center justify-between mb-1.5">
                                              <span className={`text-[11px] font-semibold uppercase tracking-wider capitalize ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{key}</span>
                                              <span className={`text-[12px] font-bold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{val}</span>
                                            </div>
                                            <div className={`h-1 rounded-full overflow-hidden ${dark ? 'bg-white/[0.06]' : 'bg-gray-200'}`}>
                                              <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }}
                                                transition={{ duration: 0.6, delay: 0.2 }}
                                                className={`h-full rounded-full ${barColor}`} />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* AI Feedback */}
                                  {r.feedback && (
                                    <div className={`mt-4 rounded-xl border p-3.5 ${dark ? 'bg-white/[0.03] border-[#182840]' : 'bg-gray-50/80 border-gray-100'}`}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-lg bg-[#1e3a5f]/[0.08] flex items-center justify-center shrink-0">
                                          <svg className="w-3.5 h-3.5 text-[#1e3a5f]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                          </svg>
                                        </div>
                                        <p className="text-[11px] font-bold text-[#1e3a5f] uppercase tracking-wider">AI Feedback</p>
                                      </div>
                                      <p className={`text-[13px] leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{r.feedback}</p>
                                    </div>
                                  )}

                                  {/* Strengths */}
                                  {r.strengths?.length > 0 && (
                                    <div className={`mt-3 rounded-xl border p-3.5 ${dark ? 'bg-emerald-400/[0.05] border-emerald-400/15' : 'bg-emerald-50 border-emerald-100'}`}>
                                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>Strengths</p>
                                      <ul className="space-y-1">
                                        {r.strengths.map((s, i) => (
                                          <li key={i} className={`flex items-start gap-1.5 text-[12px] ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <span className={`mt-0.5 shrink-0 text-xs ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>✓</span>{s}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Weaknesses + Improvements */}
                                  {(r.weaknesses?.length > 0 || r.improvements?.length > 0) && (
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {r.weaknesses?.length > 0 && (
                                        <div className={`rounded-xl border p-3.5 ${dark ? 'bg-amber-400/[0.05] border-amber-400/15' : 'bg-amber-50 border-amber-100'}`}>
                                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${dark ? 'text-amber-400' : 'text-amber-600'}`}>To Improve</p>
                                          <ul className="space-y-1">
                                            {r.weaknesses.map((w, i) => (
                                              <li key={i} className={`flex items-start gap-1.5 text-[12px] ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <span className={`mt-0.5 shrink-0 text-xs ${dark ? 'text-amber-400' : 'text-amber-600'}`}>△</span>{w}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {r.improvements?.length > 0 && (
                                        <div className={`rounded-xl border p-3.5 ${dark ? 'bg-blue-400/[0.05] border-blue-400/15' : 'bg-blue-50 border-blue-100'}`}>
                                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${dark ? 'text-blue-400' : 'text-blue-600'}`}>Recommendations</p>
                                          <ul className="space-y-1">
                                            {r.improvements.map((imp, i) => (
                                              <li key={i} className={`flex items-start gap-1.5 text-[12px] ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <span className={`mt-0.5 shrink-0 font-bold text-[10px] ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{i + 1}.</span>{imp}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Audience Fit + Comparables */}
                                  {(r.audienceFit || r.comparables) && (
                                    <div className={`mt-3 grid gap-3 ${r.audienceFit && r.comparables ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                                      {r.audienceFit && (
                                        <div className={`rounded-xl border p-3 ${dark ? 'border-[#182840] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'}`}>
                                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Audience &amp; Market</p>
                                          <p className={`text-[12px] leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{r.audienceFit}</p>
                                        </div>
                                      )}
                                      {r.comparables && (
                                        <div className={`rounded-xl border p-3 ${dark ? 'border-[#182840] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'}`}>
                                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Comparable Titles</p>
                                          <p className={`text-[12px] leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{r.comparables}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${dark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                          <svg className={`w-8 h-8 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" />
                          </svg>
                        </div>
                        <p className={`text-[15px] font-bold mb-1 ${dark ? 'text-gray-300' : 'text-gray-800'}`}>No AI analyses yet</p>
                        <p className={`text-sm max-w-xs text-center ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Score a script to receive detailed AI-powered insights and recommendations</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Reader Engagement Tab */}
                {reviewTab === "reader" && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    {reviews.readers?.length > 0 ? (
                      <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                        {reviews.readers.map((r, idx) => (
                          <motion.div key={r.scriptId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className={`border rounded-2xl p-5 transition-all duration-300 ${dark ? 'border-[#182840] hover:border-[#1d3350] hover:shadow-md hover:shadow-[#020609]/20' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              {/* Script Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                                    <svg className={`w-4 h-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                  </div>
                                  <h3 className={`text-[15px] font-bold truncate tracking-tight ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{r.scriptTitle}</h3>
                                </div>
                                {r.insight && (
                                  <p className={`text-[13px] leading-relaxed ml-10 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{r.insight}</p>
                                )}
                              </div>

                              {/* Metrics */}
                              <div className={`flex items-center gap-1 shrink-0 rounded-xl px-4 py-3 ${dark ? 'bg-white/[0.04]' : 'bg-gray-50/80'}`}>
                                <div className="text-center px-3">
                                  <p className={`text-lg font-extrabold leading-none mb-0.5 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{r.views.toLocaleString()}</p>
                                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Total Views</p>
                                </div>
                                <div className={`w-px h-8 mx-1 ${dark ? 'bg-white/[0.06]' : 'bg-gray-200/80'}`}></div>
                                <div className="text-center px-3">
                                  <p className={`text-lg font-extrabold leading-none mb-0.5 ${r.engagementScore >= 70 ? "text-[#1e3a5f]" : r.engagementScore >= 40 ? (dark ? "text-gray-300" : "text-gray-700") : (dark ? "text-gray-500" : "text-gray-400")
                                    }`}>{r.engagementScore ?? 0}</p>
                                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Avg Rating</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${dark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                          <svg className={`w-8 h-8 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
                          </svg>
                        </div>
                        <p className={`text-[15px] font-bold mb-1 ${dark ? 'text-gray-300' : 'text-gray-800'}`}>No reader data yet</p>
                        <p className={`text-sm max-w-xs text-center ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Upload scripts to start tracking reader engagement and conversions</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Platform Insights Tab */}
                {reviewTab === "platform" && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-7">

                    {/* ── Admin Score Reviews ── */}
                    <div>
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                          <svg className={`w-3.5 h-3.5 ${dark ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Admin Score Reviews</span>
                      </div>

                      {reviews.adminScores?.length > 0 ? (
                        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                          {reviews.adminScores.map((s, idx) => {
                            const scoreDims = [
                              { key: "content",  label: "Main Content", color: "#6366f1", track: dark ? "rgba(99,102,241,0.12)" : "#ede9fe" },
                              { key: "trailer",  label: "Trailer",      color: "#8b5cf6", track: dark ? "rgba(139,92,246,0.12)" : "#ede9fe" },
                              { key: "title",    label: "Title",        color: "#f59e0b", track: dark ? "rgba(245,158,11,0.12)"  : "#fef3c7" },
                              { key: "synopsis", label: "Synopsis",     color: "#10b981", track: dark ? "rgba(16,185,129,0.12)"  : "#d1fae5" },
                              { key: "tags",     label: "Tag & Meta",   color: "#f97316", track: dark ? "rgba(249,115,22,0.12)"  : "#ffedd5" },
                            ];
                            const ov = s.overall ?? 0;
                            const gc = ov >= 85 ? "#8b5cf6" : ov >= 70 ? "#10b981" : ov >= 55 ? "#3b82f6" : ov >= 40 ? "#f59e0b" : "#ef4444";
                            const gl = ov >= 85 ? "S" : ov >= 70 ? "A" : ov >= 55 ? "B" : ov >= 40 ? "C" : "D";
                            return (
                              <motion.div key={s.scriptId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}
                                className={`border rounded-2xl overflow-hidden ${dark ? 'border-[#182840]' : 'border-gray-100'}`}
                              >
                                {/* Card header */}
                                <div className={`flex items-center justify-between gap-3 px-5 py-4 ${dark ? 'bg-[#0d1b2e]/60' : 'bg-gray-50/80'}`}>
                                  <div className="min-w-0">
                                    <h4 className={`text-[14px] font-bold truncate ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{s.scriptTitle}</h4>
                                    {s.scoredAt && (
                                      <p className={`text-[11px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Reviewed {new Date(s.scoredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md" style={{ color: gc, backgroundColor: gc + "22" }}>Grade {gl}</span>
                                    <div className="text-right">
                                      <span className="text-[22px] font-black tabular-nums leading-none" style={{ color: gc }}>{ov}</span>
                                      <span className={`text-[10px] block font-semibold ${dark ? 'text-gray-500' : 'text-gray-400'}`}>/ 100</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Score bars */}
                                <div className={`px-5 py-4 space-y-3 ${dark ? 'bg-[#0a1628]/40' : 'bg-white'}`}>
                                  {scoreDims.map(d => {
                                    const val = s[d.key] ?? 0;
                                    const pct = Math.min(100, Math.max(0, val));
                                    return (
                                      <div key={d.key} className="flex items-center gap-3">
                                        <span className={`text-[11px] font-semibold shrink-0 w-[90px] ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{d.label}</span>
                                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: d.track }}>
                                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                                        </div>
                                        <span className="text-[12px] font-black tabular-nums w-14 text-right" style={{ color: d.color }}>
                                          {val}<span className={`text-[10px] font-normal ${dark ? 'text-gray-600' : 'text-gray-300'}`}>/100</span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Feedback */}
                                {s.feedback && (
                                  <div className={`px-5 py-3 border-t text-[12px] leading-relaxed ${dark ? 'border-[#182840] bg-[#0a1628]/60 text-gray-400' : 'border-gray-50 bg-gray-50/60 text-gray-500'}`}>
                                    <span className={`font-semibold mr-1.5 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Feedback:</span>
                                    {s.feedback}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`flex flex-col items-center justify-center py-10 rounded-2xl border ${dark ? 'border-[#182840] bg-[#0d1b2e]/30' : 'border-gray-100 bg-gray-50/50'}`}>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-sm ${dark ? 'bg-white/[0.04]' : 'bg-white'}`}>
                            <svg className={`w-6 h-6 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375" />
                            </svg>
                          </div>
                          <p className={`text-[13px] font-bold mb-1 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>No admin reviews yet</p>
                          <p className={`text-[12px] text-center max-w-[220px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Submit your script for platform review to receive quality scores</p>
                        </div>
                      )}
                    </div>


                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section heading */}
        <div className="flex items-center gap-2 mb-5">
          <h2 className={`text-[17px] font-bold tracking-tight ${dark ? 'text-gray-100' : 'text-gray-900'}`}>My Projects</h2>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums ${dark ? 'text-gray-400 bg-white/[0.06]' : 'text-gray-400 bg-gray-100'}`}>{myScripts.length}</span>
        </div>

        {/* Approval status notices */}
        {(() => {
          const pending = myScripts.filter(s => s.status === "pending_approval");
          const rejected = myScripts.filter(s => s.status === "rejected");
          return (
            <>
              {pending.length > 0 && (
                <div className={`mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border ${dark ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[13px] font-medium">
                    <span className="font-bold">{pending.length} project{pending.length > 1 ? 's' : ''}</span> pending admin approval — {pending.length > 1 ? 'they are' : 'it is'} hidden from the public until approved.
                  </p>
                </div>
              )}
              {rejected.length > 0 && (
                <div className={`mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border ${dark ? 'bg-red-500/5 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-[13px] font-medium">
                    <span className="font-bold">{rejected.length} project{rejected.length > 1 ? 's were' : ' was'}</span> not approved. Review the feedback on each card and make revisions, then re-upload.
                  </p>
                </div>
              )}
            </>
          );
        })()}

        {/* Projects grid */}
        {myScripts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myScripts.map((script) => (
              <ProjectCard
                key={script._id}
                project={script}
                userName={
                  script.creator?.name?.toUpperCase() ||
                  user?.name?.toUpperCase() ||
                  "UNKNOWN"
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${dark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
              <svg className={`w-10 h-10 ${dark ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>No projects yet</h2>
            <p className={`text-base mb-6 ${dark ? 'text-gray-500' : 'text-gray-500'}`}>Upload your first script to get started</p>
            <div className="flex items-center gap-3">
              <Link
                to="/create-project"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all duration-200 hover:-translate-y-0.5 ${dark ? 'bg-white/[0.06] text-gray-200 hover:bg-white/[0.1] ring-1 ring-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                CREATE PROJECT
              </Link>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] text-white font-bold rounded-xl hover:bg-[#162d4a] transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-[#1e3a5f]/20 hover:-translate-y-0.5 text-base"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                UPLOAD PROJECT
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
