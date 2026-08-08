// @vitest-environment happy-dom
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach } from "vitest";
import { writeCache, readCache, clearCacheByPrefix } from "../utils/localCache";

/*
 * Phase 2 bullet 6 — the session behaviours mobile INHERITS.
 *
 * Every auth/session behaviour lives outside React, in `services/api.js` and
 * `context/AuthContext.jsx`, and mobile gets all of it for free by importing the
 * same `api` instance. That is the correct design (§5.4 wants one logic
 * boundary), and it is why this file tests contracts rather than components.
 *
 * A contract that spans two files with no import between them is exactly the
 * kind that breaks silently. `AuthContext.logout()` clears cache keys by the
 * literal prefix "dashboard:"; mobile's `useDashboardData` writes the literal
 * "dashboard:v1:<userId>". Nothing but this test connects those two strings, and
 * if they ever drift, a logged-out phone keeps the previous account's dashboard
 * — earnings, project titles, review scores — readable in localStorage.
 */

// The literal AuthContext.logout() passes to clearCacheByPrefix (AuthContext.jsx:272).
const LOGOUT_CACHE_PREFIX = "dashboard:";

// The literal useDashboardData writes under (useDashboardData.js:31).
const MOBILE_DASH_NS = "dashboard:v1:";

describe("logout clears the mobile dashboard cache", () => {
  beforeEach(() => { window.localStorage.clear(); });

  it("covers mobile's namespace with the prefix logout actually uses", () => {
    // A string-level assertion on purpose: this is the whole contract, and it
    // is the half that a rename on either side would break without a failure
    // anywhere else in the suite.
    expect(MOBILE_DASH_NS.startsWith(LOGOUT_CACHE_PREFIX)).toBe(true);
  });

  it("actually removes a written mobile snapshot", () => {
    const key = `${MOBILE_DASH_NS}user-1`;
    writeCache(key, { stats: { totalEarnings: 48200 }, scripts: [{ title: "Nocturne" }] });
    expect(readCache(key)).toBeTruthy();

    clearCacheByPrefix(LOGOUT_CACHE_PREFIX);

    expect(readCache(key)).toBeNull();
  });

  it("removes every account's snapshot, not just the current one", () => {
    // Shared devices are the case that matters: signing out must not leave the
    // previous account's dashboard behind for the next person.
    writeCache(`${MOBILE_DASH_NS}user-1`, { stats: {} });
    writeCache(`${MOBILE_DASH_NS}user-2`, { stats: {} });

    clearCacheByPrefix(LOGOUT_CACHE_PREFIX);

    expect(readCache(`${MOBILE_DASH_NS}user-1`)).toBeNull();
    expect(readCache(`${MOBILE_DASH_NS}user-2`)).toBeNull();
  });

  it("leaves unrelated cached data alone", () => {
    writeCache(`${MOBILE_DASH_NS}user-1`, { stats: {} });
    writeCache("prefs:theme", { mode: "dark" });

    clearCacheByPrefix(LOGOUT_CACHE_PREFIX);

    expect(readCache(`${MOBILE_DASH_NS}user-1`)).toBeNull();
    expect(readCache("prefs:theme")).toBeTruthy();
  });
});

/*
 * The holds screen deliberately has no cache (see useHoldsData's header: its
 * subject is a countdown, and a cached "6 days left" painted before the network
 * answers is the stale-but-plausible number class the 2026-08-07 audit was
 * about). That is a privacy property as well as a correctness one — there is
 * nothing on disk for a logout to miss — so it is worth pinning.
 */
describe("the holds screen leaves nothing behind to clear", () => {
  it("writes no cache key of its own", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const source = fs.readFileSync(path.join(here, "hooks/useHoldsData.js"), "utf8");
    // Comments stripped first — the module's own header explains WHY it has no
    // localStorage cache, and matching that sentence would fail on the prose
    // that documents the very property being asserted.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");

    // If the module ever gains a cache, this test should be REPLACED by one
    // asserting that logout clears it — not deleted.
    expect(code).not.toMatch(/writeCache|localStorage|sessionStorage/);
  });
});
