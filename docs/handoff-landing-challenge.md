# Handoff Spec: Landing — The Challenge sequence

**Target:** `client/src/pages/landing/sections/Challenge/` (replaces the current single section)
**Not in scope:** `/challenge` (the hub keeps its density), `/challenge/c/:slug`, `ChallengeStrip`

---

## Overview

Seven beats introducing the Challenge on the homepage, in the landing's own editorial register.
The division of labour, stated so it survives future edits:

| Surface | Job |
|---|---|
| Landing | **Inspire and convert.** One idea per beat, no long-form content |
| `/challenge` hub | **Inform and guide.** Six steps, judging criteria, ownership, eligibility, tabs |
| `/challenge/c/:slug` | **Manage a specific event.** Register, theme, deadline, submit |

Long-form content must live in exactly one place. Judging criteria, the ownership Q&A, the numbered
six steps and the eligibility prose stay on the hub and are **not** duplicated here — that is what
stops the two pages drifting apart.

**Placement:** between `Problem` and `Partners`, where the current section already sits. Keep the
existing `SectionBridge "The Challenge"` above it.

---

## Layout

Landing frame, unchanged from Features / Formats / Problem — reusing it is what makes a new section
read as native:

| Property | Value |
|---|---|
| Section padding | `clamp(80px, 9vw, 140px) clamp(20px, 5vw, 80px)` |
| Inner max-width | `1320px`, centred |
| Head → body gap | `clamp(44px, 5vw, 68px)` |
| Grid collapse | `900px` |
| Component swap | `600px` |

---

## Design tokens

Use these; do not introduce new ones.

