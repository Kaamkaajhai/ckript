import { Link } from "react-router-dom";
import Icon from "../Icon";
import useMobileNav from "../../hooks/useMobileNav";
import "./NavBar.css";

/*
 * NavBar — the role-aware bottom tab bar (prefix: ckm-navbar). Plan §8.2.
 *
 * It supersedes `components/BottomNav.jsx`, which was provisional in three ways
 * the plan names explicitly:
 *
 *   • it declared two hard-coded items (Dashboard, Challenge) for every viewer,
 *     so a producer or reader on a phone would have been offered a writer's bar;
 *   • its items were <button>s calling `onSelect`, so a destination could not be
 *     opened in a new tab, long-pressed, previewed, or copied, and the browser
 *     could not colour it as visited;
 *   • `active` was a prop the screen passed ("dashboard", always), which §8.2
 *     forbids: "A URL determines the active tab; local component state does
 *     not." The old bar's active tab was literally a constant.
 *
 * WHY LINKS, NOT BUTTONS
 * ----------------------
 * A tab is a destination, so it is an <a>. `aria-current="page"` is applied to
 * at most one tab, because `resolveActiveTabKey` returns one key or none (MDN:
 * only ever mark one element in a set as current). "None" is the honest answer
 * on a detail screen that belongs to no tab.
 *
 * It is a plain `Link`, not a `NavLink` (changed 2026-08-07). NavLink decides
 * "am I active?" itself, from the path alone — and once a destination became a
 * query-string tab of another page (`/dashboard?tab=projects`), that made TWO
 * tabs believe they were current on the same URL, and NavLink applies its own
 * `aria-current` when it does, so passing `undefined` could not suppress it.
 * The resolver above is the single source of truth for which tab is selected;
 * having a second, weaker one inside the link could only ever disagree with it.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It does not hide itself on scroll, and it does not reorder. Both are common
 * in native apps; both break WCAG SC 3.2.3's "same relative order" for a bar
 * that repeats on every screen, and a bar that moves under the thumb is worse
 * on a phone than one that costs 64px.
 */
export default function NavBar({
  user = undefined,
  msgCount = 0,
  label = "Primary",
  className = "",
  ...rest
}) {
  const { tabs, activeTabKey } = useMobileNav({ user, msgCount });

  const classes = ["ckm-navbar", className].filter(Boolean).join(" ");

  return (
    <nav className={classes} aria-label={label} {...rest}>
      <ul className="ckm-navbar__list">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTabKey;

          return (
            <li className="ckm-navbar__item" key={tab.key}>
              <Link
                to={tab.path}
                // `startFresh` is how Create opens a new draft instead of
                // resuming the last one; §5.2 requires location.state to survive
                // the desktop→mobile move, so it is threaded rather than dropped.
                state={tab.fresh ? { startFresh: true } : undefined}
                className={`ckm-navbar__link${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="ckm-navbar__icon">
                  {/* Filled at rest for the selected tab: on a dark bar, colour
                      alone is a weak cue and fails for a colour-blind viewer,
                      so weight carries the state as well (SC 1.4.1). */}
                  <Icon name={tab.glyph} size={24} fill={isActive} />
                  {tab.badge > 0 && (
                    <span className="ckm-navbar__badge" aria-hidden="true">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </span>
                <span className="ckm-navbar__label">{tab.label}</span>
                {/* The badge glyph is decorative; the count belongs in the
                    link's accessible name, or a screen reader announces
                    "Messages" and the user never learns there are three. */}
                {tab.badge > 0 && (
                  <span className="ckm-sr-only">
                    {`, ${tab.badge} unread`}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
