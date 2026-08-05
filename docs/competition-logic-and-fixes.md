# The competition flow at `71b4fb6`, what broke it, and the fixes

Audit complete: 5 agents, 81 findings, synthesised into 21 ranked problems (5 critical, 7 high).
Every claim below was verified against the code. **Nothing has been changed.**

---

## PART 1 — The logic that was being followed at `71b4fb6`

### A. Three state axes, only two stored

**A1 · `lifecycle`** — `draft` → `published` → `archived`

| lifecycle | Public read (record, certificate) | Public write (register/submit) | Discoverable |
|---|---|---|---|
| `draft` | ✗ | ✗ | ✗ |
| `published` | ✓ | ✓ | ✓ |
| `archived` | ✓ **permanently** | ✗ | ✗ |

Two deliberately different loaders: `loadCompetitionById` (`$ne: "draft"`) for reads,
`loadOpenCompetitionById` (`"published"`) for "open for business". The docblock: *"Archiving retires
a competition from the live surface; it does not erase it… records that are supposed to be
permanent. Draft is the one lifecycle nothing public may reach."*

> **I withdraw my earlier "archived reachable by direct URL" finding.** That is this rule working.

**A2 · `visibility`** — `public` | `hidden`. Hidden means *"never DISCOVERED… stays fully usable for
anyone holding its direct link."* The axis is **discovery, never access**.

**A3 · `phase`** — derived, never stored: `announced → registration_open → registration_closed →
live → judging → results`. *"No cron job is needed… an admin correcting a date instantly fixes every
screen… **the client never decides anything — it renders the phase the API reports**."*
`resultsDeclaredAt` overrides date arithmetic.

### B. The theme is sealed server-side
`publicCompetition()` strips `theme` unless phase ∈ {live, judging, results}. *"Never rely on the
client hiding it."*

### C. Entry lifecycle, written once
`registered → writing → submitted → ai_processed → judged`. Submit locks the script **first**, then
claims atomically via `findOneAndUpdate`, writing the snapshot **inside that claim**. 60s grace.
Rewards idempotent via `grantOnce` + `entry.rewardsGranted`.

### D. Public pages use `publicApi`, never `services/api` (which hard-redirects on a stale token).

### E. Surfaces: landing (nav + conditional strip) → `/challenge` (hub) → `/challenge/c/:slug` (one
event) → `/hall-of-fame[/:slug]` (permanent record) → admin (create/edit/publish/declare).

---

## PART 2 — The fixes, in the order to apply them

### FIX 1 · Restore the `/hall-of-fame/:slug` route — CRITICAL, one line

`a73376d` ("Connect Events Hub Page card to dynamic backend data") deleted it as collateral:

```diff
- <Route path="/hall-of-fame/:slug" element={<HallOfFameDetail />} />
- <Route path="/events/:id?" element={<EventDetails />} />
+ <Route path="/events" element={<Events />} />
+ <Route path="/events/:id" element={<EventDetails />} />
```

It **does not 404** — the two-segment catch-all `/:projectHeading/:writerUsername` (App.jsx:543)
swallows it, and that sits behind `PrivateRoute`. Verified live: requesting
`/hall-of-fame/ujjwal-ka-test` logged-out lands on `/`. Silent, so nothing reaches error monitoring.

Three live links still point there: `ChallengeNow.jsx:219` ("See who won"), `CompetitionCard.jsx:65`
(**every Hall of Fame tab card**), `CompetitionAchievements.jsx:57`.

**Fix:** re-add the route at App.jsx:505. Fixes all three links at once. The dead
`HallOfFameDetail` lazy import at App.jsx:55 becomes live again.

### FIX 2 · Restore the theme seal — CRITICAL, one line

`competitionController.js:35-40`. Restore:

```js
if (!PHASES_WITH_THEME.has(phase)) delete obj.theme;
```

