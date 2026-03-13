import { useContext, useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import Sidebar from "../components/Sidebar";
import BuyCreditsModal from "../components/BuyCreditsModal";
import api from "../services/api";

const MainLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch unread count on mount and every 30s
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnreadCount(data.count);
    } catch { }
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    fetchUnreadCount();
    // Only fetch credits balance for non-investors
    if (user.role !== "investor") {
      fetchCreditsBalance();
    }

    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, user]);

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch { setNotifications([]); }
    finally { setNotifLoading(false); }
  };

  const fetchCreditsBalance = async () => {
    try {
      const { data } = await api.get("/credits/balance");
      setCreditsBalance(data.balance || 0);
    } catch {
      setCreditsBalance(0);
    }
  };

  const handleCreditsUpdate = (data) => {
    setCreditsBalance(data.credits.balance);
  };

  const handleNotifToggle = () => {
    if (!notifOpen) fetchNotifications();
    setNotifOpen(!notifOpen);
    setDropdownOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { }
  };

  const handleDeleteNotif = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      const removed = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
    } catch { }
  };

  const handleClearAll = async () => {
    try {
      await api.delete("/notifications");
      setNotifications([]);
      setUnreadCount(0);
    } catch { }
  };

  const getNotifIcon = (type) => {
    const icons = {
      like: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
      comment: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
      follow: "M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z",
      unlock: "M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
      hold: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
      script_score: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
      trailer_ready: "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.875 1.875 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12h-7.5m8.625 0h7.5m-8.625 0c.621 0 1.125.504 1.125 1.125",
      audition: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
      smart_match: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
      profile_view: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z",
      hold_expiring: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    };
    return icons[type] || icons.like;
  };

  const getNotifColor = (type) => {
    const map = {
      like:          isDarkMode ? "text-rose-400 bg-rose-500/10"       : "text-rose-500 bg-rose-50",
      comment:       isDarkMode ? "text-blue-400 bg-blue-500/10"        : "text-blue-600 bg-blue-50",
      follow:        isDarkMode ? "text-violet-400 bg-violet-500/10"   : "text-violet-600 bg-violet-50",
      unlock:        isDarkMode ? "text-emerald-400 bg-emerald-500/10" : "text-emerald-600 bg-emerald-50",
      hold:          isDarkMode ? "text-amber-400 bg-amber-500/10"     : "text-amber-600 bg-amber-50",
      hold_expiring: isDarkMode ? "text-orange-400 bg-orange-500/10"   : "text-orange-600 bg-orange-50",
      script_score:  isDarkMode ? "text-yellow-400 bg-yellow-500/10"   : "text-yellow-600 bg-yellow-50",
      trailer_ready: isDarkMode ? "text-indigo-400 bg-indigo-500/10"   : "text-indigo-600 bg-indigo-50",
      audition:      isDarkMode ? "text-teal-400 bg-teal-500/10"       : "text-teal-600 bg-teal-50",
      smart_match:   isDarkMode ? "text-purple-400 bg-purple-500/10"   : "text-purple-600 bg-purple-50",
      profile_view:  isDarkMode ? "text-blue-400 bg-blue-500/10"       : "text-blue-600 bg-blue-50",
    };
    return map[type] || (isDarkMode ? "text-[#8896a7] bg-white/5" : "text-gray-500 bg-gray-100");
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <>
      <BuyCreditsModal 
        isOpen={showBuyCredits} 
        onClose={() => setShowBuyCredits(false)}
        onSuccess={handleCreditsUpdate}
      />
      
      <div className={`min-h-screen ${isDarkMode ? "bg-[#080e18]" : "bg-[#eef0f3]"}`}>
      <Sidebar />

      {/* Top bar */}
      <header className={`fixed top-0 right-0 left-0 md:left-[64px] lg:left-[270px] h-16 border-b flex items-center justify-between px-4 sm:px-6 lg:px-8 z-20 ${
        isDarkMode ? "bg-[#080e18]/95 border-[#151f2e] backdrop-blur-xl" : "glass-strong border-gray-200/60"
      }`}>
        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center flex-1 max-w-lg">
          <div className={`group flex items-center w-full rounded-xl overflow-hidden transition-all duration-300 ${
            isDarkMode
              ? "border border-[#1c2a3a] bg-[#0d1520] hover:border-[#2a3a4e] focus-within:border-[#2a3a4e] focus-within:ring-2 focus-within:ring-white/5"
              : "bg-gray-100/80 hover:bg-gray-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1e3a5f]/10 focus-within:shadow-md"
          }`}>
            <div className={`pl-4 transition-colors ${isDarkMode ? "text-[#4a5a6e] group-focus-within:text-[#8896a7]" : "text-gray-400 group-focus-within:text-[#1e3a5f]"}`}>
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search projects, writers, investors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 px-3 py-2.5 text-[14px] font-medium outline-none bg-transparent ${
                isDarkMode ? "text-white placeholder-[#3a4a5e]" : "text-gray-800 placeholder-gray-400"
              }`}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")}
                className={`pr-3 transition-colors ${isDarkMode ? "text-[#3a4a5e] hover:text-[#8896a7]" : "text-gray-300 hover:text-gray-500"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Right side: notification + user menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
              isDarkMode ? "text-amber-300 hover:bg-[#0d1520] hover:scale-105" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 hover:scale-105"
            }`}
            aria-label="Toggle dark mode"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.25-9H18m-13.5 0H3m15.364 6.364l-1.591-1.591M7.227 7.227 5.636 5.636m12.728 0-1.591 1.591M7.227 16.773l-1.591 1.591M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0112 21.75c-5.385 0-9.75-4.365-9.75-9.75 0-4.072 2.498-7.56 6.045-9.03a.75.75 0 01.986.987 7.5 7.5 0 009.764 9.765.75.75 0 01.987.986z" />
              </svg>
            )}
          </button>

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button onClick={handleNotifToggle}
              className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
                isDarkMode ? "text-[#8896a7] hover:text-white hover:bg-[#0d1520] hover:scale-105" : "text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 hover:scale-105"
              }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[#1e3a5f] text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-white animate-pulse-soft">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Panel */}
            {notifOpen && (
              <div className={`absolute right-0 mt-2 w-[360px] max-h-[500px] rounded-xl z-50 flex flex-col overflow-hidden animate-scaleIn ${
                isDarkMode
                  ? "bg-[#0b1622] border border-[#1a2a3a] shadow-2xl shadow-black/40"
                  : "bg-white border border-gray-200 shadow-xl shadow-gray-200/60"
              }`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${
                  isDarkMode ? "border-[#1a2a3a]" : "border-gray-100"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-bold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isDarkMode ? "bg-white/8 text-[#8896a7]" : "bg-gray-100 text-gray-500"
                      }`}>{unreadCount}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead}
                        className={`text-[11px] font-semibold transition-colors ${
                          isDarkMode ? "text-[#4a6a8a] hover:text-white" : "text-gray-400 hover:text-gray-700"
                        }`}>
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button onClick={handleClearAll}
                        className={`text-[11px] font-semibold transition-colors ${
                          isDarkMode ? "text-[#4a6a8a] hover:text-red-400" : "text-gray-400 hover:text-red-500"
                        }`}>
                        Clear all
                      </button>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                  {notifLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className={`w-5 h-5 border-2 rounded-full animate-spin ${
                        isDarkMode ? "border-[#1a2a3a] border-t-[#8896a7]" : "border-gray-200 border-t-gray-400"
                      }`} />
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n._id}
                        className={`relative flex items-start gap-3 px-4 py-3 transition-colors group ${
                          isDarkMode
                            ? `hover:bg-white/[0.03] ${!n.read ? "bg-white/[0.025]" : ""}`
                            : `hover:bg-gray-50 ${!n.read ? "bg-gray-50/60" : ""}`
                        }`}>
                        {/* Unread left strip */}
                        {!n.read && (
                          <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${
                            isDarkMode ? "bg-white/20" : "bg-gray-300"
                          }`} />
                        )}

                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${getNotifColor(n.type)}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d={getNotifIcon(n.type)} />
                          </svg>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-1">
                          <p className={`text-[12.5px] leading-[1.45] ${
                            isDarkMode ? "text-[#b0c0d0]" : "text-gray-600"
                          }`}>
                            {n.from?.name && (
                              <span className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                {n.from.name}{" "}
                              </span>
                            )}
                            {n.message}
                            {n.script?.title && (
                              <span className={`font-semibold ${isDarkMode ? "text-[#b0c0d0]" : "text-gray-700"}`}>
                                {" "}"{n.script.title}"
                              </span>
                            )}
                          </p>
                          <p className={`text-[11px] mt-0.5 ${isDarkMode ? "text-[#3d5470]" : "text-gray-400"}`}>
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>

                        {/* Actions (hover) */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {!n.read && (
                            <button onClick={() => handleMarkOneRead(n._id)} title="Mark as read"
                              className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                                isDarkMode ? "text-[#3d5470] hover:text-white hover:bg-white/8" : "text-gray-300 hover:text-gray-700 hover:bg-gray-100"
                              }`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                          )}
                          <button onClick={() => handleDeleteNotif(n._id)} title="Delete"
                            className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                              isDarkMode ? "text-[#3d5470] hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                            }`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${
                        isDarkMode ? "bg-[#0f1e2e]" : "bg-gray-100"
                      }`}>
                        <svg className={`w-5 h-5 ${isDarkMode ? "text-[#2a3a4e]" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                      </div>
                      <p className={`text-[13px] font-semibold ${isDarkMode ? "text-[#4a6a8a]" : "text-gray-500"}`}>
                        All caught up
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Credits Button - Hidden for investors */}
          {user?.role !== "investor" && (
            <button
              onClick={() => navigate("/credits")}
              className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm transition-all duration-200 ${
                isDarkMode
                  ? "bg-[#0a1628] border-white/[0.07] hover:bg-[#0d1c2e] hover:border-sky-500/25 hover:shadow-lg hover:shadow-sky-500/5"
                  : "bg-white border-gray-200 hover:border-sky-300 hover:bg-sky-50 shadow-sm hover:shadow-md"
              }`}
            >
              <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                isDarkMode ? "text-sky-400 group-hover:text-sky-300" : "text-sky-500 group-hover:text-sky-600"
              }`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" />
              </svg>
              <span className={`font-bold text-[13px] tabular-nums tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>{creditsBalance}</span>
              <span className={`hidden sm:inline text-[11px] font-medium ${isDarkMode ? "text-[#4a6a8a]" : "text-gray-400"}`}>CR</span>
            </button>
          )}

          {/* User menu */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${isDarkMode ? "hover:bg-[#0d1520]" : "hover:bg-gray-100"}`}>
              {user?.profileImage ? (
                <img src={user.profileImage} alt={user.name} className={`w-8 h-8 rounded-xl object-cover ring-2 transition-shadow ${isDarkMode ? "ring-[#1c2a3a]" : "ring-gray-100 hover:ring-gray-200"}`} />
              ) : (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${isDarkMode ? "bg-[#0d1520] text-[#8896a7] ring-1 ring-[#1c2a3a]" : "bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] text-white"}`}>
                  {initials}
                </div>
              )}
              <span className={`hidden sm:block text-[14px] font-semibold ${isDarkMode ? "text-white" : "text-gray-700"}`}>{user?.name || "User"}</span>
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""} ${isDarkMode ? "text-[#4a5a6e]" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl border py-1.5 z-50 animate-scaleIn ${isDarkMode ? "bg-[#0d1520] border-[#1c2a3a]" : "bg-white border-gray-200/80 shadow-gray-200/50"}`}>
                <button onClick={() => { navigate(`/profile/${user?._id || ""}`); setDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${isDarkMode ? "text-[#8896a7] hover:bg-white/[0.05] hover:text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
                {/* Credits menu item - Hidden for investors */}
                {user?.role !== "investor" && (
                  <button onClick={() => { navigate("/credits"); setDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${isDarkMode ? "text-[#8896a7] hover:bg-white/[0.05] hover:text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Credits
                  </button>
                )}
                <div className={`border-t my-1 ${isDarkMode ? "border-[#1c2a3a]" : "border-gray-100"}`}></div>
                <button onClick={() => { logout(); navigate("/login"); }}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${isDarkMode ? "text-[#8896a7] hover:bg-white/[0.05] hover:text-red-400" : "text-gray-500 hover:bg-gray-50"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16 pb-16 md:pb-0 md:ml-[64px] lg:ml-[270px] min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
    </>
  );
};

export default MainLayout;
