import Icon from "./Icon";
import "./TopBar.css";

/*
 * TopBar — the fixed app header: brand mark, a tappable search field,
 * the notifications bell (with unread badge) and the account avatar.
 * Search is not yet implemented on mobile, so tapping it raises the
 * Dynamic Island "use desktop" hint via onSearch.
 */
export default function TopBar({ initials = "AR", unread = 0, avatarActive = false, onSearch, onBell, onAvatar }) {
  return (
    <header className="ckm-topbar">
      <img className="ckm-topbar__logo" src="/ckript-logo-landscape-nobg.png" alt="Ckript" />

      <button type="button" className="ckm-topbar__search" onClick={onSearch}>
        <Icon name="search" size={18} color="var(--ckm-muted-2)" />
        <span>Search scripts…</span>
      </button>

      <button type="button" className="ckm-topbar__bell" onClick={onBell} aria-label="Notifications">
        <Icon name="notifications" size={24} color="var(--ckm-text-2)" />
        {unread > 0 && <span className="ckm-topbar__badge">{unread}</span>}
      </button>

      <button
        type="button"
        className={`ckm-topbar__avatar${avatarActive ? " is-active" : ""}`}
        onClick={onAvatar}
        aria-label="Account menu"
      >
        {initials}
      </button>
    </header>
  );
}
