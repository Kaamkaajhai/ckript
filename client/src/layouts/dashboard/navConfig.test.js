// The dashboard shell's nav model.
//
// Context that makes these tests worth having: the app has TWO independent navigation systems —
// components/Sidebar.jsx (used by MainLayout) and this buildNav (used by DashboardShell). A writer
// signed in on /dashboard sees THIS one. The competition feature was added only to the other, so
// every writer had a live competition they could not reach from anywhere in the UI.
import { describe, it, expect } from "vitest";
import { buildNav } from "./navConfig";
import { SYMBOLS } from "./icons.jsx";

const forWriter = (role = "writer") =>
  buildNav({ user: { role }, profilePath: "/profile/ada", msgCount: 3 });

const paths = (items = []) => items.filter((i) => i && !i.divider).map((i) => i.path);

describe("buildNav — writer", () => {
  it("puts the live Challenge in the always-visible rail", () => {
    expect(paths(forWriter().primary)).toContain("/challenge");
  });

  it("offers both Challenge and My Competitions in the drawer", () => {
    const drawer = paths(forWriter().drawer);
    expect(drawer).toContain("/challenge");
    expect(drawer).toContain("/my-competitions");
  });

  it("treats creators the same as writers", () => {
    expect(paths(forWriter("creator").primary)).toContain("/challenge");
  });

  // The bottom nav used to select by POSITION (primary[0], [1], [3]), so inserting Challenge into
  // the rail silently pushed Messages out of the mobile nav. This is the guard for that.
  it("keeps the mobile bottom nav intact when the rail grows", () => {
    const { mobile } = forWriter();
    expect(paths(mobile)).toEqual(["/dashboard", "/create-project", "/messages", "/profile/ada"]);
    expect(mobile.length).toBeLessThanOrEqual(4);
    expect(mobile.every(Boolean)).toBe(true);
  });

  it("carries the unread badge through to mobile, not just the rail", () => {
    const messages = forWriter().mobile.find((i) => i.path === "/messages");
    expect(messages?.badge).toBe(3);
  });

  it("uses icon keys that actually resolve to a Material Symbol", () => {
    const { primary, drawer } = forWriter();
    for (const item of [...primary, ...drawer].filter((i) => !i.divider)) {
      expect(SYMBOLS[item.icon], `icon "${item.icon}" is not in SYMBOLS`).toBeTruthy();
    }
  });

  it("gives every non-divider item a unique key", () => {
    for (const list of Object.values(forWriter())) {
      const keys = list.filter((i) => i && !i.divider).map((i) => i.key);
      expect(new Set(keys).size, `duplicate key in ${JSON.stringify(keys)}`).toBe(keys.length);
    }
  });
});

describe("buildNav — other roles are unchanged", () => {
  // Competitions are writer-only, so these must NOT have gained a trophy.
  it.each(["reader", "investor", "producer"])("%s gets no competition entries", (role) => {
    const nav = buildNav({ user: { role }, profilePath: "/profile/x", msgCount: 0 });
    const every = [...nav.primary, ...nav.drawer, ...nav.mobile];
    expect(paths(every).some((p) => p.startsWith("/challenge") || p === "/my-competitions")).toBe(false);
  });

  it("readers still land on their own home", () => {
    const nav = buildNav({ user: { role: "reader" }, profilePath: "/profile/x", msgCount: 0 });
    expect(paths(nav.primary)).toContain("/reader");
  });
});
