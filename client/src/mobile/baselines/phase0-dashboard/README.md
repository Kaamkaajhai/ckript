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
