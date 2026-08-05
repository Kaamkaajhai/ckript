/*
 * AppShell — the application chrome every signed-in section renders inside.
 *
 *   <AppShell variant="page">{page}</AppShell>
 *
 * WHAT CHANGED, AND WHY
 * ---------------------
 * This was DashboardShell: the same furniture, but with the writer baked in. It
 * fetched /scripts/mine for the drawer, sent the logo to /dashboard, searched
 * "scripts, writers", and labelled everyone by guessing from a role blacklist.
 * A second shell (MainLayout, ~1000 lines) existed for everybody else and
 * reimplemented notifications, the socket and the avatar logic with different
 * bugs — and a second navigation, which is how a live competition shipped
 * unreachable for every writer.
 *
 * AppShell is that furniture with the audience pulled out into data:
 *
 *   shellPolicy       who gets which chrome        (one exhaustive role map)
 *   buildNav          what their navigation is     (one preset per audience)
 *   useShellIdentity  who they are                 (was duplicated 3×)
 *   useShellNotif…    their notification session   (was duplicated 2×)
 *   useDrawerColl…    their drawer's context list  (was hardcoded to writers)
 *
 * The component below is composition and cross-cutting state only. It contains
 * no role checks and no route strings — ask the policy, not the pathname.
 */
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import ConfirmDialog from "../../components/ConfirmDialog";
import NavRail from "./components/NavRail";
import NavDrawer from "./components/NavDrawer";
import ShellTopbar from "./components/ShellTopbar";
import NotificationToasts from "./components/NotificationToasts";
import { buildNav } from "./navigation/buildNav";
import { useShellIdentity } from "./hooks/useShellIdentity";
import { useShellNotifications } from "./hooks/useShellNotifications";
import { useDrawerCollection } from "./hooks/useDrawerCollection";
import { isWorkspaceRoute } from "./shellPolicy";
import "./app-shell.css";

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {"fill"|"page"} [props.variant="page"]
 *   "fill" — the child owns the whole content area (its own scroll and rails).
 *   "page" — the shell supplies a padded, independently scrolling column.
 */
const AppShell = ({ children, variant = "page" }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const identity = useShellIdentity(user);
  const notifications = useShellNotifications({ user, navigate });

  /*
   * The nav model is derived from the user, their canonical profile path and the
   * unread badge — memoised so the drawer's collection effect is not re-run by
   * an unrelated re-render.
   */
  const nav = useMemo(() => buildNav({
    user,
    profilePath: identity.profilePath,
    msgCount: notifications.messageCount,
  }), [user, identity.profilePath, notifications.messageCount]);

  const collection = useDrawerCollection({
    collection: nav.collection,
    active: drawerOpen,
  });

  // ── Drawer ────────────────────────────────────────────────────────────────
  /*
   * The drawer always starts closed on a fresh visit — it is a transient
   * overlay, not a layout mode, so persisting it would hide the page behind a
   * backdrop on load.
   */
  const toggleDrawer = useCallback(() => setDrawerOpen((open) => !open), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  /* Escape closes it, and the body must not scroll behind the backdrop. */
  useEffect(() => {
    if (!drawerOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Restore what was there rather than clearing it, so we do not stomp a
      // scroll lock some other component (a modal) is also holding.
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  /*
   * Close every transient surface on navigation. Previously each drawer link
   * called the toggle itself, which meant any link that forgot to left the
   * drawer open over the new page.
   *
   * Adjusted during render rather than in an effect. React's own guidance for
   * "reset state when a value changes": an effect would paint one frame with the
   * drawer still open over the new route before closing it.
   */
  const [renderedPath, setRenderedPath] = useState(location.pathname);
  if (renderedPath !== location.pathname) {
    setRenderedPath(location.pathname);
    setDrawerOpen(false);
    setNotifOpen(false);
    setMenuOpen(false);
  }

  // ── Header panels ─────────────────────────────────────────────────────────
  /*
   * Only one of the two header panels may be open at a time.
   *
   * `acknowledgeAll` is called from the handler body, NOT from inside a
   * setNotifOpen updater. Updaters must be pure — React invokes them twice in
   * StrictMode, which would have fired mark-all-read and a refetch twice for
   * every click on the bell.
   */
  const panels = useMemo(() => ({
    notifOpen,
    menuOpen,
    toggleNotifications: () => {
      // Opening the bell is also an acknowledgement.
      if (!notifOpen) notifications.acknowledgeAll();
      setNotifOpen(!notifOpen);
      setMenuOpen(false);
    },
    closeNotifications: () => setNotifOpen(false),
    toggleMenu: () => {
      setMenuOpen(!menuOpen);
      setNotifOpen(false);
    },
    closeMenu: () => setMenuOpen(false),
  }), [menuOpen, notifOpen, notifications]);

  // ── Search ────────────────────────────────────────────────────────────────
  const onSearchSubmit = useCallback((event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query) navigate(`/search?q=${encodeURIComponent(query)}`);
  }, [navigate, searchQuery]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const requestLogout = useCallback(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
    setLogoutOpen(true);
  }, []);

  const confirmLogout = useCallback(() => {
    setLogoutOpen(false);
    logout();
    navigate("/", { replace: true });
  }, [logout, navigate]);

  // ── Active-route matching ─────────────────────────────────────────────────
  const isActive = useCallback((item) => {
    if (!item?.path) return false;

    // Query strings ("…?tab=bookmarks") are a view of a page, not a page.
    const [path] = item.path.split("?");
    if (item.exact) return location.pathname === path;

    // Segment-boundary prefix match, so /upload does not light up on
    // /uploads-report.
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }, [location.pathname]);

  const contentClassName = [
    "ck-page-scroll",
    isWorkspaceRoute(location.pathname) && "ck-page-scroll--workspace",
  ].filter(Boolean).join(" ");

  return (
    <div className="ck-app-shell ck-dash-root">
      <NavRail
        items={nav.primary}
        isActive={isActive}
        menuOpen={drawerOpen}
        onToggleMenu={toggleDrawer}
      />

      <NavDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        items={nav.drawer}
        isActive={isActive}
        identity={identity}
        roleLabel={nav.roleLabel}
        collection={collection}
        onLogout={requestLogout}
      />

      <div className="ck-main-col">
        <ShellTopbar
          homePath={nav.homePath}
          searchPlaceholder={nav.searchPlaceholder}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={onSearchSubmit}
          identity={identity}
          notifications={notifications}
          panels={panels}
          onLogout={requestLogout}
        />

        <div className="ck-content-area">
          {variant === "fill"
            ? children
            : <div className={contentClassName}>{children}</div>}
        </div>
      </div>

      <NotificationToasts
        toasts={notifications.toasts}
        onOpen={notifications.openNotification}
        onDismiss={notifications.dismissToast}
        onDecideFollowRequest={notifications.decideFollowRequest}
      />

      <ConfirmDialog
        open={logoutOpen}
        title="Log out"
        message="Are you sure you want to log out of your account?"
        confirmText="Log out"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutOpen(false)}
        isDarkMode={false}
      />
    </div>
  );
};

export default AppShell;
