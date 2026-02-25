import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";

/* ── Genre emoji ── */
const GE = {
  action:"🔥",comedy:"😂",drama:"🎭",horror:"💀",thriller:"🔪",romance:"❤️",
  "sci-fi":"🚀",fantasy:"🧙",mystery:"🔍",adventure:"🗺️",crime:"🕵️",
  documentary:"🎬",historical:"📜",animation:"✨",anime:"⛩️",musical:"🎵",
  western:"🤠",war:"⚔️",family:"👨‍👩‍👧",biography:"📖",sports:"⚽",
  superhero:"🦸",psychological:"🧠",satire:"😏",
};
const gEmoji = (g) => GE[g?.toLowerCase()] ?? "🎬";

/* ── Fade-in wrapper ── */
const Fade = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ══════════════════════════════════════════════
   STAT PILL — small metric in the hero bar
══════════════════════════════════════════════ */
const StatPill = ({ value, label, dark }) => (
  <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-sm
    ${dark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white/70 border-gray-200/60 shadow-sm"}`}>
    <span className={`text-base font-extrabold tabular-nums leading-none
      ${dark ? "text-white" : "text-gray-900"}`}>{value}</span>
    <span className={`text-[10px] font-semibold uppercase tracking-wider leading-none
      ${dark ? "text-gray-500" : "text-gray-400"}`}>{label}</span>
  </div>
);

/* ══════════════════════════════════════════════
   SECTION HEADER — label + count + "See all"
══════════════════════════════════════════════ */
const SectionHead = ({ icon, title, count, sub, to, dark }) => (
  <div className="flex items-end justify-between mb-5">
    <div className="flex items-center gap-2.5">
      {icon && (
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm
          ${dark ? "bg-white/[0.05]" : "bg-gray-50 border border-gray-100"}`}>
          {icon}
        </span>
      )}
      <div>
        <div className="flex items-center gap-2">
          <h2 className={`text-[15px] font-bold tracking-tight
            ${dark ? "text-white" : "text-gray-900"}`}>{title}</h2>
          {count > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold tabular-nums
              ${dark ? "bg-white/[0.05] text-gray-500" : "bg-gray-100 text-gray-400"}`}>
              {count}
            </span>
          )}
        </div>
        {sub && <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>{sub}</p>}
      </div>
    </div>
    {to && (
      <Link to={to}
        className={`text-[11px] font-semibold flex items-center gap-0.5 transition-all hover:gap-1
          ${dark ? "text-blue-400/80 hover:text-blue-300" : "text-[#1e3a5f]/70 hover:text-[#1e3a5f]"}`}>
        See all
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    )}
  </div>
);

/* ══════════════════════════════════════════════
   HORIZONTAL ROW — flex nowrap scroll
══════════════════════════════════════════════ */
const HRow = ({ children, className = "" }) => (
  <div
    className={`flex flex-nowrap gap-4 overflow-x-auto pb-2 ${className}`}
    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
  >
    {children}
  </div>
);

/* Single neutral dark palette for all fallback posters */
const genrePalette = () => ["#0e1621", "#111c2b", "#0a1018"];

/* Genre icon paths (SVG) for fallback poster */
const GENRE_ICON = {
  comedy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  ),
  drama: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M2 17 C2 17 5 14 8 17 S14 20 17 17 S22 14 22 17"/><path d="M2 12 C2 12 5 9 8 12 S14 15 17 12 S22 9 22 12"/><path d="M2 7 C2 7 5 4 8 7 S14 10 17 7 S22 4 22 7"/>
    </svg>
  ),
  thriller: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  horror: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M12 2a7 7 0 0 0-7 7c0 3 1.5 5 3 6.5V18h8v-2.5C17.5 14 19 12 19 9a7 7 0 0 0-7-7z"/><path d="M9 22h6"/><line x1="12" y1="18" x2="12" y2="22"/>
    </svg>
  ),
  romance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  "sci-fi": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2a10 10 0 0 0 0 20"/><path d="M2 12h20"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)"/>
    </svg>
  ),
  fantasy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  mystery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  action: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  historical: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  adventure: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
  ),
  documentary: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>
    </svg>
  ),
  animation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  ),
  crime: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
};
const getGenreIcon = (g) => GENRE_ICON[g?.toLowerCase()] ?? (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>
  </svg>
);

