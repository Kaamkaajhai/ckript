import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import scriptOriginal from "../assets/ckript-landing/script-original.png";
import filmClean from "../assets/ckript-landing/film-clean.png";
import scriptImg from "../assets/ckript-landing/script-img.png";
import trailerStill from "../assets/ckript-landing/trailer-still.png";

/* Destinations carried over from the previous landing page. */
const ROUTES = {
  home: "/",
  writer: "/writer-onboarding",
  pro: "/producer-director-onboarding",
  pricing: "/pricing",
  join: "/join",
  login: "/login",
  about: "/about",
  contact: "/contact",
  privacy: "/privacy-policy",
  terms: "/terms-of-service",
  linkedin: "https://www.linkedin.com/company/ckript/?viewAsMember=true",
};

/* ─────────────────────────────────────────────────────────────
   Ckript Landing — port of the "Ckript Landing.dc.html" Claude
   Design handoff bundle. Every inline SVG icon from the original
   has been replaced with Google Material Symbols icons.
   ───────────────────────────────────────────────────────────── */

const INK = "#0B0A06";
const RED = "#D14D37";
const SANS = "'Helvetica Neue',Arial,sans-serif";
const SERIF = "'Baskervville',Georgia,serif";
const BODY = "'PT Serif',Georgia,serif";
const LOGO_SRC = "/ckript-logo-landscape-nobg.png";

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Baskervville:ital@0;1&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block');

