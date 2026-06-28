import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthModal } from "../context/AuthModalContext";
import useScrollLock from "../hooks/useScrollLock";
import "./AboutModal.css";

/* ─────────────────────────────────────────────────────────────
   Ckript — About modal.

   Pixel-faithful port of the "About Ckript Modal v2.dc.html" Claude Design
   handoff. Replaces the old /about page navigation: the marketing header and
   landing footer "About" links now open this modal over the current page.

   Five editorial chapters (Platform / Trust / Intelligence / Mission / Vision)
   are navigated through a filmstrip selector, a giant watermark chapter number
   and prev / next controls. The final chapter's primary action ("Start your
   story") closes the modal and opens the sign-up surface.
   ───────────────────────────────────────────────────────────── */

const FONT_LINK_ID = "ckript-authmodal-fonts";
function ensureModalFonts() {
  if (typeof document === "undefined" || document.getElementById(FONT_LINK_ID)) return;
  const pre1 = document.createElement("link");
  pre1.rel = "preconnect";
  pre1.href = "https://fonts.googleapis.com";
  const pre2 = document.createElement("link");
  pre2.rel = "preconnect";
  pre2.href = "https://fonts.gstatic.com";
  pre2.crossOrigin = "anonymous";
  const sheet = document.createElement("link");
  sheet.id = FONT_LINK_ID;
  sheet.rel = "stylesheet";
  sheet.href =
    "https://fonts.googleapis.com/css2?family=Baskervville:ital@0;1&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap";
  document.head.append(pre1, pre2, sheet);
}

