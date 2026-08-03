// The app shell's nav model.
//
// Context that makes these tests worth having: the app used to have TWO
// independent navigation systems — components/Sidebar.jsx (used by MainLayout)
// and this builder (used by the app shell). A writer signed in on /dashboard saw
// this one. The competition feature was added only to the other, so every writer
// had a live competition they could not reach from anywhere in the UI.
//
// Consolidating producers onto the app shell removes the second nav for them, so
// these tests now also guard the producer's destinations.
import { describe, it, expect } from "vitest";
import { buildNav, MOBILE_SLOTS } from "./buildNav";
import { SYMBOLS } from "./symbols";
import { AUDIENCE, KNOWN_ROLES } from "../shellPolicy";

const navFor = (role, profilePath = "/profile/ada", msgCount = 3) =>
  buildNav({ user: { role }, profilePath, msgCount });

const forWriter = (role = "writer") => navFor(role);

const items = (list = []) => list.filter((i) => i && !i.divider);
const paths = (list = []) => items(list).map((i) => i.path);
const lists = (nav) => [nav.primary, nav.drawer, nav.mobile];

describe("buildNav — writer", () => {
  it("puts the live Challenge in the always-visible rail", () => {
    expect(paths(forWriter().primary)).toContain("/challenge");
  });

  it("offers both Challenge and My Competitions in the drawer", () => {
    const drawer = paths(forWriter().drawer);
    expect(drawer).toContain("/challenge");
    // My Competitions is the hub's fourth tab now, not a route of its own.
    expect(drawer).toContain("/challenge?tab=mine");
  });

  it("treats creators the same as writers", () => {
    expect(paths(forWriter("creator").primary)).toContain("/challenge");
  });

  // The bottom nav used to select by POSITION (primary[0], [1], [3]), so
  // inserting Challenge into the rail silently pushed Messages out of the mobile
  // nav. This is the guard for that.
  it("keeps the mobile bottom nav intact when the rail grows", () => {
    const { mobile } = forWriter();
    expect(paths(mobile)).toEqual(["/dashboard", "/challenge"]);
    expect(mobile.length).toBeLessThanOrEqual(MOBILE_SLOTS);
    expect(mobile.every(Boolean)).toBe(true);
  });

  it("carries the unread badge through to mobile for roles that have it", () => {
    const messages = navFor("producer").mobile.find((i) => i.path === "/messages");
    expect(messages?.badge).toBe(3);
  });

  it("offers My Projects as the drawer collection", () => {
    expect(forWriter().collection).toMatchObject({
      title: "My Projects",
      endpoint: "/scripts/mine",
    });
  });
});

describe("buildNav — industry (producer / director / investor)", () => {
  /*
   * Producers previously had two different navs depending on which shell
   * rendered them, and consolidating must not drop a destination either one
   * could reach. These are the ones that only existed in components/Sidebar.jsx
   * and would have been silently lost by moving to the shell's old producer nav.
   */
  it.each([
    ["/dashboard", "their own dashboard"],
    ["/top-script", "top scripts"],
    ["/search", "project search"],
    ["/writers", "the writer directory"],
    ["/messages", "messages"],
    ["/featured", "featured projects"],
    ["/home", "the discovery home"],
  ])("still reaches %s (%s)", (path) => {
    const nav = navFor("producer");
    expect(paths([...nav.primary, ...nav.drawer])).toContain(path);
  });

  it("finally links My Mandates, which no nav in the app pointed at", () => {
    expect(paths(navFor("producer").drawer)).toContain("/mandates");
  });

  it("keeps saved projects reachable via the profile bookmarks tab", () => {
    expect(paths(navFor("producer").drawer)).toContain("/profile/ada?tab=bookmarks");
  });

  it("offers the Watchlist as the drawer collection", () => {
    expect(navFor("producer").collection).toMatchObject({
      title: "Watchlist",
      endpoint: "/users/watchlist",
    });
  });

  // The roles that used to fall through to the writer nav entirely.
  it.each(["producer", "director", "industry", "professional", "investor", "actor"])(
    "%s gets industry chrome, not a screenwriter's toolbar",
    (role) => {
      const nav = navFor(role);
      expect(nav.audience).toBe(AUDIENCE.INDUSTRY);
      const every = paths([...nav.primary, ...nav.drawer]);
      expect(every).not.toContain("/create-project");
      expect(every).not.toContain("/upload");
      expect(every).toContain("/home");
    },
  );

  it("gives investors and producers the identical nav", () => {
    const investor = navFor("investor");
    const producer = navFor("producer");
    expect(paths(investor.primary)).toEqual(paths(producer.primary));
    expect(paths(investor.drawer)).toEqual(paths(producer.drawer));
  });
});

