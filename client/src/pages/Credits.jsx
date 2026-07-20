import { useState, useEffect, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Coins, Zap, Sparkles, TrendingUp, TrendingDown, ShoppingCart,
  History, ArrowUpRight, ArrowDownLeft, Gift, Star, Crown, Rocket,
  CheckCircle2, Clock, ChevronLeft, ChevronRight, CreditCard, BarChart3,
  RefreshCw, Info, FileText, Eye, MessageSquare, Loader2, Video, Brain,
  Award, ArrowRight, Flame, Activity, Plus,
} from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";
import { AuthContext } from "../context/AuthContext";
import BuyCreditsModal from "../components/BuyCreditsModal";
import api from "../services/api";

const Credits = () => {
  const { isDarkMode: dark } = useDarkMode();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState("services");


  const isWriterUser = ["creator", "writer"].includes(String(user?.role || "").toLowerCase());

  useEffect(() => {
    if (user && user.role === "investor") navigate("/dashboard");
  }, [user, navigate]);

  const fetchBalance = useCallback(async () => {
    try {
      const { data } = await api.get("/credits/balance");
      setBalance(data);
    } catch {
      setBalance({ balance: 0, totalPurchased: 0, totalSpent: 0 });
    }
  }, []);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      setHistoryLoading(true);
      const { data } = await api.get(`/credits/history?page=${page}&limit=10`);
      setHistory(data.transactions || []);
      setHistoryTotal(data.total || 0);
      setHistoryTotalPages(data.totalPages || 1);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchPricing = useCallback(async () => {
    try {
      const { data } = await api.get("/credits/pricing");
      setPricing(data.services);
    } catch {
      setPricing(null);
    }
  }, []);



  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchBalance(),
        fetchHistory(1),
        fetchPricing(),
      ]);
      setLoading(false);
    };
    init();
  }, [fetchBalance, fetchHistory, fetchPricing]);

  useEffect(() => {
    if (historyPage > 1) fetchHistory(historyPage);
  }, [historyPage, fetchHistory]);

  const handlePurchaseSuccess = (data) => {
    if (data?.credits) {
      setBalance((prev) => ({
        ...prev,
        balance: data.credits.balance,
        totalPurchased: (prev?.totalPurchased || 0) + (data.credits.purchased || 0),
      }));
    }
    fetchHistory(1);
    setHistoryPage(1);
  };

  const formatNumber = (n) => new Intl.NumberFormat("en-IN").format(n || 0);

  const formatDate = (d) => {
    const date = new Date(d);
    const diff = Date.now() - date;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
  };



  const copyToClipboard = async (value) => {
    if (!value) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // Fallback below.
    }

    try {
      const temp = document.createElement("textarea");
      temp.value = value;
      temp.setAttribute("readonly", "true");
      temp.style.position = "absolute";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(temp);
      return copied;
    } catch {
      return false;
    }
  };



  const txConfig = {
    purchase: { label: "Purchase", icon: ArrowDownLeft, darkCls: "text-emerald-400 bg-emerald-500/10", lightCls: "text-emerald-700 bg-emerald-50" },
    bonus:    { label: "Bonus",    icon: Gift,          darkCls: "text-violet-400 bg-violet-500/10",   lightCls: "text-violet-700 bg-violet-50"  },
    refund:   { label: "Refund",   icon: RefreshCw,     darkCls: "text-blue-400 bg-blue-500/10",       lightCls: "text-blue-700 bg-blue-50"      },
    spent:    { label: "Used",     icon: ArrowUpRight,  darkCls: "text-orange-400 bg-orange-500/10",   lightCls: "text-orange-600 bg-orange-50"  },
  };

  const getTxConf = (type) => txConfig[type] || { label: type, icon: Coins, darkCls: "text-gray-400 bg-gray-500/10", lightCls: "text-gray-600 bg-gray-50" };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className={`w-10 h-10 border-[3px] rounded-full animate-spin ${dark ? "border-white/10 border-t-blue-400" : "border-gray-200 border-t-blue-600"}`} />
          <p className={`text-sm font-medium ${dark ? "text-white/40" : "text-gray-400"}`}>Loading credits...</p>
        </div>
      </div>
    );
  }

  const usagePercent = balance?.totalPurchased > 0
    ? Math.round((balance.totalSpent / balance.totalPurchased) * 100) : 0;
  const canBuyCredits = balance?.canPurchaseCredits !== false;

  const getCredits = (key, fallback) => pricing?.[key]?.credits ?? fallback;

  const services = [
    {
      key: "evaluation", icon: Award,
      label: "Script Evaluation", tag: "Professional",
      desc: "Industry-standard reader coverage with detailed scores across 6 dimensions.",
      credits: getCredits("aiEvaluation", 50),
      color: { dark: "text-amber-400", light: "text-amber-600", iconDark: "bg-amber-400/10", iconLight: "bg-amber-100", badgeDark: "bg-amber-400/10 text-amber-300", badgeLight: "bg-amber-50 text-amber-700", btnDark: "bg-amber-500 hover:bg-amber-400 text-white", btnLight: "bg-amber-500 hover:bg-amber-600 text-white" },
      features: ["Score across 6 dimensions", "Strengths & weaknesses", "Market assessment", "Editorial feedback"],
      onUse: async () => { try { const { data } = await api.get("/scripts/mine"); const w = (data||[]).find(s=>!s.services?.evaluation); navigate(w ? `/upload?edit=${w._id}` : "/upload"); } catch { navigate("/upload"); } },
    },
    {
      key: "aiScript", icon: Brain,
      label: "AI Script Analysis", tag: "AI Powered",
      desc: "Deep AI intelligence dissects plot structure, character arcs, and marketability.",
      credits: getCredits("scriptAnalysis", 30),
      color: { dark: "text-blue-400", light: "text-blue-600", iconDark: "bg-blue-400/10", iconLight: "bg-blue-100", badgeDark: "bg-blue-400/10 text-blue-300", badgeLight: "bg-blue-50 text-blue-700", btnDark: "bg-blue-500 hover:bg-blue-400 text-white", btnLight: "bg-blue-600 hover:bg-blue-700 text-white" },
      features: ["Plot & pacing score", "Character arc analysis", "Dialogue rating", "Genre fit index"],
      onUse: () => navigate("/upload"),
    },
    {
      key: "aiTrailer", icon: Video,
      label: "AI Concept Trailer", tag: "Text to Trailer",
      desc: "Turn your screenplay into a cinematic 60-second teaser automatically.",
      credits: getCredits("aiTrailer", 80),
      beta: true,
      color: { dark: "text-violet-400", light: "text-violet-600", iconDark: "bg-violet-400/10", iconLight: "bg-violet-100", badgeDark: "bg-violet-400/10 text-violet-300", badgeLight: "bg-violet-50 text-violet-700", btnDark: "bg-violet-500 hover:bg-violet-400 text-white", btnLight: "bg-violet-600 hover:bg-violet-700 text-white" },
      features: ["AI voiceover & narration", "Scene matching", "Title card generation", "Shareable link"],
      onUse: () => navigate("/upload"),
    },
    {
      key: "hosting", icon: Rocket,
      label: "Script Hosting", tag: "Free Forever",
      desc: "List your script in our marketplace — visible to producers and studios.",
      credits: 0,
      color: { dark: "text-emerald-400", light: "text-emerald-600", iconDark: "bg-emerald-400/10", iconLight: "bg-emerald-100", badgeDark: "bg-emerald-400/10 text-emerald-300", badgeLight: "bg-emerald-50 text-emerald-700", btnDark: "bg-emerald-500 hover:bg-emerald-400 text-white", btnLight: "bg-emerald-600 hover:bg-emerald-700 text-white" },
      features: ["Visible to producers", "SEO-optimised profile", "Download requests", "Lifetime page"],
      onUse: () => navigate("/upload"),
    },
  ];

  return (
    <>
      <BuyCreditsModal isOpen={showBuyModal} onClose={() => setShowBuyModal(false)} onSuccess={handlePurchaseSuccess} />

      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>
              Credits
            </h1>
            <p className={`text-sm mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
              Manage your credits balance and unlock professional tools
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowBuyModal(true)}
            disabled={!canBuyCredits}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow"
          >
            <Plus className="w-4 h-4" />
            Buy Credits
          </motion.button>
        </div>

        {/* ── Balance Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Main balance */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-2xl border p-5 overflow-hidden col-span-1 sm:col-span-1 ${dark ? "bg-[#0d1b2e] border-[#1a2e48]" : "bg-gradient-to-br from-blue-50 to-white border-blue-100"}`}
          >
            <div className={`absolute top-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center ${dark ? "bg-blue-500/10" : "bg-blue-100"}`}>
              <Coins className={`w-5 h-5 ${dark ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Available</p>
            <p className={`text-4xl font-black tabular-nums leading-none ${dark ? "text-white" : "text-gray-900"}`}>
              {formatNumber(balance?.balance)}
            </p>
            <p className={`text-sm font-medium mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>credits</p>
            {balance?.lastPurchase && (
              <p className={`text-[11px] mt-3 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                Last purchase: {formatDate(balance.lastPurchase)}
              </p>
            )}
          </motion.div>

          {/* Purchased */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
            className={`rounded-2xl border p-5 ${dark ? "bg-[#0d1b2e] border-[#1a2e48]" : "bg-white border-gray-100"}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${dark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
              <TrendingUp className={`w-4 h-4 ${dark ? "text-emerald-400" : "text-emerald-600"}`} />
            </div>
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Total Purchased</p>
            <p className={`text-2xl font-black tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>{formatNumber(balance?.totalPurchased)}</p>
            <p className={`text-xs mt-0.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>all time</p>
          </motion.div>

          {/* Spent + usage bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className={`rounded-2xl border p-5 ${dark ? "bg-[#0d1b2e] border-[#1a2e48]" : "bg-white border-gray-100"}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${dark ? "bg-orange-500/10" : "bg-orange-50"}`}>
              <Activity className={`w-4 h-4 ${dark ? "text-orange-400" : "text-orange-500"}`} />
            </div>
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Total Used</p>
            <p className={`text-2xl font-black tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>{formatNumber(balance?.totalSpent)}</p>
            {balance?.totalPurchased > 0 && (
              <div className="mt-3">
                <div className="flex justify-between mb-1">
                  <span className={`text-[10px] font-semibold ${dark ? "text-gray-600" : "text-gray-400"}`}>Usage</span>
                  <span className={`text-[10px] font-bold ${dark ? "text-gray-400" : "text-gray-600"}`}>{usagePercent}%</span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/[0.07]" : "bg-gray-100"}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </div>



        {/* ── Tabs ── */}
        <div className={`flex gap-1 p-1 rounded-xl w-fit ${dark ? "bg-white/[0.04]" : "bg-gray-100"}`}>
          {[{ id: "services", label: "Services", icon: Zap }, { id: "history", label: "History", icon: History }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? dark ? "bg-white/10 text-white" : "bg-white text-gray-900 shadow-sm"
                  : dark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">

          {/* SERVICES TAB */}
          {activeTab === "services" && (
            <motion.div key="services" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Hero */}
              <div className={`relative overflow-hidden rounded-2xl p-6 ${dark ? "bg-gradient-to-br from-blue-600/15 via-violet-600/8 to-transparent border border-white/[0.06]" : "bg-gradient-to-r from-blue-600 to-violet-700"}`}>
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3 ${dark ? "bg-white/10 text-white/60" : "bg-white/20 text-white"}`}>
                      <Flame className="w-3 h-3" /> Spend Your Credits
                    </span>
                    <h2 className="text-xl font-black text-white leading-tight">Invest in Your Screenplay</h2>
                    <p className={`text-sm mt-1 max-w-sm ${dark ? "text-white/45" : "text-blue-100"}`}>
                      Unlock professional-grade tools that transform your script into an industry-ready project.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/upload")}
                    className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-white text-blue-700 hover:bg-blue-50 transition-colors shadow-xl"
                  >
                    <Rocket className="w-4 h-4" /> Start a Project
                  </button>
                </div>
              </div>

              {/* Service Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((svc, i) => {
                  const IconComp = svc.icon;
                  const canAfford = svc.credits === 0 || (balance?.balance || 0) >= svc.credits;
                  const c = svc.color;
                  return (
                    <motion.div
                      key={svc.key}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all hover:shadow-lg ${dark ? "bg-[#0d1b2e] border-[#1a2e48] hover:border-[#264a70] hover:shadow-black/30" : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-gray-100/80"}`}
                    >
                      {/* Header */}
                      <div className="flex items-start gap-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${dark ? c.iconDark : c.iconLight}`}>
                          <IconComp className={`w-5 h-5 ${dark ? c.dark : c.light}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md ${dark ? c.badgeDark : c.badgeLight}`}>
                              {svc.tag}
                            </span>
                            {svc.beta && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white tracking-wide">BETA</span>
                            )}
                          </div>
                          <h3 className={`text-[15px] font-bold leading-tight ${dark ? "text-white" : "text-gray-900"}`}>{svc.label}</h3>
                          <p className={`text-xs mt-0.5 leading-relaxed ${dark ? "text-gray-500" : "text-gray-400"}`}>{svc.desc}</p>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="grid grid-cols-2 gap-1.5">
                        {svc.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5">
                            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${dark ? "text-gray-600" : "text-gray-300"}`} />
                            <span className={`text-[11px] ${dark ? "text-gray-500" : "text-gray-500"}`}>{f}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Footer */}
                      <div className={`flex items-center justify-between pt-3 border-t ${dark ? "border-[#1a2e48]" : "border-gray-50"}`}>
                        <div>
                          {svc.credits === 0 ? (
                            <span className={`text-xl font-black ${dark ? "text-emerald-400" : "text-emerald-600"}`}>FREE</span>
                          ) : (
                            <>
                              <span className={`text-2xl font-black tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>{svc.credits}</span>
                              <span className={`text-xs ml-1 font-semibold ${dark ? "text-gray-500" : "text-gray-400"}`}>credits</span>
                              <p className={`text-[10px] mt-0.5 font-medium ${canAfford ? dark ? "text-emerald-400" : "text-emerald-600" : dark ? "text-orange-400" : "text-orange-500"}`}>
                                {canAfford ? "✓ You can afford this" : `Need ${svc.credits - (balance?.balance || 0)} more`}
                              </p>
                            </>
                          )}
                        </div>
                        <button
                          onClick={svc.onUse}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${dark ? c.btnDark : c.btnLight}`}
                        >
                          Use Now <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Info strip */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${dark ? "bg-white/[0.02] border-white/[0.05]" : "bg-gray-50 border-gray-100"}`}>
                <Info className={`w-4 h-4 shrink-0 ${dark ? "text-gray-600" : "text-gray-400"}`} />
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-500"}`}>
                  Services are activated when you submit a project.{" "}
                  <button onClick={() => navigate("/upload")} className={`font-semibold underline underline-offset-2 ${dark ? "text-blue-400" : "text-blue-600"}`}>
                    Start a project
                  </button>{" "}
                  to select a service.
                </p>
              </div>
            </motion.div>
          )}

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-[#0d1b2e] border-[#1a2e48]" : "bg-white border-gray-100"}`}>

                {/* Header */}
                <div className={`px-5 py-4 border-b flex items-center justify-between ${dark ? "border-[#1a2e48] bg-white/[0.02]" : "border-gray-50 bg-gray-50/60"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? "bg-white/[0.05]" : "bg-gray-100"}`}>
                      <History className={`w-4 h-4 ${dark ? "text-gray-400" : "text-gray-500"}`} />
                    </div>
                    <div>
                      <h3 className={`text-[15px] font-bold ${dark ? "text-white" : "text-gray-900"}`}>Credit History</h3>
                      <p className={`text-[11px] ${dark ? "text-gray-600" : "text-gray-400"}`}>{historyTotal} transaction{historyTotal !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchHistory(historyPage)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${dark ? "hover:bg-white/[0.07] text-gray-500" : "hover:bg-gray-100 text-gray-400"}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* List */}
                {historyLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className={`w-6 h-6 animate-spin ${dark ? "text-gray-600" : "text-gray-400"}`} />
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
                      <Coins className={`w-7 h-7 ${dark ? "text-gray-700" : "text-gray-300"}`} />
                    </div>
                    <p className={`text-sm font-bold ${dark ? "text-gray-400" : "text-gray-500"}`}>No transactions yet</p>
                    <p className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>Purchase credits to get started</p>
                    <button
                      onClick={() => setShowBuyModal(true)}
                      className="mt-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-shadow"
                    >
                      Buy Credits
                    </button>
                  </div>
                ) : (
                  <div>
                    {history.map((tx, idx) => {
                      const conf = getTxConf(tx.type);
                      const TxIcon = conf.icon;
                      const isCredit = tx.amount >= 0;
                      return (
                        <motion.div
                          key={tx.reference || idx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.035 }}
                          className={`flex items-center gap-4 px-5 py-3.5 border-b last:border-b-0 ${dark ? "border-[#1a2e48] hover:bg-white/[0.02]" : "border-gray-50 hover:bg-gray-50/60"} transition-colors`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${dark ? conf.darkCls : conf.lightCls}`}>
                            <TxIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-semibold truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>{tx.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${dark ? conf.darkCls : conf.lightCls}`}>
                                {conf.label}
                              </span>
                              <span className={`text-[11px] ${dark ? "text-gray-600" : "text-gray-400"}`}>{formatDate(tx.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[15px] font-black tabular-nums ${isCredit ? dark ? "text-emerald-400" : "text-emerald-600" : dark ? "text-orange-400" : "text-orange-500"}`}>
                              {isCredit ? "+" : ""}{formatNumber(tx.amount)}
                            </span>
                            <p className={`text-[10px] ${dark ? "text-gray-600" : "text-gray-400"}`}>credits</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {historyTotalPages > 1 && (
                  <div className={`px-5 py-3 border-t flex items-center justify-between ${dark ? "border-[#1a2e48] bg-white/[0.02]" : "border-gray-50 bg-gray-50/60"}`}>
                    <span className={`text-xs font-medium ${dark ? "text-gray-600" : "text-gray-400"}`}>
                      Page {historyPage} of {historyTotalPages}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 ${dark ? "bg-white/[0.05] text-gray-400 hover:bg-white/[0.10]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                        disabled={historyPage === historyTotalPages}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 ${dark ? "bg-white/[0.05] text-gray-400 hover:bg-white/[0.10]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Credits;
