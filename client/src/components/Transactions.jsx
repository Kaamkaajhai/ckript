import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  Download,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Wallet,
  CreditCard,
  RefreshCw,
  Award,
  FileText
} from "lucide-react";
import api from "../services/api";

const Transactions = ({ dark }) => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchTransactions();
    fetchStats();
    fetchWallet();
  }, [currentPage, filter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20
      };
      
      if (filter !== "all") {
        if (["credit", "debit", "withdrawal", "refund"].includes(filter)) {
          params.type = filter;
        } else {
          params.status = filter;
        }
      }
      
      const { data } = await api.get("/transactions", { params });
      setTransactions(data.transactions);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/transactions/stats");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchWallet = async () => {
    try {
      const { data } = await api.get("/transactions/wallet/balance");
      setWallet(data);
    } catch (error) {
      console.error("Failed to fetch wallet:", error);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case "credit":
      case "bonus":
      case "commission":
        return <ArrowDownLeft className="w-5 h-5" />;
      case "debit":
      case "payment":
      case "withdrawal":
        return <ArrowUpRight className="w-5 h-5" />;
      case "refund":
        return <RefreshCw className="w-5 h-5" />;
      case "subscription":
        return <Award className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return dark ? "text-green-400 bg-green-500/10" : "text-green-600 bg-green-50";
      case "pending":
      case "processing":
        return dark ? "text-yellow-400 bg-yellow-500/10" : "text-yellow-600 bg-yellow-50";
      case "failed":
      case "cancelled":
        return dark ? "text-red-400 bg-red-500/10" : "text-red-600 bg-red-50";
      default:
        return dark ? "text-gray-400 bg-gray-500/10" : "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "pending":
      case "processing":
        return <Clock className="w-3.5 h-3.5" />;
      case "failed":
      case "cancelled":
        return <XCircle className="w-3.5 h-3.5" />;
      default:
        return <Loader2 className="w-3.5 h-3.5" />;
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency
    }).format(Math.abs(amount));
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(date));
  };

  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className={`rounded-2xl p-6 border ${
            dark
              ? "bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-white/[0.06]"
              : "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200/50"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              dark ? "bg-white/10" : "bg-white"
            }`}>
              <Wallet className={`w-6 h-6 ${dark ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              dark ? "bg-white/10 text-white/60" : "bg-white text-gray-600"
            }`}>
              Available
            </span>
          </div>
          <h3 className={`text-3xl font-black mb-1 ${
            dark ? "text-white" : "text-gray-900"
          }`}>
            {formatCurrency(wallet?.balance || 0, wallet?.currency)}
          </h3>
          <p className={`text-sm ${dark ? "text-white/40" : "text-gray-600"}`}>
            Current Balance
          </p>
          {wallet?.pendingBalance > 0 && (
            <div className={`mt-3 pt-3 border-t flex items-center gap-2 ${
              dark ? "border-white/10 text-yellow-400" : "border-gray-200 text-yellow-600"
            }`}>
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold">
                {formatCurrency(wallet.pendingBalance, wallet.currency)} pending
              </span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl p-6 border ${
            dark
              ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-white/[0.06]"
              : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              dark ? "bg-white/10" : "bg-white"
            }`}>
              <TrendingUp className={`w-6 h-6 ${dark ? "text-green-400" : "text-green-600"}`} />
            </div>
          </div>
          <h3 className={`text-3xl font-black mb-1 ${
            dark ? "text-white" : "text-gray-900"
          }`}>
            {formatCurrency(stats?.totalEarnings || 0)}
          </h3>
          <p className={`text-sm ${dark ? "text-white/40" : "text-gray-600"}`}>
            Total Earnings
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-2xl p-6 border ${
            dark
              ? "bg-gradient-to-br from-orange-500/10 to-red-500/10 border-white/[0.06]"
              : "bg-gradient-to-br from-orange-50 to-red-50 border-orange-200/50"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              dark ? "bg-white/10" : "bg-white"
            }`}>
              <TrendingDown className={`w-6 h-6 ${dark ? "text-orange-400" : "text-orange-600"}`} />
            </div>
          </div>
          <h3 className={`text-3xl font-black mb-1 ${
            dark ? "text-white" : "text-gray-900"
          }`}>
            {formatCurrency(stats?.totalSpending || 0)}
          </h3>
          <p className={`text-sm ${dark ? "text-white/40" : "text-gray-600"}`}>
            Total Spending
          </p>
        </motion.div>
      </div>

      {/* Transactions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`rounded-2xl border overflow-hidden ${
          dark ? "bg-[#0d1829] border-white/[0.06]" : "bg-white border-gray-200"
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b ${
          dark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-200 bg-gray-50/50"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                dark ? "bg-white/[0.07]" : "bg-gray-100"
              }`}>
                <FileText className={`w-5 h-5 ${dark ? "text-white/70" : "text-gray-600"}`} />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                  Transaction History
                </h3>
                <p className={`text-xs ${dark ? "text-white/40" : "text-gray-500"}`}>
                  {stats?.pendingTransactions > 0 && (
                    <span>{stats.pendingTransactions} pending</span>
                  )}
                </p>
              </div>
            </div>
            <button
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                dark
                  ? "bg-white/[0.07] text-white/70 hover:bg-white/[0.12]"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                dark ? "text-white/30" : "text-gray-400"
              }`} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all ${
                  dark
                    ? "bg-white/[0.03] border-white/[0.06] text-white placeholder-white/30 focus:bg-white/[0.05] focus:border-white/20"
                    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                }`}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
              className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                dark
                  ? "bg-white/[0.03] border-white/[0.06] text-white focus:bg-white/[0.05] focus:border-white/20"
                  : "bg-white border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              }`}
            >
              <option value="all">All Transactions</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Transactions */}
        <div className="divide-y divide-gray-200/50 dark:divide-white/[0.06]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className={`w-8 h-8 border-3 rounded-full animate-spin ${
                dark
                  ? "border-white/10 border-t-white/50"
                  : "border-gray-200 border-t-[#1e3a5f]"
              }`} />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                dark ? "bg-white/[0.05]" : "bg-gray-100"
              }`}>
                <FileText className={`w-8 h-8 ${dark ? "text-white/30" : "text-gray-400"}`} />
              </div>
              <p className={`text-sm font-semibold ${dark ? "text-white/50" : "text-gray-500"}`}>
                No transactions found
              </p>
              <p className={`text-xs mt-1 ${dark ? "text-white/30" : "text-gray-400"}`}>
                Your transaction history will appear here
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredTransactions.map((transaction, index) => (
                <motion.div
                  key={transaction._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`px-6 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer ${
                    dark ? "" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        transaction.amount >= 0
                          ? dark
                            ? "bg-green-500/10 text-green-400"
                            : "bg-green-50 text-green-600"
                          : dark
                          ? "bg-red-500/10 text-red-400"
                          : "bg-red-50 text-red-600"
                      }`}>
                        {getTransactionIcon(transaction.type)}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-sm font-bold truncate ${
                            dark ? "text-white" : "text-gray-900"
                          }`}>
                            {transaction.description}
                          </p>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold capitalize flex items-center gap-1 ${
                            getStatusColor(transaction.status)
                          }`}>
                            {getStatusIcon(transaction.status)}
                            {transaction.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className={`text-xs ${dark ? "text-white/40" : "text-gray-500"}`}>
                            {formatDate(transaction.createdAt)}
                          </p>
                          {transaction.reference && (
                            <>
                              <span className={dark ? "text-white/20" : "text-gray-300"}>•</span>
                              <p className={`text-xs font-mono ${
                                dark ? "text-white/30" : "text-gray-400"
                              }`}>
                                {transaction.reference}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right ml-4">
                      <p className={`text-lg font-black ${
                        transaction.amount >= 0
                          ? dark ? "text-green-400" : "text-green-600"
                          : dark ? "text-red-400" : "text-red-600"
                      }`}>
                        {transaction.amount >= 0 ? "+" : "-"}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      {transaction.paymentMethod && (
                        <p className={`text-xs capitalize mt-0.5 ${
                          dark ? "text-white/30" : "text-gray-400"
                        }`}>
                          via {transaction.paymentMethod.replace("_", " ")}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`px-6 py-4 border-t flex items-center justify-between ${
            dark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-200 bg-gray-50/50"
          }`}>
            <p className={`text-sm ${dark ? "text-white/50" : "text-gray-600"}`}>
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  dark
                    ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.10] disabled:opacity-30"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30"
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  dark
                    ? "bg-white/[0.05] text-white/70 hover:bg-white/[0.10] disabled:opacity-30"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-30"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Transactions;
