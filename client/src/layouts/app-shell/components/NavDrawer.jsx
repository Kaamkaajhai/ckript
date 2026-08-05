/*
 * NavDrawer — the 274px overlay drawer the rail's burger opens.
 *
 * Carries the richer navigation: an identity card, grouped and labelled links,
 * the audience's contextual collection ("My Projects" for a writer, "Watchlist"
 * for a producer) and logout pinned to the bottom.
 *
 * Presentational. The collection arrives already fetched and shaped so this
 * component works identically for any audience — that generalisation is the
 * reason a producer gets the same drawer without a role branch in the markup.
 */
import { Link } from "react-router-dom";
import BrandLogo from "../../../components/BrandLogo";
import { MatIcon } from "../navigation/icons.jsx";
import NavItem from "./NavItem";

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose         also used as every link's onClick, so
 *                                         navigating out of the drawer closes it
 * @param {Array} props.items              buildNav().drawer
 * @param {Function} props.isActive
 * @param {Object} props.identity          from useShellIdentity
 * @param {string} props.roleLabel         human-readable role for the id card
 * @param {Object} props.collection        from useDrawerCollection
 * @param {Function} props.onLogout
 */
const NavDrawer = ({
  open,
  onClose,
  items = [],
  isActive,
  identity,
  roleLabel,
  collection,
  onLogout,
}) => {
  const { avatarUrl, avatarFailed, onAvatarError, initials, displayName, profilePath } = identity;
  const showAvatar = Boolean(avatarUrl) && !avatarFailed;
  const entries = collection?.entries || [];

  return (
    <>
      <div
        className={`ck-backdrop${open ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id="ck-app-drawer"
        className={`ck-drawer ck-dscroll${open ? " open" : ""}`}
        /*
         * `inert` keeps the closed drawer out of the tab order and off the
         * accessibility tree. aria-hidden alone left every link focusable while
         * the drawer sat translated off-screen, so tabbing through the page
         * silently walked into invisible controls.
         *
         * Must be a real boolean: React 19 treats `inert` as a boolean attribute
         * and drops a falsy string like "", which silently disabled this.
         */
        inert={!open}
        aria-label="Menu"
      >
        <div className="ck-drawer__head">
          <span className="ck-drawer__logo">
            <BrandLogo className="h-[60px] w-auto" />
          </span>
          <button
            type="button"
            className="ck-drawer__collapse"
            onClick={onClose}
            aria-label="Collapse menu"
            title="Collapse"
          >
            <MatIcon name="collapseLeft" size={22} />
          </button>
        </div>

        <Link to={profilePath} className="ck-drawer__profile" onClick={onClose}>
          <span className="ck-drawer__avatar">
            {showAvatar
              ? <img src={avatarUrl} alt="" onError={onAvatarError} />
              : initials}
          </span>
          <span className="ck-drawer__id">
            <span className="ck-drawer__name">{displayName}</span>
            <span className="ck-drawer__role">{roleLabel}</span>
          </span>
          <MatIcon name="chevronRight" size={20} className="ck-drawer__id-chev" />
        </Link>

        <nav className="ck-drawer__nav" aria-label="All destinations">
          {items.map((item, index) => (
            item.divider
              ? <div key={`divider-${index}`} className="ck-drawer__divider" />
              : (
                <NavItem
                  key={item.key}
                  item={item}
                  active={isActive(item)}
                  surface="drawer"
                  onNavigate={onClose}
                />
              )
          ))}
        </nav>

        {/* The audience's contextual list. Absent entirely when empty rather
            than showing an empty heading. */}
        {entries.length > 0 && (
          <>
            <div className="ck-drawer__section">
              <MatIcon name="chevronDown" size={18} />
              {collection.title}
            </div>
            <div className="ck-drawer__recents">
              {entries.map((entry) => (
                <Link
                  key={entry.id}
                  to={entry.path}
                  className="ck-drawer__recent"
                  title={entry.title}
                  onClick={onClose}
                >
                  <span className="ck-drawer__recent-dot" />
                  <span className="ck-drawer__recent-title">{entry.title}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <button type="button" className="ck-drawer__logout" onClick={onLogout}>
          <MatIcon name="logout" size={22} />
          Log out
        </button>
      </aside>
    </>
  );
};

export default NavDrawer;
