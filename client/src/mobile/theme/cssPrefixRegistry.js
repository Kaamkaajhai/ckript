/*
 * Ckript Mobile — CSS prefix registry (canonical plan §7.1–7.2).
 *
 * Two rules the mobile app cannot be allowed to drift on:
 *   1. every mobile selector is scoped under `.ckm`, so no mobile style can
 *      reach an unscoped element in the desktop document;
 *   2. every `ckm-*` class belongs to exactly one registered owner, so two
 *      page families can never quietly share a prefix.
 *
 * `mobileCssContract.test.js` reads this file and fails the build when a new
 * stylesheet breaks either rule. Register a prefix here *before* writing the
 * page's CSS, and mirror it into §7.2 of NATIVE_APP_IMPLEMENTATION.md.
 */

export const MOBILE_CSS_PREFIX_KIND = Object.freeze({
  ROOT: "root",
  SHELL: "shell",
  UTILITY: "utility",
  SHARED_COMPONENT: "shared-component",
  PAGE_FAMILY: "page-family",
  PAGE_COMPONENT: "page-component",
});

const { ROOT, SHELL, UTILITY, SHARED_COMPONENT, PAGE_FAMILY, PAGE_COMPONENT } = MOBILE_CSS_PREFIX_KIND;

export const MOBILE_CSS_PREFIXES = Object.freeze({
  // --- Root and shell ---------------------------------------------------
  "ckm-root": { kind: ROOT, owner: "MobileApp.css", note: "Phone-shaped frame inside the .ckm surface." },
  "ckm-html-lock": {
    kind: ROOT,
    owner: "MobileApp.css",
    note: "Document-level scroll lock applied to <html>; the one intentionally unscoped class (§7.1).",
  },
  "ckm-shell": {
    kind: SHELL,
    owner: "shell/MobileShell.css, shell/MobileRouteBoundary.css",
    note: "App shell layout plus the route pending and route failure surfaces.",
  },

  // --- Utilities --------------------------------------------------------
  "ckm-scroll": { kind: UTILITY, owner: "theme/base.css", note: "Momentum scroll surface; applied by MobileShell." },
  "ckm-sr-only": {
    kind: UTILITY,
    owner: "theme/base.css",
    note: "Announced but not shown; the one implementation of visually-hidden text.",
  },

  // --- Shared components ------------------------------------------------
  "ckm-topbar": { kind: SHARED_COMPONENT, owner: "components/TopBar.css" },
  "ckm-bottomnav": { kind: SHARED_COMPONENT, owner: "components/BottomNav.css" },
  "ckm-tabs": { kind: SHARED_COMPONENT, owner: "components/SectionTabs.css" },
  "ckm-sheet": {
    kind: SHARED_COMPONENT,
    owner: "components/BottomSheet.css",
    note: "Legacy dashboard sheet with no focus trap. Superseded by ckm-bottom-sheet for new screens; Phase 2 migrates the four dashboard overlays and retires it.",
  },
  "ckm-empty": { kind: SHARED_COMPONENT, owner: "components/EmptyState.css" },
  "ckm-skel": { kind: SHARED_COMPONENT, owner: "components/Skeleton.css" },
  "ckm-island": { kind: SHARED_COMPONENT, owner: "components/DynamicIsland.css" },
  "ckm-statusbar": { kind: SHARED_COMPONENT, owner: "components/StatusBar.css" },
  "ckm-btn": {
    kind: SHARED_COMPONENT,
    owner: "theme/primitives.css",
    note: "Legacy 40px dashboard button. Superseded by ckm-button for new screens; retire in Phase 2.",
  },
  "ckm-chip": {
    kind: SHARED_COMPONENT,
    owner: "theme/primitives.css, components/chips/Chip.css",
    note: "One chip family: primitives.css owns the base pill, Chip.css adds the interactive and removable forms.",
  },
  "ckm-viewmore": { kind: SHARED_COMPONENT, owner: "theme/primitives.css" },

  // --- Phase 1 native-style system --------------------------------------
  "ckm-button": {
    kind: SHARED_COMPONENT,
    owner: "components/buttons/Button.css",
    note: "Primary/secondary/tertiary/destructive action button.",
  },
  "ckm-icon-button": { kind: SHARED_COMPONENT, owner: "components/buttons/IconButton.css" },
  "ckm-back": { kind: SHARED_COMPONENT, owner: "components/navigation/BackButton.css" },
  "ckm-page-header": { kind: SHARED_COMPONENT, owner: "components/app-bars/PageHeader.css" },

  // --- Phase 1 form family ----------------------------------------------
  "ckm-field": {
    kind: SHARED_COMPONENT,
    owner: "components/forms/Field.css",
    note: "Label / hint / error column shared by every labelled control, including the choice controls.",
  },
  "ckm-control": {
    kind: SHARED_COMPONENT,
    owner: "components/forms/Control.css",
    note: "The one text-control box: input, textarea and select share it so a screen cannot invent a second shape.",
  },
  "ckm-checkbox": { kind: SHARED_COMPONENT, owner: "components/forms/Checkbox.css" },
  "ckm-radio": { kind: SHARED_COMPONENT, owner: "components/forms/RadioGroup.css" },
  "ckm-switch": { kind: SHARED_COMPONENT, owner: "components/forms/Switch.css" },
  "ckm-file-picker": { kind: SHARED_COMPONENT, owner: "components/forms/FilePicker.css" },

  // --- Phase 1 collection and display family ----------------------------
  "ckm-list": {
    kind: SHARED_COMPONENT,
    owner: "components/lists/List.css",
    note: "The <ul> stack, its heading and the separator geometry.",
  },
  "ckm-row": {
    kind: SHARED_COMPONENT,
    owner: "components/lists/ListRow.css",
    note: "One list row; the ::after overlay is what lets a row navigate and still carry its own control.",
  },
  "ckm-load-more": { kind: SHARED_COMPONENT, owner: "components/lists/LoadMore.css" },
  "ckm-card": {
    kind: SHARED_COMPONENT,
    owner: "components/cards/Card.css",
    note: "Card surface and parts; the title link's overlay makes the whole card tappable.",
  },
  "ckm-badge": { kind: SHARED_COMPONENT, owner: "components/badges/Badge.css" },
  "ckm-chip-row": {
    kind: SHARED_COMPONENT,
    owner: "components/chips/Chip.css",
    note: "The horizontal filter rail chips sit in.",
  },
  "ckm-segmented": { kind: SHARED_COMPONENT, owner: "components/tabs/SegmentedControl.css" },
  "ckm-tabbar": {
    kind: SHARED_COMPONENT,
    owner: "components/tabs/Tabs.css",
    note: "APG tablist + panel. Distinct from the dashboard's legacy ckm-tabs, which Phase 2 retires.",
  },
  // --- Phase 1 overlay set ----------------------------------------------
  "ckm-overlay": {
    kind: SHARED_COMPONENT,
    owner: "components/overlays/Overlay.css",
    note: "Layer, scrim and the bottom/center/full placements shared by every modal surface.",
  },
  "ckm-bottom-sheet": {
    kind: SHARED_COMPONENT,
    owner: "components/overlays/Sheet.css",
    note: "Supersedes the dashboard-era ckm-sheet, which stays untouched as a Phase 0 baseline until Phase 2.",
  },
  "ckm-dialog": {
    kind: SHARED_COMPONENT,
    owner: "components/overlays/Dialog.css",
    note: "Full-screen modal task: app bar, one scroll surface, optional action bar.",
  },
  "ckm-confirm": {
    kind: SHARED_COMPONENT,
    owner: "components/overlays/ConfirmDialog.css",
    note: "role=alertdialog; the action stack is column-reverse so DOM order can put Cancel first.",
  },
  "ckm-action-sheet": {
    kind: SHARED_COMPONENT,
    owner: "components/overlays/ActionSheet.css",
    note: "The mobile form of the plan's 'context menu' — a dialog of actions, deliberately not role=menu.",
  },

  "ckm-gallery": {
    kind: PAGE_FAMILY,
    owner: "dev/PrimitiveGallery.css",
    family: "dev",
    note: "Development-only primitive/state harness at /__mobile-primitives; never mounted in production.",
  },

  // --- Dashboard page family -------------------------------------------
  // One page family, several files. Each child owns a distinct prefix so a
  // section's styles can never bleed into a sibling section.
  "ckm-dashboard": { kind: PAGE_FAMILY, owner: "screens/Dashboard.css", family: "dashboard" },
  "ckm-ov": { kind: PAGE_COMPONENT, owner: "screens/sections/OverviewSection.css", family: "dashboard" },
  "ckm-perf": { kind: PAGE_COMPONENT, owner: "screens/sections/PerformanceSection.css", family: "dashboard" },
  "ckm-rev": { kind: PAGE_COMPONENT, owner: "screens/sections/ReviewsSection.css", family: "dashboard" },
  "ckm-proj": { kind: PAGE_COMPONENT, owner: "screens/sections/ProjectsSection.css", family: "dashboard" },
  "ckm-pc": {
    kind: PAGE_COMPONENT,
    owner: "screens/sections/ProjectsSection.css",
    family: "dashboard",
    note: "Project card sub-component of the projects section.",
  },
  "ckm-aid": { kind: PAGE_COMPONENT, owner: "screens/overlays/AiDetailSheet.css", family: "dashboard" },
  "ckm-allp": { kind: PAGE_COMPONENT, owner: "screens/overlays/AllProjectsSheet.css", family: "dashboard" },
  "ckm-noti": { kind: PAGE_COMPONENT, owner: "screens/overlays/NotificationsPanel.css", family: "dashboard" },
  "ckm-acct": { kind: PAGE_COMPONENT, owner: "screens/overlays/AccountMenu.css", family: "dashboard" },
});

/*
 * The only selectors allowed to sit outside `.ckm`: the mobile surface itself
 * and the <html> scroll lock, which by definition has no `.ckm` ancestor.
 */
export const MOBILE_CSS_UNSCOPED_ALLOWLIST = Object.freeze([
  ".ckm",
  ".ckm-html-lock",
  ".ckm-html-lock body",
]);

export function isRegisteredMobileCssPrefix(prefix) {
  return Object.prototype.hasOwnProperty.call(MOBILE_CSS_PREFIXES, prefix);
}

/** `.ckm-ov__hero-title` -> `ckm-ov`; `.ckm-chip--gold` -> `ckm-chip`. */
export function mobileCssPrefixOf(className) {
  const bare = String(className).replace(/^\./, "");
  if (!bare.startsWith("ckm-")) return null;
  return bare.match(/^(ckm-[a-z0-9]+(?:-[a-z0-9]+)*?)(?:__|--|$)/)?.[1] ?? bare;
}
