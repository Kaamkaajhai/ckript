import { useState, useEffect, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Coins,
  Zap,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Star,
  Crown,
  Rocket,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  CreditCard,
  BarChart3,
  RefreshCw,
  Info,
  FileText,
  Eye,
  MessageSquare,
  Loader2,
  Video,
  Brain,
  Award,
  ArrowRight,
  Flame,
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
  const [activeTab, setActiveTab] = useState("overview");

  // Redirect investors to dashboard - credits not available for investors
  useEffect(() => {
    if (user && user.role === "investor") {
      navigate("/dashboard");
    }
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
      await Promise.all([fetchBalance(), fetchHistory(1), fetchPricing()]);
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

  const formatNumber = (n) =>
    new Intl.NumberFormat("en-IN").format(n || 0);

  const formatDate = (d) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "purchase":
        return <ArrowDownLeft className="w-4 h-4" />;
      case "spent":
        return <ArrowUpRight className="w-4 h-4" />;
      case "bonus":
        return <Gift className="w-4 h-4" />;
      case "refund":
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <Coins className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "purchase":
      case "bonus":
      case "refund":
        return dark
          ? "text-emerald-400 bg-emerald-500/10"
          : "text-emerald-600 bg-emerald-50";
      case "spent":
        return dark
          ? "text-orange-400 bg-orange-500/10"
          : "text-orange-600 bg-orange-50";
      default:
        return dark
          ? "text-[#8896a7] bg-white/[0.06]"
          : "text-blue-600 bg-blue-50";
    }
  };

  const getServiceIcon = (key) => {
    switch (key) {
      case "aiEvaluation":
        return <Zap className="w-5 h-5" />;
      case "aiTrailer":
        return <Sparkles className="w-5 h-5" />;
      case "scriptAnalysis":
        return <FileText className="w-5 h-5" />;
      case "premiumReport":
        return <BarChart3 className="w-5 h-5" />;
      case "consultation":
        return <MessageSquare className="w-5 h-5" />;
      default:
        return <Star className="w-5 h-5" />;
    }
  };

  const getServiceColor = (key) => {
    const colors = {
      aiEvaluation: dark
        ? "from-yellow-500/20 to-amber-500/10 text-yellow-400"
        : "from-yellow-50 to-amber-50 text-yellow-600",
      aiTrailer: dark
        ? "from-purple-500/20 to-pink-500/10 text-purple-400"
        : "from-purple-50 to-pink-50 text-purple-600",
      scriptAnalysis: dark
        ? "from-white/[0.04] to-white/[0.02] text-[#8896a7]"
        : "from-blue-50 to-cyan-50 text-blue-600",
      premiumReport: dark
        ? "from-emerald-500/20 to-teal-500/10 text-emerald-400"
        : "from-emerald-50 to-teal-50 text-emerald-600",
      consultation: dark
        ? "from-rose-500/20 to-orange-500/10 text-rose-400"
        : "from-rose-50 to-orange-50 text-rose-600",
    };
    return colors[key] || (dark ? "from-gray-500/20 to-gray-500/10 text-gray-400" : "from-gray-50 to-gray-50 text-gray-600");
  };

  // ─── Loading State ──────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-12 h-12 border-[3px] rounded-full animate-spin ${
              dark
                ? "border-white/10 border-t-blue-400"
                : "border-gray-200 border-t-[#1e3a5f]"
            }`}
          />
          <p
            className={`text-sm font-semibold ${
              dark ? "text-white/50" : "text-gray-500"
            }`}
          >
            Loading credits...
          </p>
        </div>
      </div>
    );
  }

  const usagePercent =
    balance?.totalPurchased > 0
      ? Math.round((balance.totalSpent / balance.totalPurchased) * 100)
      : 0;

  return (
    <>
      <BuyCreditsModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        onSuccess={handlePurchaseSuccess}
      />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className={`text-2xl font-black tracking-tight ${
                dark ? "text-white" : "text-gray-900"
              }`}
            >
              Credits
            </h1>
            <p
              className={`text-sm mt-1 ${
                dark ? "text-white/40" : "text-gray-500"
              }`}
            >
              Manage your credits, view usage and purchase more
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowBuyModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
          >
            <ShoppingCart className="w-4 h-4" />
            Buy Credits
          </motion.button>
        </div>

        {/* ─── Balance Cards ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl border p-6 ${
              dark
                ? "bg-[#0d1520] border-[#1c2a3a]"
                : "bg-gradient-to-br from-blue-50 via-purple-50/50 to-white border-blue-200/60"
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
              <Coins className="w-full h-full" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    dark ? "bg-white/[0.06]" : "bg-blue-100"
                  }`}
                >
                  <Coins
                    className={`w-5 h-5 ${
                      dark ? "text-[#8896a7]" : "text-blue-600"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    dark ? "text-[#8896a7]/70" : "text-blue-600/70"
                  }`}
                >
                  Available Balance
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl font-black tabular-nums ${
                    dark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatNumber(balance?.balance)}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    dark ? "text-white/40" : "text-gray-500"
                  }`}
                >
                  credits
                </span>
              </div>
              {balance?.lastPurchase && (
                <p
                  className={`text-xs mt-3 ${
                    dark ? "text-white/30" : "text-gray-400"
                  }`}
                >
                  Last purchase: {formatDate(balance.lastPurchase)}
                </p>
              )}
            </div>
          </motion.div>

          {/* Total Purchased */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`rounded-2xl border p-6 ${
              dark
                ? "bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/15"
                : "bg-gradient-to-br from-emerald-50 to-white border-emerald-200/60"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  dark ? "bg-emerald-500/20" : "bg-emerald-100"
                }`}
              >
                <TrendingUp
                  className={`w-5 h-5 ${
                    dark ? "text-emerald-400" : "text-emerald-600"
                  }`}
                />
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  dark ? "text-emerald-400/70" : "text-emerald-600/70"
                }`}
              >
                Total Purchased
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black tabular-nums ${
                  dark ? "text-white" : "text-gray-900"
                }`}
              >
                {formatNumber(balance?.totalPurchased)}
              </span>
              <span
                className={`text-sm font-semibold ${
                  dark ? "text-white/40" : "text-gray-500"
                }`}
              >
                credits
              </span>
            </div>
          </motion.div>

          {/* Total Spent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-2xl border p-6 ${
              dark
                ? "bg-gradient-to-br from-orange-600/10 to-transparent border-orange-500/15"
                : "bg-gradient-to-br from-orange-50 to-white border-orange-200/60"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  dark ? "bg-orange-500/20" : "bg-orange-100"
                }`}
              >
                <TrendingDown
                  className={`w-5 h-5 ${
                    dark ? "text-orange-400" : "text-orange-600"
                  }`}
                />
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  dark ? "text-orange-400/70" : "text-orange-600/70"
                }`}
              >
                Total Used
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-black tabular-nums ${
                  dark ? "text-white" : "text-gray-900"
                }`}
              >
                {formatNumber(balance?.totalSpent)}
              </span>
              <span
                className={`text-sm font-semibold ${
                  dark ? "text-white/40" : "text-gray-500"
                }`}
              >
                credits
              </span>
            </div>
            {/* Usage bar */}
            {balance?.totalPurchased > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs font-semibold ${
                      dark ? "text-white/40" : "text-gray-500"
                    }`}
                  >
                    Usage
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      dark ? "text-white/60" : "text-gray-700"
                    }`}
                  >
                    {usagePercent}%
                  </span>
                </div>
                <div
                  className={`w-full h-2 rounded-full overflow-hidden ${
                    dark ? "bg-white/10" : "bg-gray-200"
                  }`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      usagePercent > 80
                        ? "bg-gradient-to-r from-red-500 to-orange-500"
                        : usagePercent > 50
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                        : "bg-gradient-to-r from-emerald-500 to-teal-500"
                    }`}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* ─── Tabs ──────────────────────────────────── */}
        <div
          className={`flex gap-1 p-1 rounded-xl ${
            dark ? "bg-white/[0.04]" : "bg-gray-100"
          }`}
        >
          {[
            { id: "overview", label: "Services", icon: Zap },
            { id: "history", label: "History", icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? dark
                    ? "bg-white/10 text-white shadow-sm"
                    : "bg-white text-gray-900 shadow-sm"
                  : dark
                  ? "text-white/40 hover:text-white/60"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Services Tab ──────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* ── Hero banner ── */}
              <div className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 ${
                dark
                  ? "bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent border border-white/[0.06]"
                  : "bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800"
              }`}>
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white blur-3xl" />
                  <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-purple-300 blur-2xl" />
                </div>
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                      dark ? "bg-white/10 text-white/70" : "bg-white/20 text-white"
                    }`}>
                      <Flame className="w-3 h-3" />
                      SPEND YOUR CREDITS
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black leading-tight ${
                      dark ? "text-white" : "text-white"
                    }`}>
                      Invest in Your Screenplay
                    </h2>
                    <p className={`text-sm mt-1.5 max-w-md ${
                      dark ? "text-white/50" : "text-blue-100"
                    }`}>
                      Unlock professional-grade tools that transform your script into an industry-ready project.
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate("/upload")}
                    className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-white text-blue-700 shadow-xl hover:bg-blue-50 transition-colors"
                  >
                    <Rocket className="w-4 h-4" />
                    Start a Project
                  </motion.button>
                </div>
              </div>

              {/* ── Service cards ── */}
              {(() => {
                const getCredits = (key, fallback) =>
                  pricing?.[key]?.credits ?? fallback;

                const services = [
                  {
                    key: "evaluation",
                    icon: Award,
                    label: "PROFESSIONAL EVALUATION",
                    name: "Script Evaluation",
                    tagline: "Industry-standard reader coverage on your screenplay.",
                    credits: getCredits("aiEvaluation", 50),
                    gradient: dark
                      ? "from-amber-500/25 to-yellow-500/10 border-amber-500/20"
                      : "from-amber-50 to-yellow-50 border-amber-200/70",
                    iconColor: dark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600",
                    badge: dark ? "bg-amber-500/15 text-amber-300" : "bg-amber-100 text-amber-700",
                    btnClass: dark
                      ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                      : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20",
                    features: [
                      "Detailed score across 6 dimensions",
                      "Strengths & weaknesses breakdown",
                      "Market potential & audience assessment",
                      "Platform editorial feedback",
                    ],
                    onUse: async () => {
                      try {
                        const { data } = await api.get("/scripts/mine");
                        const without = (data || []).find((s) => !s.services?.evaluation);
                        navigate(without ? `/upload?edit=${without._id}` : "/upload");
                      } catch {
                        navigate("/upload");
                      }
                    },
                  },
                  {
                    key: "scriptAnalysis",
                    icon: Brain,
                    label: "AI POWERED",
                    name: "AI Script Analysis",
                    tagline: "Deep AI intelligence dissects every layer of your script.",
                    credits: getCredits("scriptAnalysis", 30),
                    gradient: dark
                      ? "from-white/[0.04] to-white/[0.02] border-[#1c2a3a]"
                      : "from-blue-50 to-cyan-50 border-blue-200/70",
                    iconColor: dark ? "bg-white/[0.06] text-[#8896a7]" : "bg-blue-100 text-blue-600",
                    badge: dark ? "bg-white/[0.05] text-[#8896a7]" : "bg-blue-100 text-blue-700",
                    btnClass: dark
                      ? "bg-white/[0.06] hover:bg-white/[0.09] text-[#8896a7] border border-white/[0.08]"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20",
                    features: [
                      "Plot structure & pacing score",
                      "Character arc depth analysis",
                      "Dialogue quality rating",
                      "Marketability & genre fit index",
                    ],
                    onUse: () => navigate("/upload"),
                  },
                  {
                    key: "aiTrailer",
                    icon: Video,
                    label: "TEXT TO TRAILER",
                    name: "AI Concept Trailer",
                    tagline: "Turn your script into a cinematic 60-second teaser.",
                    credits: getCredits("aiTrailer", 80),
                    gradient: dark
                      ? "from-purple-500/25 to-pink-500/10 border-purple-500/20"
                      : "from-purple-50 to-pink-50 border-purple-200/70",
                    iconColor: dark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600",
                    badge: dark ? "bg-purple-500/15 text-purple-300" : "bg-purple-100 text-purple-700",
                    btnClass: dark
                      ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
                      : "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20",
                    features: [
                      "AI voiceover & narration",
                      "Stock footage scene matching",
                      "Cinematic title card generation",
                      "Shareable & embeddable trailer link",
                    ],
                    beta: true,
                    onUse: () => navigate("/upload"),
                  },
                  {
                    key: "hosting",
                    icon: Rocket,
                    label: "FREE FOREVER",
                    name: "Script Hosting & Discovery",
                    tagline: "List your script in our live marketplace — forever free.",
                    credits: 0,
                    gradient: dark
                      ? "from-emerald-500/25 to-teal-500/10 border-emerald-500/20"
                      : "from-emerald-50 to-teal-50 border-emerald-200/70",
                    iconColor: dark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600",
                    badge: dark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700",
                    btnClass: dark
                      ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20",
                    features: [
                      "Visible to producers & studios",
                      "SEO-optimised script profile",
                      "Download & audition requests",
                      "Lifetime project page",
                    ],
                    onUse: () => navigate("/upload"),
                  },
                ];

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map((svc, idx) => {
                      const IconComp = svc.icon;
                      const canAfford = svc.credits === 0 || (balance?.balance || 0) >= svc.credits;
                      return (
                        <motion.div
                          key={svc.key}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.07 }}
                          className={`group relative rounded-2xl border p-6 flex flex-col gap-4 bg-gradient-to-br transition-all hover:shadow-xl ${
                            dark ? "hover:shadow-black/30" : "hover:shadow-gray-200/80"
                          } ${svc.gradient}`}
                        >
                          {svc.beta && (
                            <span className="absolute top-4 right-4 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white tracking-wide">
                              BETA
                            </span>
                          )}

                          {/* Top row */}
                          <div className="flex items-start gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${svc.iconColor}`}>
                              <IconComp className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-[10px] font-black tracking-widest uppercase ${svc.badge} px-2 py-0.5 rounded-md`}>
                                {svc.label}
                              </span>
                              <h3 className={`text-base font-black mt-1.5 leading-tight ${
                                dark ? "text-white" : "text-gray-900"
                              }`}>
                                {svc.name}
                              </h3>
                              <p className={`text-xs mt-0.5 leading-relaxed ${
                                dark ? "text-white/45" : "text-gray-500"
                              }`}>
                                {svc.tagline}
                              </p>
                            </div>
                          </div>

                          {/* Features */}
                          <ul className="space-y-1.5">
                            {svc.features.map((f) => (
                              <li key={f} className="flex items-center gap-2">
                                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${
                                  dark ? "text-white/30" : "text-gray-400"
                                }`} />
                                <span className={`text-xs ${
                                  dark ? "text-white/55" : "text-gray-600"
                                }`}>{f}</span>
                              </li>
                            ))}
                          </ul>

                          {/* CTA footer */}
                          <div className={`pt-3 border-t flex items-center justify-between ${
                            dark ? "border-white/[0.07]" : "border-black/[0.06]"
                          }`}>
                            <div>
                              {svc.credits === 0 ? (
                                <span className={`text-lg font-black ${
                                  dark ? "text-emerald-400" : "text-emerald-600"
                                }`}>FREE</span>
                              ) : (
                                <>
                                  <span className={`text-2xl font-black tabular-nums ${
                                    dark ? "text-white" : "text-gray-900"
                                  }`}>{svc.credits}</span>
                                  <span className={`text-xs font-semibold ml-1 ${
                                    dark ? "text-white/40" : "text-gray-500"
                                  }`}>credits</span>
                                </>
                              )}
                              {svc.credits > 0 && (
                                <p className={`text-[10px] mt-0.5 ${
                                  canAfford
                                    ? dark ? "text-emerald-400" : "text-emerald-600"
                                    : dark ? "text-orange-400" : "text-orange-500"
                                }`}>
                                  {canAfford ? "✓ You can afford this" : `Need ${svc.credits - (balance?.balance || 0)} more`}
                                </p>
                              )}
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => svc.onUse ? svc.onUse() : navigate("/upload")}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${svc.btnClass}`}
                            >
                              Use Now
                              <ArrowRight className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* ── Bottom tip ── */}
              <div className={`rounded-xl p-4 flex items-start gap-3 ${
                dark
                  ? "bg-white/[0.03] border border-white/[0.06]"
                  : "bg-gray-50 border border-gray-200/80"
              }`}>
                <Info className={`w-4 h-4 shrink-0 mt-0.5 ${
                  dark ? "text-white/30" : "text-gray-400"
                }`} />
                <p className={`text-xs leading-relaxed ${
                  dark ? "text-white/40" : "text-gray-500"
                }`}>
                  Services are applied at the time of project submission.{" "}
                  <button
                    onClick={() => navigate("/upload")}
                    className={`font-bold underline underline-offset-2 ${
                      dark ? "text-[#8896a7]" : "text-blue-600"
                    }`}
                  >
                    Start a new project
                  </button>{" "}
                  to select and activate any of these services.
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── History Tab ─────────────────────────── */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`rounded-2xl border overflow-hidden ${
                dark
                  ? "bg-[#0d1829] border-white/[0.06]"
                  : "bg-white border-gray-200"
              }`}
            >
              {/* Header */}
              <div
                className={`px-6 py-4 border-b flex items-center justify-between ${
                  dark
                    ? "border-white/[0.06] bg-white/[0.02]"
                    : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      dark ? "bg-white/[0.07]" : "bg-gray-100"
                    }`}
                  >
                    <History
                      className={`w-4 h-4 ${
                        dark ? "text-white/60" : "text-gray-600"
                      }`}
                    />
                  </div>
                  <div>
                    <h3
                      className={`text-base font-bold ${
                        dark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Credit Transactions
                    </h3>
                    <p
                      className={`text-xs ${
                        dark ? "text-white/30" : "text-gray-400"
                      }`}
                    >
                      {historyTotal} total transactions
                    </p>
                  </div>
                </div>
              </div>

              {/* List */}
              <div>
                {historyLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2
                      className={`w-6 h-6 animate-spin ${
                        dark ? "text-white/30" : "text-gray-400"
                      }`}
                    />
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                        dark ? "bg-white/[0.05]" : "bg-gray-100"
                      }`}
                    >
                      <Coins
                        className={`w-7 h-7 ${
                          dark ? "text-white/20" : "text-gray-300"
                        }`}
                      />
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        dark ? "text-white/50" : "text-gray-500"
                      }`}
                    >
                      No transactions yet
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        dark ? "text-white/30" : "text-gray-400"
                      }`}
                    >
                      Purchase credits to get started
                    </p>
                    <button
                      onClick={() => setShowBuyModal(true)}
                      className="mt-4 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition-shadow"
                    >
                      Buy Credits
                    </button>
                  </div>
                ) : (
                  <div>
                    {history.map((tx, idx) => (
                      <motion.div
                        key={tx.reference || idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`flex items-center gap-4 px-6 py-4 border-b last:border-b-0 transition-colors ${
                          dark
                            ? "border-white/[0.04] hover:bg-white/[0.02]"
                            : "border-gray-50 hover:bg-gray-50/50"
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getTypeColor(
                            tx.type
                          )}`}
                        >
                          {getTypeIcon(tx.type)}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-bold truncate ${
                              dark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {tx.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-xs capitalize px-2 py-0.5 rounded-md font-semibold ${getTypeColor(
                                tx.type
                              )}`}
                            >
                              {tx.type}
                            </span>
                            <span
                              className={`text-xs ${
                                dark ? "text-white/30" : "text-gray-400"
                              }`}
                            >
                              {formatDate(tx.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-base font-black tabular-nums ${
                              tx.amount >= 0
                                ? dark
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
                                : dark
                                ? "text-orange-400"
                                : "text-orange-600"
                            }`}
                          >
                            {tx.amount >= 0 ? "+" : ""}
                            {formatNumber(tx.amount)}
                          </span>
                          <p
                            className={`text-xs ${
                              dark ? "text-white/30" : "text-gray-400"
                            }`}
                          >
                            credits
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {historyTotalPages > 1 && (
                <div
                  className={`px-6 py-3 border-t flex items-center justify-between ${
                    dark
                      ? "border-white/[0.06] bg-white/[0.02]"
                      : "border-gray-100 bg-gray-50/50"
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${
                      dark ? "text-white/40" : "text-gray-500"
                    }`}
                  >
                    Page {historyPage} of {historyTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setHistoryPage((p) => Math.max(1, p - 1))
                      }
                      disabled={historyPage === 1}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 ${
                        dark
                          ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.10]"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setHistoryPage((p) =>
                          Math.min(historyTotalPages, p + 1)
                        )
                      }
                      disabled={historyPage === historyTotalPages}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 ${
                        dark
                          ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.10]"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Credits;
