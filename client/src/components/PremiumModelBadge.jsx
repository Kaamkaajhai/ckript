/**
 * PremiumModelBadge
 *
 * Displays a premium luxury badge for Film Industry Professional subscribers.
 * Shown on profile pages so everyone can see the user has a premium membership.
 *
 * Props:
 *   size   — "sm" | "md" | "lg"  (default "md")
 *   dark   — boolean (dark-mode flag)
 *   tooltip — boolean (show tooltip on hover, default true)
 */

import { useState } from "react";

/* ── Diamond / gem SVG icon ─────────────────────────────────────────── */
const DiamondIcon = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2L2 9l10 13L22 9 12 2z" opacity="0.18" />
    <path d="M12 2l-5 7h10L12 2z" />
    <path d="M7 9L12 22l5-13H7z" opacity="0.75" />
    <path d="M2 9h5l5 13L2 9z" opacity="0.55" />
    <path d="M22 9h-5l-5 13 10-13z" opacity="0.55" />
  </svg>
);

/* ── Size presets ────────────────────────────────────────────────────── */
const SIZES = {
  sm: {
    wrap: "px-2 py-0.5 gap-1 rounded-md text-[9px]",
    icon: 10,
    dot: "w-1 h-1",
  },
  md: {
    wrap: "px-2.5 py-1 gap-1.5 rounded-lg text-[10px]",
    icon: 12,
    dot: "w-1.5 h-1.5",
  },
  lg: {
    wrap: "px-3 py-1.5 gap-2 rounded-xl text-[12px]",
    icon: 14,
    dot: "w-2 h-2",
  },
};

const PremiumModelBadge = ({ size = "md", dark = false, tooltip = true }) => {
  const [hovered, setHovered] = useState(false);
  const s = SIZES[size] || SIZES.md;

  return (
    <span className="relative inline-flex items-center select-none">
      {/* ── Main badge pill ────────────────────────────────────────── */}
      <span
        onMouseEnter={() => tooltip && setHovered(true)}
        onMouseLeave={() => tooltip && setHovered(false)}
        className={`
          inline-flex items-center font-bold uppercase tracking-[0.13em] cursor-default
          ${s.wrap}
          relative overflow-hidden
          transition-all duration-300
          premium-badge-pill
        `}
        style={{
          background: dark
            ? "linear-gradient(135deg, #1a1200 0%, #2d1f00 35%, #1a1200 100%)"
            : "linear-gradient(135deg, #fffbea 0%, #fef3c7 40%, #fffbea 100%)",
          border: "1px solid transparent",
          backgroundClip: "padding-box",
          boxShadow: hovered
            ? dark
              ? "0 0 0 1px rgba(251,191,36,0.5), 0 4px 16px rgba(251,191,36,0.22), inset 0 0 12px rgba(251,191,36,0.06)"
              : "0 0 0 1px rgba(180,130,0,0.35), 0 4px 16px rgba(180,130,0,0.15), inset 0 0 12px rgba(251,191,36,0.08)"
            : dark
            ? "0 0 0 1px rgba(251,191,36,0.28), 0 2px 8px rgba(251,191,36,0.12)"
            : "0 0 0 1px rgba(180,130,0,0.22), 0 2px 8px rgba(180,130,0,0.08)",
        }}
      >
        {/* Shimmer sweep */}
        <span
          className="pointer-events-none absolute inset-0 -skew-x-12 translate-x-[-110%]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.18) 50%, transparent 100%)",
            animation: "premiumShimmer 3s ease-in-out infinite",
          }}
          aria-hidden="true"
        />

        {/* Diamond icon */}
        <span
          style={{
            background: "linear-gradient(135deg, #f59e0b, #fcd34d, #d97706)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            display: "flex",
            alignItems: "center",
            filter: "drop-shadow(0 1px 2px rgba(251,191,36,0.5))",
          }}
        >
          <DiamondIcon size={s.icon} />
        </span>


      </span>



      {/* ── Keyframes injected once ──────────────────────────────────── */}
      <style>{`
        @keyframes premiumShimmer {
          0%   { transform: skewX(-12deg) translateX(-110%); }
          18%  { transform: skewX(-12deg) translateX(210%); }
          100% { transform: skewX(-12deg) translateX(210%); }
        }
      `}</style>
    </span>
  );
};

export default PremiumModelBadge;
