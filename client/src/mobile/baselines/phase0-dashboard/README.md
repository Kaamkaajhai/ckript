# Phase 0 dashboard baseline

Captured from the development-only `/__mobile-preview` fixture, which renders
the production mobile Dashboard component with deterministic local data and
makes no authenticated API requests.

| File | Viewport |
|---|---:|
| `dashboard-320x720.png` | 320 x 720 |
| `dashboard-360x800.png` | 360 x 800 |
| `dashboard-390x844.png` | 390 x 844 |
| `dashboard-430x932.png` | 430 x 932 |
| `dashboard-768x1024.png` | 768 x 1024 |

These images are regression references, not final design approval. Phase 2 must
still remove Dashboard's placeholder and `desktopOnly()` behavior.

## Capture method

Headless Chrome driven over CDP with `Emulation.setDeviceMetricsOverride`.
Do **not** use `--window-size` on Windows: Chrome clamps the window near 500 px
and crops the page instead of reflowing it. Await `document.fonts.ready` before
capturing, or Material Symbols ligatures render as literal words ("search",
"add") and fake a horizontal overflow.

## What the bottom bar shows here

From the 2026-08-07 revision the tab bar takes its selected tab from the URL,
and this fixture's URL is `/__mobile-preview` — which belongs to no tab. So the
baseline correctly shows **no** tab selected. That is the same answer the bar
gives on any screen outside its destinations, and it is the behaviour, not a
capture defect. The selected state is measured separately (plan §19,
2026-08-07: `#dd5a42` at 5.13:1 on the bar, with the glyph's FILL axis at 1).

## Revisions

- **2026-08-05 (initial, archived in `pre-css-scoping/`)** — captured before the
  shell, token and CSS-scoping work.
- **2026-08-05 (current)** — recaptured after normalizing every mobile selector
  under `.ckm` (plan §7.1). Scoping raised mobile specificity above the desktop
  global sheet, which had been overriding four authored mobile styles, so the
  differences against `pre-css-scoping/` are intentional fixes:
  1. buttons and tab labels render `--ckm-body` (IBM Plex Sans) instead of the
     desktop sheet's Inter;
  2. the avatar's initials render white on the dark circle instead of near-black
     on near-black (previously invisible);
  3. an inactive section tab renders muted instead of full-strength ink;
  4. `.ckm-ov__hero-copy` regains its authored `margin-top: 11px`, making the
     hero card and the page 11 px taller.

  Verified by an element-by-element computed-style and geometry diff of the
  running app before and after the change; nothing else moved. That same diff
  caught one regression the rewrite did introduce — `.ckm-topbar__search span`
  became specific enough to beat the Material Symbols font rule and broke the
  search icon — which is why the label now carries its own
  `.ckm-topbar__search-label` class instead of being styled by element type.
- **2026-08-07 (current)** — recaptured after Phase 1 bullet 2 replaced the
  provisional two-item Dashboard/Challenge bar with the role-aware four-tab bar
  (`ckm-navbar`) and the writer-only top bar with the audience-aware app bar
  (`ckm-appbar`). The previous images are archived in `pre-role-aware-chrome/`.
  Intentional differences against that folder:
  1. the bottom bar has four destinations (Dashboard · Create · Messages ·
     Profile), taken from the writer's desktop nav preset, instead of two;
  2. its labels render at 11px rather than 9px, and the badge at 11px rather
     than 9px, clearing the floor in plan §7.3;
  3. each tab is a link filling an equal column, at least 44px tall — the old
     items measured ~42px and were sized by their content;
  4. the app bar's search field is 44px rather than 38px and its label renders
     in `--ckm-text-3` rather than a literal `#b3ac9f` (which measured ~2.2:1);
  5. the bell is a 44px target rather than 38px, and the avatar keeps its 34px
     drawing inside a 44px hit region.
