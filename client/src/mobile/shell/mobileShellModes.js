/*
 * Ckript Mobile — shell mode contract (canonical plan §8.1).
 *
 * A shell mode is the *only* place that decides which chrome a screen gets.
 * Screens declare their mode through the route manifest and never re-implement
 * a competing app shell, so bottom-tab visibility, scroll ownership and
 * safe-area padding stay consistent across the whole mobile app.
 */

export const MOBILE_SHELL_MODE = Object.freeze({
  STANDARD: "standard",
  DETAIL: "detail",
  IMMERSIVE: "immersive",
  FLOW: "flow",
  PUBLIC: "public",
  ADMIN: "admin",
});

/*
 * Per-mode defaults. A screen may override an individual slot on <MobileShell>
 * (a detail screen that genuinely needs tabs, for example), but the default is
 * what the plan describes so the override is always a visible decision.
 */
export const MOBILE_SHELL_MODE_CONFIG = Object.freeze({
  [MOBILE_SHELL_MODE.STANDARD]: Object.freeze({
    intent: "Top app bar + scroll body + role-aware bottom tabs.",
    bottomNav: true,
    appBar: true,
    safeAreaTop: true,
    safeAreaBottom: true,
  }),
  [MOBILE_SHELL_MODE.DETAIL]: Object.freeze({
    intent: "Back button + title/actions; bottom tabs normally hidden.",
    bottomNav: false,
    appBar: true,
    safeAreaTop: true,
    safeAreaBottom: true,
  }),
  [MOBILE_SHELL_MODE.IMMERSIVE]: Object.freeze({
    intent: "Reader/editor/media surfaces that own their own chrome.",
    bottomNav: false,
    appBar: false,
    safeAreaTop: false,
    safeAreaBottom: false,
  }),
  [MOBILE_SHELL_MODE.FLOW]: Object.freeze({
    intent: "Onboarding, create, upload, payment and registration steppers.",
    bottomNav: false,
    appBar: true,
    safeAreaTop: true,
    safeAreaBottom: true,
  }),
  [MOBILE_SHELL_MODE.PUBLIC]: Object.freeze({
    intent: "Marketing, public share, legal and logged-out routes.",
    bottomNav: false,
    appBar: true,
    safeAreaTop: true,
    safeAreaBottom: true,
  }),
  [MOBILE_SHELL_MODE.ADMIN]: Object.freeze({
    intent: "Dense but touch-safe admin navigation and content.",
    bottomNav: true,
    appBar: true,
    safeAreaTop: true,
    safeAreaBottom: true,
  }),
});

export const MOBILE_SHELL_MODES = Object.freeze(Object.values(MOBILE_SHELL_MODE));

export function isMobileShellMode(mode) {
  return MOBILE_SHELL_MODES.includes(mode);
}

export function getShellModeConfig(mode) {
  return MOBILE_SHELL_MODE_CONFIG[mode] ?? MOBILE_SHELL_MODE_CONFIG[MOBILE_SHELL_MODE.STANDARD];
}
