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

  it.each(["/messages", "/profile/writer-1", "/script/project-1"])(
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

  it.each([writer, creator, producer])("mounts native search for authenticated $role users", (user) => {
    expect(resolveMobileExperience({
      isMobile: true,
      authLoading: false,
      user,
      pathname: "/search",
      search: "?q=night&type=projects",
    })).toMatchObject({
      experience: "mobile",
      routeId: "search",
      screenId: "search",
    });
  });

  it("keeps signed-out search on the authenticated desktop branch", () => {
    expect(resolveMobileExperience({
      isMobile: true,
      authLoading: false,
      user: null,
      pathname: "/search",
    })).toMatchObject({ experience: "desktop", reason: "authentication-required" });
  });

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

  /*
   * Phase 2 bullet 5. Two routes, two different reasons, and the audience gate
   * is the load-bearing part of both — so it is asserted from both sides rather
   * than only from the side that works.
   */
  describe("/ai-tools — the dashboard under another name", () => {
    it.each([writer, creator])("mounts the mobile dashboard for $role", (user) => {
      /*
       * App.jsx mounts /dashboard and /ai-tools with the IDENTICAL
       * <DashboardRoute /> element and pages/Dashboard.jsx never reads the
       * pathname. Left as a migration fallback, a mobile writer got the desktop
       * dashboard at one alias and the mobile one at the other.
       */
      expect(resolveMobileExperience({
        isMobile: true,
        authLoading: false,
        user,
        pathname: "/ai-tools",
      })).toMatchObject({
        experience: "mobile",
        routeId: "ai-tools",
        screenId: "dashboard",
      });
    });

    it("does not hand it to an industry audience, whose dashboard is different", () => {
      expect(resolveMobileExperience({
        isMobile: true,
        authLoading: false,
        user: producer,
        pathname: "/ai-tools",
      })).toMatchObject({
        experience: "desktop",
        disposition: "desktop-migration-fallback",
        reason: "audience-not-implemented",
      });
    });
  });

  describe("/offer-holds — an industry screen in the writer phase", () => {
    it.each([producer, { id: "investor-1", role: "investor" }, { id: "director-1", role: "director" }])(
      "mounts the holds screen for $role",
      (user) => {
        expect(resolveMobileExperience({
          isMobile: true,
          authLoading: false,
          user,
          pathname: "/offer-holds",
        })).toMatchObject({
          experience: "mobile",
          routeId: "offer-holds",
          screenId: "holds",
        });
      },
    );

    it.each([writer, creator])("leaves $role on the desktop route", (user) => {
      /*
       * Not a preference. holdScript() 403s any role that is not
       * investor/producer/director (scriptController.js:4770) and getMyHolds()
       * queries { holder: req.user._id } — so this route's only endpoint
       * returns [] for a writer unconditionally, forever. Mounting an
       * empty-forever screen would be worse than the desktop fallback.
       */
        expect(resolveMobileExperience({
          isMobile: true,
          authLoading: false,
          user,
          pathname: "/offer-holds",
        })).toMatchObject({
          experience: "desktop",
          disposition: "desktop-migration-fallback",
          reason: "audience-not-implemented",
        });
    });

    it("does not mount either screen for a signed-out visitor", () => {
      ["/offer-holds", "/ai-tools"].forEach((pathname) => {
        expect(resolveMobileExperience({
          isMobile: true,
          authLoading: false,
          user: null,
          pathname,
        })).toMatchObject({
          experience: "desktop",
          reason: "authentication-required",
        });
      });
    });
  });

  describe("the creation flow", () => {
    it.each(["/create-project", "/create-project/abc123"])("mounts the mobile flow at %s", (pathname) => {
      expect(resolveMobileExperience({
        isMobile: true,
        authLoading: false,
        user: creator,
        pathname,
      })).toMatchObject({
        experience: "mobile",
        screenId: "create-project",
      });
    });

    it.each(["/create-project", "/create-project/abc123"])(
      "mounts the native competition editor at %s",
      (pathname) => {
        expect(resolveMobileExperience({
          isMobile: true,
          authLoading: false,
          user: creator,
          pathname,
          search: "?ctx=competition",
        })).toMatchObject({
          experience: "mobile",
          screenId: "create-project",
          reason: "implemented-screen",
        });
      },
    );

    it("keeps the mobile flow for every other query, including the fresh-start flag", () => {
      // `?fresh=1` is an entry mode the mobile screen fully covers; only the
      // declared exclusion may send a route back to desktop.
      ["?fresh=1", "?ctx=marketplace", "", "?ctx=competitionish"].forEach((search) => {
        expect(resolveMobileExperience({
          isMobile: true,
          authLoading: false,
          user: creator,
          pathname: "/create-project",
          search,
        })).toMatchObject({ experience: "mobile" });
      });
    });

    it("does not mount the flow for an industry audience or a signed-out visitor", () => {
      expect(resolveMobileExperience({
        isMobile: true, authLoading: false, user: producer, pathname: "/create-project",
      })).toMatchObject({ experience: "desktop", reason: "audience-not-implemented" });

      expect(resolveMobileExperience({
        isMobile: true, authLoading: false, user: null, pathname: "/create-project",
      })).toMatchObject({ experience: "desktop", reason: "authentication-required" });
    });
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
