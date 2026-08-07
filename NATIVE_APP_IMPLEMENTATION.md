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
| Phase 1 state set | `ckm-toast` (`components/feedback/Toast.css` — the transient message and its app-level host layer; supersedes `ckm-island`), `ckm-message` (`components/feedback/InlineMessage.css` — the durable inline strip and full-panel failure form), `ckm-offline` (`components/feedback/OfflineBanner.css`), plus `ckm-skel` gaining a **second owner** in `components/feedback/Skeletons.css` for the composable shapes (`__shape`, `__lines`, `__rows`, `__group`) while `components/Skeleton.css` keeps the dashboard's fixed boot drawing — neither file uses the other's element names, the same arrangement `ckm-chip` already has. `ckm-empty` is unchanged and reused |
| Development harness | `ckm-gallery` (`dev/PrimitiveGallery.css`, `/__mobile-primitives`, never mounted in production) |
| Root surface and utilities | `ckm-root`, `ckm-html-lock`, `ckm-scroll`, `ckm-sr-only` |
| Search | `ckm-search` |
| Top scripts | `ckm-top-scripts` |
| Featured projects | `ckm-featured` |
| Project detail/public project | `ckm-project-detail` / `ckm-public-project` |
| Create project | `ckm-create-project` |
| Upload project | `ckm-upload-project` |
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
| `/new-project` | `pages/NewProject.jsx` | intentional redirect/legacy disposition or `NewProjectMobile.jsx` after audit | NOT STARTED |
| `/create-project`, `/create-project/:draftId` | `pages/CreateProject` | `projects/create/CreateProjectMobile.jsx` | NOT STARTED |
| `/upload` | `pages/ScriptUpload.jsx` | `projects/upload/UploadProjectMobile.jsx` | NOT STARTED |
| `/script/:id` | `pages/ScriptDetail.jsx` | `projects/project-detail/ProjectDetailMobile.jsx` | NOT STARTED |
| `/script/:projectHeading/:writerUsername` | same detail page | same mobile detail component | NOT STARTED |
| `/:projectHeading/:writerUsername` | same detail page/catch-all | same component; collision tests mandatory | NOT STARTED |
| `/script/:id/pay` | `pages/ScriptPaymentPage.jsx` | `projects/payment/ProjectPaymentMobile.jsx` | NOT STARTED |
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
| Creation/editor | editor toolbar, title page, AI tools, collaboration, presence, version history, reports, corkboard | mobile editor research spike; progressive/immersive UI | NOT STARTED |
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
- [ ] Replace provisional bottom navigation with approved writer tabs.
- [ ] Implement `/ai-tools` and `/offer-holds` as real route-aware screens/sections.
- [ ] Complete account/settings and global auth/session behaviors.

**Exit gate:** every dashboard interaction works on mobile; no `desktopOnly()` branch remains in the dashboard family.

### Phase 3 — Project creation, upload, and screenplay tools

- [ ] Research spike for mobile screenplay/editor workflows before final design.
- [ ] Create project new/draft routes with save/resume and unsaved-change protection.
- [ ] Upload workflow, validation, legal acceptance, progress, failure/retry, and success.
- [ ] Screenplay editor touch toolbar, element selection, keyboard behavior, comments/presence, version history, reports, and title page.
- [ ] AI creation/review tools and quota states.
- [ ] File/image/video picker and interrupted-upload recovery.

**Exit gate:** a writer can create or upload, leave, resume, validate, collaborate where allowed, and finish a project entirely on a supported phone.

### Phase 4 — Discovery and project consumption

