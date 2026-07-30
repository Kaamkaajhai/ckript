/*
 * NavMobileBar — the bottom bar that replaces the rail on phones.
 *
 * Was inline JSX in the shell, which is why it drifted: the rail rendered
 * badges via a shared helper while this one hand-rolled its own. Both now go
 * through NavItem.
 */
import NavItem from "./NavItem";

/**
 * @param {Object} props
 * @param {Array} props.items      buildNav().mobile
 * @param {Function} props.isActive
 */
const NavMobileBar = ({ items = [], isActive }) => (
  <nav className="ck-mobile-nav" aria-label="Primary">
    {items.map((item) => (
      <NavItem
        key={item.key}
        item={item}
        active={isActive(item)}
        surface="mobile"
      />
    ))}
  </nav>
);

export default NavMobileBar;
