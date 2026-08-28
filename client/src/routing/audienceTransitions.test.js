import { describe, expect, it } from "vitest";
import {
  AUDIENCE_ROUTE_RULES,
  findAudienceRouteRule,
  getDefaultAuthenticatedPath,
  resolveAudienceRouteAccess,
  resolvePostAuthPath,
  sanitizeLocalReturnPath,
} from "./audienceTransitions";

const user = (role) => ({ _id: `${role}-1`, role });

describe("audienceTransitions — canonical homes", () => {
  it.each([
    ["writer", "/dashboard"],
    ["creator", "/dashboard"],
    ["producer", "/home"],
    ["director", "/home"],
    ["investor", "/home"],
    ["industry", "/home"],
    ["professional", "/home"],
    ["actor", "/home"],
    ["reader", "/reader"],
    ["admin", "/admin"],
    ["finance", "/finance"],
    // A console-only role. shellPolicy maps judge to READER so its role-coverage test stays honest,
    // which means a judge would fall through to /reader without the explicit case — a browsing
    // surface with no route back to the panel they signed in to use.
    ["judge", "/judge"],
    ["unknown", "/profile"],
  ])("maps %s to %s", (role, expected) => {
    expect(getDefaultAuthenticatedPath(role)).toBe(expected);
  });
});

describe("audienceTransitions — route ownership", () => {
  it("keeps every rule identifiable and ordered", () => {
    expect(new Set(AUDIENCE_ROUTE_RULES.map((rule) => rule.id)).size).toBe(AUDIENCE_ROUTE_RULES.length);
    expect(findAudienceRouteRule("/reader/script/project-1")?.id).toBe("reader-project");
    expect(findAudienceRouteRule("/script/project-1/pay")?.id).toBe("authenticated-project");
  });

  it.each([
    ["writer", "/dashboard"], ["creator", "/create-project/draft-1"],
    ["producer", "/home"], ["director", "/writers"], ["actor", "/dashboard"],
    ["reader", "/reader"], ["reader", "/reader/search"],
  ])("allows %s to open %s", (role, pathname) => {
    expect(resolveAudienceRouteAccess({ pathname, user: user(role) })).toMatchObject({ allowed: true });
  });

  it.each([
    ["writer", "/reader"], ["writer", "/home"], ["writer", "/writers"],
    ["producer", "/reader/search"], ["producer", "/create-project"],
    ["actor", "/mandates"], ["actor", "/offer-holds"],
    ["reader", "/dashboard"], ["reader", "/home"], ["reader", "/script/project-1"],
    ["unknown", "/reader"],
  ])("redirects %s away from foreign route %s", (role, pathname) => {
    const access = resolveAudienceRouteAccess({ pathname, user: user(role) });
    expect(access).toMatchObject({ status: "audience-forbidden", allowed: false });
    expect(access.redirectTo).toBe(getDefaultAuthenticatedPath(role));
  });

  it("holds a protected audience route while auth restores and does not hold shared routes", () => {
    expect(resolveAudienceRouteAccess({ pathname: "/reader", user: user("reader"), authLoading: true }))
      .toMatchObject({ status: "loading", allowed: false });
    expect(resolveAudienceRouteAccess({ pathname: "/featured", user: null, authLoading: true }))
      .toMatchObject({ status: "shared", allowed: true });
  });
});

describe("audienceTransitions — post-auth returns", () => {
  it.each([
    ["/messages?thread=t-1#latest", "/messages?thread=t-1#latest"],
    ["/reader/search?q=night#results", "/reader/search?q=night#results"],
    ["//evil.example/path", ""],
    ["https://evil.example/path", ""],
    ["/\\evil.example", ""],
    ["/login?redirect=%2Fdashboard", ""],
  ])("sanitizes %s", (value, expected) => {
    expect(sanitizeLocalReturnPath(value)).toBe(expected);
  });

  it("preserves a full authorized return and replaces a foreign one with the role home", () => {
    expect(resolvePostAuthPath({ requestedPath: "/reader/search?q=night#results", user: user("reader") }))
      .toBe("/reader/search?q=night#results");
    expect(resolvePostAuthPath({ requestedPath: "/reader/search?q=night#results", user: user("writer") }))
      .toBe("/dashboard");
    expect(resolvePostAuthPath({ requestedPath: "/create-project/draft-1?fresh=1", user: user("producer") }))
      .toBe("/home");
    expect(resolvePostAuthPath({ requestedPath: "/featured?genre=Drama", user: user("producer") }))
      .toBe("/featured?genre=Drama");
  });
});
