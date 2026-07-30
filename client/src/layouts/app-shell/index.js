/*
 * The app shell's public surface.
 *
 * Import from here — `layouts/app-shell` — rather than reaching into the
 * subdirectories. Everything not exported below is an internal detail of the
 * shell and free to move.
 */

export { default } from "./AppShell";
export { default as AppShell } from "./AppShell";

/* The chrome decision. App.jsx routes through these instead of re-deriving
 * `role === "writer" || role === "creator"` in every layout wrapper. */
export {
  AUDIENCE,
  SHELL,
  CONTENT_VARIANT,
  KNOWN_ROLES,
  getAudience,
  getShell,
  isKnownRole,
  isWriterAudience,
  isIndustryAudience,
  isReaderAudience,
  isAdminAudience,
  isFullBleedRoute,
  isWorkspaceRoute,
  resolveShell,
  usesAppShell,
} from "./shellPolicy";

/* The navigation model, for anything that needs to reason about destinations
 * without rendering the shell (tests, breadcrumbs, command palettes). */
export { buildNav, MOBILE_SLOTS } from "./navigation/buildNav";
export { MatIcon } from "./navigation/icons.jsx";
export { SYMBOLS } from "./navigation/symbols";
