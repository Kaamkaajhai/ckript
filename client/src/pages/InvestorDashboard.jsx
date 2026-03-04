import { useEffect, useState, useContext, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";

const InvestorDashboard = () => {
  const { user } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get("/dashboard/investor");
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // ─── Genre chart data ───────────────────────────────────────────
  const genreChartData = useMemo(() => {
    if (!data?.genreBreakdown) return [];
    return Object.entries(data.genreBreakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data]);

  const GENRE_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

  // ─── Loading state ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className={`w-14 h-14 rounded-2xl ${dark ? "bg-blue-500/10" : "bg-blue-50"} flex items-center justify-center`}>
              <div className={`w-8 h-8 border-[3px] rounded-full animate-spin ${dark ? "border-gray-700 border-t-blue-400" : "border-gray-200 border-t-blue-600"}`} />
            </div>
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold ${dark ? "text-gray-400" : "text-gray-600"}`}>Loading your dashboard</p>
            <p className={`text-xs mt-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>Gathering market intelligence...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const market = data?.marketPulse || {};

  // ─── Stat cards config ──────────────────────────────────────────
  const statCards = [
    {
      label: "Scripts Viewed",
      value: stats.totalViewed || 0,
      icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z",
      icon2: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
      accent: "blue",
    },
    {
      label: "Active Holds",
      value: stats.activeHolds || 0,
      icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
      accent: "purple",
    },
    {
      label: "Converted Deals",
      value: stats.convertedDeals || 0,
      icon: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z",
      accent: "emerald",
    },
    {
      label: "Total Invested",
      value: `$${(stats.totalInvested || 0).toLocaleString()}`,
      icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      accent: "amber",
    },
  ];

  const accentMap = {
    blue: {
      bg: dark ? "bg-blue-500/10" : "bg-blue-50",
      text: dark ? "text-blue-400" : "text-blue-600",
      ring: dark ? "ring-blue-500/20" : "ring-blue-200",
      border: dark ? "border-l-blue-500" : "border-l-blue-500",
    },
    purple: {
      bg: dark ? "bg-purple-500/10" : "bg-purple-50",
      text: dark ? "text-purple-400" : "text-purple-600",
      ring: dark ? "ring-purple-500/20" : "ring-purple-200",
      border: dark ? "border-l-purple-500" : "border-l-purple-500",
    },
    emerald: {
      bg: dark ? "bg-emerald-500/10" : "bg-emerald-50",
      text: dark ? "text-emerald-400" : "text-emerald-600",
      ring: dark ? "ring-emerald-500/20" : "ring-emerald-200",
      border: dark ? "border-l-emerald-500" : "border-l-emerald-500",
    },
    amber: {
      bg: dark ? "bg-amber-500/10" : "bg-amber-50",
      text: dark ? "text-amber-400" : "text-amber-600",
      ring: dark ? "ring-amber-500/20" : "ring-amber-200",
      border: dark ? "border-l-amber-500" : "border-l-amber-500",
    },
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" },
    { key: "holds", label: "Active Holds", icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" },
    { key: "discover", label: "Discover", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" },
    { key: "activity", label: "Activity", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>

        {/* ─── Hero Header ─────────────────────────────────────── */}
        <div className={`relative rounded-2xl overflow-hidden mb-8 ${dark ? "bg-gradient-to-br from-[#0c1929] via-[#0f2240] to-[#162d4e]" : "bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900"}`}>
          {/* Abstract pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

          <div className="relative px-6 sm:px-8 py-8 sm:py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                  </div>
                  <span className="text-blue-300/80 text-xs font-bold tracking-widest uppercase">Investor Portal</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1">
                  Welcome back, {user?.name?.split(" ")[0] || "Investor"}
                </h1>
                <p className="text-blue-200/60 text-sm font-medium">
                  Your deal flow and market intelligence at a glance
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/search"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur text-white text-[13px] font-bold transition-all border border-white/10 hover:border-white/20">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  Browse Scripts
                </Link>
                <Link to="/industry-onboarding"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-bold transition-all shadow-lg shadow-blue-500/25">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                  My Mandates
                </Link>
              </div>
            </div>

            {/* Market Pulse Bar */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { label: "Total Scripts", value: market.totalScripts || 0, icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
                { label: "New This Week", value: market.newThisWeek || 0, icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", highlight: true },
                { label: "Available", value: market.available || 0, icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.highlight ? "bg-blue-500/20" : "bg-white/5"}`}>
                    <svg className={`w-4 h-4 ${item.highlight ? "text-blue-400" : "text-blue-300/50"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-white tabular-nums">{item.value.toLocaleString()}</p>
                    <p className="text-[11px] font-semibold text-blue-300/40 uppercase tracking-wider">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Stat Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, idx) => {
            const a = accentMap[card.accent];
            return (
              <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`relative overflow-hidden rounded-2xl border border-l-[3px] ${a.border} p-5 transition-all duration-200 hover:-translate-y-0.5 group cursor-default ${
                  dark ? "bg-[#0d1b2e] border-[#182840] hover:shadow-lg hover:shadow-black/20" : "bg-white border-gray-100 hover:shadow-lg hover:shadow-gray-100"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center ring-1 ${a.ring}`}>
                    <svg className={`w-5 h-5 ${a.text}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                      {card.icon2 && <path strokeLinecap="round" strokeLinejoin="round" d={card.icon2} />}
                    </svg>
                  </div>
                </div>
                <p className={`text-2xl font-extrabold tabular-nums mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>{card.value}</p>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>{card.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ─── Tab Navigation ──────────────────────────────────── */}
        <div className={`mb-6 flex items-center gap-1 p-1 rounded-xl w-fit ${dark ? "bg-[#0d1b2e]" : "bg-gray-100"}`}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? dark ? "bg-[#1a3050] text-blue-400 shadow-sm" : "bg-white text-blue-600 shadow-sm"
                  : dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* Genre Interest Breakdown */}
                <div className={`rounded-2xl border p-6 ${dark ? "bg-[#0d1b2e] border-[#182840]" : "bg-white border-gray-100"}`}>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-purple-500/10" : "bg-purple-50"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-purple-400" : "text-purple-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                      </svg>
                    </div>
                    <h3 className={`text-sm font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>Genre Interest</h3>
                  </div>
                  {genreChartData.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={genreChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
                              {genreChartData.map((_, i) => <Cell key={i} fill={GENRE_COLORS[i % GENRE_COLORS.length]} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2">
                        {genreChartData.map((g, i) => (
                          <div key={g.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length] }} />
                            <span className={`text-xs font-semibold flex-1 ${dark ? "text-gray-400" : "text-gray-600"}`}>{g.name}</span>
                            <span className={`text-xs font-bold tabular-nums ${dark ? "text-gray-300" : "text-gray-700"}`}>{g.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center justify-center py-8 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                      <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                      </svg>
                      <p className="text-xs font-semibold">Browse scripts to build your interest profile</p>
                    </div>
                  )}
                </div>

                {/* Deal Pipeline */}
                <div className={`rounded-2xl border p-6 col-span-1 lg:col-span-2 ${dark ? "bg-[#0d1b2e] border-[#182840]" : "bg-white border-gray-100"}`}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-blue-500/10" : "bg-blue-50"}`}>
                        <svg className={`w-4 h-4 ${dark ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                        </svg>
                      </div>
                      <h3 className={`text-sm font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>Deal Pipeline</h3>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${dark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                      {stats.totalDeals || 0} total deals
                    </span>
                  </div>

                  {/* Pipeline visualization */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Viewing", value: stats.totalViewed || 0, color: "blue", pct: 100 },
                      { label: "Under Option", value: stats.activeHolds || 0, color: "amber", pct: stats.totalViewed ? Math.round(((stats.activeHolds || 0) / stats.totalViewed) * 100) : 0 },
                      { label: "Converted", value: stats.convertedDeals || 0, color: "emerald", pct: stats.totalViewed ? Math.round(((stats.convertedDeals || 0) / stats.totalViewed) * 100) : 0 },
                    ].map((stage, i) => (
                      <div key={i} className={`rounded-xl p-4 ${dark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>{stage.label}</span>
                        </div>
                        <p className={`text-2xl font-extrabold tabular-nums mb-2 ${
                          stage.color === "blue" ? (dark ? "text-blue-400" : "text-blue-600") :
                          stage.color === "amber" ? (dark ? "text-amber-400" : "text-amber-600") :
                          (dark ? "text-emerald-400" : "text-emerald-600")
                        }`}>
                          {stage.value}
                        </p>
                        <div className={`h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/5" : "bg-gray-200"}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(stage.pct, 3)}%` }}
                            transition={{ duration: 0.8, delay: i * 0.15 }}
                            className={`h-full rounded-full ${
                              stage.color === "blue" ? "bg-blue-500" :
                              stage.color === "amber" ? "bg-amber-500" :
                              "bg-emerald-500"
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Rated Scripts Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-amber-500/10" : "bg-amber-50"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-amber-400" : "text-amber-600"}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className={`text-base font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>Top Rated Scripts</h3>
                      <p className={`text-xs font-medium ${dark ? "text-gray-500" : "text-gray-400"}`}>Highest AI-scored scripts on the platform</p>
                    </div>
                  </div>
                  <Link to="/search" className={`text-xs font-bold ${dark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"} transition-colors`}>
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(data?.topRated || []).slice(0, 4).map((script, idx) => (
                    <ScriptMiniCard key={script._id} script={script} dark={dark} idx={idx} navigate={navigate} />
                  ))}
                  {(!data?.topRated || data.topRated.length === 0) && (
                    <div className={`col-span-full text-center py-12 rounded-2xl border ${dark ? "bg-[#0d1b2e] border-[#182840]" : "bg-white border-gray-100"}`}>
                      <svg className={`w-12 h-12 mx-auto mb-3 ${dark ? "text-gray-700" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <p className={`text-sm font-bold ${dark ? "text-gray-500" : "text-gray-500"}`}>No scripts available yet</p>
                      <p className={`text-xs mt-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>Check back soon for new content</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Matched Scripts */}
              {data?.matchedScripts?.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                        <svg className={`w-4 h-4 ${dark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className={`text-base font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>Matched For You</h3>
                        <p className={`text-xs font-medium ${dark ? "text-gray-500" : "text-gray-400"}`}>Based on your mandate preferences</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data.matchedScripts.slice(0, 4).map((script, idx) => (
                      <ScriptMiniCard key={script._id} script={script} dark={dark} idx={idx} navigate={navigate} matched />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "holds" && (
            <motion.div key="holds" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="space-y-4">
                {data?.activeHolds?.length > 0 ? data.activeHolds.map((hold, idx) => (
                  <motion.div key={hold._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    onClick={() => navigate(`/script/${hold.script?._id}`)}
                    className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 cursor-pointer transition-all hover:-translate-y-0.5 ${
                      dark ? "bg-[#0d1b2e] border-[#182840] hover:border-[#1d3350] hover:shadow-lg hover:shadow-black/20" : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg"
                    }`}
                  >
                    {/* Script thumbnail */}
                    <div className={`w-16 h-20 rounded-xl flex-shrink-0 overflow-hidden ${dark ? "bg-blue-500/10" : "bg-blue-50"}`}>
                      {hold.script?.coverImage ? (
                        <img src={hold.script.coverImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className={`w-7 h-7 ${dark ? "text-blue-400/30" : "text-blue-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-base font-bold truncate mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>
                        {hold.script?.title || "Untitled Script"}
                      </h4>
                      <div className="flex items-center gap-3 flex-wrap">
                        {hold.script?.genre && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                            {hold.script.genre}
                          </span>
                        )}
                        <span className={`text-xs font-medium ${dark ? "text-gray-500" : "text-gray-400"}`}>
                          by {hold.script?.creator?.name || "Unknown"}
                        </span>
                      </div>
                    </div>

                    {/* Hold details */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>Fee</p>
                        <p className={`text-base font-extrabold ${dark ? "text-gray-200" : "text-gray-800"}`}>${hold.fee}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>Expires</p>
                        <p className={`text-base font-extrabold ${hold.daysRemaining <= 5 ? "text-red-500" : hold.daysRemaining <= 10 ? (dark ? "text-amber-400" : "text-amber-600") : (dark ? "text-emerald-400" : "text-emerald-600")}`}>
                          {hold.daysRemaining}d
                        </p>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${hold.daysRemaining <= 5 ? "bg-red-500" : "bg-emerald-500"}`} />
                    </div>
                  </motion.div>
                )) : (
                  <div className={`text-center py-16 rounded-2xl border ${dark ? "bg-[#0d1b2e] border-[#182840]" : "bg-white border-gray-100"}`}>
                    <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${dark ? "bg-white/5" : "bg-gray-100"}`}>
                      <svg className={`w-8 h-8 ${dark ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>No Active Holds</h3>
                    <p className={`text-sm mb-5 ${dark ? "text-gray-500" : "text-gray-400"}`}>When you place a hold on a script, it will appear here</p>
                    <Link to="/search" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      Browse Scripts
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "discover" && (
            <motion.div key="discover" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(data?.topRated || []).concat(data?.matchedScripts || [])
                  .filter((s, i, arr) => arr.findIndex(x => x._id === s._id) === i)
                  .slice(0, 8)
                  .map((script, idx) => (
                    <ScriptMiniCard key={script._id} script={script} dark={dark} idx={idx} navigate={navigate} />
                  ))
                }
                {(!data?.topRated?.length && !data?.matchedScripts?.length) && (
                  <div className={`col-span-full text-center py-16 rounded-2xl border ${dark ? "bg-[#0d1b2e] border-[#182840]" : "bg-white border-gray-100"}`}>
                    <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${dark ? "bg-white/5" : "bg-gray-100"}`}>
                      <svg className={`w-8 h-8 ${dark ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>Set Up Your Mandates</h3>
                    <p className={`text-sm mb-5 max-w-sm mx-auto ${dark ? "text-gray-500" : "text-gray-400"}`}>Configure your genre and budget preferences to see matched scripts here</p>
                    <Link to="/industry-onboarding" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
                      Set Mandates
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Recent Views */}
                <div className={`rounded-2xl border p-6 ${dark ? "bg-[#0d1b2e] border-[#182840]" : "bg-white border-gray-100"}`}>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-blue-500/10" : "bg-blue-50"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className={`text-sm font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>Recently Viewed</h3>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {(data?.recentViews || []).slice(0, 8).map((script) => (
                      <div key={script._id} onClick={() => navigate(`/script/${script._id}`)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${dark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"}`}>
                        <div className={`w-10 h-12 rounded-lg flex-shrink-0 overflow-hidden ${dark ? "bg-blue-500/10" : "bg-blue-50"} flex items-center justify-center`}>
                          {script.coverImage ? (
                            <img src={script.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <svg className={`w-5 h-5 ${dark ? "text-blue-400/30" : "text-blue-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>{script.title}</p>
                          <p className={`text-xs font-medium ${dark ? "text-gray-500" : "text-gray-400"}`}>
                            {script.genre} · {script.creator?.name || "Unknown"}
                          </p>
                        </div>
                        {script.scriptScore?.overall && (
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            script.scriptScore.overall >= 80
                              ? (dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                              : script.scriptScore.overall >= 60
                                ? (dark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600")
                                : (dark ? "bg-gray-500/10 text-gray-400" : "bg-gray-100 text-gray-500")
                          }`}>
                            {script.scriptScore.overall}
                          </span>
                        )}
                      </div>
                    ))}
                    {(!data?.recentViews || data.recentViews.length === 0) && (
                      <div className={`text-center py-8 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                        <p className="text-xs font-semibold">No recently viewed scripts</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Notifications */}
                <div className={`rounded-2xl border p-6 ${dark ? "bg-[#0d1b2e] border-[#182840]" : "bg-white border-gray-100"}`}>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-purple-500/10" : "bg-purple-50"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-purple-400" : "text-purple-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                      </svg>
                    </div>
                    <h3 className={`text-sm font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>Recent Activity</h3>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {(data?.recentNotifications || []).map((notif) => (
                      <div key={notif._id} className={`flex items-start gap-3 p-3 rounded-xl ${dark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"} transition-colors`}>
                        <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${dark ? "bg-blue-500/10" : "bg-blue-50"}`}>
                          {notif.from?.profileImage ? (
                            <img src={notif.from.profileImage} alt="" className="w-full h-full rounded-lg object-cover" />
                          ) : (
                            <span className={`text-xs font-bold ${dark ? "text-blue-400" : "text-blue-600"}`}>
                              {notif.from?.name?.[0]?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
                            {notif.message}
                          </p>
                          <p className={`text-[10px] font-medium mt-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                            {new Date(notif.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!data?.recentNotifications || data.recentNotifications.length === 0) && (
                      <div className={`text-center py-8 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                        <p className="text-xs font-semibold">No recent activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
};

// ─── Script Mini Card Component ────────────────────────────────────
const ScriptMiniCard = ({ script, dark, idx, navigate, matched }) => {
  const score = script.scriptScore?.overall;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06, duration: 0.3 }}
      onClick={() => navigate(`/script/${script._id}`)}
      className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
        dark
          ? "bg-[#0d1b2e] border-[#182840] hover:border-[#1d3350] hover:shadow-xl hover:shadow-black/30"
          : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-xl hover:shadow-gray-200/60"
      }`}
    >
      {/* Cover / Placeholder */}
      <div className={`relative h-36 overflow-hidden ${dark ? "bg-gradient-to-br from-[#0f2240] to-[#162d4e]" : "bg-gradient-to-br from-slate-100 to-blue-50"}`}>
        {script.coverImage ? (
          <img src={script.coverImage} alt={script.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className={`w-12 h-12 ${dark ? "text-white/5" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
        )}
        {/* Score badge */}
        {score && (
          <div className={`absolute top-2.5 right-2.5 px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-md ${
            score >= 80 ? "bg-emerald-500/80 text-white" : score >= 60 ? "bg-blue-500/80 text-white" : "bg-gray-500/80 text-white"
          }`}>
            {score}
          </div>
        )}
        {/* Matched badge */}
        {matched && (
          <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/80 text-white backdrop-blur-md flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Match
          </div>
        )}
        {/* Trailer badge */}
        {script.trailerStatus === "ready" && (
          <div className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-lg text-[10px] font-bold bg-black/50 text-white backdrop-blur-md flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Trailer
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className={`text-sm font-bold truncate mb-1.5 group-hover:text-blue-500 transition-colors ${dark ? "text-gray-100" : "text-gray-900"}`}>
          {script.title}
        </h4>
        {script.logline && (
          <p className={`text-xs leading-relaxed line-clamp-2 mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>
            {script.logline}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {script.genre && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${dark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                {script.genre}
              </span>
            )}
            {script.budget && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${dark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
                {script.budget}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {script.holdStatus === "available" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
            <span className={`text-[10px] font-semibold ${dark ? "text-gray-500" : "text-gray-400"}`}>
              {script.views || 0} views
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InvestorDashboard;
