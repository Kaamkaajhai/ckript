import { Link } from "react-router-dom";
import Icon from "../Icon";
import useMobileNav from "../../hooks/useMobileNav";
import "./AppBar.css";

/*
 * AppBar — the role-aware top app bar for `standard`-shell screens
 * (prefix: ckm-appbar). Plan §8.1/§8.2. `PageHeader` remains the app bar for
 * `detail` screens; the two never appear together, because MobileShell has one
 * appBar slot.
 *
 * It supersedes `components/TopBar.jsx`, which hard-coded the writer's world:
 * the logo was an <img> that navigated nowhere, and the search field said
 * "Search scripts…" to a producer looking for writers and to a reader looking
 * through their own catalogue. Both now come from the audience preset — the
 * same one the desktop shell reads — so a producer's bar says what the
 * producer's desktop bar says.
 *
 * COMPOSITION, NOT CONFIGURATION
 * ------------------------------
 * The bar owns only what must not vary by screen: the home link and the search
 * entry. Everything else is the `actions` slot, because the notification bell
 * and the avatar are wired to state a SCREEN owns (the dashboard's own
 * notifications panel and account sheet). A bar that reached for that state
 * would have to know about every screen that has one.
 *
 * WHY SEARCH IS A LINK
 * --------------------
 * It looks like a field and is not one. A text input in a fixed bar on a phone
 * opens the keyboard over the content the user is trying to search, so the
 * native pattern is an entry point that opens a screen owning the input. Making
 * it an <a> rather than a <button> means it announces as a link to the search
 * page, which is what it is.
 */
export default function AppBar({
  user = undefined,
  msgCount = 0,
  actions = null,
  logoSrc = "/ckript-logo-landscape-nobg.png",
  className = "",
  ...rest
}) {
  const { homePath, searchPath, searchPlaceholder } = useMobileNav({ user, msgCount });

  const classes = ["ckm-appbar", className].filter(Boolean).join(" ");

  return (
    <header className={classes} {...rest}>
      <Link
        to={homePath}
        className="ckm-appbar__home"
        // The logo is the image; the link needs a name that says where it goes,
        // and "Ckript" alone would announce the brand rather than the
        // destination.
        aria-label="Ckript home"
      >
        <img className="ckm-appbar__logo" src={logoSrc} alt="" />
      </Link>

      <Link to={searchPath} className="ckm-appbar__search">
        <Icon name="search" size={18} color="var(--ckm-text-3)" />
        {/* The placeholder is the link's visible label, so it is also its
            accessible name — "Search scripts, writers…" reads correctly as a
            link, where a decorative placeholder would leave it unnamed. */}
        <span className="ckm-appbar__search-label">{searchPlaceholder}</span>
      </Link>

      {actions && <div className="ckm-appbar__actions">{actions}</div>}
    </header>
  );
}

/*
 * AppBarAction — the 44px round control the bar's `actions` slot expects, with
 * the optional count badge the bell needs.
 *
 * It exists rather than reusing `components/buttons/IconButton` for one reason:
 * IconButton is drawn for the light content surface, and this bar's actions sit
 * against the app background beside the avatar. Everything else about it —
 * hit region, named control, badge folded into the accessible name — follows
 * IconButton's contract deliberately.
 */
export function AppBarAction({
  glyph,
  label,
  badge = 0,
  active = false,
  onClick,
  className = "",
  ...rest
}) {
  const count = Number(badge) > 0 ? Number(badge) : 0;
  const classes = ["ckm-appbar__action", active ? "is-active" : "", className]
    .filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      // The badge is `aria-hidden` decoration; the count has to reach the
      // accessible name or the control announces "Notifications" whether there
      // are none or nine.
      aria-label={count > 0 ? `${label}, ${count} unread` : label}
      {...rest}
    >
      <Icon name={glyph} size={24} color="currentColor" />
      {count > 0 && (
        <span className="ckm-appbar__badge" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

/*
 * AppBarAvatar — the account control. A button, not a link: it opens the
 * account sheet the screen owns rather than navigating.
 */
export function AppBarAvatar({ initials = "CK", active = false, onClick, label = "Account menu", ...rest }) {
  return (
    <button
      type="button"
      className={`ckm-appbar__avatar${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-label={label}
      aria-expanded={active}
      aria-haspopup="dialog"
      {...rest}
    >
      <span aria-hidden="true">{initials}</span>
    </button>
  );
}
