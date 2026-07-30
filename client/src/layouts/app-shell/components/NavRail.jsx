/*
 * NavRail — the narrow, always-visible icon rail on the left.
 *
 * 94px, never reflows the page, and carries the burger that opens NavDrawer.
 * Purely presentational: it renders the items it is handed and reports clicks.
 *
 * This and NavDrawer used to be one component. They are two different pieces of
 * furniture — one is permanent chrome, the other is a transient overlay — and
 * keeping them in one file meant every drawer change risked the rail.
 */
import { MatIcon } from "../navigation/icons.jsx";
import NavItem from "./NavItem";

/**
 * @param {Object} props
 * @param {Array} props.items          rail items from buildNav().primary
 * @param {Function} props.isActive    (item) => boolean
 * @param {boolean} props.menuOpen     is the drawer currently open
 * @param {Function} props.onToggleMenu
 */
const NavRail = ({ items = [], isActive, menuOpen, onToggleMenu }) => (
  <aside className="ck-sidebar">
    <button
      type="button"
      className="ck-sidebar__menu-btn"
      onClick={onToggleMenu}
      aria-label={menuOpen ? "Close menu" : "Open menu"}
      aria-expanded={menuOpen}
      aria-controls="ck-app-drawer"
      title="Menu"
    >
      <MatIcon name="menu" size={24} />
    </button>

    <nav className="ck-sidebar__nav" aria-label="Primary">
      {items.map((item) => (
        <NavItem
          key={item.key}
          item={item}
          active={isActive(item)}
          surface="rail"
        />
      ))}
    </nav>
  </aside>
);

export default NavRail;
