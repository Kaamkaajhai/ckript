import { useCallback, useEffect, useRef, useState } from "react";
import { Drawer, SearchInput } from "../ui";
import "./admin-shell.css";

/**
 * The admin layout shell: collapsible grouped sidebar, sticky header with breadcrumbs and global
 * search, theme toggle, and the content region. Screens render INSIDE it; it owns no data.
 *
 * Navigation is deliberately key-based (`activeKey` / `onNavigate`), not route-based: today the
 * whole admin is one page switching tabs, and the shell must serve that unchanged. When stage 5
 * splits the page into routes, `onNavigate` becomes a `navigate()` call at exactly one call site —
 * the shell itself never changes.
 *
 * Layout facts the CSS relies on:
 *   • The sidebar is a fixed column; `--ad-sidebar-w` collapses to `--ad-sidebar-w-collapsed`.
 *     Collapse hides labels but keeps icons at the same x-position, so nothing appears to move.
 *   • Under 920px the sidebar is gone entirely and navigation lives in a left Drawer — one nav
 *     tree in two containers, never two nav trees.
 *   • The header is sticky, not fixed: it scrolls WITH the page on overscroll bounce instead of
 *     detaching from it.
 */

const COLLAPSE_KEY = "ckad-nav-collapsed";
const THEME_KEY = "ckad-theme";

const NavIcon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

function NavTree({ groups, activeKey, onNavigate, collapsed }) {
  return (
    <nav className="adsh-nav" aria-label="Admin sections">
      {groups.map((group, gi) => (
        <div key={group.title || gi} className="adsh-group">
          {group.title && !collapsed ? <div className="adsh-group-t">{group.title}</div> : null}
          {group.title && collapsed ? <div className="adsh-group-rule" aria-hidden="true" /> : null}
          <ul className="adsh-list">
            {group.items.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className={`adsh-item${item.key === activeKey ? " is-active" : ""}`}
                  aria-current={item.key === activeKey ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  onClick={() => onNavigate(item.key)}
                >
                  {item.icon ? <NavIcon d={item.icon} /> : <span className="adsh-item-dot" aria-hidden="true" />}
                  <span className={collapsed ? "ckad-sr-only" : "adsh-item-l"}>{item.label}</span>
                  {item.badge ? <span className="adsh-item-badge">{item.badge}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function AdminShell({
  groups,
  activeKey,
  onNavigate,
  crumbs = [],                 // ["Competitions", "Global Script Challenge"] — the shell prefixes Admin
  searchPlaceholder = "Search…",
  searchValue,
  onSearchChange = null,       // absent → the search box is not rendered
  headerActions = null,
  brand = "Ckript Admin",
  defaultTheme = "light",       // a surface whose content is tuned dark (the current admin) starts dark
  children,
}) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || defaultTheme);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const searchRef = useRef(null);

  const toggleCollapsed = () => {
    const next = !collapsed;
    localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    setCollapsed(next);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  };

  // Ctrl/Cmd+K or "/" focuses search — unless the admin is already typing somewhere.
  useEffect(() => {
    if (!onSearchChange) return undefined;
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")
        || document.activeElement?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSearchChange]);

  const navigate = useCallback((key) => {
    setMobileNavOpen(false);
    onNavigate(key);
  }, [onNavigate]);

  return (
    <div className={`ckad adsh${collapsed ? " adsh--collapsed" : ""}`} data-theme={theme === "dark" ? "dark" : undefined}>
      <a href="#adsh-main" className="ckad-sr-only adsh-skip">Skip to content</a>

      {/* ── Sidebar (desktop) ────────────────────────────────────────────────*/}
      <aside className="adsh-side">
        <div className="adsh-brand">
          <span className="adsh-brand-mark" aria-hidden="true">C</span>
          {!collapsed ? <span className="adsh-brand-name">{brand}</span> : null}
        </div>
        <NavTree groups={groups} activeKey={activeKey} onNavigate={navigate} collapsed={collapsed} />
        <button
          type="button"
          className="adsh-collapse"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
          {!collapsed ? <span className="adsh-item-l">Collapse</span> : null}
        </button>
      </aside>

      {/* ── Mobile nav ───────────────────────────────────────────────────────*/}
      <Drawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} title={brand} side="left" width={300}>
        <NavTree groups={groups} activeKey={activeKey} onNavigate={navigate} collapsed={false} />
      </Drawer>

      {/* ── Main column ──────────────────────────────────────────────────────*/}
      <div className="adsh-col">
        <header className="adsh-head">
          <button
            type="button"
            className="adsh-burger"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <span aria-hidden="true">☰</span>
          </button>

          <nav className="adsh-crumbs" aria-label="Breadcrumb">
            <ol>
              <li>Admin</li>
              {crumbs.map((crumb) => <li key={crumb} aria-current={crumb === crumbs[crumbs.length - 1] ? "page" : undefined}>{crumb}</li>)}
            </ol>
          </nav>

          {onSearchChange ? (
            <SearchInput
              ref={searchRef}
              className="adsh-search"
              placeholder={`${searchPlaceholder}  (Ctrl K)`}
              aria-label="Global search"
              value={searchValue}
              onChange={onSearchChange}
            />
          ) : <span className="adsh-spacer" />}

          <div className="adsh-head-end">
            {headerActions}
            <button
              type="button"
              className="adsh-theme"
              onClick={toggleTheme}
              aria-pressed={theme === "dark"}
              aria-label="Toggle dark theme"
              title="Toggle dark theme"
            >
              <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
            </button>
          </div>
        </header>

        <main id="adsh-main" className="adsh-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
