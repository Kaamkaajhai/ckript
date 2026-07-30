import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  Zap,
  PenTool,
  Send,
  Bot,
  Scale,
  Trophy,
  Gift,
  Award,
  UserPlus,
  Lock,
} from "lucide-react";

/* ── Icon map ── */
const STEP_ICONS = {
  registration_opens: UserPlus,
  registration_closes: Lock,
  registered: UserPlus,
  competition_starts: Zap,
  writing: PenTool,
  submission: Send,
  ai_review: Bot,
  judging: Scale,
  results: Trophy,
  rewards: Gift,
  certificate: Award,
};
const getStepIcon = (key) => STEP_ICONS[key] || Clock;

/* ── Date formatter ── */
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/* ── Intersection Observer hook ── */
function useInView(ref, opts = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.15, ...opts }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}

/* ── Single timeline step ── */
function TimelineStep({ step, index, total, isLeft }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  const isDone = step.status === "done";
  const isCurrent = step.status === "current";
  const Icon = getStepIcon(step.key);

  const slideDir = isLeft ? -40 : 40;

  return (
    <div
      ref={ref}
      className={`ckl-zz-step ${isLeft ? "ckl-zz-left" : "ckl-zz-right"}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateX(0) translateY(0)" : `translateX(${slideDir}px) translateY(12px)`,
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 100}ms`,
      }}
    >
      {/* ── Center node ── */}
      <div className={`ckl-zz-node ${isDone ? "done" : isCurrent ? "active" : "upcoming"}`}>
        {isDone ? (
          <CheckCircle2 size={16} strokeWidth={2.5} />
        ) : isCurrent ? (
          <>
            <span className="ckl-zz-ping" />
            <Icon size={14} strokeWidth={2.5} />
          </>
        ) : (
          <Circle size={14} strokeWidth={1.5} />
        )}
      </div>

      {/* ── Card ── */}
      <div className={`ckl-zz-card ${isDone ? "done" : isCurrent ? "active" : "upcoming"}`}>
        <div className="ckl-zz-card-top">
          <div className={`ckl-zz-icon-box ${isDone ? "done" : isCurrent ? "active" : "upcoming"}`}>
            <Icon size={16} strokeWidth={2} />
          </div>
          <div className="ckl-zz-card-text">
            <span className="ckl-zz-card-label">{step.label}</span>
            {step.date && (
              <span className="ckl-zz-card-date">
                <CalendarDays size={11} strokeWidth={2} />
                {fmtDate(step.date)}
              </span>
            )}
          </div>
          <span className={`ckl-zz-badge ${isDone ? "done" : isCurrent ? "active" : "upcoming"}`}>
            {isDone ? "Done" : isCurrent ? "Now" : "Upcoming"}
          </span>
        </div>
      </div>

      {/* ── Connector arm to center ── */}
      <div className={`ckl-zz-arm ${isDone ? "done" : ""}`} />
    </div>
  );
}

