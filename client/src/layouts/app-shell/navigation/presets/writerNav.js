/*
 * writerNav — destinations for the writer / creator audience.
 *
 * Mirrors the "Ckript Dashboard 2B" reference rail:
 *   Dashboard · Create · Upload · Challenge · Messages · Profile
 */

/**
 * @param {import("../buildNav").NavContext} context
 * @returns {import("../buildNav").NavPreset}
 */
export const writerNav = ({ profilePath, msgCount }) => ({
  roleLabel: "Screenwriter",
  home: "/dashboard",
  searchPlaceholder: "Search scripts, writers…",

  rail: [
    { key: "dashboard", path: "/dashboard",      label: "Dashboard",      icon: "dashboard", exact: true },
    { key: "create",    path: "/create-project", label: "Create",         icon: "create", fresh: true },
    { key: "upload",    path: "/upload",         label: "Upload",         icon: "upload" },
    { key: "challenge", path: "/challenge",      label: "Challenge",      icon: "challenge" },
    { key: "messages",  path: "/messages",       label: "Messages",       icon: "messages", badge: msgCount },
    { key: "profile",   path: profilePath,       label: "Writer Profile", icon: "profile" },
  ],

  // Grouped exactly like the reference drawer:
  //   Dashboard · Search | Create · Upload | Challenge · My Competitions | Messages
  drawer: [
    { key: "dashboard",    path: "/dashboard",       label: "Dashboard",       icon: "home", exact: true },
    { key: "search",       path: "/search",          label: "Search Projects", icon: "search" },
    { divider: true },
    { key: "create",       path: "/create-project",  label: "Create Project",  icon: "ideas", fresh: true },
    { key: "upload",       path: "/upload",          label: "Upload Project",  icon: "upload" },
    { divider: true },
    { key: "challenge",    path: "/challenge",       label: "Challenge",       icon: "challenge" },
    { key: "competitions", path: "/my-competitions", label: "My Competitions", icon: "competitions" },
    { divider: true },
    { key: "messages",     path: "/messages",        label: "Messages",        icon: "messages", badge: msgCount },
  ],

  // Selected by key, never by index — see buildNav.
  mobileKeys: ["dashboard", "create", "messages"],

  /*
   * The drawer's contextual list. Writers see the projects they are actively
   * working on, newest first.
   */
  collection: {
    title: "My Projects",
    endpoint: "/scripts/mine",
    // Collaborations belong to someone else's project list, not this one.
    select: (script) => (script?.isCollaborator ? null : script),
  },
});

export default writerNav;