const IMG = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=80`;

/* The five chapters, 1:1 with the design's section data. Em dashes from the
   original copy are intentionally rendered as commas. */
const SECTIONS = [
  {
    name: "The Platform",
    img: IMG("photo-1485846234645-a62644f84728"),
    kicker: "Chapter 01 · The Platform",
    title: "Where stories find their audience",
    body: "Ckript is a next-generation platform built to bridge the gap between talented storytellers and the people who bring films to life. Writers create and showcase scripts across film, web series, anime, television and more, inside a single secure, structured ecosystem.",
    chips: ["Film", "Web Series", "Anime", "Television"],
  },
  {
    name: "Trust",
    img: IMG("photo-1517604931442-7e0c8ed2963c"),
    kicker: "Chapter 02 · Trust",
    title: "Discoverability, with trust",
    body: "We exist to solve the industry's hardest problem: being seen without being exposed. Every script uploaded to Ckript is securely protected end-to-end, preserving full ownership and intellectual-property safety, so writers can share their work freely and with confidence.",
    pillars: [
      { h: "Protected by default", d: "Ownership and IP safety are built in, not bolted on." },
      { h: "Serious interest only", d: "Access to full scripts is requested, reviewed and granted." },
    ],
  },
  {
    name: "Intelligence",
    img: IMG("photo-1536440136628-849c177e76a1"),
    kicker: "Chapter 03 · Intelligence",
    title: "AI that reads between the lines",
    body: "Advanced AI transforms scripts into visual trailers and generates insightful evaluation scores. Producers and directors explore curated content through trailers, structured insights and concise summaries, then request full access only when the interest is real.",
    pillars: [
      { h: "Script to trailer", d: "Every script becomes a visual pitch in minutes." },
      { h: "Evaluation scores", d: "Structured insight for faster, better decisions." },
    ],
  },
  {
    name: "Mission",
    img: IMG("photo-1455390582262-044cdead277a"),
    kicker: "Chapter 04 · Mission",
    title: "Our mission",
    body: "To build a trusted, intelligent ecosystem where great stories are discovered on merit, creators retain full control of their work, and industry professionals can efficiently access high-quality, production-ready content.",
  },
  {
    name: "Vision",
    img: IMG("photo-1478720568477-152d9b164e26"),
    kicker: "Chapter 05 · Vision",
    title: "Our vision",
    body: "To redefine the entertainment ecosystem by making script discovery intelligent, secure and accessible, unlocking opportunities for creators and reshaping how content is found and produced worldwide.",
  },
];

const pad2 = (n) => String(n).padStart(2, "0");

function AboutModalInner({ onClose }) {
  const { openAuthModal } = useAuthModal();
  const titleId = useId();
  const cardRef = useRef(null);
  const previouslyFocused = useRef(null);
  const [i, setI] = useState(0);

  const total = SECTIONS.length;
  const s = SECTIONS[i];
  const last = i === total - 1;

  const go = useCallback(
    (idx) => setI(Math.min(total - 1, Math.max(0, idx))),
    [total]
  );
  const back = useCallback(() => go(i - 1), [go, i]);
  const next = useCallback(() => {
    if (last) {
      onClose();
      openAuthModal();
      return;
    }
    go(i + 1);
  }, [last, go, i, onClose, openAuthModal]);

  useScrollLock();

  // Modal chrome: fonts, Esc, focus restore.
  useEffect(() => {
    ensureModalFonts();
    previouslyFocused.current = document.activeElement;
    return () => {
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") prev.focus({ preventScroll: true });
    };
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowRight" && !last) {
        go(i + 1);
      } else if (e.key === "ArrowLeft") {
        go(i - 1);
      }
    },
    [onClose, go, i, last]
  );

  return (
    <motion.div
      className="abm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        ref={cardRef}
        className="abm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {/* Header */}
        <div className="abm-header">
          <div className="abm-eyebrow">
            <i />
            <span>About Ckript</span>
          </div>
        </div>

        {/* Editorial stage */}
        <div className="abm-stage">
          <div className="abm-watermark" aria-hidden="true">{pad2(i + 1)}</div>
          <div className="abm-stage-inner">
            <div className="abm-kicker">{s.kicker}</div>
            <h2 className="abm-title" id={titleId}>{s.title}</h2>
            <div className="abm-rule" />
            <p className="abm-body">{s.body}</p>

            {s.pillars && (
              <div className="abm-pillars">
                {s.pillars.map((p) => (
                  <div className="abm-pillar" key={p.h}>
                    <div className="abm-pillar-h">{p.h}</div>
                    <div className="abm-pillar-d">{p.d}</div>
                  </div>
                ))}
              </div>
            )}

            {s.chips && (
              <div className="abm-chips">
                {s.chips.map((c) => (
                  <span className="abm-chip" key={c}>{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filmstrip chapter selector */}
        <div className="abm-filmstrip">
          <div className="abm-filmstrip-row">
            <div className="abm-frames">
              {SECTIONS.map((sec, idx) => {
                const active = idx === i;
                return (
                  <button
                    type="button"
                    key={sec.name}
                    onClick={() => go(idx)}
                    aria-label={sec.name}
                    aria-current={active ? "true" : undefined}
                    className={`abm-frame${active ? " abm-frame--active" : ""}`}
                  >
                    <span className="abm-frame-sprocket abm-frame-sprocket--top" />
                    <span className="abm-frame-sprocket abm-frame-sprocket--bottom" />
                    <img className="abm-frame-img" src={sec.img} alt="" draggable="false" />
                    <span className="abm-frame-tag">{pad2(idx + 1)}</span>
                  </button>
                );
              })}
            </div>

            <div className="abm-controls">
              <div className="abm-chapter-label">{s.name} · {i + 1} of {total}</div>
              <div className="abm-nav">
                <button
                  type="button"
                  className="abm-back"
                  onClick={back}
                  disabled={i === 0}
                  aria-label="Previous"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <button type="button" className="abm-next" onClick={next}>
                  {last ? "Start your story" : "Next chapter"}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button type="button" className="abm-close" aria-label="Close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function AboutModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && <AboutModalInner key="about-modal" onClose={onClose} />}
    </AnimatePresence>
  );
}
