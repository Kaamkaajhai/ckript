/*
 * Topbar.jsx — the light header of the 2B dashboard shell.
 *
 * Logo · search · pricing · notifications · user menu. Presentational: all
 * notification/session state lives in DashboardShell and arrives via props so
 * the same header can sit above any page.
 */
import { Link } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import { MatIcon } from "./icons.jsx";

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
};

const NOTIF_ICONS = {
  like: "favorite",
  comment: "chat_bubble",
  follow: "person_add",
  follow_request: "person_add",
  unlock: "lock_open",
  script_score: "star",
  trailer_ready: "movie",
  message_request: "chat",
  default: "notifications",
};
const notifIcon = (type) => NOTIF_ICONS[type] || NOTIF_ICONS.default;

const Topbar = ({
  user,
  profilePath,
  resolvedImg,
  avatarErr,
  onAvatarError,
  initials,
  searchQ,
  onSearchChange,
  onSearch,
  // notifications
  notifRef,
  notifOpen,
  notifications,
  unreadCount,
  onNotifToggle,
  onMarkAllRead,
  onOpenNotif,
  onDeleteNotif,
  // user menu
  dropdownRef,
  dropdownOpen,
  onDropdownToggle,
  onLogout,
}) => (
  <header className="ck-header">
    <Link to="/dashboard" className="ck-header__logo" aria-label="Ckript home">
      <BrandLogo className="h-[30px] w-auto" />
    </Link>

    <form className="ck-header__search" onSubmit={onSearch}>
      <MatIcon name="search" size={18} />
      <input
        type="text"
        placeholder="Search scripts, writers..."
        value={searchQ}
        onChange={(e) => onSearchChange(e.target.value)}
        spellCheck={false}
        autoCorrect="off"
      />
    </form>

    <div className="ck-header__spacer" />

    <Link to="/pricing" className="ck-header__pricing">
      Pricing
      <MatIcon name="chevronDown" size={16} />
    </Link>

    {/* Notifications */}
    <div style={{ position: "relative" }} ref={notifRef}>
      <button className="ck-header__bell" onClick={onNotifToggle} aria-label="Notifications">
        <MatIcon name="bell" size={22} />
        {unreadCount > 0 && (
          <span className="ck-header__bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {notifOpen && (
        <div className="ck-notif-panel">
          <div className="ck-notif-panel__head">
            <span className="ck-notif-panel__title">
              Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, color: "#a39d92" }}>({unreadCount})</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                style={{ fontSize: 11, fontWeight: 600, color: "#a39d92", border: "none", background: "transparent", cursor: "pointer" }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="ck-notif-panel__body">
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#a39d92", fontSize: 13 }}>
                All caught up
              </div>
            ) : notifications.map((n) => (
              <div
                key={n._id}
                className="ck-notif-item"
                onClick={() => onOpenNotif(n)}
                style={{ background: !n.read ? "#fdf5f4" : undefined }}
              >
                <div className="ck-notif-item__icon">
                  <MatIcon name={notifIcon(n.type)} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ck-notif-item__text">
                    {n.from?.name && <strong style={{ color: "#1c1a17" }}>{n.from.name} </strong>}
                    {n.message}
                    {n.script?.title && <strong style={{ color: "#1c1a17" }}> "{n.script.title}"</strong>}
                  </div>
                  <div className="ck-notif-item__time">{timeAgo(n.createdAt)}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteNotif(n._id); }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#cec7bc", padding: 2, flexShrink: 0 }}
                  aria-label="Dismiss notification"
                >
                  <MatIcon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* User menu */}
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        className={`ck-header__user${dropdownOpen ? " open" : ""}`}
        onClick={onDropdownToggle}
      >
        <div className="ck-header__avatar">
          {resolvedImg && !avatarErr ? (
            <img src={resolvedImg} alt={user?.name} onError={onAvatarError} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <span className="ck-header__username">{user?.name || "User"}</span>
        <MatIcon name="chevronDown" size={17} />
      </button>

      {dropdownOpen && (
        <div className="ck-user-dropdown">
          <Link to={profilePath} className="ck-user-dropdown__item" onClick={onDropdownToggle}>
            <MatIcon name="profile" size={17} /> Profile
          </Link>
          <Link to="/contact" className="ck-user-dropdown__item" onClick={onDropdownToggle}>
            <MatIcon name="contact" size={17} /> Contact
          </Link>
          <Link to="/terms-of-service" className="ck-user-dropdown__item" onClick={onDropdownToggle}>
            <MatIcon name="terms" size={17} /> T &amp; C
          </Link>
          <Link to="/privacy-policy" className="ck-user-dropdown__item" onClick={onDropdownToggle}>
            <MatIcon name="shield" size={17} /> Privacy
          </Link>
          <div className="ck-user-dropdown__divider" />
          <button
            className="ck-user-dropdown__item ck-user-dropdown__item--danger"
            onClick={onLogout}
          >
            <MatIcon name="logout" size={17} /> Log out
          </button>
        </div>
      )}
    </div>
  </header>
);

export default Topbar;
