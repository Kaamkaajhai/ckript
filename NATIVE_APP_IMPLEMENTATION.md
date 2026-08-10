# Ckript Native-Style Mobile Web Implementation

> **Canonical execution plan and continuation ledger**  
> **Project:** Ckript client (`client/`)  
> **Artifact type:** Mobile web application styled and structured like a high-quality React Native application  
> **Created:** 2026-08-05  
> **Current state:** Planning complete; implementation has not started under this plan  
> **Plan owner:** The AI agent currently implementing the mobile experience

---

## 1. Purpose of this document

This file is the single source of truth for building Ckript's complete mobile frontend. The result remains part of the existing React/Vite web client and uses the existing server, APIs, authentication, URLs, and business rules. It is **not** a React Native binary, a second server, a WebView wrapper, or a separate product.

The mobile experience must nevertheless feel like a carefully designed native application:

- phone-first information architecture rather than compressed desktop layouts;
- separate mobile React page components instead of one JSX tree hidden and rearranged with media queries;
- native-style app bars, tab bars, lists, cards, sheets, dialogs, gestures, pressed states, loading states, and transitions;
- safe-area-aware, keyboard-aware, single-axis layouts with no overlap or accidental horizontal scrolling;
- professional type, spacing, touch targets, accessibility, and performance;
- full functional parity with the appropriate desktop page, including permissions and edge states;
- continued use of the same canonical URLs so deep links, refresh, browser history, sharing, and analytics remain correct.

This document is intentionally resumable. When the user says **"continue in Native app implementation"**, the next agent must follow the continuation protocol in section 20 and proceed from the first uncompleted item in the live ledger. It must not start the project again, create a competing plan, or declare completion based only on visual similarity.

---

## 2. Non-negotiable product requirements

1. **One product and one backend.** All work stays inside `client/` unless an already-existing server defect blocks a mobile feature. Mobile code calls the same services and APIs as desktop code.
2. **Two presentation components per page.** A route with a desktop page gets a distinct mobile page component. Desktop markup must not become the mobile page through CSS hiding or wholesale responsive reflow.
3. **Shared behavior, separate presentation.** API services, validation, permissions, formatters, data models, and suitable hooks should be shared. Page markup and page-level CSS should not be shared merely to save files.
4. **All user-facing routes are tracked.** Marketing, authentication, onboarding, writer, discovery, project, challenge, messaging, profile, industry, reader, admin, finance, public-share, legal, redirect, and dynamic routes must appear in the route ledger. Nothing may be silently omitted.
5. **Every mobile page owns a stylesheet.** The stylesheet is co-located with its page. Shared primitives may have their own co-located styles or live in `mobile/theme/` only when they are truly application-wide.
6. **Every page has a unique CSS prefix.** All mobile classes also remain below `.ckm`. A page must never borrow another page's prefix.
7. **No overlap at supported sizes.** Fixed chrome, bottom actions, sheets, the virtual keyboard, safe areas, long labels, translated text, zoomed text, loading states, and validation messages must be tested.
8. **No placeholder dead ends in the completed product.** The current `desktopOnly()` Dynamic Island fallback is a migration aid, not an acceptable final state.
9. **Functional parity before decorative polish.** Every action, permission, error, loading state, empty state, and destructive confirmation is accounted for before a page is marked complete.
10. **No redesign by assumption.** Existing brand language and business intent remain recognizable. Large product changes or removal of desktop capabilities require explicit user approval.
11. **The document is updated during implementation.** Research notes, decisions, completed work, verification, blockers, and the exact next action are recorded before an agent ends a work session.

---

## 3. Repository audit: current baseline

### 3.1 Technology and routing

The client currently uses React 19, Vite 7, React Router, CSS/Tailwind globals, Vitest, and `happy-dom`. `client/src/App.jsx` owns the primary route tree and lazy-loads desktop pages. The app already has role-aware desktop shells under `client/src/layouts/` and navigation presets for writer, industry, reader, and admin audiences.

### 3.2 Existing mobile foundation

`client/src/mobile/` is already present and is the correct starting point. It includes:

```text
client/src/mobile/
  MobileApp.jsx
  MobileApp.css
  assets/
  components/
    BottomNav.*
    BottomSheet.*
    DynamicIsland.*
    EmptyState.*
    Icon.jsx
    SectionTabs.*
    Skeleton.*
    StatusBar.*
    TopBar.*
  context/
  data/
  hooks/
    useClock.js
    useDashboardData.js
    useIsMobile.js
  screens/
    Dashboard.*
    overlays/
    sections/
  theme/
    base.css
    primitives.css
    tokens.css
```

The existing mobile dashboard establishes valuable conventions:

- `.ckm` scoped styling;
- a full-height mobile root using `100dvh` with a `100vh` fallback;
- safe-area tokens;
- a separate dashboard component and stylesheet;
- co-located CSS for reusable mobile components;
- top navigation, bottom navigation, bottom sheets, empty states, skeletons, and a transient Dynamic Island message;
- a mobile breakpoint hook at 768 CSS pixels;
- lazy loading from `App.jsx`.

### 3.3 Known architectural gap to fix first

`RootExperience` in `client/src/App.jsx` currently replaces the entire desktop route tree with `<MobileApp />` for a signed-in writer/creator on a phone, except for `/challenge` paths. `MobileApp` then renders only the dashboard. Consequently, a writer who visits `/search`, `/messages`, `/profile/...`, `/script/...`, or most other routes on a phone sees the dashboard instead of the URL's intended page.

This is the first foundation issue. Adding screens before establishing route-aware mobile composition would create navigation drift, broken deep links, and back-button problems.

### 3.4 Existing implementation is a baseline, not a completed milestone

The dashboard is visually implemented, but it still contains desktop-only fallbacks for search, create, upload, project details, sharing, collaborations, filters, account menu items, and other actions. Its notifications begin from local data. It must pass the same research, parity, accessibility, real-data, route, and QA gates as every other page before being marked complete.

The older `client/src/mobile/README.md` remains a useful implementation snapshot. This file is the authoritative roadmap and progress ledger whenever the two differ.

---

## 4. Research and design gate: mandatory before every page

An implementing agent must not open a page file and immediately translate desktop JSX into smaller boxes. Complete the following gate for each page or tightly related route family.

### 4.1 Inspect and understand the existing product

Record in the page's work note:

- desktop component(s), stylesheet(s), child components, hooks, services, and route parameters;
- all visible sections and controls;
- API calls and the shape of success, loading, empty, partial, stale, and error states;
- user roles, permissions, ownership rules, quotas, subscription gates, and destructive actions;
- URL query parameters, navigation state, redirects, canonical links, and share behavior;
- modals, menus, drawers, tooltips, drag/drop, hover-only behavior, tables, charts, rich editors, file inputs, and third-party widgets;
- analytics and tracking hooks that must continue to fire;
- desktop behavior that does not translate directly to touch.

### 4.2 Research the native interaction model

Before designing, research how the page would normally be expressed in a real mobile application. Prefer current primary sources:

- React Native core component, accessibility, interaction, list, and performance documentation;
- Apple Human Interface Guidelines and Android/Material platform guidance where relevant;
- W3C/WCAG guidance for web accessibility and reflow;
- MDN for browser behavior such as safe areas, dynamic viewports, touch, focus, and scrolling;
- official documentation for any third-party widget used on that page.

Then inspect two or three current, reputable mobile products with a comparable workflow when useful. Capture interaction patterns and information hierarchy, not their brand styling. Do not copy copyrighted screens or invent claims about a product that was not inspected.

Minimum research questions:

1. In a real native app, is this a screen, nested screen, tab, detail stack, sheet, dialog, full-screen editor, or multi-step flow?
2. What belongs in the top app bar, scroll body, floating action, sticky action area, bottom tabs, and overflow menu?
3. Which desktop sections become progressive disclosure, accordion rows, detail screens, horizontally scrolling rails, or bottom sheets?
4. How does the workflow handle back navigation, cancellation, unsaved changes, keyboard display, and interrupted uploads?
5. Which lists require pagination or virtualization?
6. Which actions need pressed, pending, success, failure, offline/retry, disabled, and destructive states?
7. What should a screen reader announce, and in what focus order?

Add the research links and a short decision summary to section 19 before coding the page.

### 4.3 Produce a written wireframe before JSX

For each page, write a concise text wireframe that includes:

```text
Route and page name
Audience and permissions
Top app bar
Primary scroll hierarchy
Primary action and secondary actions
Bottom navigation visibility
Overlays / nested detail screens
Loading / empty / error / success states
Keyboard and safe-area behavior
Back-navigation behavior
Long-text and localization behavior
Desktop-to-mobile transformation decisions
```

For complex pages, also create a low-fidelity visual wireframe and obtain user approval before high-fidelity styling. A coding agent must not confuse a beautiful static mockup with a functioning page.

### 4.4 Pass the design checkpoint

A page may move to implementation only when:

- its functional inventory is complete;
- mobile hierarchy is decided;
- route and back behavior are decided;
- data ownership and reusable logic are decided;
- every state has a rendering plan;
- prefix and file paths are registered;
- high-risk items and the verification approach are recorded.

---

## 5. Architectural target

### 5.1 Experience selection

Keep one top-level `BrowserRouter`. Do **not** nest another browser router inside `MobileApp`.

Refactor the current binary dashboard gate into an explicit experience policy:

```text
BrowserRouter
  providers and cross-app services
  ExperienceResolver
    desktop route branch -> existing desktop pages and shells
    mobile route branch  -> MobileApp -> MobileRoutes -> route-specific screen
```

The resolver considers:

- viewport category;
- current pathname and query string;
- authentication loading state;
- user audience/role;
- whether the route is public, protected, redirect-only, or external-accountant/admin restricted;
- migration availability while the project is incomplete.

During migration, a route without a mobile implementation must deliberately render its existing responsive desktop page or a clearly registered temporary fallback. It must never silently render the dashboard. At final completion, all applicable routes resolve to a mobile component or an intentional redirect.

### 5.2 URL contract

Desktop and mobile use the same canonical URL. Do not create `/m`, `/mobile`, duplicated SEO URLs, or a second navigation history.

Mobile routing must preserve:

- path parameters;
- query strings and tab selection;
- hash fragments where used;
- `location.state` such as `startFresh`;
- browser back/forward behavior;
- direct refresh and copied deep links;
- authentication redirects and post-login return URLs;
- notification targets;
- canonical project and profile URLs.

Use route matching through React Router rather than manual `pathname.includes()` chains. Lazy-load every substantial screen.

### 5.3 Route manifest and drift protection

Create a typed-by-convention mobile route manifest even if the project remains JavaScript:

```js
{
  id: "writer-search",
  patterns: ["/search"],
  audience: ["writer", "industry", "admin"],
  protection: "authenticated",
  chrome: "standard",
  bottomTab: "discover",
  loader: () => import("../screens/discovery/SearchMobile.jsx"),
}
```

Recommended files:

```text
client/src/mobile/routes/
  MobileRoutes.jsx
  mobileRouteManifest.js
  mobileRoutePolicy.js
  mobileRoutePolicy.test.js
  mobileRouteCoverage.test.js
```

`mobileRouteCoverage.test.js` must maintain an explicit list of the route patterns declared in `App.jsx` and fail when a new user-facing desktop route has no mobile disposition. A disposition is one of `screen`, `shared-public-screen`, `redirect`, `desktop-migration-fallback`, `dev-only`, or `not-user-facing`, with a reason. Remove all `desktop-migration-fallback` entries before project completion.

### 5.4 Shared logic boundary

Preferred sharing:

- `services/` for transport and API contracts;
- route-independent hooks for data loading and mutation;
- validation and permission utilities;
- formatters, constants, data adapters, and analytics calls;
- small headless state machines for complicated editors and wizards.

Do not share by default:

- page layout JSX;
- desktop tables or sidebars;
- desktop modal markup;
- CSS class names;
- hover-driven interactions;
- fixed desktop dimensions.

When desktop behavior is trapped inside a large page component, extract only the behavior needed by both variants, add tests, and leave the desktop rendering stable. Avoid a broad rewrite of a working desktop page as a side effect of mobile work.

### 5.5 Native-to-web component mapping

Use React Native as the interaction and composition model while retaining semantic web output:

| Native concept | Mobile web implementation |
|---|---|
| `View` | Semantic `main`, `section`, `article`, `nav`, or `div` with flex/grid |
| `Text` | Correct heading, paragraph, label, or inline text element |
| `Pressable` | `button`, `Link`, or `NavLink` with visible pressed, focus, pending, and disabled states |
| `TextInput` | Associated `label` plus native `input`/`textarea` using correct `type`, `inputMode`, and autocomplete |
| `ScrollView` | One deliberate primary scroll container; contained sheet/list scrolling only when necessary |
| `FlatList` / `SectionList` | Paginated or virtualized semantic list after measurement; stable keys and lightweight rows |
| `SafeAreaView` | Shell padding using `env(safe-area-inset-*)` with fallbacks |
| `Modal` | Accessible dialog or full-screen route; bottom sheet only for short, contextual tasks |
| Native stack | Canonical nested routes and browser history |
| Tab bar | `nav` with labeled destinations and `aria-current` |
| Activity indicator | Accessible pending state that does not cause layout shift |
| Toast / banner | Non-blocking `status` region; `alert` only for urgent errors |

Native-feeling does not mean hiding browser semantics, disabling zoom, simulating an operating-system status bar unnecessarily, or making the web app inaccessible to keyboard users.

### 5.6 Analytics contract

Decided 2026-08-05. Read this before adding any tracking call to a mobile screen.

`AnalyticsBootstrap` is mounted **above** the experience resolver in `App.jsx`, and mobile keeps the desktop URL. Everything URL-driven or document-delegated therefore already works on mobile with no mobile-specific code:

| Event | Source | Mobile status |
|---|---|---|
| `session_start`, `user_returned`, `session_end` | `usePageTracking` | already correct |
| `page_enter`, `page_exit` (with time on page) | `usePageTracking` | already correct — mobile screens change the URL |
| `click` | `useClickTracking` (delegated on `document`, capture phase) | already correct |
| `scroll_depth` | `usePageTracking` listening on `window` | **broken on mobile**; see below |

Rules:

1. **Never re-fire a global event from mobile code.** A mobile screen that emits its own `page_enter` would double-count sessions and corrupt funnels. Mobile code adds only what the global implementation cannot observe.
2. **Scroll depth is the one exception, and the shell owns it.** The mobile app locks the document (`.ckm-html-lock`) and scrolls inside the shell's own surface, so `window` scroll never fires and `document.documentElement` never grows. `mobile/analytics/useMobileScrollDepth.js` measures the element that actually scrolls, emits the identical `scroll_depth` payload (same 5% step, same 100% rule, reset per URL) tagged `metadata: { surface: "mobile-shell", screenId }`, and is called by `MobileShell` — so every future screen inherits it by adopting the shell.
3. **Consent is observed, never sampled.** Use `tracking/useAnalyticsConsent.js`; consent can change mid-session from the banner or another tab.
4. **Give the shell a `screenId`.** It becomes `data-track-section` on the scroll surface, which is the first thing the click tracker reads, so a tap outside any `<section>` still reports a real screen name instead of a CSS class.
5. Shared payload helpers (`tracking/userContext.js`) are used by desktop and mobile alike; do not fork the identity block.

---

## 6. Professional target folder structure

Use domain folders so the mobile app can grow without becoming one flat directory:

```text
client/src/mobile/
  MobileApp.jsx
  MobileApp.css
  README.md
  assets/
  components/
    app-bars/
    buttons/
    cards/
    feedback/
    forms/
    lists/
    navigation/
    overlays/
  context/
  hooks/
  routes/
  shell/                # app-shell contract: MobileShell, shell modes, route boundary
  screens/
    admin/
    auth/
    challenges/
    discovery/
    finance/
    industry/
    legal/
    marketing/
    messages/
    onboarding/
    profiles/
    projects/
    reader/
    writer/
  theme/
    tokens.css
    base.css
    primitives.css
    utilities.css       # only if repeated utilities are proven necessary
  utils/
```

Each page follows this shape:

```text
screens/projects/project-detail/
  ProjectDetailMobile.jsx
  ProjectDetailMobile.css
  ProjectDetailMobile.test.jsx
  projectDetailMobile.model.js       # only if mobile-specific view modeling is needed
  components/                         # only components exclusive to this page family
```

Rules:

- use `.jsx` because the current client is JSX; do not introduce isolated TSX without a project-wide TypeScript decision;
- one default-exported screen component per route-level file;
- keep route screens orchestration-focused; extract repeated or independently testable sections;
- co-locate component CSS with the component;
- do not create `common/`, `helpers/`, or `misc/` dumping grounds;
- assets used only by mobile live under `mobile/assets/`; shared brand assets may remain in their established location;
- barrel files are optional and must not create circular dependencies or destroy code-splitting.

---

## 7. CSS isolation, prefixes, and design tokens

### 7.1 Scoping contract

Every mobile selector must be scoped by the `.ckm` root either directly or by ancestry. No mobile style may change an unscoped `body`, `button`, `input`, heading, or generic utility class. Temporary document-level locks must use an explicit `ckm-*` class and restore previous state on unmount.

Format:

```css
.ckm .ckm-search { ... }
.ckm .ckm-search__filter-trigger { ... }
.ckm .ckm-search__filter-trigger.is-active { ... }
```

Use BEM-like element and state naming. Do not style through brittle DOM depth, generated classes, `:nth-child`, or unrelated desktop selectors.

**Enforced since 2026-08-05.** Both rules are machine-checked by `client/src/mobile/theme/mobileCssContract.test.js`, which scans every mobile stylesheet and fails when a selector is unscoped or uses a prefix that is not declared in `client/src/mobile/theme/cssPrefixRegistry.js`. The registry file is the code-side mirror of §7.2; update both together.

Scoping is not cosmetic. Before normalization, 315 mobile selectors were single-class (specificity 0,1,0) and the desktop global sheet was silently winning four of them — mobile buttons rendered the desktop's Inter instead of `--ckm-body`, the avatar's initials were painted near-black on a near-black circle, an inactive section tab lost its muted colour, and the hero copy lost its top margin. Scoping is what makes an authored mobile style actually apply.

One caveat learned from that rewrite: adding `.ckm ` also lifts a selector above rules it used to lose to *inside* the mobile app. `.ckm-topbar__search span` (0,1,1) had correctly lost to `.ckm .material-symbols-outlined` (0,2,0); as `.ckm .ckm-topbar__search span` (0,2,1) it won and broke the icon font. Style a named element class, never a bare descendant element type.

### 7.2 Unique page prefix registry

Register the prefix before implementing a page — in this table **and** in `client/src/mobile/theme/cssPrefixRegistry.js`, which the contract test reads. Initial allocations:

| Page family | Required prefix |
|---|---|
| Mobile root and shell | `ckm-shell` (implemented: `client/src/mobile/shell/`, covers the app shell, route pending state, and route failure surface) |
| Dashboard | `ckm-dashboard` (migrated from `ckm-dash` on 2026-08-05) |
| Dashboard sections and overlays (one family, one prefix per file) | `ckm-ov`, `ckm-perf`, `ckm-rev`, `ckm-proj`, `ckm-pc`, `ckm-aid`, `ckm-allp`, `ckm-noti`. *(`ckm-acct` was **retired and deleted** on 2026-08-07, Phase 2: AccountMenu is now composed from `ckm-action-sheet` + `ckm-confirm` and has no CSS of its own.)* |
| Shared mobile components | `ckm-tabs` (legacy dashboard segmented strip, still in use; superseded by `ckm-tabbar`/`ckm-segmented` and awaiting the §19.3 tab-set decision), `ckm-empty`, `ckm-skel`, `ckm-statusbar`, `ckm-chip` (two owners by design: `theme/primitives.css` holds the base pill, `components/chips/Chip.css` the interactive forms). **Retired and deleted on 2026-08-07 (Phase 2), each with its component file:** `ckm-topbar` and `ckm-bottomnav` (superseded by `ckm-appbar`/`ckm-navbar`), `ckm-sheet` (`BottomSheet`, no focus trap — superseded by `ckm-bottom-sheet`), `ckm-island` (`DynamicIsland`, whose one production caller was `notify.desktopOnly()` — superseded by `ckm-toast`), `ckm-btn` (a 40px control under the touch floor with no link form — superseded by `ckm-button`), `ckm-viewmore` (superseded by `ckm-load-more`, which names the cost and announces the new count) |
| Phase 1 action primitives | `ckm-button` (`components/buttons/Button.css`), `ckm-icon-button` (`components/buttons/IconButton.css`), `ckm-back` (`components/navigation/BackButton.css`), `ckm-page-header` (`components/app-bars/PageHeader.css`) |
| Phase 1 role-aware chrome | `ckm-appbar` (`components/app-bars/AppBar.css` — the `standard`-shell app bar; supersedes `ckm-topbar`), `ckm-navbar` (`components/navigation/NavBar.css` — the role-aware bottom tab bar; supersedes `ckm-bottomnav`) |
| Phase 1 form family | `ckm-field` (`components/forms/Field.css`), `ckm-control` (`components/forms/Control.css` — one box shared by input/textarea/select), `ckm-checkbox`, `ckm-radio`, `ckm-switch`, `ckm-file-picker` |
| Phase 1 collection and display family | `ckm-list` (`components/lists/List.css`), `ckm-row` (`components/lists/ListRow.css`), `ckm-load-more` (`components/lists/LoadMore.css`), `ckm-card` (`components/cards/Card.css`), `ckm-badge` (`components/badges/Badge.css`), `ckm-chip-row` (`components/chips/Chip.css`), `ckm-segmented` (`components/tabs/SegmentedControl.css`), `ckm-tabbar` (`components/tabs/Tabs.css` — the APG tablist, distinct from the dashboard's legacy `ckm-tabs`) |
| Phase 1 overlay set | `ckm-overlay` (`components/overlays/Overlay.css` — layer, scrim and the bottom/center/full placements every modal surface shares), `ckm-bottom-sheet` (`components/overlays/Sheet.css`), `ckm-dialog` (`components/overlays/Dialog.css`), `ckm-confirm` (`components/overlays/ConfirmDialog.css`), `ckm-action-sheet` (`components/overlays/ActionSheet.css`) |
| Media attachment family (Phase 3) | `ckm-media` (`components/media/Media.css`) — **allocated and registered 2026-08-09**, decision D12. One attachable asset (`MediaSlot`, including its per-file upload progress), the cover cropper's stage and sliders (`CoverCropDialog`) and the buyer preview's page list (`PreviewDialog`), shared by `/create-project` and `/upload`. Lifted out of `screens/create/Wizard.css` rather than copied: both routes ask a writer for the same three files against the same three ceilings, and two copies of that control is how one of them ends up advertising a limit the other does not enforce |
| Phase 1 state set | `ckm-toast` (`components/feedback/Toast.css` — the transient message and its app-level host layer; supersedes `ckm-island`), `ckm-message` (`components/feedback/InlineMessage.css` — the durable inline strip and full-panel failure form), `ckm-offline` (`components/feedback/OfflineBanner.css`), plus `ckm-skel` gaining a **second owner** in `components/feedback/Skeletons.css` for the composable shapes (`__shape`, `__lines`, `__rows`, `__group`) while `components/Skeleton.css` keeps the dashboard's fixed boot drawing — neither file uses the other's element names, the same arrangement `ckm-chip` already has. `ckm-empty` is unchanged and reused |
| Development harness | `ckm-gallery` (`dev/PrimitiveGallery.css`, `/__mobile-primitives`, never mounted in production) |
| Root surface and utilities | `ckm-root`, `ckm-html-lock`, `ckm-scroll`, `ckm-sr-only` |
| Search | `ckm-search` |
| Top scripts | `ckm-top-scripts` |
| Featured projects | `ckm-featured` |
| Project detail/public project | `ckm-project-detail` / `ckm-public-project` |
| New project chooser | `ckm-new-project` (`screens/NewProject.css`, `/new-project` — added 2026-08-09, Phase 3 bullet 2. Its own family rather than part of `ckm-create-project`: a different route, a different shell, no data, and the wizard's prefix must stay answerable for the wizard's chrome alone) |
| Create project | `ckm-create-project` (`screens/create/Wizard.css`, `/create-project` steps 2–5) — **registered in code 2026-08-09** with its first stylesheet. The wizard chrome: host, app bar, progress line, panel layout, sticky footer and the title-page overlay. **The media slots, the cover cropper and the buyer preview moved out to `ckm-media` on 2026-08-09** when `/upload` needed the same three surfaces (D12) |
| Full-screen screenplay editor | `ckm-editor` (`screens/create/Editor.css`) — allocated 2026-08-08 (Phase 3 bullet 1), **registered in code 2026-08-09** with its first stylesheet. A separate family from `ckm-create-project` on purpose: the editor is a different shell mode (`immersive`, by per-slot override) with its own app bar, its own docked element/format bar and its own sheet set, and it will also be mounted from routes the create wizard is not. Sharing one prefix would make "which surface owns this rule" unanswerable. The editor engine itself (`components/screenplay/ScreenplayEditor`) carries no `ckm-*` classes — it is shared with desktop and styles itself through `cm-*` |
| Upload project | `ckm-upload` (`screens/upload/Upload.css`, `/upload` and its `?draft=` / `?edit=` forms) — **allocated and registered 2026-08-09**, Phase 3 bullet 3. Reallocated from the reserved `ckm-upload-project`, which no file ever used: the route is `/upload`, and a prefix that does not match its route is the first thing a later reader has to double-check. A sibling of `ckm-create-project` rather than part of it — the two flows share the shell and the form family but ask different questions in a different order, so one prefix answering for both would leave neither stylesheet readable on its own. Covers the host, app bar, progress line, panel layout, the script picker's three states, the invoice, the agreement box, the sticky footer and the three full-screen states (refused, resolving, submitted) |
| Project payment | `ckm-project-payment` |
| Messages | `ckm-messages` |
| Profile/public profile | `ckm-profile` / `ckm-public-profile` |
| Follow requests | `ckm-follow-requests` |
| Challenge hub/detail/register/dashboard | `ckm-challenge-hub`, `ckm-challenge-detail`, `ckm-challenge-register`, `ckm-challenge-dashboard` |
| Hall of fame/detail | `ckm-hall`, `ckm-hall-detail` |
| Industry discovery/dashboard/mandates/writers | `ckm-industry-home`, `ckm-industry-dashboard`, `ckm-mandates`, `ckm-writers` |
| Reader home/script/profile | `ckm-reader-home`, `ckm-reader-script`, `ckm-reader-profile` |
| Landing/about/contact/pricing | `ckm-landing`, `ckm-about`, `ckm-contact`, `ckm-pricing` |
| SEO content page | `ckm-seo-page` plus route modifier/data attribute, not a new unregistered prefix per slug |
| Legal policy/terms/upload terms | `ckm-policy`, `ckm-terms`, `ckm-upload-terms` |
| Authentication/invite/forgot password | `ckm-auth`, `ckm-invite`, `ckm-forgot-password` |
| Writer/producer/industry onboarding | `ckm-writer-onboarding`, `ckm-producer-onboarding`, `ckm-industry-onboarding` |
| Admin console/editor/script/agreements | `ckm-admin`, `ckm-admin-competition`, `ckm-admin-script`, `ckm-admin-agreements` |
| Offers and holds | `ckm-holds` (`screens/Holds.css`, `/offer-holds` — added 2026-08-08, Phase 2 bullet 5. A family of one: the screen is a single list with no sections and no overlays of its own.) |
| Finance | `ckm-finance` |

If two page files would use the same prefix, record why they are one page family. Otherwise allocate a new prefix and add it here.

### 7.3 Token system

Extend `mobile/theme/tokens.css`; do not scatter magic values. The token set must cover:

- brand and semantic colors;
- text and surface ramps for supported themes;
- spacing;
- type sizes, line heights, weights, and families;
- radii;
- hairlines/borders;
- elevation;
- motion duration and easing;
- touch target minimums;
- top/bottom chrome heights;
- safe areas;
- z-index layers.

Recommended spacing scale (4 px base): `4, 8, 12, 16, 20, 24, 32, 40, 48`.

Recommended starting type ramp, to be verified on real devices:

| Role | Size / line height |
|---|---|
| Micro metadata | `11 / 14` px; never for essential actions or long copy |
| Caption | `12 / 16` px |
| Supporting text | `14 / 20` px |
| Primary body | `16 / 24` px |
| Card/subsection title | `17 / 22` or `18 / 24` px |
| Section title | `20 / 26` or `22 / 28` px |
| Page title | `28 / 34` px, adjusted when space requires |

Inputs should use at least 16 px rendered text to preserve comfortable entry and avoid unwanted mobile-browser zoom behavior. Text truncation must be a product decision: use wrapping by default and explicit line clamping only when the full value is reachable elsewhere.

### 7.4 Touch, focus, and motion

- Ckript standard: interactive hit area at least **44 x 44 CSS px**; WCAG 2.2's 24 x 24 minimum is a floor, not the product target.
- Provide a pressed state immediately; do not rely on hover.
- Retain visible `:focus-visible` styling and logical focus order.
- Never place destructive and primary actions close enough for accidental activation.
- Honor `prefers-reduced-motion`.
- Animate opacity and transform where possible; avoid layout-heavy animation.
- Transitions should clarify hierarchy, not delay work. Target short feedback around 100–200 ms and screen/sheet motion around 200–350 ms, then validate by feel and performance.

### 7.5 Viewport, safe-area, and keyboard rules

- support `320px` width without loss of information or functionality;
- use `100dvh` where the visible viewport must track browser UI, with an appropriate fallback;
- include all four `env(safe-area-inset-*)` values where edge content requires them;
- do not place fixed actions beneath the bottom navigation or home indicator;
- use one primary vertical scroll surface per screen whenever possible;
- prevent accidental scroll chaining in sheets while preserving platform navigation behavior where possible;
- hide/reconfigure bottom navigation during focused multi-step editing if it competes with the keyboard;
- ensure focused inputs and their validation messages remain visible when the virtual keyboard opens;
- test portrait and landscape; do not lock orientation.

---

## 8. Mobile shell and navigation design

### 8.1 Shell variants

Implement explicit shell modes rather than conditionals scattered through screens:

| Shell mode | Intended use |
|---|---|
| `standard` | Top app bar + scroll body + role-aware bottom tabs |
| `detail` | Back button + title/actions; bottom tabs normally hidden |
| `immersive` | Reader/editor/media experiences with controlled chrome |
| `flow` | Onboarding, create, upload, payment, and registration steppers |
| `public` | Marketing, public share, legal, and logged-out routes |
| `admin` | Dense but touch-safe admin navigation and content |

Each route manifest entry declares a shell mode. Screens must not render a second competing app shell.

### 8.2 Bottom navigation

Bottom navigation is role-aware and contains only high-frequency top-level destinations. More destinations belong in an account/menu sheet, not an overcrowded tab bar. Labels remain visible; icon-only primary navigation is not acceptable.

**Decided 2026-08-07 by the user. This supersedes the five-tab proposals below.**

The tab sets are **not declared in mobile code**. `client/src/layouts/app-shell/navigation/` already owns the app's destinations — one preset per audience, each naming the three keys its compact bar shows, with Profile taking a fourth slot (`buildNav.js`, `MOBILE_SLOTS = 4`). The desktop shell has been building a four-slot mobile bar from that model since before this plan existed; §8.2's original proposal was written without knowledge of it.

The user chose the presets over a second list, for the reason `buildNav.test.js` records in its own header: the app previously had two independent navigation systems, and a feature added to one was unreachable from the other — every writer had a live competition they could not reach from anywhere in the UI. One model means a destination cannot exist in one bar and not the other.

| Audience | Tabs (from the preset's `mobileKeys` + Profile) |
|---|---|
| Writer | Dashboard · Create · Messages · Profile |
| Industry | Discover · Featured · Messages · Profile |
| Reader | Home · Discover · Messages · Profile |
| Admin | Console · Search · Messages · Profile |

Consequences accepted with the decision:

- the writer's bar carries **no Discover and no Challenge tab**; both remain reachable from the dashboard and the account sheet, and Challenge additionally from the dashboard's segmented strip;
- four tabs rather than five gives wider targets at 320 px (measured 80 px per column there);
- adding a destination to a bar is a one-line edit in the preset that owns it, and it changes desktop and mobile together.

`client/src/mobile/navigation/mobileNav.js` adapts rather than declares: it resolves the preset's icon keys to Material Symbols ligatures, derives the active tab from the URL, and guarantees order.

**Ordering is part of the contract.** WCAG SC 3.2.3 requires a navigation mechanism repeated across pages to keep the same relative order. Per-audience sets do not violate it — a viewer's audience does not change from page to page — but reordering by recency, badge count or usage would. The bar therefore never sorts, and a badge changes an item's contents, never its index. Asserted by `mobileNav.test.js`.

A URL determines the active tab; local component state does not. At most one tab is ever `aria-current="page"`, and **none** is the correct answer on a screen that belongs to no tab.

<details>
<summary>Superseded 2026-08-05 proposal, kept as the record of what was considered</summary>

- **Writer:** Dashboard, Discover, Create, Messages, Profile; Challenge remains prominent through dashboard/menu or may replace Discover after product approval.
- **Industry:** Discover, Dashboard, Writers, Messages, Profile.
- **Reader:** Home, Discover, Featured, Messages, Profile.
- **Admin:** Console, Search, Messages, Profile, More.

</details>

### 8.3 Back navigation

- A nested screen uses browser history when a valid in-app previous entry exists.
- A direct deep link uses a deterministic parent-route fallback.
- Closing a sheet restores focus to its trigger.
- Cancelling an edited/dirty flow prompts once and offers Stay/Discard.
- Android browser back and iOS edge/back behavior must not be blocked without a documented reason.

---

## 9. Complete route coverage ledger

Status vocabulary:

- `BASELINE`: some mobile code exists but has not passed this plan's completion gate;
- `NOT STARTED`: no approved native-style mobile page exists;
- `REDIRECT`: no new page is required, but redirect behavior must be tested on mobile;
- `DEV ONLY`: excluded from production completion but kept functional for development;
- `COMPLETE`: allowed only after section 18 is satisfied and verification evidence is recorded.

### 9.1 Public marketing, SEO, and account-entry routes

| Route(s) | Desktop source | Mobile target/prefix | Status |
|---|---|---|---|
| `/` | `pages/landing/Landing.jsx` | `marketing/LandingMobile.jsx` / `ckm-landing` | NOT STARTED |
| `/about` | `pages/About.jsx` | `marketing/AboutMobile.jsx` / `ckm-about` | NOT STARTED |
| `/contact` | `pages/ContactPage.jsx` | `marketing/ContactMobile.jsx` / `ckm-contact` | NOT STARTED |
| `/pricing` | `pages/PricingRoute.jsx` | `marketing/PricingMobile.jsx` / `ckm-pricing` | NOT STARTED |
| `/features`, `/features/:slug` | `pages/SeoPage.jsx` | `marketing/SeoContentMobile.jsx` / `ckm-seo-page` | NOT STARTED |
| `/for`, `/for/:slug` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/industries`, `/industries/:slug` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/resources`, `/resources/:slug` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/resources/blog`, `/resources/blog/:slug` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/tools`, `/tools/:slug` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/faq`, `/genre/:slug` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/how-to-sell-a-script` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/how-to-find-producers` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/how-to-pitch-screenplay` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/how-to-find-film-investors` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/film-investment-india` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/bollywood-script-submission` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/web-series-screenplay-guide` | `pages/SeoPage.jsx` | same mobile SEO renderer | NOT STARTED |
| `/challenges` | `pages/landing/ChallengesPage.jsx` | `marketing/ChallengesMobile.jsx` / `ckm-challenges-marketing` | NOT STARTED |
| `/forgot-password` | `pages/ForgotPasswordRoute.jsx` | `auth/ForgotPasswordMobile.jsx` / `ckm-forgot-password` | NOT STARTED |
| `/invite/:token` | `pages/AcceptInvite.jsx` | `auth/AcceptInviteMobile.jsx` / `ckm-invite` | NOT STARTED |
| `/login`, `/join`, `/signup` | redirect to `/` | preserve query/referral and open correct auth entry | REDIRECT |
| `/share/profile/:id` | `pages/PublicProfile.jsx` or authenticated profile | `profiles/PublicProfileMobile.jsx` or `ProfileMobile.jsx` | NOT STARTED |
| `/share/project/:id` | `pages/PublicScript.jsx` | `projects/PublicProjectMobile.jsx` / `ckm-public-project` | NOT STARTED |
| `/:id` | profile/referral resolver | preserve resolver, then matching mobile destination | NOT STARTED |

### 9.2 Legal routes and aliases

| Route(s) | Mobile target | Status |
|---|---|---|
| `/privacy-policy` | `legal/PolicyMobile.jsx` / `ckm-policy` | NOT STARTED |
| `/privacy`, `/registration-privacy-policy` | redirect to `/privacy-policy` | REDIRECT |
| `/terms-of-service` | `legal/TermsOfServiceMobile.jsx` / `ckm-terms` | NOT STARTED |
| `/terms`, `/t-and-c` | redirect to `/terms-of-service` | REDIRECT |
| `/terms-conditions` | `legal/RoleTermsMobile.jsx` / `ckm-terms` | NOT STARTED |
| `/writer-terms`, `/investor-terms` | redirect with correct `tab` query | REDIRECT |
| `/script-upload-terms` | `legal/UploadTermsMobile.jsx` / `ckm-upload-terms` | NOT STARTED |

### 9.3 Onboarding routes

| Route(s) | Desktop source | Mobile target | Status |
|---|---|---|---|
| `/writer-onboarding` | `pages/WriterOnboardingRoute.jsx` | `onboarding/WriterOnboardingMobile.jsx` | NOT STARTED |
| `/producer-director-onboarding` | `pages/ProducerOnboardingRoute.jsx` | `onboarding/ProducerOnboardingMobile.jsx` | NOT STARTED |
| `/investor-onboarding` | redirect to producer/director onboarding | preserve intent/referral if applicable | REDIRECT |
| `/industry-onboarding` | `pages/IndustryOnboarding.jsx` | `onboarding/IndustryOnboardingMobile.jsx` | NOT STARTED |

### 9.4 Writer, discovery, project, communication, and profile routes

| Route(s) | Desktop source | Mobile target | Status |
|---|---|---|---|
| `/dashboard` | `pages/Dashboard.jsx` | existing `mobile/screens/Dashboard.jsx`, to reorganize/harden | BASELINE |
| `/ai-tools` | dashboard variant | `writer/AiToolsMobile.jsx` or an explicit dashboard nested screen | NOT STARTED |
| `/offer-holds` | dashboard variant | `writer/OfferHoldsMobile.jsx` or explicit dashboard nested screen | NOT STARTED |
| `/follow-requests` | `pages/FollowRequests.jsx` | `profiles/FollowRequestsMobile.jsx` | NOT STARTED |
| `/top-script` | `pages/TopList.jsx` | `discovery/TopScriptsMobile.jsx` | NOT STARTED |
| `/trending` | redirect to `/top-script` | preserve redirect | REDIRECT |
| `/featured` | `features/featured-broadsheet` | `discovery/FeaturedProjectsMobile.jsx` | NOT STARTED |
| `/search` | `pages/Search.jsx` | `discovery/SearchMobile.jsx` | NOT STARTED |
| `/new-project` | `pages/NewProject.jsx` | `mobile/screens/NewProject.jsx` (`ckm-new-project`, `flow` shell) | **DONE** (2026-08-09, Phase 3 bullet 2). Two stacked cards, `startFresh` carried on the link and asserted by test. **Note: nothing links to this route on EITHER platform** — the Create entry in `writerNav.js` goes straight to `/create-project` with `fresh: true`, on desktop and mobile alike. It is deep-linkable and listed in `seo/seoRoutes.js`. See the open follow-up |
| `/create-project`, `/create-project/:draftId` | `pages/CreateProject` | `mobile/screens/create/CreateProjectRoute.jsx` → `CreateProjectChrome` → **mode A** `Editor.jsx` (`ckm-editor`, `immersive` + `EDITOR_SHELL_SLOTS`) when `step === 1`, **mode B** `Wizard.jsx` (`ckm-create-project`, `flow` + `WIZARD_SHELL_SLOTS`) for steps 2–5 | **DONE — PROMOTED TO `SCREEN` 2026-08-09.** Both modes built, 10 panels ported onto the `ckm-field`/`ckm-control`/`ckm-chip` family, six overlays (exit flow, drafts sheet, cover cropper, title page, buyer preview, submitted). The orchestrator is shared, not forked: `<CreateProject Shell={CreateProjectChrome} nativeChrome hostClassName=… />`. **ONE DECLARED EXCLUSION:** `?ctx=competition` stays on desktop (`excludeQuery` in the manifest) — competition mode replaces the whole wizard with `CompetitionBar` + `CompetitionPitch` and a one-way Submit, neither ported, and shipping without the exclusion would leave a competition writer with no way to submit at all |
| `/upload` | `pages/ScriptUpload.jsx` + `components/script-upload/` | `mobile/screens/upload/UploadRoute.jsx` → `ScriptUploadChrome.jsx` → `Upload.jsx` (`ckm-upload`, `flow` + `UPLOAD_SHELL_SLOTS`) with ten panels in `panels/UploadPanels.jsx`; `UploadStates.jsx` for the three non-flow surfaces | **DONE — PROMOTED TO `SCREEN` 2026-08-09.** Ten panels on the `ckm-field`/`ckm-control`/`ckm-chip`/`ckm-media` families; the orchestrator is shared, not forked: `<ScriptUpload Workspace={ScriptUploadChrome} nativeChrome hostClassName=… />`. `utils/scriptUploadValidation.js` was already platform-neutral, so every rule and every error message is one implementation. **NO EXCLUSIONS** — unlike `/create-project`, every query form of this route is ported |
| `/upload?draft=<id>` | same page, `?draft` branch | same mobile screen; the orchestrator reads the param itself | **DONE 2026-08-09 — previously undocumented in this ledger.** Converts a project written in the screenplay editor into an upload: the loader sets `scriptId`, so the submit updates that project rather than creating a second one. **Open defect DEF-8: the loader's failure is swallowed** (`catch { /* proceed normally */ }`) on both platforms |
| `/upload?edit=<id>` | same page, `?edit` branch | same mobile screen | **DONE 2026-08-09 — previously undocumented in this ledger.** Updates a published script (`PUT /scripts/:id`). Two sub-states: `editApprovalLocked` (an edit already in admin review) refuses submit with a visible reason, and — if the loaded script reports `isCollaborator && canEditMetadata === false` — **content-only mode**, a genuinely different screen: one field, no steps, no overflow, and a submit that posts to `/collab/:id/revisions`. **DEF-8 applies here too, and is worse: "proceeding normally" means an empty form over a live listing** |
| `/script/:id` | `pages/ScriptDetail.jsx` | `projects/project-detail/ProjectDetailMobile.jsx` | NOT STARTED |
| `/script/:projectHeading/:writerUsername` | same detail page | same mobile detail component | NOT STARTED |
| `/:projectHeading/:writerUsername` | same detail page/catch-all | same component; collision tests mandatory | NOT STARTED |
| `/script/:id/pay` | `pages/ScriptPaymentPage.jsx` | `projects/payment/ProjectPaymentMobile.jsx` | NOT STARTED — **moved from Phase 3 to Phase 4 on 2026-08-09** by user decision. It is a buyer surface, and its money-adjacent states can only be honestly verified against the buyer screens it is reached from |
| `/messages` | `features/messages-operator` | `messages/MessagesMobile.jsx` | NOT STARTED |
| `/profile/:id?` | `pages/Profile.jsx` | `profiles/ProfileMobile.jsx` | NOT STARTED |

### 9.5 Challenge and awards routes

| Route(s) | Desktop source | Mobile target | Status |
|---|---|---|---|
| `/challenge` | `pages/challenge/ChallengeHub.jsx` | `challenges/ChallengeHubMobile.jsx` | NOT STARTED |
| `/challenge/c/:slug` | `CompetitionLanding.jsx` | `challenges/ChallengeDetailMobile.jsx` | NOT STARTED |
| `/challenge/register` | `CompetitionRegister.jsx` | `challenges/ChallengeRegisterMobile.jsx` | BASELINE (responsive branch exists; must conform) |
| `/challenge/dashboard` | `CompetitionDashboard.jsx` | `challenges/ChallengeDashboardMobile.jsx` | BASELINE (responsive branch exists; must conform) |
| `/my-competitions` | redirect to `/challenge?tab=mine` | preserve tab and history behavior | REDIRECT |
| `/hall-of-fame` | `hall-of-fame/HallOfFame.jsx` | `challenges/HallOfFameMobile.jsx` | NOT STARTED |
| `/hall-of-fame/:slug` | `HallOfFameDetail.jsx` | `challenges/HallOfFameDetailMobile.jsx` | NOT STARTED |

### 9.6 Industry routes

| Route(s) | Desktop source | Mobile target | Status |
|---|---|---|---|
| `/home` | `features/investor-desk` | `industry/IndustryHomeMobile.jsx` | NOT STARTED |
| `/dashboard` for industry roles | producer workspace dashboard | `industry/IndustryDashboardMobile.jsx` | NOT STARTED |
| `/mandates` | `producer-workspace/MandatesPage.jsx` | `industry/MandatesMobile.jsx` | NOT STARTED |
| `/writers` | `producer-workspace/WriterRosterPage.jsx` | `industry/WritersMobile.jsx` | NOT STARTED |
| shared `/featured`, `/search`, `/top-script`, `/messages`, `/profile/:id?` | audience-aware desktop pages | audience-aware mobile variants above | NOT STARTED |

### 9.7 Reader routes

| Route(s) | Desktop source | Mobile target | Status |
|---|---|---|---|
| `/reader` | `pages/ReaderHome.jsx` | `reader/ReaderHomeMobile.jsx` | NOT STARTED |
| `/reader/search` | reader-home search variant | `reader/ReaderDiscoverMobile.jsx` | NOT STARTED |
| `/reader/script/:id` | `pages/ScriptReader.jsx` | `reader/ScriptReaderMobile.jsx` | NOT STARTED |
| `/reader/profile/:id?` | `pages/ReaderProfile.jsx` | `reader/ReaderProfileMobile.jsx` | NOT STARTED |
| `/reader/featured` | redirect to `/featured` | preserve redirect | REDIRECT |
| shared `/featured`, `/messages`, profile paths | audience-aware desktop pages | audience-aware mobile variants | NOT STARTED |

### 9.8 Admin and finance routes

| Route(s) | Desktop source | Mobile target | Status |
|---|---|---|---|
| `/admin` | `pages/AdminDashboard.jsx` | `admin/AdminMobile.jsx` | NOT STARTED |
| `/admin/competitions/:id` | admin competition editor | `admin/AdminCompetitionMobile.jsx` | NOT STARTED |
| `/admin/scripts/:id` | `pages/AdminScriptView.jsx` | `admin/AdminScriptMobile.jsx` | NOT STARTED |
| `/admin/agreements` | `pages/AdminAgreements.jsx` | `admin/AdminAgreementsMobile.jsx` | NOT STARTED |
| `/finance` | `pages/FinancePanel.jsx` | `finance/FinanceMobile.jsx` | NOT STARTED |

Admin/finance mobile completion means the functionality works safely on a phone. Dense data tables should become summaries, cards, filters, and detail routes/sheets; they must not become tiny horizontally scaled tables. If a high-risk operation should remain unavailable on phones, that is a product-policy exception requiring explicit user approval and a documented alternative—not an implementation omission.

### 9.9 Development route

| Route | Disposition | Status |
|---|---|---|
| `/__mobile-preview` | maintain as a safe mobile preview entry in development; expand to accept a route/audience fixture if useful | DEV ONLY |
| `/__mobile-primitives` | primitive/state harness (`mobile/dev/PrimitiveGallery.jsx`); every new shared primitive adds its states here before a screen depends on it | DEV ONLY |
| `/__mobile-editor` | screenplay-editor harness (`mobile/dev/EditorHarness.jsx`, added 2026-08-09). Mounts the real `Editor` chrome, the real stylesheets and the real CodeMirror over a fixture `CreateProjectContext`, with `?state=recovery\|error\|exit\|readonly\|prose`. It exists because `/create-project` is still a migration fallback and the editor's real risks — touch targets, contrast on dark chrome, whether the docked bar covers the caret line — are only measurable in a browser. **Retire it when the route is promoted** | DEV ONLY |

---

## 10. Cross-page component and overlay coverage

Routes alone are insufficient. Track these families because they can otherwise remain desktop-only inside an otherwise completed mobile page.

| Family | Examples in current client | Required mobile treatment | Status |
|---|---|---|---|
| Authentication | auth modal, Google sign-in, OTP, password, forgot password | full-screen/sheet flow with keyboard and error handling | NOT STARTED |
| Pricing and checkout | pricing modal/plans, plan checkout, Razorpay | full-screen flow; return/cancel/payment recovery | NOT STARTED |
| Onboarding | writer/producer modal content, role selection | dedicated flow screens; resumable progress | NOT STARTED |
| Account/settings | user menu, preferences, privacy settings, currency, language, dark mode | account screen and focused sheets | BASELINE (account menu only) |
| Notifications | bell, list/panel, toasts, targets | real service data, deep links, read state | BASELINE |
| Profiles | edit profile, completion, badges, activity, follow requests | route or full-height sheet; image/file controls | NOT STARTED |
| Projects | cards, share, bookmark, review, ratings, payment | shared touch-safe primitives and route details | NOT STARTED |
| Creation/editor | editor toolbar, title page, AI tools, collaboration, presence, version history, reports, corkboard | mobile editor research spike; progressive/immersive UI | **PARTIAL** (2026-08-09). Built: the docked Elements/Format toolbar (`EditorDock`), the overflow and export sheets, the exit flow, the **title page** (`overlays/TitlePageDialog`), the cover cropper, the buyer preview and the submitted acknowledgement — all as `ckm-dialog`/`ckm-bottom-sheet`/`ckm-action-sheet`. AI generators are wired where the wizard needs them (logline, synopsis, roles, prose, cover) but have no quota surface. Not started: collaboration, presence, comments, version history, reports, corkboard — the D5 sheets, Phase 3 bullet 4 |
| Upload | validation, phases, success view, terms | keyboard/file-picker-safe step flow | NOT STARTED |
| Messaging/meetings | threads, composer, attachments, meeting modal, calendar card | list-detail stack and keyboard-safe composer | NOT STARTED |
| Collaboration | requests, invite, presence, comments, activity | mobile panels/sheets with real-time states | NOT STARTED |
| Challenges | cards, countdowns, timeline, participants, referrals, submit entry | domain mobile primitives and route flows | BASELINE (some responsive components) |
| Public marketing | header/nav, trailer, partner modal, footer, CTA/auth entry | native-feeling public shell without harming SEO | NOT STARTED |
| Legal/consent | cookie banner, terms tabs, policy documents | readable, searchable, accessible; consent never obscures actions | NOT STARTED |
| Global dialogs | confirm, event poster, about, success/error feedback | accessible dialog/sheet patterns with focus restoration | NOT STARTED |
| Loading and failure | route fallback, skeletons, error boundary, empty states | consistent shell-level and page-level states | BASELINE |

When implementing a page, add every child overlay it invokes to its parity checklist. A route is not complete while a button still opens desktop markup or calls `desktopOnly()`.

---

## 11. Phased implementation roadmap

Phases are ordered to minimize architectural rework. Implement vertical slices: research, design, data, page, states, tests, and verification together.

### Phase 0 — Foundation and route safety

- [x] Snapshot current mobile dashboard at supported widths for regression reference.
- [x] Create `mobile/routes/` and the route manifest/policy.
- [x] Replace the dashboard-swallowing behavior with route-aware mobile resolution.
- [x] Add route coverage and policy tests, including role and auth combinations.
- [x] Define shell variants and route-level error/suspense boundaries.
- [x] Expand tokens for spacing, typography, touch, chrome, elevation, motion, and z-index.
- [x] Normalize CSS scoping and prefix rules without visually regressing the dashboard.
- [x] Define mobile analytics/page-tracking behavior.
- [x] Decide migration fallback behavior and expose it clearly in development.
- [x] Update `client/src/mobile/README.md` to point to this canonical plan.

**Exit gate:** direct mobile navigation to `/dashboard`, `/search`, `/messages`, `/profile/...`, public routes, role-specific routes, and an unknown route is deterministic; no URL silently becomes the dashboard.

### Phase 1 — Shared native-style system and chrome

- [x] Standard/detail/immersive/flow/public/admin shells. *(shell-mode contract landed in Phase 0; `detail` is now exercised by a real screen.)*
- [x] Role-aware top app bars and bottom navigation. *(2026-08-07: `ckm-appbar` + `ckm-navbar` + `navigation/mobileNav.js` + `hooks/useMobileNav.js`. The tab sets are **not declared in mobile code** — they are the desktop audience presets (`layouts/app-shell/navigation/`), the user's decision recorded in §8.2, so a destination cannot exist in one bar and not the other. Tabs are links, not buttons calling `onSelect`; the selected tab is derived from the URL by `resolveActiveTabKey`, never passed in — the old bar's active tab was the literal constant `"dashboard"`. At most one tab is `aria-current="page"` and **none** on a screen that belongs to no tab. `TopBar`/`BottomNav` are superseded and now unused; both prefixes stay registered until the files are deleted.)*
- [x] Page header, back button, icon button, primary/secondary/destructive buttons. *(2026-08-05: `ckm-button` (primary/secondary/tertiary/destructive × md/lg, pending, disabled, link forms), `ckm-icon-button` (44px hit region at every size, badge folded into the accessible name), `ckm-back` + `hooks/useMobileBack.js` (§8.3 history-vs-parent rule), `ckm-page-header`.)*
- [x] Form field, textarea, select, checkbox, radio, switch, file picker. *(2026-08-05: `ckm-field` + `ckm-control` + `ckm-checkbox` / `ckm-radio` / `ckm-switch` / `ckm-file-picker`. **Combobox is deliberately not built** — a searchable combobox is only worth its cost where a list must be filtered, so it is deferred to the first screen that needs one, most likely Search filters in Phase 4.)*
- [x] List row, card, chip, badge, segmented control, tabs, pagination/load-more. *(2026-08-05: `ckm-list`/`ckm-row` (real `<ul>`/`<li>`; a row may navigate **and** carry its own control, via a `::after` overlay on the row's link so the second control is never nested inside it), `ckm-card` + parts (the whole card is tappable while the link's accessible name stays the title alone), `ckm-badge` (status only, with the new `*-ink` text tokens), `ckm-chip` extended in place with the interactive/removable forms plus `ckm-chip-row`, `ckm-segmented` (a real radio group, because it filters rather than switching panels), `ckm-tabbar` (APG tablist: one Tab stop, arrow/Home/End, `aria-controls`, focusable panel), `ckm-load-more` (count as an SC 4.1.3 status message, cost named in the button, focus rescued when the button unmounts).)*
- [x] Bottom sheet, full-screen dialog, confirm dialog, context menu. *(2026-08-05: `ckm-overlay` base + `ckm-bottom-sheet` (drag-to-dismiss bound to the grip only, so a drag on the body scrolls it), `ckm-dialog` (full-screen task; closes with a close icon, never a back chevron, and refuses scrim dismissal), `ckm-confirm` (`role="alertdialog"`; a destructive confirmation focuses **Cancel**, and Escape/scrim both mean cancel), `ckm-action-sheet`. **The context menu is an action sheet and is deliberately not `role="menu"`** — the APG menu contract (roving tabindex, arrows, Tab leaves the menu) is a desktop application-menu convention, and a phone list of actions and links is better served by plain buttons and links in a dialog; the trigger carries `aria-haspopup="dialog"`. The dashboard-era `components/BottomSheet.jsx` was **superseded, not upgraded**, matching the `ckm-btn`→`ckm-button` and `ckm-tabs`→`ckm-tabbar` calls; Phase 2 migrates the four dashboard overlays onto `Sheet` and retires it.)*
- [x] Toast/status, inline error, retry, skeleton, empty state, offline state. *(2026-08-05: `ckm-toast` — a queue above the router with two always-mounted live regions, which **enforces** rather than documents the rule that a toast carrying an action or an error never auto-dismisses; `ckm-message` — the durable counterpart, inline strip and panel failure form, both carrying the retry; `ckm-offline` + `hooks/useOnlineStatus.js`, rendered by `MobileShell` so every screen inherits it; `ckm-skel` extended in place with composable shapes; `ckm-empty` reused and given `titleAs`. **The DynamicIsland was superseded, not upgraded**, matching `ckm-btn`→`ckm-button`, `ckm-tabs`→`ckm-tabbar` and `ckm-sheet`→`ckm-bottom-sheet`: it makes the whole message a `<button>`, so it can never carry an "Undo", and its one production caller is `notify.desktopOnly()`, which §2.8 deletes by completion. `useInertBackground` gained one narrow, opt-in exemption — `inert` removes a subtree from the accessibility tree, so a toast layer caught by the overlay walk would be announced to nobody.)*
- [x] Scroll lock, focus trap/restoration, reduced motion, safe-area and keyboard helpers. *(2026-08-05: `hooks/` — `useScrollLock` (locks the shell's `<main>`, because `ckm-html-lock` already locked the document and a `body` scroll lock is a no-op in this app; reference-counted, restores position), `useFocusTrap` + `tabbable.js` (initial focus, Tab/Shift+Tab wrap, and the restoration policy §18 requires — opener, else a still-focusable fallback, else the scroll surface), `useInertBackground` (the browser's own `inert`, computed from one module-level stack so stacked overlays cannot mark each other inert), `useReducedMotion` (JS motion cannot be reached by the CSS media query), `useKeyboardInset` (visualViewport; iOS does not shrink the layout viewport, so a sheet footer sits under the keyboard without it), and `useOverlay` composing all four.)*
- [x] Story/demo route or test harness for states and theme variants. *(2026-08-05: `/__mobile-primitives` → `mobile/dev/PrimitiveGallery.jsx`; every new primitive adds its states here.)*

**Exit gate:** primitives are accessible, themeable, touch-safe, documented, and verified at 320–768 px without requiring page-specific overrides.

### Phase 2 — Writer navigation and dashboard completion

- [x] Dashboard research/parity audit against desktop. *(2026-08-07 — §19.3. Payload shapes read out of `server/controllers/dashboardController.js` rather than inferred from client code, which is what caught the review-mapping defect.)*
- [x] Remove local/static production placeholders and wire real services. *(2026-08-07 — `data/dashboardModel.js` + a rewritten `hooks/useDashboardData.js`. The AI and platform review lists were reading `score`/`summary` off payloads that send `rating`/`overall`/`feedback`, so every card showed 0/100 with identical empty bars and a hardcoded sentence about a real script. Also: the literal "Placeholder" badge, the three invented notifications behind the bell, `score: null` on every project card, and Performance's two "—" rows. The bell now consumes the desktop shell's own `useShellNotifications`.)*
- [x] Complete search, notification, account, profile, project, share, and collaboration destinations used by dashboard. *(2026-08-07 — all nine `desktopOnly()` call sites replaced by real destinations or real in-place behaviour, and `DynamicIsland` deleted with them. Share is the Web Share API with a clipboard fallback; Filter is a real `ckm-segmented` status filter. Search is the app bar's, which Phase 1 already made role-aware.)*
- [x] Replace provisional bottom navigation with approved writer tabs. *(2026-08-08 — **approved by the user as-is**: Dashboard · Projects · Messages · Profile. No code change; the bars have been preset-driven and URL-driven since Phase 1 §8.2, and the Phase 1 CDP sweep already measured this exact bar clean at all five widths. What this session added is enforcement: `mobileNav.test.js` now asserts the approved **labels and order**, and asserts that Create is absent from the compact bar but present in the rail and drawer — the condition the approval depended on.)*
- [x] Implement `/ai-tools` and `/offer-holds` as real route-aware screens/sections. *(2026-08-08 — **the plan's premise was wrong and the §4 gate says so**: both routes are the identical `<DashboardRoute />` element as `/dashboard` in `App.jsx:582-583`, `pages/Dashboard.jsx` never reads the pathname, they have been that way since `93055d0` (2026-02-25), and nothing in the product links to either. Resolved with the user: `/offer-holds` built for real, `/ai-tools` recorded as a dashboard alias. See §19.3.)*
- [x] Complete account/settings and global auth/session behaviors. *(2026-08-08 — **there is no settings page to port on either platform.** No `/settings` route, no settings page; desktop's entire account surface is `UserMenu.jsx`'s four entries plus Log out, which mobile's `AccountMenu` already mirrors — with a logout confirmation desktop does not have. Global auth/session already lives outside React in `services/api.js` + `AuthContext.jsx` and mobile inherits all of it (§5.4). Delivered: the `/terms` and `/privacy` alias links fixed to canonical, first-ever test coverage for the account surface, and the logout/cache contract pinned. See §19.3.)*

**Exit gate: MET (2026-08-08).** Verified by grep: zero live `desktopOnly()` call sites remain anywhere in `client/src/mobile`; `DynamicIsland`, `BottomSheet`, `TopBar` and `BottomNav` are deleted and their prefixes retired.

### Phase 3 — Project creation, upload, and screenplay tools

- [x] Research spike for mobile screenplay/editor workflows before final design. *(2026-08-08. §4 gate run across all five routes at once. Headline: `ScreenplayEditor` is a controlled CodeMirror 6 host with an imperative `apiRef` and no desktop layout — mobile reuses it and rebuilds only the chrome, so the phase's biggest risk is a toolbar problem, not an editor problem. Nine decisions (D1–D9) and five defects/risks (DEF-1…DEF-5) recorded in §19.3.)*
- [x] Create project new/draft routes with save/resume and unsaved-change protection. *(**COMPLETE 2026-08-09 (third session): mode B — the publish wizard — landed and `/create-project` + `/create-project/:draftId` were promoted to `SCREEN` in the same change.** `Wizard.jsx` + `wizardChrome.js` + `Wizard.css` (`ckm-create-project`), ten panels in `panels/` on the shared form family, six overlays in `overlays/`, and the seam: `pages/CreateProject/index.jsx` gained `Shell` / `nativeChrome` / `hostClassName`, all defaulted so desktop is unchanged. Resume lands on the exact step **and** Details sub-panel (D7, via `lib/workingDraft.js`). The unsaved-change prompt is now one shared `ExitFlow` serving both modes. `?ctx=competition` is a declared manifest exclusion, not a silent gap. `/__mobile-editor` retired in favour of `/__mobile-create`, which mounts both modes over a fixture. Prior, same day: the save/resume core.*
  *Earlier detail, kept: **save/resume core and `/new-project`.** Delivered: `lib/workingDraft.js` (per-draft snapshot keys, so a resumed draft finally gets a local fallback — DEF-2; `step` **and** the Details sub-panel recorded, so resume lands where the writer left; a pure `chooseDraftRecovery` that refuses to clobber a co-writer), `lib/keepaliveSave.js` (measures the exit-save body against MDN's 64 KiB cap and **refuses to send** one that will not fit, instead of advancing the "saved" signature on a request the browser discards — DEF-1), both wired into `pages/CreateProject/` for **both platforms**, and the mobile `/new-project` chooser. Still open in this bullet: the mobile `/create-project` and `/create-project/:draftId` screens themselves, which the now-approved wireframe unblocks. **Update 2026-08-09 (later): mode A — the editor — is built and verified; mode B (the publish wizard, steps 2–5) is not, and the route therefore stays a `DESKTOP_MIGRATION_FALLBACK`. Promoting it with an unported wizard would put desktop form markup on the phone the moment a writer taps "Continue to details", which §2.2 forbids. The editor is reachable at the development route `/__mobile-editor`; the route promotion and mode B land together.**)*
- [x] Upload workflow, validation, legal acceptance, progress, failure/retry, and success. *(**COMPLETE 2026-08-09 (fourth session): `/upload` is a `SCREEN` route, with both of its query forms.** Ten panels (`panels/UploadPanels.jsx`) on the shared form and `ckm-media` families, a pure chrome model (`uploadChrome.js`), the flow (`Upload.jsx`, `ckm-upload`, `flow` + a one-slot footer override) and the three surfaces desktop expresses as early returns (`UploadStates.jsx`: refused, `?edit=` resolving, submitted). The seam is three defaulted props on `pages/ScriptUpload.jsx` — `Workspace` / `nativeChrome` / `hostClassName` — so App.jsx's bare `<ScriptUpload />` renders exactly what it rendered before. **Validation, legal acceptance and failure/retry are shared code, not ported:** `utils/scriptUploadValidation.js` was already platform-neutral, and its per-field `fieldId` is honoured on mobile through a wrapping anchor plus the control's own `error` prop (D11). **Progress is now honest on BOTH platforms (D14):** `uploadMediaForScript` reports real bytes through axios's `onUploadProgress`, and step 1's extraction — which reports no progress at all — is an indeterminate busy state here rather than desktop's invented 10%-per-200ms bar (DEF-9). Save draft moved to the overflow so the footer keeps two controls rather than four in a 320px row (D13, and DEF-4 measured what the fourth costs). `?ctx=` has no exclusion: every query form is ported.)*
- [~] Screenplay editor touch toolbar, element selection, keyboard behavior, comments/presence, version history, reports, and title page. *(Low-fidelity wireframe **approved by the user 2026-08-09**. **2026-08-09 (later) — the editor surface itself is BUILT**: `mobile/screens/create/Editor.jsx` + `EditorDock.jsx` + `editorChrome.js` + `Editor.css` (`ckm-editor`), mounting the real `ScreenplayEditor` (D1), the one docked Elements/Format bar with its More-elements sheet (D3, D4), the overflow action sheet (D5), the native exit-as-draft flow and the recovery notice. Still open in this bullet: comments/presence, version history, reports, corkboard and the Navigator — the sheets D5 lists but Phase 3 bullet 2 did not need. **Update 2026-08-09 (third session): the editor is LIVE at `/create-project` (the route was promoted with mode B), and title-page editing is now built — `overlays/TitlePageDialog.jsx`, a `ckm-dialog` over the shared `TITLE_PAGE_FIELDS` and the orchestrator's `saveTitlePage`.**)*
- [x] AI creation/review tools and quota states. *(**COMPLETE 2026-08-10 (fifth session): this bullet is an entitlement/state slice, not a new route.** One client/server rule now grants every paid plan (`pro`, `enterprise`, `silver`, `gold`, `diamond`) the same AI actions and locks `free`/`none`; server enforcement now covers metadata and cover generation as well as the existing prose, grammar, evaluation and trailer endpoints. AI covers have a real allowance of 15 per plan period, reserved atomically on `User.subscription.aiImagesGeneratedTotal` before generation, released on upstream failure, and reset by every existing purchase/grant path. Both `/create-project` and `/upload` render the authoritative remaining count, distinguish a free-plan upgrade from a paid writer's exhausted quota, expose a disabled pre-tap quota state, and suppress same-frame double taps. The duplicated dead cover route was removed; `AiWritingAssistant.jsx`, the orphaned `scriptController.generateAiCover`, and the uncalled trailer UI/endpoints are documented rather than revived or deleted.)*
- [~] File/image/video picker and interrupted-upload recovery. *(**Substantially delivered 2026-08-09 by bullet 3**, because the same screen owns both. The pickers are the shared `ckm-media` `MediaSlot` (a real `<input type="file">` behind a `<label>`, per MDN — drag-and-drop is not ported because a touch screen has nothing to drag a file from) and the script picker in `panels/UploadPanels.jsx`. Interrupted-upload recovery is `pendingMediaRecovery` promoted from a sentence in a toast to a real surface: a chrome-level notice naming what failed, per-file determinate progress on the Visual assets panel, and a footer primary that reads **"Retry the media upload"** rather than desktop's "Publish", which is wrong twice over. Still open in this bullet: the same treatment for `/create-project`'s media, and the resumable-upload question for a 250 MB trailer on a phone connection that drops — this retries the whole file, which is honest but expensive.)*

**Exit gate:** a writer can create or upload, leave, resume, validate, collaborate where allowed, and finish a project entirely on a supported phone.

> `/script/:id/pay` **moved to Phase 4 on 2026-08-09** by user decision. It is a buyer surface and this gate is written entirely about a writer; its money-adjacent states cannot be honestly verified without the buyer screens it is reached from.

### Phase 4 — Discovery and project consumption

- [ ] Search, filters, sort, pagination, saved state, and result cards.
- [ ] Top scripts and featured projects.
- [ ] Project detail for every canonical route form.
- [ ] Public shared project.
- [ ] Share, bookmark, rating/review, purchase/payment, trailer/media, permissions, and restricted states. *(Includes `/script/:id/pay`, **moved here from Phase 3 on 2026-08-09** by user decision: it is the buyer's checkout, its neighbours are all in this phase, and its states — already purchased, not approved for payment, free, gateway blocked, verification failed after charge — can only be verified against them. Razorpay Checkout is a third-party overlay outside our DOM; back during checkout must not orphan a charged payment.)*
- [ ] Reader/preview modes and long-content performance.

**Exit gate:** all project discovery-to-detail actions and deep links work for each relevant audience.

### Phase 5 — Profiles, network, messages, and collaboration

- [ ] Own and visitor profile variants, tabs, editing, completion, badges, posts/activity, saved projects.
- [ ] Public profile/share resolver and canonical username paths.
- [ ] Follow requests and follow/unfollow states.
- [ ] Thread list, message detail, composer, attachments, unread state, notification targeting.
- [ ] Meeting/calendar flows.
- [ ] Collaboration requests, invites, presence, comments, and activity.

**Exit gate:** identity, networking, and communication workflows are complete without desktop fallbacks.

### Phase 6 — Challenges and hall of fame

- [ ] Challenge marketing list and authenticated hub.
- [ ] Challenge detail, dynamic phase state, rules/resources/judges/sponsors.
- [ ] Registration, payment if applicable, validation, and confirmation.
- [ ] Participant dashboard, entry submission, referrals, achievements, winners.
- [ ] My Competitions query-tab deep link.
- [ ] Hall of Fame list/detail and public SEO behavior.

**Exit gate:** public and authenticated challenge journeys work end-to-end on mobile and all dynamic slugs are preserved.

### Phase 7 — Industry and reader audiences

- [ ] Industry discover/home and role-specific dashboard.
- [ ] Writer roster, filters, restrictions, details, ratings, mandates, ledger/offer workflows.
- [ ] Industry variants of search, featured, saved, messages, profile.
- [ ] Reader home/discover, featured, script reader, reader profile, messages.
- [ ] Audience-switch/onboarding transitions and permission tests.

**Exit gate:** every non-writer audience receives the correct mobile navigation and route content, never a writer dashboard.

### Phase 8 — Marketing, authentication, onboarding, legal, and public sharing

- [ ] Landing and all sections, marketing navigation, footer, trailer, and partner dialogs.
- [ ] SEO content renderer for every registered content route and slug.
- [ ] About, contact, pricing, challenge marketing page.
- [ ] Authentication, OTP, forgot password, invite, referral, and return-to-route behavior.
- [ ] Writer, producer/director, investor redirect, and industry onboarding.
- [ ] Privacy, terms, role terms/tabs, upload terms, redirects, consent banner.
- [ ] Public profile and project pages for logged-out users.

**Exit gate:** logged-out users get deliberate native-style mobile pages with SEO content, auth conversion, legal access, and deep-link integrity.

### Phase 9 — Admin and finance

- [ ] Admin mobile information architecture for all console sections.
- [ ] Responsive data summaries, filters, drill-downs, bulk-action safeguards, and audit visibility.
- [ ] Competition editor modules.
- [ ] Admin script view and agreements.
- [ ] Finance dashboard, transactions, invoices, ledger/reconciliation actions, and external-accountant restrictions.
- [ ] Destructive, financial, impersonation, and permission tests.

**Exit gate:** every registered admin/finance route is usable and safe on a phone, or has a user-approved documented policy exception.

### Phase 10 — Whole-application hardening and release

- [ ] Eliminate every mobile `desktopOnly()` and `desktop-migration-fallback` entry.
- [ ] Exhaustive route deep-link and browser-history pass.
- [ ] Exhaustive role/permission/subscription matrix.
- [ ] Visual regression matrix on target devices and widths.
- [ ] Accessibility audit: keyboard, screen reader, zoom, contrast, target size, focus visibility/order, reduced motion.
- [ ] Slow-network, offline/retry, API failure, empty, large-data, long-text, and localization tests.
- [ ] Performance profiling in production builds; list and editor stress tests.
- [ ] Cross-browser pass on current iOS Safari, Android Chrome, and supported desktop browsers at phone widths.
- [ ] Build, lint, unit/integration tests, route coverage tests, and prerender/SEO verification.
- [ ] Documentation reconciliation and final product sign-off.

**Exit gate:** section 18 is satisfied for every route and component family; the completion ledger contains evidence and no known blocker is hidden.

---

## 12. Per-page implementation sequence

Use this exact sequence for each route family:

1. Claim the next item in section 19 and set it to `RESEARCHING`.
2. Audit the desktop page, children, data, permissions, routes, tracking, and states.
3. Perform the current mobile/native research in section 4; record sources and decisions.
4. Write the text wireframe and, for complex pages, a visual wireframe.
5. Register the route, component path, CSS prefix, shell mode, and bottom-tab behavior.
6. Identify shared logic to extract; protect existing desktop behavior with tests first.
7. Implement a route-level mobile skeleton and error boundary.
8. Implement the functional happy path with real data/services.
9. Implement loading, empty, partial, permission, quota, error, retry, offline, and destructive states.
10. Implement all invoked overlays and child flows.
11. Add semantic structure, labels, focus management, pressed states, and reduced-motion handling.
12. Verify layout and interaction at all required widths, with long data and text zoom.
13. Run relevant unit/integration tests, lint on touched files, production build as risk warrants, and browser verification.
14. Compare every item in the desktop parity inventory.
15. Record evidence, decisions, follow-ups, and the exact next action in section 19.
16. Mark `COMPLETE` only if the definition in section 18 passes.

Do not mark a page complete because it renders, matches one screenshot, or works only with mock data.

---

## 13. Required screen states and interaction quality

Every data-backed screen must deliberately handle applicable states:

- initial loading with stable layout;
- background refresh without blanking content;
- empty first-use state with a useful action;
- empty filtered/search state with filter recovery;
- partial data or missing optional media;
- permission denied/not owner;
- plan/quota restricted;
- signed-out/session-expired;
- recoverable API error with retry;
- irreversible or destructive action confirmation;
- optimistic update, rollback, and pending prevention where relevant;
- slow upload/download and cancellation;
- offline or connectivity loss where detectable;
- very large lists;
- long titles, names, genres, currencies, and translated strings;
- deleted/unavailable deep-link target;
- success acknowledgement without blocking navigation.

Avoid stacking multiple transient surfaces. Define a z-index/layer contract for shell chrome, menus, sheets, dialogs, toasts, and critical alerts. Opening one blocking overlay closes or suspends conflicting overlays.

---

## 14. Accessibility requirements

WCAG 2.2 AA is the baseline; native-style polish never overrides accessibility.

- semantic headings and landmarks;
- accessible names for icon buttons;
- labels visually associated with form controls;
- errors connected to fields and announced;
- visible focus and predictable focus order;
- focus trapped only inside truly modal surfaces and restored on close;
- no action available only by swipe, drag, hover, color, or icon recognition;
- alternative to drag/reorder gestures;
- meaningful images have alt text; decorative images have empty alt text;
- captions/transcripts where media requires them;
- color and non-text contrast verified in every supported theme;
- content reflows without loss at 320 CSS px and browser zoom/text scaling;
- minimum 44 x 44 CSS px product touch target;
- current page/tab announced using correct semantics;
- live regions used sparingly and at the correct urgency;
- reduced motion honored;
- screen-reader verification on representative complex flows.

Do not disable pinch zoom with the viewport meta tag.

---

## 15. Performance and data rules

- mobile pages are lazy-loaded by route;
- do not import the full desktop page into a mobile screen merely to reuse one helper;
- reuse service calls and normalized data, not desktop DOM;
- cancel or ignore stale requests on route/parameter changes;
- avoid duplicate fetches when auth resolves or shell changes;
- paginate server-backed collections where supported;
- measure before adding virtualization, then use it for genuinely large lists;
- keep list rows shallow, keyed, and free of heavy calculation;
- size images correctly, provide aspect ratio, lazy-load offscreen media, and avoid layout shift;
- defer noncritical panels and expensive charts;
- avoid expensive rerenders during input, scroll, and animation;
- profile production builds, not only development mode;
- preserve a responsive press reaction even when the resulting work is expensive;
- maintain existing SEO prerender behavior for public routes.

Do not add a new state library, UI framework, router, CSS-in-JS system, or component kit without a documented need and user approval. Existing React state, hooks, services, and CSS are sufficient for the foundation.

---

## 16. Verification matrix

### 16.1 Required viewport widths

Test at minimum:

| Width | Purpose |
|---:|---|
| 320 px | WCAG reflow floor and smallest supported phone |
| 360 px | common small Android |
| 375 px | compact iPhone class |
| 390 px | modern iPhone class |
| 412 px | common large Android |
| 430 px | large iPhone class |
| 480 px | upper phone range |
| 768 px | current gate boundary / compact tablet transition |

Also test at least one short-height landscape viewport and one device with nonzero safe-area insets. Validate behavior just below and above the 768 px experience boundary during foundation work.

### 16.2 Content stress fixtures

Every reusable layout should be tested with:

- 1-character and very long names/titles;
- no avatar/poster and broken media;
- zero, one, and many list items;
- large unread/badge counts;
- long translated navigation labels;
- multiline validation errors;
- large currency values and dates;
- slow loading and request failure;
- 200% text zoom where practical;
- virtual keyboard open.

### 16.3 Automated checks

Minimum commands from `client/`:

```powershell
npm test
npm run lint
npm run build
```

During implementation, run focused tests first and the full suite at phase exits. Add:

- route policy and coverage tests;
- screen render tests for each route family;
- permission and audience tests;
- navigation/deep-link/back tests;
- data-adapter tests;
- critical form and destructive-flow integration tests;
- accessibility assertions for semantics and focus behavior.

Evaluate Playwright and axe integration during Phase 0. Add them only through a deliberate dependency change, then use real mobile browser emulation for visual, interaction, route, and accessibility regression coverage.

### 16.4 Manual/device checks

- current iOS Safari;
- current Android Chrome;
- installed/PWA mode if the manifest supports it;
- keyboard opening, switching, and dismissal;
- file picker, camera/gallery options where applicable;
- browser back/forward, refresh, copied deep link, auth expiry;
- screen reader on representative flows;
- reduced motion and dark/light mode where supported;
- poor network and intermittent connectivity.

Record the device/browser/version and result rather than writing only "tested on mobile."

---

## 17. Source guidance adopted by this plan

These are starting references, not a substitute for per-page research:

1. [React Native: Core Components and APIs](https://reactnative.dev/docs/components-and-apis) — native mental models for views, text, pressables, scroll containers, and performant lists.
2. [React Native: Pressable](https://reactnative.dev/docs/Pressable) — immediate press lifecycle and forgiving hit regions.
3. [React Native: Accessibility](https://reactnative.dev/docs/accessibility) — accessibility roles, labels, state, and platform assistive technology.
4. [React Native: Performance Overview](https://reactnative.dev/docs/performance.html) and [Optimizing FlatList Configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration) — frame responsiveness, production profiling, and list tradeoffs.
5. [React Router: Declarative Routing](https://reactrouter.com/start/declarative/routing) — URL-to-UI mapping, nested layouts, dynamic segments, and links.
6. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — reflow, focus, semantics, contrast, input, and target-size requirements.
7. [W3C: Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) — 24 x 24 CSS px AA minimum and exceptions; Ckript intentionally targets 44 x 44.
8. [Apple HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) — 44 x 44 pt hit-region guidance and visible press states.
9. [MDN: CSS `env()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env) — safe-area and user-agent environment variables.
10. [MDN: CSS length/viewport units](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length) — `svh`, `lvh`, and `dvh` behavior under dynamic browser chrome.
11. [MDN: `overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior) — scroll chaining and boundary behavior, including compatibility cautions.
12. [W3C: Understanding Focus Not Obscured (Minimum), SC 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) — adopted 2026-08-05. Sticky/fixed chrome must not entirely hide a focused element; `scroll-padding` is the named sufficient technique and is now applied by `MobileShell`.
13. [W3C ARIA APG: Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — adopted 2026-08-05. Roles/states, roving tabindex (one Tab stop for the whole bar), Left/Right with wrap plus Home/End, activation-follows-focus where panels render without latency, and `tabindex="0"` on a panel with no focusable content. Implemented by `components/tabs/Tabs.jsx`.
14. [W3C: Understanding Status Messages, SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) — adopted 2026-08-05. A result count ("Showing 20 of 64") is a status message and must be announced through role/properties **without** taking focus; the list items themselves are not. Implemented by `components/lists/LoadMore.jsx`.
15. [Inclusive Components: Cards](https://inclusive-components.design/cards/) — adopted 2026-08-05. Why a whole-card block link is wrong (the link's accessible name becomes the entire card, and no second control may live inside it), and the pseudo-content overlay on a heading link that replaces it, with nested controls raised by `position: relative`. Implemented by `Card`/`CardTitle` and reused by `ListRow`.

16. [W3C ARIA APG: Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — adopted 2026-08-05. `role="dialog"` + `aria-modal="true"` + an accessible name; initial focus placed deliberately (**the least destructive option** for a destructive confirmation); Tab and Shift+Tab wrap inside; Escape closes; focus returns to the invoking element unless it no longer exists. Also its warning that `aria-modal="true"` must not be claimed unless interaction outside really is prevented. Implemented by `components/overlays/Overlay.jsx` + `hooks/useFocusTrap.js`.
17. [MDN: the `inert` global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert) — adopted 2026-08-05. An inert subtree fires no clicks, takes no focus, cannot be selected, is skipped by find-in-page, and is **removed from the accessibility tree**. This is how the mobile app hides an overlay's background: the hard half of "modal" stays the platform's job. Widely available since April 2023. Implemented by `hooks/useInertBackground.js`.
18. [MDN: `<dialog>` and `showModal()`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) — read and **deliberately not adopted**, 2026-08-05. `showModal()` renders in the top layer, which is viewport-scoped and escapes `.ckm-root`'s `max-width: 520px` phone frame; at the 768px verification width the app is a 520px column and the dialog would be 768px wide. Reasoning recorded at the top of `Overlay.jsx` so the decision is not silently re-litigated.
19. [W3C ARIA APG: Menu and Menu Button patterns](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) and [Inclusive Components: Menus & Menu Buttons](https://inclusive-components.design/menus-menu-buttons/) — adopted 2026-08-05 **as the reason not to use `role="menu"`**. A true menu brings roving tabindex, arrow-key navigation and Tab-exits-the-menu; that is a desktop application-menu contract, and Inclusive Components' argument is that a list of actions and links should stay plain buttons and links. The mobile "context menu" is therefore `ActionSheet`: a dialog of controls, with `aria-haspopup="dialog"` on the trigger.

20. [W3C ARIA APG: Alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) — adopted 2026-08-05. `role="alert"` is assertive and interrupts whatever a screen reader is currently saying, so it is for urgent information only; an alert must never take focus (use Alert Dialog if the workflow really must stop); an alert already in the DOM at page load is *not* announced, only a dynamically rendered one; and — the sentence this slice is built around — **"avoid designing alerts that disappear automatically"**, because doing so works against SC 2.2.3, while over-using the role works against SC 2.2.4. Implemented by `components/feedback/toastContext.js` (`toastIsAssertive`, `toastPersists`) and `InlineMessage.jsx`.
21. [W3C: Understanding Timing Adjustable, SC 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) — adopted 2026-08-05. A time limit set by content must be turn-off-able, adjustable or extendable, with narrow exceptions (real-time, essential, over 20 hours). Its own worked example is what makes auto-dismissal defensible at all: a new-mail notice may vanish **because the inbox still holds the mail** — "users are able to identify the arrival of email through other means … so the disappearance of the message does not set a time limit on their ability". The converse is the rule this app enforces: where the vanishing surface is the *only* copy, or carries the only affordance to act, it may not vanish.
22. [MDN: `navigator.onLine`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine) — adopted 2026-08-05. The property is "inherently unreliable": each browser and OS decides it by a different heuristic, a machine on a LAN with no upstream link still reports `true`, and a firewall or VPN can make a connected machine report `false`. `false` is the more trustworthy direction. MDN's guidance is to "only provide hints when the user may seem offline" and never to disable functionality on it — which is why `useOnlineStatus` is deliberately asymmetric and the recovery affordance is a retry the user chooses rather than a refetch fired on their behalf.

23. [W3C: Understanding Consistent Navigation, SC 3.2.3](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html) — adopted 2026-08-07. "Navigational mechanisms that are repeated on multiple web pages within a set of web pages occur in the same relative order each time they are repeated, unless a change is initiated by the user," where *same relative order* means "same position relative to other items" and items stay in the same relative order "even if other items are inserted or removed". This is what decides two things about the tab bar: audience-specific tab sets are **fine** (a viewer's audience does not change from page to page, so their bar is the same bar everywhere), while reordering by recency, badge count or usage would **not** be — none of those is a change the user initiated. `mobileNav.js` therefore never sorts, and `mobileNav.test.js` asserts that raising a badge leaves the order untouched.
24. [MDN: `aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) — adopted 2026-08-07. `page` is the value for the current page within a set of pages; the cardinal rule is to "only mark one element in a set of elements as current". `resolveActiveTabKey` returns one key **or null**, so the bar can put `aria-current="page"` on at most one tab, and puts it on none when the URL belongs to no tab — which is most of the app's detail screens. The old bar took the current tab as a prop and every caller passed the constant `"dashboard"`, so it claimed the dashboard was current everywhere it appeared.
25. [Android Developers: Navigation bar (Compose)](https://developer.android.com/develop/ui/compose/components/navigation-bar) — consulted 2026-08-07. A navigation bar is for "three to five destinations of equal importance", at compact window sizes, with destinations consistent across screens. The chosen four-tab sets sit inside that range, and "consistent across app screens" is the same property SC 3.2.3 requires. Labels are optional in Material's API; this app requires them (§8.2), because an unlabelled glyph is a guess.

For every future implementation session, verify that the consulted guidance is still current and record newly adopted sources in the decision log.

> **Honest note on two sources that could not be fetched (2026-08-07):** Material 3's `m3.material.io/components/navigation-bar/guidelines` and Apple's `developer.apple.com/design/human-interface-guidelines/tab-bars` both render their text through client-side script and returned an empty document. They are **not** cited above, because citing a page whose content was never actually read is how a plan acquires confident claims nobody verified. The Android Compose page (source 25) is the server-rendered equivalent that was genuinely read. A future session with a real browser should read the two originals and add them.

---

## 18. Definition of complete

A mobile page is `COMPLETE` only when all applicable statements are true:

- [ ] A distinct mobile JSX component and co-located page CSS file exist.
- [ ] Its route, dynamic parameters, query strings, auth rules, role rules, and direct refresh work.
- [ ] Its unique page prefix is registered and all styles remain scoped below `.ckm`.
- [ ] Desktop functional parity inventory is fully checked or an approved product difference is documented.
- [ ] Real shared services/data replace production mock data.
- [ ] Loading, empty, error, retry, permission, plan/quota, long-content, and destructive states are handled.
- [ ] All child overlays and destination actions have mobile implementations.
- [ ] Browser back/forward, in-app back, focus restoration, and unsaved-change behavior work.
- [ ] No horizontal page scroll or overlap occurs at any required width.
- [ ] Safe areas and the virtual keyboard do not obscure content or actions.
- [ ] Touch targets, pressed states, focus states, semantics, labels, contrast, text zoom, and reduced motion pass.
- [ ] Relevant automated tests pass.
- [ ] Manual browser/device verification evidence is recorded.
- [ ] Production build impact and performance are acceptable.
- [ ] No `desktopOnly()` or migration fallback remains in that page family.
- [ ] Section 19 contains the completion date, files, tests, decisions, remaining follow-ups, and next action.

The entire project is complete only when every ledger row has a final disposition, every non-approved fallback is removed, all route/component coverage tests pass, and Phase 10 is signed off.

---

## 19. Live implementation ledger and decision log

This is the section future agents update continuously. Keep newest session entries at the top. Do not delete history; correct an error with a later note.

### 19.1 Current checkpoint

```yaml
plan_status: IN_PROGRESS
current_phase: 3
current_work_item: "COMPLETE 2026-08-10 (fifth session) — PHASE 3 BULLET 5, 'AI creation/review tools and quota states'. The §4 gate correctly found this was not a new screen: the actions already existed in the create/upload surfaces, while the shared entitlement model underneath them disagreed in four places. One dependency-free rule is now authoritative server-side and parity-tested client-side: every paid enum plan has AI access; free/none does not. Metadata and cover endpoints gained server gates; existing prose, grammar, evaluation and trailer gates use the same helper. AI cover generation now atomically reserves one of 15 plan-period images on subscription.aiImagesGeneratedTotal, returns attempts/remaining/allowance, refuses at 429 without selling an existing subscriber another plan, and conditionally releases a failed reservation without risking a negative counter after a concurrent plan reset. Both native flows expose the remaining count and a disabled pre-tap exhausted state; both clients suppress same-frame double taps. Dead/unreachable AI surfaces are documented, not built. Phase 3 remains IN PROGRESS: bullet 4 is PARTIAL (comments/presence, version history, reports, corkboard and Navigator remain) and bullet 6 is PARTIAL (create-project upload progress and resumable 250 MB uploads remain)."
previous_work_item: "Phase 3 bullet 2, second half (2026-08-09, third session) - mode B, the chrome seam, and the /create-project route promotion."
last_completed_work_item: "Phase 3 bullet 5 - shared AI entitlements and quota states (2026-08-10, fifth session). NEW: client/src/config/aiEntitlements.js + parity test, server/config/aiEntitlements.js + node:test coverage, useAiCover/useAiGeneration hook tests. CHANGED: both create/upload orchestrators and their desktop/native media panels, aiController.js, scriptRoutes.js, both deterministic native harnesses, mobile README and this ledger. One paid-plan rule now governs all AI endpoints and client actions; cover generation reserves a real 15-image plan-period allowance atomically and returns the authoritative remaining count."
next_action: "PHASE 3'S NEXT DEPENDENCY-SAFE SLICE IS DEF-7, upload working-draft protection on BOTH platforms. In client/src/pages/ScriptUpload.jsx, extract/use a per-flow snapshot helper beside lib/workingDraft.js, debounce a local snapshot, add beforeunload + popstate protection, and distinguish a manual Save from a last-resort exit save. Pin refresh, browser-back, terms-link and per-?draft/?edit key behaviour with tests before changing the chrome. Then take DEF-8: stop swallowing ?draft= and ?edit= load failures, especially the dangerous ?edit= case that currently renders an empty form over a live listing and can PUT it. After those shared data-safety defects, resume bullet 4 with keyboard/touch reorder controls in components/screenplay/Corkboard.jsx (DEF-3), then the comments/presence, version-history, reports and Navigator sheets. Bullet 6 remains partial: wire the already-supported MediaSlot progress prop to /create-project and decide a server resumable-upload contract before claiming a 250 MB trailer can resume. Product question still required before expanding scope: whether to port ?ctx=competition and remove /create-project's declared mobile exclusion."
open_follow_ups:
  - "DEF-7 IS THE PHASE'S LARGEST OPEN DEFECT AND IT IS SHARED CODE, NOT A MOBILE GAP. `/upload` has no autosave, no `beforeunload`, no `popstate` interception and no local snapshot; `/create-project` has all four (a 1s debounce, a 3s interval save, `lib/workingDraft.js`, and an exit guard). So on BOTH platforms a writer who fills five panels of the upload flow and then backgrounds the tab, follows the `/script-upload-terms` link in step 5, or rotates the phone, loses everything typed since the last manual Save draft - and DEF-4 measured that Save draft as a 42px control in a bar whose save indicator is `display:none` at <=720px. The mobile screen adds an exit confirmation and keeps the indicator at every width; neither is the fix. `lib/workingDraft.js`'s per-draft snapshot shape would port almost unchanged."
  - "DEF-8: `?draft=` AND `?edit=` FAILURES ARE SWALLOWED ON BOTH PLATFORMS. Both loaders in `pages/ScriptUpload.jsx` end in `catch { /* proceed normally */ }`. For `?edit=abc`, 'proceeding normally' means the writer is shown an EMPTY upload form that will `PUT /scripts/abc` over their published script when submitted. Same class of bug the third session fixed for `loadDraft` in CreateProject, and the fix has the same shape: distinguish 'not found' from 'could not reach the server', and refuse to draw the form over a listing that was never loaded."
  - "A 250 MB TRAILER RETRY IS THE WHOLE FILE. `pendingMediaRecovery` now has a real surface - a chrome notice naming what failed, per-file determinate progress on the Visual assets panel, and a footer primary reading 'Retry the media upload' - but a retry re-sends the entire file. On the phone connection this flow is designed for, a trailer that failed at 90% costs the writer 250 MB twice. Resumable upload is a server-side question (a chunked or multipart endpoint), recorded here rather than hidden inside a client retry that pretends to be cheap."
  - "THE `/upload` MEDIA SLOTS NOW REPORT REAL PROGRESS; `/create-project`'S DO NOT. `postMedia`'s `onUploadProgress` lives in `pages/ScriptUpload.jsx`, and the create-project orchestrator has its own media upload path that still reports nothing at all. The shared `MediaSlot` already accepts the `progress` prop on both routes, so this is a change to one function in `pages/CreateProject/` and no UI work whatsoever."
  - "THE DESKTOP `/upload` PAGE STILL CARRIES DEF-4'S FOUR FLOOR BREACHES. Promoting the route means a phone no longer meets them - but a desktop browser narrowed to 520px still does: `.su-save-state` is `display:none` at <=720px, `.su-detail-tabs button` is `font-size:0` at <=520px, `.su-action-bar button` is 42px wide, and `.su-mobile-phases` is 10.5px text with a 19x19px indicator. Those phone breakpoints are now dead weight for phones and actively wrong for a narrow window. Deleting the three phone media queries outright is a smaller change than fixing them; worth doing before Phase 10."
  - "`MediaSlot`'S UNNAMED-INPUT DEFECT SHIPPED IN THE THIRD SESSION AND WAS ONLY FOUND IN THE FOURTH, WHICH IS THE LESSON RATHER THAN THE BUG. With a file attached the slot drops the `<label for>` that named its input, so the input was a silent focus stop on `/create-project` too. The third session's sweep DID cover the media panel and DID pass - because its fixture had `thumbnailFile: null`, `trailerFile: null`, `pitchVideoFile: null`. A sweep measures the state it rendered, and a fixture that never fills a control never tests the filled control; the same lesson `--ckm-muted` taught. Worth auditing the other Phase 1 fixtures for states they never enter, before Phase 10."
  - "COMPETITION MODE IS EXCLUDED FROM MOBILE /create-project, by declaration rather than by omission. `?ctx=competition` matches `excludeQuery` in the manifest and falls through to the desktop page. The reason: competition mode replaces the entire publish wizard with `components/competition/CompetitionBar` + `CompetitionPitch` and a one-way Submit, and a promoted route without them would leave a competition writer holding the mobile editor with NO way to submit their entry. Porting the two components is small and self-contained; ask the user whether it is wanted before Phase 3 closes."
  - "THE DESKTOP DRAFTS DELETE IS NOT PORTED. `DraftsSheet` offers switch and start-fresh; the desktop `DraftCard` also deletes. A list row on a phone is a much easier mis-tap and the deletion is irreversible, so it wants a confirmation that My projects should own rather than this sheet. Decide where project deletion lives before Phase 4 touches the projects list."
  - "A REFUSED SUBMIT IS NOT KEYBOARD-REACHABLE. `Button` renders a real `disabled` attribute, so the wizard's refused primary is removed from the tab order and its `aria-describedby` is never read. The reason is therefore rendered as VISIBLE text immediately above the footer, in DOM order — which is what actually fixes the desktop defect (a `title` attribute that never appears on touch). If `Button` ever grows an `aria-disabled` mode for refused-but-explained actions, this footer is its first caller."
  - "THE `accessDenied` AND `invitePending` EARLY RETURNS IN `pages/CreateProject/index.jsx` ARE SHARED DESKTOP MARKUP. They return before the context provider, so no injected chrome can reach them; both are a centred `min-h-screen` card (max-w-md, one button) that fits the 520px frame and reads acceptably, but they are Tailwind desktop markup on a mobile route and they do not scroll if they ever overflow. Port them when Phase 5 or the collaboration work next touches this file."
  - "REAL-DEVICE VERIFICATION IS NOW THE EDITOR'S LARGEST UNMEASURED RISK, and it has two parts. (1) The docked bar rides the keyboard through useKeyboardInset; headless Chrome has no virtual keyboard, so 'the dock clears the keyboard' has NOT been measured — only the mechanism (the one Sheet has used since Phase 1) is shared. (2) DEF-5, now sharper: D4's format buttons deliberately blur the editor, and a brand-new script is a placeholder-only CodeMirror document. Whether the Android keyboard survives either is the same class of question. Neither a jsdom suite nor a CDP sweep can answer them."
  - "DEF-6 IS FIXED, and the fix is shared desktop code with no unit test: components/screenplay/screenplayMode.js now binds Escape to blur the editor's contentDOM, releasing the Tab trap that Tab-cycling creates (WCAG 2.1.2). Verified with real dispatched keys through CDP — before, ten Tabs never left .cm-content and each mutated the document; after, Escape then six Tabs walked Elements → Format → Scene → Action → Character → Paren. with a white 2px ring on each. A unit test needs a real EditorView, which no existing screenplay test builds; worth adding when one does."
  - "DEF-3 (live desktop WCAG 2.1.1 failure, not just a mobile gap): components/screenplay/Corkboard.jsx reorders scenes with HTML5 draggable/onDragStart/onDrop only. Touch fires none of those, and there is no keyboard or button path to reorder at all — the card's only other control opens the scene. moveScene(text, from, to) is already pure, so Move up / Move down / Move to position is cheap and fixes both platforms (decision D6, §14)."
  - "`--ckm-muted` IS NOT SAFE FOR TEXT, AND ONLY TWO CALLERS WERE FIXED. Measured 2026-08-09: #8d877e on --ckm-bg is 3.56:1, under WCAG 1.4.3's 4.5:1 for anything that is not large text. `ckm-field__flag--soft` (the 'Optional' flag) and `ckm-field__meta` (the character counter) were moved to --ckm-text-3 (5.62:1). The token itself is still correct for graphical objects, which need only 3:1 — but every OTHER text caller of --ckm-muted across the mobile app is unaudited, because a sweep only measures what the state it rendered happened to contain. Worth one grep-and-measure pass before Phase 10."
  - "NOTHING LINKS TO /new-project ON EITHER PLATFORM. The mobile screen shipped 2026-08-09 and is correct, but the Create entry in layouts/app-shell/navigation/presets/writerNav.js points at /create-project with fresh:true — on desktop AND mobile — so the chooser is only reachable by typing the URL. Same shape as the /offer-holds finding: the preset feeds both platforms, so pointing Create at /new-project changes desktop too, and 'does Create mean open the editor or choose how to start' is a product decision. Ask before changing it."
  - "Desktop copy defect, not fixed: pages/NewProject.jsx claims 'Auto-save every 30 seconds'. The editor debounces a save at 1s and runs an interval save every 3s. The mobile screen says what the code does; the desktop string was left alone rather than edited in a mobile session."
  - "The exit save now REFUSES to send a body over 64 KiB rather than pretending it sent one. That is honest, but it means a long script's last ~3s of edits rely on the local snapshot alone on an OS kill. A real fix needs a server-side compact exit-save endpoint (the payload carries the script text three times because textContent, fountainContent and baseContent are the same Fountain string, and the server writes each independently). Worth doing before Phase 10."
  - "DEF-4: the desktop /upload page's own phone breakpoints breach four of this plan's floors — .su-save-state is display:none at <=720px (the save indicator vanishes on phones), .su-detail-tabs button is font-size:0 at <=520px (sub-step tabs become bare numerals), .su-action-bar button min-width is 42px (under the 44px target), .su-mobile-phases button is 10.5px text with a 19x19px indicator. This is the evidence for decision D8: build a real mobile screen, reuse the vm prop shape, not the CSS."
  - "DEF-5 (RISK, unverified — needs a real Android device): CodeMirror's placeholder extension has a reported Chrome-Android bug where tapping placeholder text does not raise the virtual keyboard. Our editor configures cmPlaceholder(\"INT. LOCATION - DAY\") and a brand-new script is a placeholder-only document, so this would be the first tap of the first session. A jsdom suite and a desktop CDP sweep can both pass while this is broken."
  - "/upload accepts two query parameters the §9 route ledger does not record: ?draft=<id> (convert an editor draft to an upload) and ?edit=<id> (content-only revision, which posts to /collab/:id/revisions instead of /scripts/upload). Both need mobile coverage and a ledger entry."
  - "/offer-holds is deep-linkable but reachable from no navigation. The fix is a `holds` entry in layouts/app-shell/navigation/presets/industryNav.js's drawer, and it MUST land in the same change as a desktop holds screen — that preset feeds the desktop rail too, and on desktop /offer-holds still renders the dashboard."
  - "Holds WRITE actions are live server-side and unbuilt on both platforms (releaseHold, hold/quote, hold/create-order, hold/verify-payment). Destructive and money-adjacent: needs confirmation copy and a refund rule decided before implementation."
  - "components/PrivacySettings.jsx and PrivacySettingsWrapper.jsx have ZERO callers on either platform. Dead code, or an unbuilt feature — decide which before Phase 5 touches profiles."
  - "Desktop defect, not mirrored: pages/Dashboard.jsx filters myScripts to status === 'published' then computes pending/rejected from it, so both status notices are unreachable on desktop. Mobile's behaviour is correct."
  - "Free-writer analytics lock (isAnalyticsLocked, null profileViews) is rendered by NEITHER platform — both coerce null to 0 and show a free writer '0 profile views' where the truth is 'upgrade to see this'. Shared follow-up, §13."
  - "The client test suite is flaky under full-suite concurrency — unrelated files fail on different runs. Re-run before investigating a red result."
active_files: []
known_blockers: []
last_updated: "2026-08-10"
updated_by: "Codex Phase 3 fifth-session completion (shared AI entitlements, atomic plan-period cover quota, and honest native quota states)"
```

### 19.2 Phase status

| Phase | Status | Owner | Started | Completed | Evidence |
|---|---|---|---|---|---|
| 0. Foundation and route safety | COMPLETE | Codex, Claude | 2026-08-05 | 2026-08-05 | Route manifest/policy + 87-route coverage contract, stable preview fixture, shell-mode contract, route suspense/error boundary, expanded tokens, `.ckm` scoping + prefix registry contract, mobile analytics contract. 41 mobile tests in 7 files; full suite 583/585 (2 pre-existing AppShell failures); lint clean on all touched files; build + 53-route prerender pass; five-width CDP verification with a before/after computed-style diff |
| 1. Shared system and chrome | COMPLETE | Claude | 2026-08-05 | 2026-08-07 | **Role-aware chrome (`ckm-appbar`, `ckm-navbar`, `navigation/mobileNav.js`, `hooks/useMobileNav.js`, `--ckm-accent-on-dark`):** 251 mobile tests in 22 files; full suite 792/794 (the same 2 pre-existing `AppShell.render.test.jsx` failures, re-confirmed by stashing this session's changes and watching the identical 2 fail); lint clean on touched files; build + 53-route prerender pass. CDP sweep at 320/360/390/430/768 over all four audiences' bars at every width: 0 undersized targets, 0 text under 11px, 0 unnamed controls, 0 elements past the 520px frame, 0 contrast failures, no horizontal page scroll, 16/16 labels rendered unclipped. Measured rather than assumed: the selected tab is `rgb(221,90,66)` at **5.13:1** on the `rgb(15,15,15)` bar with the glyph's `FILL` axis at **1** against the idle tab's **0** (so the state is not carried by colour alone), the idle label at 19.17:1, both badges at 4.72:1, the search label at 5.21:1; each tab measured 49px tall and 80–128px wide depending on viewport; exactly **1** `aria-current` with the class applied and **0** on a URL belonging to no tab. Real dispatched Tab keys walked 4 stops, one per destination, each showing a `rgb(255,255,255) 2px solid` ring — the shared terracotta ring is invisible on the dark bar, the same override the toast surface needed. Dashboard baseline recaptured at all five widths; the previous images are archived in `baselines/phase0-dashboard/pre-role-aware-chrome/`. State set (`ckm-toast`, `ckm-message`, `ckm-offline`, `ckm-skel` extended, `ckm-empty` reused; `useOnlineStatus`; the live-region exemption in `useInertBackground`): 206 mobile tests in 19 files; full suite 747/749 (the same 2 pre-existing AppShell failures); lint clean on touched files; build + 53-route prerender pass. CDP sweep at 320/360/390/430/768, every check at every width: 10 state surfaces with no target under 44×44, no text under 11px, no unnamed control, nothing past the 520px frame, no horizontal page scroll. The load-bearing evidence is the three things a unit suite cannot reach — (1) with a full-screen dialog open, the app bar / banner / scroll surface all measured `inert` while the toast layer measured live, and a toast raised beforehand was still tappable and still dismissible *from over the dialog*, which is the whole point of the exemption; (2) real `Network.emulateNetworkConditions` offline → `navigator.onLine === false`, the gold banner appearing with `role="status"` at 4.90:1, measured as displacing the scroll body rather than covering it, then the green recovery state with a 78×44 action that cleared on dismiss; (3) real timing in a real browser, since the unit suite stubs framer-motion — an acknowledgement still present at 3.4s and gone by 6.0s, a three-message queue advancing First → Second → error in order, and the error still on screen at t+15s. Also measured: the error toast's icon at 8.66:1 on ink, a white 2px focus ring reached by a real dispatched Tab, and the bottom-nav lift verified on the *dashboard* (standard shell) where the toast clears the tab bar by 23px. Overlay set + focus/scroll helpers (`ckm-overlay`, `ckm-bottom-sheet`, `ckm-dialog`, `ckm-confirm`, `ckm-action-sheet`; `hooks/` scroll lock, focus trap + restoration, inert background, reduced motion, keyboard inset): 179 mobile tests in 18 files; full suite 720/722 (same 2 pre-existing AppShell failures); lint clean on touched files; build + 53-route prerender pass. CDP sweep at 320/360/390/430/768 opening all four surfaces at every width — 22 controls per width, **zero** undersized targets, zero unnamed controls, zero text under 11px, zero overflow past the 520px frame, no horizontal page scroll. The load-bearing evidence is real dispatched keys: 14 forward Tabs and 6 Shift+Tabs per surface per width (400 key events in total) never once landed focus outside the surface; Escape closed the surface, cleared `inert`, released the scroll lock, restored the exact scroll position, and returned focus to the opening control; a destructive confirmation focused **Cancel** at every width; and with a confirm dialog stacked over an action sheet the lower layer measured inert, the upper live, focus inside the upper, and Escape closed only the top. Collection/display family (`ckm-list`, `ckm-row`, `ckm-load-more`, `ckm-card`, `ckm-badge`, `ckm-chip` extended, `ckm-chip-row`, `ckm-segmented`, `ckm-tabbar`): 138 mobile tests in 16 files; full suite 679/681 (same 2 pre-existing AppShell failures); lint clean on touched files; build + 53-route prerender pass; CDP sweep at 320/360/390/430/768 with 37 targets at every width, none under 44×44 (`::after` hit regions measured, not assumed), no text under 11px, no unnamed control, no nested interactive element, no orphan `<li>`, no horizontal page scroll; real-key traversal proved one Tab stop per tab bar, Arrow/Home/End with wrap, the accent focus ring on the focused tab, and the next Tab landing on the panel. Form family (`ckm-field`, `ckm-control`, `ckm-checkbox`, `ckm-radio`, `ckm-switch`, `ckm-file-picker`): 99 mobile tests in 12 files; full suite 640/642; build passes; CDP sweep at 320–768 with 18 controls, none under 16px text or 44px touch, every invalid control's error reachable via `aria-describedby`; virtual-keyboard proxy passes. Action primitives (`ckm-button`, `ckm-icon-button`, `ckm-back`, `ckm-page-header`) + `useMobileBack` + `/__mobile-primitives` harness. 68 mobile tests in 15 files; full suite 610/612 (same 2 pre-existing AppShell failures); lint clean on touched files; build + 53-route prerender pass; CDP sweep at 320/360/375/390/412/430/480/768 with all 32 controls ≥44×44 and no horizontal page scroll |
| 2. Writer navigation/dashboard | COMPLETE | Claude | 2026-08-07 | 2026-08-08 | **ALL SIX BULLETS COMPLETE; exit gate met and verified by grep — zero live `desktopOnly()` call sites remain in `client/src/mobile`.** 2026-08-08 bullet 6: the §4 gate found there is no settings page to port on either platform (no `/settings` route, no settings page; desktop's whole account surface is `UserMenu.jsx`'s four entries plus Log out, which mobile already mirrors with a logout confirmation desktop lacks), and global auth/session already lives outside React and is inherited wholesale. Delivered instead: the `/terms` and `/privacy` alias links fixed to canonical (mobile was paying a redirect hop desktop does not), first-ever test coverage for the account surface, and the logout/cache contract pinned — `AuthContext.logout()` clears `"dashboard:"` and mobile writes `"dashboard:v1:"`, two strings nothing but that test connects. 358 mobile tests in 29 files; full suite 899/901 across three consecutive runs. NOTE for future sessions: this suite is flaky under full-suite concurrency (unrelated files fail on different runs) — re-run before investigating a red result. Prior: 2026-08-08: bullet 4 approved by the user as-is (Dashboard · Projects · Messages · Profile) and now enforced by `mobileNav.test.js` on labels, order, and Create's absence-from-bar/presence-in-rail-and-drawer. Bullet 5's premise was found wrong at the §4 gate — `/ai-tools` and `/offer-holds` are the *identical* `<DashboardRoute />` element as `/dashboard` (`App.jsx:582-583`), have been since `93055d0` (2026-02-25), and are linked from nowhere — so it resolved to: `/ai-tools` a documented dashboard alias, `/offer-holds` a real screen (`ckm-holds`) over `GET /scripts/holds`, a shipped backend that had **no client at all**. It is an INDUSTRY screen: `holdScript` 403s any non-investor/producer/director and `getMyHolds` is holder-scoped, so it returns `[]` for a writer forever. 345 mobile tests in 27 files (was 288/25); full suite 886/888 (same 2 pre-existing AppShell failures, re-confirmed by stashing); lint clean across `src/mobile`; build + 53-route prerender pass. Five-width CDP sweep (320/360/390/430/768) over the real component with the real stylesheets: 0 undersized targets, 0 text under 11px, 0 unnamed controls, 0 overflow, no horizontal scroll, frame never over 520px. The sweep earned its keep twice — it caught a real 2.69:1 contrast failure in this session's own CSS (`ckm-holds__terms-sep`, fixed to 0 failures) and one reported failure that turned out to be the `file://` harness collapsing the app-bar logo, run down rather than waved away. All three payload traps verified on screen: 6 link rows + 1 inert (deleted script), a DB-"active" row 90 days past its `endDate` reading **Lapsed**, and a `convertedToSale` row reading **Bought**. Prior: bullets 1 and 2 complete. 288 mobile tests in 25 files (was 251/22); full suite 829/831 (same 2 pre-existing AppShell failures, re-confirmed by stashing); lint clean; build + 53-route prerender pass. Five-width browser sweep (320/360/390/430/768) with 0 undersized targets, 0 text under 11px, 0 unnamed controls, 0 overflow, no horizontal scroll — on the shipped dashboard and, with the tabs temporarily restored, on Performance/Reviews/Projects and all overlays. Measured rather than assumed: 4/4 probe points on a project card resolve to the title's link while Share stays independently hittable; 14 dispatched Tabs escaped the AI sheet 0 times with the scroll surface and app bar both `inert`; Escape restored focus to `ckm-rev__details` exactly; the logout confirmation is `role="alertdialog"` focused on **Cancel**. The SectionTabs blocker was answered (option B) and implemented the same session — Projects/Reviews are `/dashboard?tab=…` destinations in the writer preset, which also exposed and fixed a NavBar defect marking **two** tabs `aria-current`. Final: full suite 835/837; `?tab=projects`/`?tab=reviews`/`?tab=performance` each verified clean at all five widths. |
| 3. Creation/upload/editor | IN PROGRESS | Claude | 2026-08-08 | — | **2026-08-09 (fourth session) — BULLET 3: `/upload` IS A `SCREEN` ROUTE, WITH BOTH QUERY FORMS.** The §4 gate ran across the four-file, 3,181-line desktop family and produced decisions D10–D14 and three new defects. **D10 was the gate's load-bearing finding, and it reversed the previous session's `next_action`:** checked field by field, ScriptUpload's state cannot honestly feed the create-project panels — five of the ten panels ask different questions (`basics` is format + a PDF-detected page count vs. writer credits + a derived estimate; `access` reads `pdfPageTexts` vs. Fountain pages; `publish` has different presets and exactly ONE required acknowledgement; `upload` has no counterpart), and a synthesised `CreateProjectContext` would answer `writers`, `targetFilm` and `estimatedPages` with fictions. **So what was shared is the component family, not the panel bodies (D12):** `MediaSlot`, `CoverCropDialog` and `PreviewDialog` were promoted into `mobile/components/media/` under a new registered `ckm-media` prefix, their rules lifted out of `Wizard.css`, and the cropper made prop-driven with a four-line create-project adapter — so both routes now render the *same* three surfaces. **Validation is shared, not ported:** `utils/scriptUploadValidation.js` was already platform-neutral, and its per-field `fieldId` is honoured through a `display:contents` anchor plus the control's own `error` prop (D11), with the scroll-and-focus routine — which lives in the desktop workspace `nativeChrome` never mounts — reimplemented in the screen. **The seam is three defaulted props** on `pages/ScriptUpload.jsx` (`Workspace` / `nativeChrome` / `hostClassName`); desktop's call site is unchanged, its three early returns are *gated*, not removed, and a DEV guard shouts if the flag arrives with the desktop workspace. **D14 made upload progress real on BOTH platforms:** `uploadMediaForScript` now reports bytes through axios's `onUploadProgress` (no new dependency — `services/api.js` already exports an axios instance), and the desktop media panel renders it too rather than carrying dead state. **110 new tests** (25 chrome model, 23 screen + chrome states, 38 panels, 5 route seam, 19 shared media); mobile suite **647 in 44 files** (was 537/39); full suite **1230/1232** — the two documented pre-existing `AppShell.render.test.jsx` failures, re-confirmed by stashing every change and watching the identical two fail *by name*. Lint clean on `src/mobile`, `src/pages/ScriptUpload.jsx` and `src/App.jsx`; `ScriptUploadWorkspace.jsx` unchanged at its 4 pre-existing problems, verified by linting the `HEAD` copy of the file. Build + **53-route prerender pass**. **Five-width CDP sweep (320/360/390/430/768) across 22 states — 110 measurements**: **0** targets under 44×44, **0** text under 11px, **0** unnamed controls, **0** contrast failures, **0** overflow, no horizontal scroll on page or surface, frame 320→520px, all ten panels drawn, shell reporting `flow|bottomNav`, the footer never overlapping the body, and the save indicator — the one desktop sets `display:none` at ≤720px (DEF-4) — present at every width. **The sweep earned its keep, and the finding was in code that shipped LAST session:** with a file attached, `MediaSlot` loses the `<label for>` that names its input, so both file inputs became silent focus stops on `/create-project` as well as here. No earlier sweep caught it because no earlier fixture rendered a slot with a file in it — the same 'a sweep only measures what it rendered' lesson the `--ckm-muted` finding taught. Named, re-measured to 0. **Real dispatched keys, not reasoning:** 70 Tabs down step 5 reached the footer at stop 32 with **0** unringed and **0** unnamed stops and the agreement region among them; 20 forward Tabs and 8 Shift+Tabs inside the exit sheet escaped it **0** times; six real PageDowns scrolled the agreement 0→810px while the surface behind it stayed at 1819px, which measures `overscroll-behavior: contain` rather than assuming it; Escape closed the overflow sheet, cleared `inert` and returned focus to "More upload actions". A second finding came out of that walk — a `<video controls>` in an attached media slot is a focus stop with no accessible name — and was named. **The key probe's own first result was wrong and running it down changed the probe:** it reported 14 unnamed inputs on step 5 while the sweep reported zero, because it read only `aria-label` and text content and never resolved `<label for>`; fixed, then 0. **Named as unmeasured rather than implied:** DEF-7 (this flow has no autosave and no unsaved-change guard, on either platform) is recorded, not fixed; `pdf.js` at 320px and the keyboard inset still need a real device. Prior: **2026-08-09 (third session) — MODE B, THE CHROME SEAM, AND THE ROUTE PROMOTION. `/create-project` and `/create-project/:draftId` are `SCREEN` routes.** The wizard (`ckm-create-project`, `flow` + a one-slot override for the sticky footer) draws one panel at a time from the orchestrator's own `detailsSubSteps`; ten panels ported onto the `ckm-field`/`ckm-control`/`ckm-chip` family; six overlays. **The seam is three defaulted props** on `pages/CreateProject/index.jsx` (`Shell`, `nativeChrome`, `hostClassName`) — desktop's call site is unchanged and its rendered DOM is identical; `nativeChrome` suppresses exactly six desktop surfaces, each replaced rather than dropped, and a DEV guard shouts if the flag is passed without a native chrome. **The wizard's one real improvement over desktop**: desktop puts the reason a Submit is refused in a `title` attribute, which never appears on a touch device — here it is visible text with `aria-describedby`, and `describeWizardFooter` is a pure function whose four refusal branches are each pinned by test. **Competition mode is an explicit manifest exclusion** (`excludeQuery`), not a gap: it replaces the whole wizard with a deadline bar and a one-way Submit, and promoting without the exclusion would leave a competition writer unable to submit at all — the policy gained a `search` input to honour it. **`/__mobile-editor` retired** for `/__mobile-create`, which mounts BOTH modes over a fixture: the live route authenticates, fetches drafts and autosaves, so it cannot be measured twice and get the same answer. **115 new tests** (23 chrome model, 31 wizard render, 25 panels, 12 chrome/toast, 4 route seam, 14 ChipSelect, 6 route policy); mobile suite **537 in 39 files** (was 422/33); full suite **1120/1122** — the two documented pre-existing `AppShell.render.test.jsx` failures, re-confirmed by stashing every change and watching the identical two fail by name. Lint clean on `src/mobile`; `src/pages/CreateProject` unchanged at its 12 pre-existing problems, verified by the same stash. Build + **53-route prerender pass**. **Five-width CDP sweep (320/360/390/430/768) across 17 states — 85 measurements**, against the live dev server so the real CodeMirror mounted at every editor width: **0** targets under 44×44, **0** text under 11px, **0** unnamed controls, **0** contrast failures, **0** genuine overflow (142 elements correctly attributed to their scroll container), no horizontal scroll on page or surface, frame 320→520px, shell reporting `immersive|appBar bottomNav` for the editor and `flow|bottomNav` for the wizard, and the chrome never overlapping the body. **The sweep earned its keep twice, and both were real.** (1) `ckm-field__flag--soft` and `ckm-field__meta` were `--ckm-muted` at **3.56:1** — a live WCAG 1.4.3 failure in the *Phase 1* form family that no earlier sweep caught because no earlier state rendered an "Optional" flag or a character counter; moved to `--ckm-text-3` at **5.62:1** and re-measured to zero. (2) `react-easy-crop`'s crop area is `tabIndex=0` with arrow-key handlers but ships **unnamed**, so a keyboard user reached a silent focus stop; named through the library's `cropperProps`. **Two of the sweep's own findings were the audit's bugs and were run down rather than filed:** `.ckm` (the full-viewport surface that centres the 520px frame) was flagged as overflowing the frame it contains, and two inline links in sentences were flagged as undersized targets — WCAG 2.5.8's inline exception covers them explicitly, and the check now encodes it. **Real dispatched keys, not reasoning:** 60 Tabs down the longest panel (step 5) reached the sticky footer at stop 32 with **0** unringed stops and the agreement region among them; 20 forward Tabs and 8 Shift+Tabs inside the exit sheet escaped it **0** times; Escape closed the overflow sheet, cleared `inert` and returned focus to the exact control that opened it. **Named as unmeasured rather than implied:** the keyboard inset and DEF-5 still need a real Android device. Prior: **2026-08-09 (later) — the screenplay editor surface (mode A), and a keyboard trap fixed for both platforms.** `mobile/screens/create/` — `Editor.jsx`, `EditorDock.jsx`, `editorChrome.js`, `Editor.css` (`ckm-editor`, registered) — mounts the **real** `ScreenplayEditor` (D1) under one docked Elements/Format bar (D3/D4) with an overflow action sheet (D5), a native exit-as-draft flow and the recovery notice. **The route was deliberately NOT promoted**: `/create-project` carries mode B too (≈1,100 lines of desktop wizard), and a promoted route whose "Continue to details" lands on desktop form markup is what §2.2 forbids — so mode B and the promotion land together, and the editor is verified meanwhile at the dev route `/__mobile-editor`. **D2's mechanism did not exist and D2 was slightly wrong:** `MobileShell` gained a real per-slot override (`resolveShellSlots` / `changedShellSlots` / `assertShellSlotOverride`, a closed `MOBILE_SHELL_SLOTS`, and `data-shell-slots` in the DOM so an exception is visible), and the honest override is `immersive` + **both** slots forced back on, not `flow` + two no-ops. **DEF-6, found by the sweep's Tab leg and fixed in shared code:** `screenplayMode.js` bound `Tab` to element cycling with no escape — ten real dispatched Tabs never left `.cm-content` and **each mutated the document**, so a keyboard or switch user who entered the script could not leave and the dock (which follows the editor in DOM order) was unreachable. A live **WCAG 2.1.2** failure on desktop too. `Escape` now blurs `contentDOM`; verified with real keys — after the fix six Tabs walked Elements → Format → Scene → Action → Character → Paren., each with a `rgb(255,255,255) 2px` ring. **43 new tests** (15 dock, 28 editor) plus **11** on the slot contract; mobile suite **422 in 33 files**; `screenplay` + `mobile` together **519 passing**; full suite **1005/1007** (the two documented pre-existing `AppShell.render.test.jsx` failures, by name); lint clean on `src/mobile`, `screenplayMode.js` and `App.jsx`; build + **53-route prerender pass**. **Five-width CDP sweep (320/360/390/430/768) across six states** — default, recovery, error, exit-confirm, read-only, prose — 30 measurements, run against the **live dev server** rather than a static harness, so the real CodeMirror was mounted at every screenplay width (asserted). Every width, every state: **0** targets under 44×44 (`::after` hit regions measured through `getComputedStyle`, not assumed), **0** text under 11px, **0** unnamed controls, **0** contrast failures, no horizontal scroll on page or surface, frame 320→520px, `data-shell-slots="appBar bottomNav"`, and **the dock never overlapping the script** — the property the whole shell-slot decision exists to guarantee. **The sweep's first result was wrong and running it down changed the check:** 8 "overflowing" elements at every width turned out to be the element chips inside `overflow-x: auto` — content past the frame is *what makes it a scroller*. The audit now attributes overflow to the nearest scroll container and asserts the *track* stays in frame; genuine overflow then measured 0 everywhere. **Named as unmeasured rather than implied:** the keyboard inset (headless Chrome has no virtual keyboard) and DEF-5 both need a real device. Prior: **2026-08-09 — bullet 2, first half: the save/resume core (both platforms) and the mobile `/new-project` screen.** Two defects the spike measured are now fixed rather than recorded. **DEF-1:** `lib/keepaliveSave.js` measures the exit-save body against MDN's 64 KiB keepalive cap and refuses to send one that will not fit, instead of advancing `lastDraftSignatureRef` on a request the browser silently discards. The crossing point is now computed by the suite from a 1,219-byte realistic page rather than quoted: **page 13 untrimmed, page 17 after dropping the derived page texts**, and a 100-page feature encodes to **510,233 bytes — 7.8× the cap**. **DEF-2:** `lib/workingDraft.js` gives every draft its own snapshot key, so `/create-project/:draftId` finally has a local fallback; the snapshot also records `step` **and** the Details sub-panel, and carries the server `updatedAt` this session loaded from so `chooseDraftRecovery` can tell "my edits never reached the server" (restore) from "a co-writer saved while I was gone" (ask, never clobber). Found and fixed in my own wiring before it shipped: with the snapshot effect no longer skipping `:draftId`, it ran on the *empty initial state* and cleared the snapshot microseconds before recovery could read it — the guard, and the effect-ordering it depends on, are both commented in place. Also delivered: an offline/failed `loadDraft` now offers the local snapshot instead of showing an empty editor over a draft that has content. Mobile `/new-project` (`ckm-new-project`, `flow` shell) promoted out of `DESKTOP_MIGRATION_FALLBACK`. **410 tests in 31 mobile+lib files** (was 358/29): 42 new unit tests across the two lib modules, 10 on the screen. Full suite **951/953** — the same 2 pre-existing `AppShell.render.test.jsx` failures, re-confirmed by stashing every change and watching the identical 2 fail. Lint clean on all touched files (`index.jsx`'s 4 pre-existing problems verified unchanged by the same stash). Build + 53-route prerender pass. Five-width CDP sweep (320/360/390/430/768) over the real component with the real stylesheets, driven through the DevTools Protocol directly (the Chrome extension was unavailable; Node 22's global `WebSocket` was the client): 0 undersized targets, 0 text under 11px, 0 unnamed controls, 0 overflow past the frame, no horizontal scroll on page or surface, frame 320→520px. **The sweep earned its keep twice.** It caught a real 2.69:1 contrast failure in this session's own CSS — the card chevron on `--ckm-muted-2` — fixed to `--ckm-muted` at **3.56:1**, clearing WCAG 1.4.11's 3:1 floor for a graphical object, and re-measured to 0 failures at every width. And it reported one overflow at 320px that was run down rather than waved away: the harness was measuring the *un-ligatured icon text* (`chevron_right`, ~206px wide) on a cold font cache. Proven, not assumed — awaiting `document.fonts.ready` cleared it, and re-running the widths in reverse order with no font wait moved the artifact off 320px entirely. Prior: bullet 1 (research spike) COMPLETE. §4 gate run across all five routes at once — ~11,300 lines of desktop source plus the server controllers. Deliverables in §19.3: full §4.1 inventory per route, §4.2 research with six primary/product sources, seven §4.2 answers, five §4.3 text wireframes, nine decisions, five defects/risks. Load-bearing finding: `components/screenplay/` is 4,579 lines of which only 2 files are desktop UI, and `ScreenplayEditor.jsx` is a controlled CodeMirror 6 host with a props interface and a 10-method imperative `apiRef` — mobile mounts the same component and rebuilds only chrome. DEF-1 measured rather than asserted: the `fetch(keepalive)` exit-save carries the script text three times against MDN's 64 KiB cap, so it silently drops beyond ~9–16 pages at realistic page density (bounded to ≤3 s of edits by the interval autosave, which is uncapped). DEF-3 is a live desktop WCAG 2.1.1 failure — corkboard reorder is HTML5-drag-only with no keyboard or button path. Two items await the user: the `/script/:id/pay` phase move and approval of a low-fidelity editor wireframe |
| 4. Discovery/project consumption | NOT STARTED | — | — | — | — |
| 5. Profiles/network/messages | NOT STARTED | — | — | — | — |
| 6. Challenges/hall of fame | NOT STARTED | — | — | — | — |
| 7. Industry/reader | NOT STARTED | — | — | — | — |
| 8. Public/auth/onboarding/legal | NOT STARTED | — | — | — | — |
| 9. Admin/finance | NOT STARTED | — | — | — | — |
| 10. Hardening/release | NOT STARTED | — | — | — | — |

### 19.3 Session log template

#### 2026-08-10 — Codex — Phase 3 bullet 5: shared AI entitlements and quota states

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint:** The §4 gate and three product decisions had already been recorded, and an interrupted working tree contained the first entitlement implementation: every paid plan unlocks AI, AI covers receive a real allowance of 15 per plan period, and dead AI surfaces are documented rather than built or deleted. The slice was still unverified and the ledger still called bullet 5 not started.

**Work item claimed:** Finish, harden and verify Phase 3 bullet 5 across the server, desktop orchestrators and both native create/upload surfaces.

**Research performed**
- Sources inspected: `User.subscription` schema; every payment/admin/competition/manual grant reset path; auth payloads; all seven exported AI controller actions and their route registrations; both create/upload orchestrators, desktop panels, native panels and deterministic harnesses.
- Comparable interaction patterns: not applicable — the gate established that this is a shared entitlement/quota state, not a route or new mobile workflow.
- Decisions adopted: the server is authoritative; client/server dependency-free mirrors are pinned by parity tests; free-plan refusal is 403 + `requiresUpgrade`; an exhausted paid allowance is 429 + `quotaExhausted` and never offers an upgrade; an image is reserved atomically before upstream spend and returned after upstream failure; every visible count is the server's plan-period count.
- Patterns rejected and why: per-script React attempt state (resets on reload and was never enforced); read-then-increment quota checks (two concurrent taps can both pass); one generic 403 for both locks (sells a current subscriber a plan they already hold); a new `/ai-tools` screen (the route remains the documented Dashboard alias and no distinct product exists behind it).

**Desktop parity inventory**
- Desktop files inspected: `pages/CreateProject/index.jsx`, `hooks/useAiCover.js`, `hooks/useAiGeneration.js`, `steps/Step2Details.jsx`, `pages/ScriptUpload.jsx`, and `components/script-upload/ScriptUploadWorkspace.jsx`.
- Data/services/hooks: `client/src/config/aiEntitlements.js` mirrors `server/config/aiEntitlements.js`; the server module is authoritative and a cross-tree parity test fails on drift. `useAiCover` owns the authoritative count on create; ScriptUpload retains its existing view-model seam.
- Roles/permissions/quotas: `free`/`none`/missing are locked; `pro`, `enterprise`, `silver`, `gold` and `diamond` are allowed. Cover allowance is 15 per plan period on `subscription.aiImagesGeneratedTotal`, which all current purchase/grant paths reset to zero.
- Routes/query/navigation: unchanged. Server enforcement now covers `/ai/generate-metadata` and `/scripts/generate-ai-cover`; the existing prose, grammar, score and trailer handlers use the same rule. A duplicate unreachable `/scripts/generate-ai-cover` registration was removed.
- Page states and child overlays: free-plan tap → persistent pricing action; quota exhausted → visible disabled state plus no-upgrade toast if stale client state still taps; generating → pending/disabled; server failure → ordinary error; successful cover → remaining count replaced by the response.

**Wireframe/design decision**
- Shell/top bar/scroll hierarchy/footer/bottom navigation/back/keyboard/safe-area: unchanged; this slice changes states inside the existing Media panels.
- Primary/secondary actions: the secondary AI cover card becomes visibly disabled and says `AI cover limit reached` / `No AI covers left this plan period` at zero. A paying writer is not sent to Pricing for spent quota.
- Overlays: the existing pricing modal remains the free-plan action; no quota overlay was added.
- Long text/localization: the two-line quota card wraps inside the existing shared `MediaSlot` and was measured at every required width.

**Changes made**
- Files added: `client/src/config/aiEntitlements.js`, `client/src/config/aiEntitlements.parity.test.js`, `client/src/pages/CreateProject/hooks/useAiCover.test.jsx`, `client/src/pages/CreateProject/hooks/useAiGeneration.test.jsx`, `server/config/aiEntitlements.js`, `server/utils/aiEntitlements.test.js`.
- Files modified: both create/upload orchestrators and their desktop/native media panels/tests/harnesses; `client/src/components/PricingModal.jsx`; `server/controllers/aiController.js`; `server/routes/scriptRoutes.js`; `server/models/User.js` (legacy-field documentation only); mobile README; this ledger.
- Shared logic extracted: plan normalization/access, remaining-image calculation, machine-readable lock/quota response bodies, and client error classification. The server cover handler atomically reserves the counter with `findOneAndUpdate`; a failure release is conditional on the counter still being positive so a concurrent plan reset cannot create `-1`.
- Route/prefix registration: no mobile route or CSS prefix changed; existing `ckm-media` owns the state.
- Dead code record: `components/AiWritingAssistant.jsx` has no caller; `scriptController.generateAiCover` is orphaned after removing the duplicate route; `User.aiThumbnailUsage` is an unused legacy per-title counter; the AI trailer UI/endpoints are not part of either shipped creation flow. Per the user's decision, none was revived or broadly deleted. The Pricing modal's free tier no longer advertises AI metadata that the server correctly refuses.

**Verification**
- Automated: focused entitlement/hook/native/desktop panel suite 6 files / 103 tests (including 34 direct entitlement/hook tests); full client suite 1,266/1,268 with only the two long-recorded `AppShell.render.test.jsx` expectations for removed `.ck-mobile-nav`; full server suite 109/109. ESLint clean on the new entitlement modules/tests, both hooks, `ScriptUpload.jsx`, PricingModal, the touched native panels/harnesses/tests, and the changed server files. The existing unrelated lint debt in `CreateProject/index.jsx` and `ScriptUploadWorkspace.jsx` remains outside the changed lines. `npm run build` passed (4,035 modules) with 53 SEO routes prerendered and verified; only existing large-chunk warnings.
- Viewports/devices/browsers: headless Chrome/CDP on the deterministic `?state=quota` create and upload media panels at 320, 360, 375, 390, 412, 430, 480 and 768 px — 16 measurements. Every state reported `flow`; the phone frame was 320→520 px; page and shell-surface overflow were 0; the quota control was 254–454 × 104 px; no rendered text was below 11 px. The raw target probe reported only the shared component's intentionally 1×1 visually-hidden file inputs, each named and backed by its full-card label/Replace control; there were zero undersized visible action targets.
- Accessibility: the exhausted reason is visible before interaction rather than hidden in a disabled control's tooltip; free-plan and quota refusals are semantically distinct; same-frame double taps are coalesced; no new live region or focus movement was introduced.
- Performance: no dependency and no new request. Client gating avoids known refusals, while the server remains authoritative. Atomic reservation prevents paid upstream work beyond the allowance.

**Decisions or deviations**
- Decision: bullet 5 is COMPLETE without a new screen.
- Reason: every live AI action already sits in the correct create/upload panel; the missing product was a coherent entitlement and quota contract.
- Decision: retain the historical deny-list behavior for future enum plans (unknown non-empty plan values receive access), parity-tested on both sides.
- Reason: a newly sold plan should not silently lose AI until two mirrors are manually updated; the schema still constrains persisted values today.
- User approval, if required: the three load-bearing product decisions were explicitly recorded at the starting checkpoint.

**Open issues/blockers**
- No blocker for bullet 5. The quota reservation behavior is unit/parity tested and build-verified, but not integration-tested against a disposable MongoDB instance; concurrency safety follows the single atomic update used in production.
- Plan expiry semantics remain the repository's existing plan-string convention; this slice did not introduce a separate subscription-expiry policy.
- Phase 3 remains open for bullet 4, bullet 6, DEF-7 and DEF-8 as listed in `next_action`.

**Exact next action**
- Implement DEF-7 in `pages/ScriptUpload.jsx`: per-flow local working snapshots plus `beforeunload`/`popstate` protection for `/upload`, `?draft=` and `?edit=`, with refresh/back/terms-link tests; then fix DEF-8's swallowed loaders before returning to the editor sheets.

---

#### 2026-08-09 (fourth session) — Claude (Claude Code) — Phase 3 bullet 3: the §4 gate for `/upload`, and the mobile upload screen

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint verified before claiming (§20.4).** Branch `feat/mobile-role-aware-chrome` at `122dba7`. The previous session's work is present in the working tree and uncommitted; it was left exactly as found, along with the user's own `client/public/sitemap.xml` edit and the six untracked design files. The previous entry's claims were checked rather than trusted: `mobileRouteManifest.js` does hold `/create-project` and `/create-project/:draftId` as `SCREEN` with the `excludeQuery` competition exclusion, `mobile/screens/create/` does hold the wizard's six files plus `panels/` and `overlays/`, `pages/CreateProject/index.jsx` does carry the three defaulted seam props, and `/upload` is still `migration("upload", "/upload")` on manifest line 224.

---

##### §4.1 — Functional inventory of the `/upload` route family

Four files, 3,181 lines, plus two shared utilities that turn out to be the most important thing in the inventory.

| File | Lines | What it is |
|---|---|---|
| `pages/ScriptUpload.jsx` | 2,389 | The orchestrator. All state, all API calls, the `workspaceVm` assembly, and a portal-rendered Tailwind thumbnail cropper |
| `components/script-upload/ScriptUploadWorkspace.jsx` | 834 | The whole desktop UI: three-column workspace (tracker rail / form column / helper rail), ten panels, toast, action bar |
| `components/script-upload/ScriptUploadWorkspace.css` | 492 | Its stylesheet — the one carrying DEF-4's four floor breaches |
| `components/script-upload/ScriptUploadSuccess.jsx` + `.css` | 147 | The post-submit surface |
| `utils/scriptUploadValidation.js` | 258 | **Platform-neutral.** Ten screens, per-field issues, server-error routing |
| `constants/scriptUploadTerms.js` | 47 | The agreement text and its version |

**Ten screens, in one linear order** (`UPLOAD_SCREEN_ORDER`): `upload` → `basics` → `story` → `cast` → `progress` → `access` → `media` → `classify` → `film` → `publish`. Steps 1–5 with step 2 ("Details") holding six sub-screens — the same two-level shape `/create-project` has, and the same shape the mobile wizard already draws.

**API surface, and what each call's failure looks like:**

| Call | When | Failure shape |
|---|---|---|
| `GET /scripts/script-limit` | mount, once | swallowed to `null`; the plan gate then never appears |
| `POST /scripts/extract-pdf` (multipart) | file chosen | `setError(...)`; the file is discarded and the picker returns to empty |
| `GET /scripts/:id` | `?draft=` or `?edit=` | **swallowed entirely** — `catch {}` with a `// proceed normally` comment |
| `POST /ai/generate-metadata` | logline / synopsis / roles | `setError`, plus a `usedFallback` "AI is busy" branch |
| `POST /scripts/generate-ai-cover` | cover generation | toast; 3 attempts per script, plan-gated |
| `POST /scripts/draft` | Save draft | `setError` |
| `POST /scripts/upload` | Publish | routed through `resolveUploadServerIssue` to a field |
| `PUT /scripts/:id` | `?edit=` publish | same, plus a `revisionSubmitted` branch |
| `POST /collab/:id/revisions` | content-only edit | navigates away on success |
| `POST /scripts/:id/upload-{thumbnail,trailer,pitch-video}` | after the metadata call | `Promise.allSettled`; failures become `pendingMediaRecovery` |

**Roles, gates and limits.** `["creator","writer"]` only — anything else gets a centred red "Access Denied" card. `scriptLimit.limitReached` blocks a *new* upload but never an edit (`creationBlocked = limitReached && !scriptId && !editId`). AI cover is free-plan-locked and capped at 3. Pitch video is locked for `free` and `silver`. Ceilings: script 30 MB, thumbnail 5 MB, trailer 250 MB, pitch video 90 MB **and** 90 seconds.

**Query parameters — both undocumented in §9 before today.** `?draft=<id>` loads a draft written by the editor and converts it to an upload (sets `scriptId`, so submit carries it and the server updates rather than creating). `?edit=<id>` loads a published script; if the loaded script reports `isCollaborator && canEditMetadata === false` it becomes **content-only edit mode**, a genuinely different screen — step is pinned to 1, the tracker, helper rail and sub-steps are all suppressed, the body is one textarea, and Submit posts to `/collab/:id/revisions` with `baseContent`/`content`/`sectionRef` instead of `/scripts/upload`. `?edit=` also has an `editApprovalLocked` state (a script already in `pending_approval` with `approvalRequestType === "edit_submission"`), which refuses submit.

**Touch-hostile behaviour found (beyond DEF-4's four measured floor breaches):**

1. **The dropzone is a `<div role="button">` with `onDrop`/`onDragOver`.** Drag-and-drop does not exist on a touch screen. The div *is* keyboard-operable (Enter/Space), so this is not a WCAG failure — it is half a control's affordance that means nothing on a phone.
2. **The three-column workspace.** A 158px tracker rail on the left and a helper rail on the right, both of which exist to show information the phone has to carry some other way.
3. **The cropper is a portal-rendered Tailwind modal** with a hand-rolled focus trap, a `45vh` cropper box, and two `<input type="range">` controls in a 2-column grid.
4. **`su-save-state` is `display:none` at ≤720px** — the "Draft saved" / "Changes submit for review" indicator vanishes on every phone, which is DEF-4's most consequential breach: a writer on a phone cannot tell whether the draft saved.
5. **The validation focus routine reaches for `document.getElementById(issue.fieldId)`** and then `scrollIntoView`. That is the mechanism that has to survive the port, and it is the reason the mobile controls adopt the same ids (see D11).

---

##### §4.2 — Research, and the seven answers

Sources retrieved this session (content actually read, not recalled):

- MDN, [`<input type="file">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file) — `accept` is a **hint, not validation**; `accept="image/*"` is what makes a phone offer the camera; `capture` selects which camera; the input must be hidden with `opacity: 0` rather than `display:none` so it stays reachable by assistive tech, with a styled `<label>` as the visible target; `change` fires even when the same file is re-picked, and `cancel` is the event for a dismissed picker.
- W3C, [Understanding SC 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) — a progress bar for an upload is named explicitly as a status message; `role="status"` for state and success, `role="alert"` for errors, and **the message must not take focus**.
- The repository itself, as a primary source for two questions no external document can answer: `utils/scriptUploadValidation.js` (the shared contract), and `axios@1.13.5` (`onUploadProgress` is available on the instance `services/api.js` already exports, so real per-file progress needs no new dependency).

Two further fetches — Material 3 progress indicators and Apple HIG progress indicators — **returned no page content**, only the title. They are named here as *attempted and unretrieved* rather than cited from memory, because §4.2 forbids inventing claims about a source that was not inspected.

**1. Screen, sheet, or flow?** A **multi-step flow**, exactly as `/create-project` steps 2–5 already are — same two-level stepper, same footer, same shell mode. Not a dialog: it is entered from a chooser, it is resumable, and it has its own URL.

**2. App bar / body / sticky action / tabs / overflow?** App bar: the project title as `h1`, the position line, the save state (which desktop hides on phones), Exit and an overflow. Body: one panel. Sticky: Back + Next/Publish, in a slot that **displaces** the form. No bottom tabs — this is a flow. Overflow: Save draft, My projects, and (when the flow was entered from a draft) Back to the script.

**3. What becomes progressive disclosure?** The tracker rail and the helper rail both collapse into the app bar's one position line plus a progress fill — the same collapse `describeWizardPosition` already performs, and for the same measured reason (five labels and four connectors do not survive 320px). The 4,000-word agreement stays a focusable scroll region. The buyer preview becomes a summoned dialog rather than an embedded PDF viewer.

**4. Back, cancellation, unsaved changes, keyboard, interrupted uploads?** Back walks the flow; Exit leaves it. Unsaved work is protected by an explicit **Save draft** rather than an autosave — and this is the sharpest difference from `/create-project`, which autosaves every 3s. `/upload` has no autosave at all, on either platform, so "leave and resume" here means "tap Save draft first", and the screen has to say so. Interrupted media upload is already modelled by `pendingMediaRecovery`; on desktop it is a sentence in a toast, which is D9's target.

**5. Pagination / virtualisation?** None. The longest lists are the chip pools (48 genres, 36 tones, 40 themes, 34 settings) which the wizard already renders as `ChipSelect` at 320px without overflow, and the roles list, which is writer-authored and small.

**6. Which actions need which states?** File choose → *extracting* (indeterminate, because `POST /scripts/extract-pdf` reports no progress) → *ready* / *failed*. Media upload → determinate per file (D9). Save draft, Publish, AI generate → pending. Everything destructive here is reversible (remove a cover, replace a file) except Publish, which is a one-way submit to admin review.

**7. What should a screen reader announce?** Panel changes are a route-like move, so the panel heading is the landmark. The save state is `role="status"`; validation errors are `role="alert"` and must not steal focus (4.1.3) — but the *navigation* to the offending panel does move focus, deliberately, because that is a user-initiated response to pressing Next.

---

##### §4.3 — Text wireframe

```text
Route and page name       /upload — "Upload a script" (mobile)
                          + ?draft=<id> (convert an editor draft)
                          + ?edit=<id>  (update a published script)
                          + ?edit=<id> where the loader reports
                            isCollaborator && canEditMetadata === false
                            → CONTENT-ONLY mode, a different screen

Audience and permissions  Writer/creator only. Non-writers get a real mobile
                          refusal, not the desktop Tailwind card.
                          creationBlocked (plan limit) blocks a NEW upload and
                          never an edit.

Top app bar               [Exit ×] [title + "Step n of 5 · Label · Panel"]
                          [save state] [⋮]
                          + a progress fill under the bar
                          + notices below it, in fixed chrome: plan limit,
                            extraction warning, validation error, media recovery

Primary scroll hierarchy  ONE panel at a time, drawn from the shared
                          UPLOAD_SCREEN_ORDER. Panel head (h2 + blurb), then
                          the fields, on the ckm form family.

Primary / secondary       Footer slot: [Back] [Next] — [Publish for review] on
                          step 5. Save draft lives in the overflow, not the
                          footer: three actions in a 320px bar is how the
                          desktop footer ended up with a 42px control.

Bottom navigation         None. flow shell + a one-slot footer override.

Overlays                  Cover cropper (full-screen dialog), buyer preview
                          (full-screen dialog), overflow sheet, exit
                          confirmation, success screen.

Loading / empty / error   Boot: skeleton while ?edit= resolves.
                          Empty: the file picker IS the empty state of step 1.
                          Error: per-field message + a chrome-level alert;
                          Next refuses and names the reason as visible text.
                          Success: a full mobile screen, not a redirect.

Keyboard and safe-area    Inherited: the footer is a shell slot, so it
                          displaces rather than covers; useKeyboardInset is the
                          shell's, unchanged.

Back-navigation           Footer Back walks panels; app-bar Exit leaves, with a
                          confirmation that offers Save draft first — because
                          this flow does not autosave.

Long text / i18n          Titles clamp to two lines; the agreement is a
                          focusable region; chip pools wrap rather than scroll.

Desktop→mobile decisions  D8 (already taken): real mobile screen, reuse the vm
                          prop shape, do NOT adopt the CSS.
                          D10–D14 below.
```

---

##### Decisions D10–D14

- **D10 — The panels are NOT the create-project panels, and the reason is measured rather than assumed.** `next_action` asked whether `mobile/screens/create/panels/` could be fed by ScriptUpload's state. Checked field by field: `story`, `cast`, `progress`, `classify` and `film` are near-identical (same keys, same setters, same `handleGenerateMetadata` signature), but `basics` is a different question entirely (upload asks format + an auto-detected page count; create asks writer credits + company + a derived page estimate), `access` reads a different preview source (`pdfPageTexts` from a real PDF vs. Fountain-derived pages), `publish` has different price presets and a different legal gate (**one** acknowledgement, not two — `scriptUploadValidation.js` documents at length why adding the second one once made the flow impossible to finish), and `upload` has no counterpart at all. Feeding those panels through a synthesised `CreateProjectContext` would mean a context that answers `writers`, `targetFilm` and `estimatedPages` with fictions, and would silently re-point `/upload` every time someone edits a create-project panel. **So the shared thing is the component family, not the panel bodies** — which is what the Phase 1 form family is for.
- **D11 — The shared validation contract is honoured two ways, and neither touches a Phase 1 component.** `validateUploadScreen` returns `{ screen, step, detailStep, fieldId, message, label, code }`, where `fieldId` is a DOM id. The *message* becomes the control's `error` prop, so the Phase 1 `Field` wires `aria-invalid` and `aria-describedby` for free; the *id* goes on a `display: contents` wrapper around that control, so `document.getElementById(fieldId)` finds it. **Wrapping rather than pinning the id onto the control was the second attempt and is the right one:** pinning would silently break the `<label for>` association `Field` generates with `useId()`, which is a worse bug than the one it solves. A second mobile→field lookup table was the third option and was rejected — it is a copy of a mapping that already exists, and the copies would disagree the first time a field was renamed. *(Revised during implementation; the first draft of this decision proposed adding a `controlId` prop to `Field`, which the wrapper made unnecessary.)*
  - **The scroll-and-focus routine had to be rebuilt, and that is the part that is easy to miss.** `focusValidationIssue` in the orchestrator only moves `step`/`detailStep` and bumps `validationAttempt`; the actual `scrollIntoView` and focus live in `ScriptUploadWorkspace`'s own effect, which `nativeChrome` never mounts. Without a mobile equivalent, pressing Publish over a missing logline would jump to step 2 panel 2 and then leave the writer to find the problem. `Upload.jsx` carries it, keyed on `validationAttempt` rather than the errors array so that pressing Publish twice over the *same* unfixed field moves focus twice.
- **D12 — Three components are promoted out of `screens/create/` into `mobile/components/media/` under a new registered `ckm-media` prefix.** `MediaSlot` (already fully prop-driven), `PreviewDialog` (already fully prop-driven) and `CoverCropDialog` (context-bound, becoming prop-driven with a thin create-project adapter). This is the honest half of the reuse `next_action` asked for: these three are genuinely the same component on both routes, and copying them would be the second port the ledger warned against. Their rules move out of `Wizard.css` into `components/media/Media.css`.
- **D13 — Save draft is in the overflow sheet, not the footer.** Desktop's action bar carries Back, a save-state string, Save draft and Next, and at ≤520px that is what produced DEF-4's 42px control. The footer keeps the two controls that move the flow; the one that does not is one tap away. The exit confirmation offers Save draft as its primary, so the destructive path (leaving with unsaved work) always passes through it.
- **D14 — Media upload progress becomes real, and it is shared code.** `uploadMediaForScript` currently fires three `api.post` calls into `Promise.allSettled` with no progress at all; the only progress bar on the page is `handleFileSelect`'s **simulated** one (a `setInterval` that adds 10% every 200ms and stops at 90%). A 250 MB trailer on a phone is exactly the case Apple's ">2 seconds needs feedback" rule exists for. `axios@1.13.5`'s `onUploadProgress` needs no new dependency, and putting it in the shared function means desktop gets it too.

---

##### Defects and risks found by this gate

- **DEF-7 (live, both platforms, silent data loss on a slow network): `/upload` has no autosave and no unsaved-change guard.** `pages/CreateProject` debounces a save at 1s, runs an interval save every 3s, snapshots to `localStorage`, and intercepts `popstate` to confirm an exit. `/upload` does none of it: there is no `beforeunload`, no `popstate` interception, and no local snapshot. A writer who fills in five panels and then backgrounds the tab, follows the "Script Upload Terms" link in step 5, or turns the phone, loses everything typed since the last manual **Save draft** — and Save draft is a control DEF-4 measured as being 42px wide at ≤520px in a bar whose save-state indicator is `display:none`. The mobile screen adds the exit confirmation (D13); the *guard* is shared work and is recorded here rather than smuggled in.
- **DEF-8 (live, both platforms): `?draft=` and `?edit=` failures are swallowed.** Both loaders end in `catch { /* proceed normally */ }`. "Proceed normally" for `?edit=abc` means the writer is shown an **empty upload form** that will `PUT /scripts/abc` over their published script when submitted. The same class of bug the previous session fixed for `loadDraft` in `CreateProject` (offline load now offers the local snapshot instead of showing an empty editor over a draft that has content) — and the fix has the same shape.
- **DEF-9 (mobile-only, and the reason step 1 is not just a `FilePicker`): the progress bar on step 1 is a lie.** `handleFileSelect` starts a `setInterval` that advances 10% every 200ms, caps at 90%, and jumps to 100% when `POST /scripts/extract-pdf` resolves — so it reports "80%" for a request whose real progress is unknown, and on a slow phone connection it sits at 90% for as long as the upload actually takes. WCAG 4.1.3 names a progress bar as a status message; this one states something untrue. The mobile screen renders an **indeterminate** busy state for extraction instead, and keeps determinate bars for the media uploads, where D14 makes the number real.
- **RISK — the third-party PDF viewer.** `ScreenplayPdfViewer` mounts `pdf.js` inside the desktop access panel. The mobile access panel routes the preview through the same summoned `PreviewDialog` the wizard uses, so the viewer is mounted at most once and only when asked for; whether `pdf.js` renders acceptably at 320px is a real-device question a jsdom suite cannot answer, and is named here rather than implied.

---

##### What was built

**The seam is three defaulted props, and desktop's DOM is unchanged.** `pages/ScriptUpload.jsx` gained `Workspace` (defaulting to `ScriptUploadWorkspace`), `nativeChrome` and `hostClassName`. `nativeChrome` changes exactly four things, and each is *replaced* rather than dropped: the three early returns — access refused, an `?edit=` load still resolving, the post-submit screen — become view-model flags, and the portal-rendered Tailwind cropper with its hand-rolled focus trap is not rendered because the native chrome mounts the shared one. The early returns are **gated, not removed**, which is asserted by reading the file rather than by trusting a comment. The toast needs no flag at all: `ScriptUploadWorkspace` is what draws it, so replacing the workspace replaces the toast, and `useUploadToasts` forwards `toastMessage` to the app-wide layer so nothing is swallowed. A DEV guard shouts if `nativeChrome` arrives paired with the desktop workspace, because that pairing removes four surfaces on a promise the desktop workspace does not keep.

**Ten panels, one registry, keyed by the shared resolver.** `panels/UploadPanels.jsx` is keyed by `getUploadScreenKey(step, detailStep)` — the same function `validateUploadScreen` and `focusValidationIssue` use — so neither platform can disagree about what step 2, panel 4 is. A test asserts the registry covers `UPLOAD_SCREEN_ORDER` exactly.

**The one real improvement over the desktop page, and it is not cosmetic.** `.su-save-state` is `display: none` at ≤720px, so on every phone the desktop page hides the only thing that says whether the work is safe — on a flow that, unlike `/create-project`, has no autosave at all. Here it is in the app bar with `role="status"`, at every width, and the sweep measured it there.

**Three things were shared rather than ported a second time (D12).** `MediaSlot`, `CoverCropDialog` and `PreviewDialog` moved into `mobile/components/media/` under a new registered `ckm-media` prefix, with 228 lines of rules lifted out of `Wizard.css`. `CoverCropDialog` was context-bound and is now prop-driven, with a four-line create-project adapter; the aspect, the blob work, the quality step-down and the 5 MB ceiling all stay in `useThumbnailEditor` and `lib/imageCrop`, so a cover cropped on either route is byte-identical.

**Progress is honest on both platforms now (D14).** `uploadMediaForScript` reports real bytes through axios's `onUploadProgress` — no new dependency, since `services/api.js` already exports an axios instance — and the desktop media panel renders it too, so the shared state is not dead there. Where the number cannot be known it is not invented: `event.total` absent leaves the bar where it is, and step 1's extraction is an indeterminate busy state rather than desktop's 10%-per-200ms fiction (DEF-9).

---

##### Verification

**110 new tests**; mobile suite **647 in 44 files** (was 537/39); full suite **1230/1232** — the two documented pre-existing `AppShell.render.test.jsx` failures, re-confirmed by stashing every change and watching the identical two fail *by name*. Lint clean on `src/mobile`, `src/pages/ScriptUpload.jsx` and `src/App.jsx`; `ScriptUploadWorkspace.jsx` verified unchanged at its 4 pre-existing problems by linting the `HEAD` copy of the file. Build + **53-route prerender pass**.

**Five-width CDP sweep (320/360/390/430/768) across 22 states — 110 measurements.** Every width, every state: **0** targets under 44×44 (`::after` hit regions measured through `getComputedStyle`, not assumed), **0** text under 11px, **0** unnamed controls, **0** contrast failures, **0** genuine overflow, no horizontal scroll on page or surface, frame 320→520px, all ten panels drawn, shell reporting `flow|bottomNav`, the footer never overlapping the body, and the save indicator present at every width.

**The sweep earned its keep, and the finding was in code that shipped last session.** With a file attached, `MediaSlot` drops the `<label for>` that names its input — the card shows the asset and a Replace button that clicks the input from JS — so both file inputs were silent focus stops on `/create-project` as well as here. The third session's sweep *did* cover the media panel and *did* pass, because its fixture had `thumbnailFile: null`. A sweep measures the state it rendered. Named, re-measured to zero.

**Real dispatched keys, not reasoning.** 70 Tabs down step 5 — the longest panel, carrying the price, nine term controls, the agreement and two acknowledgements — reached the sticky footer at stop **32** with **0** unringed and **0** unnamed stops, the agreement region among them. 20 forward Tabs and 8 Shift+Tabs inside the exit sheet escaped it **0** times. Six real PageDowns scrolled the agreement from 0 to 810px while the surface behind it stayed at 1819px, which *measures* `overscroll-behavior: contain` rather than assuming it. Escape closed the overflow sheet, cleared `inert`, and returned focus to the exact control that opened it. That walk produced a second finding — a `<video controls>` in an attached media slot is a focus stop with no accessible name — which was named rather than filed.

**The key probe's own first result was wrong, and running it down changed the probe.** It reported 14 unnamed inputs on step 5 while the sweep reported zero on the same markup. The probe read only `aria-label` and text content and never resolved `<label for>`, which is how every `ckm-field` control is named; the sweep had always resolved it. Fixed, then 0 — the audit's bug, not the markup's.

**Named as unmeasured rather than implied.** DEF-7 is recorded, not fixed: this flow has no autosave and no unsaved-change guard on either platform, and the mobile exit confirmation is a mitigation. `pdf.js` at 320px and the keyboard inset still need a real device.

---

#### 2026-08-09 (third session) — Claude (Claude Code) — Phase 3 bullet 2 COMPLETE: mode B, the chrome seam, and the route promotion

**Requested continuation:** "continue in native app implemenation".

**Starting checkpoint verified before claiming (§20.4).** Branch `feat/mobile-role-aware-chrome` at `122dba7`; the working tree's only pending changes were the user's own `client/public/sitemap.xml` edit and six untracked design files, all preserved untouched. The previous entry's claims were checked rather than trusted: `mobileRouteManifest.js` did still hold `/create-project` and `/create-project/:draftId` as `DESKTOP_MIGRATION_FALLBACK`, `mobile/screens/create/` did hold only the editor's four files, and `pages/CreateProject/index.jsx` did still hardcode `<CreateProjectShell>`.

---

##### The seam, and why it is three props rather than a fork

`pages/CreateProject/index.jsx` is 2,500 lines of state — autosave, the draft signature, the 64 KiB-aware keepalive exit save, the working-draft snapshot, `chooseDraftRecovery`, collaborator locks, plan gates, per-panel validation, `handlePublish` — and every line of it is platform-neutral. What is not neutral is `CreateProjectShell`, a three-pane desktop workspace whose footer carries word counts, zoom buttons and a prose toggle that mean nothing on four of its five steps.

So the chrome is injected: `Shell`, `nativeChrome`, `hostClassName`, all defaulted so App.jsx's `<CreateProject />` renders exactly what it rendered before.

- **`nativeChrome` suppresses exactly six surfaces**, and each is *replaced*, not dropped: the exit confirmation (→ `ExitFlow`), the drafts drawer (→ `DraftsSheet`), the toast (→ the app-wide `ToastProvider`, bridged by `useCreateProjectToasts`), the under-review acknowledgement (→ `SubmittedDialog`), the thumbnail cropper (→ `CoverCropDialog`) and the title-page configurator (→ `TitlePageDialog`). Nothing else is conditional: the grammar undo bar and focus mode have no mobile caller and can never open there, and suppressing them would be dead code pretending to be a decision. `VersionHistoryModal` is deliberately left alone for the same reason.
- **The step body is `null` under `nativeChrome`, not ignored JSX.** With `null`, a chrome that forgets to render its own bodies renders nothing and the omission is obvious. With an ignored child, it silently keeps working until someone edits a desktop step and wonders why mobile did not change.
- **`hostClassName` is not cosmetic.** `.ckm-shell` is `height: 100%`, the orchestrator's outermost div sits between it and `.ckm-root`, and at the desktop default that div has no height of its own — the entire screen collapses to the height of its content. The mobile class stays on the mobile side of the seam.
- **A DEV guard shouts** if `nativeChrome` arrives with the desktop shell. That pairing removes six surfaces on the promise that something else renders them; paired wrongly the promise is false and the failure is silent — a writer taps Exit and nothing happens.

`saveTitlePage` was hoisted out of the desktop modal's JSX into the context for one reason worth stating: an all-blank set of title-page fields must become `null` (no title page), not an empty one, and two chromes deciding that separately is how one of them starts exporting a blank sheet.

---

##### What mode B is

`Wizard.jsx` + `wizardChrome.js` + `Wizard.css` (`ckm-create-project`, registered), ten panels in `panels/`, six overlays in `overlays/`.

- **Three navigators became one.** Desktop draws a 158px step rail, a second horizontal stepper for narrow screens, and a footer pager. On a phone the position lives in the app bar — "Step 3 of 5 · Classify", and inside Details "· Basics" too, because a writer three panels deep who only sees "Step 2 of 5" has no way to tell how much of step 2 is left. Nothing that told the writer where they are was dropped; three things saying the same thing were collapsed into one.
- **The footer is a shell slot, not a fixed bar.** `flow` forbids bottom chrome, so `WIZARD_SHELL_SLOTS` turns exactly one slot back on — the second use of the mechanism the editor added, and one slot rather than two because `flow` already allows the app bar and overriding that would be a no-op dressed as a decision. The point is displacement: a `position: fixed` footer of our own would sit on top of the last field of every panel, which on a phone is usually the field being typed into.
- **Exit and Back are different controls now.** The §4.3 wireframe listed "Back" in both the app bar and the footer. Two controls in one screen that both say Back and do different things is an ambiguity, so the bar's control is Exit (the same action the browser's back gesture triggers through the orchestrator's popstate guard) and the footer's Back walks the flow. Recorded here as a correction to the wireframe.
- **The panels are ports of content, not of markup.** Every hand-rolled pill row became `ChipSelect` — a new form-family member with `role="group"` + `aria-pressed`, matching `TagSelect`'s semantics exactly so the two platforms describe the same control the same way. Two panels changed shape because their desktop shape was wrong at 320px rather than merely large: the writer-credit row (six controls in a line) became a card per credit with named reorder actions, and the Access panel's inline preview — up to eight CodeMirror instances inside a scrolling form — became a summoned full-screen dialog.
- **The one deliberate behavioural fix.** Desktop puts the reason a Submit is refused in a `title` attribute. There is no hover on a phone, so a mobile writer met a greyed-out "Submit for approval" with no way at all to find out what was missing. `describeWizardFooter` returns a `blockedReason` string; it renders as visible text above the footer and is referenced by `aria-describedby`. Its four branches — no publishing access, the plan limit, unaccepted terms, unconfirmed ownership — are pinned by test, including the order they resolve in, because "you cannot publish this at all" and "tick this box" are different answers and offering the tickable one first sends the writer to do something that will not help.

---

##### The promotion, and the one thing that is not promoted with it

`/create-project` and `/create-project/:draftId` are `SCREEN`. Both patterns mount one component: the orchestrator reads `:draftId` through `useParams`, so there is nothing for the route to hand over.

**Competition mode is excluded by declaration.** `?ctx=competition` replaces the entire publish wizard with `CompetitionBar` + `CompetitionPitch` and a one-way Submit, and neither is ported. Shipping the promotion without an exclusion would have left a competition writer holding the mobile editor with **no way to submit their entry at all** — worse than the desktop page, not merely different from it. So `mobileRoutePolicy` gained a `search` input and the manifest gained `excludeQuery`, which makes the limitation greppable from the file that is supposed to answer "what does mobile cover?" rather than hidden in a component.

**`/__mobile-editor` is retired**, as the checkpoint asked — but the *reason a harness exists* did not retire with the URL. The live route authenticates, fetches drafts, autosaves and opens a collaboration socket, so it renders a different screen on every run. `/__mobile-create` mounts both modes over a deterministic fixture and is navigable by URL (`?step=`, `?panel=`, `?state=`) rather than needing to be clicked into a state.

---

##### Verification

**115 new tests.** Mobile suite **537 in 39 files** (was 422/33). Full suite **1120/1122** — the two documented pre-existing `AppShell.render.test.jsx` failures, re-confirmed by stashing every change and watching the identical two fail by name. Lint clean on `src/mobile`; `src/pages/CreateProject` unchanged at its 12 pre-existing problems, verified by the same stash. Build + **53-route prerender pass**; `CreateProjectChrome` code-splits into its own 48.8 kB chunk.

**Five-width CDP sweep at 320/360/390/430/768 across 17 states — 85 measurements**, against the live dev server rather than a static harness, so the real component with the real CSS and the real CodeMirror was measured (asserted at all five widths for the editor states). At every width in every state: **0** targets under 44×44 (`::after` hit regions measured through `getComputedStyle`), **0** text under 11px, **0** unnamed controls, **0** contrast failures, **0** genuine overflow, no horizontal scroll on page or surface, frame 320→520px, `data-shell-mode`/`data-shell-slots` reporting `immersive|appBar bottomNav` and `flow|bottomNav`, and the chrome never overlapping the body.

**The sweep found two real defects, and neither was in this session's own layout.**

1. **`ckm-field__flag--soft` and `ckm-field__meta` measured 3.56:1** — `--ckm-muted` on `--ckm-bg`, at 11–12px, against WCAG 1.4.3's 4.5:1. That is a live failure in the **Phase 1** form family, shipped since Phase 1 and never caught because no earlier sweep rendered an "Optional" flag or a character counter. Fixed to `--ckm-text-3` at **5.62:1** and re-measured to zero. The token is still right for the graphical objects it was chosen for (3:1, SC 1.4.11); it was never safe for text. Every other text caller of `--ckm-muted` is now a recorded follow-up.
2. **`react-easy-crop`'s crop area is `tabIndex=0` with arrow-key handlers and ships unnamed** — a keyboard or switch user reaches a focus stop that announces nothing. Named through the library's supported `cropperProps` spread.

**Two of the sweep's own findings were the audit's bugs, and running them down changed the checks rather than the CSS.** `.ckm` — the `position: fixed; inset: 0` surface that *centres* the 520px frame — was flagged for overflowing the frame it contains; the check now skips the frame's own ancestors. And two inline links inside sentences were flagged as undersized targets; WCAG 2.5.8's inline exception covers text "constrained by the line-height of non-target text" explicitly, so the check now encodes the exception instead of the links being waved through.

**Real dispatched keys.** 60 Tabs down the longest panel (step 5, 28 distinct stops) reached the sticky footer at stop 32 with **0** unringed stops, the scrollable agreement region among them — that region is `tabIndex={0}` with a role and a name precisely because a 4,000-word scroll container that cannot be focused cannot be scrolled by a keyboard at all (WCAG 2.1.1). Inside the exit sheet, 20 forward Tabs and 8 Shift+Tabs escaped **0** times. Escape closed the overflow sheet, cleared `inert`, and returned focus to the exact control that opened it.

**A third finding was the keyboard probe's bug**, not the CSS's: it first reported 43 of 60 stops unringed. `Chip.css` draws the focus ring on the *pill wrapper* and sets `outline: none` on the inner button — it says so in a comment — so reading only the focused element was measuring the wrong box. Walking up to the nearest ringed ancestor gave 0.

**Not verified here, and named rather than implied:** the keyboard inset (headless Chrome has no virtual keyboard) and DEF-5 both still need a real Android device. The cropper's pinch gesture is the library's and is untested on touch hardware for the same reason.

---

#### 2026-08-09 (later) — Claude (Claude Code) — Phase 3, the screenplay editor surface (mode A)

**Requested continuation:** "continue in native app implemention".

**Starting checkpoint verified before claiming (§20.4).** Branch `feat/mobile-role-aware-chrome` at `e522298`; the working tree's only pending changes are the user's own `client/public/sitemap.xml` edit and six untracked design files, all preserved untouched. The previous entry's claims were checked rather than trusted: `mobileRouteManifest.js` did still hold `/create-project`, `/create-project/:draftId` and `/upload` as `DESKTOP_MIGRATION_FALLBACK`, `MobileShell.jsx` had no slot-override mechanism at all, and `ckm-editor` was allocated in §7.2 with no code-side entry.

---

##### The scope decision, made before any code, and why the route did NOT get promoted

The checkpoint's `next_action` asks for "the mobile `/create-project` and `/create-project/:draftId` screens". That route carries **two** surfaces — the editor (mode A) and the publish wizard, steps 2–5 (mode B) — and mode B is `Step2Details` (693 lines), `Step3Classify`, `Step4FilmInfo` and `Step5Publish` (243 lines): roughly 1,100 lines of desktop form JSX to port, on top of the editor.

Promoting the route needs **both**, because there is no route-level fallback below a route. A promoted `/create-project` with an unported wizard would render desktop Tailwind form markup inside the mobile frame the instant a writer taps "Continue to details" — which is exactly the thing §2.2 names: *"Desktop markup must not become the mobile page through CSS hiding or wholesale responsive reflow."*

So the work was split at the honest seam: **mode A is built, verified and documented; the manifest entry stays `DESKTOP_MIGRATION_FALLBACK`; mode B and the promotion land together.** Nothing regressed for a mobile writer — `/create-project` behaves today exactly as it did yesterday — and the next session inherits a finished editor rather than two half-finished surfaces.

The cost of that choice is that the editor has no production URL, which would normally make it unverifiable. `/__mobile-editor` is the answer to that, not a decoration: see Verification.

---

##### D2 needed a mechanism that did not exist, and D2 was slightly wrong

`mobileShellModes.js` has said since Phase 0 that "a screen may override an individual slot on `<MobileShell>`… so the override is always a visible decision". Nothing implemented it. `MobileShell` read `getShellModeConfig(mode)` and that was the end of it.

Added: `resolveShellSlots(mode, overrides)`, `changedShellSlots(mode, overrides)`, `assertShellSlotOverride(overrides, screenId)` and a closed `MOBILE_SHELL_SLOTS` list, with a `slots` prop on `MobileShell`. Four properties are pinned by test rather than by comment:

- an override can only change **slots**, never a mode's `intent` — the sentence that says what the mode is for is not a screen's to rewrite;
- non-booleans and unknown keys are ignored, and in development an unknown key **logs loudly**, because silently ignoring `appbar` (lower-case b) leaves a screen with chrome it believes it disabled;
- the shell publishes `data-shell-slots="appBar bottomNav"` — only the slots that actually **differ** from the mode — so "why does an immersive screen have bars?" is answerable from the DOM, exactly as `data-shell-mode` answers "which mode is this?";
- `MOBILE_SHELL_SLOTS` is asserted to cover every boolean key a mode config declares, so a fifth slot added to the contract cannot quietly become un-overridable.

**And a correction to D2 as written.** D2 says the manifest entry stays `flow` and step 1 "overrides the app-bar and bottom-nav slots to become immersive". Under `flow` the app bar is *already* allowed and the bottom nav *already* forbidden — that override would have been a no-op. The honest expression is the reverse: mode `immersive`, with **both** slots forced back on, because immersive's default is no chrome at all and the editor has two bars it must keep. `EDITOR_SHELL_MODE` and `EDITOR_SHELL_SLOTS` are exported together for that reason, and the correction is recorded in `editorChrome.js` where the next reader of D2 will hit it.

Why the bars belong in the shell's slots rather than being hand-rolled: the slots are `flex: none` siblings of the one scroll surface, so the docked bar **displaces** the script instead of covering it. A `position: fixed` bar of our own would sit on top of the line being typed — the single failure this surface exists to avoid. The sweep measures it (`dockOverlapsScript: false` at every width, in every state).

---

##### What was built

`mobile/screens/create/` — `editorChrome.js` (the chrome as data), `EditorDock.jsx`, `Editor.jsx`, `Editor.css` (`ckm-editor`), and two test files.

- **D1 — the engine is not forked.** `Editor.jsx` mounts `components/screenplay/ScreenplayEditor` with the same props the desktop `Step1Write` passes, and drives it through the same 10-method `apiRef`. It is chrome over shared state: it reads `CreateProjectContext`, the same context `CreateProjectShell` reads, so autosave, the draft signature, the keepalive exit save, the working-draft snapshot and `chooseDraftRecovery` are all the code that shipped this morning. **That is why "save/resume" needed no new mobile persistence** — only a surface that shows the writer what the shared code decided.
- **D3/D4 — one docked bar.** `EditorDock` is a single row: an Elements/Format switch, then a horizontally scrolling track. One bar, not two, per the approved wireframe's frame B — two rows cost ~110px of the ~260px of script that survives the keyboard. The rarer elements go to a `ckm-action-sheet` rather than crowding the row. The Format controls are ordinary buttons: D4's point is that the desktop pill's `onMouseDown` + `preventDefault()` has nothing to preserve on touch, so the editor holds the range across the blur and the API applies to whatever `getSelection()` reports.
- **The switch is `aria-pressed`, not an APG tablist.** The tablist contract brings roving tabindex and arrow-key navigation — a desktop keyboard model that replaces behaviour a phone user already has (Tab moves on) with behaviour they have to discover. Same argument `ActionSheet` made in Phase 1.
- **Case buttons carry no `aria-pressed`.** "UPPERCASE" transforms text; there is no state of *being* uppercase, and `aria-pressed="false"` would tell a screen reader there is. Bold/Italic/Underline/Centre do carry it, from the editor's reported emphasis state.
- **D5 — the overflow.** An action sheet, and **items that are not built are absent, never present-and-inert**: a menu entry that does nothing is the placeholder dead end §2.8 forbids. Built: Import (behind the same `enforceGoldPlan` gate desktop uses), Export (handing off to a second sheet of four formats), the prose/screenplay toggle, and Continue to details. Absent by capability rather than by omission: no publish step for a competition entry (it is written, submitted and judged, never published) and none for a content-only collaborator.
- **Unsaved-change protection is a sheet, not a two-button confirm.** Three outcomes, one of which destroys work: "Discard" and "Keep editing" must not be adjacent same-shaped buttons. The destructive item does not act — it opens a `ckm-confirm` `alertdialog` focused on Cancel, which is `ActionSheet`'s documented contract for exactly this case.
- **Notices live in the fixed chrome**, under the bar rather than in the scroll body. A plan limit or a failed save that scrolls out of sight is a message the writer never sees again. A test asserts they are in the app-bar slot and *not* in the scroll surface.

`buildEditorOverflowItems` returns **descriptors only** — which items exist and what each says — and the screen attaches handlers by `id`. That split arrived as a lint fix (`react-hooks/refs` flagged a ref reaching a function called during render) and stayed because it is the better shape: the capability rules are now a pure function a test can read without stubbing four handlers.

---

##### DEF-6 — a keyboard trap, found by dispatched keys, fixed in shared code

The Tab-traversal leg of the sweep found something a unit suite and a screenshot would both have passed:

**`components/screenplay/screenplayMode.js:376` binds `Tab` to element cycling with no escape.** Ten real dispatched Tab keys against the real editor never once left `.cm-content` — and each one *mutated the document*, prefixing the current line (`@`, `(`, `>`, `.`) as it cycled the element type. A keyboard, switch or screen-reader user who enters the script cannot leave it. That is **WCAG 2.1.2 (No Keyboard Trap), a live failure on both platforms**, and on mobile it is worse than on desktop: the dock follows the editor in DOM order, so the entire toolbar was unreachable.

Fixed at the source, in shared code: `Escape` blurs the editor's `contentDOM`. That is CodeMirror's documented answer for editors that capture Tab, and it fixes desktop in the same change. `blur()` rather than a focus-move, because where focus goes next is the platform's decision; after the blur the next Tab resumes the document's own order.

Verified with real keys, not reasoning: after `Escape`, six Tabs walked **Elements → Format → Scene → Action → Character → Paren.**, each with a `rgb(255, 255, 255) 2px` focus ring. Before the fix, the same six Tabs never left the editor.

---

##### Verification

**43 new tests** in `screens/create/` (15 dock, 28 editor) plus **11** on the shell-slot contract. **Mobile suite 422 tests in 33 files**, was 410 in 31 (that earlier figure counted `pages/CreateProject/lib`). `src/components/screenplay` + `src/mobile` together: **519 passing**. Full suite **1005/1007** — the two failures are the documented pre-existing `AppShell.render.test.jsx` ones, by name. Lint clean across `src/mobile`, `screenplayMode.js` and `App.jsx`.

**Five-width CDP sweep at 320/360/390/430/768, across six states** (default, recovery, error, exit-confirm, read-only, prose) — 30 measurements. The Chrome extension was again unavailable, so the sweep drove headless Chrome through the DevTools Protocol with Node 22's global `WebSocket`; no browser-automation dependency was added. Unlike the previous session's static harness, this ran against the **live dev server**, so the thing measured was the real component with the real CSS and the **real CodeMirror** (`editorMounted: true` asserted at every screenplay width).

At every width, in every state: **0** targets under 44×44 (`::after` hit regions measured through `getComputedStyle(el, "::after")`, not assumed — the 36px chips and tabs pass on their grown region), **0** text under 11px, **0** unnamed controls, **0** contrast failures, no horizontal scroll on the page or the scroll surface, the frame 320 → 520px, `data-shell-slots="appBar bottomNav"`, and the dock never overlapping the script.

**The sweep's first result was wrong, and running it down changed the check.** It reported 8 elements past the frame at every width — the element chips. They are inside `.ckm-editor__dock-track`, which is `overflow-x: auto`: content extending past the frame is *what makes it a scroller*. Flagging it was the audit's bug, not the CSS's. The check now attributes overflow to the nearest scroll container and asserts **the track itself** stays inside the frame, which is the property that actually matters; genuine overflow then measured **0** everywhere, with 11–17 elements correctly classified as scroller content.

**Not verified here, and named rather than implied:**

- **The keyboard inset.** `useKeyboardInset` pads the dock by what the virtual keyboard covers, and headless Chrome has no virtual keyboard. The mechanism is the one `Sheet` has used since Phase 1, but "the dock rides the keyboard" is a real-device claim and is not being made on this evidence.
- **DEF-5 is still open** and is now more pointed: the first tap of a brand-new script lands on a placeholder-only CodeMirror document, and D4's format buttons deliberately blur the editor. Whether the Android keyboard survives that blur is the same class of question. Both need a real device before the editor is called complete.
- Prose (book) mode renders in the harness with no TipTap instance, so its editor body is empty there. The branch, and the dock's absence in it, are covered by test.

---

##### What this session did NOT do

No mode B. No route promotion. No change to `pages/CreateProject/index.jsx` — the chrome seam that will let the orchestrator render mobile chrome (a `Shell`-style injection point, plus suppressing the desktop exit-confirm and drafts drawer when a native chrome owns them) is designed but deliberately unwritten, because writing it without the wizard it has to serve would be guessing at its shape. No sheets for Navigator, Corkboard, Comments, People, Reports, Outline notes, Title page or Version history — those are §11 bullet 4 and are listed in `editorChrome.js` as the items that get appended.

#### 2026-08-09 — Claude (Claude Code) — Phase 3 bullet 2, first half (save/resume core, `/new-project`, editor wireframe approved)

**Requested continuation:** "continue in native app implementaiotn".

**Starting checkpoint verified before claiming (§20.4).** `git status` clean of mobile changes (the pending work is the user's own `client/public/sitemap.xml` edit, six untracked design files, and the previous session's uncommitted `NATIVE_APP_IMPLEMENTATION.md` — all preserved untouched); branch `feat/mobile-role-aware-chrome` at `aef9f11`. The previous entry's claims were checked rather than trusted: `mobileRouteManifest.js` did still hold all five creation routes as `DESKTOP_MIGRATION_FALLBACK`, and `index.jsx:958-959` did still return early on `draftId`.

**Work item claimed:** §11 Phase 3 bullet 2. **Delivered in full: the save/resume core and `/new-project`. Not delivered: the mobile `/create-project` screens**, which the newly-approved wireframe unblocks for the next session. The bullet is marked `[~]`, not `[x]`.

---

##### Why the save/resume core came before any screen

Bullet 2 names three things — new/draft routes, save/resume, unsaved-change protection — and two of the three are **not mobile problems**. DEF-1 and DEF-2 are defects in shared code that ship to desktop today. Building a mobile editor on top of a save path that silently discards long scripts would have meant building the mobile experience of a bug.

So the order was: fix the persistence, then put a screen on it.

##### DEF-1 — the exit save now refuses rather than pretends

`queueKeepaliveDraftSave` posted the draft with `keepalive: true`. MDN caps those bodies at 64 KiB, the rejection arrives *after* `fetch()` returns, `.catch(() => {})` swallowed it, and `lastDraftSignatureRef` was advanced anyway — so the client believed it had saved, and `beforeunload` warned the writer their changes might be lost and then failed to save them.

`lib/keepaliveSave.js` drops the derived `scriptPreviewPageTexts` (the server only writes fields that are not `undefined`, so omitting it is safe by the server's own contract), **measures** the encoded body, and returns no body at all when it will not fit. The caller then does not advance the signature, and `beforeunload` still warns — which is now true rather than decorative.

The measurement is computed by the suite rather than quoted. Against a **1,219-byte realistic page**, the untrimmed payload crosses 64 KiB at **page 13**; trimmed, at **page 17**; a 100-page feature encodes to **510,233 bytes**, 7.8× the cap. The test asserts the crossing point falls in the 9–16 range the spike recorded, and a separate test asserts the page fixture itself stays between 1,200 and 2,000 bytes — otherwise every number above is decoration.

**This is a mitigation, not a cure**, and it is recorded as such: a real fix needs a server-side compact exit-save, because the payload carries the same Fountain string three times (`textContent`, `fountainContent`, `baseContent`) and the server writes each independently.

##### DEF-2 — resumed drafts get a snapshot, and it records *where* the writer was

`lib/workingDraft.js` owns the storage key now (`LOCAL_WORKING_DRAFT_KEY` was deleted from `constants.js` — two copies of a storage key is how a safety net stops matching what it catches). Per-draft keys, with the historical bare key kept for brand-new scripts so nobody mid-script loses a snapshot to a rename. `pruneWorkingDrafts` exists because per-draft keys multiply.

Two things beyond the literal defect:

- **The snapshot records `step` AND `detailsStep`.** D7 asks resume to land on the panel the writer left, and Details is a mini-wizard of up to six sub-panels.
- **Restoring is a decision, not a reflex.** `chooseDraftRecovery` is pure and separately tested. It compares the snapshot's `baseUpdatedAt` — the server version *this session started from* — against the server's current `updatedAt`. Same version → the snapshot is strictly ahead, restore it. Moved on → a co-writer or another device saved in between, so it **asks** (a notice in the shell's banner slot with *Restore my changes* / *Keep the saved version*) rather than overwriting someone's work. Deliberately compares identities, not timestamps: a device with a wrong clock still decides correctly, and there is a test for exactly that.

##### A bug I introduced and caught before it shipped

Removing the `draftId` early-return from the snapshot effect had a consequence I did not anticipate: on a resumed draft the effect now ran against the **empty initial state** — before `loadDraft` had returned — hit its "no content" branch, and called `clearLocalWorkingDraft()`, destroying the snapshot microseconds before recovery could read it. The fix is a guard on the hydration flag, and it depends on effect declaration order (recovery is declared above the writer, so it flips the flag first on the commit where the editor appears). Both the guard and the ordering it relies on are commented in place, because the next person to reorder those effects needs to know.

##### One improvement the defects implied

A `loadDraft` that fails for any reason other than 403/404/pending-invite now offers the local snapshot instead of rendering an empty editor over a draft that has content. On a phone that failure is usually "offline", and an empty editor is how a writer concludes their work is gone.

---

##### `/new-project` — the cheapest screen in the phase, and an honest finding about it

Built to the §19.3 wireframe: `flow` shell, two stacked cards, three affordances each, whole card tappable with the link's accessible name kept to the title alone.

**`startFresh` is the reason this screen has tests at all.** `/create-project` reads `location.state.startFresh` as an entry mode — it resets the wizard and drops the local working draft. Lose it and "New project" silently reopens whatever the writer last wrote, which reads as data corruption rather than a missing field. It travels on a real `<Link state=…>` (a new `state` prop on `CardTitle`) rather than an `onClick` + `navigate`, so long-press and open-in-new-tab survive; a test asserts it arrives, and a second asserts it is *not* sent to `/upload`, which has no such mode.

**The finding: nothing links to `/new-project` on either platform.** The Create entry in `writerNav.js` points at `/create-project` with `fresh: true` — desktop and mobile alike — so the chooser is reachable only by typing the URL. It is deep-linkable and listed in `seo/seoRoutes.js`, so building it was right; pointing Create at it is a product decision that would change desktop too, and it is recorded as a follow-up rather than made unilaterally. Same shape as the `/offer-holds` finding, and handled the same way.

**One copy correction, deliberate.** Desktop's card claims "Auto-save every 30 seconds"; the editor debounces at 1s and runs an interval save every 3s. The mobile copy says what the code does. The desktop string was left alone — editing it is not a mobile session's call — and recorded.

---

##### Verification

**410 tests across the touched areas** (was 358): 42 new unit tests over the two lib modules, 10 over the screen. Full suite **951/953**, the same 2 pre-existing `AppShell.render.test.jsx` failures — re-confirmed by stashing every change in `client/src` and watching the identical 2 fail. Lint clean on every touched file; `index.jsx`'s 4 pre-existing problems verified byte-identical by the same stash. Build + 53-route prerender pass.

**Five-width CDP sweep** at 320/360/390/430/768 over the real component with the real stylesheets. The Chrome extension was not connected, so the sweep was driven through the DevTools Protocol directly — Chrome headless with `--remote-debugging-port`, Node 22's global `WebSocket` as the CDP client, and a harness generated by rendering the actual component with `renderToStaticMarkup` against the actual CSS files. No browser-automation dependency was added to the project.

Result at every width: 0 targets under 44×44 (`::after` hit regions measured through their positioned ancestor, not assumed), 0 text under 11px, 0 unnamed controls, 0 elements past the frame, no horizontal scroll on the page or the scroll surface, shell mode `flow` with no bottom nav, frame 320 → 520px.

**The sweep earned its keep twice.**

1. It caught a **real 2.69:1 contrast failure in this session's own CSS** — the card chevron on `--ckm-muted-2`. The chevron is `aria-hidden`, but it is the only visual signal that the card navigates, which makes it a graphical object under WCAG 1.4.11 with a 3:1 floor. Moved to `--ckm-muted`, measured at **3.56:1**, re-swept to **0 failures at every width**.
2. It reported an overflow at 320px that **was run down rather than waved away**. The harness was measuring the un-ligatured icon *text* (`chevron_right`, ~206px wide) before the webfont landed. Proven two ways: awaiting `document.fonts.ready` cleared it, and re-running the widths in reverse with no font wait moved the artifact off 320px entirely — so it followed the first navigation of the session, not the width. A layout defect would not move.

##### The two open user decisions — both answered

- **`/script/:id/pay` moves to Phase 4.** Approved. §11, §9.4 and the Phase 3 exit-gate note updated.
- **The low-fidelity editor wireframe is APPROVED**, so §4.3's gate is passed and the editor's CSS may be written. Four frames — editor at rest, typing with the docked bar riding the keyboard inset, a summoned Navigator sheet, and a flow step for contrast — published at <https://claude.ai/code/artifact/37cbc7e7-1b2d-4a41-8ac2-279af9fe333d>. What the approval settles: one route with two shell modes, a persistent docked Elements/Format row (one bar with a tab switch, not two), every desktop rail as a one-at-a-time bottom sheet, and the real `ScreenplayEditor` mounted rather than forked. What it explicitly does not settle: type, colour and spacing; the corkboard reorder replacement; and whether the first tap raises the Android keyboard on a placeholder-only document.

#### 2026-08-08 — Claude (Claude Code) — Phase 3 bullet 1 (research spike: creation, upload and screenplay editor)

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint verified before claiming (§20.4).** `git status` clean of mobile changes (the only pending work is the user's own `client/public/sitemap.xml` edit and six untracked design files, all preserved untouched); branch `feat/mobile-role-aware-chrome` at `aef9f11`. The previous entry's claims were checked rather than trusted: `mobileRouteManifest.js:135-140` does still hold all five routes as `DESKTOP_MIGRATION_FALLBACK`, and `writerNav.js` does still carry `mobileKeys: ["dashboard", "projects", "messages"]`.

**Work item claimed:** §11 Phase 3 bullet 1 — the research spike. Deliberately a spike and not a page, because §4.2 question 1 has to be answered for the highest-risk surface in the plan before any JSX exists.

**Scope of the gate:** all five routes at once, because they share state — `/new-project`, `/create-project`, `/create-project/:draftId`, `/upload`, `/script/:id/pay`. Roughly 11,300 lines of desktop source plus the server controllers.

---

##### The headline finding: the editor does not need to be rebuilt

The plan has treated the screenplay editor as the largest unknown in the project. It is not, and the reason is that the screenplay feature is already factored the way §5.4 asks for.

`components/screenplay/` is 4,579 lines across 32 files, and **only two of them are desktop UI** — `ScreenplayEditor.jsx` (352) and `ScreenplayFocusMode.jsx` (761). Everything else is pure logic with no DOM opinion: `classify.js`, `screenplayMode.js`, `paginate.js`, `pages.js`, `sceneIdentity.js`, `sceneReorder.js`, `emphasisRender`, `fdx.js`, `commentAnchor.js`, `lineCommentLayer.js`, `lockLayer.js`, `screenplayReports.js`.

And `ScreenplayEditor.jsx` itself is **not desktop-shaped**. It is a controlled CodeMirror 6 host with a props interface (`value`, `onChange`, `readOnly`, `zoom`, `locks`, `comments`, `dark`) and an imperative `apiRef` exposing exactly the operations a toolbar needs — `setElementType`, `applyEmphasis`, `applyCase`, `applyCentered`, `scrollToLine`, `scrollToRange`, `getSelection`, `commentLine`, `focus`, `requestMeasure`. It renders one `<div>` and a comment composer. There is no rail, no ribbon, no fixed width, no hover dependency in the editor itself.

**Decision: mobile mounts the same `ScreenplayEditor` component and builds different chrome around it.** No second editor, no second Fountain parser, no second pagination. That collapses Phase 3's risk from "port a rich editor to touch" to "design a touch toolbar for an existing editor API" — which is the ordinary work this plan is built for.

---

##### §4.1 functional inventory

**`/new-project`** — `pages/NewProject.jsx`, 153 lines. A two-card chooser (Create / Upload). No data, no permissions beyond auth, no states. It navigates to `/create-project` with `location.state = { startFresh: true }`, which §5.2 explicitly requires mobile to preserve. The cheapest screen in the phase.

**`/create-project` and `/create-project/:draftId`** — one component, `pages/CreateProject/`, 2,386 lines in `index.jsx` plus 5 steps, 5 components, 8 hooks and 4 lib modules. A five-step wizard where **step 2 is itself a mini-wizard** of up to six sub-panels (`DETAILS_STEPS`, filtered by film vs. publishing track), each with its own validation gate.

| Concern | Detail |
|---|---|
| Entry modes | fresh (`state.startFresh` **or** `?fresh=1`), resumed draft (`:draftId`), local snapshot restore, competition mode (`?ctx=competition`) |
| Editors | two, switched by format: CodeMirror/Fountain for screenplay formats, TipTap for `book`. Both are mounted at once; screenplay text is mirrored into TipTap on a 400 ms debounce so word count and the AI tools keep reading `editor.getText()` |
| Save model | three concurrent paths — 1 s debounced autosave, 3 s interval autosave, and a `fetch(keepalive)` on `beforeunload`/`pagehide`/`visibilitychange`/unmount. Plus a 300 ms-debounced `localStorage` working-draft snapshot |
| Permissions | owner / `full_admin` / `editor` / `merger` / `commenter` / viewer, split into `canEditContent`, `canComment`, `hasFullAccess`, `hasPublishAccess`; plus `competitionLocked`, `editApprovalLocked`, `accessDenied`, `invitePending` |
| Gates | plan script limit (`GET /scripts/script-limit`, blocks *new* scripts only), `enforceGoldPlan()` on every Next and every AI tool |
| Overlays | exit-confirm, drafts drawer, title page modal, version history, thumbnail cropper (`react-easy-crop`), summary-PDF confirm, under-review modal, grammar undo bar, import spinner, toast — **ten**, several portalled with hand-picked z-indexes from 100 to 10000 |
| Collab | live presence, per-scene locks, scene comments with replies/resolve, three-way merge on save (`baseContent`) |
| Server contract | `POST /scripts/draft` → 402 plan limit, 409 competition-locked, 409 non-draft, 409 edit-under-review, 410 deleted, 404 for a non-collaborator |

**`/upload`** — `pages/ScriptUpload.jsx`, 2,389 lines, which renders exactly one thing: `<ScriptUploadWorkspace vm={workspaceVm} />` (834 lines). Same five phases, same six detail sub-steps. Also accepts **two query parameters the route ledger does not record** — `?draft=<id>` (convert an editor draft to an upload) and `?edit=<id>` (content-only revision of a published script, which posts to `/collab/:id/revisions` instead). PDF/DOCX text extraction via `POST /scripts/extract-pdf` (30 MB cap, 413 on overflow). Media caps read from the server, not guessed: **thumbnail 5 MB, pitch video 90 MB, trailer 250 MB** (`scriptController.js:6792-6804`).

**`/script/:id/pay`** — `pages/ScriptPaymentPage.jsx`, 659 lines. Loads the script, computes base + 5 % buyer commission, requires up to four separate acceptance checkboxes (platform terms, writer terms, custom writer terms, rights summary), then drives **Razorpay Checkout** — a third-party script injected from `checkout.razorpay.com` that opens its own overlay outside our DOM. Verify via `POST /scripts/purchase/verify-payment`; invoice and acceptance PDFs are authenticated blob downloads.

##### The orphan hunt — clean this time, but the scope is wrong in a different way

The last two sessions each found a declared-but-unbuilt surface, so every component in this family was checked for callers. **All five routes render something real and distinct; there is no orphan here.** One adjacent check did move something, though: `features/script-workbench/ScriptWorkbenchPage.jsx`, which `next_action` named as a Phase 3 source, is **not** an editor. Its only caller is `pages/ScriptDetail.jsx:1687` — it is the script *reading* surface. It belongs to **Phase 4** (project consumption) and is out of scope here.

**`/script/:id/pay` is in the wrong phase.** Phase 3's exit gate is entirely writer-facing — "a writer can create or upload, leave, resume, validate, collaborate where allowed, and finish a project". `/script/:id/pay` is a **buyer** surface: it is reached from a script detail page by an industry professional purchasing access, and a writer will never legitimately see it for their own script. Its neighbours — project detail, unlock, purchase — are all Phase 4 bullets. Building it here means building a buyer's checkout with none of the buyer's surrounding screens in place, and the money-adjacent states (already purchased, request not approved, payment released, gateway blocked) can only be honestly verified against those screens. **Recommendation: move `/script/:id/pay` to Phase 4.** Recorded as an open follow-up for the user rather than acted on unilaterally, since it changes a phase boundary the user approved.

---

##### §4.2 native interaction research

Primary sources and two comparable products, per §4.2. Interaction patterns and hierarchy captured; no styling copied.

- **CodeMirror 6 on mobile** — [codemirror.net](https://codemirror.net/) states it uses the platform's native selection and editing on phones, which is what makes the reuse decision above viable. The [changelog](https://codemirror.net/docs/changelog/) is a record of mobile-specific fixes (iOS dead-key composition getting stuck, iOS autocorrect-on-Enter splitting into two events, an Android virtual-keyboard regression from a composition workaround) — the surface is supported and actively maintained, not incidental.
- **A specific, testable risk** — [discuss.CodeMirror #3370](https://discuss.codemirror.net/t/clicking-anywhere-on-the-placeholder-text-on-chrome-android-wont-pop-up-the-virtual-keyboard/3370): on **Chrome Android**, tapping placeholder text rendered by the `placeholder` extension does not raise the virtual keyboard (Firefox Android and iOS Safari are unaffected). Our editor configures `cmPlaceholder("INT. LOCATION - DAY")`, and **a brand-new script is a placeholder-only document** — so this is precisely the first tap of the first session. Must be verified on a real Android device; the fallback is a focus-forcing tap target over the empty document.
- **`fetch` keepalive limit** — [MDN `RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit): *"The body size for `keepalive` requests is limited to 64 kibibytes."* This produced DEF-1 below.
- **Unload is unreliable on mobile** — [MDN `sendBeacon`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) and [web.dev bfcache](https://web.dev/articles/bfcache): a backgrounded tab can be discarded without unload handlers running, the OS kills browser processes to reclaim memory, and people swipe apps closed. On a phone, "leaving the editor" is normally an app switch or an OS kill — **none of the three events the desktop save path listens for is dependable**. The durable snapshot, not the exit save, has to be the safety net.
- **Final Draft Go (iPhone)** — [App Store listing](https://apps.apple.com/ca/app/final-draft-go/id1614876398). The most useful precedent, because it draws an explicit line between tablet and phone: an **Elements bar on iPad, a Menu on iPhone**, plus a one-finger swipe anywhere on screen as an accelerator for cycling elements. It also keeps a **Scene Navigator** as a distinct jump surface on the phone, keeps accurate page-view pagination rather than reflowing to a mobile layout, keeps reports (cast/scene/location), and retains pinch-zoom.
- **WriterDuet** — [App Store listing](https://apps.apple.com/us/app/writerduet/id1237820649). Comparable because it is the collaborative one: "smart line types and one-touch icons" (a persistent quick-pick row rather than a dropdown), real-time collaboration across devices, a **left sidebar of widgets** rather than simultaneous rails, offline mode, and auto-snapshots with export from any point in history.

**The convergent pattern across both products:** the phone gets *one* content surface at a time, element choice is a persistent one-touch row plus an overflow menu, and every rail the desktop shows side-by-side becomes a summoned panel. That is exactly what §8.1's `immersive` shell plus this project's existing `ckm-bottom-sheet` describe.

**A caution, not a pattern to copy:** Final Draft Go's swipe-to-change-element would violate §14 ("no action available only by swipe") if shipped alone. Their own listing pairs it with the Menu. Ship the menu; a swipe accelerator is optional polish later.

---

##### §4.2 answers

1. **Screen, sheet, or full-screen editor?** Three different answers in one family, which is why the family had to be gated together. `/new-project` is a plain screen. `/upload` and `/create-project` steps 2–5 are a **multi-step flow**. `/create-project` step 1 is a **full-screen editor** that owns its chrome. The editor and the flow are the *same route*, so the shell mode must change with the mode — see D2 below.
2. **Top bar / body / sticky action / tabs / overflow.** Editor: a minimal app bar (back, title, save state, overflow), the document as the only scroll surface, a docked element/format bar above the keyboard, no bottom tabs. Flow: app bar with step position, one scrolling panel, a sticky Back/Next footer, no bottom tabs.
3. **What becomes progressive disclosure.** Every desktop rail: scene navigator, pages, corkboard, people/presence, comments, reports, outline notes, title page, version history, export — all bottom sheets. Step 2's six sub-panels stay six sequential panels (they already are).
4. **Back, cancellation, unsaved changes, keyboard, interrupted uploads.** The hardest quadrant, and the one that produced three of the five defects below. Covered by D6–D8.
5. **Pagination/virtualization.** The drafts list needs `ckm-load-more`. The document itself must **not** be virtualized by us — CodeMirror already viewport-renders, and second-guessing it would break selection and scroll restoration. §15 says measure first; the measurement is that CM6 already does it.
6. **Which actions need which states.** Save (idle/saving/saved/failed/blocked-by-plan/blocked-by-lock), file import (picking/extracting/failed/partial), media upload (queued/uploading/failed/retryable — the existing `pendingMediaRecovery` is the seed of this), publish (validating/submitting/under-review), and the destructive ones: discard draft, delete draft, competition submit (irreversible).
7. **Screen reader.** The element bar is a toolbar whose current element is `aria-pressed`; the element change must be announced, because a sighted user sees the line re-indent and a blind user gets nothing. Save state is a polite live region. Validation errors already carry `fieldId` in the upload flow and connect via `aria-describedby` — that mechanism is sound and mobile should keep it rather than invent one.

---

##### §4.3 text wireframes

```text
Route            /new-project
Audience         writer (auth required)
Shell            flow  (app bar + back; no bottom tabs)
App bar          Back · "New project"
Body             two ckm-card rows, stacked, full-width:
                   Write from scratch  → /create-project  (state: startFresh)
                   Upload a file       → /upload
                 each: title, one-line purpose, 3 bullet affordances, chevron
Primary action   none (the two cards are the action)
Overlays         none
States           none — static content, no fetch
Keyboard         n/a
Back             history if present, else /dashboard
Long text        cards wrap; no truncation
Transformation   desktop's 2-col grid + hover lift → 2 stacked rows, pressed state
```

```text
Route            /create-project   (mode A — the editor, step 1)
Audience         writer: owner, or collaborator with editor/full_admin
Shell            immersive  (screen-level override of the manifest's flow — see D2)
App bar          Back · title (inline-editable) · save state · overflow (⋯)
Body             ONE scroll surface: the real <ScreenplayEditor>, page-styled,
                 title-page sheet above it when configured
Docked bar       above the keyboard (useKeyboardInset):
                   row 1  Elements — horizontally scrolling chip row
                          (Scene · Action · Character · Dialogue · Parenthetical ·
                           Transition · More…)
                   row 2  Format   — B I U · AA aa · Center      (tab-switched)
Overflow (⋯)     Navigator · Corkboard · Comments (badge) · People · Reports ·
                 Outline notes · Title page · Version history ·
                 Import · Export · Zoom · Continue to details
Overlays         each of the above as a ckm-bottom-sheet; one at a time (§13)
States           read-only (commenter/viewer) · locked scene (another writer) ·
                 competition-locked · edit-under-review · plan limit ·
                 offline · saving/saved/save-failed · importing · access removed ·
                 invite pending
Keyboard         docked bar tracks the inset; the caret line stays visible
Back             dirty → one prompt: Keep editing / Save as draft / Discard
Long text        no clamping anywhere in the document
Transformation   3-pane IDE (left rail + center + right panel + ribbon)
                 → 1 surface + 1 docked bar + summoned sheets
```

```text
Route            /create-project   (mode B — details → publish, steps 2–5)
Shell            flow
App bar          Back · "Step N of 5 · <name>" · save state
Body             one panel at a time; step 2 walks its own sub-panels
Sticky footer    Back · Next  (Next = Publish on step 5), above the keyboard
Overlays         thumbnail cropper (full-screen dialog), summary-PDF confirm,
                 under-review acknowledgement, drafts sheet
States           per-panel validation error tied to its field · plan-limit gate ·
                 gold-plan gate · publishing vs film track · media upload
                 progress/failure/retry · submitting
Keyboard         footer lifts; the invalid field and its message stay visible
Back             step-wise; at step 2 walks its sub-panels first; at step 1 → editor
Transformation   desktop rail + footer pager → app-bar position + sticky footer
```

```text
Route            /upload   (+ ?draft=<id>, ?edit=<id>)
Shell            flow
App bar          Back · "Step N of 5 · <name>" · save state
Body             step 1 is the file picker: choose file → extracting → ready
                 (name, size, detected pages) → replace/remove
                 steps 2–5 mirror the create flow's panels
Sticky footer    Back · Save draft · Next
Overlays         cropper · media-retry · terms (full-screen, scrollable)
States           no file · picking · extracting · extraction empty (scanned PDF) ·
                 over 30 MB (413) · upload failed · partial media failure with
                 per-file retry · cellular-data warning on large media ·
                 content-only revision mode (?edit) · plan limit
Keyboard         as create flow
Back             dirty → prompt; a selected file is part of "dirty"
Transformation   drag-and-drop zone → a tap target (drag/drop does not exist on
                 touch); side tracker → app-bar position
```

```text
Route            /script/:id/pay        ** recommend moving to Phase 4 **
Audience         industry buyer (investor/producer/director), NOT the writer
Shell            flow
App bar          Back to project · "Complete purchase"
Body             script summary · price breakdown (base + 5% commission = total) ·
                 rights terms as an accordion · up to 4 acceptance checkboxes
Sticky footer    single primary: "Pay ₹X" — disabled until every box is ticked
Overlays         Razorpay Checkout — a THIRD-PARTY overlay we do not own
States           loading · not approved for payment · already purchased ·
                 free (₹0, no gateway) · gateway script blocked/failed to load ·
                 verifying · verified + invoice · verification failed after charge
Back             during checkout, back must not orphan a charged payment
Transformation   2-col summary/terms → one column, terms as accordion
```

No low-fidelity visual wireframe is proposed for `/new-project` or the flow steps — they are conventional. **The editor warrants one before high-fidelity styling** (§4.3), and that is where the user's approval should be sought.

---

##### Decisions

**D1 — Reuse the screenplay engine wholesale.** Mobile imports `ScreenplayEditor` and every pure module in `components/screenplay/`. No forked editor, parser, paginator or comment anchor. Consequence: a fix to Fountain classification lands on both platforms at once, which is the same argument §8.2 made for one navigation model.

**D2 — One route, two shell modes, declared not improvised.** `/create-project` is `flow` in the manifest; step 1 overrides the app-bar and bottom-nav slots on `<MobileShell>` to become `immersive`. `mobileShellModes.js` already documents per-slot override as the supported escape hatch ("a screen may override an individual slot… so the override is always a visible decision"). This is the intended mechanism, not a workaround — but it is the first use of it, so the override belongs in a named constant with a test, not inline JSX.

**D3 — Element switching is a persistent docked bar, not a dropdown.** Core elements as a horizontally scrolling `ckm-chip-row` docked above the keyboard via the existing `useKeyboardInset`; the rest in a `ckm-action-sheet`. Follows WriterDuet's one-touch row and Final Draft Go's iPhone Menu. No swipe-only affordance (§14).

**D4 — The desktop selection pill cannot be ported.** `Step1Write.jsx:103-110` applies formatting through `onMouseDown` + `preventDefault()` to keep the selection alive. On touch there is no `mousedown` before the selection settles, and preventing a synthesized mouse event does not preserve a native touch selection. Mobile uses a **persistent Format row** on the same docked bar, applying to whatever `apiRef.getSelection()` reports. No selection-preserving trickery.

**D5 — Every desktop rail becomes a bottom sheet, one at a time.** Navigator, corkboard, comments, people, reports, outline, title page, version history. §13's "opening one blocking overlay closes or suspends conflicting overlays" is already enforced by the Phase 1 overlay set.

**D6 — Scene reorder needs a non-drag mechanism, and building it fixes desktop too.** See DEF-3. `moveScene(text, from, to)` is pure, so "Move up / Move down / Move to position…" is cheap and is the accessible primitive both platforms should have had.

**D7 — Resume, not exit-save, is the mobile contract.** The durable local snapshot becomes the primary safety net, extended to cover `:draftId` (DEF-2), and the flow must resume into the exact step and sub-panel the writer left. The keepalive exit-save stays as a best-effort extra, but nothing may be *designed* to depend on it.

**D8 — Build a real mobile `/upload` screen; do not adopt the responsive desktop page.** It is tempting — `ScriptUploadWorkspace.css` already has breakpoints at 900/720/520 px and a modern `su-*` BEM system with `role="switch"` and `aria-invalid`. But measured against this plan's floors, its phone layout fails in four specific ways (DEF-4), one of which hides the save-state indicator on exactly the devices most likely to lose work. The `vm` prop shape is the right seam to reuse; the CSS is not.

**D9 — Large media needs an explicit mobile policy.** A 250 MB trailer over cellular is not a desktop problem. Required: per-file progress, cancel, a size/connection warning before starting, and the existing `pendingMediaRecovery` state promoted from a toast into a real retry surface.

---

##### Defects and risks found by the gate

**DEF-1 — the exit save silently drops for any real screenplay.** `queueKeepaliveDraftSave` (`index.jsx:761`) posts `buildDraftPayload()` with `keepalive: true`. MDN: keepalive bodies are capped at 64 KiB. And the payload carries the script text **three times** — `textContent`, `fountainContent` and `baseContent` are the same Fountain string in screenplay mode — plus `scriptPreviewPageTexts`. Measured, not assumed: a JSON build of the real payload shape crosses 64 KiB at **48 pages** with a sparse 404-byte test page, and at **9–16 pages** at realistic page density (1,200–2,000 bytes/page). Beyond that the request is rejected, `.catch(() => {})` swallows it, and `lastDraftSignatureRef.current` is updated anyway — so the client believes it saved. `handleBeforeUnload` also warns the user their changes may be lost and then fails to save them. **Impact is bounded** — the 3 s interval autosave uses a normal `api.post` with no cap, so at most the last ~3 s of typing is lost — but it is a real silent failure on a data-loss path, on both platforms. Fix belongs with D7.

**DEF-2 — resumed drafts get no local snapshot.** `index.jsx:958-959` returns early when `draftId` is set, so the `localStorage` working draft is written **only for brand-new scripts**. A writer who opens an existing draft at `/create-project/:draftId` and has the tab killed has no local fallback — exactly the scenario mobile makes common.

**DEF-3 — scene reorder is drag-only, with no alternative.** `Corkboard.jsx` uses HTML5 `draggable` / `onDragStart` / `onDrop`. Touch devices do not fire those events, so the corkboard is inert on a phone. Its only other control (`:116`) opens a scene. There is **no keyboard or button path to reorder**, which is a live WCAG 2.1.1 failure on desktop today, not just a mobile gap. §14 requires an alternative to drag/reorder.

**DEF-4 — the desktop upload page's own phone breakpoints breach four of this plan's floors.** From `ScriptUploadWorkspace.css`: `.su-save-state { display: none }` at ≤720 px removes the save indicator on phones; `.su-detail-tabs button { font-size: 0 }` at ≤520 px reduces the sub-step tabs to bare numerals; `.su-action-bar button { min-width: 42px }` is under the 44 px product target; `.su-mobile-phases button` sets 10.5 px text with a 19×19 px indicator. Evidence for D8.

**DEF-5 (risk, unverified) — the first tap on a new script may not raise the Android keyboard.** See the CodeMirror thread above. Placeholder-only documents are exactly the new-script case. **Must be tested on a real Android device before the editor is called complete** — a jsdom suite and a desktop CDP sweep can both pass while this is broken.

---

##### What this spike did NOT do

No JSX, no CSS, no route manifest change, no prefix registered in `cssPrefixRegistry.js` — that registry's contract test fails on any prefix no stylesheet uses, so `ckm-create-project`, `ckm-upload-project` and `ckm-project-payment` (already allocated in §7.2) get their code-side entries when their stylesheets land. One prefix is newly proposed and added to §7.2: **`ckm-editor`**, for the full-screen editor chrome, which is a different surface from the create wizard and must not share `ckm-create-project`.

No test suite was run, because nothing executable changed.

Two items need the user before implementation proceeds — both recorded as open follow-ups: the `/script/:id/pay` phase move, and approval of a low-fidelity editor wireframe before high-fidelity styling (§4.3).

#### 2026-08-08 (later) — Claude (Claude Code) — Phase 2 bullet 6 (account/settings and global auth/session)

**Work item claimed:** §11 Phase 2 bullet 6, the last bullet before the phase exit gate.

##### The §4 gate: there is no settings page to port, on either platform

Checked before designing anything, because the `/ai-tools` finding earlier the same day is a standing warning that a phrase in the plan is not evidence of a page behind it. It was the right instinct twice over:

- **No `/settings` route and no settings page exist.** `App.jsx` declares neither; `pages/` contains no `Settings*` or `Account*` file. Grep for `settings` across the client returns admin competition settings, currency context, a script-upload workspace panel — nothing account-level.
- **Desktop's entire account surface is `layouts/app-shell/components/UserMenu.jsx`**, whose `ACCOUNT_MENU` is exactly four entries — Profile, Contact, T & C, Privacy — plus a Log out button. That is the whole thing.
- **Mobile is already at parity with it.** `screens/overlays/AccountMenu.jsx` carries the same four entries plus a `role="alertdialog"` logout confirmation focused on Cancel — which is *better* than desktop, where Log out fires immediately with no confirmation.
- **Account editing is not in this family.** It lives in `EditProfileModal`, mounted from `pages/Profile.jsx`. `/profile/:id?` is still a `DESKTOP_MIGRATION_FALLBACK`, so it belongs to **Phase 5**, not here. Pulling it forward would scatter an unfinished profile surface across two phases.
- **A third orphan, alongside `/ai-tools` and the holds backend:** `components/PrivacySettings.jsx` and `components/PrivacySettingsWrapper.jsx` exist with **zero callers** anywhere in the client. Recorded, not built — there is no desktop entry point to match.

##### Global auth/session is already shared, and that is the correct design

`§5.4` asks for one logic boundary, and this already is one. Every session behaviour lives **outside React**, in `services/api.js` and `context/AuthContext.jsx`, and mobile inherits all of it by importing the same `api`:

| Behaviour | Where | Mobile status |
|---|---|---|
| Client-side expiry check before every request | `api.js:46-71` request interceptor | Inherited |
| 401 → clear session → redirect | `api.js:74-94` response interceptor | Inherited |
| Intended destination parked for the auth modal | `api.js:15-24` (`PENDING_AUTH_REDIRECT_KEY`) | Inherited — `AuthModalProvider` (`App.jsx:440`) wraps `RootExperience` (`App.jsx:454`), so the mobile branch is inside it |
| Auto-logout timer on JWT `exp` | `AuthContext.jsx:50-64` | Inherited |
| `/auth/me` validation on mount | `AuthContext.jsx:148` | Inherited |
| Logout: clear state, clear `dashboard:` cache for privacy, `location.replace("/")` | `AuthContext.jsx:262-277` | Inherited — and the cache prefix genuinely covers mobile, which writes `dashboard:v1:<userId>` |

Two mobile-specific risks were checked rather than assumed, and **both are clean**:

1. **A session dying while an overlay holds the scroll lock.** `useScrollLock` locks `.ckm-shell__scroll` — an element *inside* `MobileApp` — so it cannot outlive the unmount. The document-level `ckm-html-lock` on `<html>` is removed by `MobileApp`'s own cleanup effect. No lock leaks onto the desktop document when the experience switches.
2. **Logout leaving mobile's cached dashboard on disk.** It does not: `clearCacheByPrefix("dashboard:")` and mobile's `DASH_CACHE_NS = "dashboard:v1:"` are the same namespace by design.

##### So what bullet 6 actually is

Not a screen. The honest scope is one real defect, plus turning inherited behaviour into asserted behaviour:

**The defect — mobile sends users through a redirect hop that desktop does not.** `AccountMenu.jsx:30-31` links `/terms` and `/privacy`. `App.jsx:481,483` mounts both as `<Navigate replace>` to the canonical `/terms-of-service` and `/privacy-policy`, which is where desktop's `UserMenu` links directly. It works, but it costs an extra navigation and breaks §5.2's canonical-URL rule on the only two account destinations mobile owns.

##### What was done

- **Fixed** the two account links to the canonical routes. The aliases stay declared in the manifest because external links to them exist; they are simply no longer what this app emits.
- **`screens/overlays/AccountMenu.test.jsx` (new).** The account surface had **no test coverage at all**, which is how two alias links survived unnoticed. 8 tests: the canonical destinations, the full destination set asserted against desktop's own `ACCOUNT_MENU` (so if desktop gains "Billing", mobile fails until it gains it too — §8.2 applied to account admin), and the four states of the logout confirmation.
- **`mobileSession.test.js` (new).** 5 tests pinning the cross-file contracts mobile inherits. The load-bearing one: `AuthContext.logout()` clears cache keys by the literal `"dashboard:"` and mobile's `useDashboardData` writes the literal `"dashboard:v1:<userId>"` — **nothing but this test connects those two strings**, and if they drift, a logged-out phone keeps the previous account's earnings, project titles and review scores readable in localStorage. Asserted on a shared device with two accounts' snapshots, and that unrelated cached data survives.
- **Corrected `mobile/README.md`.** It still described `island.desktopOnly(feature)` and the Dynamic Island in the present tense as current behaviour. Both were deleted on 2026-08-07; the doc was actively misleading the next reader.

##### Verification

**358 mobile tests in 29 files** (was 345/27). Full suite **899/901** across **three consecutive runs** — the same 2 pre-existing `AppShell.render.test.jsx` failures, nothing else. Lint clean across `src/mobile`; build + 53-route prerender pass.

**A flaky assertion of my own was found and fixed rather than retried.** Earlier full-suite runs failed 2, 5, and 4 tests on successive passes, and the varying ones included files this work never touched (`WriterRosterPage`, `adminCompetitionsEditor`) — load-dependent flakiness under parallel workers, not a regression. But one of the varying failures *was* mine: `Holds.render.test.jsx` asserted `toHaveBeenCalledTimes(1)`, which is hostage to React re-running an effect under concurrent rendering. The test is named "reads the one endpoint that exists, **and no other**", so it now asserts the distinct set of called URLs — the actual contract, which still fails just as loudly if a second endpoint appears, and passed 5/5 in isolation and 3/3 in the full suite afterwards. **Worth knowing for future sessions: this suite is flaky under full-suite concurrency, so a single red run is not evidence of a regression — re-run before investigating.**

##### Phase 2 exit gate — met

> *"Every dashboard interaction works on mobile; no `desktopOnly()` branch remains in the dashboard family."*

Verified by grep: **zero** live `desktopOnly` call sites remain anywhere in `client/src/mobile` — every surviving mention is a comment recording what the call *became*. `DynamicIsland`, `BottomSheet`, `TopBar` and `BottomNav` are all deleted, and their prefixes retired from the registry.

##### What bullet 6 did NOT build, and why

No settings screen, because there is nothing to port — see the gate above. Account editing (`EditProfileModal`) belongs to **Phase 5** with `/profile/:id?`. `components/PrivacySettings.jsx` and `PrivacySettingsWrapper.jsx` are dead code with zero callers on either platform; building a mobile surface for them would be inventing a feature, not migrating one. All three are recorded as follow-ups rather than silently absorbed.

#### 2026-08-08 — Claude (Claude Code) — Phase 2 (approved writer tabs; `/ai-tools` and `/offer-holds`) — **bullets 4 and 5**

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint:** Verified against the repository before claiming (§20.4). `git status` clean of mobile changes; branch `feat/mobile-role-aware-chrome` at `7a31e91`. The previous entry's `next_action` named two things, and both were checked rather than assumed: `writerNav.js` does carry `mobileKeys: ["dashboard", "projects", "messages"]` as described, and `mobileRouteManifest.js:145-146` does still hold `/ai-tools` and `/offer-holds` as `DESKTOP_MIGRATION_FALLBACK`.

**Work items claimed:** §11 Phase 2 bullet 4 (approved writer tabs) and bullet 5 (`/ai-tools` and `/offer-holds`).

---

##### Bullet 4 — the writer tab set, approved

Put to the user with the three real options (approve; swap Projects back to Create; break the four-slot preset contract for a fifth tab). **Answered: approve as-is.**

The approved set is **Dashboard · Projects · Messages · Profile**, and it needs no code — the bars have been preset-driven and URL-driven since Phase 1 (§8.2), and the Phase 1 CDP sweep already measured this exact bar at 320/360/390/430/768 with 0 undersized targets, 0 text under 11px, 0 unnamed controls, exactly 1 `aria-current`, and the selected tab at 5.13:1 with a distinct `FILL` axis so the state is not carried by colour alone.

Create keeps its place in the rail and the drawer and remains the dashboard hero's primary action, so approving this set does not cost a tap on the writer's most common action. What it buys is the thing the 2026-08-07 swap was made for: a writer's own project list has an entry point in the compact bar.

The approval is now **enforced rather than remembered** — see the test note below. A silent edit to `mobileKeys` should fail a test, not ship.

---

##### The §4 gate: `/ai-tools` and `/offer-holds` — the research changed the direction (§20.7)

Phase 2 bullet 5 reads "Implement `/ai-tools` and `/offer-holds` as real route-aware screens/sections." **The premise is wrong, and it was wrong when the plan was written.** Read out of the source, not inferred:

- `client/src/App.jsx:582-583` mounts **both** as `<DashboardRoute />` — the *identical element* as `/dashboard` on line 581. Not a variant, not a prop: the same three-line component.
- `pages/Dashboard.jsx` (1460 lines) never reads `pathname`, `useLocation`, or a route param. There is no branch for either URL. Confirmed by grep: zero occurrences of `ai-tools`, `offer-holds`, `aiTools`, `offerHolds` or `pathname` in the file.
- They have been that way since **`93055d0`** ("change in investor", Yash Chichad, 2026-02-25), the commit that introduced them — the original diff wraps a bare `<Dashboard />` in `<PrivateRoute><MainLayout>` for both. They were never built.
- **Nothing in the application links to either one.** The only match in the whole client outside the route table and the SEO no-index list is `pages/FunctionalTestChecklist.jsx:50,52`.

So there is no desktop screen to port. Bullet 5 is net-new product design wearing a migration bullet's clothes. That was put to the user with the options; the answer was **"holds real, ai-tools alias"**.

**`/ai-tools` — a documented alias, not a port.** Seven live AI endpoints exist (`server/routes/aiRoutes.js`: generate-trailer, trailer-status, script-score, prose-sample, correct-script-text, writing-assist, generate-metadata) but every one is consumed from the screen that owns the script — the editor, create-project — never from a hub. A hub would need a script picker in front of every action, which is new design, not migration. Mobile therefore does what desktop does: renders the dashboard. The one thing worth fixing is that mobile was rendering the *desktop* dashboard there while rendering the *mobile* one at `/dashboard`, which is a parity gap in the opposite direction from the one the plan expected.

**`/offer-holds` — real, and the audience is not the writer.** This route has the rarer problem: a **fully shipped backend with no client at all.**

| Server surface | Where | Client consumers |
|---|---|---|
| `GET /scripts/holds` → `getMyHolds` | `scriptRoutes.js:123`, `scriptController.js:4854` | **none** |
| `POST /scripts/hold` → `holdScript` | `scriptRoutes.js:162`, `scriptController.js:4753` | **none** |
| `POST /scripts/release-hold` → `releaseHold` | `scriptRoutes.js:163`, `scriptController.js:4825` | **none** |
| `POST /scripts/hold/quote`, `/hold/create-order`, `/hold/verify-payment` | `scriptRoutes.js:118-120` | **none** |
| `ScriptOption` model, `script_hold` ledger entry, `hold` + `hold_expiring` notification types | `models/` | — |

The decisive detail, and the reason this belongs to a different audience than the phase it sits in: **`holdScript` 403s anyone whose role is not `investor`, `producer` or `director`** (`scriptController.js:4770-4772`), and **`getMyHolds` queries `{ holder: req.user._id }`**. A writer can never be a holder, so `GET /scripts/holds` returns `[]` for a writer unconditionally, forever. `/offer-holds` is an **industry-audience** screen that Phase 2 happens to name.

It is built here for the industry audience, with `fallbackDisposition` leaving every other audience on the existing desktop route — the manifest already supports exactly this shape (`mobileRoutePolicy.js:65-68`), and it is the same mechanism `/dashboard` uses to be writer-only.

**Payload shape, read from the controller rather than the client** (this is the discipline that caught the review-mapping defect on 2026-08-07):

```
ScriptOption[]  — sorted createdAt desc, holder-scoped
  _id, fee, platformCut, creatorPayout
  startDate (default now), endDate (required), createdAt, updatedAt
  status: "active" | "expired" | "converted" | "cancelled"
  convertedToSale: boolean
  paymentId, orderId
  script (populated, select: title genre coverImage creator price trailerThumbnail)
    creator (populated, select: name profileImage)
```

Three traps in that shape, each of which would produce a plausible-looking lie on screen:

1. **`status` is not the truth about time.** `holdScript` writes `status: "active"` with `endDate = now + 30 days` and nothing ever sweeps it — there is no cron, no TTL, no `expired` writer anywhere in the server. A hold whose `endDate` passed six months ago is still `status: "active"` in the database. The screen must derive expiry from `endDate` against the clock and treat `status` as the *deal* state, never as the *time* state.
2. **`script` can be `null`.** `populate` on a deleted or missing script yields `null`, and `holdScript` itself has a `script.isDeleted` 410 branch — so deletion is a real, handled state in this system. Every row must survive a null script rather than throwing on `hold.script.title`.
3. **`convertedToSale` and `status: "converted"` are set by two different code paths** and are not guaranteed to agree; `getInvestorDashboard:344` already counts a deal converted if *either* is true. The model follows that precedent rather than inventing a third rule.

---

##### What was built

| File | Role |
|---|---|
| `mobile/data/holdsModel.js` (new) | Pure payload → view derivation. The clock is an **argument**, so every time-dependent rule is testable at a chosen instant instead of trusted. |
| `mobile/hooks/useHoldsData.js` (new) | The one request, the error/retry state, and an hourly clock tick. |
| `mobile/screens/Holds.jsx` + `Holds.css` (new) | The screen; prefix `ckm-holds`, registered before the CSS was written (§7.2). |
| `mobile/routes/mobileRouteManifest.js` | Both routes flipped from `DESKTOP_MIGRATION_FALLBACK` to `SCREEN`, each with its audience gate and `fallbackDisposition`. |
| `mobile/routes/MobileRoutes.jsx` | `/ai-tools` → the dashboard element; `/offer-holds` → the new screen. |
| `mobile/theme/cssPrefixRegistry.js` | `ckm-holds` registered. |

Three decisions inside that are worth finding later without re-deriving them:

- **No cache, deliberately.** The dashboard caches to localStorage because it is the app's home screen. This screen's whole subject is a countdown, and a cached "6 days left" painted before the network answers is precisely the stale-but-plausible number class that the 2026-08-07 audit was about. A skeleton that resolves beats a confident lie.
- **The clock is state, not `new Date()` in render.** A session left open overnight would otherwise keep rendering yesterday's "1 day left". It ticks hourly — the coarsest interval that cannot show a wrong whole-day count.
- **No write actions yet.** `releaseHold`, `hold/quote`, `hold/create-order` and `hold/verify-payment` all exist, but releasing a hold is a destructive, money-adjacent action whose desktop counterpart has never been built: there is no established confirmation copy, no refund rule, and no place a failure is currently reported. The read surface is the honest half to ship first.

##### Verification

**Tests.** 345 mobile tests in 27 files (was 288/25). Full suite **886/888** — the same 2 pre-existing `AppShell.render.test.jsx` failures, re-confirmed this session by stashing every change and watching the identical 2 fail. Lint clean across all of `src/mobile`. Build + **53-route prerender pass**.

New coverage: 26 model tests written against the controller's shape (each of the three traps asserted from both sides), 12 screen render tests, 10 route-policy tests asserting the audience gate from **both** directions, and 2 MobileRoutes tests.

**Five-width browser sweep (320/360/390/430/768), driven over CDP.** There is no puppeteer in this repo, so headless Chrome was driven directly over the DevTools protocol with `Emulation.setDeviceMetricsOverride` — never `--window-size`, which Chrome on Windows clamps near 500px and which crops rather than reflows (the Phase 0 baseline README's own warning). The page measured is the **real component**, rendered with real fixture data and carrying the real mobile stylesheets, so these are measurements of shipped CSS rather than of a mock.

At **every** width: **0** undersized targets across 12 interactive elements, **0** text nodes under the 11px floor across 76, **0** unnamed controls, **0** elements past the frame, **no** horizontal page scroll, and the frame itself never wider than 520px (320/360/390/430/**520** at 768).

Measured rather than assumed:

- **The sweep found a real defect in this session's own CSS and it was fixed, not excused.** `ckm-holds__terms-sep` — the "·" between the fee and the date — was `--ckm-muted-2` (#a39d92) on white at **2.69:1**, failing SC 1.4.3 at 12px, 7 occurrences at all 5 widths. It is a rendered glyph, so the decorative exemption does not cover it. It now inherits the text colour and separation comes from the spacing: **0 contrast failures** at all five widths afterwards.
- **One reported failure was the harness's, not the app's**, and was run down rather than waved away: `ckm-appbar__home` measured 8×44. The app bar's logo `src` is the absolute `/ckript-logo-landscape-nobg.png`, which over `file://` resolves to the drive root, so the `<img>` collapsed and took the link's width with it. Rewritten to a relative path, the same sweep reports **0** undersized targets at all five widths. Recorded because the next agent to build a `file://` harness will hit it.
- **All three payload traps render correctly at every width.** 7 rows: **6** links and **1** inert (the deleted script), in 3 groups reading `Expiring soon 2`, `Active holds 2`, `Closed 3`. The badges are `Last day`, `5 days left`, `15 days left`, `26 days left`, `Lapsed`, `Bought`, `Released` — so the `status: "active"` row whose `endDate` passed 90 days ago reads **Lapsed**, and the `status: "active"` row with `convertedToSale: true` reads **Bought**. Each countdown badge also carries its sr-only expansion ("Last day" + "Expires last day").
- **The summary excludes closed money.** Measured `4 / 2 / ₹13,100` — open = 200 + 12,500 + 200 + 200, with the released ₹200 and the lapsed ₹200 correctly outside it.
- **Exactly 0 `aria-current` on a 4-tab industry bar**, which is the correct answer rather than a miss: `/offer-holds` belongs to no industry tab, and MDN's rule is that at most one element in a set carries it. Marking a fallback tab current here would be a lie told on every visit.
- **Content stress (§16.2) held.** A 78-character title, a 30-character hyphenated writer name and a ₹12,500 fee all wrapped inside the 320px frame with no overflow and no text shrunk below the floor.

**Known limitation, recorded rather than papered over:** the screen is deep-linkable but reachable from no navigation. Adding it to `industryNav.js`'s drawer is the correct fix and is deliberately **not** done here, because that preset feeds the desktop rail and drawer too (§8.2: a destination cannot exist in one bar and not the other) — and on desktop `/offer-holds` still renders the dashboard. Shipping a drawer link that lands industry users back on their own dashboard is a worse defect than the one it fixes. The nav entry should land in the same change as the desktop screen. Logged as a follow-up.

#### 2026-08-07 — Claude (Claude Code) — Phase 2 (dashboard parity audit + data truth) — **bullet 1 closed, bullet 2 in progress**

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint:** Verified against the repository before claiming (§20.4). Every file the Phase 1 entry names exists; `components/TopBar.*`, `components/BottomNav.*`, `components/BottomSheet.*` and `components/DynamicIsland.*` are all still present. One correction to the previous session's `next_action`: it says "migrate the four dashboard overlays (AccountMenu, AiDetailSheet, AllProjectsSheet, NotificationsPanel) off `components/BottomSheet.jsx`". Only **two** of the four use it — `AiDetailSheet` and `AllProjectsSheet`. `NotificationsPanel` (`ckm-noti`) and `AccountMenu` (`ckm-acct`) are bespoke anchored popovers with their own scrims, their own `AnimatePresence`, no focus trap, no scroll lock and no `inert`; they are not sheets at all and migrating them is a larger job than the note implies (see the follow-up list below).

**Work item claimed:** §11 Phase 2 bullet 1 (dashboard research/parity audit) and bullet 2 (remove static placeholders, wire real services).

---

##### The §4 gate: dashboard page family

**Desktop component tree** (`client/src/pages/Dashboard.jsx`, 1460 lines). `Dashboard` is an audience *router*: `isIndustryAudience(user?.role)` lazy-loads `ProducerDashboardPage`, otherwise `CreatorDashboard`. Only the creator branch has a mobile counterpart. Its children: `ProfileCompletionBanner`, hero, Script Performance (3 stats + hand-rolled bar chart), Reviews & Insights (`CarouselNav`/`NavBtn` + `AiReviewCompact` + `AdminReviewCard` + `EmptyPanel`), My Projects (`ProjectCard` grid + pending/rejected notices + Collaborations), a `lg:`-only right rail (At a Glance 2×2, Avg Score, Biggest Mover, Top Scripts, Full Analytics), and two modals (`ReviewModal` → `AiReviewDetail`, `AllProjectsModal` paginated 9/page). `DashboardSkeleton` mirrors the whole layout.

**Services.** Three parallel `Promise.allSettled` calls, identical on both platforms: `GET /scripts/mine?includeCollaborations=1`, `GET /dashboard`, `GET /dashboard/reviews`. Plus a `/auth/me` session sync in the router, a `socket.io` subscription to seven `collab_*` events that refetches, and a localStorage stale-while-revalidate cache (`dashboard:v1:<userId>`, written via `writeCache` with a trimmed retry).

**Server payload shapes, read from `server/controllers/dashboardController.js` rather than inferred:**

| Endpoint | Field | Shape |
|---|---|---|
| `/dashboard` | `stats` | `totalEarnings`, `totalUnlocks`, `totalViews`, `profileViews`, `trailersGenerated`, `avgScore` (nullable), `activeHolds`, `scoredScripts`, `auditionCount`, `scriptScoreCredits`, `plan`, **`isAnalyticsLocked`** |
| `/dashboard/reviews` | `ai[]` | `scriptId`, `scriptTitle`, **`rating`**, **`scores{plot,characters,dialogue,pacing,marketability}`**, `feedback`, `strengths[]`, `weaknesses[]`, `improvements[]`, `audienceFit`, `comparables`, `date` |
| `/dashboard/reviews` | `adminScores[]` | `scriptId`, `scriptTitle`, **`overall`**, `content`, `trailer`, `title`, `synopsis`, `tags`, `feedback`, `scoredAt` |
| `/dashboard/reviews` | `readers[]`, `platform[]` | present in the payload; **neither platform renders them** |

**Permissions.** `getDashboardStats` and `getDashboardReviews` both compute `isFreeWriter` (role writer/creator with no plan or `plan === "free"`) and return `null` for `profileViews` / `totalViews`, plus `isAnalyticsLocked: true` and locked reader insights. This is §13's "plan/quota restricted" state and **neither desktop nor mobile renders it** — both coerce the `null` to `0` with `??` and silently show a free writer "0 profile views" where the truth is "upgrade to see this". Recorded as a shared follow-up, not a mobile-only one.

**Parity inventory — what the audit actually found.** Ordered by severity, and every one of these was read out of the source, not assumed:

1. **The reviews tab renders fabricated data on both lists.** `mobile/hooks/useDashboardData.js` maps AI reviews with `r.score` and `r.summary`, and platform reviews with `r.score`. The server sends **`rating`** and **`overall`**. Neither `score` nor `summary` exists on either payload, so every AI card scores **0/100** with four identical 0% bars and the hardcoded excerpt "AI Analysis completed.", and every platform card scores **0/100**, "Grade B", "Platform review completed." The mobile dashboard has been showing invented review content for real scripts. This is not a placeholder — it is worse, because it is indistinguishable from data.
2. **The literal `Placeholder` badge** — `screens/sections/OverviewSection.jsx:72` renders `<span className="ckm-ov__badge">Placeholder</span>` beside "At a Glance" in production.
3. **The notification bell is fiction.** `screens/Dashboard.jsx:44` seeds state from `data/dashboardData.js`'s `NOTIFICATIONS` — three hand-written rows ("Meera K. liked Nocturne") shipped to every user, with `dangerouslySetInnerHTML`. Meanwhile `layouts/app-shell/hooks/useShellNotifications.js` already exists as a presentation-agnostic hook doing polling, sockets, unread counts, mark-read, delete and follow-request decisions. §5.4 says share the logic; mobile should consume that hook, not a second implementation and certainly not a constant.
4. **Nine `desktopOnly()` call sites**, seven of which have a real destination available today: Create → `/create-project` (state `{startFresh:true}`), Upload → `/upload`, Edit profile → `getProfileCanonicalPath(user, …)`, Open project / Top Scripts rows / All Projects rows / Collaborations → `getScriptCanonicalPath(script)`. Desktop already navigates to exactly these. Two need a real in-place behaviour instead: Share and Filter.
5. **Project cards carry `score: null` with the comment "would need to merge with reviews".** The merge is available — `/dashboard/reviews` returns `scriptId` on both lists, so the join is by id.
6. **Mobile drops the rejected-projects notice** that desktop renders. Mobile has the pending notice only.
7. **Mobile has no cache and no socket refresh.** Desktop hydrates synchronously from `readCache` (first paint with no skeleton) and refetches on seven collab events. Mobile shows `MobileRoutePending` on every visit and never updates until remount.
8. **Mobile's loading state discards `useDashboardData`'s partial-failure handling.** The hook uses `Promise.allSettled` and defaults each leg, but a total failure only `console.error`s and leaves `data` null — so the screen renders the pending skeleton **forever** with no error, no retry and no offline distinction. `ckm-message` (Phase 1) is the component that fixes this and it is already built.
9. **A desktop defect found during the audit, not to be copied:** desktop's `fetchData` filters `myScripts` to `status === "published"`, then computes `pending`/`rejected` from `myScripts` — so the two status notices it renders are **unreachable on desktop**. Mobile does not filter, so mobile's pending count is the correct one. Keeping mobile's behaviour and adding the rejected notice is the right call; the desktop bug is logged as a separate follow-up rather than silently mirrored.
10. **Superseded primitives still in the dashboard's own markup:** `ckm-btn` (superseded by `ckm-button`), `ckm-viewmore` (superseded by `ckm-load-more`), the bespoke `ckm-rev__subtab` pair (superseded by `ckm-tabbar`), and `ckm-sheet` via `BottomSheet`. Phase 1 built all four replacements.
11. **Baseline accessibility debt on the dashboard's own content** (measured in the Phase 1 CDP sweep, restated here because Phase 2 owns it): 5 text nodes under the 11px floor and ~25 colour pairs under 4.5:1, listed in the previous `next_action`.

**Not a gap, deliberately:** mobile shows Overview as its own tab, recovering the right rail that `hidden lg:block` drops on a phone. Mobile paginates reviews with "View more" where desktop uses a one-card carousel — a carousel is a desktop affordance and §4.2 favours the list. Both are kept.

---

##### ⚠ BLOCKING PRODUCT QUESTION — three of the four dashboard sections have no way in *(RESOLVED 2026-08-07 — option B, implemented below)*

Found while writing the render tests, not from the ledger: **`components/SectionTabs.jsx` lists only two tabs, Overview and Challenge.** Commit `ada2b85` (2026-08-03, Yash Chichad, "Update SectionTabs to only show Overview and Challenge") removed `performance`, `reviews` and `projects`.

`Dashboard.jsx` still renders all four sections, and `useDashboardData` still fetches everything all four need. So today:

- **Performance** is reachable by exactly one control — Overview's "Full Analytics" button;
- **Reviews** is reachable by nothing;
- **Projects** is reachable by nothing;
- **AllProjectsSheet** is reachable by nothing (its only opener is inside Projects);
- **AiDetailSheet** is reachable by nothing (its only opener is inside Reviews).

That is roughly 700 lines of fully-wired screen — including everything this session repaired in Reviews and Projects — that a signed-in writer cannot currently open. It is also why Phase 2's exit gate ("every dashboard interaction works on mobile") cannot honestly be signed off yet: the interactions work, but three quarters of them cannot be started.

The commit message states the intent plainly and carries no explanation, so this is treated as a **deliberate product decision that the plan must not silently reverse** (§20.14). It was left exactly as committed. The options, with consequences:

| Option | Consequence |
|---|---|
| **A. Restore the four tabs** | Everything Phase 2 fixed becomes reachable, and the tab strip returns to five items (with Challenge) — measured at 320px, five tabs give a 41.7px-wide target, under the 44px floor, so the strip would need to scroll horizontally or drop to icons. |
| **B. Keep two tabs; move Reviews and Projects to their own routes** | Matches §5.2's URL contract better than tabs do — a writer can link to their projects — and the bottom nav already has room. Costs two new route entries and their manifest/shell registrations. |
| **C. Keep two tabs; fold Reviews and Projects into Overview as sections** | One long scroll, which is what the mobile plan explicitly moved away from. |
| **D. Keep as-is and delete the three sections** | Honest, but throws away working screens and re-opens Phase 2 as new work later. |

**Recommendation: B.** The plan's own URL contract wants these to be addressable, the sections are already built and now verified, and it avoids the 320px tab-strip problem entirely.

**ANSWERED 2026-08-07 by the user: option B.** Implemented the same session — see "How B was built" below. The tab strip is untouched; `ada2b85` stands.

##### How B was built, and the one place it deviates from the sketch

The sketch said "new routes `/projects` and `/reviews`". That turned out to be the wrong mechanism, and the manifest is what said so: `mobileRouteCoverage.test.js` asserts that the registered mobile routes are **exactly** the path literals in `App.jsx`, and §5.2 says "desktop and mobile use the same canonical URL". A mobile-only `/projects` would therefore either fail the coverage contract or ship a URL that 404s the moment the same writer opens it on a laptop — which is precisely the class of thing the URL contract exists to prevent.

So the destinations are **query-string tabs of the dashboard's own URL**: `/dashboard?tab=projects` and `/dashboard?tab=reviews`. That delivers everything option B was chosen for — deep-linkable, correct under browser Back, addressable from the nav — with none of the cost:

- one canonical URL per platform, because it *is* `/dashboard`, which both already serve;
- no new `App.jsx` route, no coverage-contract change, no 404 risk on desktop;
- §5.2 names "query strings and tab selection" as something mobile routing must preserve, so this is the contract's own idiom;
- and the writer preset **already** shipped a destination of exactly this shape — `{ key: "competitions", path: "/challenge?tab=mine" }`.

Concretely:

1. `screens/Dashboard.jsx` takes its section from `useSearchParams` instead of `useState`, validated against a known list and falling back to Overview. Section changes `replace:` rather than push, so moving between sections does not build a stack of history entries the user has to Back through, while arriving from the nav is a real navigation with its own entry.
2. `presets/writerNav.js` gains `projects` (rail + drawer + compact bar) and `reviews` (drawer). Declared in the **desktop preset**, per §8.2 — a destination cannot exist in one bar and not the other — so the desktop rail and drawer gain them too.
3. `mobileKeys` becomes `["dashboard", "projects", "messages"]`. **Create gave up its compact slot to Projects.** Create is still one tap from home — it is the dashboard hero's primary action on every visit — and it keeps its place in the rail and drawer; a writer's own project list had no entry point anywhere in the compact bar.

**Two real defects this surfaced, both fixed:**

- `resolveActiveTabKey` matched on pathname alone, so `/dashboard?tab=projects` and `/dashboard` were indistinguishable and Dashboard won both. It now requires every query param a destination declares to be present with that value, and scores each as specificity — so the query tab beats its host page on the query URL, and the host page still wins on its own.
- **`NavBar` was marking two tabs `aria-current="page"`.** It used `NavLink`, which decides "am I active?" itself from the path, and applies its *own* `aria-current` when it does — so passing `undefined` could not suppress it. This was latent before (no two tabs had shared a path) and became visible immediately. The bar is now a plain `Link` with `resolveActiveTabKey` as the single authority, which is what its own comment had always claimed. Two tabs claiming to be the current page is a lie told to a screen reader on the app's most-visited screen, so this was worth the change on its own.

**Verified:** full suite **835/837** (same 2 pre-existing AppShell failures); lint clean on every touched file; build + 53-route prerender pass. New tests cover the query-vs-host resolution both ways, that exactly one tab is current on each URL, that `?tab=` opens the named section, and that an unknown `?tab=` falls back to Overview rather than blanking. Real browser at 320/360/390/430/768: `?tab=projects`, `?tab=reviews` and `?tab=performance` each render their section with **0 undersized targets, 0 text under 11px, 0 unnamed controls, 0 overflow and no horizontal scroll at every width**, with the bottom bar reading Dashboard · Projects · Messages · Profile.

---

##### What was built (bullet 2, and the deletions bullet 1 unblocked)

**The data.** New `data/dashboardModel.js` — pure, no React — is the single mapping from the three payloads to what the sections render, and `hooks/useDashboardData.js` is now only the data session. Concretely fixed: AI reviews read `rating`/`scores{}`/`feedback`/`strengths`/`weaknesses`/`improvements`/`audienceFit`/`comparables`; platform reviews read `overall` plus all five dimensions; verdict bands and A–F grades match desktop exactly (the old grade helper could only ever emit A or B, so a failing script was shown to its author as a "Grade B"); project cards carry the real merged score (`platformScore.overall ?? scriptScore.overall`), the real `coverImage`, the real price via `premium`, and a canonical `href`; an unscored dimension is omitted rather than drawn as a 0% bar.

**The session.** `useDashboardData` now hydrates synchronously from the **same** `dashboard:v1:<userId>` cache desktop writes, so a returning phone paints real numbers with no skeleton and revalidates behind them, and a form-factor switch does not discard the other client's snapshot. A total failure surfaces an `InlineMessage` with a working retry instead of leaving the pending skeleton up forever; a partial failure keeps the sections that loaded.

**The nine `desktopOnly()` call sites are gone, and with them `DynamicIsland`.** Create → `/create-project` (with `startFresh`), Upload → `/upload`, Edit profile → `getProfileCanonicalPath`, Open project / Top Scripts rows / All-projects rows / Collaborations → `getScriptCanonicalPath`, account menu → `/contact` `/terms` `/privacy` + the profile. Filter became a real `ckm-segmented` status filter with a recovery action on the empty result. Share became `data/shareProject.js` — Web Share API, clipboard fallback, and it distinguishes an `AbortError` (the user closing the OS sheet) from a real failure so cancelling is never reported as an error.

**The bell became real.** `NotificationsPanel` consumes `useShellNotifications` — the desktop shell's own hook — plus the shared `timeAgo` / icon-map / decision-test helpers, so the same notification cannot look different on a phone. The three invented rows and their `dangerouslySetInnerHTML` are deleted, as is the `dangerouslySetInnerHTML` on the AI sheet's audience text (defensible for a hand-written fixture; not defensible for model output stored on a script).

**Retired and deleted, with their prefixes:** `TopBar` + `BottomNav` (`ckm-topbar`, `ckm-bottomnav`), `BottomSheet` (`ckm-sheet` — its only two callers, `AiDetailSheet` and `AllProjectsSheet`, are now real `Sheet`s with focus trap, scroll lock and `inert`), `DynamicIsland` + `context/dynamicIsland.js` (`ckm-island`), `AccountMenu.css` (`ckm-acct` — it is now `ActionSheet` + `ConfirmDialog`), and `ckm-btn` / `ckm-viewmore` from `theme/primitives.css`. `AllProjectsSheet`'s pager also stopped printing one button per page — 200 scripts meant 23 numbered buttons wrapped across a phone — and now uses desktop's windowed `1 … n-1 n n+1 … N`.

**Also removed, deliberately:** Performance's "Details" list. Its two rows were "Avg watch time —" and "Saves —", values no endpoint supplies, behind a chevron that opened a `desktopOnly()` toast. Desktop shows the three stats and the chart and nothing else, so removing it is also the parity-correct shape.

**Accessibility debt this phase owned, cleared.** Every item the Phase 1 sweep listed is fixed and re-measured: `ckm-ov__mover-head` 8.5→11px, `ckm-ov__mover-note` 10.5→11px, `ckm-ov__top-meta` 10→11px, `ckm-ov__glance-label` 2.69:1 → `--ckm-text-3`, `ckm-ov__badge` 3.02:1 → `--ckm-gold-ink` at 11px, `ckm-ov__profile-sub` 3.36:1, `ckm-ov__top-rank` 1.82:1, and `ckm-tabs__btn` — which turned out to be worse than recorded: a 29px-tall control with a 9px label at 3.41:1, failing size, target and contrast at once. The browser sweep also found debt nobody had listed, because nobody had been able to reach those screens: 10 undersized text nodes in Performance and **43** in Reviews, plus a 23px `ckm-rev__subtab` and a 16px `ckm-rev__details`. All fixed. One new token pair, `--ckm-info` / `--ckm-info-bg`, because the platform score runs A–F and the existing warm semantics covered only four of the five bands.

##### Verification

- **288 mobile tests in 25 files** (was 251 in 22). Full suite **829/831**; the 2 failures are the same pre-existing `AppShell.render.test.jsx` ones, re-confirmed this session by stashing every change and watching the identical 2 fail. Lint clean on the whole mobile tree. Production build + 53-route prerender pass.
- New `data/dashboardModel.test.js` (21 tests) is written against fixtures **transcribed from `dashboardController.js`**, not from client code — that distinction is the whole point, since every previous test used the client's own invented shape and so agreed with the bug. It asserts `payload.score === undefined` before asserting the mapping reads `rating`, so the regression cannot come back quietly.
- New `screens/Dashboard.render.test.jsx` and `screens/sections/ProjectsSection.test.jsx` assert the things a model test cannot: that Create/Upload/Edit-profile/Top-Scripts/project-title are **links with the right `href`**, that Share is not nested inside the card's link, that the filter is a real radio group with a recovery path, that the rejected notice renders, and that a total failure produces a `role="alert"` message whose retry **re-issues the requests** and then clears.
- **Real browser, five widths (320/360/390/430/768), headless Chrome via CDP.** On the shipped two-tab dashboard: 0 undersized targets, 0 text under 11px, 0 unnamed controls, 0 elements past the frame, no horizontal scroll, and no "Placeholder" string, at every width. Then, with the four tabs **temporarily restored locally and reverted immediately after** (the only way to reach the other sections), the same sweep over Performance, Reviews, Projects and the AI-detail / all-projects / account overlays at all five widths: **0 real violations** after the fixes above, 0 nested interactive elements, 0 orphan `<li>`.
- The load-bearing checks a unit suite cannot make, measured in a real browser: the project card's tap region is genuinely the whole card — **4 of 4 probe points** well away from the title resolve to the title's link — while Share stays a sibling and is still independently hittable; the AI sheet opens as `role="dialog" aria-modal="true"` named "The Last Scene" with the scroll surface *and* app bar measuring `inert`, focus inside, and **14 dispatched Tab presses escaping 0 times**; Escape closes it, clears every `inert`, and — with the opener focused for real rather than by a synthetic `.click()` — **restores focus to `ckm-rev__details` exactly**; the account sheet's four items are real anchors (`/profile`, `/contact`, `/terms`, `/privacy`) with logout as the one button, and it hands over to a `role="alertdialog"` whose focus lands on **Cancel**, not "Log out".
- Baselines recaptured at all five widths; the previous images are archived in `baselines/phase0-dashboard/pre-phase2-data-truth/`.

##### Follow-ups recorded, not silently absorbed

1. **Desktop bug, unfixed on purpose.** `pages/Dashboard.jsx` filters `myScripts` to `status === "published"` and then computes `pending`/`rejected` from it, so both status notices it renders are unreachable on desktop. Mobile does not filter and now shows both. Fixing desktop is out of this phase's scope; it is logged here so it is not rediscovered as a mobile inconsistency.
2. **The locked-analytics state is unhandled on both platforms.** The server returns `profileViews: null` + `isAnalyticsLocked: true` for a free writer; desktop coerces it to `0` and so says "0 profile views" where the truth is "upgrade to see this". Mobile now carries `analyticsLocked` through the model and shows "—" plus an "Upgrade to view" badge, but there is no upgrade destination behind it yet, and desktop still shows the misleading zero.
3. **`ckm-tabs` (SectionTabs) is still the legacy strip**, superseded by `ckm-tabbar`. Its size/contrast failures are fixed but the primitive migration is not done; it is entangled with the tab-set question above and should be done with whatever answer that gets.
4. `/dashboard/reviews` also returns `readers[]` and `platform[]`. Neither platform renders either. Not a regression — noted because the data is already being fetched and paid for.
5. Mobile still has no socket refresh; desktop refetches on seven `collab_*` events. The cache and retry landed this session; the socket did not.

---

#### 2026-08-07 — Claude (Claude Code) — Phase 1 (role-aware chrome) — **Phase 1 closed**

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint:** Verified against the repository before claiming, as §20.4 requires — `components/feedback/` and `hooks/useOnlineStatus.js` were present and uncommitted, and no role-aware bar existed, so the ledger was accurate. The item was claimed in §19.1 before any code was edited (§20.8).

**Work item claimed:** Phase 1 bullet 2 — role-aware top app bars and bottom navigation — the last open bullet, plus closing the phase.

**The blocking decision, and what changed it**

The previous session left this blocked on user approval of §8.2's four proposed five-tab sets. Before asking, this session searched for how the desktop app decides its own navigation, and found that **the question was already answered in code**: `client/src/layouts/app-shell/navigation/buildNav.js` builds a hard-capped four-slot *mobile* bar from each audience preset's `mobileKeys`, with Profile always last. §8.2 had been written without knowledge of it, and its proposals conflicted with it for all four audiences.

That reframed the question from "approve these tab sets" to "which model owns the tab sets", and it was put to the user that way. **The user chose the existing presets** and chose to build the chrome now rather than carry it into Phase 2. §8.2 is rewritten to record the decision, with the superseded proposal kept in a collapsed block.

The reason the preset model wins is written in `buildNav.test.js`'s own header and is not hypothetical: the app previously had two independent navigation systems, a feature was added to only one, and every writer had a live competition they could not reach from anywhere in the UI. A second, mobile-only list of destinations would have rebuilt exactly that.

**Research performed**
- Sources fetched: [W3C Understanding SC 3.2.3 Consistent Navigation](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html) — "same relative order … unless a change is initiated by the user", and the definition that inserting or removing items does not break relative order; [MDN `aria-current`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current) — `page` for the current page in a set, and "only mark one element in a set of elements as current"; [Android Developers: Navigation bar](https://developer.android.com/develop/ui/compose/components/navigation-bar) — three to five destinations of equal importance, consistent across screens. Added to §17 as sources 23–25.
- **Two sources were attempted and are deliberately not cited.** Material 3's navigation-bar guidelines page and Apple's HIG tab-bars page both render through client-side script and returned empty documents; the summariser answered from recollection rather than from the page. Citing either would have put unverified claims in this plan under an authoritative-looking link. Recorded as an honest gap in §17 with the Android page standing in as the server-rendered equivalent that was actually read.
- Repository research: `layouts/app-shell/navigation/{buildNav,symbols}.js` and all four presets; `layouts/app-shell/shellPolicy.js` (the exhaustive role→audience map and why an unmapped role falls back to *reader* rather than writer); `hooks/useShellIdentity.js` and `utils/profilePath.js` (which returns a bare root segment such as `/ada` whenever the account has a username — the fact that decided the profile tab's matching rule); `hooks/useShellNotifications.js` (a socket plus a 30s poll — the reason the unread badge is a parameter here rather than a second session); `mobile/routes/mobileRoutePolicy.js`; `components/{TopBar,BottomNav}.{jsx,css}`.
- Decisions adopted: the mobile module **adapts, never declares**; the active tab is derived from the URL through React Router's matcher, never passed in; a tab is a link.
- Patterns rejected and why: **a mobile-only tab manifest** (the two-navigation defect above, in a new place); **reordering or hiding tabs on scroll** (SC 3.2.3, and a bar that moves under the thumb is worse on a phone than one that costs 62px); **`role="tablist"` for the bar** (these are destinations with URLs, not panels — the APG tablist contract would replace browser navigation the user already has); **mounting `useShellNotifications` in mobile chrome** (it would double the app's notification traffic on a device already running the desktop shell's copy).

**Desktop parity inventory**
- Desktop files inspected, none changed: `buildNav.js`, the four presets, `shellPolicy.js`, `useShellIdentity.js`, `useShellNotifications.js`, `utils/profilePath.js`.
- Data/services/hooks: `buildNav` and `getProfileCanonicalPath` are consumed directly. No new endpoint, no new request. The unread badge is a prop; nothing fetches it yet.
- Roles/permissions: every role in `KNOWN_ROLES` is asserted to produce a four-tab bar ending in Profile, and no non-writer audience is asserted to be offered `/create-project` or `/upload`.
- Routes/query/navigation: `location.state.startFresh` is threaded onto the Create tab, so the tab opens a new draft rather than resuming the last one.

**Wireframe/design decision**
- Shell: unchanged. Both bars mount through `MobileShell`'s existing `appBar` and `bottomNav` slots; nothing new was added to the shell contract.
- `PageHeader` (`detail`) and `AppBar` (`standard`) are the two app bars, and cannot collide — the shell has one `appBar` slot.
- The app bar owns only the home link and the search entry; the bell and avatar are an `actions` slot, because they are wired to state a *screen* owns.
- Search is a link, not an input: a text field in fixed chrome opens the keyboard over the content being searched, so the native pattern is an entry point to a screen that owns the input.

**Changes made**
- Files added: `mobile/navigation/mobileNav.{js,test.js}`, `mobile/hooks/useMobileNav.js`, `mobile/components/app-bars/AppBar.{jsx,css,test.jsx}`, `mobile/components/navigation/NavBar.{jsx,css,test.jsx}`.
- Files modified: `theme/tokens.css` (`--ckm-accent-on-dark`), `theme/cssPrefixRegistry.js` (2 new prefixes; `ckm-topbar`/`ckm-bottomnav` re-noted as superseded), `screens/Dashboard.jsx` (adoption), `dev/PrimitiveGallery.{jsx,css}` (all four audiences' chrome), `baselines/phase0-dashboard/` (recaptured, previous images archived), and this plan (§7.2, §8.2, §11, §17, §19).
- Shared logic extracted: "which destinations does this viewer get" and "which tab is the URL on" now have exactly one implementation each, composed by `useMobileNav`, so the app bar and the tab bar cannot disagree.
- Route/prefix registration: `ckm-appbar`, `ckm-navbar`.

**Verification**
- Automated: `npx vitest run src/mobile` → 22 files / 251 tests (was 19 / 206). Full `npx vitest run` → 792 passed / 2 failed. The 2 failures were confirmed pre-existing by stashing this session's changes and re-running that file: the identical 2 fail without any of this work. ESLint clean on every touched file. `npm run build` → passed, 53 routes prerendered.
- Viewports: headless Chrome over CDP at 320×720, 360×800, 390×844, 430×932, 768×1024, against `/__mobile-primitives` (all four audiences at once) and `/__mobile-preview` (the real dashboard). Identically at every width: **0** targets under 44×44 (`::after` hit regions measured through `getComputedStyle(el, "::after")`, which is what proves the 34px avatar's 44px region), **0** text under 11px, **0** unnamed links or buttons, **0** contrast failures, **0** elements past the 520px frame, `documentElement.scrollWidth === innerWidth`, and 16/16 tab labels rendered without clipping.
- The load-bearing measurements are the ones a unit suite cannot reach: the selected tab computes to `rgb(221,90,66)` at **5.13:1** on the bar's `rgb(15,15,15)`, its glyph's `FILL` axis at **1** against the idle tab's **0** (so selection is not carried by colour alone — SC 1.4.1), the idle label at 19.17:1, both badges at 4.72:1 and the app-bar search label at 5.21:1. Tabs measured 49px tall and 80/90/96/106/128px wide by viewport. Real dispatched Tab keys walked **4** stops, one per destination, each with a measured `rgb(255,255,255) 2px solid` ring.
- Accessibility: exactly **1** element carried `aria-current` with the state applied, and **0** on a URL belonging to no tab.

**Decisions or deviations**
- **Decision: `TopBar` and `BottomNav` superseded, not upgraded** — the fourth time this call has been made the same way (`ckm-btn`→`ckm-button`, `ckm-tabs`→`ckm-tabbar`, `ckm-sheet`→`ckm-bottom-sheet`, `ckm-island`→`ckm-toast`). The shape genuinely differs: the old bar's items were `<button>`s calling `onSelect`, so a destination could not be opened in a new tab, long-pressed or copied; and its current tab was a prop that every caller set to the constant `"dashboard"`. Unlike the previous three, this one had a single call site, so the dashboard was migrated in the same slice rather than deferred — which is why the Phase 0 visual baseline was recaptured rather than preserved.
- **Deviation from the earlier supersede precedent, stated plainly:** the previous sessions left the old component mounted alongside the new one during migration. Here the old components have **no** remaining caller, but the files and their prefixes were still left in place, because deleting them is a separate change from replacing their behaviour and Phase 2's first tasks already touch that family. The deletion is written into `next_action` so it is a scheduled task rather than a forgotten file.
- **Finding: `--ckm-accent` is not usable as text on the dark bar.** Measured at ~4.35:1 on `#0f0f0f`, so the selected tab's 11px label would have failed SC 1.4.3 — the mirror image of the problem `--ckm-accent-strong` already solves on light surfaces. Added `--ckm-accent-on-dark: #dd5a42`, the same hue lightened only as far as 4.5:1 requires, measured in the browser at 5.13:1.
- **Finding: the provisional bar was below three of the plan's own floors**, and none of it had ever been in a CDP sweep. Its label and badge were 9px against §7.3's 11px floor, its item measured ~42px against §7.4's 44px, and its `justify-content: space-around` made the gaps between targets wider than the targets. The app bar was the same story: a 38px bell, a 34px avatar and a search label in a literal `#b3ac9f` measuring roughly 2.2:1. All corrected; all re-measured.
- **Finding: the profile tab cannot be prefix-matched.** `getProfileCanonicalPath` returns a bare root segment (`/ada`) whenever the account has a username, and the app's canonical project URL is *also* two root segments (`/:projectHeading/:writerUsername`) — so a prefix match would light the profile tab on someone else's project page whenever a heading collided with the viewer's username. It is matched exactly, which costs nothing because the profile's own sub-views are query-string tabs. A first attempt generalised this to "any single-segment path", which was wrong — nearly every tab path is one segment, and it would have broken `/messages/123` keeping Messages selected. The rule is keyed to the tab whose path is user data.
- **Honest note on the sweep:** its first run reported the selected tab as white and looked like a cascade defect. Diagnosing it against the DOM (rather than adjusting the probe until it agreed) showed only two colour rules matched and the more specific one *was* the accent — the probe was reading `getComputedStyle` in the same tick it added the class, so it captured the `transition: color` mid-flight at its start value. The probe now settles the transition before measuring. Same class of harness defect as the last two sessions found, and diagnosed the same way.
- User approval: obtained for the tab sets and for closing Phase 1 with this bullet (§8.2).

**Open issues/blockers**
- **A real finding that belongs to Phase 2, measured here because the sweep now covers the whole shell:** the dashboard's own content — not the new chrome — has 5 text nodes below the 11px floor (`ckm-ov__mover-head` 8.5px, `ckm-ov__mover-note` 10.5px, three `ckm-ov__top-meta` 10px) and roughly 25 colour pairs below 4.5:1, the worst being `ckm-ov__top-rank` at 1.82:1 and `ckm-ov__glance-label` at 2.69:1. This is Phase 0 baseline debt; the Phase 2 dashboard slice owns it. Listed in `next_action` so it is not rediscovered.
- The unread badge is **not wired**. `NavBar`/`AppBar` accept `msgCount` and the dashboard does not pass one, so the Messages tab shows no count in production. Wiring it means giving mobile access to the shell's notification session without standing up a second socket — a Phase 2 "wire real services" task.
- The role-aware bar is **exercised, not yet reachable, for three audiences.** `/dashboard` is the only implemented mobile route and its manifest entry is writer-only, so the industry, reader and admin bars exist and are verified in the gallery and in tests, but no production URL renders them yet. That resolves as Phase 7 lands those audiences.
- Tapping a tab other than Dashboard **leaves the mobile experience** and lands on the responsive desktop page, because the route policy marks those routes `desktop-migration-fallback`. That is §5.1's sanctioned behaviour and is a better answer than the "use desktop" dead end it replaces, but it is a seam a user can feel until Phase 2–5 land those screens.
- `useKeyboardInset` remains unexercised (carried). 200% text zoom remains unexercised (carried) — the four-column tab bar at 320px is now the most likely thing to break under it. The `@supports not selector(:has(a))` fallback remains unexercised (carried). The safe-area-top change from Phase 0 is still unverified on a notched device (carried).
- The two `AppShell.render.test.jsx` failures remain pre-existing desktop-shell debt in their own workstream, re-confirmed as unrelated this session.

**Exact next action**
- As recorded in §19.1: open Phase 2 and claim its first bullet, the dashboard research/parity audit against desktop `pages/Dashboard.jsx`, then the three follow-on tasks in order (wire real services; migrate the four overlays onto `Sheet` and delete `BottomSheet`; retire every `desktopOnly()` call-site and delete `DynamicIsland`). Delete the now-callerless `TopBar`/`BottomNav` files and drop their prefixes while there.

---

#### 2026-08-05 20:40 +05:30 — Claude (Claude Code) — Phase 1 (the state set)

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint:** Verified against the repository before claiming, as §20.4 requires — there was no `components/feedback/` directory and no `useOnlineStatus`, so the ledger's `next_action` was accurate. The item was claimed in §19.1 before any code was edited (§20.8).

**Work item claimed:** Phase 1 bullet 7 in full — toast/status, inline error, retry, skeleton, empty state, offline — including the three decisions the previous session's `next_action` demanded be made explicitly.

**Research performed**
- Sources fetched: [ARIA APG Alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) — assertive and interrupting, must never take focus, not announced if already present at load, and **"avoid designing alerts that disappear automatically"**; [W3C Understanding SC 2.2.1 Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) — the exception list, and its worked example that a notification may vanish *because the information stays reachable elsewhere*; [MDN `navigator.onLine`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine) — "inherently unreliable", `true` non-conclusive (a LAN with no upstream still reports online), `false` more trustworthy, and the explicit instruction to hint rather than to disable. Added to §17 as sources 20–22.
- Repository research: `components/DynamicIsland.jsx` (the message is a `<button>`; single slot, no queue; 3s auto-dismiss for everything; its production purpose is `notify.desktopOnly()`), `components/lists/LoadMore.jsx` for the SC 4.1.3 status contract the plan told this session to reuse, `hooks/useInertBackground.js`, `shell/MobileShell.{jsx,css}` and `components/BottomNav.css` (the tab bar's height is content-driven, not the `--ckm-bottom-nav-h` token — the reason the toast lift is measured rather than assumed).
- Decisions adopted: the toast/inline split is **"something happened" vs "something is"**, and it decides shape everywhere in this slice; the persistence rule is enforced in code rather than written in a comment; connectivity is reported asymmetrically because the two values are not equally trustworthy.
- Patterns rejected and why: **hosting the toast in `MobileShell`** — the plan's `next_action` suggested it and it solves the bottom-nav offset for free, but the most common toast in any app ("Project deleted", then navigate) is raised immediately before a route change, and a shell-hosted host unmounts with the outgoing screen, destroying the message at the moment it is meant to be read; **stacking multiple toasts** — two on a 320px phone is most of the screen and two live regions changing at once is a screen reader talking over itself; **a fifth `Button` intent for the toast action** — the terracotta `tertiary` label measures 3.99:1 on ink, and the plan allows four intents deliberately, so the toast draws its own action instead; **auto-dismissing anything actionable** — source 20, directly.

**Desktop parity inventory**
- Desktop files inspected: none changed. These are presentation primitives with no service dependency.
- Data/services/hooks: none consumed. `useOnlineStatus` reads a browser API, not an endpoint, and deliberately fires no request of its own.
- Roles/permissions/quotas, routes/query/navigation: unchanged.
- Page states and child overlays: this slice *is* the state set; the overlay set is unchanged apart from the inert exemption.

**Wireframe/design decision**
- Shell: gained one slot it did not have — the connectivity region, below the app bar and above the scroll body, in flow. Every screen inherits it by adopting the shell, the contract §5.6 already established for scroll-depth analytics. `onConnectionRestored` is the only new prop.
- Scroll hierarchy: unchanged. The toast layer is absolutely positioned and adds no scroll surface; asserted by the sweep's single-`<main>` and no-horizontal-scroll checks.
- Primary/secondary actions: a toast carries at most one action, deliberately. Two competing actions in a surface that may vanish is a decision the user is being rushed into; if a real choice is needed that is a `ConfirmDialog`, which is modal precisely because it waits.

**Changes made**
- Files added: `components/feedback/` — `toastContext.js`, `Toast.{jsx,css}`, `ToastProvider.jsx`, `InlineMessage.{jsx,css}`, `OfflineBanner.{jsx,css}`, `Skeletons.{jsx,css}`, `feedback.test.jsx`; `hooks/useOnlineStatus.js`.
- Files modified: `hooks/useInertBackground.js` (the live-region exemption), `hooks/overlayHooks.test.jsx` (its regression test), `shell/MobileShell.{jsx}` + `MobileShell.test.jsx` (the banner, asserted for all six modes), `MobileApp.jsx` (ToastProvider above the router), `components/EmptyState.jsx` (`titleAs`), `theme/cssPrefixRegistry.js` (3 prefixes + a second owner for `ckm-skel`), `dev/PrimitiveGallery.jsx` (five new rows), and this plan (§7.2, §11, §17, §19).
- Shared logic extracted: "may this message disappear?" and "does this message interrupt?" are now two pure functions in one module, so a fifth caller cannot answer them differently.
- Route/prefix registration: `ckm-toast`, `ckm-message`, `ckm-offline`; `ckm-skel` re-registered with two owner files.

**Verification**
- Automated: `npx vitest run src/mobile` → 19 files / 206 tests (was 18 / 179). Full `npx vitest run` → 747 passed / 2 failed, the same pre-existing `AppShell.render.test.jsx` failures carried since Phase 0. ESLint clean on every touched file. `npm run build` → passed, 53 routes prerendered.
- Viewports/devices/browsers: headless Chrome over CDP at 320×720, 360×800, 390×844, 430×932, 768×1024. Identically at every width: 10 state surfaces with **0 targets under 44×44** (`::after` hit regions measured, not assumed), 0 unnamed controls, 0 text under 11px, 0 elements past the frame, `documentElement.scrollWidth === innerWidth`.
- Accessibility checks: the decisive one is the inert exemption **measured in a real browser** — with a full-screen dialog open, `.ckm-shell__app-bar`, `.ckm-offline` and `.ckm-shell__scroll` all carried `inert` while `.ckm-toast__layer` did not, and a toast raised beforehand was still tappable *and was actually dismissed* from over the dialog. Also: the error toast routed to `role="alert"` and the rest to `role="status"`; a real dispatched Tab produced `solid 2px rgb(255,255,255)` on the toast's dismiss control (the shared terracotta ring is near-invisible on ink, so this surface overrides it); the error icon measured 8.66:1 on ink and the offline banner 4.90:1.
- Offline was exercised with real `Network.emulateNetworkConditions`, not a stub: `navigator.onLine` flipped to `false`, the banner appeared, was measured as *displacing* the scroll body rather than covering it, then showed the recovery state with a 78×44 action that cleared on dismiss.
- Timing was re-verified in a real browser because the unit suite stubs framer-motion: an acknowledgement still present at 3.4s and gone by 6.0s; a three-message queue advancing First → Second → error in order; the error still on screen at t+15s; and under emulated `prefers-reduced-motion` the toast still appeared and still left, with the skeleton pulse measured at `1e-06s`.
- Performance checks: no new dependency. The toast layer renders two empty divs when idle; skeletons are CSS-animated with no JS timer.

**Decisions or deviations**
- **Decision: `DynamicIsland` superseded, not upgraded** — the call the previous session's `next_action` asked for, made the same way as `ckm-btn`→`ckm-button`, `ckm-tabs`→`ckm-tabbar` and `ckm-sheet`→`ckm-bottom-sheet`. Reason, and it is a shape difference rather than a style one: the Island makes the entire message a `<button>`, so it can never carry an "Undo" (a button cannot nest in a button) and its accessible name is the whole card; it has one slot and no queue, so a second message clobbers the first; it auto-dismisses everything at 3s including errors; and its one production caller is `notify.desktopOnly()`, which §2.8 deletes by completion. Both providers are mounted during migration, with a comment in `MobileApp.jsx` recording that no single screen may use both (§13).
- **Decision: the persistence rule is enforced, not documented.** `toastPersists()` makes an error or an actionable toast ignore any `duration` it is handed, and says so in a dev-mode warning. Reason: source 20 says plainly to avoid alerts that vanish, and source 21's own example shows the test is whether the information survives elsewhere — an "Undo" that fades has taken the user's ability to act with it. A rule that lives only in a comment is a rule the fifth call-site breaks.
- **Finding, and the reason `aria-atomic` is absent: a test caught a double-announcement.** The obvious markup — `aria-atomic="true"` so the whole region is read rather than a fragment — is wrong here. A dismissed toast stays mounted for the length of its exit animation, so for ~200ms the region holds the outgoing message *and* the next one from the queue, and atomic would read both as one utterance. Left non-atomic, only the added subtree is announced (the new toast in full) and removals are announced not at all. The same reasoning removed it from the offline banner.
- **Decision: `useOnlineStatus` derives its recovery state during render, not in an effect.** ESLint's `react-hooks/set-state-in-effect` flagged the first version and was right twice over: the effect form is a cascading render, and it also renders one frame of the wrong thing — the bar would still read "offline" for a frame after the connection returned.
- **Known, deliberate: the offline banner goes inert while a modal is open.** Measured, not assumed. It is screen chrome that sits visually behind the dialog, so announcing it while it cannot be seen or reached would be the mismatch; a modal that needs to report a connectivity failure reports it inline, or raises a toast, whose layer *is* exempt. Recorded here so it is a decision rather than a surprise.
- **Honest note on the sweep:** it reported 5 failures on the first run, all one assertion, and **all 5 were harness defects**. The probe asserted `.ckm-shell` was inert; the DOM showed it correctly is not — the overlay lives *inside* the shell, so the shell is the walk's container and what must go inert is its other children. Diagnosed by dumping the actual inert tree before touching the probe, rather than by relaxing the check.
- **Deviation worth naming:** `EmptyState`'s new `titleAs` defaults to `"div"`, preserving the existing markup exactly, rather than to a heading. A titled block with no heading is worse markup, but this component is a verified Phase 0 baseline used by four dashboard sections, and moving its heading outline belongs to the Phase 2 slice that owns the dashboard. New callers pass `titleAs="h3"`; the gallery does.
- User approval, if required: none — covered by the canonical plan.

**Open issues/blockers**
- **Phase 1 bullet 2 is blocked on a product decision**, and it is now the only thing between this phase and its exit gate. §8.2 says the two-item Dashboard/Challenge bar is provisional and proposes writer/industry/reader/admin tab sets that need user approval. See `next_action`.
- The unit suite **stubs framer-motion** in `feedback.test.jsx`, because happy-dom never completes an exit animation and every queue assertion would otherwise be testing the animation library. The behaviour that stub gives up is re-verified in a real browser (above), but it is a seam future sessions should know exists.
- Swipe-to-dismiss on a toast was **not built and not verified**. §14 forbids an action available only by gesture, so the dismiss button is the contract; a swipe would be an addition, needing real touch input to test.
- The toast layer's bottom-nav clearance depends on one `:has()` rule. `CSS.supports("selector(:has(a))")` measured `true` in Chrome 150, so **the no-`:has()` fallback path is unexercised** — the same debt Card and Chip already carry.
- `useKeyboardInset` remains unexercised (carried). A toast is bottom-anchored, so it is now a third component that the virtual keyboard can interact with, and nothing here proved that either.
- 200% text zoom remains unexercised (carried). The toast's three-column grid at 320px is the most likely thing to break under it.
- The safe-area-top change from Phase 0 is still unverified on a notched device (carried).
- The two `AppShell.render.test.jsx` failures remain pre-existing desktop-shell debt in their own workstream.

**Exact next action**
- As recorded in §19.1: decide bullet 2 — ask the user to approve the §8.2 tab sets and build the role-aware chrome, or close Phase 1 explicitly without it and carry it into Phase 2. Do not tick it silently. Either way the first code task after is Phase 2's dashboard parity audit, then migrating the four dashboard overlays onto `Sheet` and the `desktopOnly()` call-sites onto `useToast()`.

---

#### 2026-08-05 18:45 +05:30 — Claude (Claude Code) — Phase 1 (overlay set + focus/scroll helpers)

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint:** Verified against the repository before claiming, as §20.4 requires — there was no `components/overlays/` directory and no focus-trap or scroll-lock hook in `hooks/`, so the ledger's `next_action` was accurate.

**Work item claimed:** Phase 1 bullet 8 (scroll lock, focus trap/restoration, reduced motion, safe-area/keyboard helpers) **first**, then bullet 6 (the overlay set) on top of them, in the order the previous session's `next_action` specified.

**Research performed**
- Sources fetched: [W3C ARIA APG Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) (initial focus placed deliberately — *least destructive option* for a destructive action; Tab/Shift+Tab wrap; Escape; focus returns to the invoker unless it is gone; and the warning not to claim `aria-modal` unless interaction outside really is prevented); [MDN `inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert) (no clicks, no focus, no selection, no find-in-page, **and removed from the accessibility tree**); [MDN `<dialog>`/`showModal()`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog); [APG Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) and [APG Menu](https://www.w3.org/WAI/ARIA/apg/patterns/menu/) (roving tabindex, arrows, Escape returns focus to the button, **Tab exits the menu entirely**); [Inclusive Components: Menus & Menu Buttons](https://inclusive-components.design/menus-menu-buttons/). Added to §17 as sources 16–19.
- Repository research: `components/BottomSheet.jsx` (the dashboard-era sheet — Escape only, no focus trap, no inert, no scroll lock), `MobileApp.css` (`.ckm-root` is `max-width: 520px; overflow: hidden; isolation: isolate` — the fact that decided the `<dialog>` question), `MobileApp.jsx` (`ckm-html-lock` already locks the document), `MobileShell.jsx` (`overlays` slot is never mode-gated; `.ckm-shell` is `position: relative`).
- **A capability probe was run before designing, not after**: happy-dom implements `showModal()` and reflects `inert`, but enforces *neither* modal focus containment nor inertness — focus moved to a button outside an open modal and it took it. That removed "the browser does it and my tests prove it" as an argument for either design, and set the expectation that the CDP sweep is the only real proof. Recorded at the top of `Overlay.jsx` for whoever revisits the decision.
- Decisions adopted: the background is hidden with the browser's own `inert`, so the hard half of "modal" is not hand-written; the focus trap is only the small remainder (the wrap and the restoration policy); a destructive confirmation focuses Cancel; Escape and the scrim both resolve to *cancel*, never confirm.
- Patterns rejected and why: **native `<dialog showModal()>`** — better at focus containment, but the top layer is viewport-scoped and escapes `.ckm-root`, so at the 768px verification width the app is a 520px column and the dialog would be 768px wide, forcing every overlay to re-declare the frame geometry in a second place that can drift; **`role="menu"` for the context menu** — a desktop application-menu contract (arrows, Tab leaves) imposed on a short list of actions and links, replacing behaviour every user already has with behaviour they must discover; **drag-to-dismiss bound to the whole sheet surface** — it dismisses when the user meant to scroll the body, so the gesture is bound to the grip and header via drag controls.

**Desktop parity inventory**
- Desktop files inspected: none changed. These are presentation primitives with no service dependency.
- Data/services/hooks, roles/permissions/quotas, routes/query/navigation, page states: unchanged.

**Wireframe/design decision**
- Shell/top bar/bottom nav/back behaviour: unchanged; this slice adds no screen. Overlays mount through `MobileShell`'s existing `overlays` slot, outside the scroll surface.
- Scroll hierarchy: each overlay is a three-part column (fixed header / one scroll body / fixed footer) — deliberately the same shape as `MobileShell`, because a full-screen dialog *is* a screen while it is open. Asserted by test: exactly one `.ckm-scroll` inside a Dialog.
- Primary/secondary actions: `ConfirmDialog` puts Cancel first in the DOM (so Tab and a screen reader reach the safe option first) and reverses the visual order in CSS.

**Changes made**
- Files added: `hooks/` — `tabbable.js`, `useFocusTrap.js`, `useInertBackground.js`, `useScrollLock.js`, `useReducedMotion.js`, `useKeyboardInset.js`, `useOverlay.js`, `overlayHooks.test.jsx`; `components/overlays/` — `Overlay.{jsx,css}`, `Sheet.{jsx,css}`, `Dialog.{jsx,css}`, `ConfirmDialog.{jsx,css}`, `ActionSheet.{jsx,css}`, `overlays.test.jsx`.
- Files modified: `theme/base.css` (`.ckm-scroll.is-locked` → `is-scroll-locked`, with `touch-action: none`), `theme/cssPrefixRegistry.js` (5 prefixes; `ckm-sheet` re-noted as superseded), `dev/PrimitiveGallery.jsx` (two new rows, the four overlays wired into the shell's overlays slot, and a chip specimen corrected from `onClick` to `onSelect`), and this plan (§7.2, §11, §17, §19).
- Shared logic extracted: focus trapping, focus restoration, background inertness, scroll locking and Escape now have exactly one implementation each, composed by `useOverlay` so a fifth overlay cannot be written that forgets one.
- Route/prefix registration: `ckm-overlay`, `ckm-bottom-sheet`, `ckm-dialog`, `ckm-confirm`, `ckm-action-sheet`.

**Verification**
- Automated: `npx vitest run src/mobile` → 18 files / 179 tests (was 16 / 138). Full `npx vitest run` → 720 passed / 2 failed, the same pre-existing `AppShell.render.test.jsx` failures carried since Phase 0. ESLint clean on every touched file. `npm run build` → passed, 53 routes prerendered.
- Viewports/devices/browsers: headless Chrome over CDP at 320×720, 360×800, 390×844, 430×932, 768×1024, opening all four surfaces at each width. Identically at every width: 22 controls, **0 targets under 44×44** (`::after` hit regions measured, not assumed), 0 unnamed controls, 0 text under 11px, 0 elements past the 520px frame once the deliberately-scrolling chip rail is excluded, and `documentElement.scrollWidth === innerWidth`.
- Accessibility checks: the decisive evidence is **real dispatched key events** — 14 forward Tabs and 6 Shift+Tabs per surface per width (400 key events) never once put focus outside the surface. Escape then closed the surface, cleared `inert` from the background, released the scroll lock, restored the exact prior scroll position, and returned focus to the opening control. A destructive confirmation focused **Cancel** at all five widths. With a confirm dialog stacked over an action sheet: two layers, lower measured `inert`, upper live, focus inside the upper, and Escape closed only the top and made the sheet below live again.
- Performance checks: no new dependency (framer-motion was already in use by the dashboard sheets). Overlays render only when open, so a closed overlay costs nothing.

**Decisions or deviations**
- **Defect found and fixed by its own test — stacked overlays made each other inert.** The obvious design, "each overlay marks its own siblings inert", left a confirm dialog over a sheet with *both* surfaces inert and neither usable; which one won depended on effect order. Replaced with a single module-level stack in `useInertBackground`: only the topmost overlay is live, and every change recomputes from scratch. The lower overlays are siblings of the top one, so they are made inert by that same walk rather than by a rule of their own.
- **Worse defect the unit suite could not see — the inert walk was killing tap-to-dismiss.** The scrim is a *sibling* of the surface, so a walk starting at the surface marked the scrim inert, and an inert element fires no click events. happy-dom does not enforce `inert`, so the test asserting scrim dismissal passed anyway. Fixed by giving `useOverlay` two refs — inertness is computed from the layer (keeping the scrim live), the focus trap is scoped to the surface (keeping the scrim out of the tab order). A regression test now asserts the scrim is not inside `[inert]`, and the CDP sweep proves the click still lands.
- Decision: `useScrollLock` locks the shell's `<main>`, not `body`. Reason: `ckm-html-lock` already locks the document, so the copy-pasted `body` scroll lock is a **no-op in this app**; and `inert` is not a substitute, because a touch drag over an inert scroll container still scrolls it.
- Decision: reduced motion *changes* the animation rather than shortening it. Reason: `theme/base.css` cannot reach framer-motion's inline transforms, and a sheet that still travels the height of the screen in 1ms is a flicker — worse for a vestibular disorder than the cross-fade it should have been.
- Decision: the full-screen dialog titles itself with an `<h2>`. Reason: the screen's own `<h1>` is still in the document while the dialog is open (inert, so unreachable, but present); emitting a second `<h1>` that is only sometimes hidden is more fragile than nesting under the one that is always there.
- Decision: `BottomSheet.jsx` superseded, not upgraded. Reason: consistency with the two precedents already set (`ckm-btn`→`ckm-button`, `ckm-tabs`→`ckm-tabbar`) — it is a verified Phase 0 baseline used by four dashboard overlays, and rewriting it here would move a baseline that is not this slice's to move. Phase 2 owns the migration.
- Honest note on the first sweep: it reported 29 failures, and **all 29 were harness defects, not product defects** — the probe read the scroll position before `.focus()` scrolled the opener into view, did not treat `<label for>` as naming a control, and did not exclude the chip rail that scrolls sideways on purpose. Each was diagnosed against the DOM before being changed, rather than the threshold being relaxed until it passed.
- User approval, if required: none — covered by the canonical plan.

**Open issues/blockers**
- `useKeyboardInset` is **unexercised**. It is wired into both sheet and dialog footers, but headless Chrome has no virtual keyboard, so nothing in this session proved it. It is the same debt §16.4 already carries for the form family, now with a second component depending on it.
- Drag-to-dismiss was **not** verified. It needs real touch input; the CDP sweep dispatches keys and clicks only. `touch-action: none` on the grab region is the part most likely to be wrong on a device.
- The `@supports not selector(:has(a))` fallback in Card/Chip remains unexercised (carried).
- 200% text zoom remains unexercised (carried). The centred confirm dialog's `max-height` is the most likely thing to break under it.
- The safe-area-top change from Phase 0 is still unverified on a notched device (carried).
- The two `AppShell.render.test.jsx` failures and the four unused-`motion` lint errors remain pre-existing debt in their own workstreams. This session avoided adding a fifth by aliasing the import (`motion as Motion`) rather than suppressing the rule.

**Exact next action**
- As recorded in §19.1: build the state set (bullet 7) — toast/status, inline error, retry, skeleton, empty state, offline — reusing `ckm-empty`/`ckm-skel` and LoadMore's SC 4.1.3 contract, and making the explicit supersede-or-upgrade call on `components/DynamicIsland.jsx` that this session made for `BottomSheet.jsx`.

---

#### 2026-08-05 17:55 +05:30 — Claude (Claude Code) — Phase 1 (collection and display family)

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint:** Phase 1 action primitives and form family complete; the ledger's `next_action` named the collection and display primitives, starting with list row and card.

**Work item claimed:** The whole of Phase 1 bullet 5 — list row, card, chip, badge, segmented control, tabs, pagination/load-more.

**Research performed**
- Sources fetched: [W3C ARIA APG Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) (roving tabindex so the bar is one Tab stop; Left/Right with wrap and Home/End; activation follows focus when panels render without latency; `tabindex="0"` on a panel that has no focusable content); [W3C Understanding SC 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) (a *count* — "18 results returned" — is a status message and must be announced through role/properties without taking focus, while the result list itself is not); [Inclusive Components: Cards](https://inclusive-components.design/cards/) (a block link makes the card's entire text the link's accessible name and forbids any second control inside it; the fix is one heading link whose `::after` covers the card, with nested controls raised by `position: relative`). All three added to §17 as sources 13–15.
- Repository research: `screens/sections/ProjectsSection.css` for the established card and collaborator-row language (hairline borders, Spectral titles, 14–18px radii), `components/SectionTabs.css` for the legacy `ckm-tabs` strip, and `theme/primitives.css` for the base chip the plan told this session to reuse rather than replace.
- Decisions adopted: a list is a real `<ul>`/`<li>`, because the announced item count is most of what a blind user knows about a list before committing to read it; a segmented control is a radio group and a tab bar is a tablist, decided by whether the choice *filters the same content* or *swaps panels*; badges are never interactive and chips always are.
- Patterns rejected and why: infinite scroll (unreachable footer, no answer to "where was I" after a back navigation, and pages loaded that were never asked for on a metered connection); a second chip family (`ckm-chip` was extended in place, per the plan's instruction); `<Card image title price…>` as one configured component (the fifth screen always needs a sixth arrangement — parts instead); hit-region overlays on chips (chips sit in tight rows, so overlapping overlays hand a mis-tap to the neighbour — interactive chips are drawn at the full 44px instead).

**Desktop parity inventory**
- Desktop files inspected: none changed. These are presentation primitives with no service dependency.
- Data/services/hooks: none consumed.
- Roles/permissions/quotas, routes/query/navigation: unchanged.
- Page states and child overlays: unchanged.

**Wireframe/design decision**
- Shell/top bar/bottom nav/back behaviour: unchanged; this slice adds no screen.
- Scroll hierarchy: two new *nested* scroll surfaces — the chip rail and the tab bar — both horizontal only, both with the page's own scroll measured as unaffected at every width.
- Primary/secondary actions: unchanged.

**Changes made**
- Files added: `components/lists/` — `List.{jsx,css}`, `listContext.js`, `ListRow.{jsx,css}`, `LoadMore.{jsx,css}`, `lists.test.jsx`; `components/cards/` — `Card.{jsx,css}`, `Card.test.jsx`; `components/badges/` — `Badge.{jsx,css}`; `components/chips/` — `Chip.{jsx,css}`, `Chip.test.jsx`; `components/tabs/` — `SegmentedControl.{jsx,css}`, `Tabs.{jsx,css}`, `tabIds.js`, `tabs.test.jsx`.
- Files modified: `theme/tokens.css` (four `*-ink` tokens — see the finding below), `theme/cssPrefixRegistry.js` (8 new prefixes, plus a second owner file recorded for `ckm-chip`), `components/forms/Switch.jsx` (`srOnlyLabel`, so a switch can sit in a list row whose title is already its label), `dev/PrimitiveGallery.{jsx,css}` (seven new rows), and this plan (§7.2, §11, §17, §19).
- Shared logic extracted: one `::after` overlay technique, used by both `Card` and `ListRow`, so "the whole surface is tappable and still holds a second control" has exactly one implementation; `tabIds.js` so a `TabPanel` can be wired to its tab from anywhere on the screen without a context.
- Route/prefix registration: `ckm-list`, `ckm-row`, `ckm-load-more`, `ckm-card`, `ckm-badge`, `ckm-chip-row`, `ckm-segmented`, `ckm-tabbar`; `ckm-chip` re-registered with two owner files.

**Verification**
- Automated: `npx vitest run src/mobile` → 16 files / 138 tests (was 12 / 99). Full `npx vitest run` → 679 passed / 2 failed, the same pre-existing `AppShell.render.test.jsx` failures carried since Phase 0. ESLint clean on every touched file. `npm run build` → passed, 53 routes prerendered.
- Viewports/devices/browsers: headless Chrome over CDP at 320×720, 360×800, 390×844, 430×932, 768×1024. At every width, identically: **37/37 targets ≥44×44** (the `::after` hit region is *measured* through `getComputedStyle(el, "::after")`, not assumed, and the card's target is measured as the card rather than as its title text); **no text under 11px** anywhere in the new primitives; **no unnamed button or link** (`aria-labelledby` resolved, not just `aria-label`); **0 nested interactive elements** (`a button`, `button a`, `a a`); 9 list items and **0 orphan `<li>`**; 0 elements spilling past the viewport once the two deliberately-scrolling rails are excluded; and `documentElement.scrollWidth === innerWidth`.
- Accessibility checks: real `Input.dispatchKeyEvent` traversal — Tab lands on the *selected* tab (roving tabindex), ArrowRight → next, End → last, Home → first, ArrowLeft → wraps to last, each with `aria-selected="true"`, an `rgb(209,77,55) solid 2px` ring, and the focused tab inside the viewport (SC 2.4.11); one further Tab leaves the bar and lands on the tab panel, proving both the single stop and the panel's reachability. Computed colours confirmed against the intended tokens: badge text `rgb(42,122,72)` / `rgb(138,100,20)` / `rgb(186,64,52)` / `rgb(176,58,34)`, idle segment and tab labels `rgb(111,105,95)` on `rgb(251,250,247)` and `#fff` (5.3:1 and 5.5:1), chip border `rgb(141,135,126)` (the 3:1 token).
- Performance checks: no new dependency. `CardMedia` reserves its box with `aspect-ratio` and lazy-loads, so a list of cards does not reflow as images arrive.

**Decisions or deviations**
- Finding (the one that changed tokens): **none of the semantic colours is legible as small text on its own soft background.** Measured: `--ckm-green` on `--ckm-green-bg` ~3.88:1, `--ckm-gold` on `--ckm-gold-bg` ~2.95:1, `--ckm-red` on `--ckm-red-bg` ~4.47:1, `--ckm-accent` on `--ckm-accent-soft` ~3.93:1 — all fail SC 1.4.3, and a status badge is exactly where these pairings get used. Added `--ckm-green-ink`, `--ckm-gold-ink`, `--ckm-red-ink`, `--ckm-accent-ink`: the same hues darkened only as far as 4.5:1 requires (4.76 / 4.90 / 4.81 / 5.50:1 on their soft backgrounds), and chosen so one token also serves as a solid fill under white (5.28 / 5.37 / 5.42 / 6.09:1). The shape colours are unchanged and still correct for dots, bars and icons; the dashboard's existing chips were left untouched.
- Decision: a row or card that navigates *and* carries its own control is a positioned container with a `::after` overlay on its primary link, not a block link. Reason: source 15; the alternative makes the link's accessible name the whole row and makes the second control illegal. Cost, recorded honestly: the overlay masks text selection inside a linked row or card, so a surface whose text must be copyable should be non-interactive and put its action in the `action` slot.
- Decision: `SegmentedControl` is a radio group, `Tabs` is a tablist. Reason: they look alike and are not alike — the first changes what one list shows, the second swaps panels, and only the second has panels to point `aria-controls` at.
- Decision: interactive chips are drawn at the full 44px rather than at 32–36px with a `hitSlop` overlay, unlike the small icon button. Reason above.
- Decision: `ckm-tabs` (the dashboard's 9px uppercase strip) was **not** retired, matching the earlier decision to leave `ckm-btn` alone — it is a verified baseline and Phase 2 owns it. It is now marked superseded in §7.2.
- Two eslint findings worth carrying: a module that exports both a component and a hook/helper breaks React Fast Refresh, which is why `listContext.js` and `tabIds.js` exist as their own files; and `as: As = "article"` destructuring is not seen as a JSX use, so polymorphic components assign `const Surface = as` instead.
- User approval, if required: none — covered by the canonical plan.

**Open issues/blockers**
- `Card` and `Chip` put the focus ring on the pill/card through `:has()`, with an `@supports not selector(:has(a))` fallback that puts it back on the inner control. Chrome 150 was used for verification, so the fallback path itself is **unexercised**.
- The horizontal rails (chip row, tab bar) were verified for overflow and keyboard, but **not** for a two-finger/trackpad horizontal gesture on a real device, and not with `prefers-reduced-motion` interacting with `scroll-snap`.
- Everything owed from previous sessions still stands: the virtual-keyboard result is a resized-viewport proxy rather than a real soft keyboard; 200% text zoom is unexercised; the safe-area-top change is unverified on a notched device; the two `AppShell.render.test.jsx` failures and the four unused-`motion` lint errors remain pre-existing debt.

**Exact next action**
- As recorded in §19.1: build bullet 8's scroll-lock / focus-trap / focus-restoration helpers first, then the overlay set on top of them (deciding explicitly what happens to the existing `components/BottomSheet.jsx`), then the state set reusing `ckm-empty`, `ckm-skel` and LoadMore's SC 4.1.3 contract.

---

#### 2026-08-05 17:20 +05:30 — Claude (Claude Code) — Phase 1 (form family)

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint:** Phase 1 action primitives landed and shipped as PR #502 on `feat/mobile-native-app-phase-1`. The ledger's `next_action` named the form family.

**Work item claimed:** Field, text field, textarea, select, checkbox, radio group, switch, file picker — with the keyboard-open verification the previous session recorded as owed.

**Research performed**
- Sources fetched: [W3C Understanding SC 3.3.3 Error Suggestion](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html) (an error must suggest the correction, not just report failure — hence messages like "Enter a valid email address, like name@example.com" rather than "Invalid"); [MDN `inputmode`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode) (the full value list, and the rule that `inputmode` hints the keyboard while `type` is what validates — so both are set, never one); [MDN `<input type="text">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/text) (explicit warning against using `placeholder` as a label).
- Repository research mattered more than the web here: `client/src/pages/admin/ui/fields.jsx` already implements a `Field` render-prop with id wiring, "error replaces help", and `role="alert"`. The mobile family adopts that same contract deliberately, so the two halves of the codebase read the same way (plan §5.4: share the behaviour, not the CSS).
- Decisions adopted: `purpose` sets `type` + `inputMode` + `autoComplete` together, because setting one and forgetting the others is the usual bug; native `<select>`, never a custom listbox; a switch is `role="switch"` and means "takes effect now", a checkbox means "commits on save".
- Patterns rejected and why: a searchable combobox (only earns its cost where a list must be *filtered* — deferred to the screen that needs it rather than built speculatively); `type="number"` for page counts (drops leading zeros, gives a phone a spinner) — `inputMode="numeric"` on a text input instead; `display: none` on the real checkbox/radio inputs (removes them from the accessibility tree) — `opacity: 0` with the drawn indicator as a sibling.

**Desktop parity inventory**
- Desktop files inspected: `pages/admin/ui/fields.jsx` (read for its contract, not modified). No desktop file changed this session.
- Data/services/hooks: none. Validation stays with the caller — `FilePicker` reports a selection and renders the error it is handed, so the desktop upload's existing rules remain the single source of truth.
- Roles/permissions/quotas, routes/query/navigation: unchanged.
- Page states and child overlays: unchanged.

**Wireframe/design decision**
- Shell/top bar/bottom nav/back behaviour: unchanged; this slice adds no screen.
- Scroll hierarchy: unchanged, but the field now participates in it — see the keyboard finding below.
- Primary/secondary actions: unchanged.

**Changes made**
- Files added: `components/forms/` — `Field.{jsx,css}`, `Control.css`, `TextField.jsx`, `TextArea.jsx`, `SelectField.jsx`, `Checkbox.{jsx,css}`, `RadioGroup.{jsx,css}`, `Switch.{jsx,css}`, `FilePicker.{jsx,css}`, `formatFileSize.js`, `forms.test.jsx`.
- Files modified: `theme/cssPrefixRegistry.js` (6 prefixes), `dev/PrimitiveGallery.jsx` (six new rows with live state, plus a deliberate last-field-on-the-page fixture for the keyboard case), and this plan.
- Shared logic extracted: one control box (`ckm-control`) for input/textarea/select, so a screen cannot produce a second field shape; one label/hint/error column (`ckm-field`) reused even by the choice controls' error rows.
- Route/prefix registration: `ckm-field`, `ckm-control`, `ckm-checkbox`, `ckm-radio`, `ckm-switch`, `ckm-file-picker`.

**Verification**
- Automated: `npx vitest run src/mobile` → 12 files / 99 tests (was 15 files / 68 — the form suite is one file). Full `npx vitest run` → 640 passed / 2 failed, the same pre-existing `AppShell.render.test.jsx` failures. ESLint clean on the new files (the 4 unused-`motion` errors elsewhere in `src/mobile` are pre-existing at HEAD). `npm run build` → passed, 53 routes prerendered.
- Viewports/devices/browsers: CDP sweep at 320×720, 360×800, 390×844, 430×932, 768×1024. Across 18 form controls at every width: **no typed control renders below 16px**, **no control's hit region is under 44px** (measured on the row that owns the target, since checkbox/radio/file inputs are transparent overlays), **no control lacks an accessible name**, **every `aria-invalid` control's error text is reachable through `aria-describedby`**, and no element exceeds the viewport.
- Accessibility checks: the above, plus `role="switch"`/`aria-checked` on the switch and `fieldset`/`legend` grouping with the error attached to the group rather than to one radio.
- Performance checks: no new dependency; no runtime cost beyond the controls themselves.

**Decisions or deviations**
- Finding (the reason the keyboard check was worth doing): with the visual viewport collapsed to 390px — roughly what a keyboard leaves on a 390×844 device — the browser scrolled the focused input into view and left **its error message below the fold**. The user was being told something was wrong by text they could not see. Fixed with `scroll-margin-block` on `.ckm-control`, sized to a two-line message plus a counter; re-measured, and the field (274–318) and its error (326–342) are now both inside the 390px viewport. This is the field-level half of the pair whose surface-level half (`scroll-padding`) landed last session.
- Finding: the character counter rendered *above* the hint, because anything the render-prop returns precedes the wrapper's own text. `Field` gained a `meta` slot rendered beside the hint — and `meta` survives an error, since a count still matters while you are fixing one.
- Finding: `SelectField`'s placeholder never appeared. A disabled first option is not enough — the browser selects the first *enabled* option, so an untouched select read as "Drama" and would have submitted it. It now also sets `defaultValue=""`, but only when the caller is not driving the value.
- Decision: no combobox. Reason: recorded above; the plan's Phase 1 bullet is marked with that deviation rather than silently ticked.
- User approval, if required: none — covered by the canonical plan.

**Open issues/blockers**
- The virtual-keyboard result is a **proxy**: a resized headless viewport, not a real soft keyboard. iOS Safari's behaviour differs (the visual viewport moves rather than resizing the layout viewport), so §16.4 still owes this on a physical device.
- 200% text zoom remains unexercised; still owed.
- The two `AppShell.render.test.jsx` failures and the four unused-`motion` lint errors remain pre-existing debt in their own workstreams.
- The safe-area-top change from Phase 0 is still unverified on a notched device.

**Exact next action**
- Continue Phase 1 with the collection and feedback primitives — list row and card first (`components/lists/`, `components/cards/`), since every Phase 4 discovery screen depends on them — then segmented control, tabs, load-more, and the overlay set (bottom sheet, full-screen dialog, confirm dialog, context menu) together with focus trapping and restoration, which is still unbuilt. Reuse the existing `ckm-chip` rather than minting a second chip.

---

#### 2026-08-05 16:55 +05:30 — Claude (Claude Code) — Phase 1 (opening slice)

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint:** Phase 0 complete and verified against the repository (route manifest/policy, shell modes, boundary, tokens, CSS contract, analytics all present). Phase 1 not started.

**Work item claimed:** The action primitives the shell already implies — page header, back button, icon button, primary/secondary/tertiary/destructive buttons — plus the Phase 1 demo harness, pulled forward so every later primitive is verifiable at 320–768 px without a real screen.

**Research performed**
- Sources fetched this session: [React Native Pressable](https://reactnative.dev/docs/pressable) (press lifecycle, `HitRect`/`hitSlop`, default `pressRetentionOffset` `{20,20,20,30}`, `disabled`); [W3C Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) (24 px floor, five exceptions, the 24 px undisturbed-circle spacing rule); [W3C Understanding SC 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) — **newly adopted, added to §17 as source 12**.
- The Apple HIG buttons page could not be read (JS-rendered; the fetch returned only its title). The 44 pt figure already recorded in §17.8 was therefore *not* re-verified this session and is carried forward unchanged.
- Router behaviour was verified against the installed dependency rather than a doc: `react-router` 7.13.1 `getUrlBasedHistory` seeds `idx: 0` on the entry it adopts and increments on every push, so `window.history.state.idx > 0` is a truthful "this app has a previous entry" signal.
- Decisions adopted: press feedback is immediate and never hover-derived; a control may look smaller than 44 px but its *hit region* never is; `pending` keeps a control focusable and announced rather than disabling it mid-task; `to`/`href` keep navigation a real link.
- Patterns rejected and why: a terracotta primary button (measured ~4.35:1 for white label text — fails SC 1.4.3, so `primary` is ink); `navigate(-1)` inside screens (walks a deep-linked user out of the app); a `titleAs` escape hatch on PageHeader (would weaken the one-`h1`-per-screen guarantee the component exists to give); retiring `.ckm-btn` now (it is the dashboard's verified baseline — Phase 2 owns that).

**Desktop parity inventory**
- Desktop files inspected: `App.jsx` only, to add the development-only harness route beside the existing preview route. No desktop page, service or style was touched.
- Data/services/hooks: none consumed; these are presentation primitives.
- Roles/permissions/quotas: unchanged.
- Routes/query/navigation: one new `dev-only` route, `/__mobile-primitives`, registered in the manifest and mirrored into the coverage test's App.jsx list (88 patterns).
- Page states and child overlays: unchanged.

**Wireframe/design decision**
- Shell: the harness runs on `MobileShell` in `detail` mode — the first real consumer of a non-standard shell mode.
- Top bar: `PageHeader` = back + title column (eyebrow/title/subtitle) + actions, left-aligned rather than iOS-centred, because a centred title cannot survive two actions and a screenplay name at 320 px.
- Scroll hierarchy: one `<main>`, asserted by the CDP probe at all eight widths.
- Primary/secondary actions: four intents, four only — primary (ink), secondary (outlined), tertiary (text), destructive (red).
- Bottom navigation: none; `detail` mode forbids it.
- Nested screens/sheets/dialogs: not in this slice.
- Keyboard/safe-area/back behavior: `useMobileBack` implements §8.3; `PageHeader` inherits the shell's safe-area top and adds its own left/right insets for landscape.

**Changes made**
- Files added: `components/buttons/Button.{jsx,css,test.jsx}`, `components/buttons/IconButton.{jsx,css,test.jsx}`, `components/navigation/BackButton.{jsx,css,test.jsx}`, `components/app-bars/PageHeader.{jsx,css,test.jsx}`, `hooks/useMobileBack.js`, `dev/PrimitiveGallery.{jsx,css}`.
- Files modified: `theme/tokens.css` (additive: control geometry, press/disabled/focus tokens, `--ckm-on-dark`, `--ckm-accent-strong`, `--ckm-control-border`), `theme/base.css` (`ckm-sr-only`), `theme/cssPrefixRegistry.js` (6 prefixes), `shell/MobileShell.css` (SC 2.4.11 `scroll-padding`), `routes/mobileRouteManifest.js`, `routes/mobileRouteCoverage.test.js`, `routes/MobileRoutes.jsx`, `MobileApp.jsx` (`devScreen`), `client/src/App.jsx` (dev route), and this plan (§7.2, §9.9, §11, §17, §19).
- Shared logic extracted: back-navigation policy (`useMobileBack`) and visually-hidden text (`ckm-sr-only`) each now have exactly one implementation.
- Route/prefix registration: `ckm-button`, `ckm-icon-button`, `ckm-back`, `ckm-page-header`, `ckm-sr-only`, `ckm-gallery` registered in code and mirrored into §7.2.

**Verification**
- Automated: `npx vitest run src/mobile` → 15 files / 68 tests (was 7 / 41). Full `npx vitest run` → 54 files, 610 passed / 2 failed — the same two pre-existing `AppShell.render.test.jsx` `.ck-mobile-nav` failures carried in this ledger since the first Phase 0 session, in desktop-shell code this slice does not touch. ESLint clean on every touched file. `npm run build` → passed, 53 routes prerendered and verified.
- Viewports/devices/browsers: headless Chrome over CDP with `Emulation.setDeviceMetricsOverride` at 320×720, 360×800, 375×812, 390×844, 412×915, 430×932, 480×900, 768×1024. At every width: `documentElement.scrollWidth === innerWidth`, exactly one `<main>`, `data-shell-mode="detail"`, `data-screen-id="primitive-gallery"`, and no element extending past the viewport. Because the shell is `position: fixed`, full-page capture is useless — the harness scrolls `<main>` and captures per screenful.
- Accessibility checks: **32/32 controls measure ≥44×44** including the `sm` icon button's `::after` hit region (measured, not assumed). Real `Input.dispatchKeyEvent` Tab traversal produces `solid 2px rgb(209,77,55)` at 2 px offset on the focused control, and the focused control was inside the viewport (SC 2.4.11). A scripted `.focus()` was tried first and proved nothing — Chrome's `:focus-visible` heuristic ignores it; that false negative is why the harness dispatches real keys. Computed values confirmed: secondary border `rgb(141,135,126)` (the 3:1 token), badge `rgb(201,72,47)`, primary ink on white, label font IBM Plex Sans 14 px, title Spectral with a 2-line clamp.
- Performance checks: no new dependency; the gallery is lazily imported and behind `import.meta.env.DEV` in `App.jsx`, so it cannot reach a production bundle.

**Decisions or deviations**
- Decision: `--ckm-control-border: #8d877e` for the secondary button's boundary instead of the existing `--ckm-line*` hairlines.
- Reason: the hairline measures ~1.53:1 against the page and the border is the only thing identifying that control — SC 1.4.11 wants 3:1. `#8d877e` is the lightest value in the existing ramp that clears it (~3.56:1). The dashboard's legacy `.ckm-btn--ghost` was deliberately left alone so no verified baseline moves.
- Decision: `--ckm-accent-strong: #c9482f` for small white-on-brand text (badges).
- Reason: `--ckm-accent` measures ~4.35:1 with white, which fails AA for 11 px text. This is the same terracotta darkened only as far as 4.5:1 requires (~4.72:1).
- Decision (found by the harness, not by review): `.ckm-button` gained `min-width: var(--ckm-touch-target)`; below 360 px the labelled back button drops its text and the page-header title steps down to the section size.
- Reason: the 320 px measurement caught a single-character button at 43.9 px wide, and a labelled back button starving an 86-character title down to "An Unreason…". Both are exactly what the harness exists to surface.
- User approval, if required: none — covered by the canonical plan.

**Open issues/blockers**
- The two `AppShell.render.test.jsx` failures remain unreconciled desktop-shell test debt (carried, not introduced).
- The safe-area-top change from Phase 0 is still unverified on a physical notched device (§16.4).
- 200 % text zoom (§16.2) was **not** exercised this session; width reflow to 320 px was. It belongs with the form family, where zoom and the virtual keyboard interact.
- No Phase 1 baseline screenshots were committed. The harness changes with every new primitive, so a stored image would be stale within a slice; the measured values above are the evidence instead.

**Exact next action**
- Continue Phase 1 with the form family in `client/src/mobile/components/forms/` — field, textarea, select/combobox, checkbox, radio, switch, file picker — each with a registered prefix, a label tied to its control, errors tied by `aria-describedby` + `aria-invalid`, ≥16 px rendered input text so mobile Safari does not zoom on focus, a 44 px hit region, a render test, and a states row in `dev/PrimitiveGallery.jsx`. Verify with the keyboard open, not only at rest.

---

#### 2026-08-05 14:20 +05:30 — Claude (Claude Code) — Phase 0 (closing)

**Requested continuation:** "continue" (same session, after the shell/boundary/token slice).

**Starting checkpoint:** Phase 0 owed two items — CSS scoping/prefix normalization and mobile analytics behavior.

**Work item claimed:** Both remaining Phase 0 items, then the Phase 0 exit gate.

**Research performed**
- Sources: the repository's own tracking implementation (`tracking/usePageTracking.js`, `useClickTracking.js`, `analyticsClient.js`, `storage.js`), the server contract in `server/controllers/analyticsController.js`, and plan §7.1–7.2. CSS cascade behaviour was verified empirically in the running app rather than assumed.
- Decisions adopted: scoping is enforced by test, not convention; the registry lives in code and mirrors §7.2; mobile adds exactly one analytics behavior (`scroll_depth`) and re-fires nothing.
- Patterns rejected and why: renaming every dashboard section prefix to `ckm-dashboard__*` (large churn, no benefit — registering one prefix per file gives the same isolation guarantee); a mobile-specific `page_enter` (would double-count against the global tracker); polling `window.location` to detect route changes in the scroll hook (the shell is route-level, so Router context is the honest dependency).

**Desktop parity inventory**
- Desktop files inspected: `App.jsx` (bootstrap placement, `ScrollToTopOnRouteChange`), `components/AnalyticsBootstrap.jsx`, the four `tracking/` modules, `server/controllers/analyticsController.js`.
- Data/services/hooks: `sendTrackEvent`, `hasConsent`, `AuthContext`; `getUserContext` extracted to `tracking/userContext.js` and consent extracted to `tracking/useAnalyticsConsent.js`, both used by desktop and mobile.
- Roles/permissions/quotas: unchanged.
- Routes/query/navigation: unchanged. Confirmed `ScrollToTopOnRouteChange` already resets the first `<main>`, which is the shell's scroll surface — mobile route changes open at the top with no new code.
- Page states and child overlays: unchanged.

**Wireframe/design decision**
- No new screen. The shell gained a `screenId` prop that surfaces as `data-screen-id` and `data-track-section`.

**Changes made**
- Files added: `mobile/theme/cssPrefixRegistry.js`, `mobile/theme/mobileCssContract.test.js`, `mobile/analytics/useMobileScrollDepth.js` (+ test), `tracking/userContext.js`, `tracking/useAnalyticsConsent.js`.
- Files modified: all 20 mobile stylesheets with unscoped rules (315 selectors), `screens/Dashboard.css`/`.jsx` (prefix migration + `screenId`), `components/TopBar.jsx`/`.css` (named search label), `shell/MobileShell.jsx` (scroll-node handle, analytics, `screenId`; `scrollRef` became the `onScrollNode` callback), `shell/MobileShell.test.jsx` (router context), `components/AnalyticsBootstrap.jsx`, `tracking/usePageTracking.js`, `tracking/useClickTracking.js`, the Phase 0 baseline set and its README, and this plan (§5.6, §7.1, §7.2).
- Shared logic extracted: identity payload and consent state now have one implementation each.
- Route/prefix registration: 24 prefixes registered in code and mirrored into §7.2; `ckm-dash` retired.

**Verification**
- Automated: `npx vitest run src/mobile` → 7 files / 41 tests. Full `npm test` → 49 files / 583 tests pass with the two known pre-existing `AppShell.render.test.jsx` failures. ESLint clean on every file this session touched (the 4 remaining mobile component errors and 2 tracking warnings exist at HEAD and were confirmed pre-existing with `git show`). `npm run build` → passed with 53 routes prerendered and verified.
- Viewports/devices/browsers: headless Chrome over CDP at 320x720, 360x800, 390x844, 430x932, 768x1024. At every width `scrollWidth === innerWidth`, one `<main>`, `data-shell-mode="standard"`, `data-screen-id="dashboard"`, `.ckm-dashboard` present and `.ckm-dash` gone.
- The decisive check was an **element-by-element computed-style and geometry diff** of the running app before and after the scoping rewrite (114 elements, ~30 properties each). It confirmed the four intentional leak fixes and caught the one regression the rewrite introduced (`.ckm-topbar__search span` overpowering the Material Symbols font rule and breaking the search icon), which was fixed by giving the label its own class. A re-diff after the fix showed only the intended deltas.
- Accessibility checks: two of the four leak fixes are accessibility fixes — the avatar's initials were near-black on a near-black circle, and the inactive tab label rendered at full ink strength, misrepresenting the selected state.
- Performance checks: the scroll listener is passive and rAF-throttled; no new dependency was added.

**Decisions or deviations**
- Decision: the Phase 0 baselines were refreshed and the originals archived under `baselines/phase0-dashboard/pre-css-scoping/`, with every delta enumerated in that README.
- Reason: the post-scoping render is the authored design; keeping a baseline that encodes four style leaks would make future regressions harder to see, and the archive preserves the evidence.
- Decision: `MobileShell`'s `scrollRef` prop became `onScrollNode` (callback only).
- Reason: the shell must own its scroll surface; the lint rule against mutating a prop ref agreed. No consumer used the old prop.
- User approval, if required: none — covered by the canonical plan.

**Open issues/blockers**
- Pre-existing and unrelated: two `AppShell.render.test.jsx` failures (`.ck-mobile-nav`), and lint errors in four mobile components (unused `motion` imports) plus `usePageTracking.js` (`useRef(Date.now())` purity). All present at HEAD; they belong to their own workstreams.
- The safe-area-top change from the previous slice is still unverified on a physical notched device (§16.4).

**Exact next action**
- Open Phase 1: build the first primitives the shell already implies (page header, back button, icon button, primary/secondary/destructive buttons) on the expanded tokens — each with co-located CSS, a prefix registered in `theme/cssPrefixRegistry.js`, and a render test — and stand up the states/theme demo harness early so later primitives can be verified at 320–768 px without a real screen.

---

#### 2026-08-05 11:45 +05:30 — Claude (Claude Code) — Phase 0

**Requested continuation:** "continue in native app implementation".

**Starting checkpoint:** Route-aware resolution landed; Phase 0 still owed shell variants, route-level boundaries, and token expansion.

**Work item claimed:** Shell-mode contract, route-level suspense/error boundary, manifest shell-mode enforcement, and additive token expansion.

**Research performed**
- Sources re-checked from section 17: React Native shell/composition model (§17.1–3), Apple HIG 44 pt targets (§17.8), WCAG 2.2 reflow and target size (§17.6–7), MDN `env()` and dynamic viewport units (§17.9–10), `overscroll-behavior` (§17.11). No guidance changed direction; no new source adopted.
- Comparable interaction patterns: not applicable — this is the shared chrome contract, not a page redesign.
- Decisions adopted: the *route manifest*, not a screen's JSX, decides which chrome a route gets; a mode that forbids a slot drops it even when a screen passes one; overlays are never mode-gated so a dialog stays reachable in every mode; a route-level boundary owns both pending and failure, and clears on pathname change.
- Patterns rejected and why: a polymorphic `as` root (no real need, and it defeated the lint config); per-screen conditional chrome (scatters shell logic and invites a second competing shell); a global error boundary only (a failure would blank the whole app instead of degrading inside the shell).

**Desktop parity inventory**
- Desktop files inspected: none changed. This slice touches only `client/src/mobile/`.
- Data/services/hooks: unchanged; `useDashboardData` and the preview fixture are untouched.
- Roles/permissions/quotas: unchanged; `/dashboard` remains the only production `screen` and stays writer-only.
- Routes/query/navigation: unchanged contract; `MobileRoutes` still refuses to substitute Dashboard for an unmatched URL.
- Page states and child overlays: the dashboard's four overlays now mount through the shell's `overlays` slot with identical props and DOM order.

**Wireframe/design decision**
- Shell: `standard | detail | immersive | flow | public | admin`, each with a declared intent and chrome config in `mobileShellModes.js`.
- Top bar: the app-bar slot is a `flex: 0 0 auto` region carrying `--ckm-safe-top`, so chrome clears the notch (previously the dashboard's TopBar had no safe-area padding of its own).
- Scroll hierarchy: exactly one `<main class="ckm-shell__scroll ckm-scroll">` per screen, asserted by test.
- Primary/secondary actions: unchanged in this slice.
- Bottom navigation: rendered only by modes whose config allows it; when absent, the scroll body absorbs `--ckm-safe-bottom` so the last row never hides under the home indicator.
- Nested screens/sheets/dialogs: overlays render after chrome, outside the scroll surface.
- Keyboard/safe-area/back behavior: scroll body uses `overscroll-behavior: contain`; back behavior unchanged; the boundary resets on pathname change so a failed screen cannot follow the user forward or back.

**Changes made**
- Files added: `mobile/shell/mobileShellModes.js`, `MobileShell.jsx`, `MobileShell.css`, `MobileRouteBoundary.jsx`, `MobileRouteBoundary.css`, `MobileShell.test.jsx`, `MobileRouteBoundary.test.jsx`.
- Files modified: `mobile/routes/MobileRoutes.jsx` (boundary replaces the ad-hoc boot skeleton fallback), `mobile/routes/mobileRouteManifest.js` (shell modes now reference the constant), `mobile/routes/mobileRouteCoverage.test.js` (two new shell-mode contract tests), `mobile/theme/tokens.css` (additive only), `mobile/screens/Dashboard.jsx` (adopts the shell), and this ledger.
- Shared logic extracted: app-shell layout, chrome gating, route pending state, and route failure recovery now live in one place instead of inside the dashboard.
- Route/prefix registration: `ckm-shell` implemented and noted in §7.2. No screen prefix was renamed in this slice.

**Verification**
- Automated commands and results: `npx vitest run src/mobile` → 5 files / 30 tests passed (was 3 / 19). Full `npm test` → 47 files / 572 tests passed, with the same two pre-existing `AppShell.render.test.jsx` `.ck-mobile-nav` failures the previous session recorded — unrelated to mobile code and unchanged by it. ESLint on `src/mobile/shell`, `src/mobile/routes`, `src/mobile/screens/Dashboard.jsx` → clean. `npm run build` → passed, 53 public routes prerendered and verified; only the pre-existing large-chunk warnings.
- Viewports/devices/browsers: Chrome headless (new) driven over CDP with true device metrics at 320x720, 360x800, 390x844, 430x932, 768x1024 against `/__mobile-preview`. At every width `document.documentElement.scrollWidth === window.innerWidth` (no horizontal page scroll), exactly one `<main>`, `data-shell-mode="standard"`, and both `.ckm-shell` and `.ckm-dash` present. The 390 px capture matches `baselines/phase0-dashboard/dashboard-390x844.png`. Note for the next agent: `--window-size` alone is unusable on Windows (Chrome clamps window width near 500 px and crops instead of reflowing) — use `Emulation.setDeviceMetricsOverride`, and await `document.fonts.ready` or Material Symbols ligatures render as literal text and fake an overflow.
- Accessibility checks: failure surface is `role="alert"` with a 44 px retry target and `:focus-visible` ring; pending surface is a `role="status" aria-live="polite"` region with a visually-hidden label; the two elements reporting intrinsic overflow at 320/360 px are `overflow-x: hidden` icon glyph spans, not layout overflow.
- Performance checks: production build unchanged in shape; the mobile route chunk remains separately lazy-loaded.

**Decisions or deviations**
- Decision: `MobileShell` appends `className`/`scrollClassName` instead of owning the class list outright.
- Reason: an existing screen can move onto the shell without touching a single CSS selector, so the Phase 0 dashboard baseline stays valid and shell adoption is not a redesign.
- Decision (behavioral, deliberate): the app-bar slot now applies `--ckm-safe-top`.
- Reason: `.ckm` is `position: fixed; inset: 0`, so the dashboard's TopBar previously sat under the notch on inset devices. Baselines were captured with zero insets and are unaffected; this needs a real notched-device check during Phase 2.
- User approval, if required: none — covered by the canonical plan.

**Open issues/blockers**
- The two `AppShell.render.test.jsx` failures remain unreconciled desktop-shell test debt (carried over, not introduced here).
- The safe-area top change is unverified on a physical notched device; the plan's device pass in §16.4 still owes it.

**Exact next action**
- Finish Phase 0 by (1) migrating the dashboard family from the unregistered `ckm-dash` prefix to the registered `ckm-dashboard`, auditing every mobile selector for `.ckm` scoping, and re-verifying against `client/src/mobile/baselines/phase0-dashboard/`; then (2) defining mobile analytics/page-tracking so a mobile screen fires the same events as its desktop page. Close the Phase 0 exit gate before starting Phase 1 primitives.

---

#### 2026-08-05 10:46 +05:30 — Codex — Phase 0

**Requested continuation:** Continue in Native app implementation.

**Starting checkpoint:** Planning complete; the mobile dashboard exists, but `RootExperience` replaces non-challenge writer routes with that dashboard.

**Work item claimed:** Route manifest, experience policy, route-aware mobile resolution, migration fallback, and coverage/policy tests.

**Research performed**
- Sources: React Router declarative routing and route matching guidance already recorded in section 17; current repository shell policy, route tree, auth context, mobile gate, and test conventions are being audited before implementation.
- Comparable interaction patterns: not applicable to this infrastructure-only slice; no page-level visual redesign is being performed.
- Decisions adopted: retain one `BrowserRouter`; canonical URLs select mobile screens; unimplemented mobile routes render the existing desktop route branch during migration; only implemented mobile routes may replace desktop content.
- Patterns rejected and why: a nested router would split browser history; manual substring routing would be collision-prone; rendering Dashboard for unmatched routes violates deep-link semantics.

**Desktop parity inventory**
- Desktop files inspected: `client/src/App.jsx`, `client/src/layouts/app-shell/shellPolicy.js`, and associated tests.
- Data/services/hooks: `AuthContext`, `useIsMobile`, and existing lazy route imports.
- Roles/permissions/quotas: writer/creator mobile baseline; industry, reader, admin, public, and auth-loading behavior remain on the existing desktop branch until their mobile routes are registered.
- Routes/query/navigation: all 87 declared route patterns are tracked; query, params, browser history, and direct refresh must remain owned by the existing router.
- Page states and child overlays: unchanged in this infrastructure slice.

**Wireframe/design decision**
- Shell: existing mobile shell only for registered implemented mobile routes.
- Top bar: unchanged.
- Scroll hierarchy: unchanged.
- Primary/secondary actions: unchanged.
- Bottom navigation: unchanged.
- Nested screens/sheets/dialogs: unchanged.
- Keyboard/safe-area/back behavior: existing behavior retained; canonical browser history is no longer bypassed by a dashboard-only gate.

**Changes made**
- Files added: `mobile/routes/mobileRouteManifest.js`, `mobileRoutePolicy.js`, `MobileRoutes.jsx`, their policy/coverage/render tests, and five PNG baselines under `mobile/baselines/phase0-dashboard/`.
- Files modified: `client/src/App.jsx`, `mobile/MobileApp.jsx`, `mobile/screens/Dashboard.jsx`, `mobile/hooks/useDashboardData.js`, `mobile/data/dashboardData.js`, `mobile/README.md`, and this ledger.
- Shared logic extracted: route/experience selection is now a pure tested policy; the preview fixture is a deterministic data contract that bypasses authenticated API side effects only when explicitly enabled.
- Route/prefix registration: all 87 unique `App.jsx` route patterns now have a documented disposition; `/dashboard` is the only production `screen` and is limited to the writer audience; `/__mobile-preview` is `dev-only`.

**Verification**
- Automated commands and results: focused route suite passed (3 files, 19 tests); touched-file ESLint passed; production build passed (3,916 modules), 53 public routes prerendered, and prerender verification passed. Full suite result: 45 files/561 tests passed and one unrelated existing file had two failing expectations for the removed `.ck-mobile-nav`; isolated rerun reproduced those two AppShell failures without any mobile-route code involved.
- Viewports/devices/browsers: Chrome local preview verified at 320x720, 360x800, 390x844, 430x932, and 768x1024. Each capture contained one `.ckm-dash` and no boot skeleton; screenshots are stored under `client/src/mobile/baselines/phase0-dashboard/`.
- Accessibility checks: canonical URL routing and no-dashboard substitution are asserted; page-level accessibility work is unchanged in this infrastructure slice.
- Performance checks: production build succeeded; the lazy mobile route chunk remains separate. Existing global large-chunk warnings remain and were not introduced by this slice.

**Decisions or deviations**
- Decision: migration fallback is the existing desktop route branch, not a placeholder screen.
- Reason: it preserves functionality and URL semantics while native-style screens are delivered incrementally.
- User approval, if required: covered by the canonical plan.

**Open issues/blockers**
- No Phase 0 blocker. The repository's existing `AppShell.render.test.jsx` still expects a `.ck-mobile-nav` that the current AppShell no longer renders; this unrelated test debt should be reconciled in the desktop-shell workstream, not hidden by this mobile change.

**Exact next action**
- Design and implement the shell-mode contract (`standard`, `detail`, `immersive`, `flow`, `public`, `admin`) and route-level suspense/error boundaries, then extend spacing/type/touch/chrome/elevation/motion/z-index tokens while comparing against the saved dashboard baselines.

---

Copy this block for every implementation session:

```markdown
#### YYYY-MM-DD HH:MM — Agent/tool name — Phase N

**Requested continuation:**
**Starting checkpoint:**
**Work item claimed:**

**Research performed**
- Sources:
- Comparable interaction patterns:
- Decisions adopted:
- Patterns rejected and why:

**Desktop parity inventory**
- Desktop files inspected:
- Data/services/hooks:
- Roles/permissions/quotas:
- Routes/query/navigation:
- Page states and child overlays:

**Wireframe/design decision**
- Shell:
- Top bar:
- Scroll hierarchy:
- Primary/secondary actions:
- Bottom navigation:
- Nested screens/sheets/dialogs:
- Keyboard/safe-area/back behavior:

**Changes made**
- Files added:
- Files modified:
- Shared logic extracted:
- Route/prefix registration:

**Verification**
- Automated commands and results:
- Viewports/devices/browsers:
- Accessibility checks:
- Performance checks:

**Decisions or deviations**
- Decision:
- Reason:
- User approval, if required:

**Open issues/blockers**
-

**Exact next action**
-
```

### 19.4 Initial audit decision record

#### 2026-08-05 — Codex — Planning

- This document is the canonical mobile implementation plan.
- Existing `client/src/mobile` code is retained as the starting foundation.
- Existing dashboard status is `BASELINE`, not `COMPLETE`, because several actions still use desktop-only notices and local placeholder data.
- Route-aware mobile rendering precedes new screen work because the current gate swallows non-challenge writer routes.
- Canonical desktop URLs remain unchanged on mobile.
- The current codebase remains JSX unless a separate TypeScript migration is approved.
- `.ckm` remains the global isolation scope; every route family receives an additional unique page prefix.
- Every user-facing route, including industry, reader, admin, finance, public, legal, and redirects, is tracked because the product requirement is all pages.
- Current primary-source research is captured in section 17; each page still requires its own current research.
- Unrelated dirty working-tree changes present at planning time were not modified.

---

## 20. Continuation protocol for any AI agent

When the user says **"continue in Native app implementation"** or equivalent:

1. Read this entire file before taking implementation action.
2. Inspect `git status` and preserve unrelated user changes.
3. Read section 19.1 and the newest session log entry.
4. Inspect the listed active files and verify the stated checkpoint against the repository; do not assume a stale ledger is correct.
5. If another work item is already `IN PROGRESS`, continue it. Otherwise claim the first incomplete dependency-safe item from the current phase.
6. Announce the phase and work item being continued.
7. Complete the mandatory research/design gate in section 4 for any new page family. Explicitly tell the user when that research changes the implementation direction.
8. Update section 19 **before** editing code with the claimed item, owner, and start date.
9. Implement a coherent vertical slice; do not scatter unfinished markup across many pages just to change status counts.
10. Verify in proportion to risk and inspect the rendered mobile result at the required widths.
11. Update the route/component ledger, phase checklist, checkpoint YAML, and session log before ending.
12. Set `next_action` to a concrete file-level or test-level action that another agent can execute immediately.
13. Never mark a page/phase complete without the evidence required by section 18.
14. If blocked by a product decision, document the exact options, evidence, and consequences, then ask the user. Continue any independent in-scope work first.

### Required handoff format

Every implementation handoff should state:

- outcome achieved;
- phase and ledger status;
- primary files changed;
- tests and viewports verified;
- known limitations/blockers;
- exact next action recorded in this file.

This allows Codex, Claude, or another capable agent to resume without relying on hidden conversation history.

---

## 21. Immediate next step

> **Superseded as of 2026-08-05.** Phase 0 is COMPLETE and Phase 1 is in progress. The live next step is `next_action` in §19.1; the steps below are kept as the record of how this work was started.

Begin **Phase 0**, not a feature page:

1. render and capture the current mobile dashboard at 320, 360, 390, 430, and 768 px;
2. write tests that demonstrate the present route-swallowing defect;
3. design `mobileRoutePolicy.js` and `mobileRouteManifest.js` around the existing audience/shell policy;
4. implement route-aware `MobileRoutes` inside the existing `BrowserRouter`;
5. preserve the dashboard at `/dashboard` and introduce explicit migration fallbacks for every other route;
6. verify deep links, browser back/forward, auth loading, writer/industry/reader/admin roles, and the 768 px boundary;
7. update section 19 with evidence and the next foundation item.

Only after that exit gate passes should work begin on the shared mobile system and the next route-level screen.
