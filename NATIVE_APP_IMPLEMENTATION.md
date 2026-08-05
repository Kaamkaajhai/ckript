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
| Dashboard sections and overlays (one family, one prefix per file) | `ckm-ov`, `ckm-perf`, `ckm-rev`, `ckm-proj`, `ckm-pc`, `ckm-aid`, `ckm-allp`, `ckm-noti`, `ckm-acct` |
| Shared mobile components | `ckm-topbar`, `ckm-bottomnav`, `ckm-tabs`, `ckm-sheet`, `ckm-empty`, `ckm-skel`, `ckm-island`, `ckm-statusbar`, `ckm-btn` (legacy dashboard button; superseded by `ckm-button`), `ckm-chip`, `ckm-viewmore` |
| Phase 1 action primitives | `ckm-button` (`components/buttons/Button.css`), `ckm-icon-button` (`components/buttons/IconButton.css`), `ckm-back` (`components/navigation/BackButton.css`), `ckm-page-header` (`components/app-bars/PageHeader.css`) |
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

The final tab sets are decided during foundation research, but likely starting points are:

- **Writer:** Dashboard, Discover, Create, Messages, Profile; Challenge remains prominent through dashboard/menu or may replace Discover after product approval.
- **Industry:** Discover, Dashboard, Writers, Messages, Profile.
- **Reader:** Home, Discover, Featured, Messages, Profile.
- **Admin:** Console, Search, Messages, Profile, More.

The current two-item Dashboard/Challenge bar is provisional. A URL determines the active tab; local component state does not.

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
- [ ] Role-aware top app bars and bottom navigation.
- [x] Page header, back button, icon button, primary/secondary/destructive buttons. *(2026-08-05: `ckm-button` (primary/secondary/tertiary/destructive × md/lg, pending, disabled, link forms), `ckm-icon-button` (44px hit region at every size, badge folded into the accessible name), `ckm-back` + `hooks/useMobileBack.js` (§8.3 history-vs-parent rule), `ckm-page-header`.)*
- [ ] Form field, textarea, select/combobox, checkbox, radio, switch, file picker.
- [ ] List row, card, chip, badge, segmented control, tabs, pagination/load-more.
- [ ] Bottom sheet, full-screen dialog, confirm dialog, context menu.
- [ ] Toast/status, inline error, retry, skeleton, empty state, offline state.
- [ ] Scroll lock, focus trap/restoration, reduced motion, safe-area and keyboard helpers.
- [x] Story/demo route or test harness for states and theme variants. *(2026-08-05: `/__mobile-primitives` → `mobile/dev/PrimitiveGallery.jsx`; every new primitive adds its states here.)*

**Exit gate:** primitives are accessible, themeable, touch-safe, documented, and verified at 320–768 px without requiring page-specific overrides.

### Phase 2 — Writer navigation and dashboard completion

- [ ] Dashboard research/parity audit against desktop.
- [ ] Remove local/static production placeholders and wire real services.
- [ ] Complete search, notification, account, profile, project, share, and collaboration destinations used by dashboard.
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

For every future implementation session, verify that the consulted guidance is still current and record newly adopted sources in the decision log.

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
current_phase: 1
current_work_item: "Phase 1 action primitives + demo harness COMPLETE; next slice is the form-field family"
last_completed_work_item: "Button / IconButton / BackButton (+ useMobileBack) / PageHeader, the ckm-sr-only utility, the SC 2.4.11 scroll-padding on the shell, and the /__mobile-primitives gallery"
next_action: "Continue Phase 1 with the form family (field, textarea, select/combobox, checkbox, radio, switch, file picker) in client/src/mobile/components/forms/. Each needs: a registered prefix in theme/cssPrefixRegistry.js, a label programmatically tied to its control, error text tied by aria-describedby + aria-invalid, >=16px rendered input text (tokens: --ckm-text-body) so mobile Safari does not zoom on focus, a 44px hit region, a render test, and a states row added to dev/PrimitiveGallery.jsx. Verify with the keyboard open, not only at rest."
active_files: []
known_blockers: []
last_updated: "2026-08-05"
updated_by: "Claude Phase 1 primitives session"
```

### 19.2 Phase status

| Phase | Status | Owner | Started | Completed | Evidence |
|---|---|---|---|---|---|
| 0. Foundation and route safety | COMPLETE | Codex, Claude | 2026-08-05 | 2026-08-05 | Route manifest/policy + 87-route coverage contract, stable preview fixture, shell-mode contract, route suspense/error boundary, expanded tokens, `.ckm` scoping + prefix registry contract, mobile analytics contract. 41 mobile tests in 7 files; full suite 583/585 (2 pre-existing AppShell failures); lint clean on all touched files; build + 53-route prerender pass; five-width CDP verification with a before/after computed-style diff |
| 1. Shared system and chrome | IN PROGRESS | Claude | 2026-08-05 | — | Action primitives (`ckm-button`, `ckm-icon-button`, `ckm-back`, `ckm-page-header`) + `useMobileBack` + `/__mobile-primitives` harness. 68 mobile tests in 15 files; full suite 610/612 (same 2 pre-existing AppShell failures); lint clean on touched files; build + 53-route prerender pass; CDP sweep at 320/360/375/390/412/430/480/768 with all 32 controls ≥44×44 and no horizontal page scroll |
| 2. Writer navigation/dashboard | NOT STARTED | — | — | — | — |
| 3. Creation/upload/editor | NOT STARTED | — | — | — | — |
| 4. Discovery/project consumption | NOT STARTED | — | — | — | — |
| 5. Profiles/network/messages | NOT STARTED | — | — | — | — |
| 6. Challenges/hall of fame | NOT STARTED | — | — | — | — |
| 7. Industry/reader | NOT STARTED | — | — | — | — |
| 8. Public/auth/onboarding/legal | NOT STARTED | — | — | — | — |
| 9. Admin/finance | NOT STARTED | — | — | — | — |
| 10. Hardening/release | NOT STARTED | — | — | — | — |

### 19.3 Session log template

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

Begin **Phase 0**, not a feature page:

1. render and capture the current mobile dashboard at 320, 360, 390, 430, and 768 px;
2. write tests that demonstrate the present route-swallowing defect;
3. design `mobileRoutePolicy.js` and `mobileRouteManifest.js` around the existing audience/shell policy;
4. implement route-aware `MobileRoutes` inside the existing `BrowserRouter`;
5. preserve the dashboard at `/dashboard` and introduce explicit migration fallbacks for every other route;
6. verify deep links, browser back/forward, auth loading, writer/industry/reader/admin roles, and the 768 px boundary;
7. update section 19 with evidence and the next foundation item.

Only after that exit gate passes should work begin on the shared mobile system and the next route-level screen.
