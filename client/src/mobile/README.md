# Ckript Mobile

A **separate, native-feeling mobile app** for signed-in creators — not a
responsive reflow of the desktop UI. It is built from a single source of
truth (the hi-fi wireframe `Mobile Dashboard HiFi 1B`) and shares nothing with
the desktop dashboard code. The only cross-over is brand assets (the logo) and
the three webfonts already loaded globally in `index.html` (Spectral, IBM Plex
Sans, Material Symbols Outlined).

## How it mounts

`src/App.jsx` wraps the desktop `<Routes>` in `<RootExperience>`. That gate
renders `<MobileApp />` **only** when:

```
!authLoading && isMobile(viewport ≤ 768px) && user && role ∈ {writer, creator}
```

So: logged-out visitors, non-creators, and tablets/desktops always get the
desktop app. There is deliberately **no mobile landing page** — the gate only
trips once a creator has signed in. SSR/prerender is unaffected (no `window`,
no `user`).

Everything under `src/mobile` is lazy-loaded, so it adds nothing to the desktop
bundle.

## Structure

```
mobile/
  MobileApp.jsx        Root shell: full-viewport frame, boot skeleton,
                       DynamicIsland provider, auth identity + real logout.
  theme/               tokens.css (palette/type), base.css (scoped reset),
                       primitives.css (shared buttons / chips / view-more).
  hooks/               useIsMobile (the mount switch), useClock (status bar).
  context/             dynamicIsland (context + hook, component-free module).
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
```

### Styling conventions

- Everything renders under a single `.ckm` root so the scoped reset + tokens
  never leak into (or inherit from) the desktop global stylesheet.
- Every component/screen has **its own `.css`** file. Class names are prefixed
  per component (`.ckm-topbar`, `.ckm-rev__card`, …) to avoid collisions.
- Genuinely shared controls live in `theme/primitives.css`.

## The "desktop-only" pattern

Only the Dashboard is implemented. Every not-yet-built destination — search,
create, upload, opening a project, the Create/Messages/Profile bottom-nav tabs,
account-menu links — calls `island.desktopOnly(feature)` and the user sees a
polished **Dynamic Island** hint ("… is on desktop") instead of a dead end.
The hook (`useDynamicIsland`) is available anywhere inside the shell.

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