/* ══════════════════════════════════════════════
   SCRIPT CARD — poster style
══════════════════════════════════════════════ */
const ScriptPoster = ({ script, idx = 0, rank, dark }) => {
  const [imgErr, setImgErr] = useState(false);
  const hasImg = script?.coverImage && !imgErr;
  const [c1, c2, c3] = genrePalette();
  const genreIcon = getGenreIcon(script?.genre);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.045, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="shrink-0 w-[152px] sm:w-[172px]"
    >
      <Link to={`/reader/script/${script._id}`} className="group block">

        {/* ── Poster ── */}
        <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden mb-2.5 transition-all duration-300
          group-hover:-translate-y-1 group-hover:shadow-2xl"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>

          {hasImg ? (
            <img
              src={script.coverImage} alt={script.title}
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
            />
          ) : (
            /* ── Beautiful fallback poster ── */
            <div className="w-full h-full flex flex-col"
              style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)` }}>
              {/* Noise texture overlay */}
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
              {/* Diagonal shimmer line */}
              <div className="absolute inset-0 opacity-[0.06]"
                style={{ background: "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)" }} />

              {/* Center icon & title */}
              <div className="flex-1 flex flex-col items-center justify-center px-3 pt-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-white/10"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <span className="text-white/50">{genreIcon}</span>
                </div>
                <p className="text-white/55 text-[12px] font-semibold text-center leading-snug line-clamp-3 px-1">
                  {script.title}
                </p>
              </div>

              {/* Bottom genre strip */}
              <div className="pb-4 flex justify-center">
                <span className="text-[9px] font-extrabold tracking-[0.18em] uppercase text-white/20">
                  {script.genre || "Script"}
                </span>
              </div>
            </div>
          )}

          {/* Hover reveal overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent
            opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            <span className="text-white text-[11px] font-bold flex items-center gap-1.5 mb-0.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Read Script
            </span>
            {script.logline && (
              <p className="text-white/45 text-[9px] leading-snug line-clamp-2">{script.logline}</p>
            )}
          </div>

          {/* Top-left: rating */}
          {script.rating > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm">
              <svg className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-white text-[9px] font-bold tabular-nums">{(script.rating || 0).toFixed(1)}</span>
            </div>
          )}

          {/* Top-right: PRO or PICK */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            {script.premium && (
              <span className="px-1.5 py-0.5 text-[8px] font-extrabold tracking-wider rounded-md
                bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow">
                PRO
              </span>
            )}
            {script.isFeatured && !script.premium && (
              <span className="px-1.5 py-0.5 text-[8px] font-extrabold tracking-wider rounded-md
                bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow">
                ★
              </span>
            )}
          </div>

          {/* Rank corner badge */}
          {rank && (
            <div className="absolute bottom-2 left-2 w-7 h-7 rounded-xl bg-white/10 backdrop-blur-sm
              border border-white/15 flex items-center justify-center">
              <span className="text-white text-[11px] font-extrabold tabular-nums">{rank}</span>
            </div>
          )}
        </div>

        {/* ── Info below poster ── */}
        <h3 className={`text-[12.5px] font-bold leading-tight line-clamp-1 transition-colors
          ${dark ? "text-gray-100 group-hover:text-blue-400" : "text-gray-900 group-hover:text-[#1e3a5f]"}`}>
          {script.title}
        </h3>
        <div className="flex items-center justify-between mt-1 gap-1">
          <span className={`text-[10px] truncate max-w-[70%] ${dark ? "text-gray-500" : "text-gray-400"}`}>
            {script.creator?.name || "Unknown"}
          </span>
          {script.genre && (
            <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider
              ${dark ? "bg-white/[0.05] text-gray-500" : "bg-gray-100 text-gray-400"}`}>
              {script.genre}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════ */
const Skel = ({ dark }) => (
  <div className="shrink-0 w-[148px] sm:w-[164px]">
    <div className={`w-full aspect-[2/3] rounded-2xl mb-2 animate-pulse ${dark ? "bg-[#162236]" : "bg-gray-100"}`} />
    <div className={`h-2.5 rounded w-4/5 mb-1.5 animate-pulse ${dark ? "bg-[#1a2d44]" : "bg-gray-100"}`} />
    <div className={`h-2 rounded w-3/5 animate-pulse ${dark ? "bg-[#162236]" : "bg-gray-50"}`} />
  </div>
);

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const InvestorHome = () => {
  const { user } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] || "there";

  useEffect(() => { fetchFeed(); }, []);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/scripts/investor-home");
      setFeed(data);
    } catch {
      try {
        const { data } = await api.get("/scripts/latest");
        setFeed({ detectedGenres: [], genreSections: [], trending: [], newReleases: data, explore: [] });
      } catch { /* silent */ }
    } finally { setLoading(false); }
  };

  /* derived */
  const genres     = feed?.genreSections || [];
  const trending   = feed?.trending || [];
  const newRel     = feed?.newReleases || [];
  const explore    = feed?.explore || [];
  const totalScripts = genres.reduce((n, g) => n + g.scripts.length, 0) + trending.length + newRel.length + explore.length;
  const isEmpty    = totalScripts === 0 && !loading;

  const bg  = dark ? "bg-[#060e1d]" : "bg-[#f6f7fa]";
  const sep = dark ? "bg-white/[0.04]" : "bg-gray-200/50";

  return (
    <div className={`min-h-screen ${bg} pb-28`}>

      {/* ═══════ HERO HEADER ═══════ */}
      <div className={`relative overflow-hidden border-b
        ${dark ? "border-white/[0.04]" : "border-gray-200/60"}`}>
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[100px] opacity-20"
          style={{ background: dark ? "#1e40af" : "#93c5fd" }} />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full blur-[80px] opacity-10"
          style={{ background: dark ? "#3b82f6" : "#bfdbfe" }} />

        <div className={`relative z-10 ${dark ? "bg-[#060e1d]/80" : "bg-white/80"} backdrop-blur-xl`}>
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-8 pb-6">
            <Fade>
              <p className={`text-[10px] font-extrabold uppercase tracking-[0.25em] mb-1.5
                ${dark ? "text-blue-500/50" : "text-blue-600/40"}`}>{greeting}</p>
              <h1 className={`text-[26px] sm:text-[32px] font-extrabold tracking-tight leading-none
                ${dark ? "text-white" : "text-gray-900"}`}>
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  {firstName}
                </span>
              </h1>
              <p className={`text-[13px] mt-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                Your personalised script feed — curated from your investment profile
              </p>
            </Fade>

            {/* Stats row */}
            {!loading && !isEmpty && (
              <Fade delay={0.1}>
                <div className="flex items-center gap-2.5 mt-5 flex-wrap">
                  {genres.length > 0 && (
                    <StatPill value={genres.length} label={genres.length === 1 ? "genre" : "genres matched"} dark={dark} />
                  )}
                  {totalScripts > 0 && (
                    <StatPill value={totalScripts} label="scripts" dark={dark} />
                  )}
                  {newRel.length > 0 && (
                    <StatPill value={newRel.length} label="new this month" dark={dark} />
                  )}
                </div>
              </Fade>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ FEED ═══════ */}
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-8 space-y-12">

        {/* Loading skeleton */}
        {loading && !feed && (
          <>
            <div className={`w-full rounded-2xl animate-pulse ${dark ? "bg-[#0d1b2a]" : "bg-gray-100"}`} style={{ height: 260 }} />
            {[0, 1, 2].map((k) => (
              <div key={k}>
                <div className={`h-3.5 w-32 rounded mb-5 animate-pulse ${dark ? "bg-[#162236]" : "bg-gray-100"}`} />
                <div className="flex gap-4">
                  {[...Array(6)].map((_, i) => <Skel key={i} dark={dark} />)}
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && feed && (
          <AnimatePresence>
            <>
              {/* ── Genre Sections ── */}
              {genres.map(({ genre, scripts }, idx) => (
                <Fade key={genre} delay={0.05 + idx * 0.06}>
                  <SectionHead
                    icon={gEmoji(genre)}
                    title={genre}
                    count={scripts.length}
                    sub={idx === 0 ? "Best match from your profile" : null}
                    to="/search"
                    dark={dark}
                  />
                  <HRow>
                    {scripts.map((s, i) => <ScriptPoster key={s._id} script={s} idx={i} dark={dark} />)}
                  </HRow>
                  <div className={`mt-10 h-px ${sep}`} />
                </Fade>
              ))}

              {/* ── Trending ── */}
              {trending.length > 0 && (
                <Fade delay={0.15}>
                  <SectionHead icon="📈" title="Trending Now" count={trending.length}
                    sub="Most viewed & unlocked this month" to="/search" dark={dark} />
                  <HRow>
                    {trending.map((s, i) => (
                      <ScriptPoster key={s._id} script={s} idx={i} rank={i + 1} dark={dark} />
                    ))}
                  </HRow>
                  <div className={`mt-10 h-px ${sep}`} />
                </Fade>
              )}

              {/* ── New Releases ── */}
              {newRel.length > 0 && (
                <Fade delay={0.2}>
                  <SectionHead icon="🆕" title="New Releases" count={newRel.length}
                    sub="Uploaded in the last 30 days" to="/search" dark={dark} />
                  <HRow>
                    {newRel.map((s, i) => <ScriptPoster key={s._id} script={s} idx={i} dark={dark} />)}
                  </HRow>
                  <div className={`mt-10 h-px ${sep}`} />
                </Fade>
              )}

              {/* ── Explore ── */}
              {explore.length > 0 && (
                <Fade delay={0.25}>
                  <SectionHead icon="🧭" title="Explore" count={explore.length}
                    sub="Outside your usual interests" to="/search" dark={dark} />
                  <HRow>
                    {explore.map((s, i) => <ScriptPoster key={s._id} script={s} idx={i} dark={dark} />)}
                  </HRow>
                </Fade>
              )}

              {/* ── Empty ── */}
              {isEmpty && (
                <Fade delay={0.1}>
                  <div className={`rounded-2xl border p-16 text-center
                    ${dark ? "bg-[#0a1628] border-white/[0.04]" : "bg-white border-gray-100 shadow-sm"}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6
                      ${dark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                      <svg className={`w-8 h-8 ${dark ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className={`text-base font-bold mb-1.5 ${dark ? "text-gray-100" : "text-gray-800"}`}>
                      Your feed is getting ready
                    </h3>
                    <p className={`text-[13px] mb-7 max-w-sm mx-auto leading-relaxed
                      ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      Writers upload scripts every day. Fill out your investor profile so we can personalise recommendations.
                    </p>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <Link to="/search"
                        className="px-6 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-[13px] font-bold hover:bg-[#17304e]
                          transition-all shadow-lg shadow-[#1e3a5f]/25 hover:shadow-xl inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        Browse Scripts
                      </Link>
                      <Link to="/dashboard"
                        className={`px-6 py-2.5 rounded-xl border text-[13px] font-semibold transition-all inline-flex items-center gap-2
                          ${dark ? "border-white/[0.08] text-gray-300 hover:bg-white/[0.03]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                        Update Profile
                      </Link>
                    </div>
                  </div>
                </Fade>
              )}
            </>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default InvestorHome;
