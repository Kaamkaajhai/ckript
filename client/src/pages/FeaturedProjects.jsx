import { useState, useEffect, useRef, useCallback, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";
import { AuthContext } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { isFilmIndustryProfessionalRole, hasBusinessEmail, hasActiveFilmIndustryProfessionalAccess } from "../utils/industryAccess";
import ProjectCard from "../components/ProjectCard";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { getScriptCanonicalPath } from "../utils/scriptPath";

const resolveTrailerCandidates = (script) => {
  const aiTrailerUrl = script?.trailerUrl || "";
  const uploadedTrailerUrl = script?.uploadedTrailerUrl || "";

  let ordered = [];
  if (script?.trailerSource === "ai") ordered = [aiTrailerUrl, uploadedTrailerUrl];
  else if (script?.trailerSource === "uploaded") ordered = [uploadedTrailerUrl, aiTrailerUrl];
  else ordered = [aiTrailerUrl, uploadedTrailerUrl];

  const uniqueSources = [...new Set(ordered.filter(Boolean))];
  return uniqueSources.map((url) => resolveMediaUrl(url)).filter(Boolean);
};

const resolveTrailerUrl = (script) => {
  const sources = resolveTrailerCandidates(script);
  return sources[0] || "";
};

/* ── Icons ─────────────────────────────────────────── */
const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const TrendingIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg className="w-4 h-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ChevronLeft = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRight = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

/* ── Filter Options ────────────────────────────────── */
const GENRES = [
  "Thriller", "Drama", "Comedy", "Sci-Fi", "Horror", "Romance",
  "Action", "Mystery", "Fantasy", "Animation", "Crime", "Adventure",
];

const CONTENT_TYPES = [
  { key: "movie", label: "Movie" },
  { key: "tv_series", label: "TV Series" },
  { key: "short_film", label: "Short Film" },
  { key: "web_series", label: "Web Series" },
  { key: "documentary", label: "Documentary" },
  { key: "micro_drama", label: "Micro Drama" },
  { key: "anime", label: "Anime" },
  { key: "book", label: "Book" },
  { key: "startup", label: "Startup" },
  { key: "songs", label: "Songs" },
  { key: "standup_comedy", label: "Standup Comedy" },
  { key: "dialogues", label: "Dialogues" },
  { key: "poet", label: "Poet" },
];

const BUDGETS = [
  { key: "micro", label: "Micro" },
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "blockbuster", label: "Blockbuster" },
];

const SORT_OPTIONS = [
  { key: "engagement", label: "Trending", icon: "flame" },
  { key: "price_high", label: "Highest Paid", icon: "dollar" },
  { key: "views", label: "Most Viewed", icon: "eye" },
  { key: "score", label: "Top Rated", icon: "star" },
  { key: "createdAt", label: "Newest", icon: "clock" },
  { key: "price_low", label: "Price: Low → High", icon: "arrowUp" },
];

const PREMIUM_OPTIONS = [
  { key: "all", label: "All" },
  { key: "free", label: "Free Only" },
  { key: "premium", label: "Premium Only" },
];

const budgetLabel = {
  micro: "Micro", low: "Low", medium: "Medium", high: "High", blockbuster: "Blockbuster",
};

/*  Icons  */
const FilterIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
  </svg>
);

