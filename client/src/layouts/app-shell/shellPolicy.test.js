/*
 * The point of these tests is not that the current mapping is "correct" — it is
 * that the mapping is COMPLETE and cannot silently regress.
 *
 * The bug this file exists to prevent: the app had four different, disagreeing
 * definitions of who counts as a film-industry professional, so `director`,
 * `industry`, `professional` and `actor` matched none of them and fell through
 * to the writer chrome. Every one of those users saw a nav rail offering
 * "Create Project" and "Upload Project".
 */
import { describe, it, expect } from "vitest";
import {
  AUDIENCE,
  SHELL,
  CONTENT_VARIANT,
  KNOWN_ROLES,
  FILM_PROFESSIONAL_ROLES,
  getAudience,
  getShell,
  isKnownRole,
  isWriterAudience,
  isIndustryAudience,
  isFullBleedRoute,
  isWorkspaceRoute,
  resolveShell,
  usesAppShell,
} from "./shellPolicy";

/*
 * Mirror of the `role` enum in server/models/User.js. If someone adds a role to
 * the model and not to the policy, the first test here fails and tells them
 * which one — instead of that user quietly getting a screenwriter's toolbar.
 *
 * Being a hand-copied literal, this only works if it is actually kept in step:
 * a role missing from BOTH files cannot fail a test that has never heard of it.
 * `finance` is missing here today and has been since it was added to the model —
 * mapping it means choosing its audience, which buildNav and isAdminAudience
 * both consume, so it is left alone rather than decided in passing.
 */
const SERVER_ROLE_ENUM = [
  "creator", "investor", "producer", "director", "actor",
  "reader", "writer", "industry", "professional", "admin", "judge",
];

describe("shellPolicy — role coverage", () => {
  it("maps every role in the server enum", () => {
    const unmapped = SERVER_ROLE_ENUM.filter((role) => !isKnownRole(role));
    expect(unmapped, `unmapped roles: ${unmapped.join(", ")}`).toEqual([]);
  });

  it("does not map roles the server cannot issue", () => {
    const extra = KNOWN_ROLES.filter((role) => !SERVER_ROLE_ENUM.includes(role));
    expect(extra, `roles not in the User model: ${extra.join(", ")}`).toEqual([]);
  });

  it("always returns a real audience, even for junk", () => {
    for (const role of [undefined, null, "", "   ", "wizard", 42, {}]) {
      expect(Object.values(AUDIENCE)).toContain(getAudience(role));
    }
  });

  it("normalises case and whitespace", () => {
    expect(getAudience("  PRODUCER ")).toBe(AUDIENCE.INDUSTRY);
    expect(getAudience("Writer")).toBe(AUDIENCE.WRITER);
  });

  // The regression that motivated the whole file.
  it("never lands an unknown role in the writer audience", () => {
    for (const role of ["wizard", "", undefined, "gaffer"]) {
      expect(isWriterAudience(role)).toBe(false);
    }
  });
});

describe("shellPolicy — audience assignment", () => {
  it.each(["writer", "creator"])("%s is a writer", (role) => {
    expect(getAudience(role)).toBe(AUDIENCE.WRITER);
  });

  // These four were the ones falling through before.
  it.each(["producer", "director", "industry", "professional", "investor", "actor"])(
    "%s gets industry chrome",
    (role) => {
      expect(isIndustryAudience(role)).toBe(true);
      expect(isWriterAudience(role)).toBe(false);
    },
  );

  it("keeps reader and admin distinct from writers", () => {
    expect(getAudience("reader")).toBe(AUDIENCE.READER);
    expect(getAudience("admin")).toBe(AUDIENCE.ADMIN);
  });

  /*
   * The guard against drift with utils/industryAccess. That list decides who
   * pays as a film professional and who gets contact-reveal quota; if a role is
   * on it, it must not be handed writer or reader chrome.
   */
  it("agrees with industryAccess about who is a film professional", () => {
    for (const role of FILM_PROFESSIONAL_ROLES) {
      expect(getAudience(role), `${role} is billed as industry`).toBe(AUDIENCE.INDUSTRY);
    }
  });
});

describe("shellPolicy — which shell", () => {
  it.each(["writer", "creator", "producer", "director", "industry", "professional", "investor", "actor"])(
    "%s renders in the app shell",
    (role) => {
      expect(getShell(role)).toBe(SHELL.APP);
      expect(usesAppShell(role)).toBe(true);
    },
  );

  it.each(["reader", "admin"])("%s is still on MainLayout", (role) => {
    expect(getShell(role)).toBe(SHELL.MAIN);
  });
});

describe("shellPolicy — content variant", () => {
  it("gives an ordinary page the padded column", () => {
    expect(resolveShell({ role: "producer", pathname: "/search" }).contentVariant)
      .toBe(CONTENT_VARIANT.PAGE);
  });

  /*
   * /writers is the roster desk: a facet rail, a register and a detail pane,
   * each scrolling independently inside a bounded area. The shell's padded
   * single-scroll column would give it nothing to bound itself against.
   */
  it("treats /writers as full-bleed for every audience that reaches it", () => {
    expect(isFullBleedRoute("/writers", "producer")).toBe(true);
    expect(isFullBleedRoute("/writers", "reader")).toBe(true);
    expect(resolveShell({ role: "producer", pathname: "/writers" }).contentVariant)
      .toBe(CONTENT_VARIANT.FILL);
  });

  it("does not let /writers match a route that merely starts with it", () => {
    expect(isFullBleedRoute("/writers-report", "producer")).toBe(false);
  });

  it("lets messages, script detail and profile own the area for everyone", () => {
    for (const pathname of ["/messages", "/script/abc", "/profile/ada"]) {
      expect(isFullBleedRoute(pathname, "producer"), pathname).toBe(true);
      expect(isFullBleedRoute(pathname, "writer"), pathname).toBe(true);
    }
  });

  /*
   * /dashboard is one URL and two completely different pages. Both own their
   * scroll now — the writer's 2B dashboard and the industry ledger — so neither
   * may be handed the shell's padded column, which would inset the ledger's
   * full-bleed banner and masthead rules.
   */
  it("treats /dashboard as full-bleed for both dashboards", () => {
    expect(isFullBleedRoute("/dashboard", "writer")).toBe(true);
    expect(isFullBleedRoute("/dashboard", "producer")).toBe(true);
    expect(resolveShell({ role: "producer", pathname: "/dashboard" }).contentVariant)
      .toBe(CONTENT_VARIANT.FILL);
  });

  it("translates full-bleed into each shell's own vocabulary", () => {
    expect(resolveShell({ role: "writer", pathname: "/messages" }).contentVariant)
      .toBe(CONTENT_VARIANT.FILL);
    // Reader is still on MainLayout, which calls the same thing "full".
    expect(resolveShell({ role: "reader", pathname: "/messages" }).contentVariant)
      .toBe(CONTENT_VARIANT.FULL);
  });

  it("flags the upload workspace without the shell knowing the route", () => {
    expect(isWorkspaceRoute("/upload")).toBe(true);
    expect(isWorkspaceRoute("/uploads-report")).toBe(false);
    expect(resolveShell({ role: "writer", pathname: "/upload" })).toMatchObject({
      contentVariant: CONTENT_VARIANT.PAGE,
      isWorkspace: true,
    });
  });

  it("survives a missing pathname", () => {
    expect(() => resolveShell({ role: "producer" })).not.toThrow();
    expect(resolveShell({}).contentVariant).toBe(CONTENT_VARIANT.PAGE);
  });
});
