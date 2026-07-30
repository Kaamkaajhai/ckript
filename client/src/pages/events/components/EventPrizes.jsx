import React, { useRef, useState, useEffect } from "react";
import {
  Trophy,
  Medal,
  Award,
  Star,
  Sparkles,
  Crown,
  Flame,
  Gift,
  ArrowRight,
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
      bg: "#111111",
      text: "#FFFFFF",
      textMuted: "rgba(255, 255, 255, 0.6)",
      accentColor: "#8A3B2E",
      accentBg: "rgba(138, 59, 46, 0.15)",
      dotColor: "#8A3B2E",
      borderColor: "rgba(138, 59, 46, 0.4)",
      dividerColor: "rgba(255, 255, 255, 0.08)",
      glow: true,
    },
    runnerUp: {
      icon: Medal,
      label: "Runner-Up",
      subtitle: "Exceptional recognition for top contenders.",
      rank: "2nd",
      bg: "#FFFFFF",
      text: "#111111",
      textMuted: "#666666",
      accentColor: "#111111",
      accentBg: "#F4F2EE",
      dotColor: "#111111",
      borderColor: "#E8E5E1",
      dividerColor: "#F0ECE9",
      glow: false,
    },
    secondRunnerUp: {
      icon: Award,
      label: "2nd Runner-Up",
      subtitle: "Outstanding effort deserving of recognition.",
      rank: "3rd",
      bg: "#FAFAFA",
      text: "#111111",
      textMuted: "#666666",
      accentColor: "#555555",
      accentBg: "#F0ECE9",
      dotColor: "#555555",
      borderColor: "#E8E5E1",
      dividerColor: "#F0ECE9",
      glow: false,
    },
  };

  const t = TIERS[tier] || TIERS.runnerUp;
  const Icon = t.icon;

  return (
    <div
      ref={ref}
      className={`ckl-prize-card ${t.glow ? "ckl-prize-card--glow" : ""}`}
      style={{
        background: t.bg,
        borderColor: t.borderColor,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(30px)",
        transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${index * 150}ms`,
      }}
    >
      {/* Decorative Glow Elements */}
      {t.glow && (
        <>
          <div className="ckl-prize-glow-top"></div>
          <div className="ckl-prize-glow-bottom"></div>
        </>
      )}

      {/* Header */}
      <div className="ckl-prize-header">
        <div className="ckl-prize-rank" style={{ background: t.accentBg, color: t.accentColor }}>
          {t.rank}
        </div>
        <div className="ckl-prize-icon" style={{ background: t.accentBg }}>
          <Icon size={24} strokeWidth={2} style={{ color: t.accentColor }} />
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
      <div className="ckl-prize-divider" style={{ borderColor: t.dividerColor }} />

      {/* Benefits list */}
      <ul className="ckl-prize-list">
        {items.map((item, idx) => (
          <li key={idx} className="ckl-prize-item">
            <span className="ckl-prize-dot" style={{ background: t.dotColor }} />
            <span style={{ color: t.glow ? "rgba(255,255,255,0.9)" : "#333" }}>{item}</span>
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
      className="ckl-prize-special group"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 100}ms`,
      }}
    >
      <div className="ckl-prize-special-icon">
        <Sparkles size={18} strokeWidth={2.5} />
      </div>
      <div className="ckl-prize-special-content">
        <h4 className="ckl-prize-special-title">{award.title}</h4>
        {award.description && (
          <p className="ckl-prize-special-desc">{award.description}</p>
        )}
      </div>
      <div className="ckl-prize-special-arrow">
        <ArrowRight size={16} />
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function EventPrizes({ prizes, prizePool, detailedPrizes }) {
  const hasWinner = prizes?.winner?.length > 0;
  const hasRunnerUp = prizes?.runnerUp?.length > 0;
  const hasSecondRunnerUp = prizes?.secondRunnerUp?.length > 0;
  const hasSpecial = prizes?.special?.length > 0;
  const hasDetailed = detailedPrizes?.length > 0;

  const sectionRef = useRef(null);
  const sectionInView = useInView(sectionRef);

  const tierCount = [hasWinner, hasRunnerUp, hasSecondRunnerUp].filter(Boolean).length;

  return (
    <section
      ref={sectionRef}
      className="ckl-event-section ckl-event-section--divider"
      style={{ background: "var(--event-surface, #FFF)" }}
    >
      <div className="ckl-event-container">
        
        {/* Section Header */}
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
            Compete for exclusive industry exposure and massive rewards.
          </p>

          {prizePool && (
            <div className="ckl-prize-pool">
              <div className="ckl-prize-pool-icon">
                <Flame size={20} strokeWidth={2.5} />
              </div>
              <div className="ckl-prize-pool-content">
                <span className="ckl-prize-pool-label">Total Prize Pool</span>
                <span className="ckl-prize-pool-value">{prizePool}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tier Cards Grid */}
        <div className="ckl-prize-grid" data-cols={tierCount}>
          {hasWinner && <PrizeTierCard tier="winner" items={prizes.winner} index={0} />}
          {hasRunnerUp && <PrizeTierCard tier="runnerUp" items={prizes.runnerUp} index={1} />}
          {hasSecondRunnerUp && <PrizeTierCard tier="secondRunnerUp" items={prizes.secondRunnerUp} index={2} />}
        </div>

        {/* Empty State (Coming Soon) */}
        {!hasWinner && !hasRunnerUp && !hasSecondRunnerUp && !hasDetailed && (
          <div className="ckl-prize-empty">
            <Gift size={36} className="ckl-prize-empty-icon" strokeWidth={1.5} />
            <p className="ckl-prize-empty-title">Prize details coming soon</p>
            <p className="ckl-prize-empty-sub">Check back for the full rewards breakdown when the event launches.</p>
          </div>
        )}

        {/* Detailed Prizes (from admin builder) */}
        {hasDetailed && (
          <div className="ckl-prize-specials-wrap" style={hasWinner || hasRunnerUp || hasSecondRunnerUp ? {} : { marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <h3 className="ckl-prize-specials-heading">
              <Gift size={16} strokeWidth={2.5} />
              Additional Prizes
            </h3>
            <div className="ckl-prize-specials-grid">
              {detailedPrizes
                .filter(p => p.visibility !== 'private')
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((prize, idx) => (
                  <SpecialAwardCard
                    key={idx}
                    award={{
                      title: prize.title,
                      description: [prize.description, prize.cash ? `${prize.currency || '$'}${prize.cash}` : ''].filter(Boolean).join(' — ')
                    }}
                    index={idx}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Special Awards */}
        {hasSpecial && (
          <div className="ckl-prize-specials-wrap">
            <h3 className="ckl-prize-specials-heading">
              <Star size={16} strokeWidth={2.5} />
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
        /* ── Header Area ── */
        .ckl-prize-section-header {
          text-align: center;
          max-width: 680px;
          margin: 0 auto clamp(48px, 8vw, 80px);
        }
        .ckl-prize-section-label {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--ck-sans);
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.25em;
          color: var(--event-accent, #8A3B2E);
          margin-bottom: 20px;
        }
        .ckl-prize-section-sub {
          font-family: var(--ck-serif);
          font-size: clamp(1.1rem, 2vw, 1.3rem);
          line-height: 1.6;
          color: var(--event-text-muted, #555);
          margin-top: 16px;
        }

        /* ── Prize Pool Badge ── */
        .ckl-prize-pool {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          margin-top: 32px;
          padding: 12px 32px 12px 12px;
          background: #FFFFFF;
          border: 1px solid #E8E5E1;
          border-radius: 99px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.03);
          transition: all 0.3s ease;
        }
        .ckl-prize-pool:hover {
          border-color: #8A3B2E;
          box-shadow: 0 12px 32px rgba(138, 59, 46, 0.1);
        }
        .ckl-prize-pool-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #111111;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ckl-prize-pool-content {
          text-align: left;
        }
        .ckl-prize-pool-label {
          display: block;
          font-family: var(--ck-sans);
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #888888;
          margin-bottom: 2px;
        }
        .ckl-prize-pool-value {
          display: block;
          font-family: var(--ck-serif);
          font-size: 1.4rem;
          font-weight: 700;
          color: #111111;
          line-height: 1;
        }

        /* ── Main Tier Grid ── */
        .ckl-prize-grid {
          display: grid;
          gap: 24px;
          grid-template-columns: 1fr;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (min-width: 768px) {
          .ckl-prize-grid[data-cols="2"] { grid-template-columns: repeat(2, 1fr); }
          .ckl-prize-grid[data-cols="3"] { grid-template-columns: repeat(3, 1fr); }
        }

        /* ── Tier Cards ── */
        .ckl-prize-card {
          border-radius: 24px;
          border-width: 1px;
          border-style: solid;
          padding: clamp(28px, 4vw, 40px);
          position: relative;
          overflow: hidden;
          will-change: transform, opacity;
          display: flex;
          flex-direction: column;
        }
        
        .ckl-prize-card--glow {
          box-shadow: 0 12px 40px rgba(138, 59, 46, 0.15);
        }
        
        /* Interactive Hover */
        .ckl-prize-card:hover {
          transform: translateY(-8px) !important;
        }
        .ckl-prize-card--glow:hover {
          box-shadow: 0 20px 60px rgba(138, 59, 46, 0.25);
          border-color: rgba(138, 59, 46, 0.6) !important;
        }
        .ckl-prize-card:not(.ckl-prize-card--glow):hover {
          border-color: #D8D4CE !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06);
        }

        /* Premium Glows for Grand Prize */
        .ckl-prize-glow-top {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(138, 59, 46, 0.25), transparent 70%);
          pointer-events: none;
        }
        .ckl-prize-glow-bottom {
          position: absolute;
          bottom: -40px;
          left: -40px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.05), transparent 70%);
          pointer-events: none;
        }

        /* Header Layout */
        .ckl-prize-header {
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          z-index: 2;
        }
        .ckl-prize-rank {
          width: 36px;
          height: 36px;
          border-radius: 8px;
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
          width: 48px;
          height: 48px;
          border-radius: 12px;
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
          font-size: clamp(1.4rem, 2vw, 1.8rem);
          font-weight: 700;
          line-height: 1.1;
          margin: 0 0 6px;
        }
        .ckl-prize-sub {
          font-family: var(--ck-sans);
          font-size: 0.85rem;
          line-height: 1.4;
          margin: 0;
        }

        /* Card Divider */
        .ckl-prize-divider {
          border-top: 1px solid;
          margin: 28px 0;
          position: relative;
          z-index: 2;
        }

        /* Card List */
        .ckl-prize-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          z-index: 2;
          flex: 1;
        }
        .ckl-prize-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-family: var(--ck-sans);
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .ckl-prize-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 9px;
        }

        /* ── Special/Additional Awards Section ── */
        .ckl-prize-specials-wrap {
          max-width: 1100px;
          margin: 64px auto 0;
          padding-top: 56px;
          border-top: 1px solid #E8E5E1;
        }
        .ckl-prize-specials-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--ck-sans);
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #8A3B2E;
          margin-bottom: 24px;
        }
        .ckl-prize-specials-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .ckl-prize-specials-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .ckl-prize-special {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px;
          background: #FFFFFF;
          border: 1px solid #E8E5E1;
          border-radius: 20px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, box-shadow;
          cursor: default;
        }
        .ckl-prize-special:hover {
          border-color: #111111;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.05);
          transform: translateY(-4px) !important;
        }
        .ckl-prize-special-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #F8F6F2;
          color: #8A3B2E;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .ckl-prize-special:hover .ckl-prize-special-icon {
          background: #111111;
          color: #FFFFFF;
        }
        .ckl-prize-special-content {
          flex: 1;
        }
        .ckl-prize-special-title {
          font-family: var(--ck-serif);
          font-size: 1.15rem;
          font-weight: 700;
          color: #111111;
          margin: 0 0 4px;
        }
        .ckl-prize-special-desc {
          font-family: var(--ck-sans);
          font-size: 0.85rem;
          color: #666666;
          line-height: 1.5;
          margin: 0;
        }
        .ckl-prize-special-arrow {
          color: #CCCCCC;
          transition: all 0.3s ease;
          transform: translateX(-4px);
          opacity: 0;
        }
        .ckl-prize-special:hover .ckl-prize-special-arrow {
          color: #8A3B2E;
          transform: translateX(0);
          opacity: 1;
        }

        /* ── Empty State ── */
        .ckl-prize-empty {
          text-align: center;
          padding: 64px 24px;
          background: #F8F6F2;
          border-radius: 24px;
          border: 1px dashed #D8D4CE;
          max-width: 600px;
          margin: 0 auto;
        }
        .ckl-prize-empty-icon {
          color: #AAAAAA;
          margin: 0 auto 20px;
        }
        .ckl-prize-empty-title {
          font-family: var(--ck-serif);
          font-size: 1.4rem;
          font-weight: 600;
          color: #444444;
          margin: 0 0 8px;
        }
        .ckl-prize-empty-sub {
          font-family: var(--ck-sans);
          font-size: 0.9rem;
          color: #888888;
          margin: 0;
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .ckl-prize-card, .ckl-prize-special {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}