const ChevronDown = ({ open }) => (
  <svg className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const XIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ── Trailer Preview Modal ─────────────────────────── */
const AIDemo = ({ script, getImageUrl }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0); // 0=idle, 1=title, 2=genre, 3=logline, 4=hook, 5=cta
  const intervalRef = useRef(null);
  const utterRef = useRef(null);
  const DURATION = 30; // seconds

  const phrases = [
    script.title,
    script.genre ? `A ${script.genre} story` : null,
    script.logline || script.synopsis || script.description || null,
    script.pageCount ? `${script.pageCount} pages of gripping storytelling.` : "A compelling script ready for production.",
    "Available now on Ckript. Read it today.",
  ].filter(Boolean);

  const startDemo = () => {
    if (playing) return;
    setPlaying(true);
    setProgress(0);
    setPhase(1);

    // Text-to-speech
    if ("speechSynthesis" in window) {
      const fullText = phrases.join(". ");
      const utter = new SpeechSynthesisUtterance(fullText);
      utter.rate = 0.92;
      utter.pitch = 1.05;
      utter.volume = 1;
      // Pick a good voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes("Google") && v.lang === "en-US")
        || voices.find(v => v.lang === "en-US")
        || voices[0];
      if (preferred) utter.voice = preferred;
      utter.onend = () => { stopDemo(); };
      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    }

    // Progress bar + phase transitions
    let elapsed = 0;
    intervalRef.current = setInterval(() => {
      elapsed += 0.1;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      // Advance visual phases
      if (elapsed < 4) setPhase(1);
      else if (elapsed < 9) setPhase(2);
      else if (elapsed < 20) setPhase(3);
      else if (elapsed < 27) setPhase(4);
      else setPhase(5);
      if (elapsed >= DURATION) stopDemo();
    }, 100);
  };

  const stopDemo = () => {
    setPlaying(false);
    setProgress(0);
    setPhase(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (utterRef.current) window.speechSynthesis?.cancel();
  };

  useEffect(() => () => { stopDemo(); }, []);

  const phaseContent = [
    null,
    { label: "TITLE", text: script.title, size: "text-3xl font-black" },
    { label: "GENRE", text: (script.genre || "") + (script.contentType ? ` · ${script.contentType.replace(/_/g, " ")}` : ""), size: "text-xl font-bold" },
    { label: "STORY", text: script.logline || script.synopsis || script.description || "A story waiting to be told.", size: "text-base font-medium leading-relaxed" },
    { label: "DETAILS", text: script.pageCount ? `${script.pageCount} pages · ${script.premium ? `$${script.price}` : "Free to read"}` : (script.premium ? `$${script.price}` : "Free to read"), size: "text-lg font-semibold" },
    { label: "AVAILABLE ON", text: "Ckript", size: "text-2xl font-black tracking-widest" },
  ];

  const current = phaseContent[phase];

  return (
    <div className="aspect-video bg-gradient-to-br from-[#0a0f1e] via-[#0f1c30] to-[#091628] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient background image */}
      {script.coverImage && (
        <img src={getImageUrl(script.coverImage)} alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-10 blur-xl scale-110" />
      )}
      {/* Animated rings */}
      {playing && (
        <>
          <div className="absolute w-72 h-72 rounded-full border border-white/5 animate-ping" style={{ animationDuration: "3s" }} />
          <div className="absolute w-48 h-48 rounded-full border border-white/[0.07] animate-ping" style={{ animationDuration: "2s" }} />
        </>
      )}

      {!playing ? (
        /* ── Idle state ── */
        <div className="flex flex-col items-center gap-5 z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-7 h-7 text-white/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base mb-1">{script.title}</p>
            <p className="text-white/40 text-xs mb-4">No trailer uploaded · AI demo available</p>
          </div>
          <button onClick={startDemo}
            className="flex items-center gap-2.5 px-6 py-3 bg-white text-gray-900 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all active:scale-95 shadow-xl shadow-black/40">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            Play 30s AI Demo
          </button>
          <span className="text-white/20 text-[11px]">Uses text-to-speech · no upload needed</span>
        </div>
      ) : (
        /* ── Playing state ── */
        <div className="flex flex-col items-center gap-6 z-10 px-10 text-center w-full">
          {current && (
            <motion.div key={phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{current.label}</span>
              <p className={`text-white ${current.size} max-w-lg`}>{current.text}</p>
            </motion.div>
          )}
          {/* Soundwave animation */}
          <div className="flex items-center gap-1 h-8">
            {[...Array(18)].map((_, i) => (
              <motion.div key={i}
                className="w-1 rounded-full bg-white/60"
                animate={{ height: [8, Math.random() * 24 + 8, 8] }}
                transition={{ duration: 0.4 + (i % 5) * 0.08, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>
          <button onClick={stopDemo}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl text-xs font-semibold transition-colors border border-white/10">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
            Stop
          </button>
        </div>
      )}

      {/* Progress bar */}
      {playing && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <motion.div className="h-full bg-white/70 rounded-full"
            style={{ width: `${progress}%` }} transition={{ duration: 0.1 }} />
        </div>
      )}
    </div>
  );
};

const TrailerModal = ({ script, onClose, getImageUrl, onBlock }) => {
  const videoRef = useRef(null);
  const trailerCandidates = resolveTrailerCandidates(script);
  const [trailerSourceIndex, setTrailerSourceIndex] = useState(0);
  const [trailerError, setTrailerError] = useState(false);
  const trailerPlaybackUrl =
    trailerCandidates[Math.min(trailerSourceIndex, Math.max(trailerCandidates.length - 1, 0))] || "";

  const handleTrailerError = () => {
    if (trailerSourceIndex < trailerCandidates.length - 1) {
      setTrailerSourceIndex((prev) => prev + 1);
      setTrailerError(false);
      return;
    }
    setTrailerError(true);
  };

  useEffect(() => {
    setTrailerSourceIndex(0);
    setTrailerError(false);
  }, [script?._id, script?.trailerUrl, script?.uploadedTrailerUrl, script?.trailerSource]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative w-full max-w-3xl max-h-[88vh] rounded-2xl overflow-hidden bg-[#050b16] shadow-2xl border border-white/20 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#081426]">
            <p className="text-sm font-semibold text-white/90">Trailer Preview</p>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg border border-white/25 bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/90 hover:bg-white/20 transition-colors"
              aria-label="Close trailer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Video or AI Demo */}
          {trailerPlaybackUrl && !trailerError ? (
            <div className="p-3 overflow-auto bg-[#020812]">
              <video
                key={trailerPlaybackUrl}
                ref={videoRef}
                src={trailerPlaybackUrl}
                controls
                controlsList="nodownload"
                autoPlay
                playsInline
                preload="metadata"
                onError={handleTrailerError}
                className="w-full max-h-[calc(88vh-190px)] object-contain rounded-xl border border-white/10 bg-black"
                poster={script.coverImage ? getImageUrl(script.coverImage) : undefined}
              />
            </div>
          ) : (
            <AIDemo script={script} getImageUrl={getImageUrl} />
          )}

          {/* Info bar */}
          <div className="bg-[#0a1628] px-5 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-white font-bold text-sm line-clamp-1">{script.title}</p>
              <p className="text-white/40 text-xs">{script.genre} {script.contentType ? `· ${script.contentType.replace(/_/g, " ")}` : ""}</p>
            </div>
            <Link
              to={getScriptCanonicalPath(script)}
              onClick={(e) => { if (onBlock) { e.preventDefault(); onClose(); onBlock(); return; } onClose(); }}
              className="flex-shrink-0 px-4 py-1.5 bg-[#111111] hover:bg-[#2a5080] text-white text-xs font-bold rounded-xl transition-colors"
            >
              View Project
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ── Featured Carousel ─────────────────────────────── */
const FeaturedCarousel = ({ scripts, dark, getImageUrl, onWatchPreview }) => {
  const SLIDES = scripts;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const timerRef = useRef(null);

  const goTo = useCallback((idx, dir = 1) => {
    setDirection(dir);
    setCurrent((idx + SLIDES.length) % SLIDES.length);
  }, [SLIDES.length]);

  const next = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [paused, next]);

  const script = SLIDES[current];
  const trailerPlaybackUrl = resolveTrailerUrl(script);
  const resolveImg = (url) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? "6%" : "-6%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? "-6%" : "6%", opacity: 0 }),
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden mb-8 shadow-lg border ${dark ? "border-[#1a3050] bg-[#080f1e]" : "border-gray-100 bg-gray-50"}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide area */}
      <div className="relative h-[360px] sm:h-[420px] overflow-hidden">
        <AnimatePresence custom={direction} mode="popLayout">
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0"
          >
            {/* Background cover image */}
            {script.coverImage ? (
              <img
                src={resolveImg(script.coverImage)}
                alt={script.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#0a1628] via-[#0f2d52] to-[#1e4a7a]" />
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {(script.premium || script.isFeatured) && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-white bg-[#1e3a5f] border border-blue-400/50 px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Sponsored
                  </span>
                )}
                {script.verifiedBadge && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-white bg-blue-600/90 border border-blue-300/60 px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                    Verified
                  </span>
                )}
                {!(script.premium || script.isFeatured) && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-white bg-gray-700 border border-gray-600 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                    Trending
                  </span>
                )}
                <span className="text-[10px] font-black text-white bg-[#111111] px-2.5 py-1 rounded-lg uppercase tracking-widest">
                  #{current + 1} Featured
                </span>
                {script.genre && (
                  <span className="text-[10px] font-bold text-white/80 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                    {script.genre}
                  </span>
                )}
                {script.contentType && (
                  <span className="text-[10px] font-bold text-white/80 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 capitalize">
                    {script.contentType.replace(/_/g, " ")}
                  </span>
                )}
                {script.premium ? (
                  <span className="text-[10px] font-black text-white bg-gray-800 px-2.5 py-1 rounded-lg">${script.price}</span>
                ) : (
                  <span className="text-[10px] font-black text-white bg-emerald-500/80 px-2.5 py-1 rounded-lg">Free</span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight mb-2 drop-shadow-lg max-w-xl line-clamp-2">
                {script.title}
              </h2>

              {/* Description */}
              <p className="text-sm text-white/60 leading-relaxed line-clamp-2 max-w-lg mb-5 hidden sm:block">
                {script.logline || script.description || script.synopsis || ""}
              </p>

              {/* Action buttons + creator */}
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  to={getScriptCanonicalPath(script)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#111111] rounded-xl text-sm font-bold hover:bg-white/90 transition-colors shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  View Project
                </Link>
                {trailerPlaybackUrl && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onWatchPreview(script); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5.14v14l11-7-11-7z" />
                    </svg>
                    Watch Trailer
                  </button>
                )}

                {/* Creator */}
                <div className="hidden sm:flex items-center gap-2 ml-auto">
                  <div className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {script.creator?.profileImage ? (
                      <img src={resolveImg(script.creator.profileImage)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-white">{script.creator?.name?.charAt(0)?.toUpperCase() || "?"}</span>
                    )}
                  </div>
                  <span className="text-xs text-white/70 font-medium">{script.creator?.name || "Unknown"}</span>
                  {script.scriptScore?.overall > 0 && (
                    <div className="flex items-center gap-1 ml-1 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-lg">
                      <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[11px] font-bold text-amber-300">{script.scriptScore.overall}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Arrow nav */}
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:text-white transition-all duration-200 hover:scale-110 z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:text-white transition-all duration-200 hover:scale-110 z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Pause indicator */}
        {paused && (
          <div className="absolute top-4 right-16 flex items-center gap-1.5 px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
            <span className="w-2 h-2 rounded-full bg-white/60" />
            <span className="text-[10px] text-white/50 font-medium">paused</span>
          </div>
        )}
      </div>

    </div>
  );
};

/* ── Card Save Button ───────────────────────────────── */
const CardSaveBtn = ({ scriptId, dark }) => {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const handle = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (loading || saved) return;
    setLoading(true);
    try { await api.post("/users/watchlist/add", { scriptId }); setSaved(true); }
    catch { setSaved(true); }
    setLoading(false);
  };
  return (
    <button
      onClick={handle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 ${
        saved
          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
          : "bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm"
      }`}
    >
      {loading
        ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : saved
          ? <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          : <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
      }
      {saved ? "Saved" : "Save"}
    </button>
  );
};

/* ══════════════════════════════════════════════════════════════ */
/* ── CARD COMPONENTS ── */
/* ══════════════════════════════════════════════════════════════ */

const SponsoredCard = ({ script, onBlock }) => (
  <ProjectCard
    project={{ ...script, status: script?.status || "published" }}
    userName={script?.creator?.name}
    onBlock={onBlock}
  />
);

// Trending Card (Horizontal Scroll)
const TrendingCard = ({ script, getImageUrl, dark }) => (
  <Link to={getScriptCanonicalPath(script)}>
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className={`group relative overflow-hidden rounded-2xl w-[360px] flex-shrink-0 border transition-all duration-400 ${
        dark ? "bg-[#0a1628] border-[#1a3050] hover:border-blue-400/30 hover:shadow-xl hover:shadow-blue-500/10" : "bg-white border-gray-200/60 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50"
      }`}
    >
      <div className="relative h-[240px] overflow-hidden">
        {script.coverImage ? (
          <img
            src={getImageUrl(script.coverImage)}
            alt={script.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#091a2f] via-[#0f2d52] to-[#1a4a7a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        
        {/* Trending Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg">
          <TrendingIcon />
          <span className="text-white text-[10px] font-black tracking-[0.1em]">TRENDING</span>
        </div>

        {/* Genre tag */}
        {script.genre && (
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/10 border border-white/15 rounded-xl backdrop-blur-xl">
            <span className="text-white text-[11px] font-semibold">{script.genre}</span>
          </div>
        )}

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-black text-[17px] line-clamp-2 mb-2 leading-snug tracking-tight">
            {script.title}
          </h3>
          <div className="flex items-center gap-3">
            {script.rating && (
              <div className="flex items-center gap-1">
                <StarIcon filled />
                <span className="text-white text-[13px] font-bold">{script.rating.toFixed(1)}</span>
              </div>
            )}
            {script.views && (
              <div className="flex items-center gap-1">
                <EyeIcon />
                <span className="text-white/80 text-[12px] font-medium">{script.views.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom info */}
      <div className="px-4 py-3.5 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          {script.logline && (
            <p className={`text-[12px] line-clamp-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>{script.logline}</p>
          )}
        </div>
        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors ml-2 ${
          dark ? "bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25" : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
        }`}>View →</span>
      </div>
    </motion.div>
  </Link>
);

// Horizontal Scroll Container
const HorizontalScroll = ({ children }) => (
  <div className="relative">
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
      {children}
    </div>
    <style>{`
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
  </div>
);


const FeaturedProjects = () => {
  const { isDarkMode: dark } = useDarkMode();
  const { user } = useContext(AuthContext);
  const { openPricingModal } = useAuthModal();
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isPersonalEmailBlocked =
    isFilmIndustryProfessionalRole(user) &&
    !hasBusinessEmail(user?.email) &&
    !hasActiveFilmIndustryProfessionalAccess(user);

  const handleScriptBlock = () => setShowUpgradeModal(true);

  // Data states
  const [scripts, setScripts] = useState([]);
  const [heroScript, setHeroScript] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroDirection, setHeroDirection] = useState(1);
  const [sponsoredScripts, setSponsoredScripts] = useState([]);
  const [trendingPromotions, setTrendingPromotions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [previewScript, setPreviewScript] = useState(null);  // trailer modal

  /* Filter state */
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedContentType, setSelectedContentType] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("");
  const [selectedSort, setSelectedSort] = useState("engagement");
  const [selectedPremium, setSelectedPremium] = useState("all");
  const [hoveredCard, setHoveredCard] = useState(null);

  const filterRef = useRef(null);

  // Auto-play hero carousel
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setHeroDirection(1);
      setHeroIndex(i => (i + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const heroSlideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
  };

  const activeFilterCount = [
    selectedGenre,
    selectedContentType,
    selectedBudget,
    selectedPremium !== "all" ? selectedPremium : "",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedGenre("");
    setSelectedContentType("");
    setSelectedBudget("");
    setSelectedSort("engagement");
    setSelectedPremium("all");
  };

  useEffect(() => {
    fetchFeatured();
  }, [selectedSort, selectedGenre, selectedContentType, selectedBudget, selectedPremium]);

  const fetchFeatured = async () => {
    setLoading(true);
    try {
      const [featuredRes, trendingRes] = await Promise.all([
        api.get("/scripts/featured"),
        api.get("/scripts?sort=views&limit=12")
      ]);

      let allScripts = featuredRes.data || [];
      const trendingData = trendingRes.data || [];

      // Separate sponsored/premium scripts
      const sponsored = allScripts.filter(s => s.premium || s.isFeatured);
      const regular = allScripts.filter(s => !s.premium && !s.isFeatured);

      // Set hero (top sponsored or first featured)
      setHeroScript(sponsored[0] || allScripts[0] || null);
      setHeroSlides(sponsored.length > 0 ? sponsored : allScripts);

      // Sponsored section (exclude hero)
      setSponsoredScripts(sponsored.slice(1, 7));

      // Trending promotions (high engagement)
      const trending = trendingData
        .filter(s => s.premium || s.isFeatured || (s.views && s.views > 500))
        .slice(0, 8);
      setTrendingPromotions(trending);

      setScripts(allScripts);
      const params = new URLSearchParams();
      params.append("sort", selectedSort);
      if (selectedGenre) params.append("genre", selectedGenre);
      if (selectedContentType) params.append("contentType", selectedContentType);
      if (selectedBudget) params.append("budget", selectedBudget);
      if (selectedPremium === "premium") params.append("premium", "true");
      else if (selectedPremium === "free") params.append("premium", "false");

      const { data } = await api.get(`/scripts?${params.toString()}`);
      const raw = Array.isArray(data) ? data : [];

      /*  Client-side sort guarantee  */
      const sorted = [...raw].sort((a, b) => {
        if (selectedSort === "views") return (b.views || 0) - (a.views || 0);
        if (selectedSort === "score") return (b.scriptScore?.overall || 0) - (a.scriptScore?.overall || 0);
        if (selectedSort === "price_high") return (Number(b.price) || 0) - (Number(a.price) || 0);
        if (selectedSort === "price_low") return (Number(a.price) || 0) - (Number(b.price) || 0);
        if (selectedSort === "createdAt") return new Date(b.createdAt) - new Date(a.createdAt);
        /* engagement / trending default */
        const engA = a.engagementScore || a.views || 0;
        const engB = b.engagementScore || b.views || 0;
        return engB - engA;
      });

      setScripts(sorted.slice(0, 24));
    } catch {
      setScripts([]);
    }
    setLoading(false);
  };

  const getImageUrl = (url) => {
    return resolveMediaUrl(url) || null;
  };

  const rankBadge = (index) => {
    if (index === 0) return { bg: "bg-[#111111]", text: "text-white", label: "#1" };
    if (index === 1) return { bg: "bg-gray-300", text: "text-gray-800", label: "#2" };
    if (index === 2) return { bg: "bg-gray-400", text: "text-white", label: "#3" };
    return null;
  };

  const getFeaturedMetric = (script) => {
    if (selectedSort === "score") {
      const value = script.scriptScore?.overall || 0;
      return { value, pct: Math.min(value, 100) };
    }
    if (selectedSort === "views") {
      const value = script.views || 0;
      return { value: value.toLocaleString(), pct: Math.min((value / 1000) * 100, 100) };
    }
    if (selectedSort === "price_high" || selectedSort === "price_low") {
      const value = Number(script.price || 0);
      return { value: `$${value}`, pct: Math.min((value / 500) * 100, 100) };
    }
    const value = script.engagementScore || script.views || 0;
    return { value: Math.round(value), pct: Math.min(Math.round(value), 100) };
  };

  const getRankValue = (script) => getFeaturedMetric(script).value;

  const getRankBarPct = (script) => {
    const { pct } = getFeaturedMetric(script);
    return Math.max(0, Math.min(100, Number(pct) || 0));
  };

  const ease = [0.25, 0.46, 0.45, 0.94];

  /*  Pill Button Helper  */
  const Pill = ({ active, onClick, children, variant = "default" }) => {
    const base = "px-4 py-[8px] rounded-xl text-[12px] font-semibold transition-all duration-250 whitespace-nowrap border cursor-pointer select-none";
    const styles = active
      ? dark
        ? "bg-white text-gray-900 border-white shadow-md shadow-white/10"
        : "bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/15"
      : dark
        ? "bg-white/[0.04] text-gray-300 border-white/[0.08] hover:border-white/15 hover:bg-white/[0.07] hover:text-gray-200"
        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50";
    return (
      <button onClick={onClick} className={`${base} ${styles}`}>
        {children}
      </button>
    );
  };

  /*  Filter Section Header  */
  const FilterSection = ({ label, children }) => (
    <div className="space-y-2.5">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">{label}</h4>
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Premium Header with Promote CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="px-1 sm:px-0 py-2 mb-8"
      >
        <div className="flex items-start justify-between gap-6 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className={`relative w-10 h-10 rounded-xl border flex items-center justify-center ${
                dark
                  ? "bg-[#08203a]/78 border-[#6e98c3]/40"
                  : "bg-white/82 border-[#c5d8ee]"
              }`}>
                <svg className={`w-4 h-4 ${dark ? "text-white/80" : "text-[#24486d]"}`} fill="none" stroke="currentColor" strokeWidth={1.9} viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="16" rx="3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 15l3-3 2.6 2.6L15.5 11 18 13.5" />
                  <circle cx="16.5" cy="8.5" r="1.4" fill="currentColor" stroke="none" />
                </svg>
                <div className={`absolute -inset-1.5 rounded-2xl border pointer-events-none ${dark ? "border-white/10" : "border-[#315f8f]/20"}`} />
              </div>
              <div>
                <h1 className={`text-[30px] sm:text-[34px] leading-none font-bold tracking-[-0.02em] ${dark ? "text-white" : "text-[#0f2745]"}`}>
                    Featured Projects
                  </h1>
                <p className={`text-[14px] font-normal leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>
                  Spotlight your scripts. Reach investors faster.
                </p>
              </div>
            </div>
          </div>

        </div>
      </motion.div>

      {/* ══ FEATURED CAROUSEL ══ */}
      {heroSlides.length > 0 && (() => {
        const slide = heroSlides[heroIndex];
        const useLightFallbackText = !dark && !slide.coverImage;
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
            className="mb-8"
          >
            <div className={`relative overflow-hidden rounded-2xl h-[330px] sm:h-[380px] lg:h-[420px] group border ${dark ? "border-[#23324a] bg-[#0f1726]" : "border-[#d9e4f2] bg-[#f4f8ff]"}`}>
              {/* Slides */}
              <AnimatePresence custom={heroDirection} mode="wait">
                <motion.div
                  key={slide._id}
                  custom={heroDirection}
                  variants={heroSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="absolute inset-0"
                >
                  {/* Cover Image */}
                  {slide.coverImage ? (
                    <>
                      <img src={getImageUrl(slide.coverImage)} alt={slide.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className={`relative w-full h-full ${dark ? "bg-[#1a2a3d]" : "bg-[#cfd9e4]"}`}>
                      <div className={`absolute -top-16 -left-14 w-60 h-60 rounded-full border ${dark ? "border-white/10" : "border-white/45"}`} />
                      <div className={`absolute -bottom-20 -right-10 w-72 h-72 rounded-full border ${dark ? "border-white/10" : "border-white/45"}`} />
                      <div className={`absolute top-8 right-16 w-32 h-32 rounded-full border ${dark ? "border-white/10" : "border-white/60"}`} />
                      <div className={`absolute bottom-8 left-16 w-24 h-24 rounded-full border ${dark ? "border-white/10" : "border-white/60"}`} />

                      <div className="absolute inset-0 flex items-start sm:items-center justify-center px-6 pt-8 sm:pt-0">
                        <div className="relative w-[170px] h-[170px] sm:w-[220px] sm:h-[220px] flex items-center justify-center">
                          <div className={`absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border ${dark ? "border-white/10" : "border-white/70"}`} />
                          <div className={`absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full border ${dark ? "border-white/20" : "border-[#1e3a5f]/15"}`} />

                          <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl border backdrop-blur-xl flex items-center justify-center ${dark ? "bg-[#0a1628]/70 border-white/20 text-white/90" : "bg-white/80 border-white text-[#1e3a5f]"}`}>
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-2.25m-19.5 0v-9A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v9m-19.5 0l3.72-3.72a1.5 1.5 0 012.12 0l1.91 1.91m-2.03 2.03l4.78-4.78a1.5 1.5 0 012.12 0l4.88 4.88M15.75 8.25h.008v.008h-.008V8.25z" />
                            </svg>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8 pr-14 sm:pr-16">
                    {/* Top badges row */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 max-w-[calc(100%-4.5rem)]">
                      {(slide.verifiedBadge || slide.premium || slide.isFeatured) && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0f2f54]/72 border border-[#8db7e6]/40">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-white/95 font-semibold text-[10px] tracking-[0.15em] uppercase">Verified</span>
                        </div>
                      )}
                    </div>

                    <div className="max-w-3xl">
                      <h2 className={`text-[24px] sm:text-[34px] lg:text-[44px] font-extrabold mb-2.5 leading-[1.02] tracking-[-0.02em] ${useLightFallbackText ? "text-[#0f2745]" : "text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.35)]"}`}>
                        {slide.title}
                      </h2>
                      {(slide.logline || slide.description || slide.synopsis) && (
                        <p className={`text-[12px] sm:text-[15px] font-normal mb-3 sm:mb-4 line-clamp-2 max-w-2xl ${useLightFallbackText ? "text-[#2d4866]" : "text-white/80"}`}>{slide.logline || slide.description || slide.synopsis}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-5">
                        {slide.genre && <span className={`px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-semibold border ${useLightFallbackText ? "bg-white/85 border-[#b6cbe4] text-[#16395e]" : "bg-white/[0.12] border-white/20 text-white/90"}`}>{slide.genre}</span>}
                        {Number(slide.rating || 0) > 0 && (
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${useLightFallbackText ? "bg-white/85 border-[#b6cbe4]" : "bg-white/[0.12] border-white/20"}`}>
                            <StarIcon filled />
                            <span className={`text-[11px] sm:text-[12px] font-semibold ${useLightFallbackText ? "text-[#16395e]" : "text-white/95"}`}>{Number(slide.rating).toFixed(1)}</span>
                          </div>
                        )}
                        {Number(slide.views || 0) > 0 && (
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${useLightFallbackText ? "bg-white/85 border-[#b6cbe4]" : "bg-white/[0.12] border-white/20"}`}>
                            <EyeIcon />
                            <span className={`text-[11px] sm:text-[12px] font-semibold ${useLightFallbackText ? "text-[#16395e]" : "text-white/92"}`}>{Number(slide.views).toLocaleString()} views</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                          to={getScriptCanonicalPath(slide)}
                          onClick={(e) => { if (isPersonalEmailBlocked) { e.preventDefault(); handleScriptBlock(); } }}
                          className={`inline-flex h-9 sm:h-10 items-center gap-2 rounded-xl px-3.5 sm:px-4 text-[12px] sm:text-[14px] font-bold tracking-[0.01em] transition-all duration-200 ${useLightFallbackText ? "bg-[#12385f] text-white hover:bg-[#0e2b49]" : "bg-white text-[#0d2037] hover:bg-[#e8f1ff]"}`}
                        >
                          View Project
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Prev / Next arrows */}
              {heroSlides.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      setHeroDirection(-1);
                      setHeroIndex(i => (i - 1 + heroSlides.length) % heroSlides.length);
                    }}
                    className={`absolute left-2 sm:left-3 top-[44%] sm:top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${useLightFallbackText ? "text-[#15375d]/85 hover:text-[#15375d]" : "text-white/90 hover:text-white"}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  </button>
                  <button
                    onClick={() => {
                      setHeroDirection(1);
                      setHeroIndex(i => (i + 1) % heroSlides.length);
                    }}
                    className={`absolute right-2 sm:right-3 top-[44%] sm:top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all ${useLightFallbackText ? "text-[#15375d]/85 hover:text-[#15375d]" : "text-white/90 hover:text-white"}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </button>
                </>
              )}

            </div>
          </motion.div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── SPONSORED PROJECTS CAROUSEL ── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {sponsoredScripts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div>
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>
                  Spotlight
                </h2>
                <p className={`text-[13px] font-medium ${dark ? "text-gray-500" : "text-gray-500"}`}>Handpicked promoted projects with spotlight placement</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sponsoredScripts.map((script, idx) => (
              <SponsoredCard key={script._id} script={script} onBlock={isPersonalEmailBlocked ? handleScriptBlock : undefined} />
            ))}
          </div>
        </motion.div>
      )}

      {/*  Loading  */}
      {loading && (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-10 h-10">
              <div className={`absolute inset-0 border-[2.5px] rounded-full animate-spin ${dark ? "border-white/10 border-t-blue-400" : "border-gray-200 border-t-[#1e3a5f]"}`} />
            </div>
            <p className={`text-[13px] font-medium ${dark ? "text-gray-500" : "text-gray-400"}`}>Discovering featured projects…</p>
          </div>
        </div>
      )}

      {/*  Empty state  */}
      {!loading && scripts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center py-28 rounded-2xl border ${dark ? "bg-[#0a1628] border-[#1a3050]" : "bg-white border-gray-100"}`}
        >
          <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
            <svg className={`w-7 h-7 ${dark ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className={`text-lg font-black mb-1.5 ${dark ? "text-gray-200" : "text-gray-700"}`}>No Projects Found</p>
          <p className={`text-[13px] font-medium mb-5 ${dark ? "text-gray-500" : "text-gray-400"}`}>No promoted projects are available right now.</p>
        </motion.div>
      )}

      {/* ── Trailer/Preview Modal ── */}
      <AnimatePresence>
        {previewScript && (
          <TrailerModal
            script={previewScript}
            onClose={() => setPreviewScript(null)}
            getImageUrl={getImageUrl}
            onBlock={isPersonalEmailBlocked ? handleScriptBlock : undefined}
          />
        )}
      </AnimatePresence>

      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${dark ? "bg-[#0d1926] border-[#1a2e47] text-white" : "bg-white border-gray-200 text-gray-900"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUpgradeModal(false)}
              className={`absolute top-3 right-3 p-1.5 rounded-lg transition ${dark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex flex-col items-center text-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${dark ? "bg-amber-500/15" : "bg-amber-50"}`}>
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-base">Access Restricted</p>
                <p className={`text-sm mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>A business email or Film Industry Professional plan is required to view scripts.</p>
              </div>
              <div className="flex flex-col gap-2.5 w-full">
                <button
                  onClick={() => { setShowUpgradeModal(false); openPricingModal(); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition"
                >
                  Get Film Industry Professional plan
                </button>
                <button
                  onClick={() => { setShowUpgradeModal(false); navigate("/producer-director-onboarding"); }}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold border transition ${dark ? "border-[#1a2e47] hover:bg-white/5 text-gray-300" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}
                >
                  Update to a business email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FeaturedProjects;
