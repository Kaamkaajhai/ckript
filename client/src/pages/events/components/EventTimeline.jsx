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
  ChevronDown,
} from "lucide-react";

/* ── Icon map ────────────────────────────────────────────────────────────── */
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

/* ── Date formatter ──────────────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const fmtDateFull = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

/* ── Intersection Observer hook ──────────────────────────────────────────── */
function useInView(ref, options = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.2, ...options }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

/* ── Individual timeline step ────────────────────────────────────────────── */
function TimelineStep({ step, index, total, isExpanded, onToggle }) {
  const ref = useRef(null);
  const inView = useInView(ref);

  const isDone = step.status === "done";
  const isCurrent = step.status === "current";
  const isUpcoming = step.status === "upcoming";
  const Icon = getStepIcon(step.key);

  return (
    <div
      ref={ref}
      className="ckl-tl-step"
      data-status={step.status}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 80}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 80}ms`,
      }}
    >
      {/* ── Node on the track ── */}
      <div className={`ckl-tl-node ${isDone ? "done" : isCurrent ? "active" : "upcoming"}`}>
        {isDone ? (
          <CheckCircle2 size={18} strokeWidth={2.5} />
        ) : isCurrent ? (
          <>
            <span className="ckl-tl-node-ping" />
            <Icon size={16} strokeWidth={2.5} />
          </>
        ) : (
          <Circle size={16} strokeWidth={1.5} />
        )}
      </div>

      {/* ── Card ── */}
      <button
        className={`ckl-tl-card ${isDone ? "done" : isCurrent ? "active" : "upcoming"}`}
        onClick={step.description ? onToggle : undefined}
        aria-expanded={isExpanded}
        tabIndex={0}
      >
        <div className="ckl-tl-card-header">
          <div className="ckl-tl-card-icon-wrap">
            <Icon size={18} strokeWidth={2} />
          </div>
          <div className="ckl-tl-card-info">
            <span className="ckl-tl-card-label">{step.label}</span>
            {step.date && (
              <span className="ckl-tl-card-date">
                <CalendarDays size={12} strokeWidth={2} />
                {fmtDate(step.date)}
              </span>
            )}
          </div>
          <div className="ckl-tl-card-status">
            {isDone && <span className="ckl-tl-badge done">Done</span>}
            {isCurrent && <span className="ckl-tl-badge active">Now</span>}
            {isUpcoming && <span className="ckl-tl-badge upcoming">Upcoming</span>}
          </div>
        </div>

        {step.description && (
          <div
            className="ckl-tl-card-body"
            style={{
              maxHeight: isExpanded ? "200px" : "0",
              opacity: isExpanded ? 1 : 0,
              marginTop: isExpanded ? "12px" : "0",
            }}
          >
            <p>{step.description}</p>
          </div>
        )}
      </button>

      {/* ── Connector line (not on last item) ── */}
      {index < total - 1 && (
        <div className={`ckl-tl-connector ${isDone ? "done" : ""}`} />
      )}
    </div>
  );
}

/* ── Main Timeline ───────────────────────────────────────────────────────── */
export default function EventTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) return null;

  const [expandedIdx, setExpandedIdx] = useState(null);
  const sectionRef = useRef(null);
  const sectionInView = useInView(sectionRef);

  /* Progress percentage for the animated track */
  const progressPct = useMemo(() => {
    const doneCount = timeline.filter((s) => s.status === "done").length;
    const currentIdx = timeline.findIndex((s) => s.status === "current");
    const activeSteps = currentIdx >= 0 ? currentIdx + 0.5 : doneCount;
    return Math.min(100, (activeSteps / (timeline.length - 1)) * 100);
  }, [timeline]);

  return (
    <section
      ref={sectionRef}
      className="ckl-event-section ckl-event-section--divider"
      style={{ background: "var(--event-bg)" }}
    >
      <div className="ckl-event-container">
        {/* ── Section header ── */}
        <div
          className="ckl-tl-header"
          style={{
            opacity: sectionInView ? 1 : 0,
            transform: sectionInView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="ckl-tl-header-label">
            <Clock size={14} strokeWidth={2.5} />
            <span>Schedule</span>
          </div>
          <h2 className="ckl-event-title-section" style={{ marginBottom: 0 }}>
            Event Timeline
          </h2>
          <p className="ckl-tl-header-sub">
            Follow every milestone from announcement to rewards.
          </p>
        </div>

        {/* ── Timeline track ── */}
        <div className="ckl-tl-track">
          {/* Progress bar (vertical line) */}
          <div className="ckl-tl-rail">
            <div
              className="ckl-tl-rail-fill"
              style={{
                height: sectionInView ? `${progressPct}%` : "0%",
              }}
            />
          </div>

          {/* Steps */}
          {timeline.map((step, i) => (
            <TimelineStep
              key={step.key || i}
              step={step}
              index={i}
              total={timeline.length}
              isExpanded={expandedIdx === i}
              onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
            />
          ))}
        </div>
      </div>

      {/* ── Scoped Styles ── */}
      <style>{`
        /* ── Header ── */
        .ckl-tl-header {
          text-align: center;
          max-width: 640px;
          margin: 0 auto clamp(40px, 6vw, 72px);
        }
        .ckl-tl-header-label {
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
        .ckl-tl-header-sub {
          font-family: var(--ck-serif);
          font-size: var(--event-text-lg, 1.2rem);
          line-height: 1.5;
          color: var(--event-text-muted, #555);
          margin-top: 12px;
        }

        /* ── Track wrapper ── */
        .ckl-tl-track {
          position: relative;
          max-width: 680px;
          margin: 0 auto;
          padding-left: 48px;
        }

        /* ── Rail (the vertical line) ── */
        .ckl-tl-rail {
          position: absolute;
          left: 18px;
          top: 8px;
          bottom: 8px;
          width: 3px;
          background: var(--event-border, #E8E5E1);
          border-radius: 4px;
          overflow: hidden;
        }
        .ckl-tl-rail-fill {
          width: 100%;
          background: linear-gradient(180deg, var(--event-accent, #8A3B2E), var(--ck-brand-copper, #c97a5f));
          border-radius: 4px;
          transition: height 1.8s cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* ── Step wrapper ── */
        .ckl-tl-step {
          position: relative;
          padding-bottom: 0;
          will-change: opacity, transform;
        }

        /* ── Connector between cards ── */
        .ckl-tl-connector {
          height: 20px;
          position: relative;
        }

        /* ── Node (circle on rail) ── */
        .ckl-tl-node {
          position: absolute;
          left: -48px;
          top: 18px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          transform: translateX(50%);
        }
        .ckl-tl-node.done {
          background: var(--event-accent-light, #F4EAE8);
          color: var(--event-accent, #8A3B2E);
          border: 2px solid var(--event-accent, #8A3B2E);
        }
        .ckl-tl-node.active {
          background: var(--event-accent, #8A3B2E);
          color: white;
          border: 2px solid var(--event-accent, #8A3B2E);
          box-shadow: 0 0 0 6px rgba(138, 59, 46, 0.12), 0 0 24px rgba(138, 59, 46, 0.25);
        }
        .ckl-tl-node.upcoming {
          background: var(--event-surface, #FFF);
          color: var(--event-text-faint, #888);
          border: 2px solid var(--event-border, #E8E5E1);
        }

        .ckl-tl-node-ping {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid var(--event-accent, #8A3B2E);
          animation: tlPing 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes tlPing {
          0% { transform: scale(1); opacity: 0.6; }
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }

        /* ── Card ── */
        .ckl-tl-card {
          width: 100%;
          text-align: left;
          background: var(--event-surface, #FFF);
          border: 1px solid var(--event-border, #E8E5E1);
          border-radius: var(--event-radius-md, 16px);
          padding: 16px 20px;
          cursor: default;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
          display: block;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
        }
        .ckl-tl-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(138, 59, 46, 0.03), transparent);
          opacity: 0;
          transition: opacity 0.35s ease;
          pointer-events: none;
        }
        .ckl-tl-card:hover {
          border-color: var(--event-border-hover, #D8D4CE);
          box-shadow: var(--event-shadow-md, 0 8px 24px rgba(0,0,0,0.06));
          transform: translateY(-2px);
        }
        .ckl-tl-card:hover::before {
          opacity: 1;
        }
        .ckl-tl-card.active {
          border-color: var(--event-accent, #8A3B2E);
          box-shadow: 0 4px 20px rgba(138, 59, 46, 0.1), var(--event-shadow-sm, 0 2px 8px rgba(0,0,0,0.04));
        }
        .ckl-tl-card.active::before {
          opacity: 1;
        }
        .ckl-tl-card.upcoming {
          opacity: 0.55;
        }
        .ckl-tl-card.upcoming:hover {
          opacity: 0.75;
        }
        .ckl-tl-card.done {
          background: var(--event-surface-alt, #F4F2EE);
          border-color: transparent;
        }

        /* ── Card internals ── */
        .ckl-tl-card-header {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .ckl-tl-card-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .ckl-tl-card.done .ckl-tl-card-icon-wrap {
          background: var(--event-accent-light, #F4EAE8);
          color: var(--event-accent, #8A3B2E);
        }
        .ckl-tl-card.active .ckl-tl-card-icon-wrap {
          background: var(--event-accent, #8A3B2E);
          color: white;
        }
        .ckl-tl-card.upcoming .ckl-tl-card-icon-wrap {
          background: var(--event-surface-alt, #F4F2EE);
          color: var(--event-text-faint, #888);
        }

        .ckl-tl-card-info {
          flex: 1;
          min-width: 0;
        }
        .ckl-tl-card-label {
          display: block;
          font-family: var(--ck-sans);
          font-size: 0.95rem;
          font-weight: 650;
          color: var(--event-text, #111);
          line-height: 1.3;
        }
        .ckl-tl-card.done .ckl-tl-card-label {
          color: var(--event-text-muted, #555);
        }
        .ckl-tl-card.upcoming .ckl-tl-card-label {
          color: var(--event-text-faint, #888);
        }
        .ckl-tl-card-date {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--ck-sans);
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--event-text-faint, #888);
          margin-top: 2px;
        }

        /* ── Badge ── */
        .ckl-tl-card-status {
          flex-shrink: 0;
        }
        .ckl-tl-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          font-family: var(--ck-sans);
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .ckl-tl-badge.done {
          background: var(--event-accent-light, #F4EAE8);
          color: var(--event-accent, #8A3B2E);
        }
        .ckl-tl-badge.active {
          background: var(--event-accent, #8A3B2E);
          color: white;
          animation: tlBadgePulse 2.5s ease-in-out infinite;
        }
        .ckl-tl-badge.upcoming {
          background: var(--event-surface-alt, #F4F2EE);
          color: var(--event-text-faint, #888);
          border: 1px solid var(--event-border, #E8E5E1);
        }

        @keyframes tlBadgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(138, 59, 46, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(138, 59, 46, 0); }
        }

        /* ── Expandable body ── */
        .ckl-tl-card-body {
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          padding-left: 50px;
        }
        .ckl-tl-card-body p {
          font-family: var(--ck-sans);
          font-size: 0.85rem;
          line-height: 1.6;
          color: var(--event-text-muted, #555);
          margin: 0;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .ckl-tl-track {
            padding-left: 40px;
          }
          .ckl-tl-rail {
            left: 14px;
          }
          .ckl-tl-node {
            left: -40px;
            width: 30px;
            height: 30px;
          }
          .ckl-tl-card {
            padding: 14px 16px;
          }
          .ckl-tl-card-icon-wrap {
            width: 32px;
            height: 32px;
            border-radius: 8px;
          }
          .ckl-tl-card-header {
            gap: 10px;
          }
          .ckl-tl-card-body {
            padding-left: 42px;
          }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .ckl-tl-node-ping,
          .ckl-tl-badge.active {
            animation: none !important;
          }
          .ckl-tl-rail-fill {
            transition: none !important;
          }
          .ckl-tl-step {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </section>
  );
}
