import React, { useRef, useState, useEffect } from "react";
import {
  Trophy,
  Medal,
  Award,
  Star,
  Sparkles,
  Crown,
  ChevronDown,
  Flame,
  Gift,
} from "lucide-react";

/* ── Intersection Observer hook ── */
function useInView(ref, options = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.15, ...options }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

/* ── Prize Tier Card ── */
function PrizeTierCard({ tier, items, index }) {
  const ref = useRef(null);
  const inView = useInView(ref);

  const TIERS = {
    winner: {
      icon: Crown,
      label: "Grand Prize",
      subtitle: "The ultimate reward for the best script.",
      rank: "1st",
      bg: "linear-gradient(145deg, #111 0%, #1a1511 50%, #222 100%)",
      text: "#fff",
      textMuted: "rgba(255,255,255,0.65)",
      accentColor: "#D4A853",
      accentBg: "rgba(212, 168, 83, 0.12)",
      dotColor: "#D4A853",
      borderColor: "rgba(212, 168, 83, 0.3)",
      glowColor: "rgba(212, 168, 83, 0.15)",
    },
    runnerUp: {
      icon: Medal,
      label: "Runner-Up",
      subtitle: "Exceptional recognition for top contenders.",
      rank: "2nd",
      bg: "#FFFFFF",
      text: "#111",
      textMuted: "#666",
      accentColor: "#8A8A8A",
      accentBg: "#F4F2EE",
      dotColor: "#A0A0A0",
      borderColor: "var(--event-border, #E8E5E1)",
      glowColor: "rgba(0,0,0,0.04)",
    },
    secondRunnerUp: {
      icon: Award,
      label: "2nd Runner-Up",
      subtitle: "Outstanding effort deserving of recognition.",
      rank: "3rd",
      bg: "#FFFFFF",
      text: "#111",
      textMuted: "#666",
      accentColor: "#B47946",
      accentBg: "#FBF5EF",
      dotColor: "#B47946",
      borderColor: "var(--event-border, #E8E5E1)",
      glowColor: "rgba(180, 121, 70, 0.06)",
    },
  };

  const t = TIERS[tier] || TIERS.runnerUp;
  const Icon = t.icon;
  const isWinner = tier === "winner";

  return (
    <div
      ref={ref}
      className="ckl-prize-card"
      style={{
        background: t.bg,
        border: `1px solid ${t.borderColor}`,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 120}ms`,
      }}
    >
      {/* Decorative glow */}
      {isWinner && (
        <>
          <div className="ckl-prize-glow-1" />
          <div className="ckl-prize-glow-2" />
        </>
      )}

      {/* Header */}
      <div className="ckl-prize-header">
        <div className="ckl-prize-rank" style={{ background: t.accentBg, color: t.accentColor }}>
          {t.rank}
        </div>
        <div className="ckl-prize-icon" style={{ background: t.accentBg }}>
          <Icon size={22} strokeWidth={2} style={{ color: t.accentColor }} />
        </div>
        <div className="ckl-prize-titles">
          <h3 className="ckl-prize-name" style={{ color: t.text }}>
            {t.label}
          </h3>
          <p className="ckl-prize-sub" style={{ color: t.textMuted }}>
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div
        className="ckl-prize-divider"
        style={{ borderColor: isWinner ? "rgba(255,255,255,0.08)" : "var(--event-border, #E8E5E1)" }}
      />

      {/* Benefits list */}
      <ul className="ckl-prize-list">
        {items.map((item, idx) => (
          <li key={idx} className="ckl-prize-item">
            <span className="ckl-prize-dot" style={{ background: t.dotColor }} />
            <span style={{ color: isWinner ? "rgba(255,255,255,0.9)" : "#444" }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Special Award Card ── */
function SpecialAwardCard({ award, index }) {
  const ref = useRef(null);
  const inView = useInView(ref);

  return (
    <div
      ref={ref}
      className="ckl-prize-special"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(16px)",
        transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 100}ms`,
      }}
    >
      <div className="ckl-prize-special-icon">
        <Sparkles size={16} strokeWidth={2} />
      </div>
      <div>
        <h4 className="ckl-prize-special-title">{award.title}</h4>
        {award.description && (
          <p className="ckl-prize-special-desc">{award.description}</p>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function EventPrizes({ prizes, prizePool }) {
  const hasWinner = prizes?.winner?.length > 0;
  const hasRunnerUp = prizes?.runnerUp?.length > 0;
  const hasSecondRunnerUp = prizes?.secondRunnerUp?.length > 0;
  const hasSpecial = prizes?.special?.length > 0;

  if (!hasWinner && !hasRunnerUp && !hasSecondRunnerUp && !hasSpecial && !prizePool) return null;

  const sectionRef = useRef(null);
  const sectionInView = useInView(sectionRef);

  /* Count how many tier cards we have for grid sizing */
  const tierCount = [hasWinner, hasRunnerUp, hasSecondRunnerUp].filter(Boolean).length;

  return (
    <section
      ref={sectionRef}
      className="ckl-event-section ckl-event-section--divider"
      style={{ background: "var(--event-surface, #FFF)" }}
    >
      <div className="ckl-event-container">
        {/* Section header */}
        <div
          className="ckl-prize-section-header"
          style={{
            opacity: sectionInView ? 1 : 0,
            transform: sectionInView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="ckl-prize-section-label">
            <Trophy size={14} strokeWidth={2.5} />
            <span>Rewards</span>
          </div>
          <h2 className="ckl-event-title-section" style={{ marginBottom: 0 }}>
            Prizes & Awards
          </h2>
          <p className="ckl-prize-section-sub">
            Win exclusive perks, industry exposure, and massive rewards.
          </p>

          {prizePool && (
            <div className="ckl-prize-pool">
              <div className="ckl-prize-pool-icon">
                <Flame size={20} strokeWidth={2} />
              </div>
              <div>
                <span className="ckl-prize-pool-label">Total Prize Pool</span>
                <span className="ckl-prize-pool-value">{prizePool}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tier cards grid */}
        <div
          className="ckl-prize-grid"
          data-cols={tierCount}
        >
          {hasWinner && <PrizeTierCard tier="winner" items={prizes.winner} index={0} />}
          {hasRunnerUp && <PrizeTierCard tier="runnerUp" items={prizes.runnerUp} index={1} />}
          {hasSecondRunnerUp && <PrizeTierCard tier="secondRunnerUp" items={prizes.secondRunnerUp} index={2} />}
        </div>

        {/* Special Awards */}
        {hasSpecial && (
          <div className="ckl-prize-specials-wrap">
            <h3 className="ckl-prize-specials-heading">
              <Star size={16} strokeWidth={2} />
              Special Awards
            </h3>
            <div className="ckl-prize-specials-grid">
              {prizes.special.map((award, idx) => (
                <SpecialAwardCard key={idx} award={award} index={idx} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scoped Styles */}
      <style>{`
        /* ── Section Header ── */
        .ckl-prize-section-header {
          text-align: center;
          max-width: 640px;
          margin: 0 auto clamp(40px, 6vw, 72px);
        }
        .ckl-prize-section-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--ck-sans);
          font-size: var(--event-text-xs, 0.75rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--event-accent, #8A3B2E);
          margin-bottom: 16px;
        }
        .ckl-prize-section-sub {
          font-family: var(--ck-serif);
          font-size: var(--event-text-lg, 1.2rem);
          line-height: 1.5;
          color: var(--event-text-muted, #555);
          margin-top: 12px;
        }

        /* ── Prize Pool badge ── */
        .ckl-prize-pool {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          margin-top: 24px;
          padding: 12px 24px 12px 16px;
          background: var(--event-surface-alt, #F4F2EE);
          border: 1px solid var(--event-border, #E8E5E1);
          border-radius: var(--event-radius-full, 9999px);
        }
        .ckl-prize-pool-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--event-accent-light, #F4EAE8);
          color: var(--event-accent, #8A3B2E);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ckl-prize-pool-label {
          display: block;
          font-family: var(--ck-sans);
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--event-text-faint, #888);
        }
        .ckl-prize-pool-value {
          display: block;
          font-family: var(--ck-serif);
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--event-text, #111);
          line-height: 1.2;
        }

        /* ── Grid ── */
        .ckl-prize-grid {
          display: grid;
          gap: 24px;
          grid-template-columns: 1fr;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (min-width: 768px) {
          .ckl-prize-grid[data-cols="2"] {
            grid-template-columns: repeat(2, 1fr);
          }
          .ckl-prize-grid[data-cols="3"] {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* ── Tier Card ── */
        .ckl-prize-card {
          border-radius: var(--event-radius-lg, 24px);
          padding: clamp(24px, 4vw, 36px);
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, opacity;
        }
        .ckl-prize-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.1);
        }

        /* Glows for winner */
        .ckl-prize-glow-1 {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 160px;
          height: 160px;
          background: radial-gradient(circle, rgba(212, 168, 83, 0.2), transparent 70%);
          pointer-events: none;
        }
        .ckl-prize-glow-2 {
          position: absolute;
          bottom: -40px;
          left: -20px;
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(138, 59, 46, 0.15), transparent 70%);
          pointer-events: none;
        }

        /* Header row */
        .ckl-prize-header {
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          z-index: 2;
        }
        .ckl-prize-rank {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--ck-sans);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }
        .ckl-prize-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ckl-prize-titles {
          flex: 1;
          min-width: 0;
        }
        .ckl-prize-name {
          font-family: var(--ck-serif);
          font-size: clamp(1.2rem, 2vw, 1.5rem);
          font-weight: 700;
          line-height: 1.2;
          margin: 0 0 2px;
        }
        .ckl-prize-sub {
          font-family: var(--ck-sans);
          font-size: 0.8rem;
          line-height: 1.4;
          margin: 0;
        }

        /* Divider */
        .ckl-prize-divider {
          border-top: 1px solid;
          margin: 20px 0;
          position: relative;
          z-index: 2;
        }

        /* Benefits list */
        .ckl-prize-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          z-index: 2;
        }
        .ckl-prize-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-family: var(--ck-sans);
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .ckl-prize-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 7px;
        }

        /* ── Special Awards ── */
        .ckl-prize-specials-wrap {
          max-width: 1100px;
          margin: 48px auto 0;
          padding-top: 48px;
          border-top: 1px solid var(--event-border, #E8E5E1);
        }
        .ckl-prize-specials-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--ck-sans);
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--event-accent, #8A3B2E);
          margin-bottom: 20px;
        }
        .ckl-prize-specials-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .ckl-prize-specials-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .ckl-prize-special {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px 20px;
          background: var(--event-surface-alt, #F4F2EE);
          border: 1px solid var(--event-border, #E8E5E1);
          border-radius: var(--event-radius-md, 16px);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, opacity;
        }
        .ckl-prize-special:hover {
          border-color: var(--event-border-hover, #D8D4CE);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
          transform: translateY(-2px) !important;
        }
        .ckl-prize-special-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--event-accent-light, #F4EAE8);
          color: var(--event-accent, #8A3B2E);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ckl-prize-special-title {
          font-family: var(--ck-sans);
          font-size: 0.9rem;
          font-weight: 650;
          color: var(--event-text, #111);
          margin: 0 0 4px;
        }
        .ckl-prize-special-desc {
          font-family: var(--ck-sans);
          font-size: 0.8rem;
          color: var(--event-text-muted, #555);
          line-height: 1.5;
          margin: 0;
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .ckl-prize-card,
          .ckl-prize-special {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}