All three call sites already pass `phase` — no caller edits. This is the single choke point for
`listCompetitions` (:247), `getActiveCompetition` (:402) and `getMyEntry` (:542).

Three consequences beyond the leak I already showed you:

- **It broke your own page.** `CompetitionLanding.jsx:294` — *"Theme — only exists in the payload
  once the competition is live"* — now guards nothing.
- **A fairness break.** `getMyEntry` leaks the brief to registrants *before* the clock starts, while
  `openCompetitionEditor` still refuses to open until `live`. The only way to use that head start is
  to write off-platform and paste it in.
- **`/active?c=<slug>` leaks `hidden` competitions' themes** — the slug path exists precisely so
  internal events stay link-reachable.

**Also fix in the same commit:** four comments and one registration email now assert the opposite of
the code (`competitionController.js:31-33`, `:226-230`, `:258`, `competitionPhase.js:92-93`, and the
email at `:519` promising *"the theme is revealed then"*).

**Add a test.** The only competition test is `competitionPhase.test.js`, which never touches
`publicCompetition`. One assertion — an `announced` payload has no `theme` key — would have caught
this on the spot.

### FIX 3 · Make publishing possible again — CRITICAL

Verified two-lock deadlock:

1. The **only** client publish call is `AdminCompetitions.jsx:296`, inside `CompetitionEditor` —
   **no render site**, dead code.
2. `adminPublishCompetition` requires ≥1 non-blank rule (`competitionAdminController.js:262`), and
   `rules`/`faq` appear in the new editor **only in the mock seed** (`AdminCompetitionsEditor.jsx:75-76`).
   No module renders an editor for either — grep confirms zero modules touch them.

Every public query filters `lifecycle: "published"`, so **no competition created after this merge can
ever go live**.

**Fix:** add a Rules module and a Publish button to the new editor. Both are required — either alone
leaves the deadlock.

### FIX 4 · Make Delete Forever safe — CRITICAL

`competitionAdminController.js:290-303` deletes the Competition **first**, then entries, then unlinks
scripts — no transaction, no guard.

- Deleting a declared competition erases the Hall of Fame record and every judged snapshot, while
  `User.badges[].competitionId` still points at the deleted document.
- A mid-flight failure leaves scripts `competitionLocked: true` with **no competition left to release
  them** — and `Script.js` enforces that lock in saveDraft, updateScript *and* deleteScript. The
  writer can never edit or delete their own script again.
- `SettingsModule.jsx:93` says *"Entries will be orphaned."* They are **deleted**.

**Fix:** reverse the order — unlink scripts → delete entries → delete competition. Refuse when
`resultsDeclaredAt` is set (read the doc *before* deleting; the current code deletes first, so a
guard added after cannot run). Correct the UI copy.

### FIX 5 · Decide the `visibility: "private"` question — HIGH

Enum widened at `Competition.js:42`; `OverviewModule.jsx:70` offers *"Private (Invite only)"*. All
four filters still test `$ne: "hidden"` (`:62`, `:216`, `:240`, `:919`). **Private is strictly more
public than Hidden.** Proven: a private competition stayed on the public API and in the Hall of Fame
with its winner exposed.

**Fix:** either change the four filters to `visibility: "public"` (which makes both labels honest) or
remove `"private"` from the enum and the UI. Not both, not neither.

### FIX 6 · Restore the editors that were dropped — HIGH

The new console writes only fields it invented. Lost their editor while staying live on public pages:
`rules`, `faq`, `eligibility`, `referralTiers`, `theme.guidelines`, and `prizes.winner/runnerUp/special`.

That last one matters most: `CompetitionLanding.jsx:431-436` and `CompetitionDashboard.jsx:361-363`
render `prizes.*` — the new `PrizesModule` writes only `detailedPrizes`, which **only the Events page
renders**. An admin configuring prizes edits a list no competitor sees. It also empties the
declare-results special-award datalist, whose whole purpose was matching declared titles to advertised ones.

