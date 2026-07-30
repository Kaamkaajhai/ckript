/*
 * UserMenu — the avatar button in the header and its dropdown.
 *
 * The dropdown's five entries were five hand-written <Link> blocks. They are a
 * list now, so adding "Billing" or "Settings" is one line and every entry is
 * guaranteed the same markup, spacing and close-on-click behaviour.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MatIcon } from "../navigation/icons.jsx";

/*
 * Account-level destinations. Deliberately NOT in the nav presets: these are the
 * same for every audience, and they are account admin rather than navigation.
 * `profile` is resolved per-viewer at render time.
 *
 * Module-local on purpose — exporting a non-component from a component file
 * breaks Fast Refresh for the whole file.
 */
const ACCOUNT_MENU = [
  { key: "profile", label: "Profile", icon: "profile", to: "profile" },
  { key: "contact", label: "Contact", icon: "contact", to: "/contact" },
  { key: "terms",   label: "T & C",   icon: "terms",   to: "/terms-of-service" },
  { key: "privacy", label: "Privacy", icon: "shield",  to: "/privacy-policy" },
];

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onToggle
 * @param {Function} props.onClose
 * @param {Object} props.identity   from useShellIdentity
 * @param {Function} props.onLogout
 */
const UserMenu = ({ open, onToggle, onClose, identity, onLogout }) => {
  const containerRef = useRef(null);
  const { avatarUrl, avatarFailed, onAvatarError, initials, displayName, profilePath } = identity;
  const showAvatar = Boolean(avatarUrl) && !avatarFailed;

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className="ck-header__slot" ref={containerRef}>
      <button
        type="button"
        className={`ck-header__user${open ? " open" : ""}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="ck-header__avatar">
          {showAvatar
            ? <img src={avatarUrl} alt="" onError={onAvatarError} />
            : <span>{initials}</span>}
        </span>
        <span className="ck-header__username">{displayName}</span>
        <MatIcon name="chevronDown" size={17} />
      </button>

      {open && (
        <div className="ck-user-dropdown" role="menu">
          {ACCOUNT_MENU.map((entry) => (
            <Link
              key={entry.key}
              to={entry.to === "profile" ? profilePath : entry.to}
              className="ck-user-dropdown__item"
              onClick={onClose}
              role="menuitem"
            >
              <MatIcon name={entry.icon} size={17} />
              {entry.label}
            </Link>
          ))}

          <div className="ck-user-dropdown__divider" />

          <button
            type="button"
            className="ck-user-dropdown__item ck-user-dropdown__item--danger"
            onClick={onLogout}
            role="menuitem"
          >
            <MatIcon name="logout" size={17} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
