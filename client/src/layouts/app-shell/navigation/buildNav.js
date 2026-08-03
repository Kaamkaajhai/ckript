/*
 * buildNav — the app shell's navigation model.
 *
 * The shell renders whatever this returns, so adding a destination is a data
 * edit in one preset file, never JSX surgery. The registry below dispatches on
 * AUDIENCE (from shellPolicy), which replaced a chain of
 * `if (role === "reader") … if (role === "investor" || role === "producer") …`
 * whose final `else` quietly swallowed every role nobody had thought about.
 *
 * SHAPES
 * ------
 * `rail`   compact icon rail, always visible.
 * `drawer` the overlay drawer: same destinations, longer labels, `{divider:true}`
 *          separators between groups.
 * `mobile` bottom bar, hard-capped at MOBILE_SLOTS.
 *
 * A nav item is:
 *   { key, path, label, icon, exact?, badge?, fresh? }
 *     key    unique within its list; also how the mobile bar picks items
 *     icon   a key in navigation/icons SYMBOLS
 *     exact  match the path exactly instead of by prefix (for "/" style roots)
 *     badge  number; renders a pill when > 0
 *     fresh  pass `state: { startFresh: true }` on navigation
 */

import { AUDIENCE, getAudience } from "../shellPolicy";
import writerNav from "./presets/writerNav";
import industryNav from "./presets/industryNav";
import readerNav from "./presets/readerNav";
import adminNav from "./presets/adminNav";

/**
 * @typedef {Object} NavContext
 * @property {Object} user
 * @property {string} profilePath
 * @property {number} msgCount
 *
 * @typedef {Object} NavPreset
 * @property {Array}  rail
 * @property {Array}  drawer
 * @property {string[]} mobileKeys
 * @property {{title: string, endpoint: string, select?: Function}|null} collection
 */

/*
 * Audience → preset. The one place a new audience is wired in.
 */
const PRESETS = {
  [AUDIENCE.WRITER]: writerNav,
  [AUDIENCE.INDUSTRY]: industryNav,
  [AUDIENCE.READER]: readerNav,
  [AUDIENCE.ADMIN]: adminNav,
};

/*
 * The mobile bar is a fixed row of four. Profile always takes the last slot, so
 * a preset chooses three.
 */
export const MOBILE_SLOTS = 4;

/**
 * Build the mobile bar by KEY rather than by index.
 *
 * The original selected `[primary[0], primary[1], primary[3]]`, so inserting one
 * item into the rail silently pushed Messages out of the bottom bar on phones —
 * which is exactly what happened when Challenge was added. Selecting by key
 * means the rail can be reordered or grown without touching mobile.
 */
const buildMobile = (rail, mobileKeys, profilePath) => {
  const byKey = new Map(rail.filter((item) => item?.key).map((item) => [item.key, item]));

  const picked = mobileKeys
    .map((key) => byKey.get(key))
    .filter(Boolean)
    .slice(0, MOBILE_SLOTS);

  return picked;
};

/**
 * @param {Object} options
 * @param {Object} options.user         current auth user
 * @param {string} options.profilePath  canonical profile path for this viewer
 * @param {number} [options.msgCount]   unread messages badge
 * @returns {{ primary: Array, drawer: Array, mobile: Array, collection: Object|null, audience: string }}
 */
export function buildNav({ user, profilePath, msgCount = 0 } = {}) {
  const audience = getAudience(user?.role);

  // getAudience is exhaustive and falls back to READER, so this cannot be
  // undefined — the `||` is belt-and-braces for a preset removed by mistake.
  const preset = (PRESETS[audience] || PRESETS[AUDIENCE.READER])({
    user,
    profilePath,
    msgCount,
  });

  return {
    // `primary` is the historical name for the rail; kept so existing call
    // sites and tests read the same.
    primary: preset.rail,
    drawer: preset.drawer,
    mobile: buildMobile(preset.rail, preset.mobileKeys, profilePath),
    collection: preset.collection ?? null,

    // Per-audience chrome. The topbar and drawer read these instead of
    // hard-coding the writer's logo target and search copy for everyone.
    audience,
    roleLabel: preset.roleLabel || "Member",
    homePath: preset.home || profilePath,
    searchPlaceholder: preset.searchPlaceholder || "Search…",
  };
}

export default buildNav;
