import { AUDIENCE } from "../../layouts/app-shell/shellPolicy";
import { MOBILE_SHELL_MODE } from "../shell/mobileShellModes";

export const MOBILE_ROUTE_DISPOSITION = Object.freeze({
  SCREEN: "screen",
  SHARED_PUBLIC_SCREEN: "shared-public-screen",
  REDIRECT: "redirect",
  DESKTOP_MIGRATION_FALLBACK: "desktop-migration-fallback",
  DEV_ONLY: "dev-only",
  NOT_USER_FACING: "not-user-facing",
});

const migrationReason = "Native-style mobile screen is scheduled; preserve the existing route during migration.";

const migration = (id, pattern, reason = migrationReason) => ({
  id,
  pattern,
  disposition: MOBILE_ROUTE_DISPOSITION.DESKTOP_MIGRATION_FALLBACK,
  reason,
});

const redirect = (id, pattern) => ({
  id,
  pattern,
  disposition: MOBILE_ROUTE_DISPOSITION.REDIRECT,
  reason: "The existing canonical redirect is shared by desktop and mobile.",
});

/*
 * Route order is deliberate. Specific routes precede the two catch-all
 * patterns at the end, so matching cannot mistake a product route for a
 * username/referral or canonical project URL.
 *
 * This is a migration manifest, not a second product router. Every App.jsx
 * route has a disposition. Only entries marked SCREEN may replace the desktop
 * branch; every migration fallback continues through the existing route tree.
 *
 * Any entry that mounts a mobile screen must also declare its shell mode
 * (§8.1). The shell mode — not the screen's JSX — decides which chrome the
 * route gets; mobileRouteCoverage.test.js enforces that every such entry has a
 * valid one.
 */
export const MOBILE_ROUTE_DISPOSITIONS = Object.freeze([
  {
    id: "mobile-preview",
    pattern: "/__mobile-preview",
    disposition: MOBILE_ROUTE_DISPOSITION.DEV_ONLY,
    reason: "Development-only stable dashboard fixture.",
    screenId: "dashboard-preview",
    shell: MOBILE_SHELL_MODE.STANDARD,
  },
  {
    id: "mobile-primitives",
    pattern: "/__mobile-primitives",
    disposition: MOBILE_ROUTE_DISPOSITION.DEV_ONLY,
    reason: "Development-only harness for the shared primitive states (plan §11, Phase 1).",
    screenId: "primitive-gallery",
    shell: MOBILE_SHELL_MODE.DETAIL,
  },
  {
    id: "writer-dashboard",
    pattern: "/dashboard",
    disposition: MOBILE_ROUTE_DISPOSITION.SCREEN,
    reason: "The writer dashboard already has a separate mobile implementation.",
    audiences: [AUDIENCE.WRITER],
    protection: "authenticated",
    screenId: "dashboard",
    shell: MOBILE_SHELL_MODE.STANDARD,
    fallbackDisposition: MOBILE_ROUTE_DISPOSITION.DESKTOP_MIGRATION_FALLBACK,
  },

  migration("landing", "/"),
  migration("about", "/about"),
  migration("contact", "/contact"),
  migration("features-index", "/features"),
  migration("features-detail", "/features/:slug"),
  migration("audience-index", "/for"),
  migration("audience-detail", "/for/:slug"),
  migration("industries-index", "/industries"),
  migration("industries-detail", "/industries/:slug"),
  migration("resources-blog-detail", "/resources/blog/:slug"),
  migration("resources-blog", "/resources/blog"),
  migration("resources-index", "/resources"),
  migration("resources-detail", "/resources/:slug"),
  migration("tools-index", "/tools"),
  migration("tools-detail", "/tools/:slug"),
  migration("pricing", "/pricing"),
  migration("faq", "/faq"),
  migration("genre", "/genre/:slug"),
  migration("sell-script-guide", "/how-to-sell-a-script"),
  migration("find-producers-guide", "/how-to-find-producers"),
  migration("pitch-screenplay-guide", "/how-to-pitch-screenplay"),
  migration("find-investors-guide", "/how-to-find-film-investors"),
  migration("film-investment-india", "/film-investment-india"),
  migration("bollywood-submission", "/bollywood-script-submission"),
  migration("web-series-guide", "/web-series-screenplay-guide"),

  redirect("privacy-alias", "/privacy"),
  redirect("registration-privacy-alias", "/registration-privacy-policy"),
  migration("privacy-policy", "/privacy-policy"),
  redirect("terms-alias", "/terms"),
  redirect("terms-short-alias", "/t-and-c"),
  migration("terms-of-service", "/terms-of-service"),
  migration("role-terms", "/terms-conditions"),
  redirect("writer-terms-alias", "/writer-terms"),
  redirect("investor-terms-alias", "/investor-terms"),
  migration("script-upload-terms", "/script-upload-terms"),

  redirect("login-alias", "/login"),
  redirect("join-alias", "/join"),
  redirect("signup-alias", "/signup"),
  migration("forgot-password", "/forgot-password"),
  migration("accept-invite", "/invite/:token"),
  migration("shared-profile", "/share/profile/:id"),
  migration("shared-project", "/share/project/:id"),

  migration("challenge-hub", "/challenge"),
  migration("challenge-detail", "/challenge/c/:slug"),
  migration("challenge-register", "/challenge/register"),
  migration("challenge-dashboard", "/challenge/dashboard"),
  migration("challenges-marketing", "/challenges"),
  redirect("my-competitions-alias", "/my-competitions"),
  migration("hall-of-fame", "/hall-of-fame"),
  migration("hall-of-fame-detail", "/hall-of-fame/:slug"),

  migration("writer-onboarding", "/writer-onboarding"),
  migration("producer-onboarding", "/producer-director-onboarding"),
  redirect("investor-onboarding-alias", "/investor-onboarding"),
  migration("industry-onboarding", "/industry-onboarding"),

  migration("top-script", "/top-script"),
  redirect("trending-alias", "/trending"),
  migration("featured", "/featured"),
  migration("follow-requests", "/follow-requests"),
  migration("new-project", "/new-project"),
  migration("create-project", "/create-project"),
  migration("create-project-draft", "/create-project/:draftId"),
  migration("upload", "/upload"),
  migration("search", "/search"),
  migration("project-payment", "/script/:id/pay"),
  migration("project-detail-id", "/script/:id"),
  migration("project-detail-canonical", "/script/:projectHeading/:writerUsername"),
  migration("messages", "/messages"),
  migration("profile", "/profile/:id?"),
  migration("ai-tools", "/ai-tools"),
  migration("offer-holds", "/offer-holds"),

  migration("industry-home", "/home"),
  migration("mandates", "/mandates"),
  migration("writers", "/writers"),

  migration("reader-home", "/reader"),
  migration("reader-search", "/reader/search"),
  migration("reader-script", "/reader/script/:id"),
  migration("reader-profile", "/reader/profile/:id?"),
  redirect("reader-featured-alias", "/reader/featured"),

  migration("admin", "/admin"),
  migration("admin-competition", "/admin/competitions/:id"),
  migration("admin-script", "/admin/scripts/:id"),
  migration("admin-agreements", "/admin/agreements"),
  migration("finance", "/finance"),

  // App.jsx intentionally declares these catch-alls last as well.
  migration("canonical-project-catchall", "/:projectHeading/:writerUsername"),
  migration("profile-or-referral-catchall", "/:id"),
]);

