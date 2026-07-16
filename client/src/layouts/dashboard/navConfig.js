/*
 * navConfig.js — role-aware navigation model for the 2B dashboard shell.
 *
 * The shell (Sidebar / mobile bottom-nav) renders whatever this builder
 * returns, so adding a destination or changing an icon is a data edit — no
 * JSX surgery. Order here is the visual order in the rail.
 *
 * Mirrors the reference "Ckript Dashboard 2B" sidebar for creators:
 *   Dashboard · Create · Upload · Messages · Projects   (+ Log out pinned bottom)
 */

/**
 * @param {Object}   opts
 * @param {Object}   opts.user         current auth user
 * @param {string}   opts.profilePath  canonical profile path for this viewer
 * @param {number}   opts.msgCount     unread messages badge
 * @returns {{ primary: Array, drawer: Array, mobile: Array }}
 *
 * `primary` — compact icon rail (always visible).
 * `drawer`  — the expanded overlay drawer. Same destinations, longer labels,
 *             grouped with `{ divider: true }` separators to match the
 *             "Ckript Dashboard" reference. Roles that have no bespoke grouping
 *             fall back to a labelled version of `primary`.
 * `mobile`  — bottom nav (max 4).
 */
export function buildNav({ user, profilePath, msgCount = 0 }) {
  const role = user?.role;

  if (role === "reader") {
    const primary = [
      { key: "home",     path: "/reader",        label: "Home",     icon: "dashboard" },
      { key: "search",   path: "/reader/search", label: "Discover", icon: "search"    },
      { key: "messages", path: "/messages",      label: "Messages", icon: "messages", badge: msgCount },
      { key: "profile",  path: profilePath,      label: "Profile",  icon: "profile"   },
    ];
    const drawer = [
      { key: "home",     path: "/reader",        label: "Home",     icon: "home"    },
      { key: "search",   path: "/reader/search", label: "Discover", icon: "search"  },
      { divider: true },
      { key: "messages", path: "/messages",      label: "Messages", icon: "messages", badge: msgCount },
      { key: "profile",  path: profilePath,      label: "Profile",  icon: "profile" },
    ];
    return { primary, drawer, mobile: primary.slice(0, 4) };
  }

  if (role === "investor" || role === "producer") {
    const primary = [
      { key: "home",     path: "/home",     label: "Home",     icon: "dashboard" },
      { key: "featured", path: "/featured", label: "Featured", icon: "featured"  },
      { key: "writers",  path: "/writers",  label: "Writers",  icon: "writers"   },
      { key: "messages", path: "/messages", label: "Messages", icon: "messages", badge: msgCount },
      { key: "search",   path: "/search",   label: "Search",   icon: "search"    },
    ];
    const drawer = [
      { key: "home",     path: "/home",     label: "Home",     icon: "home"     },
      { key: "search",   path: "/search",   label: "Search",   icon: "search"   },
      { divider: true },
      { key: "featured", path: "/featured", label: "Featured", icon: "featured" },
      { key: "writers",  path: "/writers",  label: "Writers",  icon: "writers"  },
      { divider: true },
      { key: "messages", path: "/messages", label: "Messages", icon: "messages", badge: msgCount },
    ];
    return {
      primary,
      drawer,
      mobile: [
        primary[0], primary[1], primary[3],
        { key: "profile", path: profilePath, label: "Profile", icon: "profile" },
      ],
    };
  }

  // Default: creator / writer — matches the "Ckript Dashboard" reference.
  const primary = [
    { key: "dashboard", path: "/dashboard",      label: "Dashboard", icon: "dashboard", exact: true, fresh: false },
    { key: "create",    path: "/create-project", label: "Create",    icon: "create",    fresh: true  },
    { key: "upload",    path: "/upload",         label: "Upload",    icon: "upload"     },
    { key: "messages",  path: "/messages",       label: "Messages",  icon: "messages",  badge: msgCount },
    { key: "profile",   path: profilePath,       label: "Writer Profile",  icon: "profile"   },
  ];
  // Drawer mirrors the reference grouping: Dashboard · Search | Create · Upload | Messages.
  const drawer = [
    { key: "dashboard", path: "/dashboard",      label: "Dashboard",      icon: "home",   exact: true },
    { key: "search",    path: "/search",         label: "Search Projects", icon: "search" },
    { divider: true },
    { key: "create",    path: "/create-project", label: "Create Project", icon: "ideas",  fresh: true },
    { key: "upload",    path: "/upload",         label: "Upload Project", icon: "upload" },
    { divider: true },
    { key: "messages",  path: "/messages",       label: "Messages",       icon: "messages", badge: msgCount },
  ];
  return {
    primary,
    drawer,
    mobile: [
      primary[0],
      primary[1],
      primary[3],
      { key: "profile", path: profilePath, label: "Profile", icon: "profile" },
    ],
  };
}
