/*
 * shellPolicy.js — the single source of truth for "who sees which chrome".
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Before this, the answer was spread across five copies of
 * `role === "writer" || role === "creator"` in App.jsx, a different
 * `!["reader","investor","producer"].includes(role)` inside the shell, a third
 * `role === 'professional' || 'producer' || 'investor'` in components/Sidebar,
 * and a fourth (the real one) in utils/industryAccess. They disagreed, so roles
 * fell through the gaps: a `director`, `industry`, `professional` or `actor`
 * signed in and got the WRITER rail — "Create Project", "Upload Project",
 * "Challenge" — because none of the four lists mentioned them.
 *
 * The fix is to map roles ONCE, exhaustively, and derive everything else from
 * the audience. `ROLE_AUDIENCE` below is checked against the server's role enum
 * by shellPolicy.test.js, so adding a role to the model without deciding what
 * chrome it gets is a test failure rather than a silent mis-render.
 *
 * ADDING A ROLE      → add one line to ROLE_AUDIENCE.
 * ADDING AN AUDIENCE → add it here, add a nav preset, register it in
 *                      navigation/buildNav.js. Nothing else needs to change.
 */

import { FILM_PROFESSIONAL_ROLE_LIST } from "../../utils/industryAccess";

/** The four kinds of person the app has chrome for. */
export const AUDIENCE = {
  WRITER: "writer",
  INDUSTRY: "industry",
  READER: "reader",
  ADMIN: "admin",
};

/**
 * Which shell renders the chrome.
 *   "app"  — layouts/app-shell (icon rail + overlay drawer + light topbar).
 *   "main" — layouts/MainLayout (the older fixed-sidebar shell).
 *
 * "main" is not a permanent home. Reader and admin are the last two audiences
 * on it; when they move, MainLayout and components/Sidebar delete together and
 * the app has one shell.
 */
export const SHELL = { APP: "app", MAIN: "main" };

/**
 * How the content area mounts its child.
 *   "fill" — the page owns the whole area (its own scroll, its own rails).
 *   "page" — the shell supplies padding and a single scroll column.
 *   "full" — MainLayout's equivalent of "fill".
 */
export const CONTENT_VARIANT = { FILL: "fill", PAGE: "page", FULL: "full" };

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

/*
 * Every value of the server's `User.role` enum, mapped to an audience.
 * Keep in step with server/models/User.js — the test asserts it.
 */
const ROLE_AUDIENCE = {
  // People who write and sell scripts.
  writer: AUDIENCE.WRITER,
  creator: AUDIENCE.WRITER,

  // People who buy, option, finance or cast them. utils/industryAccess already
  // treats these five as one group for access + billing, and they share every
  // destination, so they share one set of chrome too.
  producer: AUDIENCE.INDUSTRY,
  director: AUDIENCE.INDUSTRY,
  industry: AUDIENCE.INDUSTRY,
  professional: AUDIENCE.INDUSTRY,
  investor: AUDIENCE.INDUSTRY,

  // `actor` is a discovery role: they browse projects and talk to writers, they
  // do not upload screenplays. It is deliberately NOT in
  // FILM_PROFESSIONAL_ROLE_LIST (that list gates paid contact reveals, which an
  // actor does not get), but the industry chrome — Home, Featured, Writers,
  // Search, Messages — is the right set of destinations for them.
  actor: AUDIENCE.INDUSTRY,

  reader: AUDIENCE.READER,
  admin: AUDIENCE.ADMIN,
};

/*
 * An unrecognised role is a data problem, not a licence to guess. Reader chrome
 * is the safe landing: it is read-only, so a mis-typed role can browse but
 * cannot be handed authoring tools it should not have. (The previous fallback
 * was the writer shell, which is why unmapped roles got "Upload Project".)
 */
const FALLBACK_AUDIENCE = AUDIENCE.READER;

/** Roles the app knows about. Exported for tests and admin tooling. */
export const KNOWN_ROLES = Object.freeze(Object.keys(ROLE_AUDIENCE));

/** @returns {string} one of AUDIENCE — never undefined. */
export const getAudience = (role) =>
  ROLE_AUDIENCE[normalizeRole(role)] || FALLBACK_AUDIENCE;

export const isKnownRole = (role) =>
  Object.prototype.hasOwnProperty.call(ROLE_AUDIENCE, normalizeRole(role));

