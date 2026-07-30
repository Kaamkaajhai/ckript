/*
 * ShellTopbar — the light header: logo · search · pricing · bell · user menu.
 *
 * Presentational, and deliberately free of audience knowledge. The logo target
 * and the search placeholder arrive as props because they differ per audience —
 * a writer's logo goes to their dashboard and searches "scripts, writers", a
 * producer's goes to Discover and searches "projects, writers". The old topbar
 * hard-coded both to the writer's, so a producer clicking the logo would have
 * been sent to a page built for someone else.
 */
import { Link } from "react-router-dom";
import BrandLogo from "../../../components/BrandLogo";
import { MatIcon } from "../navigation/icons.jsx";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

/**
 * @param {Object} props
 * @param {string} props.homePath           where the logo goes
 * @param {string} props.searchPlaceholder
 * @param {string} props.searchQuery
 * @param {Function} props.onSearchChange
 * @param {Function} props.onSearchSubmit
 * @param {Object} props.identity           from useShellIdentity
 * @param {Object} props.notifications      the useShellNotifications result
 * @param {Object} props.panels             { notifOpen, menuOpen, … } from the shell
 * @param {Function} props.onLogout
 */
const ShellTopbar = ({
  homePath,
  searchPlaceholder,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  identity,
  notifications,
  panels,
  onLogout,
}) => (
  <header className="ck-header">
    <Link to={homePath} className="ck-header__logo" aria-label="Ckript home">
      <BrandLogo className="h-[60px] w-auto" noLink={true} />
    </Link>

    <form className="ck-header__search" onSubmit={onSearchSubmit} role="search">
      <MatIcon name="search" size={18} />
      <input
        type="search"
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        spellCheck={false}
        autoCorrect="off"
      />
    </form>

    <div className="ck-header__spacer" />

    <Link to="/pricing" className="ck-header__pricing">
      Pricing
      <MatIcon name="chevronDown" size={16} />
    </Link>

    <NotificationBell
      open={panels.notifOpen}
      onToggle={panels.toggleNotifications}
      onClose={panels.closeNotifications}
      notifications={notifications.notifications}
      unreadCount={notifications.unreadCount}
      onMarkAllRead={notifications.markAllRead}
      onOpenNotification={notifications.openNotification}
      onDeleteNotification={notifications.deleteNotification}
      onDecideFollowRequest={notifications.decideFollowRequest}
    />

    <UserMenu
      open={panels.menuOpen}
      onToggle={panels.toggleMenu}
      onClose={panels.closeMenu}
      identity={identity}
      onLogout={onLogout}
    />
  </header>
);

export default ShellTopbar;
