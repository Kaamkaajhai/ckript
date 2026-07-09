/*
 * Sidebar.jsx — the dark navigation of the dashboard shell.
 *
 * Two pieces, matching the "Ckript Dashboard" reference:
 *
 *   1. Icon rail (94px, always visible) — burger + icon/label nav. Compact,
 *      never reflows the page.
 *   2. Overlay drawer (274px, fixed) — opened by the burger. Slides in over a
 *      backdrop and carries the richer navigation: a profile card, grouped +
 *      labelled links, a "My Projects" recents list, and logout pinned bottom.
 *
 * State (`expanded` = drawer open) is owned by DashboardShell so the whole
 * shell shares one consistent chrome. Presentational only — no data fetching;
 * everything (user, routes, badges, recents, logout) arrives via props.
 */
import { Link } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import { MatIcon } from "./icons.jsx";

/** Human-readable role label for the drawer profile card. */
const roleLabel = (role) =>
  role === "reader"   ? "Reader"
  : role === "investor" ? "Investor"
  : role === "producer" ? "Producer"
  : "Screenwriter";

const Sidebar = ({
  navItems,
  drawerItems = [],
  isActive,
  expanded,
  onToggleExpanded,
  onLogout,
  // drawer identity + content
  user,
  profilePath,
  resolvedImg,
  avatarErr,
  onAvatarError,
  initials,
  recentProjects = [],
}) => (
  <>
    {/* ░░░░ ICON RAIL ░░░░ */}
    <aside className="ck-sidebar">
      <button
        type="button"
        className="ck-sidebar__menu-btn"
        onClick={onToggleExpanded}
        aria-label={expanded ? "Close menu" : "Open menu"}
        aria-expanded={expanded}
        title="Menu"
      >
        <MatIcon name="menu" size={24} />
      </button>

      <nav className="ck-sidebar__nav">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.key}
              to={item.path}
              state={item.fresh ? { startFresh: true } : undefined}
              className={`ck-nav-item${active ? " active" : ""}`}
              title={item.label}
            >
              <span className="ck-nav-item__icon">
                <MatIcon name={item.icon} size={25} weight={active ? 500 : 400} fill={active} />
                {item.badge > 0 && (
                  <span className="ck-nav-item__badge">{item.badge > 9 ? "9+" : item.badge}</span>
                )}
              </span>
              <span className="ck-nav-item__label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>

    {/* ░░░░ OVERLAY DRAWER ░░░░ */}
    <div
      className={`ck-backdrop${expanded ? " open" : ""}`}
      onClick={onToggleExpanded}
      aria-hidden="true"
    />
    <aside
      className={`ck-drawer ck-dscroll${expanded ? " open" : ""}`}
      aria-hidden={!expanded}
    >
      {/* Header — logo + collapse */}
      <div className="ck-drawer__head">
        <span className="ck-drawer__logo">
          <BrandLogo className="h-[30px] w-auto" />
        </span>
        <button
          type="button"
          className="ck-drawer__collapse"
          onClick={onToggleExpanded}
          aria-label="Collapse menu"
          title="Collapse"
        >
          <MatIcon name="collapseLeft" size={22} />
        </button>
      </div>

      {/* Profile card */}
      <Link to={profilePath} className="ck-drawer__profile" onClick={onToggleExpanded}>
        <span className="ck-drawer__avatar">
          {resolvedImg && !avatarErr ? (
            <img src={resolvedImg} alt={user?.name || "Profile"} onError={onAvatarError} />
          ) : (
            initials
          )}
        </span>
        <span className="ck-drawer__id">
          <span className="ck-drawer__name">{user?.name || "User"}</span>
          <span className="ck-drawer__role">{roleLabel(user?.role)}</span>
        </span>
        <MatIcon name="chevronRight" size={20} className="ck-drawer__id-chev" />
      </Link>

      {/* Nav */}
      <nav className="ck-drawer__nav">
        {drawerItems.map((item, i) =>
          item.divider ? (
            <div key={`div-${i}`} className="ck-drawer__divider" />
          ) : (
            <Link
              key={item.key}
              to={item.path}
              state={item.fresh ? { startFresh: true } : undefined}
              className={`ck-drawer__link${isActive(item) ? " active" : ""}`}
              onClick={onToggleExpanded}
            >
              <MatIcon name={item.icon} size={22} fill={isActive(item)} />
              <span className="ck-drawer__link-label">{item.label}</span>
              {item.badge > 0 && (
                <span className="ck-drawer__link-badge">{item.badge > 9 ? "9+" : item.badge}</span>
              )}
            </Link>
          )
        )}
      </nav>

      {/* My Projects — recents */}
      {recentProjects.length > 0 && (
        <>
          <div className="ck-drawer__section">
            <MatIcon name="chevronDown" size={18} />
            My Projects
          </div>
          <div className="ck-drawer__recents">
            {recentProjects.map((p) => (
              <Link
                key={p.id}
                to={p.path}
                className="ck-drawer__recent"
                title={p.title}
                onClick={onToggleExpanded}
              >
                <span className="ck-drawer__recent-dot" />
                <span className="ck-drawer__recent-title">{p.title}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Logout — pinned bottom */}
      <button type="button" className="ck-drawer__logout" onClick={onLogout}>
        <MatIcon name="logout" size={22} />
        Log out
      </button>
    </aside>
  </>
);

export default Sidebar;