### FIX 7 · `/admin/competitions` is not a route — HIGH

The editor's back arrow and **both destructive actions** navigate there (`:121`, `:131`, `:150`).
Same catch-all — the admin lands on a broken public ScriptDetail after archiving or deleting. The
competitions list is a tab inside `/admin`, not a path.

### FIX 8 · Controls that silently do nothing — MEDIUM

- `automation.autoPublishResults/autoGenerateCertificates/autoSendReminders` — stored, editable,
  **zero readers**. Auto-publish also contradicts the no-cron model outright.
- Per-item `visibility` on `detailedPrizes[]` and `sponsors[]` — written by the UI, never read;
  non-public items ship on the unauthenticated response.
- `secondRunnerUp` — unawardable end to end: not seeded on create, not in the award enum, no
  declare-results branch, no badge, filtered out of `buildPublicResults`. The grant code hardcodes
  30 days and knows only gold/silver, so the advertised "Bronze (14 days)" can't be expressed anyway.
- `theme.wordLimit / timeLimit / requiredLength` — published to writers as hard rules, never enforced
  at submit (the only content check is `source.length < 100`).

---

## PART 3 — `/events` vs `/challenge`

**Two UIs over one dataset, and it isn't close.** No Event model, no `/api/events` route, no events
controller. `/events` calls `/competitions/list`; `/events/:id` calls `/competitions/active?c=<slug>`
— the same endpoints `/challenge` uses. ~2,900 client lines re-rendering nine content blocks that
already have components, none of which any Events file imports.

**The recommendation is to keep `/challenge` and delete `/events`** — not on seniority, but because
`/events` is a strictly weaker renderer of the same payload:

- It never reads `event.phase`, so the countdown target, its label, the CTA gating and the results
  view are all wrong outside `registration_open`.
- Its one primary CTA hands off to `/challenge/register`, which bounces every phase except
  `registration_open` — it **cannot complete its own primary action** without the feature it duplicates.
- No Hall of Fame, no My Challenges, no eligibility gating, no SEO entry, no sitemap entry.
- `EventResources` reads `title`/`description`; the schema stores `label` — every card renders blank.
- `EventPosterModal` opens a full-screen interstitial on every first landing visit pointing at a
  hardcoded slug (`'the-final-draft'`) it never verifies exists.

**Twelve of the findings disappear with that deletion.** The two visual ideas worth keeping — the
prize tiers and the timeline treatment — belong in `components/competition/`.

---

## What is fine, and should be said plainly

- **The derived-phase model is untouched.** `getCompetitionPhase`, `buildTimeline`, `canSubmitNow`
  unmodified; no scheduler introduced.
- **Reward idempotency intact.** `grantOnce` and `rewardsGranted` unchanged — no double-granting.
- **Declare-results still works** end to end and is still reachable.
- **The schema widening is legitimate** — every field the editor writes is whitelisted and on the
  model. The damage is entirely in the reverse direction: fields it *stopped* writing.
- **`b57f628` did NOT break the logged-out experience** for `/challenge` or `/hall-of-fame`. It is a
  4-line change touching only the `/events` routes. Worth stating, since it is the kind of thing
  that gets blamed in a merge this size.

---

## Two process fixes worth more than any single bug

1. **Narrow the ESLint `varsIgnorePattern` from `/^[A-Z_]/`.** That pattern is why 266 lines of dead
   admin code — containing the only working publish call — sat invisible through a 42-commit merge.
2. **Add a `path="*"` 404 route.** The two-segment catch-all silently swallowed *both* route
   regressions here. A deleted route should fail loudly, not resolve to ScriptDetail.

And when you talk to the author: separate the disagreements from the defects. The shell-on-public-pages
question, the richer prize model and the timeline redesign are legitimate different choices. The theme
seal, the deleted route, the unreachable publish path and the delete ordering are not — and three of
those four were almost certainly unintentional.