- [ ] Search, filters, sort, pagination, saved state, and result cards.
- [ ] Top scripts and featured projects.
- [ ] Project detail for every canonical route form.
- [ ] Public shared project.
- [ ] Share, bookmark, rating/review, purchase/payment, trailer/media, permissions, and restricted states.
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
current_phase: 2
current_work_item: "PHASE 2 IN PROGRESS, no longer blocked. Bullets 1 (parity audit), 2 (placeholders/real services) and 3 (dashboard destinations) are COMPLETE — see the 2026-08-07 Phase 2 entry in §19.3. The SectionTabs blocker was answered by the user on 2026-08-07 (option B) and implemented the same session: Projects and Reviews are `/dashboard?tab=...` query destinations declared in the writer preset, NOT new routes — a mobile-only /projects would have broken §5.2's one-canonical-URL rule and the manifest coverage contract. Two defects fell out of it and were fixed: resolveActiveTabKey ignored query strings, and NavBar was marking TWO tabs aria-current because NavLink applies its own."
previous_work_item: "PHASE 1 COMPLETE. Every bullet in §11 Phase 1 is ticked, including bullet 2 (role-aware top app bars and bottom navigation), which the user unblocked on 2026-08-07 by choosing the desktop app-shell presets as the single source of truth for the tab sets — see the decision recorded in §8.2."
last_completed_work_item: "Phase 1 bullet 2 — navigation/mobileNav.js + hooks/useMobileNav.js + components/app-bars/AppBar.{jsx,css} (ckm-appbar) + components/navigation/NavBar.{jsx,css} (ckm-navbar); --ckm-accent-on-dark added to tokens.css; Dashboard migrated off TopBar/BottomNav; the four audiences added to the primitive gallery; the dashboard baseline recaptured"
superseded_next_action: "Open PHASE 2 (writer navigation and dashboard completion) and claim its FIRST bullet: the dashboard research/parity audit against desktop `client/src/pages/Dashboard.jsx`. Complete the §4 gate for the dashboard page family — desktop component tree, services, permissions, every state — and record it in §19 before editing the screen. Three concrete, already-specified pieces of work follow that audit, in this order: (1) remove the dashboard's static placeholders and wire real services (`hooks/useDashboardData.js` and `data/dashboardData.js`'s NOTIFICATIONS still seed the bell from local data, and the CDP sweep on 2026-08-07 measured a literal 'PLACEHOLDER' badge still rendering in the At-a-Glance section); (2) migrate the four dashboard overlays (AccountMenu, AiDetailSheet, AllProjectsSheet, NotificationsPanel) off `components/BottomSheet.jsx` onto `components/overlays/Sheet.jsx`, then delete BottomSheet and retire the `ckm-sheet` prefix; (3) replace every remaining `notify.desktopOnly()` call-site with a real destination or a real in-place behaviour, then delete `components/DynamicIsland.jsx` and retire `ckm-island` — §2.8 requires this before completion. Also now deletable, and cheap: `components/TopBar.jsx` + `TopBar.css` and `components/BottomNav.jsx` + `BottomNav.css` have NO remaining callers as of 2026-08-07; they were left in place only so this session did not mix a deletion into a behaviour change. Delete them and drop `ckm-topbar`/`ckm-bottomnav` from `theme/cssPrefixRegistry.js` and §7.2. Finally, the same sweep recorded a real, separate finding that belongs to this phase: the dashboard's own content (NOT the new chrome) has 5 text nodes below the 11px floor (`ckm-ov__mover-head` at 8.5px, `ckm-ov__mover-note` at 10.5px, three `ckm-ov__top-meta` at 10px) and ~25 colour pairs below 4.5:1 (`ckm-ov__glance-label` at 2.69:1, `ckm-ov__badge` at 3.02:1, `ckm-ov__profile-sub` at 3.36:1, `ckm-tabs__btn` inactive at 3.41:1, several `ckm-ov__top-rank` at 1.82:1). These are Phase 0 baseline debt that the Phase 2 dashboard work owns; they are measured and listed here so nobody has to rediscover them."
next_action: "Claim §11 Phase 2 bullet 4 (`Replace provisional bottom navigation with approved writer tabs`) and confirm with the user that the compact writer bar is now the approved set — it currently reads Dashboard · Projects · Messages · Profile, since Create gave up its slot to Projects on 2026-08-07. The bars themselves need no work: they have been role-aware and URL-driven from the desktop presets since Phase 1 (§8.2), and query-string destinations now resolve correctly. Then bullet 5, `/ai-tools` and `/offer-holds` as real route-aware screens — NOT started, no mobile code exists, so begin with the §4 gate for that page family (both are currently DESKTOP_MIGRATION_FALLBACK entries in mobileRouteManifest.js). Then bullet 6, account/settings and global auth/session behaviours. Independent and safe to start at any point: (a) migrate `ckm-tabs` (components/SectionTabs) onto `ckm-tabbar` — it is the last legacy prefix with a caller; (b) add the socket refresh, follow-up 5 below — desktop refetches the dashboard on seven `collab_*` events and mobile still never refreshes after first load. Do NOT re-derive the dashboard audit; it is complete in §19.3, with the payload shapes read out of server/controllers/dashboardController.js."
active_files: []
known_blockers: []
last_updated: "2026-08-07"
updated_by: "Claude Phase 2 dashboard data-truth + reachability session"
```

### 19.2 Phase status

| Phase | Status | Owner | Started | Completed | Evidence |
|---|---|---|---|---|---|
| 0. Foundation and route safety | COMPLETE | Codex, Claude | 2026-08-05 | 2026-08-05 | Route manifest/policy + 87-route coverage contract, stable preview fixture, shell-mode contract, route suspense/error boundary, expanded tokens, `.ckm` scoping + prefix registry contract, mobile analytics contract. 41 mobile tests in 7 files; full suite 583/585 (2 pre-existing AppShell failures); lint clean on all touched files; build + 53-route prerender pass; five-width CDP verification with a before/after computed-style diff |
| 1. Shared system and chrome | COMPLETE | Claude | 2026-08-05 | 2026-08-07 | **Role-aware chrome (`ckm-appbar`, `ckm-navbar`, `navigation/mobileNav.js`, `hooks/useMobileNav.js`, `--ckm-accent-on-dark`):** 251 mobile tests in 22 files; full suite 792/794 (the same 2 pre-existing `AppShell.render.test.jsx` failures, re-confirmed by stashing this session's changes and watching the identical 2 fail); lint clean on touched files; build + 53-route prerender pass. CDP sweep at 320/360/390/430/768 over all four audiences' bars at every width: 0 undersized targets, 0 text under 11px, 0 unnamed controls, 0 elements past the 520px frame, 0 contrast failures, no horizontal page scroll, 16/16 labels rendered unclipped. Measured rather than assumed: the selected tab is `rgb(221,90,66)` at **5.13:1** on the `rgb(15,15,15)` bar with the glyph's `FILL` axis at **1** against the idle tab's **0** (so the state is not carried by colour alone), the idle label at 19.17:1, both badges at 4.72:1, the search label at 5.21:1; each tab measured 49px tall and 80–128px wide depending on viewport; exactly **1** `aria-current` with the class applied and **0** on a URL belonging to no tab. Real dispatched Tab keys walked 4 stops, one per destination, each showing a `rgb(255,255,255) 2px solid` ring — the shared terracotta ring is invisible on the dark bar, the same override the toast surface needed. Dashboard baseline recaptured at all five widths; the previous images are archived in `baselines/phase0-dashboard/pre-role-aware-chrome/`. State set (`ckm-toast`, `ckm-message`, `ckm-offline`, `ckm-skel` extended, `ckm-empty` reused; `useOnlineStatus`; the live-region exemption in `useInertBackground`): 206 mobile tests in 19 files; full suite 747/749 (the same 2 pre-existing AppShell failures); lint clean on touched files; build + 53-route prerender pass. CDP sweep at 320/360/390/430/768, every check at every width: 10 state surfaces with no target under 44×44, no text under 11px, no unnamed control, nothing past the 520px frame, no horizontal page scroll. The load-bearing evidence is the three things a unit suite cannot reach — (1) with a full-screen dialog open, the app bar / banner / scroll surface all measured `inert` while the toast layer measured live, and a toast raised beforehand was still tappable and still dismissible *from over the dialog*, which is the whole point of the exemption; (2) real `Network.emulateNetworkConditions` offline → `navigator.onLine === false`, the gold banner appearing with `role="status"` at 4.90:1, measured as displacing the scroll body rather than covering it, then the green recovery state with a 78×44 action that cleared on dismiss; (3) real timing in a real browser, since the unit suite stubs framer-motion — an acknowledgement still present at 3.4s and gone by 6.0s, a three-message queue advancing First → Second → error in order, and the error still on screen at t+15s. Also measured: the error toast's icon at 8.66:1 on ink, a white 2px focus ring reached by a real dispatched Tab, and the bottom-nav lift verified on the *dashboard* (standard shell) where the toast clears the tab bar by 23px. Overlay set + focus/scroll helpers (`ckm-overlay`, `ckm-bottom-sheet`, `ckm-dialog`, `ckm-confirm`, `ckm-action-sheet`; `hooks/` scroll lock, focus trap + restoration, inert background, reduced motion, keyboard inset): 179 mobile tests in 18 files; full suite 720/722 (same 2 pre-existing AppShell failures); lint clean on touched files; build + 53-route prerender pass. CDP sweep at 320/360/390/430/768 opening all four surfaces at every width — 22 controls per width, **zero** undersized targets, zero unnamed controls, zero text under 11px, zero overflow past the 520px frame, no horizontal page scroll. The load-bearing evidence is real dispatched keys: 14 forward Tabs and 6 Shift+Tabs per surface per width (400 key events in total) never once landed focus outside the surface; Escape closed the surface, cleared `inert`, released the scroll lock, restored the exact scroll position, and returned focus to the opening control; a destructive confirmation focused **Cancel** at every width; and with a confirm dialog stacked over an action sheet the lower layer measured inert, the upper live, focus inside the upper, and Escape closed only the top. Collection/display family (`ckm-list`, `ckm-row`, `ckm-load-more`, `ckm-card`, `ckm-badge`, `ckm-chip` extended, `ckm-chip-row`, `ckm-segmented`, `ckm-tabbar`): 138 mobile tests in 16 files; full suite 679/681 (same 2 pre-existing AppShell failures); lint clean on touched files; build + 53-route prerender pass; CDP sweep at 320/360/390/430/768 with 37 targets at every width, none under 44×44 (`::after` hit regions measured, not assumed), no text under 11px, no unnamed control, no nested interactive element, no orphan `<li>`, no horizontal page scroll; real-key traversal proved one Tab stop per tab bar, Arrow/Home/End with wrap, the accent focus ring on the focused tab, and the next Tab landing on the panel. Form family (`ckm-field`, `ckm-control`, `ckm-checkbox`, `ckm-radio`, `ckm-switch`, `ckm-file-picker`): 99 mobile tests in 12 files; full suite 640/642; build passes; CDP sweep at 320–768 with 18 controls, none under 16px text or 44px touch, every invalid control's error reachable via `aria-describedby`; virtual-keyboard proxy passes. Action primitives (`ckm-button`, `ckm-icon-button`, `ckm-back`, `ckm-page-header`) + `useMobileBack` + `/__mobile-primitives` harness. 68 mobile tests in 15 files; full suite 610/612 (same 2 pre-existing AppShell failures); lint clean on touched files; build + 53-route prerender pass; CDP sweep at 320/360/375/390/412/430/480/768 with all 32 controls ≥44×44 and no horizontal page scroll |
| 2. Writer navigation/dashboard | IN PROGRESS | Claude | 2026-08-07 | — | Bullets 1 and 2 complete. 288 mobile tests in 25 files (was 251/22); full suite 829/831 (same 2 pre-existing AppShell failures, re-confirmed by stashing); lint clean; build + 53-route prerender pass. Five-width browser sweep (320/360/390/430/768) with 0 undersized targets, 0 text under 11px, 0 unnamed controls, 0 overflow, no horizontal scroll — on the shipped dashboard and, with the tabs temporarily restored, on Performance/Reviews/Projects and all overlays. Measured rather than assumed: 4/4 probe points on a project card resolve to the title's link while Share stays independently hittable; 14 dispatched Tabs escaped the AI sheet 0 times with the scroll surface and app bar both `inert`; Escape restored focus to `ckm-rev__details` exactly; the logout confirmation is `role="alertdialog"` focused on **Cancel**. The SectionTabs blocker was answered (option B) and implemented the same session — Projects/Reviews are `/dashboard?tab=…` destinations in the writer preset, which also exposed and fixed a NavBar defect marking **two** tabs `aria-current`. Final: full suite 835/837; `?tab=projects`/`?tab=reviews`/`?tab=performance` each verified clean at all five widths. |
| 3. Creation/upload/editor | NOT STARTED | — | — | — | — |
| 4. Discovery/project consumption | NOT STARTED | — | — | — | — |
| 5. Profiles/network/messages | NOT STARTED | — | — | — | — |
| 6. Challenges/hall of fame | NOT STARTED | — | — | — | — |
| 7. Industry/reader | NOT STARTED | — | — | — | — |
| 8. Public/auth/onboarding/legal | NOT STARTED | — | — | — | — |
| 9. Admin/finance | NOT STARTED | — | — | — | — |
| 10. Hardening/release | NOT STARTED | — | — | — | — |

### 19.3 Session log template

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
