import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";

/* ─── Constants ─────────────────────────────────── */
const GENRES = [
  "All","Thriller","Drama","Comedy","Sci-Fi","Horror","Romance",
  "Action","Mystery","Fantasy","Animation","Crime","Adventure",
];

const SORT_TABS = [
  { key: "reputation", label: "Top Writers",  icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172" },
  { key: "score",      label: "AI Score",     icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
  { key: "views",      label: "Most Viewed",  icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" },
  { key: "followers",  label: "Followers",    icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" },
  { key: "scripts",    label: "Most Scripts", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
];

/* ─── Rank tiers (no gold) ────────────────────── */
// 1 = blue-violet (premier)  2 = slate  3 = teal
const RANK_TIERS = {
  1: {
    strip:    "from-blue-500 via-violet-500 to-indigo-500",
    avatarRing: "ring-blue-400/30",
    badge:    "from-blue-500 to-violet-500 text-white",
    glow:     "shadow-[0_4px_32px_rgba(99,102,241,0.14)]",
    border:   { l: "border-blue-200/60",   d: "border-blue-500/20" },
    bg:       { l: "bg-blue-50/30",        d: "bg-[#0a1628]" },
    label:    { l: "text-blue-600 bg-blue-50 border-blue-100",    d: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  },
  2: {
    strip:    "from-slate-400 to-slate-300",
    avatarRing: "ring-slate-300/40",
    badge:    "from-slate-400 to-slate-300 text-slate-800",
    glow:     "shadow-[0_4px_20px_rgba(100,116,139,0.14)]",
    border:   { l: "border-slate-200",     d: "border-slate-500/20" },
    bg:       { l: "bg-slate-50/40",       d: "bg-[#0f1823]" },
    label:    { l: "text-slate-600 bg-slate-100 border-slate-200", d: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  },
  3: {
    strip:    "from-teal-400 to-cyan-400",
    avatarRing: "ring-teal-400/30",
    badge:    "from-teal-400 to-cyan-400 text-teal-900",
    glow:     "shadow-[0_4px_20px_rgba(20,184,166,0.13)]",
    border:   { l: "border-teal-200/60",   d: "border-teal-500/20" },
    bg:       { l: "bg-teal-50/20",        d: "bg-[#081a1c]" },
    label:    { l: "text-teal-700 bg-teal-50 border-teal-100",    d: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  },
};

const GENRE_COLORS = {
  Thriller:  { l: "bg-rose-50 text-rose-600 border-rose-100",       d: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  Drama:     { l: "bg-purple-50 text-purple-600 border-purple-100", d: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  Comedy:    { l: "bg-sky-50 text-sky-600 border-sky-100",          d: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  "Sci-Fi":  { l: "bg-cyan-50 text-cyan-700 border-cyan-100",       d: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  Horror:    { l: "bg-gray-100 text-gray-700 border-gray-200",      d: "bg-gray-700/40 text-gray-300 border-gray-600/30" },
  Romance:   { l: "bg-pink-50 text-pink-600 border-pink-100",       d: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  Action:    { l: "bg-red-50 text-red-600 border-red-100",          d: "bg-red-500/10 text-red-400 border-red-500/20" },
  Mystery:   { l: "bg-indigo-50 text-indigo-600 border-indigo-100", d: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  Fantasy:   { l: "bg-violet-50 text-violet-600 border-violet-100", d: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  Crime:     { l: "bg-slate-100 text-slate-600 border-slate-200",   d: "bg-slate-600/20 text-slate-400 border-slate-600/30" },
  Adventure: { l: "bg-green-50 text-green-700 border-green-100",    d: "bg-green-500/10 text-green-400 border-green-500/20" },
  Animation: { l: "bg-teal-50 text-teal-700 border-teal-100",       d: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
};
const GENRE_DEFAULT = { l: "bg-gray-100 text-gray-500 border-gray-200", d: "bg-gray-700/30 text-gray-400 border-gray-600/30" };

/* ─── Helpers ────────────────────────────────── */
const fmtNum = (n) => {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
};

/* ─── Skeleton ───────────────────────────────── */
const SkeletonCard = ({ dark }) => (
  <div className={`rounded-xl border overflow-hidden animate-pulse ${dark ? "bg-[#0f1923] border-white/[0.06]" : "bg-white border-gray-100"}`}>
    <div className={`h-0.5 ${dark ? "bg-white/[0.04]" : "bg-gray-100"}`} />
    <div className="p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl shrink-0 ${dark ? "bg-white/[0.07]" : "bg-gray-100"}`} />
        <div className="flex-1 pt-0.5 space-y-2.5">
          <div className={`h-3 rounded-full w-3/5 ${dark ? "bg-white/[0.07]" : "bg-gray-100"}`} />
          <div className={`h-2.5 rounded-full w-2/5 ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`} />
        </div>
        <div className={`w-12 h-8 rounded-lg ${dark ? "bg-white/[0.05]" : "bg-gray-100"}`} />
      </div>
      <div className="flex gap-1.5 mb-4">
        {[48, 40, 52].map((w, i) => <div key={i} className={`h-4 rounded-full ${dark ? "bg-white/[0.05]" : "bg-gray-100"}`} style={{ width: w }} />)}
      </div>
      <div className={`h-px mb-4 ${dark ? "bg-white/[0.05]" : "bg-gray-100"}`} />
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="text-center space-y-1.5">
            <div className={`h-3.5 rounded w-8 mx-auto ${dark ? "bg-white/[0.07]" : "bg-gray-100"}`} />
            <div className={`h-2 rounded w-10 mx-auto ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`} />
          </div>
        ))}
      </div>
      <div className={`h-8 rounded-lg ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`} />
    </div>
  </div>
);

/* ─── Writer Card ────────────────────────────── */
const WriterCard = ({ writer, rank, sortBy, dark }) => {
  const tier    = RANK_TIERS[rank] || null;
  const isTop3  = rank <= 3;
  const genres  = writer.writerProfile?.genres || [];
  const isWGA   = writer.writerProfile?.wgaMember;
  const repped  = writer.writerProfile?.representationStatus;
  const score   = Math.round(writer.avgScore || 0);
  const isRepped = repped && repped !== "unrepresented";

  const avatarUrl = writer.profileImage
    ? writer.profileImage.startsWith("http")
      ? writer.profileImage
      : `${import.meta.env.VITE_API_URL || "http://localhost:5001"}${writer.profileImage}`
    : null;

  const scoreColor =
    score >= 80 ? (dark ? "text-emerald-400" : "text-emerald-600") :
    score >= 60 ? (dark ? "text-blue-400"    : "text-blue-600")    :
                  (dark ? "text-gray-500"    : "text-gray-500");

  const highlighted = (() => {
    if (sortBy === "score")     return { val: score > 0 ? score : "—",      label: "AI Score",  color: score > 0 ? scoreColor : "" };
    if (sortBy === "views")     return { val: fmtNum(writer.totalViews),     label: "Views"    };
    if (sortBy === "followers") return { val: fmtNum(writer.followerCount),  label: "Followers" };
    if (sortBy === "scripts")   return { val: writer.scriptCount || 0,       label: "Scripts"  };
    return                             { val: Math.round(writer.reputation || 0), label: "Rep" };
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="h-full"
    >
      <Link to={`/profile/${writer._id}`} className="block group h-full">
        <div className={`relative rounded-xl border transition-all duration-250 overflow-hidden h-full flex flex-col ${
          isTop3
            ? `${dark ? tier.bg.d : tier.bg.l} ${dark ? tier.border.d : tier.border.l} ${tier.glow}`
            : dark
            ? "bg-[#0f1923] border-white/[0.06] hover:border-white/[0.11]"
            : "bg-white border-gray-100/80 hover:border-gray-200"
        } group-hover:shadow-lg`}>

          {/* Top accent line */}
          <div className={`h-[2px] ${isTop3 ? `bg-gradient-to-r ${tier.strip}` : dark ? "bg-white/[0.04]" : "bg-gray-100"}`} />

          <div className="p-5 flex flex-col flex-1">

            {/* ── Row 1: Avatar · Name · Metric ── */}
            <div className="flex items-start gap-3 mb-3.5">

              {/* Avatar + rank chip */}
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={writer.name}
                    className={`w-12 h-12 rounded-xl object-cover ${isTop3 ? `ring-1 ${tier.avatarRing}` : dark ? "ring-1 ring-white/[0.07]" : "ring-1 ring-gray-100"}`}
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[18px] font-black ${
                    isTop3
                      ? `bg-gradient-to-br ${tier.badge.split(" ").slice(0,2).join(" ")} ${tier.badge.split(" ").slice(-1)[0]} ring-1 ${tier.avatarRing}`
                      : dark
                      ? "bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] text-white ring-1 ring-white/[0.07]"
                      : "bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] text-white ring-1 ring-gray-100"
                  }`}>
                    {writer.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}

              </div>

              {/* Name + location */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`text-[14px] font-bold leading-tight truncate transition-colors ${
                    dark ? "text-white group-hover:text-blue-400" : "text-gray-900 group-hover:text-[#1e3a5f]"
                  }`}>
                    {writer.name}
                  </span>
                  {isWGA && (
                    <span className={`text-[8px] font-black tracking-widest px-1.5 py-px rounded border shrink-0 ${
                      dark ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : "text-blue-700 bg-blue-50 border-blue-100"
                    }`}>WGA</span>
                  )}
                  {isRepped && (
                    <span className={`text-[8px] font-black tracking-widest px-1.5 py-px rounded border shrink-0 ${
                      dark ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-700 bg-emerald-50 border-emerald-100"
                    }`}>REPPED</span>
                  )}
                </div>
                <p className={`text-[11px] truncate ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  {writer.writerProfile?.location || writer.bio || "Screenwriter"}
                </p>
              </div>

              {/* Highlighted metric */}
              <div className="text-right shrink-0 pt-0.5">
                <div className={`text-[18px] font-black tabular-nums leading-none ${highlighted.color || (dark ? "text-white" : "text-gray-900")}`}>
                  {highlighted.val}
                </div>
                <div className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                  {highlighted.label}
                </div>
              </div>
            </div>

            {/* ── Row 2: Genre tags ── */}
            <div className="flex flex-wrap gap-1 mb-3.5 min-h-[20px]">
              {genres.slice(0, 4).map((g) => {
                const c = GENRE_COLORS[g] || GENRE_DEFAULT;
                return (
                  <span key={g} className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${dark ? c.d : c.l}`}>
                    {g}
                  </span>
                );
              })}
              {genres.length > 4 && (
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${dark ? "bg-white/[0.04] text-gray-500 border-white/[0.07]" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                  +{genres.length - 4}
                </span>
              )}
            </div>

            {/* ── Divider ── */}
            <div className={`h-px mb-3.5 ${dark ? "bg-white/[0.05]" : "bg-gray-100"}`} />

            {/* ── Row 3: Stats ── */}
            <div className="grid grid-cols-4 gap-1 mb-4">
              {[
                { val: writer.scriptCount || 0,        label: "Scripts"  },
                { val: fmtNum(writer.totalViews),       label: "Views"    },
                { val: score > 0 ? score : "—",        label: "Score",   color: score > 0 ? scoreColor : "" },
                { val: fmtNum(writer.followerCount),    label: "Fans"     },
              ].map(({ val, label, color }) => (
                <div key={label} className="text-center">
                  <div className={`text-[13px] font-extrabold tabular-nums ${color || (dark ? "text-white" : "text-gray-900")}`}>{val}</div>
                  <div className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>{label}</div>
                </div>
              ))}
            </div>

            {/* ── CTA ── */}
            <div className={`mt-auto flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
              dark
                ? "bg-white/[0.03] text-gray-600 group-hover:bg-blue-500/10 group-hover:text-blue-400"
                : "bg-gray-50 text-gray-400 group-hover:bg-[#1e3a5f]/[0.05] group-hover:text-[#1e3a5f]"
            }`}>
              <span>View profile</span>
              <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>

          </div>
        </div>
      </Link>
    </motion.div>
  );
};

/* ─── Page ───────────────────────────────────── */
const Writers = () => {
  const { isDarkMode: dark } = useDarkMode();
  const [writers, setWriters]         = useState([]);
  const [loading, setLoading]         = useState(true);   // true only on initial blank load
  const [fetching, setFetching]       = useState(false);  // true on re-fetches (filter/sort changes)
  const [sortBy, setSortBy]           = useState("reputation");
  const [genre, setGenre]             = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 320);
    return () => clearTimeout(t);
  }, [searchInput]);

  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (isFirstLoad.current) {
        setLoading(true);
      } else {
        setFetching(true);
      }
      try {
        const p = new URLSearchParams({ sort: sortBy });
        if (genre !== "All") p.append("genre", genre);
        if (search.trim())   p.append("search", search.trim());
        const { data } = await api.get(`/users/writers?${p}`);
        if (!cancelled) {
          setWriters(data);
          isFirstLoad.current = false;
        }
      } catch {
        if (!cancelled) setWriters([]);
      }
      if (!cancelled) {
        setLoading(false);
        setFetching(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [sortBy, genre, search]);

  /* Tokens */
  const tk = {
    page:       "min-h-screen",
    text:       dark ? "text-white"          : "text-gray-900",
    sub:        dark ? "text-gray-400"       : "text-gray-500",
    muted:      dark ? "text-gray-600"       : "text-gray-400",
    surface:    dark ? "bg-[#0f1923] border-white/[0.07]" : "bg-white border-gray-100",
    inputBg:    dark
      ? "bg-[#0c1520] border-white/[0.09] text-white placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-blue-500/10"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#1e3a5f]/40 focus:ring-[#1e3a5f]/8",
    tabWrap:    dark ? "bg-[#0c1520] border-white/[0.07]" : "bg-gray-100/70 border-transparent",
    tabOn:      dark ? "bg-white/[0.09] text-white"        : "bg-white text-gray-900 shadow-sm",
    tabOff:     dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-700",
    pillOn:     dark ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                     : "bg-[#1e3a5f] text-white border-[#1e3a5f]",
    pillOff:    dark
      ? "bg-transparent text-gray-500 border-white/[0.08] hover:border-white/[0.15] hover:text-gray-300"
      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700",
    divider:    dark ? "bg-white/[0.05]" : "bg-gray-100",
    badgeSurf:  dark ? "bg-[#0c1520] border-white/[0.07]" : "bg-gray-50 border-gray-200",
  };

  const isFiltered = search || genre !== "All";
  const top3 = !isFiltered && writers.length >= 3 ? writers.slice(0, 3) : [];
  const rest = !isFiltered && writers.length >= 3 ? writers.slice(3)    : writers;

  const totalScripts  = writers.reduce((a, w) => a + (w.scriptCount || 0), 0);
  const scored        = writers.filter(w => (w.avgScore || 0) > 0);
  const avgScore      = scored.length > 0 ? Math.round(scored.reduce((a, w) => a + w.avgScore, 0) / scored.length) : 0;

  const Svg = ({ d, cls = "w-3.5 h-3.5" }) => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );

  return (
    <div className={tk.page}>
      {/* ── Slim refetch indicator (only on filter/sort changes, not initial load) ── */}
      {fetching && (
        <div className="fixed top-0 left-0 right-0 z-50 h-[2px] overflow-hidden">
          <div className="h-full w-1/2 bg-blue-500 animate-progress" />
        </div>
      )}
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-8">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-8">

          {/* Title row */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className={`text-[28px] sm:text-[34px] font-black tracking-tight leading-none ${tk.text}`}>
                  Browse Writers
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className={`text-[13px] ${tk.sub}`}>
                {sortBy === "reputation" ? "Ranked by overall reputation" :
                 sortBy === "score"      ? "Ranked by average AI script quality" :
                 sortBy === "views"      ? "Ranked by total script views" :
                 sortBy === "followers"  ? "Ranked by follower count" :
                                          "Ranked by number of scripts"}
              </p>
            </div>

            {/* Summary pills */}
            {!loading && writers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { val: writers.length, label: "Writers",  icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z", cl: "text-blue-400" },
                  { val: totalScripts,   label: "Scripts",  icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", cl: "text-violet-400" },
                  ...(avgScore > 0 ? [{ val: `${avgScore}/100`, label: "Avg Score", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z", cl: "text-amber-400" }] : [])
                ].map(({ val, label, icon, cl }) => (
                  <div key={label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold ${tk.badgeSurf}`}>
                    <Svg d={icon} cls={`w-3 h-3 ${cl}`} />
                    <span className={tk.text}>{val}</span>
                    <span className={tk.muted}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 mb-3.5">
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${tk.muted}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by name…"
                className={`w-full pl-9 pr-3 py-2 rounded-lg border text-[13px] font-medium focus:outline-none focus:ring-2 transition-all ${tk.inputBg}`}
              />
            </div>

            {/* Sort tabs */}
            <div className={`flex items-center gap-0.5 p-1 rounded-lg border overflow-x-auto ${tk.tabWrap}`}>
              {SORT_TABS.map((tab) => (
                <button key={tab.key} onClick={() => setSortBy(tab.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${sortBy === tab.key ? tk.tabOn : tk.tabOff}`}
                >
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Genre pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scroll-smooth">
            {GENRES.map((g) => (
              <button key={g} onClick={() => setGenre(g)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-150 shrink-0 ${genre === g ? tk.pillOn : tk.pillOff}`}
              >
                {g}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Content ── */}
        <AnimatePresence mode="wait">
          {loading ? (
            /* ── Initial load: full skeleton grid ── */
            <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
            >
              {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} dark={dark} />)}
            </motion.div>

          ) : writers.length === 0 && !fetching ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`rounded-xl border py-24 text-center ${tk.surface}`}
            >
              <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4 ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
                <Svg d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" cls={`w-6 h-6 ${tk.muted}`} />
              </div>
              <p className={`text-[15px] font-bold mb-1 ${tk.text}`}>No writers found</p>
              <p className={`text-[12px] ${tk.sub}`}>
                {search ? `No results for "${search}"` : genre !== "All" ? `No writers in ${genre}` : "Check back soon"}
              </p>
              {isFiltered && (
                <button onClick={() => { setSearch(""); setSearchInput(""); setGenre("All"); }}
                  className={`mt-5 px-4 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                    dark ? "border-white/[0.1] text-gray-400 hover:text-white hover:border-white/[0.2]"
                         : "border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300"
                  }`}
                >
                  Clear filters
                </button>
              )}
            </motion.div>

          ) : (
            /* ── Results: dim while re-fetching instead of blowing away the list ── */
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: fetching ? 0.45 : 1 }}
              transition={{ duration: 0.15 }}
            >

              {/* Top 3 */}
              {top3.length === 3 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
                    {top3.map((w, i) => <WriterCard key={w._id} writer={w} rank={i + 1} sortBy={sortBy} dark={dark} />)}
                  </div>
                  {rest.length > 0 && (
                    <div className="flex items-center gap-3 mb-3.5">
                      <div className={`h-px flex-1 ${tk.divider}`} />
                      <span className={`text-[9px] font-black uppercase tracking-[0.18em] ${tk.muted}`}>All Writers</span>
                      <div className={`h-px flex-1 ${tk.divider}`} />
                    </div>
                  )}
                </>
              )}

              {/* Rest */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {rest.map((w, i) => (
                    <WriterCard key={w._id} writer={w} rank={isFiltered ? i + 1 : i + 4} sortBy={sortBy} dark={dark} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default Writers;