| Token / class | Value | Usage |
|---|---|---|
| `.ckl-kicker` | sans caps 14px / 3px tracking | Beat 1 eyebrow |
| `.ckl-h2` + `.ckl-h2-em` | Baskervville, to 4.4rem | Beat 1 headline, em line |
| `.ckl-lead` | PT Serif 20/30 | Beat 1 paragraph |
| `--ck-paper` / `#fff` | light ground | Beats 1, 2, 3, 5, 6, 7 |
| `#0b0a06` | ink ground | **Beat 4 only** (measured from `Marquee` / `Trailer`) |
| `--ck-red` | coral | Diamond separators, timeline nodes |
| `--ck-border`, `--ck-card` | card chrome | Beat 2, beat 3 |
| Card radius | `16px` | Landing register (the interior's 4px is wrong here) |
| Primary button | `#161513` fill, white, sans 600 19px, **radius 0**, 244×70, `hov-btn-lift` |
| Secondary | sans 700 19px, `border-bottom: 2px solid #0B0A06`, `hov-underline` |
| Reveal | `data-ra="ckl-fadeUp"`, stagger `data-rd` in 0.06 steps | All beats |

**Icons:** use `landing/_shared/Icon` and `Diamond`. **No emoji** — the landing has no emoji anywhere
and they render differently per OS, which breaks the editorial register.

---

## Ground rhythm — one dark band, not four

Measured across the live landing: **8 light sections, 2 dark** (`Marquee` 126px, `Trailer` 660px) in
~8,000px. Dark is punctuation, not alternation, which is why the Trailer lands.

Three dark bands inside the Challenge would make it the loudest thing on the homepage — louder than
the Trailer, which is the flagship feature. So:

```
… Trailer (DARK) → Problem (light) → ┌ Challenge beats 1-3 (light)
                                     │ Challenge beat 4 STATS (DARK, ~200px)
                                     └ Challenge beats 5-7 (light)   → Partners (light) → CTA (light)
```

One dark band, short, echoing `Marquee`'s role. It also breaks the four-light run that currently
follows the Trailer.

---

## Beat specifications

### Beat 1 — Editorial opening

```
THE CKRIPT CHALLENGE

One theme.
48 hours.
Every writer begins at exactly the same moment.

A single theme is revealed. Every writer has forty-eight hours to turn it into a
screenplay. Every submission receives an AI evaluation, while the strongest stories
earn awards, recognition and a permanent place in Ckript's Hall of Fame.
```

- Kicker `.ckl-kicker`; headline `.ckl-h2` with line 2 in `.ckl-h2-em`; line 3 at `.ckl-lead` size
  in `--ck-heading-italic`; paragraph `.ckl-lead`, `max-width: 620px`.
- No card, no border, no CTA here — the CTA is beat 7.

### Beat 2 — Three cards

| | Title | Body | Icon |
|---|---|---|---|
| 1 | One Theme | Nobody knows the prompt before the timer starts. Every participant begins with the same blank page. | `target` |
| 2 | 48 Hours | Write inside the Ckript editor with autosave, live progress and a deadline that cannot move. | `timer` |
| 3 | Every Story Matters | Every script receives an AI evaluation. The best stories earn awards and become part of Ckript history. | `trophy` |

- 3-col grid ≥900px → 1-col below. `gap: 28px`. Card: `--ck-card` bg, `1px solid --ck-border`,
  `16px` radius, `36px 32px` padding.
- Stagger `data-rd` 0, 0.06, 0.12.
- **Static copy** — no data dependency, so this beat always renders.

### Beat 3 — Winner showcase (conditional)

```
Winner · Global Script Challenge 2026

Ada Okonkwo
"The Last Monsoon"

<logline>

View Hall of Fame →
```

**Renders only when a completed competition with a `winner` exists.** No placeholder person, no
empty card.

| Slot | Source | Notes |
|---|---|---|
| Competition + year | `item.name`, `item.year` | |
| Name | `winner.name` | |
| Script title | `winner.scriptTitle` | |
| Body text | `winner.logline` | **See integrity note below** |
| Link | `/hall-of-fame/${item.slug}` | |

> **Integrity — must not be skipped.** Your mock shows a quote and a genre. **Neither exists.**
> There is no `genre` field, and there is no writer-authored quote. `winner.logline` is the only
> prose available, and `winner.loglineByAi === true` when Ckript generated it — which is the case
> for the only winner in the database today.
>
> **Do not present an AI-generated logline as the writer's words.** Render it as an unquoted
> descriptive line, never in quotation marks and never attributed. If `loglineByAi` is true and you
> want quote styling, omit the line entirely rather than implying authorship.
>
> Genre: either drop it (recommended) or add the field server-side first. Do not hardcode "Drama".

### Beat 4 — Statistics (DARK, conditional)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1              420              27              15
   CHALLENGE      SCRIPTS          COUNTRIES       AWARDS
   HOSTED         WRITTEN                          PRESENTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Full-bleed `#0b0a06`, white figures in `--ck-serif` with `tabular-nums`, labels in sans caps 12px /
2px tracking at 70% white. ~200px tall. 4-col ≥900px → 2×2 below.

| Figure | Computation | Status |
|---|---|---|
| Challenges hosted | `archive.length` | ✅ available |
| Scripts written | `sum(scriptsSubmitted)` | ✅ available |
| Awards presented | `sum(winner ? 1 : 0) + (runnerUp ? 1 : 0) + special.length` | ✅ available |
| Countries | — | ⚠️ **not computable — see below** |

> **Blocker 1 — countries cannot be summed.** `/competitions/completed` returns
> `countriesRepresented` *per competition*. Adding them double-counts every country that entered
> more than one edition, so the figure inflates over time and is simply wrong.
>
> Options, in order of preference:
> 1. Add a distinct-across-all-editions count to the API (a `$addToSet` over entrant countries).
> 2. Ship the band with three figures instead of four.
>
> Do **not** sum the per-competition values.

> **Blocker 2 — the real numbers are 1, 1, 1, 1.** Your mock shows 420 / 27 / 15; the database has
> one competition, one script, one country, one award. A band reading **"1 CHALLENGE HOSTED ·
> 1 SCRIPT WRITTEN"** is worse than no band — it advertises that nothing has happened yet.
>
> **Gate the whole band** on `sum(scriptsSubmitted) >= 25` (the `PROOF_THRESHOLD` already used
> elsewhere in this feature). Below the threshold the band does not render and beat 5 moves up.
> Never hardcode the sample numbers.

### Beat 5 — Timeline strip

```
Register ──► Theme Released ──► Write ──► Submit ──► AI Review ──► Results
```

- **No ordinals.** `01 02 03` is the documentation signal being removed.
- Node: `Diamond size={7}` in `--ck-red`; connector: 1px `--ck-border` rule, `flex: 1`.
- Label: sans 500 15px, `--ck-ink`, `white-space: nowrap`.
- ≥1040px: single row, 6 beats. 600–1039px: wraps to 2 rows of 3 — **connectors must not render at
  the end of a row** (use `:not(:last-child)` per row, or drop connectors entirely when wrapped).
  <600px: vertical, connectors become 24px vertical rules.
- Static copy, always renders.

### Beat 6 — Writer chips

```
Writers from around the world.

Students · Professionals · Screenwriters · TV Writers
Anime Creators · First Script · Veterans · Indie Filmmakers
```

- Pill: `999px` radius, `1px solid --ck-border`, `10px 20px`, sans 500 15px.
- Stagger reveal: `data-rd` incrementing 0.04 per chip (8 chips → 0 to 0.28).
- Examples, never a gate — this list must never read as eligibility criteria.

### Beat 7 — CTA

```
Think you have a story?
The next challenge could begin any time.

[ Explore the Challenge → ]
```

- Primary button to `/challenge`.
- **One phase variance only:** when `phase === "registration_open"`, the label becomes
  `Register` and the destination `/challenge/register?c=${slug}`. Every other phase keeps
  "Explore the Challenge". Urgency and countdowns belong to `ChallengeStrip`, not here — the section
  is otherwise evergreen so it never goes stale between competitions.

---

## Data

Reuse the existing `landing/_shared/useChallenge.js` hook. Extend its return with the aggregate
figures; do not add a second fetch.

- **`publicApi` only.** The authenticated instance hard-redirects to sign-in on a stale token, which
  would bounce visitors off the homepage.
- Non-blocking, failure-silent. Beats 1, 2, 5, 6, 7 are static and must paint on the first frame
  regardless of the request. Beats 3 and 4 appear when data arrives.
- **No spinner, no layout shift, no error state on the homepage.**

---

## States

| Element | State | Behaviour |
|---|---|---|
| Beats 1, 2, 5, 6, 7 | any | Always render; no data dependency |
| Beat 3 | no winner yet | Entire block omitted |
| Beat 3 | `loglineByAi` true | Render unquoted and unattributed, or omit |
| Beat 4 | below threshold | Entire band omitted |
| Beat 4 | countries unavailable | Render three figures |
| Beat 7 | registration open | Label → "Register" |
| Cards / chips | hover | Existing `hov-*` classes only |
| Any | fetch fails | Silence — page renders as if dormant |

---

## Responsive

| Breakpoint | Changes |
|---|---|
| ≥1040px | Timeline single row |
| 900–1039px | Cards 3-col, stats 4-col, timeline wraps to 2×3 |
| 600–899px | Cards 1-col, stats 2×2, timeline 2×3 |
| <600px | Timeline vertical; buttons full-width to `max-width: 340px` |
| 320px | Must not overflow horizontally |

---

## Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| All beats | Scroll into view | `ckl-fadeUp` | existing | existing |
| Cards, chips | Scroll into view | staggered via `data-rd` | — | — |
| Buttons | Hover | `hov-btn-lift` | existing | existing |

> **Reduced motion — required, not optional.** The landing's reveal baseline is `opacity: 0` and
> only the observer un-hides it. Disabling the animation alone leaves the entire section
> **permanently invisible**. Ship:
> ```css
> @media (prefers-reduced-motion: reduce) {
>   .ckl .ckl-chal [data-ra] { animation: none !important; opacity: 1 !important; }
> }
> ```

---

## Accessibility

- Beat 1 headline is the section's only `h2`; card and beat titles are `h3`. Do not skip levels.
- Timeline: wrap in `<ol>` — it is a sequence. Connectors `aria-hidden="true"`.
- Stats: `<dl>` with `<dt>` label / `<dd>` figure; `column-reverse` for the visual flip.
- Chips are text, not controls — do not make them focusable.
- Winner block: one link wrapping the card, with an accessible name including the writer's name.
- Contrast: white on `#0b0a06` passes comfortably; **coral must not be used for text on the dark
  band** (under 4.5:1). Coral is the diamond and the timeline nodes only.
- Touch targets ≥44px.

---

## Definition of done

1. `npx vitest run` and `npm run build` (verifies 52 prerendered routes).
2. Homepage renders fully with the API stopped.
3. Stale token in `localStorage` → homepage still renders, no redirect.
4. Threshold check: with the real database (1 script), beat 4 must **not** appear.
5. Contrast sweep in both themes, transitions frozen before measuring.
6. `prefers-reduced-motion: reduce` → section visible, not blank.
7. 320 / 600 / 900 / 1040 / 1440px with no horizontal overflow.
8. Confirm no ordinals, no tabs, no judging criteria and no ownership prose reached the landing.
