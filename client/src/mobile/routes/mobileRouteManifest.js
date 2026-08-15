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
  /*
   * The editor-only harness at /__mobile-editor was retired on 2026-08-09 when
   * /create-project was promoted: it existed because the chrome had no
   * production URL, and it now has one.
   *
   * This replaces it rather than removing the idea, because the reason a harness
   * is needed did not go away with the URL. The real route authenticates,
   * fetches drafts and autosaves, so it renders a different screen on every run
   * and cannot be measured; the checks that matter most for these two surfaces —
   * touch-target sizes, contrast on the dark chrome, whether the docked bar
   * overlaps the caret line, whether a 29-chip genre row overflows at 320px —
   * are exactly the ones a jsdom suite cannot answer. This mounts BOTH modes
   * over a deterministic fixture context so a five-width sweep can.
   */
  {
    id: "mobile-create-harness",
    pattern: "/__mobile-create",
    disposition: MOBILE_ROUTE_DISPOSITION.DEV_ONLY,
    reason: "Development-only harness for the create-project chrome, both modes (plan §11, Phase 3). "
      + "The live route is account- and network-dependent and cannot be measured deterministically.",
    screenId: "create-project-harness",
    shell: MOBILE_SHELL_MODE.IMMERSIVE,
  },
  {
    id: "mobile-upload-harness",
    pattern: "/__mobile-upload",
    disposition: MOBILE_ROUTE_DISPOSITION.DEV_ONLY,
    reason: "Development-only harness for the upload chrome and its ten panels (plan §11, Phase 3 bullet 3). "
      + "The live route authenticates, fetches the plan limit, extracts a PDF and uploads media, so it "
      + "cannot be measured twice and get the same answer.",
    screenId: "upload-harness",
    shell: MOBILE_SHELL_MODE.FLOW,
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
  /*
   * The chooser that opens the creation flow. A `flow` shell, not `standard`:
   * this is step zero of creating a project, and leaving the tab bar up invites
   * a writer out of a flow they have not begun. Its two destinations
   * are both real mobile screens as of 2026-08-09 — `/create-project` (the
   * editor and publish wizard) and `/upload` (the ten-panel upload flow) — so
   * neither door opens onto the desktop page any more. The entry point shipped
   * first on purpose: it is what decides whether `startFresh` reaches the wizard
   * at all (§5.2).
   */
  {
    id: "new-project",
    pattern: "/new-project",
    disposition: MOBILE_ROUTE_DISPOSITION.SCREEN,
    reason: "Native-style chooser for the two creation paths (plan §11 Phase 3 bullet 2).",
    audiences: [AUDIENCE.WRITER],
    protection: "authenticated",
    screenId: "new-project",
    shell: MOBILE_SHELL_MODE.FLOW,
    fallbackDisposition: MOBILE_ROUTE_DISPOSITION.DESKTOP_MIGRATION_FALLBACK,
  },

  /*
   * The creation flow itself. ONE route, TWO surfaces: `step === 1` is the
   * screenplay editor (`ckm-editor`, immersive) and steps 2–5 are the publish
   * wizard (`ckm-create-project`, flow). `CreateProjectChrome` chooses; the
   * manifest records the mode the route *lands* on, which is the editor.
   *
   * Both entries share one screen component, because `/create-project/:draftId`
   * is the same wizard with a draft already loaded — the orchestrator reads the
   * param itself (`useParams`), so there is nothing for the route to hand over.
   *
   * COMPETITION MODE IS EXCLUDED, DELIBERATELY. `?ctx=competition` replaces the
   * whole publish wizard with a deadline bar and a one-way Submit
   * (`components/competition/CompetitionBar`, `CompetitionPitch`), and neither
   * is ported. Without this exclusion a competition writer on a phone would get
   * the mobile editor with no way at all to submit their entry — a regression,
   * not a gap. Declared here rather than checked inside the screen so the
   * limitation is greppable from the manifest, which is the file that is
   * supposed to answer "what does mobile cover?".
   */
  {
    id: "create-project",
    pattern: "/create-project",
    disposition: MOBILE_ROUTE_DISPOSITION.SCREEN,
    reason: "Native screenplay editor (mode A) and publish wizard (mode B) — plan §11 Phase 3 bullet 2.",
    audiences: [AUDIENCE.WRITER],
    protection: "authenticated",
    screenId: "create-project",
    shell: MOBILE_SHELL_MODE.IMMERSIVE,
    excludeQuery: { ctx: "competition" },
    excludeReason: "competition-mode-not-ported",
    fallbackDisposition: MOBILE_ROUTE_DISPOSITION.DESKTOP_MIGRATION_FALLBACK,
  },
  {
    id: "create-project-draft",
    pattern: "/create-project/:draftId",
    disposition: MOBILE_ROUTE_DISPOSITION.SCREEN,
    reason: "The same flow with a draft loaded; the orchestrator reads :draftId itself.",
    audiences: [AUDIENCE.WRITER],
    protection: "authenticated",
    screenId: "create-project",
    shell: MOBILE_SHELL_MODE.IMMERSIVE,
    excludeQuery: { ctx: "competition" },
    excludeReason: "competition-mode-not-ported",
    fallbackDisposition: MOBILE_ROUTE_DISPOSITION.DESKTOP_MIGRATION_FALLBACK,
  },
  /*
   * The upload flow. One route, four surfaces (`UploadChrome` chooses): access
   * refused, an `?edit=` load still resolving, the submitted screen, and the
   * ten-panel flow itself — which the manifest records, because it is what the
   * route lands on.
   *
   * TWO QUERY FORMS, BOTH COVERED, and both were previously undocumented in the
   * plan's §9 route ledger:
   *   • `?draft=<id>` converts a project written in the screenplay editor into
   *     an upload — the orchestrator loads it and carries `scriptId`, so the
   *     submit updates that project rather than creating a second one;
   *   • `?edit=<id>` updates a published script. If the loaded script reports
   *     `isCollaborator && canEditMetadata === false` it becomes CONTENT-ONLY
   *     mode: one field, no steps, and a submit that posts to
   *     `/collab/:id/revisions` instead of `/scripts/upload`.
   *
   * Neither needs a manifest entry of its own. They are the same component on
   * the same path, and the orchestrator reads them itself through
   * `useSearchParams` — there is nothing for the route to hand over. They are
   * named here so "what does mobile cover?" stays answerable from this file.
   *
   * NO `excludeQuery`. Unlike `/create-project`, every query form of this route
   * is ported, so there is nothing to fall through to desktop.
   */
  {
    id: "upload",
    pattern: "/upload",
    disposition: MOBILE_ROUTE_DISPOSITION.SCREEN,
    reason: "Native ten-panel upload flow, its two query forms and its three non-flow states — plan §11 Phase 3 bullet 3.",
    audiences: [AUDIENCE.WRITER],
    protection: "authenticated",
    screenId: "upload",
    shell: MOBILE_SHELL_MODE.FLOW,
    fallbackDisposition: MOBILE_ROUTE_DISPOSITION.DESKTOP_MIGRATION_FALLBACK,
  },
  migration("search", "/search"),
  migration("project-payment", "/script/:id/pay"),
  migration("project-detail-id", "/script/:id"),
  migration("project-detail-canonical", "/script/:projectHeading/:writerUsername"),
  migration("messages", "/messages"),
  migration("profile", "/profile/:id?"),
  /*
   * /ai-tools is an ALIAS OF THE DASHBOARD, not a screen of its own — and that
   * is desktop's behaviour, not a mobile shortcut. App.jsx mounts /dashboard,
   * /ai-tools and /offer-holds with the *identical* <DashboardRoute /> element,
   * and pages/Dashboard.jsx never reads the pathname. The route has rendered a
   * plain dashboard since 93055d0 introduced it (2026-02-25) and nothing in the
   * product links to it.
   *
   * Left as a migration fallback, a mobile writer got the DESKTOP dashboard here
   * while getting the mobile one at /dashboard — the same page, two experiences,
   * decided by which of two aliases they happened to open. Pointing it at the
   * same screenId fixes that and matches desktop exactly.
   *
   * This is NOT a claim that the AI-tools feature is built. There are seven live
   * AI endpoints (server/routes/aiRoutes.js) but each is consumed from the screen
   * that owns the script; a hub over them needs a script picker, which is new
   * product design. Recorded in plan §19.3 (2026-08-08) as an unbuilt feature.
   */
  {
    id: "ai-tools",
    pattern: "/ai-tools",
    disposition: MOBILE_ROUTE_DISPOSITION.SCREEN,
    reason: "Desktop renders the dashboard at this URL; mobile renders the mobile dashboard. Alias, not a ported feature.",
    audiences: [AUDIENCE.WRITER],
    protection: "authenticated",
    screenId: "dashboard",
    shell: MOBILE_SHELL_MODE.STANDARD,
    fallbackDisposition: MOBILE_ROUTE_DISPOSITION.DESKTOP_MIGRATION_FALLBACK,
  },

  /*
   * /offer-holds is an INDUSTRY screen, despite living in the plan's writer
   * phase. The audience is decided by the server, not by preference:
   * holdScript() 403s any role that is not investor/producer/director
   * (scriptController.js:4770) and getMyHolds() queries { holder: req.user._id }
   * (scriptController.js:4856). A writer can never be a holder, so this route's
   * only endpoint returns [] for a writer unconditionally, forever.
   *
   * Writers keep the existing desktop route via fallbackDisposition — the same
   * mechanism that keeps /dashboard writer-only.
   */
  {
    id: "offer-holds",
    pattern: "/offer-holds",
    disposition: MOBILE_ROUTE_DISPOSITION.SCREEN,
    reason: "Industry holds screen over GET /scripts/holds — a shipped backend that had no client at all (plan §11 Phase 2 bullet 5).",
    audiences: [AUDIENCE.INDUSTRY],
    protection: "authenticated",
    screenId: "holds",
    shell: MOBILE_SHELL_MODE.STANDARD,
    fallbackDisposition: MOBILE_ROUTE_DISPOSITION.DESKTOP_MIGRATION_FALLBACK,
  },

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

