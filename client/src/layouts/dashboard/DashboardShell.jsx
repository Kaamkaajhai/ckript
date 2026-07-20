/*
 * DashboardShell.jsx — the shared 2B application shell.
 *
 * Composes the dark <Sidebar/> + light <Topbar/> + a content slot + the mobile
 * bottom-nav, and owns everything cross-cutting: notification polling, the
 * realtime socket, the logout flow, and the persisted "expanded rail" state.
 *
 * Any authenticated page renders inside it:  <DashboardShell>{page}</DashboardShell>
 * Nav is role-aware (see navConfig.js) so creators, readers and investors all
 * get the same chrome with the right destinations.
 */
import { useContext, useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { io } from "socket.io-client";
import { AuthContext } from "../../context/AuthContext";
import ConfirmDialog from "../../components/ConfirmDialog";
import api from "../../services/api";
import { getApiOrigin, isSocketSupported } from "../../utils/apiOrigin";
import { getScriptCanonicalPath } from "../../utils/scriptPath";
import { getProfileCanonicalPath } from "../../utils/profilePath";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { buildNav } from "./navConfig";
import { MatIcon } from "./icons.jsx";
import "../../pages/dashboard.css";

const SOCKET_ORIGIN = getApiOrigin() || (typeof window !== "undefined" ? window.location.origin : "");
const NOTIF_POLL_MS = 30000;
const POPUP_LIMIT = 1;

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
};

/**
 * @param {"fill"|"page"} [variant="page"]
 *   "fill" — the child owns the full content area (e.g. the Dashboard, which
 *            renders its own scroll column + right rail).
 *   "page" — generic pages get a padded, scrollable container for free.
 */
