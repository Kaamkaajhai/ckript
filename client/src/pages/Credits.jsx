import { useState, useEffect, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";
import { AuthContext } from "../context/AuthContext";
import BuyCreditsModal from "../components/BuyCreditsModal";
import api from "../services/api";

const Credits = () => {
  const { isDarkMode: dark } = useDarkMode();
  const { user } = useContext(AuthContext);

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
          ? "text-blue-400 bg-blue-500/10"
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
        ? "from-blue-500/20 to-cyan-500/10 text-blue-400"
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
                ? "bg-gradient-to-br from-blue-600/15 via-purple-600/10 to-transparent border-blue-500/20"
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
                    dark ? "bg-blue-500/20" : "bg-blue-100"
                  }`}
                >
                  <Coins
                    className={`w-5 h-5 ${
                      dark ? "text-blue-400" : "text-blue-600"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    dark ? "text-blue-400/70" : "text-blue-600/70"
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
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    className={`text-lg font-bold ${
                      dark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    What can you do with credits?
                  </h2>
                  <p
                    className={`text-xs mt-0.5 ${
                      dark ? "text-white/40" : "text-gray-500"
                    }`}
                  >
                    Use credits to access premium features and AI tools
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pricing &&
                  Object.entries(pricing).map(([key, service], idx) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className={`group rounded-2xl border p-5 transition-all hover:shadow-lg ${
                        dark
                          ? "border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02]"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${getServiceColor(
                            key
                          )}`}
                        >
                          {getServiceIcon(key)}
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            dark
                              ? "bg-white/[0.08] text-white/80"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          {service.credits} credits
                        </div>
                      </div>
                      <h3
                        className={`text-base font-bold mb-1.5 ${
                          dark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {service.name}
                      </h3>
                      <p
                        className={`text-xs leading-relaxed ${
                          dark ? "text-white/40" : "text-gray-500"
                        }`}
                      >
                        {service.description}
                      </p>
                      {/* Affordability indicator */}
                      <div className="mt-4 pt-3 border-t flex items-center justify-between"
                        style={{ borderColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}
                      >
                        {(balance?.balance || 0) >= service.credits ? (
                          <span
                            className={`text-xs font-semibold flex items-center gap-1.5 ${
                              dark ? "text-emerald-400" : "text-emerald-600"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            You can afford this
                          </span>
                        ) : (
                          <span
                            className={`text-xs font-semibold flex items-center gap-1.5 ${
                              dark ? "text-orange-400" : "text-orange-600"
                            }`}
                          >
                            <Info className="w-3.5 h-3.5" />
                            Need {service.credits - (balance?.balance || 0)} more
                          </span>
                        )}
                        <ChevronRight
                          className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                            dark ? "text-white/20" : "text-gray-300"
                          }`}
                        />
                      </div>
                    </motion.div>
                  ))}
              </div>

              {/* Quick Tip */}
              <div
                className={`rounded-xl p-4 flex items-start gap-3 ${
                  dark
                    ? "bg-blue-500/[0.08] border border-blue-500/20"
                    : "bg-blue-50 border border-blue-200/60"
                }`}
              >
                <Info
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    dark ? "text-blue-400" : "text-blue-600"
                  }`}
                />
                <div>
                  <p
                    className={`text-sm font-bold ${
                      dark ? "text-blue-300" : "text-blue-800"
                    }`}
                  >
                    Pro Tip
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      dark ? "text-blue-400/70" : "text-blue-600/80"
                    }`}
                  >
                    Larger credit packages offer better value per credit. The
                    Enterprise pack saves you up to 40% compared to buying smaller
                    packs.
                  </p>
                </div>
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
