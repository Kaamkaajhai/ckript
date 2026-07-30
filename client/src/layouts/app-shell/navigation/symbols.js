/*
 * symbols.js — semantic icon name → Material Symbol ligature.
 *
 * The shell renders every icon with Google's "Material Symbols Outlined" webfont
 * (loaded once in index.html). Using the font rather than hand-drawn SVG paths
 * keeps the chrome pixel-faithful to the design reference and lets one component
 * control weight / fill / grade — the old shell shipped ~40 inline `d="M3 12l2…"`
 * path strings copy-pasted between navs instead.
 *
 * Nav presets reference these KEYS, never ligatures, so renaming an icon is a
 * one-line change here. buildNav.test.js asserts that every key a preset uses
 * actually exists in this map, which turns a typo into a failing test rather than
 * an invisible glyph.
 *
 * Kept in its own module (not in icons.jsx) so the component file exports only a
 * component — exporting a constant alongside it breaks Fast Refresh.
 */
export const SYMBOLS = {
  menu:         "menu",
  dashboard:    "dashboard",
  home:         "home",
  create:       "add_circle",
  ideas:        "lightbulb",
  add:          "add",
  upload:       "upload",
  messages:     "chat",
  projects:     "movie",
  search:       "search",
  logout:       "logout",
  bell:         "notifications",
  chevronDown:  "expand_more",
  chevronLeft:  "chevron_left",
  chevronRight: "chevron_right",
  collapseLeft: "keyboard_double_arrow_left",
  profile:      "person",
  contact:      "mail",
  terms:        "description",
  shield:       "shield",
  close:        "close",
  analytics:    "insights",
  sparkles:     "auto_awesome",
  offers:       "gavel",
  writers:      "groups",
  featured:     "star",
  top:          "leaderboard",
  challenge:    "emoji_events",      // trophy — the live competition
  competitions: "workspace_premium", // the writer's own competition record
  bookmark:     "bookmark",          // a producer's saved projects
  admin:        "admin_panel_settings",
  watchlist:    "visibility",
};

export default SYMBOLS;