const DashboardShell = ({ children, variant = "page" }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount,   setUnreadCount]   = useState(0);
  const [msgCount,      setMsgCount]       = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifPopups,   setNotifPopups]   = useState([]);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [showLogout,    setShowLogout]    = useState(false);
  const [avatarErrorUrl, setAvatarErrorUrl] = useState("");
  const [searchQ,       setSearchQ]       = useState("");
  // Drawer always starts closed on each visit (no persistence) — the burger
  // opens it as a temporary, in-session overlay.
  const [expanded,        setExpanded]        = useState(false);
  const [recentProjects,  setRecentProjects]  = useState([]);

  const notifRef      = useRef(null);
  const dropdownRef   = useRef(null);
  const seenRef       = useRef(new Set());
  const refreshTimer  = useRef(null);
  const recentsLoaded = useRef(false);

  // Only the creator/writer role owns "My Projects".
  const isCreator = !["reader", "investor", "producer"].includes(user?.role);

  const profilePath = getProfileCanonicalPath(user, { viewerId: user?._id, viewerRole: user?.role });

  const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5002")
    .replace(/\/api\/?$/, "").replace(/\/$/, "");
  const rawImg = user?.profileImage || user?.profilePicture || "";
  const normalizedImg = typeof rawImg === "string" ? rawImg.trim().replace(/\\/g, "/") : "";
  const resolvedImg = normalizedImg
    ? (normalizedImg.startsWith("http") ? normalizedImg
        : `${apiBaseUrl}${normalizedImg.startsWith("/") ? "" : "/"}${normalizedImg}`)
    : "";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const avatarErr = Boolean(resolvedImg && avatarErrorUrl === resolvedImg);

  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  // ── Drawer: recents (lazy), route-close, Escape, scroll-lock ───────────────
  // Load the drawer's "My Projects" list on first open only — keeps every page
  // load free of an extra request until the user actually opens the drawer.
  useEffect(() => {
    if (!expanded || recentsLoaded.current || !isCreator) return;
    recentsLoaded.current = true;
    let disposed = false;
    (async () => {
      try {
        const { data } = await api.get("/scripts/mine");
        if (disposed) return;
        const list = (Array.isArray(data) ? data : [])
          .filter((s) => !s?.isCollaborator)
          .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
          .slice(0, 5)
          .map((s) => ({ id: s._id, title: s.title || "Untitled", path: getScriptCanonicalPath(s) }));
        setRecentProjects(list);
      } catch { recentsLoaded.current = false; /* allow a retry on next open */ }
    })();
    return () => { disposed = true; };
  }, [expanded, isCreator]);

  // Every drawer link / profile card / recent / logout calls onToggleExpanded on
  // click, so navigation from inside the drawer self-closes it — no route effect
  // needed (the backdrop covers all other chrome while it's open).

  // Escape closes the drawer; lock body scroll while it's open.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === "Escape") setExpanded(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [expanded]);

  // ── Close panels on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current    && !notifRef.current.contains(e.target))    setNotifOpen(false);
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Notification fetch ─────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
      const unread = list.filter((n) => !n.read);
      setUnreadCount(unread.length);
      const fresh = unread.filter((n) => n._id && !seenRef.current.has(n._id));
      if (fresh.length) {
        setNotifPopups((prev) => {
          const existIds = new Set(prev.map((p) => p._id));
          const toAdd = fresh.filter((n) => !existIds.has(n._id));
          return [...toAdd, ...prev].slice(0, POPUP_LIMIT);
        });
      }
    } catch { /* keep previous state */ }
  }, []);

  const fetchMsgCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/messages/unread-count");
      setMsgCount(data.count || 0);
    } catch { setMsgCount(0); }
  }, [user]);

  useEffect(() => {
    if (!user?._id) return;
    const initialRefresh = window.setTimeout(() => {
      fetchNotifs();
      fetchMsgCount();
    }, 0);
    const id = window.setInterval(fetchNotifs, NOTIF_POLL_MS);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(id);
    };
  }, [fetchNotifs, fetchMsgCount, user?._id]);

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.token || !user?._id || !isSocketSupported()) return;
    const socket = io(SOCKET_ORIGIN, { auth: { token: user.token } });
    socket.on("connect", () => socket.emit("join-notifications", user._id));
    socket.onAny((ev) => {
      if (ev === "connect" || ev === "disconnect") return;
      if (refreshTimer.current) return;
      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        fetchNotifs();
        fetchMsgCount();
      }, 350);
    });
    return () => { socket.disconnect(); if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [fetchNotifs, fetchMsgCount, user?._id, user?.token]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setNotifPopups([]);
    } catch { /* ignore */ }
  };

  const handleDeleteNotif = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => {
        const rem = prev.find((n) => n._id === id);
        if (rem && !rem.read) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n._id !== id);
      });
      dismissPopup(id);
    } catch { /* ignore */ }
  };

  const dismissPopup = (id) => {
    seenRef.current.add(id);
    setNotifPopups((prev) => prev.filter((p) => p._id !== id));
  };

  const openNotif = async (notif) => {
    if (!notif?._id) return;
    try { await api.put(`/notifications/${notif._id}/read`); } catch { /* ignore */ }
    setNotifications((prev) => prev.map((n) => n._id === notif._id ? { ...n, read: true } : n));
    if (!notif.read) setUnreadCount((c) => Math.max(0, c - 1));
    dismissPopup(notif._id);
    const scriptPath = notif?.script ? getScriptCanonicalPath(notif.script) : null;
    if (scriptPath) { navigate(scriptPath); return; }
    const profileTarget = notif?.from ? getProfileCanonicalPath(notif.from, { viewerId: user?._id, viewerRole: user?.role }) : null;
    if (profileTarget) { navigate(profileTarget); return; }
    setNotifOpen(true);
  };

  const handleNotifToggle = () => {
    if (!notifOpen) { fetchNotifs(); handleMarkAllRead(); }
    setNotifOpen((v) => !v);
    setDropdownOpen(false);
    setNotifPopups([]);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`);
  };

  const confirmLogout = () => {
    setShowLogout(false);
    logout();
    navigate("/login", { replace: true });
  };

  // ── Nav model ──────────────────────────────────────────────────────────────
  const { primary: navItems, drawer: drawerItems, mobile: mobileItems } = buildNav({ user, profilePath, msgCount });

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    if (item.path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(item.path);
  };

  const visiblePopups = notifPopups.slice(0, POPUP_LIMIT);
  const isUploadWorkspace = location.pathname === "/upload";

  return (
    <div className="ck-dash-root">
      <Sidebar
        navItems={navItems}
        drawerItems={drawerItems}
        isActive={isActive}
        expanded={expanded}
        onToggleExpanded={toggleExpanded}
        onLogout={() => { setExpanded(false); setShowLogout(true); }}
        user={user}
        profilePath={profilePath}
        resolvedImg={resolvedImg}
        avatarErr={avatarErr}
        onAvatarError={() => setAvatarErrorUrl(resolvedImg)}
        initials={initials}
        recentProjects={recentProjects}
      />

      <div className="ck-main-col">
        <Topbar
          user={user}
          profilePath={profilePath}
          resolvedImg={resolvedImg}
          avatarErr={avatarErr}
          onAvatarError={() => setAvatarErrorUrl(resolvedImg)}
          initials={initials}
          searchQ={searchQ}
          onSearchChange={setSearchQ}
          onSearch={handleSearch}
          notifRef={notifRef}
          notifOpen={notifOpen}
          notifications={notifications}
          unreadCount={unreadCount}
          onNotifToggle={handleNotifToggle}
          onMarkAllRead={handleMarkAllRead}
          onOpenNotif={openNotif}
          onDeleteNotif={handleDeleteNotif}
          dropdownRef={dropdownRef}
          dropdownOpen={dropdownOpen}
          onDropdownToggle={() => { setDropdownOpen((v) => !v); setNotifOpen(false); }}
          onLogout={() => { setDropdownOpen(false); setShowLogout(true); }}
        />

        <div className="ck-content-area">
          {variant === "fill"
            ? children
            : <div className={`ck-page-scroll${isUploadWorkspace ? " ck-page-scroll--workspace" : ""}`}>{children}</div>}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="ck-mobile-nav">
        {mobileItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.key}
              to={item.path}
              state={item.fresh ? { startFresh: true } : undefined}
              className={`ck-mobile-nav-item${active ? " active" : ""}`}
            >
              <span style={{ position: "relative" }}>
                <MatIcon name={item.icon} size={22} fill={active} />
                {item.badge > 0 && (
                  <span className="ck-nav-item__badge">{item.badge > 9 ? "9+" : item.badge}</span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Notification popups */}
      <div className="ck-notif-popup">
        <AnimatePresence initial={false}>
          {visiblePopups.map((notif) => (
            <Motion.div
              key={notif._id}
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 26 }}
              className="ck-notif-popup__card"
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div className="ck-notif-item__icon" style={{ flexShrink: 0 }}>
                  <MatIcon name="bell" size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, color: "#1c1a17", fontWeight: 600, margin: 0 }}>
                    {notif.from?.name && <span>{notif.from.name} </span>}
                    {notif.message}
                  </p>
                  <p style={{ fontSize: 11, color: "#a39d92", margin: "3px 0 0" }}>{timeAgo(notif.createdAt)}</p>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => openNotif(notif)}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#1c1a17", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ck-body)" }}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => dismissPopup(notif._id)}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #ece8e0", background: "transparent", color: "#6f695f", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ck-body)" }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </Motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={showLogout}
        title="Log out"
        message="Are you sure you want to log out of your account?"
        confirmText="Log out"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogout(false)}
        isDarkMode={false}
      />
    </div>
  );
};

export default DashboardShell;
