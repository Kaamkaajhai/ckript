import { describe, expect, it } from "vitest";
import { resolveMobileExperience } from "./mobileRoutePolicy";

const writer = { id: "writer-1", role: "writer" };
const creator = { id: "creator-1", role: "creator" };
const producer = { id: "producer-1", role: "producer" };

describe("mobileRoutePolicy — experience selection", () => {
  it.each([writer, creator])("mounts the mobile dashboard for $role on a phone", (user) => {
    expect(resolveMobileExperience({
      isMobile: true,
      authLoading: false,
      user,
      pathname: "/dashboard",
    })).toMatchObject({
      experience: "mobile",
      routeId: "writer-dashboard",
      screenId: "dashboard",
    });
  });

  it.each(["/search", "/messages", "/profile/writer-1", "/script/project-1"])(
    "keeps the canonical desktop route during migration instead of swallowing %s",
    (pathname) => {
      expect(resolveMobileExperience({
        isMobile: true,
        authLoading: false,
        user: writer,
        pathname,
      })).toMatchObject({
        experience: "desktop",
        disposition: "desktop-migration-fallback",
      });
    },
  );

  it("does not hand the writer dashboard to an industry audience", () => {
    expect(resolveMobileExperience({
      isMobile: true,
      authLoading: false,
      user: producer,
      pathname: "/dashboard",
    })).toMatchObject({
      experience: "desktop",
      reason: "audience-not-implemented",
    });
  });

  it("keeps public and signed-out routes on their existing branch until implemented", () => {
    expect(resolveMobileExperience({
      isMobile: true,
      authLoading: false,
      user: null,
      pathname: "/",
    })).toMatchObject({
      experience: "desktop",
      disposition: "desktop-migration-fallback",
    });
  });

  it("does not switch experience while authentication is restoring", () => {
    expect(resolveMobileExperience({
      isMobile: true,
      authLoading: true,
      user: writer,
      pathname: "/dashboard",
    })).toMatchObject({ experience: "desktop", reason: "auth-loading" });
  });

  it("does not mount the mobile branch above the phone breakpoint", () => {
    expect(resolveMobileExperience({
      isMobile: false,
      authLoading: false,
      user: writer,
      pathname: "/dashboard",
    })).toMatchObject({ experience: "desktop", reason: "viewport" });
  });

  it("fails open to the existing route tree for an unregistered URL", () => {
    expect(resolveMobileExperience({
      isMobile: true,
      authLoading: false,
      user: writer,
      pathname: "/future/route/not-registered",
    })).toMatchObject({ experience: "desktop", reason: "unregistered-route" });
  });

  it("leaves the preview route to its deterministic App.jsx fixture", () => {
    expect(resolveMobileExperience({
      isMobile: true,
      authLoading: false,
      user: writer,
      pathname: "/__mobile-preview",
      isDev: true,
    })).toMatchObject({ experience: "desktop", reason: "dev-route-owned" });

    expect(resolveMobileExperience({
      isMobile: true,
      authLoading: false,
      user: writer,
      pathname: "/__mobile-preview",
      isDev: false,
    })).toMatchObject({ experience: "desktop", reason: "dev-only" });
  });
});
