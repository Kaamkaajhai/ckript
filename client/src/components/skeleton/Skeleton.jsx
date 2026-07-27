/*
 * Skeleton — the canonical loading primitive for the writer section.
 *
 * One small set of composable bones (block, text, circle, button) plus a
 * `SkeletonScreen` wrapper that carries the accessibility contract. Every
 * page-level skeleton in the creator/writer experience is built from these,
 * so the whole section shimmers with one visual language and one "shade of
 * white". Visuals live in ./skeleton.css; these components only shape layout.
 *
 * Accessibility
 * -------------
 * Individual bones are decorative (`aria-hidden`). The `SkeletonScreen`
 * wrapper owns the single polite live-region announcement ("Loading …") and
 * `aria-busy`, so screen readers hear one clear status instead of a swarm of
 * empty boxes.
 *
 * Tone
 * ----
 * Default bones are warm off-white (the writer shell). Pass `tone="cool"` on a
 * `SkeletonScreen` (or any wrapper) to retune every bone inside it for cool /
 * slate surfaces such as Messages, Search and the Script Workbench.
 */

import "./skeleton.css";

const toCss = (v) => (typeof v === "number" ? `${v}px` : v);

/* ── Base bone ──────────────────────────────────────────────────────────────
   w/h accept numbers (→ px) or any CSS length ("100%", "6rem"). `radius`
   overrides the token; `circle`/`pill` are shape shortcuts. */
export function Skeleton({
  w,
  h,
  radius,
  circle = false,
  pill = false,
  text = false,
  className = "",
  style,
  ...rest
}) {
  const shape = circle ? " ck-sk--circle" : pill ? " ck-sk--pill" : text ? " ck-sk--text" : "";
  return (
    <span
      aria-hidden="true"
      className={`ck-sk${shape}${className ? ` ${className}` : ""}`}
      style={{
        width: toCss(w),
        height: toCss(h),
        ...(radius != null ? { borderRadius: toCss(radius) } : null),
        ...style,
      }}
      {...rest}
    />
  );
}

/* ── Multi-line text bone ────────────────────────────────────────────────────
   Renders `lines` rows; the last row is shortened (`lastWidth`) so a paragraph
   never reads as a solid rectangle. */
export function SkeletonText({
  lines = 3,
  lineHeight = 11,
  gap = 9,
  width = "100%",
  lastWidth = "62%",
  className = "",
  style,
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: toCss(gap), ...style }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          text
          h={lineHeight}
          w={i === lines - 1 && lines > 1 ? lastWidth : width}
        />
      ))}
    </span>
  );
}

/* ── Circle bone (avatars, icon chips) ─────────────────────────────────────── */
export function SkeletonCircle({ size = 40, className = "", style }) {
  return <Skeleton circle w={size} h={size} className={className} style={style} />;
}

/* ── Button-shaped bone ─────────────────────────────────────────────────────── */
export function SkeletonButton({ w = 120, h = 40, radius = 11, className = "", style }) {
  return <Skeleton w={w} h={h} radius={radius} className={className} style={style} />;
}

/* ── Screen wrapper ──────────────────────────────────────────────────────────
   Owns aria-busy + the single polite live announcement. Wrap every page-level
   skeleton in this. `tone="cool"` retunes bones for cool surfaces. */
export function SkeletonScreen({
  label = "Loading…",
  tone = "warm",
  as = "div",
  className = "",
  style,
  children,
  ...rest
}) {
  const Tag = as;
  const toneClass = tone === "cool" ? " ck-sk-tone-cool" : "";
  return (
    <Tag
      aria-busy="true"
      className={`ck-sk-screen${toneClass}${className ? ` ${className}` : ""}`}
      style={style}
      {...rest}
    >
      <span className="ck-sk-sr" role="status" aria-live="polite">
        {label}
      </span>
      {children}
    </Tag>
  );
}

export default Skeleton;