/* ── Main Timeline ── */
export default function EventTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) return null;

  const sectionRef = useRef(null);
  const sectionInView = useInView(sectionRef);

  const progressPct = useMemo(() => {
    const doneCount = timeline.filter((s) => s.status === "done").length;
    const currentIdx = timeline.findIndex((s) => s.status === "current");
    const active = currentIdx >= 0 ? currentIdx + 0.5 : doneCount;
    return Math.min(100, (active / (timeline.length - 1)) * 100);
  }, [timeline]);

  return (
    <section
      ref={sectionRef}
      className="ckl-event-section ckl-event-section--divider"
      style={{ background: "var(--event-bg, #F8F6F2)" }}
    >
      <div className="ckl-event-container">
        {/* Section header */}
        <div
          className="ckl-zz-header"
          style={{
            opacity: sectionInView ? 1 : 0,
            transform: sectionInView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="ckl-zz-header-label">
            <Clock size={14} strokeWidth={2.5} />
            <span>Schedule</span>
          </div>
          <h2 className="ckl-event-title-section" style={{ marginBottom: 0 }}>
            Event Timeline
          </h2>
          <p className="ckl-zz-header-sub">
            Follow every milestone from announcement to rewards.
          </p>
        </div>

        {/* Timeline */}
        <div className="ckl-zz-track">
          {/* Central rail */}
          <div className="ckl-zz-rail">
            <div
              className="ckl-zz-rail-fill"
              style={{ height: sectionInView ? `${progressPct}%` : "0%" }}
            />
          </div>

          {/* Steps */}
          {timeline.map((step, i) => (
            <TimelineStep
              key={step.key || i}
              step={step}
              index={i}
              total={timeline.length}
              isLeft={i % 2 === 0}
            />
          ))}
        </div>
      </div>

      <style>{`
        /* ── Header ── */
        .ckl-zz-header {
          text-align: center;
          max-width: 640px;
          margin: 0 auto clamp(40px, 6vw, 72px);
        }
        .ckl-zz-header-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--ck-sans);
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--event-accent, #8A3B2E);
          margin-bottom: 16px;
        }
        .ckl-zz-header-sub {
          font-family: var(--ck-serif);
          font-size: clamp(1rem, 1.2vw + 0.8rem, 1.25rem);
          color: var(--event-text-muted, #555);
          margin-top: 12px;
          line-height: 1.5;
        }

        /* ── Track ── */
        .ckl-zz-track {
          position: relative;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px 0;
        }

        /* ── Central Rail ── */
        .ckl-zz-rail {
          position: absolute;
          left: 28px;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--event-border, #E8E5E1);
          border-radius: 4px;
          overflow: hidden;
          z-index: 1;
        }
        .ckl-zz-rail-fill {
          width: 100%;
          background: linear-gradient(180deg, var(--event-accent, #8A3B2E), var(--ck-brand-copper, #c97a5f));
          border-radius: 4px;
          transition: height 2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @media (min-width: 768px) {
          .ckl-zz-rail {
            left: 50%;
            transform: translateX(-50%);
          }
        }

        /* ── Step (zigzag row) ── */
        .ckl-zz-step {
          position: relative;
          display: flex;
          align-items: flex-start;
          margin-bottom: 24px;
          will-change: transform, opacity;
          padding-left: 60px;
        }
        .ckl-zz-step:last-child {
          margin-bottom: 0;
        }

        @media (min-width: 768px) {
          .ckl-zz-step {
            padding-left: 0;
            width: 50%;
          }
          .ckl-zz-step.ckl-zz-left {
            margin-left: 0;
            margin-right: auto;
            padding-right: 52px;
            justify-content: flex-end;
          }
          .ckl-zz-step.ckl-zz-right {
            margin-left: auto;
            margin-right: 0;
            padding-left: 52px;
            justify-content: flex-start;
          }
        }

        /* ── Center node ── */
        .ckl-zz-node {
          position: absolute;
          left: 28px;
          top: 16px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          transform: translateX(-50%);
        }

        @media (min-width: 768px) {
          .ckl-zz-node {
            left: auto;
            right: auto;
          }
          .ckl-zz-left .ckl-zz-node {
            right: -16px;
            left: auto;
            transform: translateX(50%);
          }
          .ckl-zz-right .ckl-zz-node {
            left: -16px;
            right: auto;
            transform: translateX(-50%);
          }
        }

        .ckl-zz-node.done {
          background: var(--event-accent-light, #F4EAE8);
          color: var(--event-accent, #8A3B2E);
          border: 2px solid var(--event-accent, #8A3B2E);
        }
        .ckl-zz-node.active {
          background: var(--event-accent, #8A3B2E);
          color: white;
          border: 2px solid var(--event-accent, #8A3B2E);
          box-shadow: 0 0 0 5px rgba(138, 59, 46, 0.12), 0 0 20px rgba(138, 59, 46, 0.3);
        }
        .ckl-zz-node.upcoming {
          background: var(--event-bg, #F8F6F2);
          color: var(--event-text-faint, #aaa);
          border: 2px solid var(--event-border, #E8E5E1);
        }

        .ckl-zz-ping {
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          border: 2px solid var(--event-accent, #8A3B2E);
          animation: zzPing 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes zzPing {
          0% { transform: scale(1); opacity: 0.5; }
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }

        /* ── Arm (horizontal connector from card to center) ── */
        .ckl-zz-arm {
          display: none;
        }
        @media (min-width: 768px) {
          .ckl-zz-arm {
            display: block;
            position: absolute;
            top: 30px;
            height: 2px;
            background: var(--event-border, #E8E5E1);
            z-index: 2;
          }
          .ckl-zz-arm.done {
            background: var(--event-accent, #8A3B2E);
            opacity: 0.4;
          }
          .ckl-zz-left .ckl-zz-arm {
            right: 0;
            width: 52px;
          }
          .ckl-zz-right .ckl-zz-arm {
            left: 0;
            width: 52px;
          }
        }

        /* ── Card ── */
        .ckl-zz-card {
          width: 100%;
          background: var(--event-surface, #FFF);
          border: 1px solid var(--event-border, #E8E5E1);
          border-radius: 16px;
          padding: 16px 20px;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          z-index: 3;
        }
        .ckl-zz-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(138, 59, 46, 0.04), transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .ckl-zz-card:hover {
          border-color: var(--event-border-hover, #D8D4CE);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
          transform: translateY(-2px);
        }
        .ckl-zz-card:hover::after {
          opacity: 1;
        }

        .ckl-zz-card.active {
          border-color: var(--event-accent, #8A3B2E);
          box-shadow: 0 4px 24px rgba(138, 59, 46, 0.1);
        }
        .ckl-zz-card.active::after {
          opacity: 1;
        }
        .ckl-zz-card.done {
          background: var(--event-surface-alt, #F4F2EE);
          border-color: transparent;
        }
        .ckl-zz-card.upcoming {
          opacity: 0.5;
        }
        .ckl-zz-card.upcoming:hover {
          opacity: 0.7;
        }

        /* ── Card internals ── */
        .ckl-zz-card-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ckl-zz-icon-box {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ckl-zz-icon-box.done {
          background: var(--event-accent-light, #F4EAE8);
          color: var(--event-accent, #8A3B2E);
        }
        .ckl-zz-icon-box.active {
          background: var(--event-accent, #8A3B2E);
          color: white;
        }
        .ckl-zz-icon-box.upcoming {
          background: var(--event-surface-alt, #F4F2EE);
          color: var(--event-text-faint, #888);
        }

        .ckl-zz-card-text {
          flex: 1;
          min-width: 0;
        }
        .ckl-zz-card-label {
          display: block;
          font-family: var(--ck-sans);
          font-size: 0.9rem;
          font-weight: 650;
          color: var(--event-text, #111);
          line-height: 1.3;
        }
        .ckl-zz-card.done .ckl-zz-card-label {
          color: var(--event-text-muted, #555);
        }
        .ckl-zz-card.upcoming .ckl-zz-card-label {
          color: var(--event-text-faint, #888);
        }
        .ckl-zz-card-date {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--ck-sans);
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--event-text-faint, #888);
          margin-top: 2px;
        }

        /* ── Badge ── */
        .ckl-zz-badge {
          flex-shrink: 0;
          padding: 4px 10px;
          border-radius: 999px;
          font-family: var(--ck-sans);
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .ckl-zz-badge.done {
          background: var(--event-accent-light, #F4EAE8);
          color: var(--event-accent, #8A3B2E);
        }
        .ckl-zz-badge.active {
          background: var(--event-accent, #8A3B2E);
          color: white;
          animation: zzBadgePulse 2.5s ease-in-out infinite;
        }
        .ckl-zz-badge.upcoming {
          background: var(--event-surface-alt, #F4F2EE);
          color: var(--event-text-faint, #888);
          border: 1px solid var(--event-border, #E8E5E1);
        }
        @keyframes zzBadgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(138, 59, 46, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(138, 59, 46, 0); }
        }

        /* ── Mobile adjustments ── */
        @media (max-width: 767px) {
          .ckl-zz-track {
            padding-left: 0;
          }
          .ckl-zz-step {
            padding-left: 56px;
          }
          .ckl-zz-node {
            left: 28px;
            transform: translateX(-50%);
          }
          .ckl-zz-card {
            padding: 14px 16px;
          }
          .ckl-zz-icon-box {
            width: 30px;
            height: 30px;
          }
          .ckl-zz-card-top {
            gap: 10px;
          }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .ckl-zz-ping { animation: none !important; }
          .ckl-zz-badge.active { animation: none !important; }
          .ckl-zz-rail-fill { transition: none !important; }
          .ckl-zz-step {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}