@keyframes ckl-flA{0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}
@keyframes ckl-flB{0%,100%{transform:translateY(0)}50%{transform:translateY(13px)}}
@keyframes ckl-fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes ckl-fadeUpC{from{opacity:0;transform:translate(-50%,28px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes ckl-fadeDown{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
@keyframes ckl-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes ckl-growLineC{from{opacity:0;transform:translateX(-50%) scaleY(0)}to{opacity:1;transform:translateX(-50%) scaleY(1)}}
@keyframes ckl-dotPulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:1}50%{transform:translate(-50%,-50%) scale(1.4);opacity:.7}}
@keyframes ckl-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

.ckl{background:#fff;}
.ckl *{box-sizing:border-box;}

/* Page scrollbar while the landing is shown (scoped via .ckl-scroll on <html>).
   The standard properties are the primary, cross-browser driver: they give a
   thin, arrow-less bar and are honoured by Chrome 121+/Edge/Firefox — and unlike
   ::-webkit-scrollbar on the viewport, they actually repaint when the class
   toggles. The ::-webkit-scrollbar block is only a fallback for Safari / older
   WebKit, which ignore the standard properties. */
html.ckl-scroll{scrollbar-width:thin;scrollbar-color:#161513 transparent;}
html.ckl-scroll::-webkit-scrollbar{width:7px;height:7px;}
html.ckl-scroll::-webkit-scrollbar-track{background:transparent;}
html.ckl-scroll::-webkit-scrollbar-thumb{background:#161513;border-radius:100px;}
html.ckl-scroll::-webkit-scrollbar-thumb:hover{background:${RED};}
html.ckl-scroll::-webkit-scrollbar-button{display:none;width:0;height:0;}
.ckl .msi{font-family:'Material Symbols Outlined';font-weight:normal;font-style:normal;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-smoothing:antialiased;font-variation-settings:'opsz' 24,'wght' 400,'GRAD' 0,'FILL' 0;}
.ckl .msi.fill{font-variation-settings:'opsz' 24,'wght' 400,'GRAD' 0,'FILL' 1;}

.ckl a{transition:color .22s ease;}
.ckl .hov-red:hover{color:${RED};}
.ckl .hov-underline:hover{color:${RED};border-color:${RED};}
.ckl .hov-btn{transition:background .25s ease,transform .25s cubic-bezier(.2,.7,.2,1);}
.ckl .hov-btn:hover{background:#2c2a26;}
.ckl .hov-btn-lift:hover{background:#2c2a26;transform:translateY(-3px);}
.ckl .hov-lift3{transition:transform .25s cubic-bezier(.2,.7,.2,1);}
.ckl .hov-lift3:hover{transform:translateY(-3px);}
.ckl .hov-trailer:hover{transform:translateY(-6px);box-shadow:0 30px 60px rgba(0,0,0,0.22);}
.ckl .hov-rights:hover{transform:translateY(-6px);box-shadow:0 30px 60px rgba(0,0,0,0.14);}
.ckl .hov-format{transition:transform .35s cubic-bezier(.2,.7,.2,1);}
.ckl .hov-format:hover{transform:translateY(-8px);}
.ckl .hov-tab:hover{border-color:#c9c6bf;}
.ckl .hov-bc-red:hover{border-color:#D14D37;}

.ckl .mobile-accordion-icon { display: none !important; }
.ckl .ckl-feat-detail-mobile { display: none !important; }
.ckl .ckl-feat-detail-desktop { display: block !important; }
.ckl .mobile-only { display: none !important; }

@media (max-width: 600px) {
  .ckl .desktop-only { display: none !important; }
  .ckl .mobile-only { display: block !important; }
}
@media (max-width:900px){
  .ckl .ckl-feat-grid{grid-template-columns:1fr !important;}
  .ckl .ckl-feat-panel{grid-template-columns:1fr !important;}
  .ckl .ckl-format-grid{grid-template-columns:repeat(2,1fr) !important;}
  .ckl .ckl-problem-grid,.ckl .ckl-testi-grid{grid-template-columns:1fr !important;}
  
  /* Hero Overrides */
  .ckl .ckl-hero-wrap {
    height: auto !important;
    padding-bottom: 60px !important;
  }
  .ckl .ckl-hero-stage {
    position: relative !important;
    width: 100% !important;
    height: auto !important;
    transform: none !important;
    left: 0 !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
  }

  /* Nav Overrides */
  .ckl .ckl-hero-nav {
    position: relative !important;
    padding: 24px 15px 0 !important;
    height: auto !important;
    flex-wrap: nowrap !important;
    justify-content: space-between !important;
    align-items: center !important;
    gap: 8px !important;
  }
  .ckl .ckl-hero-nav > a:first-child {
    flex: 0 0 auto !important;
    text-align: left !important;
    font-size: 24px !important; /* Scale logo down slightly */
  }
  .ckl .ckl-hero-nav-divider { display: none !important; }
  .ckl .ckl-hero-nav-links {
    margin-left: 0 !important;
    gap: 12px !important;
    flex-wrap: nowrap !important;
    justify-content: center !important;
    flex: 1 1 auto !important;
  }
  .ckl .ckl-hero-nav-links > * {
    font-size: 13px !important;
    white-space: nowrap !important;
  }
  .ckl .ckl-hero-nav-login {
    margin-left: 0 !important;
    flex: 0 0 auto !important;
    text-align: right !important;
    margin-top: 0 !important;
    font-size: 14px !important;
  }

  /* Hero Content Overrides */
  .ckl .ckl-hero-title {
    position: relative !important;
    top: auto !important;
    margin-top: 50px !important;
    font-size: 56px !important;
    line-height: 1.1 !important;
  }
  .ckl .ckl-hero-title span {
    width: 10px !important;
    height: 10px !important;
    margin-left: 6px !important;
  }
  .ckl .ckl-hero-line {
    position: relative !important;
    top: auto !important;
    margin: 30px auto !important;
    transform: none !important;
    left: auto !important;
  }
  .ckl .ckl-hero-desc {
    position: relative !important;
    top: auto !important;
    width: 90% !important;
    max-width: 400px !important;
    font-size: 18px !important;
    line-height: 1.5 !important;
    transform: none !important;
    left: auto !important;
    padding: 0 20px !important;
  }
  .ckl .ckl-hero-buttons {
    position: relative !important;
    top: auto !important;
    margin-top: 40px !important;
    flex-direction: column !important;
    gap: 16px !important;
    transform: none !important;
    left: auto !important;
  }
  .ckl .ckl-hero-buttons > button {
    width: 100% !important;
    max-width: 300px !important;
  }

  /* Decorations */
  .ckl .ckl-hero-decor-1 {
    transform: scale(0.3) !important;
    left: -800px !important;
    top: 200px !important;
  }
  .ckl .ckl-hero-decor-2 {
    transform: scale(0.3) !important;
    left: 100px !important;
    top: 100px !important;
  }

  /* Features Accordion */
  .ckl .ckl-feat-tabs { position: relative !important; }
  .ckl .mobile-accordion-icon { display: block !important; }
  .ckl .ckl-feat-detail-mobile { display: block !important; }
  .ckl .ckl-feat-detail-desktop { display: none !important; }

  /* Steps Overrides */
  .ckl .ckl-steps-wrap {
    height: auto !important;
    padding: 60px 20px !important;
  }
  .ckl .ckl-steps-stage {
    position: relative !important;
    width: 100% !important;
    height: auto !important;
    transform: none !important;
    left: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
  }
  .ckl .ckl-steps-title {
    position: relative !important;
    top: auto !important;
    font-size: 48px !important;
    line-height: 1.1 !important;
    order: 1;
  }
  .ckl .ckl-steps-desc {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    width: 100% !important;
    font-size: 18px !important;
    line-height: 1.5 !important;
    margin-top: 20px !important;
    order: 2;
    transform: none !important;
    padding: 0 20px !important;
  }
  .ckl .ckl-steps-arrows {
    display: none !important;
  }
  .ckl .ckl-steps-col-1 {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    width: 100% !important;
    max-width: 400px !important;
    height: auto !important;
    margin-top: 60px !important;
    order: 3;
    transform: none !important;
  }
  .ckl .ckl-steps-col-2 {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    width: 100% !important;
    max-width: 400px !important;
    height: auto !important;
    aspect-ratio: 460/326 !important;
    margin-top: 60px !important;
    order: 5;
    transform: none !important;
  }
  .ckl .ckl-steps-col-3 {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    width: 100% !important;
    max-width: 296px !important;
    height: auto !important;
    margin-top: 60px !important;
    order: 7;
    transform: none !important;
  }
  .ckl .ckl-steps-cap {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    transform: none !important;
    width: 100% !important;
    margin-top: 20px !important;
  }
  .ckl .ckl-steps-cap-1 { order: 4; }
  .ckl .ckl-steps-cap-2 { order: 6; }
  .ckl .ckl-steps-cap-3 { order: 8; }
  .ckl .ckl-steps-cta-line {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    transform: none !important;
    margin-top: 60px !important;
    order: 9;
  }
  .ckl .ckl-steps-cta-btn {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    transform: none !important;
    margin-top: 20px !important;
    order: 10;
  }
}
@media (max-width:480px){
  .ckl .ckl-hero-title {
    font-size: 42px !important;
  }
  .ckl .ckl-hero-nav-links {
    gap: 12px !important;
  }
  .ckl .ckl-hero-desc {
    font-size: 16px !important;
  }
}
`;

function Diamond({ size = 9, color = RED, style }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        background: color,
        transform: "rotate(45deg)",
        flex: "none",
        display: "inline-block",
        ...style,
      }}
    />
  );
}

function Icon({ name, size = 24, color = "currentColor", fill = false, style }) {
  return (
    <span className={fill ? "msi fill" : "msi"} style={{ fontSize: size, color, ...style }}>
      {name}
    </span>
  );
}

/* Reveal-on-scroll: any element carrying data-ra animates in when visible. */
function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target;
          const name = el.getAttribute("data-ra") || "ckl-fadeUp";
          const d = el.getAttribute("data-rd") || "0";
          el.style.animation = `${name} .85s ${d}s cubic-bezier(.2,.7,.2,1) both`;
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
    );
    root.querySelectorAll("[data-ra]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

/* Scale a fixed-width design stage to fill its responsive wrapper. */
function useStageFit(wrapRef, stageRef, designW, designH) {
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;
    const fit = () => {
      const w = wrap.clientWidth || window.innerWidth;
      const s = w / designW;
      stage.style.transform = `translateX(-50%) scale(${s})`;
      wrap.style.height = `${designH * s}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    window.addEventListener("resize", fit);
    const timers = [50, 200, 600].map((t) => setTimeout(fit, t));
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
      timers.forEach(clearTimeout);
    };
  }, [wrapRef, stageRef, designW, designH]);
}

const FEATURES = [
  {
    num: "01",
    tab: "Text-to-Trailer AI",
    tag: "AI · Video",
    title: "Text-to-Trailer AI",
    italic: "30-second visual pitch from your script.",
    desc: "Ckript turns your written script into a captivating 30-second visual trailer. By blending stock footage with AI-generated visuals, your concept reaches producers and investors quickly, clearly, and memorably.",
    bullets: ["Auto-generate trailers in seconds", "Hook decision-makers visually", "5× your discovery rate"],
    seed: "ckript-trailer",
    opacity: 0.78,
    media: "trailer",
  },
  {
    num: "02",
    tab: "Locked Ideas, Paid Unlocks",
    tag: "Monetisation",
    title: "Locked Ideas, Paid Unlocks",
    italic: "Public summaries, protected scripts.",
    desc: "Your full script stays safely behind a paywall. Share a curated public summary to spark interest while producers pay to unlock the full work — your IP stays yours, always.",
    bullets: ["Full script IP protection", "Earn from every unlock", "Public teasers drive demand"],
    seed: "ckript-lock",
    opacity: 0.7,
    media: { icon: "lock", shape: "round-sq" },
  },
  {
    num: "03",
    tab: "Smart Matching Engine",
    tag: "AI · Discovery",
    title: "Smart Matching Engine",
    italic: "Data-driven, targeted discovery.",
    desc: "Our recommendation engine analyzes producer activity and preferences to surface the right matches. Writers get found by producers actively looking for stories in their genre.",
    bullets: ["Auto-matched by genre & style", "Effortless connections", "Real-time producer alerts"],
    seed: "ckript-match",
    opacity: 0.7,
    media: { icon: "search", shape: "circle" },
  },
  {
    num: "04",
    tab: "Script Validation & Scoring",
    tag: "AI · Analysis",
    title: "Script Validation & Scoring",
    italic: "AI-powered story analysis.",
    desc: "Every script gets analyzed for structure, originality, market potential, and narrative quality. You receive a detailed score breakdown — clear insight into what's working and what needs polish, before it reaches the industry.",
    bullets: ["Detailed AI score report", "Structure & originality analysis", "Market-fit recommendations"],
    seed: "ckript-score",
    opacity: 0.7,
    media: { stat: "92", label: "Ckript Score" },
  },
  {
    num: "05",
    tab: "Option Hold Exclusivity",
    tag: "Business",
    title: "Option Hold Exclusivity",
    italic: "30-day paid holding periods.",
    desc: "Producers can secure temporary exclusivity by paying to reserve a script for 30 days. Creators get protection and guaranteed compensation during the evaluation window — everyone wins.",
    bullets: ["Guaranteed income per hold", "Exclusive 30-day lock-in", "Faster producer decisions"],
    seed: "ckript-hold",
    opacity: 0.7,
    media: { stat: "30", label: "Days exclusive" },
  },
  {
    num: "06",
    tab: "AI Writing Studio",
    tag: "AI · Writing",
    title: "AI Writing Studio",
    italic: "An AI co-writer at your side.",
    desc: "Create, edit, and refine your scripts directly on the platform with an AI writing assistant. Get live guidance on dialogue, pacing, and structure — polish your screenplay before you ever submit.",
    bullets: ["Real-time AI co-writing", "Dialogue & pacing suggestions", "In-platform draft management"],
    seed: "ckript-studio",
    opacity: 0.72,
    media: { icon: "edit", shape: "round-sq" },
  },
  {
    num: "07",
    tab: "Expert Reader Reviews",
    tag: "Review",
    title: "Expert Reader Reviews",
    italic: "Curated industry professionals.",
    desc: "Submissions are reviewed by hand-picked expert readers who provide industry-standard coverage reports. Get the same kind of feedback decision-makers use to evaluate scripts every day.",
    bullets: ["Industry-standard coverage", "Hand-picked reviewers", "Actionable professional feedback"],
    seed: "ckript-review",
    opacity: 0.72,
    media: { stars: 4 },
  },
];

const FORMATS = [
  { title: "Film", sub: "Feature & Short", seed: "ckript-film", offset: false, rd: "0.02" },
  { title: "Web Series", sub: "Episodic", seed: "ckript-series", offset: true, rd: "0.08" },
  { title: "Anime", sub: "Animation", seed: "ckript-anime", offset: false, rd: "0.14" },
  { title: "Television", sub: "Broadcast", seed: "ckript-tv", offset: true, rd: "0.2" },
  { title: "Cartoons", sub: "Family", seed: "ckript-cartoon", offset: false, rd: "0.26" },
];

const TESTIMONIALS = [
  {
    quote: "The first producer call happened in under two weeks, and we entered option talks right after.",
    body: "I had a script people complimented but never moved forward on. On Ckript I could present it with a trailer and clearer project notes.",
    name: "Sarah Chen",
    role: "Screenplay Writer, Los Angeles",
    tag: "Writer",
    seed: "ckript-sarah",
    rd: "0.04",
  },
  {
    quote: "My shortlist got tighter, and my team now spends more time on scripts we would actually develop.",
    body: "Most of my week used to go into sorting submissions that were not a fit. The filtering and matching changed that completely.",
    name: "Marcus Williams",
    role: "Independent Producer, New York",
    tag: "Producer",
    seed: "ckript-marcus",
    rd: "0.1",
  },
  {
    quote: "Clearer context around genre fit, audience, and scope made diligence faster and decisions more confident.",
    body: "My issue was never interest in content IP, it was signal quality. Ckript gave me exactly that.",
    name: "Priya Kapoor",
    role: "Film & Media Investor, London",
    tag: "Investor",
    seed: "ckript-priya",
    rd: "0.16",
  },
  {
    quote: "I shared self-tapes with teams early and got invited into conversations before formal casting started.",
    body: "I wanted to connect with projects at script stage, not after roles were already narrowed down.",
    name: "James Rodriguez",
    role: "Actor, Miami",
    tag: "Actor",
    seed: "ckript-james",
    rd: "0.22",
  },
];

const FOOTER_COLS = [
  {
    head: "Platform",
    links: [
      { label: "Scripts", to: ROUTES.join },
      { label: "For Producers", action: "producer" },
      { label: "For Writers", action: "writer" },
    ],
  },
  {
    head: "Company",
    links: [
      { label: "About", action: "about" },
      { label: "Pricing", action: "pricing" },
      { label: "Contact", to: ROUTES.contact },
      { label: "LinkedIn", to: ROUTES.linkedin, external: true },
    ],
  },
  {
    head: "Legal",
    links: [
      { label: "Privacy", to: ROUTES.privacy },
      { label: "Terms", to: ROUTES.terms },
    ],
  },
];

const MARQUEE = [
  "Now casting untold stories",
  "From the page to the screen",
  "Every great film began as a script",
  "Your story deserves an audience",
];

function FeatureMedia({ feat }) {
  const { media, seed, opacity } = feat;
  return (
    <div style={{ position: "relative", background: "#0c0d0f", overflow: "hidden" }}>
      <img
        src={`https://picsum.photos/seed/${seed}/900/1000?grayscale`}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg,rgba(12,13,15,0.55),rgba(12,13,15,0.1))" }} />
      {media === "trailer" && (
        <>
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 74, height: 74, borderRadius: "50%", background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="play_arrow" fill size={34} color="#fff" />
          </div>
          <div style={{ position: "absolute", left: 24, right: 24, bottom: 24 }}>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.3)" }}>
              <div style={{ width: "42%", height: "100%", background: RED, borderRadius: 2 }} />
            </div>
            <div style={{ marginTop: 11, fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.85)", letterSpacing: "0.3px" }}>
              FORSAKEN HORIZON — Trailer · 0:13 / 0:30
            </div>
          </div>
        </>
      )}
      {media && media.icon && (
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 70, height: 70, borderRadius: media.shape === "round-sq" ? 18 : "50%", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={media.icon} size={32} color="#fff" />
        </div>
      )}
      {media && media.stat && (
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
          <div style={{ fontFamily: SERIF, fontSize: 78, lineHeight: 1, color: "#fff" }}>{media.stat}</div>
          <div style={{ marginTop: 6, fontFamily: SANS, fontSize: 13, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>{media.label}</div>
        </div>
      )}
      {media && media.stars && (
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", display: "flex", gap: 7 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Icon key={i} name="star" fill size={30} color={i < media.stars ? RED : "rgba(255,255,255,0.45)"} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const rootRef = useRef(null);
  const heroWrapRef = useRef(null);
  const heroStageRef = useRef(null);
  const stepsWrapRef = useRef(null);
  const stepsStageRef = useRef(null);
  const [activeFeat, setActiveFeat] = useState(0);
  const [isFeatDropdownOpen, setIsFeatDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPricingDropdownOpen, setIsPricingDropdownOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const { openAuthModal, openProducerOnboarding, openWriterOnboarding, openAboutModal, openPricingModal } = useAuthModal();

  // Onboarding lives in modals (producer/director + writer), so landing CTAs pop
  // the modal in-context rather than routing to the standalone onboarding page.
  const openOnboarding = (kind) =>
    kind === "writer" ? openWriterOnboarding() : openProducerOnboarding();

  const primaryPath = user?.role === "reader" ? "/reader" : "/dashboard";
  const signInLabel = user ? (user.role === "reader" ? "Reader" : "Dashboard") : "Sign in";

  useStageFit(heroWrapRef, heroStageRef, 1586, 992);
  useStageFit(stepsWrapRef, stepsStageRef, 1850, 1080);
  useReveal(rootRef);

  const renderFeatDetail = (f) => (
    <div className="ckl-feat-panel" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", minHeight: 480 }}>
      <div style={{ padding: "clamp(34px,3.4vw,52px)", display: "flex", flexDirection: "column" }}>
        <span style={{ alignSelf: "flex-start", fontFamily: SANS, fontWeight: 600, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: RED, border: "1px solid #ecc9c1", padding: "6px 13px", borderRadius: 100 }}>{f.tag}</span>
        <h3 style={{ margin: "24px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(2rem,3.4vw,2.9rem)", lineHeight: 1.04, color: INK }}>{f.title}</h3>
        <p style={{ margin: "10px 0 0", fontFamily: BODY, fontStyle: "italic", fontSize: 19, color: "#8d8a84" }}>{f.italic}</p>
        <p style={{ margin: "24px 0 0", fontFamily: BODY, fontSize: 18, lineHeight: "29px", color: "#57544f" }}>{f.desc}</p>
        <div style={{ marginTop: "auto", paddingTop: 30, display: "flex", flexDirection: "column", gap: 13 }}>
          {f.bullets.map((b) => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <Diamond size={7} />
              <span style={{ fontFamily: SANS, fontSize: 16, color: "#33312e" }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <FeatureMedia feat={f} />
    </div>
  );

  // Mark <html> so the page scrollbar styling applies only while the landing is
  // mounted. useLayoutEffect runs before paint, so the class is present on the
  // first frame (no flash of the app's default scrollbar).
  useLayoutEffect(() => {
    const el = document.documentElement;
    el.classList.add("ckl-scroll");
    return () => el.classList.remove("ckl-scroll");
  }, []);

  const initHeroScale = typeof window !== "undefined" ? window.innerWidth / 1586 : 0.62;
  const initStepsScale = typeof window !== "undefined" ? window.innerWidth / 1850 : 0.53;

  const navLink = { color: "#262523", textDecoration: "none", fontFamily: SANS, fontWeight: 500, fontSize: 19 };
  const feat = FEATURES[activeFeat];

  return (
    <div className="ckl" ref={rootRef} style={{ width: "100%", overflowX: "hidden", background: "#fff" }}>
      <style>{STYLES}</style>

      {/* ===================== HERO ===================== */}
      <section ref={heroWrapRef} className="ckl-hero-wrap" style={{ position: "relative", width: "100%", overflow: "hidden", background: "#fff", height: `${992 * initHeroScale}px` }}>
        <div ref={heroStageRef} className="ckl-hero-stage" style={{ position: "absolute", top: 0, left: "50%", width: 1586, height: 992, transformOrigin: "top center", transform: `translateX(-50%) scale(${initHeroScale})`, background: "#fff" }}>
          {/* Decorations */}
          <div className="ckl-hero-decor-1" style={{ position: "absolute", left: -623, top: 463, width: 1644, height: 1096, pointerEvents: "none", zIndex: 1, animation: "ckl-flA 11s ease-in-out infinite" }}>
            <img src={scriptOriginal} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "translate(-5px,-200px) rotate(9.7deg) scale(0.7)", transformOrigin: "center center", pointerEvents: "none", userSelect: "none" }} />
          </div>
          <div className="ckl-hero-decor-2" style={{ position: "absolute", left: 605, top: 213, width: 1507, height: 1005, pointerEvents: "none", zIndex: 1, animation: "ckl-flB 13s ease-in-out infinite" }}>
            <img src={filmClean} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "translate(105px,-120px) rotate(5.44deg) scale(1.05)", transformOrigin: "center center", pointerEvents: "none", userSelect: "none" }} />
          </div>

          {/* Nav */}
          <div className="ckl-hero-nav" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 104, display: "flex", alignItems: "center", padding: "0 52px", zIndex: 10, opacity: 0, animation: "ckl-fadeDown .8s .05s cubic-bezier(.2,.7,.2,1) forwards" }}>
            <Link to={ROUTES.home} style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <img src={LOGO_SRC} alt="Ckript" style={{ height: 38, width: "auto", display: "block" }} />
            </Link>
            <span className="ckl-hero-nav-divider desktop-only" style={{ width: 1, height: 40, background: "#cfcdc7", margin: "0 0 0 34px" }} />
            <nav className="ckl-hero-nav-links desktop-only" style={{ display: "flex", alignItems: "center", gap: 36, marginLeft: 48, fontFamily: SANS, fontWeight: 500, fontSize: 19, color: "#262523" }}>
              <button type="button" onClick={() => openWriterOnboarding()} className="hov-red" style={{ ...navLink, background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 1 }}>Scripts</button>
              <button type="button" onClick={() => openProducerOnboarding()} className="hov-red" style={{ ...navLink, background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 1 }}>For Producers</button>
              
              <div 
                style={{ position: "relative" }} 
                onMouseEnter={() => setIsPricingDropdownOpen(true)}
                onMouseLeave={() => setIsPricingDropdownOpen(false)}
              >
                <button 
                  type="button" 
                  onClick={() => setIsPricingDropdownOpen(prev => !prev)} 
                  className="hov-red" 
                  style={{ ...navLink, background: "none", border: "none", padding: "10px 0", cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", gap: 2 }}
                >
                  Pricing
                  <span className="msi" style={{ fontSize: 20 }}>expand_more</span>
                </button>
                {isPricingDropdownOpen && (
                  <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", background: "#fff", border: "1px solid #cfcdc7", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "8px 0", minWidth: 200, zIndex: 100, overflow: "hidden" }}>
                    <button 
                      type="button" 
                      onClick={() => { setIsPricingDropdownOpen(false); openPricingModal("writer"); }} 
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: 16, color: INK, transition: "background 0.2s" }} 
                      onMouseEnter={(e) => e.target.style.background = "#f4f3f0"}
                      onMouseLeave={(e) => e.target.style.background = "none"}
                    >
                      Writer Plans
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setIsPricingDropdownOpen(false); openPricingModal("industry"); }} 
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: 16, color: INK, transition: "background 0.2s" }} 
                      onMouseEnter={(e) => e.target.style.background = "#f4f3f0"}
                      onMouseLeave={(e) => e.target.style.background = "none"}
                    >
                      Film Industry Plan
                    </button>
                  </div>
                )}
              </div>
            </nav>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
              {user ? (
                <Link to={primaryPath} className="ckl-hero-nav-login hov-red desktop-only" style={{ fontFamily: SANS, fontWeight: 500, fontSize: 19, color: INK, textDecoration: "none" }}>{signInLabel}</Link>
              ) : (
                <button type="button" onClick={() => openAuthModal()} className="ckl-hero-nav-login hov-red desktop-only" style={{ fontFamily: SANS, fontWeight: 500, fontSize: 19, color: INK, background: "none", border: "none", padding: 0, cursor: "pointer", transition: "color .22s ease" }}>{signInLabel}</button>
              )}
              <button type="button" className="mobile-only" onClick={() => setIsMobileMenuOpen(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: INK }}>
                <span className="msi" style={{ fontSize: 32 }}>menu</span>
              </button>
            </div>
          </div>
          
          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 9999, display: "flex", flexDirection: "column", padding: "24px 15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Link to={ROUTES.home} onClick={() => setIsMobileMenuOpen(false)} style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                  <img src={LOGO_SRC} alt="Ckript" style={{ height: 30, width: "auto", display: "block" }} />
                </Link>
                <button type="button" onClick={() => setIsMobileMenuOpen(false)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: INK }}>
                  <span className="msi" style={{ fontSize: 32 }}>close</span>
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 80, alignItems: "center", fontFamily: SANS, fontWeight: 500, fontSize: 22 }}>
                <button type="button" onClick={() => { setIsMobileMenuOpen(false); openWriterOnboarding(); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: INK }}>Scripts</button>
                <button type="button" onClick={() => { setIsMobileMenuOpen(false); openProducerOnboarding(); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: INK }}>For Producers</button>
                <button type="button" onClick={() => { setIsMobileMenuOpen(false); openPricingModal("writer"); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: INK }}>Writer Plans</button>
                <button type="button" onClick={() => { setIsMobileMenuOpen(false); openPricingModal("industry"); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: INK }}>Film Industry Plan</button>
                {user ? (
                  <Link to={primaryPath} onClick={() => setIsMobileMenuOpen(false)} style={{ color: INK, textDecoration: "none", marginTop: 24 }}>{signInLabel}</Link>
                ) : (
                  <button type="button" onClick={() => { setIsMobileMenuOpen(false); openAuthModal(); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: INK, marginTop: 24 }}>{signInLabel}</button>
                )}
              </div>
            </div>
          )}

          {/* Hero content */}
          <h1 className="ckl-hero-title" style={{ margin: 0, padding: 0, position: "absolute", top: 248, left: 0, width: "100%", textAlign: "center", fontFamily: SERIF, fontWeight: 400, fontSize: 114, lineHeight: "128px", color: INK, zIndex: 2, opacity: 0, animation: "ckl-fadeUp 1s .18s cubic-bezier(.2,.7,.2,1) forwards" }}>
            THE SCRIPT<br />IS THE STORY
            <span style={{ display: "inline-block", width: 19, height: 19, background: RED, marginLeft: 18, verticalAlign: "1px" }} />
          </h1>
          <span className="ckl-hero-line" style={{ position: "absolute", top: 528, left: "50%", width: 1, height: 46, background: "#bdbbb5", transform: "translateX(-50%)", transformOrigin: "top", zIndex: 2, opacity: 0, animation: "ckl-growLineC .7s .55s ease forwards" }} />
          <p className="ckl-hero-desc" style={{ position: "absolute", top: 594, left: "50%", transform: "translateX(-50%)", width: 530, margin: 0, textAlign: "center", fontFamily: BODY, fontWeight: 400, fontSize: 22, lineHeight: "32px", color: "#33312e", zIndex: 2, opacity: 0, animation: "ckl-fadeUpC .9s .5s cubic-bezier(.2,.7,.2,1) forwards" }}>
            Ckript is a curated marketplace where writers connect with producers and directors to showcase, discover, and acquire high-potential stories.
          </p>
          <div className="ckl-hero-buttons" style={{ position: "absolute", top: 728, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 54, zIndex: 2, opacity: 0, animation: "ckl-fadeUpC .9s .65s cubic-bezier(.2,.7,.2,1) forwards" }}>
            <button type="button" onClick={openProducerOnboarding} className="hov-btn-lift" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 244, height: 70, background: "#161513", color: "#fff", fontFamily: SANS, fontWeight: 600, fontSize: 19, letterSpacing: "0.2px", textDecoration: "none", border: "none", cursor: "pointer", transition: "transform .25s cubic-bezier(.2,.7,.2,1),background .25s ease" }}>Browse Scripts</button>
            <button type="button" onClick={() => openAboutModal()} className="hov-underline" style={{ fontFamily: SANS, fontWeight: 700, fontSize: 19, color: INK, textDecoration: "none", borderBottom: "2px solid #0B0A06", paddingBottom: 7, transition: "color .22s ease,border-color .22s ease", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer" }}>Meet the Platform</button>
          </div>
        </div>
      </section>

      {/* ===================== SECTION BRIDGE ===================== */}
      <div style={{ position: "relative", width: "100%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0 4px" }}>
        <span style={{ width: 1, height: 78, background: "linear-gradient(to bottom, rgba(11,10,6,0), #c4c2bc)" }} />
        <Diamond size={9} style={{ boxShadow: "0 0 0 6px #fff" }} />
        <span style={{ marginTop: 26, fontFamily: SANS, fontWeight: 600, fontSize: 14, letterSpacing: "3px", color: "#9a978f", textTransform: "uppercase" }}>How It Works</span>
        <span style={{ marginTop: 26, width: 1, height: 78, background: "linear-gradient(to bottom, #c4c2bc, rgba(11,10,6,0))" }} />
      </div>

      {/* ===================== STEPS SECTION ===================== */}
      <section ref={stepsWrapRef} className="ckl-steps-wrap" style={{ position: "relative", width: "100%", overflow: "hidden", background: "#fff", height: `${1080 * initStepsScale}px` }}>
        <div ref={stepsStageRef} className="ckl-steps-stage" style={{ position: "absolute", top: 0, left: "50%", width: 1586, height: 1080, transformOrigin: "top center", transform: `translateX(-50%) scale(${initStepsScale})`, background: "#fff" }}>
          <h1 className="ckl-steps-title" data-ra="ckl-fadeUp" data-rd="0" style={{ margin: 0, position: "absolute", top: 88, left: 0, width: "100%", textAlign: "center", fontFamily: SERIF, fontWeight: 400, fontSize: 94, lineHeight: "94px", color: INK, opacity: 0 }}>
            FIND IT. WATCH IT. OWN IT
            <span style={{ display: "inline-block", width: 17, height: 17, background: RED, marginLeft: 10, verticalAlign: "2px" }} />
          </h1>
          <p className="ckl-steps-desc" data-ra="ckl-fadeUpC" data-rd="0.08" style={{ position: "absolute", top: 218, left: "50%", transform: "translateX(-50%)", width: 600, margin: 0, textAlign: "center", fontFamily: BODY, fontWeight: 400, fontSize: 23, lineHeight: "31px", color: "#57544f", opacity: 0 }}>
            Producers can explore scripts, watch AI-generated trailers,<br />and acquire the ones that stand out.
          </p>

          {/* Arrows */}
          <div className="ckl-steps-arrows" data-ra="ckl-fadeIn" data-rd="0.5" style={{ position: "absolute", left: 482, top: 503, color: "#8d8a84", opacity: 0 }}>
            <Icon name="arrow_right_alt" size={40} />
          </div>
          <div className="ckl-steps-arrows" data-ra="ckl-fadeIn" data-rd="0.62" style={{ position: "absolute", left: 1066, top: 503, color: "#8d8a84", opacity: 0 }}>
            <Icon name="arrow_right_alt" size={40} />
          </div>

          {/* Col 1: script image */}
          <img className="ckl-steps-col-1" data-ra="ckl-fadeUp" data-rd="0.18" src={scriptImg} alt="" style={{ position: "absolute", left: -125, top: 268, width: 766, height: 511, objectFit: "contain", pointerEvents: "none", userSelect: "none", opacity: 0 }} />

          {/* Col 2: trailer */}
          <div className="ckl-steps-col-2 hov-trailer" data-ra="ckl-fadeUp" data-rd="0.3" style={{ position: "absolute", left: 563, top: 360, width: 460, height: 326, borderRadius: 10, overflow: "hidden", background: "#0c0d0f", boxShadow: "0 22px 48px rgba(0,0,0,0.16)", opacity: 0, transition: "transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s ease" }}>
            <img src={trailerStill} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 62, background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))" }}>
              <div style={{ position: "absolute", left: 14, right: 14, top: 14, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.32)" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: "46%", background: RED, borderRadius: 2 }} />
                <div style={{ position: "absolute", left: "46%", top: "50%", width: 12, height: 12, borderRadius: "50%", background: RED, transform: "translate(-50%,-50%)", animation: "ckl-dotPulse 2.4s ease-in-out infinite" }} />
              </div>
              <div style={{ position: "absolute", left: 14, right: 14, bottom: 11, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <Icon name="play_arrow" fill size={16} color="#fff" />
                  <span style={{ fontFamily: SANS, fontSize: 13, color: "#fff", letterSpacing: "0.3px" }}>0:34 / 1:46</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#fff" }}>
                  <Icon name="volume_up" size={18} color="#fff" />
                  <Icon name="settings" size={17} color="#fff" />
                  <Icon name="fullscreen" size={18} color="#fff" />
                </div>
              </div>
            </div>
          </div>

          {/* Col 3: rights card */}
          <div className="ckl-steps-col-3 hov-rights" data-ra="ckl-fadeUp" data-rd="0.42" style={{ position: "absolute", left: 1140, top: 345, width: 296, height: 372, background: "#fcfcfa", border: "1px solid #e4e2dc", borderRadius: 10, boxShadow: "0 20px 44px rgba(0,0,0,0.08)", padding: "30px 30px 28px", opacity: 0, transition: "transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s ease" }}>
            <div style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 23, lineHeight: 1, letterSpacing: "0.3px", whiteSpace: "nowrap", color: "#161513" }}>FORSAKEN HORIZON</div>
            <div style={{ marginTop: 22, fontFamily: BODY, fontSize: 18, lineHeight: "27px", color: "#3a3833" }}>Drama / Sci-Fi / Thriller<br />Feature Length</div>
            <div style={{ margin: "24px 0", height: 1, background: "#e3e1da" }} />
            <div style={{ fontFamily: BODY, fontSize: 18, lineHeight: "27px", color: "#3a3833" }}>Rights<br />Worldwide<br />All Media</div>
            <Link to={ROUTES.join} className="hov-btn" style={{ position: "absolute", left: 30, right: 30, bottom: 28, display: "flex", alignItems: "center", justifyContent: "center", gap: 11, height: 54, background: "#161513", borderRadius: 6, textDecoration: "none" }}>
              <Icon name="lock" size={16} color="#fff" />
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 17, letterSpacing: "0.2px", color: "#fff" }}>Acquire Script</span>
            </Link>
          </div>

          {/* Captions */}
          {[
            { left: 258, rd: "0.52", num: "01", title: "Discover a script.", desc: ["Explore original stories", "across every genre."] },
            { left: 793, rd: "0.6", num: "02", title: "Watch the trailer.", desc: ["Experience AI-generated trailers", "that bring the story to life."] },
            { left: 1288, rd: "0.68", num: "03", title: "Own the story.", desc: ["Secure exclusive rights", "to make it yours."] },
          ].map((c, i) => (
            <div key={c.num} className={`ckl-steps-cap ckl-steps-cap-${i + 1}`} data-ra="ckl-fadeUpC" data-rd={c.rd} style={{ position: "absolute", left: c.left, top: 742, width: 380, transform: "translateX(-50%)", textAlign: "center", opacity: 0 }}>
              <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 19, letterSpacing: "1px", color: RED }}>{c.num}</div>
              <div style={{ marginTop: 18, fontFamily: SERIF, fontWeight: 400, fontSize: 31, lineHeight: 1, color: INK }}>{c.title}</div>
              <div style={{ marginTop: 18, fontFamily: BODY, fontSize: 19, lineHeight: "27px", color: "#57544f" }}>{c.desc[0]}<br />{c.desc[1]}</div>
            </div>
          ))}

          {/* Browse Scripts CTA */}
          <span className="ckl-steps-cta-line" data-ra="ckl-fadeUpC" data-rd="0.74" style={{ position: "absolute", left: "50%", top: 898, transform: "translateX(-50%)", width: 1, height: 40, background: "linear-gradient(to bottom, rgba(11,10,6,0), #c4c2bc)", opacity: 0 }} />
          <Link to={ROUTES.join} className="ckl-steps-cta-btn hov-btn" data-ra="ckl-fadeUpC" data-rd="0.8" style={{ position: "absolute", left: "50%", top: 954, transform: "translateX(-50%)", display: "flex", alignItems: "center", justifyContent: "center", width: 250, height: 70, background: "#161513", color: "#fff", fontFamily: SANS, fontWeight: 600, fontSize: 19, letterSpacing: "0.2px", textDecoration: "none", opacity: 0 }}>Browse Scripts</Link>

        </div>
      </section>

      {/* ===================== MARQUEE STRIP ===================== */}
      <section style={{ position: "relative", width: "100%", background: INK, padding: "34px 0", overflow: "hidden", borderTop: "1px solid #211f1a", borderBottom: "1px solid #211f1a" }}>
        <div style={{ display: "flex", width: "max-content", alignItems: "center", animation: "ckl-marquee 30s linear infinite", willChange: "transform" }}>
          {[0, 1].map((g) => (
            <div key={g} aria-hidden={g === 1 ? "true" : undefined} style={{ display: "flex", alignItems: "center", gap: 40, paddingRight: 40 }}>
              {MARQUEE.map((phrase) => (
                <span key={phrase} style={{ display: "flex", alignItems: "center", gap: 40 }}>
                  <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.7rem,2.9vw,2.5rem)", color: "#f3f1ea", whiteSpace: "nowrap" }}>{phrase}</span>
                  <Diamond size={9} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ===================== FEATURES SHOWCASE ===================== */}
      <section style={{ position: "relative", width: "100%", background: "#fff", padding: "clamp(80px,9vw,140px) clamp(20px,5vw,80px)" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div data-ra="ckl-fadeUp" style={{ maxWidth: 760, opacity: 0 }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, letterSpacing: "3px", color: "#9a978f", textTransform: "uppercase" }}>What you get</div>
            <h2 style={{ margin: "22px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(2.6rem,5.2vw,4.4rem)", lineHeight: 1.02, color: INK }}>
              Built for writers.<br /><span style={{ fontStyle: "italic", color: "#6f6c66" }}>Loved by producers.</span>
            </h2>
            <p style={{ margin: "26px 0 0", maxWidth: 540, fontFamily: BODY, fontSize: 20, lineHeight: "30px", color: "#57544f" }}>Seven tools that turn your script from a file on your laptop into a film people actually want to make.</p>
          </div>

          <div className="ckl-feat-grid" style={{ marginTop: "clamp(44px,5vw,72px)", display: "grid", gridTemplateColumns: "340px 1fr", gap: 28, alignItems: "start" }}>
            {/* Tab rail */}
            <div className="ckl-feat-tabs" data-ra="ckl-fadeUp" data-rd="0.05" style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0 }}>
              {FEATURES.map((f, i) => {
                const on = activeFeat === i;
                return (
                  <div key={f.num} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button type="button" onClick={() => setActiveFeat(on ? -1 : i)} className={on ? "" : "hov-tab"} style={{ display: "flex", alignItems: "center", gap: 14, padding: "17px 18px", border: `1px solid ${on ? "#0B0A06" : "#e4e2dc"}`, background: on ? "#0B0A06" : "#fff", borderRadius: 11, textAlign: "left", cursor: "pointer", transition: "border-color .25s ease,background .25s ease" }}>
                      <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13, letterSpacing: "1px", color: on ? RED : "#a8a59d", flex: "none" }}>{f.num}</span>
                      <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 17, color: on ? "#fff" : "#161513" }}>{f.tab}</span>
                      <Icon name={on ? "expand_less" : "expand_more"} size={24} color={on ? "#fff" : "#161513"} style={{ marginLeft: "auto" }} className="mobile-accordion-icon" />
                    </button>
                    {on && (
                      <div className="ckl-feat-detail-mobile" style={{ position: "relative", border: "1px solid #e7e5df", borderRadius: 16, background: "#fcfcfa", overflow: "hidden" }}>
                        {renderFeatDetail(f)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detail panel (Desktop) */}
            <div className="ckl-feat-detail-desktop" data-ra="ckl-fadeUp" data-rd="0.12" style={{ position: "relative", border: "1px solid #e7e5df", borderRadius: 16, background: "#fcfcfa", overflow: "hidden", opacity: 0 }}>
              {renderFeatDetail(FEATURES[activeFeat >= 0 ? activeFeat : 0])}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== EVERY FORMAT GALLERY ===================== */}
      <section style={{ position: "relative", width: "100%", background: "#FBFAF7", padding: "clamp(80px,9vw,140px) clamp(20px,5vw,80px)", borderTop: "1px solid #efece5" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div data-ra="ckl-fadeUp" style={{ textAlign: "center", maxWidth: 760, margin: "0 auto", opacity: 0 }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, letterSpacing: "3px", color: "#9a978f", textTransform: "uppercase" }}>Built for every story</div>
            <h2 style={{ margin: "22px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(2.6rem,5.2vw,4.4rem)", lineHeight: 1.02, color: INK }}>
              One platform.<br /><span style={{ fontStyle: "italic", color: "#6f6c66" }}>Every format.</span>
            </h2>
            <p style={{ margin: "26px auto 0", maxWidth: 520, fontFamily: BODY, fontSize: 20, lineHeight: "30px", color: "#57544f" }}>From features to anime, writers showcase their work across every screen and every genre.</p>
          </div>

          <div className="ckl-format-grid" style={{ marginTop: "clamp(46px,5vw,76px)", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 20 }}>
            {FORMATS.map((f) => (
              <Link key={f.title} to={ROUTES.join} data-ra="ckl-fadeUp" data-rd={f.rd} className="hov-format" style={{ position: "relative", display: "block", textDecoration: "none", borderRadius: 13, overflow: "hidden", aspectRatio: "3/4.4", marginTop: f.offset ? 34 : 0, opacity: 0 }}>
                <img src={`https://picsum.photos/seed/${f.seed}/600/880`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(11,10,6,0.82) 0%,rgba(11,10,6,0.08) 52%,rgba(11,10,6,0.18) 100%)" }} />
                <div style={{ position: "absolute", left: 18, right: 18, bottom: 18 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 25, color: "#fff", lineHeight: 1.05 }}>{f.title}</div>
                  <div style={{ marginTop: 5, fontFamily: SANS, fontSize: 12, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>{f.sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CINEMATIC AI TRAILER ===================== */}
      <section style={{ position: "relative", width: "100%", minHeight: 660, background: INK, overflow: "hidden", display: "flex", alignItems: "center" }}>
        <img src="https://picsum.photos/seed/ckript-cinema/1920/1100?grayscale" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.42 }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 50%,rgba(11,10,6,0.35),rgba(11,10,6,0.92))" }} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 1100, margin: "0 auto", padding: "clamp(70px,8vw,120px) clamp(24px,5vw,60px)", textAlign: "center" }}>
          <div data-ra="ckl-fadeUp" style={{ display: "inline-flex", alignItems: "center", gap: 11, opacity: 0 }}>
            <Diamond size={8} />
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, letterSpacing: "3px", textTransform: "uppercase", color: "#bdb9b0" }}>Text-to-Trailer AI</span>
          </div>
          <h2 data-ra="ckl-fadeUp" data-rd="0.08" style={{ margin: "26px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(2.8rem,6vw,5.2rem)", lineHeight: 1.02, color: "#fff", opacity: 0 }}>
            Your script,<br /><span style={{ fontStyle: "italic", color: "#e3ddd2" }}>rendered in 30 seconds.</span>
          </h2>
          <p data-ra="ckl-fadeUp" data-rd="0.16" style={{ margin: "28px auto 0", maxWidth: 580, fontFamily: BODY, fontSize: 21, lineHeight: "31px", color: "#c7c2b8", opacity: 0 }}>
            Upload your pages and watch Ckript blend stock footage with AI-generated visuals into a cinematic teaser — the fastest way to make a producer feel your story.
          </p>
          <div data-ra="ckl-fadeUp" data-rd="0.24" style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap", opacity: 0 }}>
            <Link to={ROUTES.join} className="hov-lift3" style={{ display: "inline-flex", alignItems: "center", gap: 14, height: 70, padding: "0 28px 0 22px", background: "#fff", color: INK, textDecoration: "none", borderRadius: 100 }}>
              <span style={{ width: 42, height: 42, borderRadius: "50%", background: RED, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <Icon name="play_arrow" fill size={22} color="#fff" />
              </span>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 18 }}>Watch a sample trailer</span>
            </Link>
            <Link to={ROUTES.writer} className="hov-bc-red" style={{ fontFamily: SANS, fontWeight: 600, fontSize: 18, color: "#fff", textDecoration: "none", borderBottom: "2px solid rgba(255,255,255,0.5)", paddingBottom: 6, transition: "border-color .22s ease" }}>Start with your script</Link>
          </div>
        </div>
      </section>

      {/* ===================== THE PROBLEM (SPLIT) ===================== */}
      <section style={{ position: "relative", width: "100%", background: "#fff", padding: "clamp(80px,9vw,140px) clamp(20px,5vw,80px)" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div data-ra="ckl-fadeUp" style={{ maxWidth: 820, opacity: 0 }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, letterSpacing: "3px", color: "#9a978f", textTransform: "uppercase" }}>The problem</div>
            <h2 style={{ margin: "22px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(2.6rem,5.2vw,4.4rem)", lineHeight: 1.02, color: INK }}>
              The industry is <span style={{ fontStyle: "italic", color: RED }}>broken</span><br />on both sides of the page.
            </h2>
          </div>

          <div className="ckl-problem-grid" style={{ marginTop: "clamp(44px,5vw,68px)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {[
              { rd: "0.05", to: ROUTES.writer, kicker: "If you're a writer", title: ["Brilliant pages,", "no audience."], rows: ["Your script sits in a drawer or an inbox nobody opens.", 'Gatekeepers say "pass" without reading past page three.', "No real way to reach professionals who'd actually fund you."], cta: "Start as a writer" },
              { rd: "0.12", to: ROUTES.pro, kicker: "If you're in the industry", title: ["Too much noise,", "too little signal."], rows: ["Thousands of unfiltered submissions, no way to find the gems.", "No preview of tone or vision before reading 110 pages.", "Discovery is slow, expensive, and built on who-you-know."], cta: "Start as a professional" },
            ].map((card) => (
              <div key={card.kicker} data-ra="ckl-fadeUp" data-rd={card.rd} style={{ border: "1px solid #e7e5df", borderRadius: 16, background: "#fcfcfa", padding: "clamp(32px,3.2vw,48px)", opacity: 0 }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: "2px", textTransform: "uppercase", color: "#9a978f" }}>{card.kicker}</div>
                <h3 style={{ margin: "16px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(1.9rem,3.2vw,2.6rem)", lineHeight: 1.05, color: INK }}>
                  {card.title[0]}<br /><span style={{ fontStyle: "italic", color: "#8d8a84" }}>{card.title[1]}</span>
                </h3>
                <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                  {card.rows.map((r) => (
                    <div key={r} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <Icon name="arrow_forward" size={18} color={RED} style={{ flex: "none", marginTop: 4 }} />
                      <span style={{ fontFamily: BODY, fontSize: 18, lineHeight: "27px", color: "#57544f" }}>{r}</span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => openOnboarding(card.to === ROUTES.writer ? "writer" : "producer")} className="hov-underline" style={{ marginTop: 32, display: "inline-flex", alignItems: "center", gap: 8, fontFamily: SANS, fontWeight: 700, fontSize: 17, color: INK, textDecoration: "none", borderBottom: "2px solid #0B0A06", paddingBottom: 6, background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer", transition: "color .22s ease,border-color .22s ease" }}>
                  {card.cta}<Icon name="arrow_forward" size={17} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== TESTIMONIALS ===================== */}
      <section style={{ position: "relative", width: "100%", background: "#FBFAF7", padding: "clamp(80px,9vw,140px) clamp(20px,5vw,80px)", borderTop: "1px solid #efece5" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div data-ra="ckl-fadeUp" style={{ maxWidth: 760, opacity: 0 }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14, letterSpacing: "3px", color: "#9a978f", textTransform: "uppercase" }}>Testimonials</div>
            <h2 style={{ margin: "22px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(2.6rem,5.2vw,4.4rem)", lineHeight: 1.02, color: INK }}>
              From the people<br /><span style={{ fontStyle: "italic", color: "#6f6c66" }}>who build films.</span>
            </h2>
          </div>

          <div className="ckl-testi-grid" style={{ marginTop: "clamp(44px,5vw,68px)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} data-ra="ckl-fadeUp" data-rd={t.rd} style={{ position: "relative", border: "1px solid #e7e5df", borderRadius: 16, background: "#fff", padding: "clamp(30px,3vw,44px)", opacity: 0 }}>
                <div style={{ fontFamily: SERIF, fontSize: 60, lineHeight: 0.4, color: "#e0bcb3", height: 32 }}>&ldquo;</div>
                <p style={{ margin: 0, fontFamily: SERIF, fontSize: "clamp(1.4rem,2.1vw,1.85rem)", lineHeight: 1.32, color: "#1a1815" }}>{t.quote}</p>
                <p style={{ margin: "22px 0 0", fontFamily: BODY, fontSize: 17, lineHeight: "26px", color: "#6f6c66" }}>{t.body}</p>
                <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid #ece9e2", display: "flex", alignItems: "center", gap: 16 }}>
                  <img src={`https://picsum.photos/seed/${t.seed}/120/120?grayscale`} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: INK }}>{t.name}</div>
                    <div style={{ fontFamily: SANS, fontSize: 14, color: "#8d8a84" }}>{t.role}</div>
                  </div>
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", color: RED, border: "1px solid #ecc9c1", padding: "5px 11px", borderRadius: 100, flex: "none" }}>{t.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section style={{ position: "relative", width: "100%", background: "#fff", padding: "clamp(90px,11vw,170px) clamp(20px,5vw,80px)", textAlign: "center", overflow: "hidden" }}>
        <span data-ra="ckl-fadeUp" style={{ display: "inline-block", width: 1, height: 64, background: "linear-gradient(to bottom,rgba(11,10,6,0),#c4c2bc)", opacity: 0 }} />
        <div data-ra="ckl-fadeUp" data-rd="0.06" style={{ opacity: 0 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, background: RED, transform: "rotate(45deg)", margin: "18px 0 4px" }} />
        </div>
        <h2 data-ra="ckl-fadeUp" data-rd="0.1" style={{ margin: "18px auto 0", maxWidth: 1000, fontFamily: SERIF, fontWeight: 400, fontSize: "clamp(3rem,7vw,6rem)", lineHeight: 1.0, color: INK, opacity: 0 }}>
          Your story deserves<br /><span style={{ fontStyle: "italic" }}>an audience.</span>
        </h2>
        <p data-ra="ckl-fadeUp" data-rd="0.18" style={{ margin: "30px auto 0", maxWidth: 540, fontFamily: BODY, fontSize: 21, lineHeight: "31px", color: "#57544f", opacity: 0 }}>
          Upload your script, shape a trailer, and put your work in front of the producers, directors, and investors who can make it real.
        </p>
        <div data-ra="ckl-fadeUp" data-rd="0.26" style={{ marginTop: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 48, flexWrap: "wrap", opacity: 0 }}>
          <Link to={ROUTES.writer} className="hov-btn-lift" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 262, height: 72, background: "#161513", color: "#fff", fontFamily: SANS, fontWeight: 600, fontSize: 19, textDecoration: "none", transition: "transform .25s cubic-bezier(.2,.7,.2,1),background .25s ease" }}>Start with your script</Link>
          <Link to={ROUTES.join} className="hov-underline" style={{ fontFamily: SANS, fontWeight: 700, fontSize: 19, color: INK, textDecoration: "none", borderBottom: "2px solid #0B0A06", paddingBottom: 7, transition: "color .22s ease,border-color .22s ease" }}>Browse scripts</Link>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer style={{ position: "relative", width: "100%", background: INK, padding: "clamp(56px,6vw,84px) clamp(20px,5vw,80px) 40px" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40, flexWrap: "wrap", paddingBottom: 42, borderBottom: "1px solid #211f1a" }}>
            <div style={{ maxWidth: 380 }}>
              <img src="/ckript_logo_no_bg.png" alt="Ckript" style={{ height: 44, width: "auto", display: "block" }} />
              <p style={{ margin: "20px 0 0", fontFamily: SERIF, fontStyle: "italic", fontSize: 23, lineHeight: 1.3, color: "#c7c2b8" }}>From the page to the screen.</p>
              <div style={{ marginTop: 36 }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "#76726a", marginBottom: 12 }}>Ckript Headquarters</div>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <Icon name="location_on" size={20} color="#76726a" style={{ flex: "none", marginTop: 2 }} />
                  <p style={{ margin: 0, fontFamily: SANS, fontSize: 15, lineHeight: 1.6, color: "#cfccc5" }}>
                    SUIT-D, 400-A, 4th Floor,<br />
                    12 Ajit Singh House, Yusuf Sarai Commercial Complex,<br />
                    New Delhi 110016, India<br />
                    <span style={{ color: "#9a978f", fontSize: 14 }}>Near Green Park Metro Station Exit-2</span>
                  </p>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "clamp(40px,6vw,96px)", flexWrap: "wrap" }}>
              {FOOTER_COLS.map((col) => (
                <div key={col.head} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", color: "#76726a", marginBottom: 4 }}>{col.head}</div>
                  {col.links.map((l) =>
                    l.action ? (
                      <button key={l.label} type="button" onClick={() => { if (l.action === "pricing") openPricingModal(); else if (l.action === "about") openAboutModal(); else openOnboarding(l.action); }} className="hov-red" style={{ fontFamily: SANS, fontSize: 17, color: "#cfccc5", textDecoration: "none", background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}>{l.label}</button>
                    ) : l.external ? (
                      <a key={l.label} href={l.to} target="_blank" rel="noopener noreferrer" className="hov-red" style={{ fontFamily: SANS, fontSize: 17, color: "#cfccc5", textDecoration: "none" }}>{l.label}</a>
                    ) : (
                      <Link key={l.label} to={l.to} className="hov-red" style={{ fontFamily: SANS, fontSize: 17, color: "#cfccc5", textDecoration: "none" }}>{l.label}</Link>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
          <div style={{ paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <span style={{ fontFamily: SANS, fontSize: 14, color: "#76726a" }}>© 2026 Ckript. All rights reserved.</span>
            <span style={{ fontFamily: SANS, fontSize: 14, color: "#76726a" }}>Made for storytellers.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
