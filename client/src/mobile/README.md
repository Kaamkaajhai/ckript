# Ckript Mobile

A **separate, native-feeling presentation layer** inside the existing Ckript
web client — not a responsive reflow of the desktop UI and not a second
backend. Mobile screens own their JSX and CSS while sharing authentication,
services, data contracts and business rules with the desktop product.

The canonical roadmap, route ledger, quality gates and continuation checkpoint
live in the repository root at `NATIVE_APP_IMPLEMENTATION.md`.

## How it mounts

`src/App.jsx` wraps the existing route tree in `<RootExperience>`. The resolver
consults `mobile/routes/mobileRouteManifest.js` and mounts `<MobileApp />` only
when the current canonical URL has an implemented mobile screen for the current
viewport, auth state and audience.

```
isMobile(viewport ≤ 768px)
&& !authLoading
&& route disposition = screen
&& audience is implemented for that screen
```

During migration, every unfinished route deliberately continues through the
existing desktop route branch. A phone visit to `/search`, `/messages`, a
profile, or a project therefore keeps that URL and functionality; it never
silently becomes Dashboard. The first registered production screen is the
writer/creator `/dashboard`. Industry, reader, admin, public and other screens
remain on the existing branch until their manifest entries are implemented.

SSR/prerender remains unaffected (`useIsMobile` is false without `window`).

Everything under `src/mobile` is lazy-loaded, so it adds nothing to the desktop
bundle.

## Structure

```
mobile/
  MobileApp.jsx        Root shell: full-viewport frame, boot skeleton,
                       DynamicIsland provider, auth identity + real logout.
  theme/               tokens.css (palette, spacing, type ramp, touch, chrome,
                       motion, z-index), base.css (scoped reset),
                       primitives.css (shared buttons / chips / view-more),
                       cssPrefixRegistry.js + mobileCssContract.test.js
                       (scoping and prefix rules, enforced by test).
  shell/               MobileShell (the one app-shell primitive), the shell-mode
                       contract, and MobileRouteBoundary (route pending +
                       recoverable failure surface).
  analytics/           useMobileScrollDepth — the single mobile-specific
                       tracker; everything else is already global.
  hooks/               useIsMobile (the mount switch), useClock (status bar).
  context/             dynamicIsland (context + hook, component-free module).
  routes/              route dispositions, experience policy, canonical
                       mobile route renderer and coverage/policy tests.
  components/           Reusable chrome, each with a co-located .css:
                         StatusBar, TopBar, SectionTabs, BottomNav,
                         DynamicIsland, BottomSheet, Skeleton, EmptyState, Icon.
  screens/
    Dashboard.jsx      The one built screen. Owns tab state, overlay state and
                       the notifications model.
    sections/          Overview · Performance · Reviews · Projects.
    overlays/          AiDetailSheet · AllProjectsSheet ·
                       NotificationsPanel · AccountMenu.
  data/                dashboardData.js — a faithful port of the wireframe's
                       mock data + score→verdict/grade/bar derivations. Pure
                       data, ready to be swapped for a real API of the same
                       shape.
  assets/              hero-last-scene.jpg (optimised from the source PNG).
  baselines/           reviewed Phase 0 dashboard screenshots at the required
                       phone widths.
```

### Styling conventions

- Everything renders under a single `.ckm` root so the scoped reset + tokens
  never leak into (or inherit from) the desktop global stylesheet.
- **Every selector is written `.ckm .ckm-thing { … }`** — scoped by ancestry,
  not just prefixed. A bare `.ckm-thing` (specificity 0,1,0) loses to the
  desktop global sheet, which is how mobile buttons once rendered the desktop's
  Inter and the avatar's initials went invisible.
- Style named element classes, never bare descendant elements. `.ckm
  .ckm-topbar__search span` matched the icon `<span>` too and broke the icon
  font; the label now owns `.ckm-topbar__search-label`.
- Every component/screen has **its own `.css`** file and its own registered
  prefix. Add new prefixes to `theme/cssPrefixRegistry.js`; the contract test
  fails on an unregistered prefix or an unscoped selector.
- Genuinely shared controls live in `theme/primitives.css`.

### Shell and analytics

- A screen renders **one** `<MobileShell>` and never its own app frame. The
  shell mode (declared in the route manifest) decides which chrome exists; the
  shell owns the single scroll surface.
- The global `AnalyticsBootstrap` already emits sessions, `page_enter`,
  `page_exit` and clicks for mobile URLs — never re-fire them from a screen.
  The shell adds `scroll_depth`, which the global tracker cannot see because the
  mobile app locks the document and scrolls its own surface.

## Migration fallback

Direct visits to canonical URLs that have no native-style screen yet use the
existing desktop page during migration. Implemented screens are the writer
Dashboard (`/dashboard`, and `/ai-tools`, which desktop mounts as the identical
element) and the industry holds screen (`/offer-holds`).

> **The `desktopOnly()` pattern is gone (2026-08-07, plan §11 Phase 2 and §2.8).**
> Dashboard actions used to call `island.desktopOnly(feature)` and show a
> Dynamic Island hint — an avatar menu whose four entries were four routes that
> render fine on a phone answered all four with "use a computer". Every call
> site is now a real destination or a real in-place behaviour, and
> `components/DynamicIsland.*` was deleted with its last caller. `ckm-toast` is
> the transient-message surface. Do not reintroduce either.

No new screen may rely on an unregistered fallback. The coverage test requires
every `App.jsx` route to declare `screen`, `redirect`, `dev-only`, or an explicit
documented migration disposition.

## Development preview

`/__mobile-preview` mounts the real mobile Dashboard with deterministic fixture
data and no authenticated API calls. This keeps visual regression captures
stable and prevents the fake preview identity from triggering session-expiry
redirects. It exists only in development.

## What is wired for real

- **Auth identity** — avatar initials + name derived from the auth user.
- **Logout** — the account menu's confirm dialog calls the real `logout()`.
- **Notifications** — the bell badge reflects unread count; "Mark all read"
  updates it.
- **Live clock** in the status bar.
- **Empty states** render when a section's data is actually empty (not a
  static mockup) — a real, reachable branch.

## Parity notes (desktop dashboard vs. mobile)

The mobile design intentionally reshapes the desktop dashboard. Known
differences flagged for product review rather than silently added:

- Mobile "At a Glance" recovers the desktop right-rail stats but is marked
  **Placeholder** in the source.
- Mobile has no equivalent yet for desktop-only surfaces (full project pages,
  messaging, create/upload flows) — these route to the Dynamic Island.