describe("buildNav — admin", () => {
  it("links the admin console instead of offering to write a script", () => {
    const nav = navFor("admin");
    const every = paths([...nav.primary, ...nav.drawer]);
    expect(every).toContain("/admin");
    expect(every).not.toContain("/create-project");
    expect(every).not.toContain("/upload");
  });
});

describe("buildNav — competitions stay writer-only", () => {
  it.each(["reader", "investor", "producer", "director", "actor", "admin"])(
    "%s gets no competition entries",
    (role) => {
      const nav = navFor(role);
      const every = paths(lists(nav).flat());
      expect(every.some((p) => p.startsWith("/challenge"))).toBe(false);
    },
  );

  it("readers still land on their own home", () => {
    expect(paths(navFor("reader").primary)).toContain("/reader");
  });
});

/*
 * Invariants that must hold for EVERY audience. These are the cheap guards that
 * catch a typo'd icon key or a duplicated nav key in a new preset, which
 * otherwise surface as an invisible glyph or a React key warning in production.
 */
describe("buildNav — invariants across every role", () => {
  const everyRole = [...KNOWN_ROLES, "wizard", "", undefined];

  it.each(everyRole)("role %s produces a complete, renderable model", (role) => {
    const nav = navFor(role);

    expect(Array.isArray(nav.primary)).toBe(true);
    expect(nav.primary.length).toBeGreaterThan(0);
    expect(Array.isArray(nav.drawer)).toBe(true);
    expect(nav.mobile.length).toBeLessThanOrEqual(MOBILE_SLOTS);
    expect(nav.mobile.every(Boolean)).toBe(true);
  });

  it.each(everyRole)("role %s uses only icons that resolve to a symbol", (role) => {
    const nav = navFor(role);
    for (const item of items(lists(nav).flat())) {
      expect(SYMBOLS[item.icon], `icon "${item.icon}" is not in SYMBOLS`).toBeTruthy();
    }
  });

  it.each(everyRole)("role %s gives every item a unique key per list", (role) => {
    for (const list of lists(navFor(role))) {
      const keys = items(list).map((i) => i.key);
      expect(new Set(keys).size, `duplicate key in ${JSON.stringify(keys)}`).toBe(keys.length);
    }
  });

  it.each(everyRole)("role %s gives every item a path and a label", (role) => {
    for (const item of items(lists(navFor(role)).flat())) {
      expect(item.path, `${item.key} has no path`).toBeTruthy();
      expect(item.label, `${item.key} has no label`).toBeTruthy();
    }
  });



  it("never throws on a missing user or profile path", () => {
    expect(() => buildNav({})).not.toThrow();
    expect(() => buildNav()).not.toThrow();
  });

  it.each(everyRole)("role %s gets chrome copy for the topbar and drawer", (role) => {
    const nav = navFor(role);
    expect(nav.roleLabel).toBeTruthy();
    expect(nav.homePath).toBeTruthy();
    expect(nav.searchPlaceholder).toBeTruthy();
  });
});

/*
 * The topbar used to hard-code the writer's logo target and search copy, so a
 * producer clicking the logo went to a page built for someone else.
 */
describe("buildNav — per-audience chrome", () => {
  it("sends each audience's logo somewhere that belongs to them", () => {
    expect(navFor("writer").homePath).toBe("/dashboard");
    expect(navFor("producer").homePath).toBe("/home");
    expect(navFor("reader").homePath).toBe("/reader");
    expect(navFor("admin").homePath).toBe("/admin");
  });

  // A director should not be greeted as a "Producer".
  it("labels each industry role by its actual job title", () => {
    expect(navFor("producer").roleLabel).toBe("Producer");
    expect(navFor("director").roleLabel).toBe("Director");
    expect(navFor("investor").roleLabel).toBe("Investor");
    expect(navFor("actor").roleLabel).toBe("Actor");
    expect(navFor("writer").roleLabel).toBe("Screenwriter");
  });
});