export const isWriterAudience = (role) => getAudience(role) === AUDIENCE.WRITER;
export const isIndustryAudience = (role) => getAudience(role) === AUDIENCE.INDUSTRY;
export const isReaderAudience = (role) => getAudience(role) === AUDIENCE.READER;
export const isAdminAudience = (role) => getAudience(role) === AUDIENCE.ADMIN;

/*
 * Audiences already migrated to the app shell. This is the migration switch:
 * moving reader over is adding one entry, not editing five call sites.
 */
const APP_SHELL_AUDIENCES = new Set([AUDIENCE.WRITER, AUDIENCE.INDUSTRY]);

/** @returns {string} one of SHELL */
export const getShell = (role) =>
  APP_SHELL_AUDIENCES.has(getAudience(role)) ? SHELL.APP : SHELL.MAIN;

export const usesAppShell = (role) => getShell(role) === SHELL.APP;

/*
 * Routes whose page draws its own full-bleed workspace and must not be given
 * the shell's padded scroll column.
 *
 * This was previously inline booleans in App.jsx (`isMessages`, `isDashboard`)
 * recomputed inside each layout wrapper, which is how /messages ended up
 * full-bleed in one wrapper and padded in another.
 *
 * `audiences` is the important part. Full-bleed is a property of the PAGE, not
 * the URL, and one URL can resolve to different pages per audience: /dashboard
 * is the writer's self-scrolling 2B dashboard but the producer's ordinary
 * padded page. Listing the prefix unqualified would strip the padding off the
 * producer dashboard. Omit `audiences` only when every audience's page at that
 * prefix really does own its own scroll.
 */
const FULL_BLEED_ROUTES = [
  { prefix: "/messages" },                            // operator console — two-pane, own scroll
  { prefix: "/script/" },                             // cinematic script detail
  { prefix: "/profile" },                             // profile workspace
  { prefix: "/dashboard", audiences: [AUDIENCE.WRITER] },
];

/*
 * Workspace routes keep the shell's scroll column but drop its padding, because
 * the page is a fixed-height editor that manages its own overflow.
 *
 * The shell used to test `pathname === "/upload"` inline. Same idea as above:
 * the shell should not know route strings.
 */
const WORKSPACE_PREFIXES = ["/upload"];

/*
 * Prefix match on SEGMENT boundaries, not raw characters. A plain
 * `startsWith("/upload")` also matches "/uploads-report", which is how this
 * class of route check usually goes wrong.
 */
const matchesPrefix = (pathname, prefix) => {
  const path = String(pathname || "");
  if (path === prefix) return true;
  if (prefix.endsWith("/")) return path.startsWith(prefix);
  return path.startsWith(`${prefix}/`);
};

export const isFullBleedRoute = (pathname = "", role) => {
  const audience = getAudience(role);
  return FULL_BLEED_ROUTES.some(({ prefix, audiences }) => (
    matchesPrefix(pathname, prefix)
    && (!audiences || audiences.includes(audience))
  ));
};

export const isWorkspaceRoute = (pathname = "") =>
  WORKSPACE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));

/**
 * The complete chrome decision for a request.
 *
 * @param {Object} options
 * @param {string} options.role      the viewer's User.role
 * @param {string} options.pathname  current location.pathname
 * @returns {{ audience: string, shell: string, contentVariant: string, isWorkspace: boolean }}
 */
export const resolveShell = ({ role, pathname = "" } = {}) => {
  const audience = getAudience(role);
  const shell = getShell(role);

  // The two shells spell "the page owns the area" differently ("fill" vs
  // "full"). Callers should not have to remember which word belongs to which.
  const contentVariant = isFullBleedRoute(pathname, role)
    ? (shell === SHELL.APP ? CONTENT_VARIANT.FILL : CONTENT_VARIANT.FULL)
    : CONTENT_VARIANT.PAGE;

  return {
    audience,
    shell,
    contentVariant,
    isWorkspace: isWorkspaceRoute(pathname),
  };
};

/*
 * Sanity check that this file and utils/industryAccess cannot drift apart.
 * FILM_PROFESSIONAL_ROLE_LIST drives billing and contact-reveal limits; if a
 * role is a paying film professional there, it must get industry chrome here.
 * Asserted by the test rather than at runtime.
 */
export const FILM_PROFESSIONAL_ROLES = FILM_PROFESSIONAL_ROLE_LIST;
