import { useContext, useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { useDarkMode } from "../context/DarkModeContext";
import Sidebar from "../components/Sidebar";
import BrandLogo from "../components/BrandLogo";
import ConfirmDialog from "../components/ConfirmDialog";
import api from "../services/api";
import { decideIncomingFollowRequest } from "../pages/profile/authenticatedProfile";
import { getApiOrigin, isSocketSupported } from "../utils/apiOrigin";
import { getProfileCanonicalPath } from "../utils/profilePath";
import { getNotificationActionLabel, getNotificationTarget } from "./app-shell/hooks/notificationTargets";

const SOCKET_ORIGIN = getApiOrigin() || (typeof window !== "undefined" ? window.location.origin : "");
const POPUP_STACK_LIMIT = 1;
const POPUP_STORAGE_LIMIT = 12;
const NOTIFICATION_POLL_INTERVAL_MS = 30000;
const NOTIFICATION_REFRESH_DEBOUNCE_MS = 350;
const MotionDiv = motion.div;

const MainLayout = ({ children, contentVariant = "page" }) => {
  const { user, logout } = useContext(AuthContext);
  const { openPricingModal, openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [notificationPopups, setNotificationPopups] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [sidebarToggleToken, setSidebarToggleToken] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "1"; } catch { return false; }
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebarCollapsed", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const notificationRefreshTimeoutRef = useRef(null);
  const seenNotificationIdsRef = useRef(new Set());

  const topBarHomePath = user?.role === "reader" ? "/reader" : "/dashboard";
  const topBarHomeLabel = user?.role === "reader" ? "Reader Home" : "Dashboard";
  const topBarProfilePath = getProfileCanonicalPath(user, {
    viewerId: user?._id,
    viewerRole: user?.role,
  });

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const popupSeenStorageKey = user?._id ? `notification-popup-seen-${user._id}` : "";

  const readSeenPopupIds = useCallback(() => {
    if (!popupSeenStorageKey || typeof window === "undefined") return [];

    try {
      const parsed = JSON.parse(sessionStorage.getItem(popupSeenStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [popupSeenStorageKey]);

  const persistSeenPopupIds = useCallback((ids) => {
    if (!popupSeenStorageKey || typeof window === "undefined") return;

    sessionStorage.setItem(
      popupSeenStorageKey,
      JSON.stringify([...new Set(ids.filter(Boolean))].slice(-POPUP_STORAGE_LIMIT * 3))
    );
  }, [popupSeenStorageKey]);

  const rememberPopupSeen = useCallback((notificationId) => {
    if (!notificationId) return;

    const nextIds = new Set(seenNotificationIdsRef.current);
    nextIds.add(notificationId);
    seenNotificationIdsRef.current = nextIds;
    persistSeenPopupIds([...nextIds]);
  }, [persistSeenPopupIds]);

  const dismissNotificationPopup = useCallback((notificationId, { rememberSeen = true } = {}) => {
    if (rememberSeen) rememberPopupSeen(notificationId);
    setNotificationPopups((prev) => prev.filter((notification) => notification._id !== notificationId));
  }, [rememberPopupSeen]);

  const dismissAllNotificationPopups = useCallback(() => {
    const popupIds = notificationPopups
      .map((notification) => notification?._id)
      .filter(Boolean);

    popupIds.forEach((notificationId) => rememberPopupSeen(notificationId));
    setNotificationPopups([]);
  }, [notificationPopups, rememberPopupSeen]);

  const syncNotificationState = useCallback((nextNotifications) => {
    const normalizedNotifications = Array.isArray(nextNotifications) ? nextNotifications : [];
    const unreadIds = new Set(
      normalizedNotifications
        .filter((notification) => notification?._id && !notification?.read)
        .map((notification) => notification._id)
    );

    setNotifications(normalizedNotifications);
    setUnreadCount(unreadIds.size);
    setNotificationPopups((prev) => prev.filter((notification) => unreadIds.has(notification._id)));
  }, []);

  const enqueueNotificationPopups = useCallback((incomingNotifications) => {
    const freshUnread = (Array.isArray(incomingNotifications) ? incomingNotifications : [])
      .filter((notification) => (
        notification?._id
        && !notification?.read
        && !seenNotificationIdsRef.current.has(notification._id)
      ))
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));

    if (!freshUnread.length) return;

    setNotificationPopups((prev) => {
      const existingIds = new Set(prev.map((notification) => notification._id));
      const additions = freshUnread.filter((notification) => !existingIds.has(notification._id));
      if (!additions.length) return prev;
      return [...additions, ...prev].slice(0, POPUP_STORAGE_LIMIT);
    });
  }, []);

  const fetchNotificationSnapshot = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setNotifLoading(true);

    try {
      const { data } = await api.get("/notifications");
      syncNotificationState(data);
      enqueueNotificationPopups(data);
    } catch {
      // Keep the current notification state on transient failures.
    } finally {
      if (showLoader) setNotifLoading(false);
    }
  }, [enqueueNotificationPopups, syncNotificationState]);

  const scheduleNotificationRefresh = useCallback(() => {
    if (typeof window === "undefined" || notificationRefreshTimeoutRef.current) return;

    notificationRefreshTimeoutRef.current = window.setTimeout(() => {
      notificationRefreshTimeoutRef.current = null;
      fetchNotificationSnapshot();
    }, NOTIFICATION_REFRESH_DEBOUNCE_MS);
  }, [fetchNotificationSnapshot]);

  useEffect(() => {
    seenNotificationIdsRef.current = new Set(readSeenPopupIds());
    setNotificationPopups([]);
  }, [readSeenPopupIds]);

  useEffect(() => () => {
    if (notificationRefreshTimeoutRef.current) {
      window.clearTimeout(notificationRefreshTimeoutRef.current);
    }
  }, []);

  // Fetch unread count on mount and every 30s
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnreadCount(data.count);
    } catch {
      return;
    }
  }, []);

  const fetchUnreadMessageCount = useCallback(async () => {
    if (!user) {
      setUnreadMessageCount(0);
      return;
    }
    try {
      const { data } = await api.get("/messages/unread-count");
      setUnreadMessageCount(data.count || 0);
    } catch {
      setUnreadMessageCount(0);
    }
  }, [user]);

  const refreshHeaderState = useCallback(async () => {
    const tasks = [
      fetchUnreadCount(),
      fetchUnreadMessageCount(),
    ];

    await Promise.allSettled(tasks);
  }, [fetchUnreadCount, fetchUnreadMessageCount]);

  useEffect(() => {
    if (!user) return undefined;

    refreshHeaderState();

    const interval = setInterval(() => {
      refreshHeaderState();
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshHeaderState, user]);
  useEffect(() => {
    if (!user?._id) return undefined;

    fetchNotificationSnapshot();

    const interval = window.setInterval(() => {
      fetchNotificationSnapshot();
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [fetchNotificationSnapshot, user?._id]);

  useEffect(() => {
    if (!user?.token || !user?._id || !isSocketSupported()) return undefined;

    const socket = io(SOCKET_ORIGIN, {
      auth: { token: user.token },
    });

    socket.on("connect", () => {
      socket.emit("join-notifications", user._id);
      scheduleNotificationRefresh();
    });

    socket.onAny((eventName) => {
      if (eventName === "connect" || eventName === "disconnect") return;
      scheduleNotificationRefresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [scheduleNotificationRefresh, user?._id, user?.token]);



  const handleNotifToggle = () => {
    dismissAllNotificationPopups();
    if (!notifOpen) {
      fetchNotificationSnapshot({ showLoader: true });
      handleMarkAllRead();
    }
    setNotifOpen(!notifOpen);
    setDropdownOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setNotificationPopups([]);
    } catch {
      return;
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
      dismissNotificationPopup(id, { rememberSeen: true });
    } catch {
      return;
    }
  };

  const handleDeleteNotif = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      const removed = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
      dismissNotificationPopup(id, { rememberSeen: true });
    } catch {
      return;
    }
  };

  const handleFollowRequestDecision = async (notification, decision) => {
    const fromUserId = notification?.from?._id || notification?.from;
    if (!fromUserId) return;
    try {
      const result = await decideIncomingFollowRequest({ fromUserId, decision });
      if (!result.ok) throw result.cause || new Error(result.message);
      // Remove this notification locally and refresh.
      setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
      if (!notification.read) setUnreadCount((c) => Math.max(0, c - 1));
      dismissNotificationPopup(notification._id, { rememberSeen: true });
      scheduleNotificationRefresh();
    } catch (err) {
      console.error("Follow request decision failed:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete("/notifications");
      setNotifications([]);
      setUnreadCount(0);
      setNotificationPopups([]);
    } catch {
      return;
    }
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
      script_view: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z",
      hold_expiring: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    };
    return icons[type] || icons.like;
  };

  const getNotifColor = (type) => {
    const map = {
      like:          isDarkMode ? "text-rose-400 bg-rose-500/10"       : "text-rose-500 bg-rose-50",
      comment:       isDarkMode ? "text-blue-400 bg-blue-500/10"        : "text-blue-600 bg-blue-50",
      follow:        isDarkMode ? "text-violet-400 bg-violet-500/10"   : "text-violet-600 bg-violet-50",
      follow_request: isDarkMode ? "text-violet-400 bg-violet-500/10"  : "text-violet-600 bg-violet-50",
      follow_request_accepted: isDarkMode ? "text-emerald-400 bg-emerald-500/10" : "text-emerald-600 bg-emerald-50",
      unlock:        isDarkMode ? "text-emerald-400 bg-emerald-500/10" : "text-emerald-600 bg-emerald-50",
      hold:          isDarkMode ? "text-amber-400 bg-amber-500/10"     : "text-amber-600 bg-amber-50",
      hold_expiring: isDarkMode ? "text-orange-400 bg-orange-500/10"   : "text-orange-600 bg-orange-50",
      script_score:  isDarkMode ? "text-yellow-400 bg-yellow-500/10"   : "text-yellow-600 bg-yellow-50",
      trailer_ready: isDarkMode ? "text-indigo-400 bg-indigo-500/10"   : "text-indigo-600 bg-indigo-50",
      audition:      isDarkMode ? "text-teal-400 bg-teal-500/10"       : "text-teal-600 bg-teal-50",
      smart_match:   isDarkMode ? "text-purple-400 bg-purple-500/10"   : "text-purple-600 bg-purple-50",
      profile_view:  isDarkMode ? "text-blue-400 bg-blue-500/10"       : "text-blue-600 bg-blue-50",
      script_view:   isDarkMode ? "text-sky-400 bg-sky-500/10"         : "text-sky-600 bg-sky-50",
    };
    return map[type] || (isDarkMode ? "text-[#8d8981] bg-white/5" : "text-gray-500 bg-gray-100");
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

  const getNotifTitle = (type) => {
    const titles = {
      like: "New like",
      comment: "New comment",
      follow: "New follower",
      follow_request: "Follow request",
      follow_request_accepted: "Follow request accepted",
      unlock: "Script unlocked",
      hold: "Hold update",
      hold_expiring: "Hold expiring",
      script_score: "Script score ready",
      trailer_ready: "Trailer ready",
      audition: "Audition update",
      smart_match: "Smart match",
      profile_view: "Profile view",
      script_view: "Script view",
      script_approved: "Script approved",
      script_rejected: "Script update",
      purchase: "Purchase update",
      investor_approved: "Investor approval",
      purchase_request: "Purchase request",
      purchase_approved: "Purchase approved",
      purchase_rejected: "Purchase declined",
      message_request: "Message request",
      script_pitch: "Script pitch",
      admin_alert: "Platform alert",
      collab_invite: "Collab invite",
      collab_request: "Collab request",
      collab_update: "Collab update",
      revision_update: "Revision update",
    };

    return titles[type] || "New notification";
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const openNotificationTarget = useCallback(async (notification) => {
    if (!notification?._id) return;

    try {
      await api.put(`/notifications/${notification._id}/read`);
    } catch {
      // Non-blocking so the user can still continue.
    }

    setNotifications((prev) => prev.map((item) => item._id === notification._id ? { ...item, read: true } : item));
    if (!notification.read) {
      setUnreadCount((count) => Math.max(0, count - 1));
    }

    dismissNotificationPopup(notification._id, { rememberSeen: true });

    const target = getNotificationTarget(notification, user);
    if (target) navigate(target);
    else setNotifOpen(true);
  }, [dismissNotificationPopup, navigate, user]);

  const handleLogout = () => {
    setDropdownOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/", { replace: true });
    openAuthModal();
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "").replace(/\/$/, "");
  const rawProfileImage = user?.profileImage || user?.profilePicture || "";
  const normalizedProfileImagePath = typeof rawProfileImage === "string"
    ? rawProfileImage.trim().replace(/\\/g, "/")
    : "";
  const resolvedProfileImage = normalizedProfileImagePath
    ? (normalizedProfileImagePath.startsWith("http")
      ? normalizedProfileImagePath
      : `${apiBaseUrl}${normalizedProfileImagePath.startsWith("/") ? "" : "/"}${normalizedProfileImagePath}`)
    : "";

  useEffect(() => {
    setAvatarLoadError(false);
  }, [resolvedProfileImage]);

  const visibleNotificationPopups = notificationPopups.slice(0, POPUP_STACK_LIMIT);
  const hiddenPopupCount = Math.max(0, notificationPopups.length - POPUP_STACK_LIMIT);

  // The top bar used to be one fixed navy slab in both themes, so every control inside
  // it could hard-code white. Now that it follows the theme like the rest of the shell,
  // those controls need the split too — and the icon buttons keep an inline colour
  // because index.css has dark-mode rules that outrank a utility class on the svg.
  const headerIconButtonClass = isDarkMode
    ? "text-white hover:text-white hover:bg-[#1c1c1c]"
    : "text-[#0B0A06] hover:text-[#0B0A06] hover:bg-[#f4efe6]";
  const headerIconColor = isDarkMode ? "#ffffff" : "#0B0A06";

  return (
    <>


      <div className="pointer-events-none fixed top-[78px] right-4 xl:right-6 z-[120] hidden lg:block w-[min(calc(100vw-2.5rem),28rem)]">
        <AnimatePresence initial={false}>
          {visibleNotificationPopups.map((notification, index) => (
            <div
              key={notification._id}
              className="pointer-events-auto w-full"
              style={{
                zIndex: 40 - index,
                marginTop: index === 0 ? 0 : 14,
                transform: `translate(${Math.min(index, POPUP_STACK_LIMIT - 1) * 10}px, ${Math.min(index, POPUP_STACK_LIMIT - 1) * 8}px) scale(${1 - Math.min(index, POPUP_STACK_LIMIT - 1) * 0.02})`,
                transformOrigin: "top right",
              }}
            >
              <MotionDiv
                layout
                initial={{ opacity: 0, x: 72, y: -18, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 88, y: -12, scale: 0.92 }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                  damping: 24,
                  mass: 1.05,
                  delay: index * 0.18,
                }}
                className={`relative w-full overflow-hidden rounded-[24px] border px-4 py-4 shadow-2xl backdrop-blur-2xl ${
                  isDarkMode
                    ? "bg-[#141414]/94 border-white/10 text-white shadow-black/45"
                    : "bg-white/92 border-white/70 text-gray-900 shadow-slate-300/70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${getNotifColor(notification.type)}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={getNotifIcon(notification.type)} />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 pr-1">
                        <p className={`text-[13px] font-bold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {getNotifTitle(notification.type)}
                        </p>
                        <p className={`mt-0.5 text-[11px] font-medium ${isDarkMode ? "text-[#8d8981]" : "text-gray-500"}`}>
                          {timeAgo(notification.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissNotificationPopup(notification._id)}
                        className={`w-7 h-7 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                          isDarkMode ? "text-[#8d8981] hover:bg-white/10 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        }`}
                        aria-label="Dismiss notification popup"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <p className={`mt-2 text-[12.5px] leading-5 break-words ${isDarkMode ? "text-[#cfccc5]" : "text-gray-600"}`}>
                      {notification.from?.name && (
                        <span className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {notification.from.name}{" "}
                        </span>
                      )}
                      {notification.message}
                      {notification.script?.title && (
                        <span className={`font-semibold ${isDarkMode ? "text-[#f5f2eb]" : "text-gray-800"}`}>
                          {" "}"{notification.script.title}"
                        </span>
                      )}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkOneRead(notification._id)}
                          className={`min-h-[38px] rounded-xl px-3.5 py-2 text-[11px] font-semibold transition-colors ${
                            isDarkMode ? "text-[#cfccc5] hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          Mark read
                        </button>
                      )}
                      {notification.type === "follow_request" ? (
                        <>
                          {/* Primary is ink, and on a dark card ink has to invert or it
                              disappears into the surface — the same trick challenge.css uses. */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleFollowRequestDecision(notification, "accept"); }}
                            className={`min-h-[38px] rounded-xl px-4 py-2 text-[11px] font-semibold transition-colors ${
                              isDarkMode
                                ? "bg-[#f5f2eb] !text-[#12110f] hover:bg-white"
                                : "bg-[#161513] !text-white hover:bg-[#2c2a26]"
                            }`}
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleFollowRequestDecision(notification, "reject"); }}
                            className={`min-h-[38px] rounded-xl px-4 py-2 text-[11px] font-semibold transition-colors border ${
                              isDarkMode
                                ? "border-white/15 text-[#cfccc5] hover:bg-white/[0.05]"
                                : "border-gray-300 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openNotificationTarget(notification)}
                          className={`min-h-[38px] min-w-[88px] rounded-xl px-4 py-2 text-[11px] font-semibold transition-colors ${
                            isDarkMode
                              ? "bg-[#f5f2eb] !text-[#12110f] hover:bg-white"
                              : "bg-[#161513] !text-white hover:bg-[#2c2a26]"
                          }`}
                        >
                          {getNotificationActionLabel(notification)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </MotionDiv>
            </div>
          ))}
        </AnimatePresence>

        {hiddenPopupCount > 0 && (
          <div className="pointer-events-none mt-3 flex justify-end pr-2">
            <div className={`rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur-xl ${
              isDarkMode ? "bg-[#141414]/85 text-[#f5f2eb] border border-white/10" : "bg-white/90 text-gray-700 border border-white/70"
            }`}>
              +{hiddenPopupCount} more notification{hiddenPopupCount > 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
      
      <div className={`min-h-screen ${isDarkMode ? "bg-[#0b0b0b]" : "bg-[#FBFAF7]"}`}>
      <Sidebar
        unreadMessageCount={unreadMessageCount}
        showFloatingToggle={false}
        mobileToggleToken={sidebarToggleToken}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* Top bar */}
      <header className={`fixed top-0 right-0 left-0 md:left-[64px] ${sidebarCollapsed ? "lg:left-[64px]" : "lg:left-[270px]"} border-b px-3 max-[378px]:px-2.5 max-[340px]:px-2 sm:px-6 lg:px-8 py-2 sm:py-0 z-[90] backdrop-blur-xl ${
        isDarkMode ? "bg-[#0b0b0b]/98 border-[#242424]" : "bg-white/98 border-[#e7e5df]"
      }`}>
        <div className="flex flex-nowrap items-center gap-2 max-[378px]:gap-1.5 max-[340px]:gap-1 sm:gap-3 min-[640px]:max-[690px]:gap-2 min-h-14 sm:min-h-16">
          <button
            onClick={() => setSidebarToggleToken((v) => v + 1)}
            className={`md:hidden order-1 w-9 h-9 max-[378px]:w-8 max-[378px]:h-8 shrink-0 flex items-center justify-center rounded-xl transition-all duration-200 ${headerIconButtonClass}`}
            style={{ color: headerIconColor }}
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <svg className="w-5 h-5 max-[378px]:w-[18px] max-[378px]:h-[18px] opacity-100" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            onClick={() => navigate(topBarHomePath)}
            className="order-1 shrink min-w-0 max-w-[120px] max-[378px]:max-w-[92px] max-[340px]:max-w-[84px] flex items-center rounded-xl px-2 py-1 lg:hidden transition-colors duration-200"
            aria-label={`Go to ${topBarHomeLabel.toLowerCase()}`}
            title={topBarHomeLabel}
          >
            {/* The mark is black ink on transparent, so it needs the same invert the
                sidebar uses — on the old always-navy bar it was black on near-black. */}
            <BrandLogo className={`h-8 sm:h-9 max-[378px]:h-7 max-[340px]:h-6 w-auto max-w-full ${isDarkMode ? "brightness-0 invert" : ""}`} />
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden sm:flex min-[640px]:max-[690px]:hidden order-3 basis-full sm:order-2 sm:basis-auto sm:flex-1 sm:min-w-[200px] md:min-w-[260px] sm:max-w-[320px] md:max-w-lg items-center">
          <div className={`group flex items-center w-full rounded-xl overflow-hidden transition-all duration-300 border focus-within:border-[#D14D37] focus-within:ring-2 focus-within:ring-[#D14D37]/35 ${
            isDarkMode
              ? "border-[#242424] bg-[#141414] hover:border-[#76726a]"
              : "border-[#e7e5df] bg-[#f4efe6] hover:border-[#9a978f]"
          }`}>
            <div className={`pl-4 transition-colors ${isDarkMode ? "text-[#8d8981] group-focus-within:text-[#cfccc5]" : "text-[#9a978f] group-focus-within:text-[#57544f]"}`}>
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {/* app-search-input-dark forces white text with !important, so it can only
                ride along in dark mode — on the light bar it would erase what you type. */}
            <input
              type="text"
              placeholder="Search projects, writers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              className={`app-search-input flex-1 px-2.5 md:px-3 py-2.5 text-[13px] md:text-[14px] font-medium outline-none bg-transparent ${
                isDarkMode
                  ? "app-search-input-dark text-white !text-white placeholder-[#8d8981]"
                  : "text-[#0B0A06] placeholder-[#9a978f]"
              }`}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")}
                className={`pr-3 transition-colors ${isDarkMode ? "text-[#8d8981] hover:text-[#cfccc5]" : "text-[#9a978f] hover:text-[#57544f]"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </form>

        {/* Right side: notification + user menu */}
        <div className="order-2 sm:order-3 ml-auto flex items-center gap-1 max-[378px]:gap-0.5 sm:gap-1.5 md:gap-2 min-[640px]:max-[690px]:gap-1 relative z-[95] shrink-0">
          <button
            onClick={() => navigate("/search")}
            className={`order-1 sm:hidden min-[640px]:max-[690px]:flex max-[299px]:hidden w-9 h-9 max-[378px]:w-8 max-[378px]:h-8 flex items-center justify-center rounded-xl transition-all duration-200 ${headerIconButtonClass}`}
            style={{ color: headerIconColor }}
            aria-label="Open search"
            title="Search"
          >
            <svg className="w-5 h-5 max-[378px]:w-[18px] max-[378px]:h-[18px] opacity-100" fill="none" stroke="currentColor" strokeWidth={2.1} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Pricing Link */}
          <button
            onClick={() => openPricingModal()}
            className={`order-3 sm:order-2 flex items-center justify-center px-2.5 sm:px-3 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all bg-transparent mr-1 sm:mr-0 ${
              isDarkMode ? "!text-white hover:!text-[#f08b76]" : "!text-[#0B0A06] hover:!text-[#b8402d]"
            }`}
            title="View Pricing"
          >
            Pricing
          </button>

          {/* Notification bell */}
          <div className="order-2 sm:order-3 relative" ref={notifRef}>
            <button onClick={handleNotifToggle}
              className={`relative w-8 h-8 md:w-9 md:h-9 max-[378px]:w-[30px] max-[378px]:h-[30px] flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 ${headerIconButtonClass}`}
              style={{ color: headerIconColor }}>
              <svg className="w-5 h-5 max-[378px]:w-[18px] max-[378px]:h-[18px] opacity-100" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                // The ring punches the badge out of the bar, so it has to track the bar's
                // own fill — not a fixed colour, now that the bar has two.
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[#D14D37] text-white text-[10px] font-bold rounded-full px-1 ring-2 animate-pulse-soft ${
                  isDarkMode ? "ring-[#0b0b0b]" : "ring-white"
                }`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Panel */}
            {notifOpen && (
              <div className={`absolute right-0 mt-2 w-[min(94vw,380px)] sm:w-[360px] max-h-[min(70vh,560px)] max-[500px]:fixed max-[500px]:left-1/2 max-[500px]:right-auto max-[500px]:-translate-x-1/2 max-[500px]:top-[66px] max-[500px]:mt-0 max-[500px]:w-[min(96vw,360px)] max-[500px]:max-h-[72vh] rounded-xl z-[130] flex flex-col overflow-hidden origin-top-right animate-scaleIn ${
                isDarkMode
                  ? "bg-[#141414]/98 border border-[#242424] shadow-2xl shadow-black/50 backdrop-blur-xl"
                  : "bg-white/98 border border-gray-200 shadow-2xl shadow-gray-300/60 backdrop-blur-xl"
              }`}>
                {/* Header */}
                <div className={`flex items-center justify-between max-[500px]:items-start max-[500px]:flex-col max-[500px]:gap-2 px-4 max-[500px]:px-3 py-3 border-b ${
                  isDarkMode ? "border-[#242424]" : "border-gray-100"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-bold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isDarkMode ? "bg-white/8 text-[#8d8981]" : "bg-gray-100 text-gray-500"
                      }`}>{unreadCount}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 max-[500px]:w-full max-[500px]:justify-end">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead}
                        className={`text-[11px] max-[340px]:text-[10px] font-semibold transition-colors ${
                          isDarkMode ? "text-[#8d8981] hover:text-white" : "text-gray-400 hover:text-gray-700"
                        }`}>
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button onClick={handleClearAll}
                        className={`text-[11px] max-[340px]:text-[10px] font-semibold transition-colors ${
                          isDarkMode ? "text-[#8d8981] hover:text-red-400" : "text-gray-400 hover:text-red-500"
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
                        isDarkMode ? "border-[#242424] border-t-[#8d8981]" : "border-gray-200 border-t-gray-400"
                      }`} />
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n._id}
                        className={`relative flex items-start gap-3 max-[500px]:gap-2.5 px-4 max-[500px]:px-3 py-3 transition-colors group ${
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
                        <div className={`w-8 h-8 max-[340px]:w-7 max-[340px]:h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${getNotifColor(n.type)}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d={getNotifIcon(n.type)} />
                          </svg>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-1">
                          <p className={`text-[12.5px] max-[340px]:text-[12px] leading-[1.45] break-words ${
                            isDarkMode ? "text-[#cfccc5]" : "text-gray-600"
                          }`}>
                            {n.from?.name && (
                              <span className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                {n.from.name}{" "}
                              </span>
                            )}
                            {n.message}
                            {n.script?.title && (
                              <span className={`font-semibold ${isDarkMode ? "text-[#cfccc5]" : "text-gray-700"}`}>
                                {" "}"{n.script.title}"
                              </span>
                            )}
                          </p>
                          <p className={`text-[11px] max-[340px]:text-[10px] mt-0.5 ${isDarkMode ? "text-[#76726a]" : "text-gray-400"}`}>
                            {timeAgo(n.createdAt)}
                          </p>
                          {n.type === "follow_request" && (
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleFollowRequestDecision(n, "accept"); }}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                                    isDarkMode
                                      ? "bg-[#f5f2eb] text-[#12110f] hover:bg-white"
                                      : "bg-[#161513] text-white hover:bg-[#2c2a26]"
                                  }`}
                                >
                                  Approve
                                </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleFollowRequestDecision(n, "reject"); }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
                                  isDarkMode
                                    ? "border-white/15 text-[#cfccc5] hover:bg-white/[0.05]"
                                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Actions (hover) */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 max-[500px]:opacity-100 transition-opacity shrink-0">
                          {!n.read && (
                            <button onClick={() => handleMarkOneRead(n._id)} title="Mark as read"
                              className={`w-6 h-6 max-[340px]:w-5 max-[340px]:h-5 flex items-center justify-center rounded-md transition-colors ${
                                isDarkMode ? "text-[#76726a] hover:text-white hover:bg-white/8" : "text-gray-300 hover:text-gray-700 hover:bg-gray-100"
                              }`}>
                              <svg className="w-3 h-3 max-[340px]:w-2.5 max-[340px]:h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </button>
                          )}
                          <button onClick={() => handleDeleteNotif(n._id)} title="Delete"
                            className={`w-6 h-6 max-[340px]:w-5 max-[340px]:h-5 flex items-center justify-center rounded-md transition-colors ${
                              isDarkMode ? "text-[#76726a] hover:text-red-400 hover:bg-red-500/10" : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                            }`}>
                            <svg className="w-3 h-3 max-[340px]:w-2.5 max-[340px]:h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${
                        isDarkMode ? "bg-[#1c1c1c]" : "bg-gray-100"
                      }`}>
                        <svg className={`w-5 h-5 ${isDarkMode ? "text-[#76726a]" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                      </div>
                      <p className={`text-[13px] font-semibold ${isDarkMode ? "text-[#8d8981]" : "text-gray-500"}`}>
                        All caught up
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>



          {/* User menu */}
          <div className="order-5 hidden sm:block min-[640px]:max-[690px]:hidden relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-200 ${isDarkMode ? "hover:bg-[#1c1c1c]" : "hover:bg-[#f4efe6]"}`}>
              {resolvedProfileImage && !avatarLoadError ? (
                <img
                  src={resolvedProfileImage}
                  alt={user?.name || "User"}
                  onError={() => setAvatarLoadError(true)}
                  className={`w-8 h-8 rounded-xl object-cover ring-2 transition-shadow ${isDarkMode ? "ring-[#242424]" : "ring-[#e7e5df]"}`}
                />
              ) : (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ring-1 ${
                  isDarkMode ? "bg-[#1c1c1c] text-[#cfccc5] ring-[#242424]" : "bg-[#f4efe6] text-[#57544f] ring-[#e7e5df]"
                }`}>
                  {initials}
                </div>
              )}
              <span className={`hidden lg:block text-[14px] font-semibold ${isDarkMode ? "text-white" : "text-[#0B0A06]"}`}>{user?.name || "User"}</span>
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""} ${isDarkMode ? "text-[#8d8981]" : "text-[#9a978f]"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border py-1.5 z-[130] origin-top-right animate-scaleIn ${isDarkMode ? "bg-[#141414]/98 border-[#242424] backdrop-blur-xl" : "bg-white/98 border-gray-200/80 shadow-gray-300/50 backdrop-blur-xl"}`}>
                <button onClick={() => { navigate(topBarProfilePath); setDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${isDarkMode ? "text-[#8d8981] hover:bg-white/[0.05] hover:text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>

                <button onClick={() => { navigate("/contact"); setDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${isDarkMode ? "text-[#8d8981] hover:bg-white/[0.05] hover:text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 8.25v7.5a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 15.75v-7.5m19.5 0A2.25 2.25 0 0019.5 6h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-8.69 5.214a2.25 2.25 0 01-2.32 0L2.25 8.25" />
                  </svg>
                  Contact
                </button>


                <button onClick={() => { navigate("/terms-of-service"); setDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${isDarkMode ? "text-[#8d8981] hover:bg-white/[0.05] hover:text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  T and C
                </button>

                <button onClick={() => { navigate("/privacy-policy"); setDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${isDarkMode ? "text-[#8d8981] hover:bg-white/[0.05] hover:text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M20.25 12a8.25 8.25 0 11-16.5 0 8.25 8.25 0 0116.5 0z" />
                  </svg>
                  Privacy
                </button>

                <div className={`border-t my-1 ${isDarkMode ? "border-[#242424]" : "border-gray-100"}`}></div>
                <button onClick={handleLogout}
                  className={`w-full text-left px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${isDarkMode ? "text-[#8d8981] hover:bg-white/[0.05] hover:text-red-400" : "text-gray-500 hover:bg-gray-50"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      {/* Main content */}
      <main className={`pt-20 sm:pt-16 pb-0 md:ml-[64px] ${sidebarCollapsed ? "lg:ml-[64px]" : "lg:ml-[270px]"} min-h-screen`}>
        <div className={contentVariant === "full" ? "w-full" : "w-full mx-auto p-4 sm:p-6 lg:p-8 max-w-[1400px]"}>
          {children}
        </div>
      </main>
    </div>

    <ConfirmDialog
      open={showLogoutConfirm}
      title="Log out"
      message="Are you sure you want to log out of your account?"
      confirmText="Log out"
      cancelText="Cancel"
      onConfirm={confirmLogout}
      onCancel={() => setShowLogoutConfirm(false)}
      isDarkMode={isDarkMode}
    />
    </>
  );
};

export default MainLayout;
