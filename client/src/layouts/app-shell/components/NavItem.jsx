/*
 * NavItem — one destination, rendered in whichever of the shell's three
 * navigation surfaces asked for it.
 *
 * The rail, the drawer and the mobile bar all previously wrote their own
 * `<Link>` with their own copy of the active class, the `state: {startFresh}`
 * hand-off and the badge markup. Three copies meant three places to forget the
 * badge — which is how the unread count ended up on the rail but not on mobile.
 */
import { Link } from "react-router-dom";
import { MatIcon } from "../navigation/icons.jsx";

/* Badges are a glance, not a count. Anything past 9 is "lots". */
const formatBadge = (value) => (value > 9 ? "9+" : String(value));

/**
 * @param {Object} props
 * @param {Object} props.item      a nav item from buildNav
 * @param {boolean} props.active   is this the current destination
 * @param {"rail"|"drawer"|"mobile"} props.surface  which nav is rendering it
 * @param {Function} [props.onNavigate]  called on click (drawer uses it to close)
 */
const NavItem = ({ item, active, surface = "rail", onNavigate }) => {
  const badge = Number(item?.badge) > 0 ? formatBadge(item.badge) : null;

  /*
   * `fresh` items must start a new draft rather than resume the last one, which
   * the destination reads off router state.
   */
  const linkState = item.fresh ? { startFresh: true } : undefined;

  const icon = (size, opts = {}) => (
    <MatIcon name={item.icon} size={size} fill={active} {...opts} />
  );

  if (surface === "drawer") {
    return (
      <Link
        to={item.path}
        state={linkState}
        className={`ck-drawer__link${active ? " active" : ""}`}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
      >
        {icon(22)}
        <span className="ck-drawer__link-label">{item.label}</span>
        {badge && <span className="ck-drawer__link-badge">{badge}</span>}
      </Link>
    );
  }

  if (surface === "mobile") {
    return (
      <Link
        to={item.path}
        state={linkState}
        className={`ck-mobile-nav-item${active ? " active" : ""}`}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
      >
        <span className="ck-mobile-nav-item__icon">
          {icon(22)}
          {badge && <span className="ck-nav-item__badge">{badge}</span>}
        </span>
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      to={item.path}
      state={linkState}
      className={`ck-nav-item${active ? " active" : ""}`}
      title={item.label}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
    >
      <span className="ck-nav-item__icon">
        {icon(25, { weight: active ? 500 : 400 })}
        {badge && <span className="ck-nav-item__badge">{badge}</span>}
      </span>
      <span className="ck-nav-item__label">{item.label}</span>
    </Link>
  );
};

export default NavItem;
