import Icon from "./Icon";
import "./BottomNav.css";

/*
 * BottomNav — the dark, fixed tab bar. Only "Dashboard" is implemented on
 * mobile for now; Create / Messages / Profile raise the Dynamic Island hint
 * pointing users to the desktop app. The active tab is always Dashboard.
 */
const ITEMS = [
  { id: "dashboard", icon: "dashboard", label: "Dashboard", implemented: true },
  { id: "create", icon: "add_circle", label: "Create" },
  { id: "messages", icon: "chat", label: "Messages", badge: 5 },
  { id: "profile", icon: "person", label: "Profile" },
];

export default function BottomNav({ active = "dashboard", onSelect }) {
  return (
    <nav className="ckm-bottomnav" aria-label="Primary">
      {ITEMS.map((it) => {
        const on = active === it.id;
        return (
          <button
            key={it.id}
            type="button"
            className={`ckm-bottomnav__item${on ? " is-active" : ""}`}
            onClick={() => onSelect(it)}
            aria-current={on ? "page" : undefined}
          >
            <span className="ckm-bottomnav__icon">
              <Icon name={it.icon} size={24} fill={on} />
              {it.badge ? <span className="ckm-bottomnav__badge">{it.badge}</span> : null}
            </span>
            <span className="ckm-bottomnav__label">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
