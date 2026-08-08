import "./Skeletons.css";

/*
 * Skeletons — reusable loading placeholders (prefix: ckm-skel, second owner).
 *
 * The existing `components/Skeleton.jsx` is the *boot* skeleton: one fixed
 * drawing of the dashboard's own topbar, tab strip and hero. It is not a
 * primitive and cannot become one without becoming the dashboard's layout in
 * disguise. These are the primitive: shapes a screen composes into the shape of
 * the thing it is waiting for.
 *
 * They share the `ckm-skel` prefix rather than minting a second one, as the plan
 * directs and as `ckm-chip` already does with two owner files.
 *
 * ---------------------------------------------------------------------------
 * What a screen reader gets
 * ---------------------------------------------------------------------------
 * A pile of empty grey boxes is not information; announced one by one it is
 * noise. So every group is one `role="status"` carrying one sentence — "Loading
 * your projects" — and the shapes themselves are `aria-hidden`. The count is
 * deliberately not announced: it is a guess about layout, and telling someone
 * "3 items" that then resolves to 40 is worse than saying nothing.
 *
 * Motion: the pulse is a CSS animation, so `theme/base.css`'s reduced-motion
 * block already stops it. Nothing here needs to re-implement that.
 */

/** One grey box. Width/height/radius are layout, so they stay inline —
 *  a placeholder exists to match a specific box on a specific screen. */
export function SkeletonShape({
  width = "100%",
  height = 16,
  radius = "var(--ckm-r-sm)",
  className = "",
  style,
  ...rest
}) {
  return (
    <span
      className={["ckm-skel__shape", className].filter(Boolean).join(" ")}
      style={{ width, height, borderRadius: radius, ...style }}
      {...rest}
    />
  );
}

export function SkeletonCircle({ size = 40, className = "", ...rest }) {
  return (
    <SkeletonShape
      width={size}
      height={size}
      radius="50%"
      className={["ckm-skel__shape--circle", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

/*
 * A paragraph's worth of lines. The last line is short because real text ends
 * mid-line — a stack of equal bars reads as a table and makes the resolved
 * content look like a different component arriving.
 */
export function SkeletonText({ lines = 3, lineHeight = 12, gap = "var(--ckm-space-2)", className = "" }) {
  return (
    <span className={["ckm-skel__lines", className].filter(Boolean).join(" ")} style={{ gap }}>
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <SkeletonShape
          key={index}
          height={lineHeight}
          width={index === lines - 1 && lines > 1 ? "62%" : "100%"}
        />
      ))}
    </span>
  );
}

/** The waiting form of ListRow: avatar, title, one line of supporting text. */
export function SkeletonRows({ rows = 3, media = true, className = "" }) {
  return (
    <span className={["ckm-skel__rows", className].filter(Boolean).join(" ")}>
      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <span className="ckm-skel__row" key={index}>
          {media && <SkeletonCircle size={40} />}
          <span className="ckm-skel__row-text">
            <SkeletonShape height={14} width="72%" />
            <SkeletonShape height={11} width="45%" />
          </span>
        </span>
      ))}
    </span>
  );
}

/*
 * The wrapper that makes a pile of shapes legible to assistive technology.
 * Every skeleton on a screen should be inside exactly one of these — two groups
 * means the same load is announced twice.
 */
export default function SkeletonGroup({ label = "Loading", className = "", children, ...rest }) {
  return (
    <div
      className={["ckm-skel__group", className].filter(Boolean).join(" ")}
      role="status"
      aria-busy="true"
      {...rest}
    >
      <span className="ckm-sr-only">{label}</span>
      <span className="ckm-skel__shapes" aria-hidden="true">
        {children}
      </span>
    </div>
  );
}
