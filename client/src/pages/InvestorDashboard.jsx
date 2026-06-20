import { useEffect, useState, useContext, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import ProfileCompletionBanner from "../components/ProfileCompletionBanner";
import { getScriptCanonicalPath } from "../utils/scriptPath";
import { getProfileCanonicalPath } from "../utils/profilePath";
import {
  getScriptCompletionBadgeClasses,
  getScriptCompletionProgressText,
  getScriptCompletionStatusLabel,
} from "../utils/scriptCompletion";

/* ── Fade wrapper ────────────────────────────────────────────── */
const Fade = ({ children, delay = 0, className = "" }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }} className={className}>
    {children}
  </motion.div>
);

const InvestorDashboard = () => {
  const { user } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [revealedWriters, setRevealedWriters] = useState([]);
  const [writersLoading, setWritersLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashRes, walletRes, txnRes] = await Promise.allSettled([
        api.get("/dashboard/investor"),
        api.get("/transactions/wallet/balance"),
        api.get("/transactions?limit=10"),
      ]);
      if (dashRes.status === "fulfilled") setData(dashRes.value.data);
      if (walletRes.status === "fulfilled") setWallet(walletRes.value.data);
      if (txnRes.status === "fulfilled") setTransactions(txnRes.value.data?.transactions || txnRes.value.data || []);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevealedWriters = useCallback(async () => {
    const contacts = (user?.subscription?.revealedContacts || []).filter(c => c.writerId);
    if (!contacts.length) return;
    try {
      setWritersLoading(true);
      const results = await Promise.allSettled(
        contacts.map(c => api.get(`/users/${c.writerId}`))
      );
      const writers = results
        .map((r, i) => {
          if (r.status !== "fulfilled") return null;
          const w = r.value.data?.user || r.value.data;
          return w ? { ...w, revealedAt: contacts[i].revealedAt } : null;
        })
        .filter(Boolean);
      setRevealedWriters(writers);
    } catch {
      setRevealedWriters([]);
    } finally {
      setWritersLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchRevealedWriters(); }, [fetchRevealedWriters]);

  /* ── Derived data ──────────────────────────────────────────── */
  const stats = data?.stats || {};
  const market = data?.marketPulse || {};
  const profile = data?.industryProfile || {};
  const mandates = profile?.mandates || {};
  const firstName = user?.name?.split(" ")[0] || "Investor";
  const profileEditPath = getProfileCanonicalPath(user, {
    viewerId: user?._id,
    viewerRole: user?.role,
  });
  const walletBalance = wallet?.balance ?? wallet?.wallet?.balance ?? 0;
  const closedDealsCount = Math.max(
    Number(stats.convertedDeals || 0),
    Number(stats.scriptsPurchased || 0),
    Number(stats.successfulProjects || 0)
  );
  const totalDealsCount = Math.max(Number(stats.totalDeals || 0), closedDealsCount);

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${dark ? "bg-white/[0.06]" : "bg-gray-100"} flex items-center justify-center`}>
            <div className={`w-8 h-8 border-[3px] rounded-full animate-spin ${dark ? "border-gray-700 border-t-gray-400" : "border-gray-200 border-t-[#1e3a5f]"}`} />
          </div>
          <p className={`text-sm font-semibold ${dark ? "text-gray-400" : "text-gray-600"}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-[1280px] mx-auto px-1">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>

        <ProfileCompletionBanner
          completion={user?.profileCompletion}
          subtitle="Your profile is incomplete. Complete it to improve your deal flow quality."
          ctaLabel="Edit Profile"
          ctaTo={profileEditPath}
          className="mb-6"
        />

        {/* ─────────────── HEADER ─────────────── */}
        <Fade>
          <div className="rounded-2xl p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold select-none shrink-0
                  ${dark ? "bg-white/[0.06] text-white border border-white/[0.08]" : "bg-[#1e3a5f] text-white"}`}>
                  {firstName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight
                    ${dark ? "text-white" : "text-gray-900"}`}>
                    Welcome back, <span className={dark ? "text-gray-300" : "text-[#1e3a5f]"}>{firstName}</span>
                  </h1>
                  <p className={`text-sm font-medium mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    {profile.company ? `${profile.jobTitle || "Investor"} at ${profile.company}` : "Your deal flow & market intelligence"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Fade>

        {/* ─────────────── KPI ROW ─────────────── */}
        <Fade delay={0.04}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: "Scripts Viewed", value: stats.totalViewed || 0,
                iconD: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z",
                iconD2: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                accent: dark ? "text-gray-300 bg-white/[0.06]" : "text-[#1e3a5f] bg-gray-100"
              },
              {
                label: "Successful Projects", value: stats.successfulProjects || 0,
                iconD: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z",
                accent: dark ? "text-emerald-400 bg-emerald-500/10" : "text-emerald-600 bg-emerald-50"
              },
              {
                label: "Scripts Purchased", value: stats.scriptsPurchased || 0,
                iconD: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
                accent: dark ? "text-purple-400 bg-purple-500/10" : "text-purple-600 bg-purple-50"
              },
              {
                label: "Total Invested", value: `₹${(stats.totalInvested || 0).toLocaleString()}`,
                iconD: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                accent: dark ? "text-amber-400 bg-amber-500/10" : "text-amber-600 bg-amber-50"
              },
            ].map((kpi, i) => (
              <div key={i} className={`rounded-2xl border p-4 transition-all hover:-translate-y-0.5
                ${dark ? "bg-[#0a1628] border-[#162240] hover:border-[#1d3350]" : "bg-white border-gray-100 hover:shadow-md"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${kpi.accent.split(" ").slice(1).join(" ")}`}>
                  <svg className={`w-[18px] h-[18px] ${kpi.accent.split(" ")[0]}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={kpi.iconD} />
                    {kpi.iconD2 && <path strokeLinecap="round" strokeLinejoin="round" d={kpi.iconD2} />}
                  </svg>
                </div>
                <p className={`text-[22px] font-extrabold tabular-nums leading-none mb-1 ${dark ? "text-white" : "text-gray-900"}`}>
                  {kpi.value}
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  {kpi.label}
                </p>
              </div>
            ))}
          </div>
        </Fade>

        {/* ─────────────── TAB BAR ─────────────── */}
        <Fade delay={0.06}>
          <div className="mb-6 max-[640px]:overflow-x-auto max-[640px]:pb-1 [scrollbar-width:none] [-ms-overflow-style:none] max-[640px]:[&::-webkit-scrollbar]:hidden">
            <div className={`flex items-center gap-1 p-1 rounded-xl w-fit max-[640px]:w-max max-[640px]:min-w-max
              ${dark ? "bg-[#0a1628] border border-[#162240]" : "bg-gray-50 border border-gray-100"}`}>
            {[
              {
                key: "overview", label: "Overview",
                d: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all shrink-0 whitespace-nowrap
                  ${activeTab === tab.key
                    ? dark ? "bg-[#151f2e] text-gray-300" : "bg-white text-[#1e3a5f] shadow-sm"
                    : dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.d} />
                </svg>
                <span className="inline text-[12px] max-[360px]:text-[11px]">{tab.label}</span>
              </button>
            ))}
            </div>
          </div>
        </Fade>

        {/* ─────────────── TAB CONTENT ─────────────── */}
        <AnimatePresence mode="wait">

          {/* ═══ OVERVIEW ═══ */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              {/* Row 1 — Market Pulse + Mandate */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

                {/* Market Pulse */}
                <Card dark={dark} className="p-5">
                  <CardTitle dark={dark}
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />}
                    iconBg={dark ? "bg-white/[0.06]" : "bg-gray-100"}
                    iconColor={dark ? "text-gray-300" : "text-[#1e3a5f]"}
                    title="Market Pulse" />
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {[
                      { label: "Total Scripts", value: market.totalScripts || 0 },
                      { label: "New This Week", value: market.newThisWeek || 0, highlight: true },
                      { label: "Available", value: market.available || 0 },
                    ].map((m, i) => (
                      <div key={i} className={`rounded-xl p-3 text-center ${dark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                        <p className={`text-lg font-extrabold tabular-nums ${m.highlight ? (dark ? "text-gray-300" : "text-[#1e3a5f]") : (dark ? "text-white" : "text-gray-900")}`}>
                          {m.value.toLocaleString()}
                        </p>
                        <p className={`text-[9px] font-bold uppercase tracking-[0.12em] mt-0.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                          {m.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Mandate Summary */}
                <Card dark={dark} className="p-5">
                  <CardTitle dark={dark}
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />}
                    iconBg={dark ? "bg-white/[0.06]" : "bg-gray-100"}
                    iconColor={dark ? "text-gray-300" : "text-[#1e3a5f]"}
                    title="My Preferences"
                    action={<Link to="/mandates" className={`text-[11px] font-semibold ${dark ? "text-gray-300 hover:text-gray-200" : "text-[#1e3a5f] hover:text-[#162d4a]"}`}>Edit →</Link>} />
                  {mandates.genres?.length > 0 || mandates.formats?.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {mandates.genres?.length > 0 && (
                        <div>
                          <p className={`text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>Genres</p>
                          <div className="flex flex-wrap gap-1">
                            {mandates.genres.map(g => (
                              <span key={g} className={`px-2 py-0.5 rounded-md text-[11px] font-semibold
                                ${dark ? "bg-white/[0.04] text-gray-300 border border-white/[0.06]" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {mandates.formats?.length > 0 && (
                        <div>
                          <p className={`text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>Formats</p>
                          <div className="flex flex-wrap gap-1">
                            {mandates.formats.map(f => (
                              <span key={f} className={`px-2 py-0.5 rounded-md text-[11px] font-semibold
                                ${dark ? "bg-white/[0.04] text-gray-300 border border-white/[0.06]" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {mandates.specificHooks?.length > 0 && (
                        <div>
                          <p className={`text-[9px] font-bold uppercase tracking-[0.15em] mb-1.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>Hooks</p>
                          <div className="flex flex-wrap gap-1">
                            {mandates.specificHooks.map(h => (
                              <span key={h} className={`px-2 py-0.5 rounded-md text-[11px] font-semibold
                                ${dark ? "bg-white/[0.04] text-gray-300 border border-white/[0.06]" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptySmall dark={dark} text="Set up your preferences to get matched scripts" cta={{ label: "Set Preferences", to: "/mandates" }} />
                  )}
                </Card>
              </div>

              {/* Row 2 — Portfolio Summary + Deal Funnel Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

                {/* Portfolio Summary — Donut Chart */}
                <Card dark={dark} className="p-5">
                  <CardTitle dark={dark}
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />}
                    iconBg={dark ? "bg-emerald-500/10" : "bg-emerald-50"}
                    iconColor={dark ? "text-emerald-400" : "text-emerald-600"}
                    title="Portfolio Summary" />
                  <div className="flex items-center gap-6 mt-5">
                    {(() => {
                      const invested = stats.totalInvested || 0;
                      const balance = walletBalance || 0;
                      const total = invested + balance;
                      const pct = total > 0 ? Math.round((invested / total) * 100) : 0;
                      const r = 38;
                      const circ = 2 * Math.PI * r;
                      const offset = circ - (pct / 100) * circ;
                      return (
                        <div className="relative w-24 h-24 shrink-0">
                          <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
                            <circle cx="50" cy="50" r={r} fill="none"
                              stroke={dark ? "rgba(255,255,255,0.06)" : "#f3f4f6"} strokeWidth="8" />
                            <circle cx="50" cy="50" r={r} fill="none"
                              stroke={dark ? "#10b981" : "#059669"} strokeWidth="8" strokeLinecap="round"
                              strokeDasharray={circ} strokeDashoffset={offset}
                              style={{ transition: "stroke-dashoffset 1s ease-out" }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-lg font-extrabold tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>{pct}%</span>
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>Deployed</span>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dark ? "bg-emerald-500" : "bg-emerald-600"}`} />
                        <div className="flex-1">
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>Invested</p>
                          <p className={`text-sm font-extrabold tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>₹{(stats.totalInvested || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dark ? "bg-amber-500" : "bg-amber-600"}`} />
                        <div className="flex-1">
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${dark ? "text-gray-500" : "text-gray-400"}`}>Deals</p>
                          <p className={`text-sm font-extrabold tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>{totalDealsCount}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Deal Funnel — Horizontal Bar Chart */}
                <Card dark={dark} className="p-5">
                  <CardTitle dark={dark}
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.914-.836a2.25 2.25 0 00-1.078 2.592l.383 1.53a2.25 2.25 0 002.181 1.714h3.6a2.25 2.25 0 002.18-1.714l.384-1.53a2.25 2.25 0 00-1.078-2.592L18 12.75l1.736-1.164a2.25 2.25 0 001.078-2.592l-.383-1.53A2.25 2.25 0 0018.25 5.75h-3.6a2.25 2.25 0 00-2.18 1.714l-.384 1.53a2.25 2.25 0 001.078 2.592L15 12.75l-1.736 1.164z" />}
                    iconBg={dark ? "bg-purple-500/10" : "bg-purple-50"}
                    iconColor={dark ? "text-purple-400" : "text-purple-600"}
                    title="Deal Funnel" />
                  <div className="mt-5 space-y-4">
                    {(() => {
                      const viewed = stats.totalViewed || 0;
                      const closed = closedDealsCount;
                      const invested = stats.totalInvested || 0;
                      const maxVal = Math.max(viewed, 1);
                      const conversionRate = viewed > 0 ? ((closed / viewed) * 100).toFixed(1) : "0.0";
                      const bars = [
                        { label: "Viewed", value: viewed, pct: 100, color: dark ? "bg-gray-400" : "bg-[#1e3a5f]" },
                        { label: "Deals Closed", value: closed, pct: Math.max((closed / maxVal) * 100, closed > 0 ? 8 : 0), color: dark ? "bg-emerald-500" : "bg-emerald-600" },
                        { label: "Invested", value: `₹${invested.toLocaleString()}`, pct: Math.max((closed / maxVal) * 100 * 0.7, invested > 0 ? 6 : 0), color: dark ? "bg-amber-500" : "bg-amber-600" },
                      ];
                      return (
                        <>
                          {bars.map((bar, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[11px] font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>{bar.label}</span>
                                <span className={`text-[13px] font-extrabold tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>{bar.value}</span>
                              </div>
                              <div className={`w-full h-2 rounded-full overflow-hidden ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`}>
                                <div className={`h-full rounded-full ${bar.color}`}
                                  style={{ width: `${bar.pct}%`, transition: "width 1s ease-out" }} />
                              </div>
                            </div>
                          ))}
                          <div className={`flex items-center gap-2 pt-2 border-t ${dark ? "border-white/[0.06]" : "border-gray-100"}`}>
                            <svg className={`w-3.5 h-3.5 ${dark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22" />
                            </svg>
                            <span className={`text-[11px] font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>
                              Conversion rate: <span className={`font-bold ${dark ? "text-emerald-400" : "text-emerald-600"}`}>{conversionRate}%</span>
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </Card>
              </div>

              {/* Active Options — only when investor has active holds */}
              {data?.activeHolds?.length > 0 && (
                <Card dark={dark} className="p-5 mb-4">
                  <CardTitle dark={dark}
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />}
                    iconBg={dark ? "bg-amber-500/10" : "bg-amber-50"}
                    iconColor={dark ? "text-amber-400" : "text-amber-600"}
                    title="Active Options"
                    action={<span className={`text-xs font-bold px-2 py-1 rounded-lg ${dark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>{data.activeHolds.length} active</span>} />
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.activeHolds.map(hold => (
                      <div key={hold._id}
                        onClick={() => hold.script?._id && navigate(getScriptCanonicalPath(hold.script))}
                        className={`rounded-xl p-3.5 cursor-pointer transition-all border
                          ${dark ? "bg-white/[0.02] border-white/[0.04] hover:border-amber-500/30" : "bg-amber-50/40 border-amber-100 hover:border-amber-300"}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className={`text-sm font-bold truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>
                            {hold.script?.title || "Unknown Script"}
                          </p>
                          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md
                            ${hold.daysRemaining <= 3
                              ? (dark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600")
                              : hold.daysRemaining <= 7
                                ? (dark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600")
                                : (dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")}`}>
                            {hold.daysRemaining}d left
                          </span>
                        </div>
                        <p className={`text-[11px] font-medium mb-2.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                          {hold.script?.genre || "—"}
                        </p>
                        <p className={`text-sm font-extrabold tabular-nums ${dark ? "text-amber-400" : "text-amber-600"}`}>
                          ₹{(hold.fee || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* ─ Writer Inbox ─ */}
              <Card dark={dark} className="mt-4 overflow-hidden">
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-white/[0.06]" : "border-gray-100"}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-indigo-500/10" : "bg-indigo-50"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-indigo-400" : "text-indigo-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold leading-none ${dark ? "text-gray-100" : "text-gray-800"}`}>Writer Inbox</h3>
                      <p className={`text-[10px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                        {revealedWriters.length} contact{revealedWriters.length !== 1 ? "s" : ""} unlocked
                      </p>
                    </div>
                  </div>
                  <Link to="/messages"
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${dark ? "bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}>
                    View all
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                    </svg>
                  </Link>
                </div>

                {/* Writer list */}
                {writersLoading ? (
                  <div className="px-5 py-6 space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className={`w-9 h-9 rounded-full shrink-0 ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`} />
                        <div className="flex-1 space-y-1.5">
                          <div className={`h-2.5 w-28 rounded-full ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`} />
                          <div className={`h-2 w-16 rounded-full ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : revealedWriters.length === 0 ? (
                  <div className="px-5 py-8 flex flex-col items-center text-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
                      <svg className={`w-5 h-5 ${dark ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                      </svg>
                    </div>
                    <p className={`text-xs font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>No writers unlocked yet</p>
                    <p className={`text-[11px] ${dark ? "text-gray-600" : "text-gray-400"}`}>Reveal a writer contact to start messaging</p>
                  </div>
                ) : (
                  <div className={`divide-y ${dark ? "divide-white/[0.04]" : "divide-gray-50"}`}>
                    {revealedWriters.map((writer) => {
                      const initials = (writer.name || "W").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
                      const revealedDate = writer.revealedAt ? new Date(writer.revealedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
                      const msgUrl = `/messages?recipientId=${writer._id}&recipientName=${encodeURIComponent(writer.name || "Writer")}`;
                      const profileUrl = getProfileCanonicalPath(writer, { viewerId: user?._id, viewerRole: user?.role });
                      return (
                        <div key={writer._id} className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${dark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/60"}`}>
                          {/* Avatar */}
                          <Link to={profileUrl} className="shrink-0">
                            {writer.profileImage ? (
                              <img src={writer.profileImage} alt={writer.name} className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10" />
                            ) : (
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold ring-1 ${dark ? "bg-indigo-500/10 text-indigo-300 ring-indigo-500/20" : "bg-indigo-50 text-indigo-600 ring-indigo-100"}`}>
                                {initials}
                              </div>
                            )}
                          </Link>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Link to={profileUrl} className={`text-[13px] font-semibold truncate block ${dark ? "text-gray-100 hover:text-white" : "text-gray-800 hover:text-gray-900"}`}>
                              {writer.name || "Writer"}
                            </Link>
                            <p className={`text-[10px] truncate ${dark ? "text-gray-500" : "text-gray-400"}`}>
                              {writer.bio ? writer.bio.slice(0, 40) + (writer.bio.length > 40 ? "…" : "") : writer.genre || "Writer"}
                              {revealedDate && <span className={`ml-1.5 ${dark ? "text-gray-600" : "text-gray-300"}`}>· {revealedDate}</span>}
                            </p>
                          </div>

                          {/* Message button */}
                          <Link to={msgUrl}
                            className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${dark ? "bg-white/[0.05] text-gray-300 hover:bg-indigo-500/15 hover:text-indigo-300" : "bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"}`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Message
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

            </motion.div>
          )}

          {activeTab === "finance_removed" && (
            <motion.div key="finance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              {/* Transaction Activity — Area Sparkline */}
              <Card dark={dark} className="p-5 mb-4">
                <CardTitle dark={dark}
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />}
                  iconBg={dark ? "bg-white/[0.06]" : "bg-gray-100"}
                  iconColor={dark ? "text-gray-300" : "text-[#1e3a5f]"}
                  title="Transaction Activity" />
                {(() => {
                  const debits = transactions.filter(t => t.type === "payment" || t.type === "debit");
                  // Group into 7 buckets by day
                  const now = new Date();
                  const buckets = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(now);
                    d.setDate(d.getDate() - (6 - i));
                    return { date: d, label: d.toLocaleDateString("en-US", { weekday: "short" }), total: 0 };
                  });
                  debits.forEach(txn => {
                    const txDate = new Date(txn.createdAt);
                    const dayDiff = Math.floor((now - txDate) / (1000 * 60 * 60 * 24));
                    const idx = 6 - dayDiff;
                    if (idx >= 0 && idx < 7) buckets[idx].total += txn.amount || 0;
                  });
                  const maxVal = Math.max(...buckets.map(b => b.total), 1);
                  const w = 100;
                  const h = 40;
                  const padding = 2;
                  const stepX = (w - padding * 2) / 6;
                  const points = buckets.map((b, i) => {
                    const x = padding + i * stepX;
                    const y = h - padding - ((b.total / maxVal) * (h - padding * 2 - 4));
                    return `${x},${y}`;
                  });
                  const linePath = `M${points.join(" L")}`;
                  const areaPath = `${linePath} L${padding + 6 * stepX},${h - padding} L${padding},${h - padding} Z`;
                  const strokeColor = dark ? "#3b82f6" : "#2563eb";
                  const fillColor = dark ? "rgba(59,130,246,0.1)" : "rgba(37,99,235,0.08)";

                  return debits.length > 0 ? (
                    <div className="mt-4">
                      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" preserveAspectRatio="none">
                        {/* Grid lines */}
                        {[0.25, 0.5, 0.75].map(pct => (
                          <line key={pct} x1={padding} y1={h - padding - pct * (h - padding * 2 - 4)} x2={w - padding} y2={h - padding - pct * (h - padding * 2 - 4)}
                            stroke={dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} strokeWidth="0.3" />
                        ))}
                        {/* Area fill */}
                        <path d={areaPath} fill={fillColor} />
                        {/* Line */}
                        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Dots */}
                        {buckets.map((b, i) => {
                          const x = padding + i * stepX;
                          const y = h - padding - ((b.total / maxVal) * (h - padding * 2 - 4));
                          return b.total > 0 ? <circle key={i} cx={x} cy={y} r="1.5" fill={strokeColor} /> : null;
                        })}
                      </svg>
                      {/* Day labels */}
                      <div className="flex justify-between mt-1.5 px-0.5">
                        {buckets.map((b, i) => (
                          <span key={i} className={`text-[9px] font-bold ${dark ? "text-gray-600" : "text-gray-400"}`}>{b.label}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className={`text-xs text-center py-8 ${dark ? "text-gray-600" : "text-gray-400"}`}>No recent transaction data to chart</p>
                  );
                })()}
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Wallet */}
                <Card dark={dark} className="p-5">
                  <CardTitle dark={dark}
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h5.25A2.25 2.25 0 0121 6v0m0 6v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v6z" />}
                    iconBg={dark ? "bg-emerald-500/10" : "bg-emerald-50"}
                    iconColor={dark ? "text-emerald-400" : "text-emerald-600"}
                    title="Wallet Balance" />
                  <p className={`text-3xl font-extrabold tabular-nums mt-4 ${dark ? "text-white" : "text-gray-900"}`}>
                    ₹{walletBalance.toLocaleString()}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>Available balance</p>
                </Card>

                {/* Spending Summary */}
                <Card dark={dark} className="p-5">
                  <CardTitle dark={dark}
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    iconBg={dark ? "bg-amber-500/10" : "bg-amber-50"}
                    iconColor={dark ? "text-amber-400" : "text-amber-600"}
                    title="Total Spent" />
                  <p className={`text-3xl font-extrabold tabular-nums mt-4 ${dark ? "text-white" : "text-gray-900"}`}>
                    ₹{(stats.totalInvested || 0).toLocaleString()}
                  </p>
                  {/* Spent vs Balance progress bar */}
                  {(() => {
                    const spent = stats.totalInvested || 0;
                    const balance = walletBalance || 0;
                    const total = spent + balance;
                    const spentPct = total > 0 ? Math.round((spent / total) * 100) : 0;
                    return (
                      <div className="mt-3">
                        <div className={`w-full h-2 rounded-full overflow-hidden flex ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`}>
                          <div className={`h-full ${dark ? "bg-amber-500" : "bg-amber-600"}`} style={{ width: `${spentPct}%`, transition: "width 1s ease-out" }} />
                          <div className={`h-full ${dark ? "bg-gray-500" : "bg-[#1e3a5f]"}`} style={{ width: `${100 - spentPct}%`, transition: "width 1s ease-out" }} />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${dark ? "bg-amber-500" : "bg-amber-600"}`} />
                            <span className={`text-[10px] font-semibold ${dark ? "text-gray-500" : "text-gray-400"}`}>Spent {spentPct}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${dark ? "bg-gray-500" : "bg-[#1e3a5f]"}`} />
                            <span className={`text-[10px] font-semibold ${dark ? "text-gray-500" : "text-gray-400"}`}>Balance {100 - spentPct}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </Card>

              </div>

              {/* Recent Transactions */}
              <Card dark={dark} className="p-5">
                <CardTitle dark={dark}
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />}
                  iconBg={dark ? "bg-purple-500/10" : "bg-purple-50"}
                  iconColor={dark ? "text-purple-400" : "text-purple-600"}
                  title="Recent Transactions" />
                {transactions.filter(t => t.type !== "credit").length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {transactions.filter(t => t.type !== "credit").slice(0, 8).map(txn => (
                      <div key={txn._id} className={`flex items-center gap-3 p-3 rounded-xl ${dark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"} transition-colors`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                          ${txn.type === "payment" || txn.type === "debit"
                            ? (dark ? "bg-red-500/10" : "bg-red-50")
                            : (dark ? "bg-emerald-500/10" : "bg-emerald-50")}`}>
                          <svg className={`w-3.5 h-3.5 ${txn.type === "payment" || txn.type === "debit" ? (dark ? "text-red-400" : "text-red-600") : (dark ? "text-emerald-400" : "text-emerald-600")}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d={txn.type === "payment" || txn.type === "debit"
                                ? "M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                                : "M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25"} />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${dark ? "text-gray-300" : "text-gray-700"}`}>
                            {txn.description || txn.type}
                          </p>
                          <p className={`text-[10px] font-medium mt-0.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                            {new Date(txn.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <p className={`text-sm font-bold tabular-nums
                          ${txn.type === "payment" || txn.type === "debit" ? (dark ? "text-red-400" : "text-red-600") : (dark ? "text-emerald-400" : "text-emerald-600")}`}>
                          {txn.type === "payment" || txn.type === "debit" ? "-" : "+"}₹{(txn.amount || 0).toLocaleString()}
                        </p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize
                          ${txn.status === "completed" ? (dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                            : txn.status === "failed" ? (dark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600")
                              : (dark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600")}`}>
                          {txn.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptySmall dark={dark} text="No transactions yet" />
                )}
              </Card>

              {/* Option Deals History */}
              {data?.recentDeals?.length > 0 && (
                <Card dark={dark} className="p-5 mt-4">
                  <CardTitle dark={dark}
                    icon={<><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4" /></>}
                    iconBg={dark ? "bg-indigo-500/10" : "bg-indigo-50"}
                    iconColor={dark ? "text-indigo-400" : "text-indigo-600"}
                    title="Option Deals"
                    action={<span className={`text-xs font-bold px-2 py-1 rounded-lg ${dark ? "bg-white/[0.04] text-gray-400" : "bg-gray-50 text-gray-500"}`}>{totalDealsCount} total</span>} />
                  <div className="mt-4 space-y-2">
                    {data.recentDeals.map(deal => {
                      const statusColor =
                        deal.status === "active" ? (dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                          : deal.status === "converted" ? (dark ? "bg-white/[0.06] text-gray-300" : "bg-gray-100 text-[#1e3a5f]")
                            : deal.status === "cancelled" ? (dark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600")
                              : (dark ? "bg-gray-500/10 text-gray-400" : "bg-gray-100 text-gray-500");
                      return (
                        <div key={deal._id}
                          onClick={() => deal.script?._id && navigate(getScriptCanonicalPath(deal.script))}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${dark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
                            <svg className={`w-3.5 h-3.5 ${dark ? "text-gray-400" : "text-gray-500"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${dark ? "text-gray-300" : "text-gray-700"}`}>
                              {deal.script?.title || "Unknown Script"}
                            </p>
                            <p className={`text-[10px] font-medium mt-0.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                              {deal.script?.genre || "—"} · {deal.startDate ? new Date(deal.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {deal.daysRemaining !== null && (
                              <span className={`text-[10px] font-bold ${deal.daysRemaining <= 3 ? (dark ? "text-red-400" : "text-red-600") : (dark ? "text-amber-400" : "text-amber-600")}`}>
                                {deal.daysRemaining}d left
                              </span>
                            )}
                            <p className={`text-sm font-bold tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>
                              ₹{(deal.fee || 0).toLocaleString()}
                            </p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${statusColor}`}>
                              {deal.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

            </motion.div>
          )}

        </AnimatePresence>

      </motion.div>
    </div>
  );
};


/* ═══════════════════════════════════════════════════════════════
   REUSABLE SUB-COMPONENTS
═══════════════════════════════════════════════════════════════ */

const Card = ({ dark, className = "", children }) => (
  <div className={`rounded-2xl border ${dark ? "bg-[#0a1628] border-[#162240]" : "bg-white border-gray-100"} ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ dark, icon, iconBg, iconColor, title, action }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
        <svg className={`w-4 h-4 ${iconColor}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <h3 className={`text-sm font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>{title}</h3>
    </div>
    {action}
  </div>
);

const EmptySmall = ({ dark, text, cta }) => (
  <div className={`flex flex-col items-center justify-center py-8 ${dark ? "text-gray-600" : "text-gray-400"}`}>
    <p className="text-xs font-semibold">{text}</p>
    {cta && (
      <Link to={cta.to} className="mt-3 px-3 py-1.5 bg-[#1e3a5f] hover:bg-[#162d4a] text-white rounded-lg text-[12px] font-semibold transition-colors">
        {cta.label}
      </Link>
    )}
  </div>
);

/* ── Script mini section (overview cards) ─────────────────── */
const ScriptSection = ({ dark, navigate, title, sub, iconBg, iconColor, iconD, scripts, seeAllTo, matched, fill }) => (
  <Card dark={dark} className="p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <svg className={`w-4 h-4 ${iconColor}`} fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth={fill ? 0 : 2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={iconD} />
          </svg>
        </div>
        <div>
          <h3 className={`text-sm font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>{title}</h3>
          <p className={`text-[11px] font-medium ${dark ? "text-gray-600" : "text-gray-400"}`}>{sub}</p>
        </div>
      </div>
      {seeAllTo && (
        <Link to={seeAllTo} className={`text-[11px] font-semibold ${dark ? "text-gray-300 hover:text-gray-200" : "text-[#1e3a5f] hover:text-[#162d4a]"}`}>
          View all →
        </Link>
      )}
    </div>
    <div className="space-y-2">
      {scripts.slice(0, 5).map(script => (
        <div key={script._id} onClick={() => navigate(getScriptCanonicalPath(script))}
          className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${dark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50"}`}>
          <div className={`w-9 h-11 rounded-lg shrink-0 overflow-hidden flex items-center justify-center
            ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`}>
            {script.coverImage
              ? <img src={script.coverImage} alt="" className="w-full h-full object-cover" />
              : <svg className={`w-4 h-4 ${dark ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>{script.title}</p>
            <p className={`text-[11px] font-medium ${dark ? "text-gray-500" : "text-gray-400"}`}>
              {script.genre}{script.creator?.name ? ` · ${script.creator.name}` : ""}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getScriptCompletionBadgeClasses(script, dark)}`}>
                {getScriptCompletionStatusLabel(script)}
              </span>
              {getScriptCompletionProgressText(script) && (
                <span className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  {getScriptCompletionProgressText(script)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {matched && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${dark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                Match
              </span>
            )}
            {script.scriptScore?.overall && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md
                ${script.scriptScore.overall >= 80
                  ? (dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                  : script.scriptScore.overall >= 60
                    ? (dark ? "bg-white/[0.06] text-gray-300" : "bg-gray-100 text-[#1e3a5f]")
                    : (dark ? "bg-white/[0.04] text-gray-400" : "bg-gray-50 text-gray-500")}`}>
                {script.scriptScore.overall}
              </span>
            )}
          </div>
        </div>
      ))}
      {scripts.length === 0 && <EmptySmall dark={dark} text="No scripts available" />}
    </div>
  </Card>
);

export default InvestorDashboard;
