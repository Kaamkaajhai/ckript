import { describe, expect, it } from "vitest";
import {
  MOBILE_ROUTE_DISPOSITIONS,
  MOBILE_ROUTE_DISPOSITION,
} from "./mobileRouteManifest";
import { isMobileShellMode } from "../shell/mobileShellModes";

/*
 * Explicit mirror of every unique path literal in App.jsx. This duplication is
 * deliberate: adding a desktop route must require a conscious mobile decision
 * instead of inheriting an accidental fallback.
 */
const APP_ROUTE_PATTERNS = [
  "/",
  "/__mobile-challenge-detail",
  "/__mobile-challenge-register",
  "/__mobile-challenge-dashboard",
  "/__mobile-challenges",
  "/__mobile-checkout",
  "/__mobile-create",
  "/__mobile-featured",
  "/__mobile-preview",
  "/__mobile-primitives",
  "/__mobile-project",
  "/__mobile-search",
  "/__mobile-top-scripts",
  "/__mobile-upload",
  "/:id",
  "/:projectHeading/:writerUsername",
  "/about",
  "/admin",
  "/admin/agreements",
  "/admin/competitions/:id",
  "/admin/scripts/:id",
  "/ai-tools",
  "/bollywood-script-submission",
  "/challenge",
  "/challenge/c/:slug",
  "/challenge/dashboard",
  "/challenge/register",
  "/challenges",
  "/collaborations",
  "/contact",
  "/create-project",
  "/create-project/:draftId",
  "/dashboard",
  "/faq",
  "/featured",
  "/features",
  "/features/:slug",
  "/film-investment-india",
  "/finance",
  "/follow-requests",
  "/for",
  "/for/:slug",
  "/forgot-password",
  "/genre/:slug",
  "/hall-of-fame",
  "/hall-of-fame/:slug",
  "/home",
  "/how-to-find-film-investors",
  "/how-to-find-producers",
  "/how-to-pitch-screenplay",
  "/how-to-sell-a-script",
  "/industries",
  "/industries/:slug",
  "/industry-onboarding",
  "/investor-onboarding",
  "/investor-terms",
  "/invite/:token",
  "/join",
  "/login",
  "/mandates",
  "/messages",
  "/my-competitions",
  "/new-project",
  "/offer-holds",
  "/pricing",
  "/privacy",
  "/privacy-policy",
  "/producer-director-onboarding",
  "/profile/:id?",
  "/reader",
  "/reader/featured",
  "/reader/profile/:id?",
  "/reader/script/:id",
  "/reader/search",
  "/registration-privacy-policy",
  "/resources",
  "/resources/:slug",
  "/resources/blog",
  "/resources/blog/:slug",
  "/script-upload-terms",
  "/script/:id",
  "/script/:id/pay",
  "/script/:projectHeading/:writerUsername",
  "/search",
  "/share/profile/:id",
  "/share/project/:id",
  "/signup",
  "/t-and-c",
  "/terms",
  "/terms-conditions",
  "/terms-of-service",
  "/tools",
  "/tools/:slug",
  "/top-script",
  "/trending",
  "/upload",
  "/web-series-screenplay-guide",
  "/writer-onboarding",
  "/writer-terms",
  "/writers",
].sort();

describe("mobile route coverage", () => {
  it("gives every App.jsx route an explicit mobile disposition", () => {
    const registered = [...new Set(MOBILE_ROUTE_DISPOSITIONS.map(({ pattern }) => pattern))].sort();
    expect(registered).toEqual(APP_ROUTE_PATTERNS);
  });

  it("uses only documented disposition values", () => {
    const allowed = new Set(Object.values(MOBILE_ROUTE_DISPOSITION));
    const invalid = MOBILE_ROUTE_DISPOSITIONS.filter(({ disposition }) => !allowed.has(disposition));
    expect(invalid).toEqual([]);
  });

  it("documents every migration fallback", () => {
    const undocumented = MOBILE_ROUTE_DISPOSITIONS.filter(({ disposition, reason }) => (
      disposition === MOBILE_ROUTE_DISPOSITION.DESKTOP_MIGRATION_FALLBACK
      && !String(reason || "").trim()
    ));
    expect(undocumented).toEqual([]);
  });

  it("does not register duplicate ids", () => {
    const ids = MOBILE_ROUTE_DISPOSITIONS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declares a valid shell mode on every entry that mounts a mobile screen", () => {
    const mountsAScreen = MOBILE_ROUTE_DISPOSITIONS.filter(({ screenId }) => Boolean(screenId));
    expect(mountsAScreen.length).toBeGreaterThan(0);

    const invalid = mountsAScreen.filter(({ shell }) => !isMobileShellMode(shell));
    expect(invalid).toEqual([]);
  });

  it("does not declare a shell mode on a route that renders no mobile screen", () => {
    const strays = MOBILE_ROUTE_DISPOSITIONS.filter(({ screenId, shell }) => !screenId && shell);
    expect(strays).toEqual([]);
  });
});
