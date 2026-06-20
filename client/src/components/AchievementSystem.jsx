/**
 * AchievementSystem.jsx
 * ──────────────────────
 * Provides three exports:
 *
 *   useBadges()       – hook: returns { unlockedBadges, checkBadges(streak, totalReads, extras) }
 *   BadgeToast        – floating pop-up shown when a new badge is unlocked
 *   BadgeShelf        – row of badge chips shown on the Reader Profile
 *   StreakWidget      – compact streak counter card for the Profile header
 *
 * Badge persistence is in localStorage under "sb-badges".
 * checkBadges() is idempotent — calling it multiple times never re-unlocks
 * a badge that was already earned.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Star, BookOpen, Zap, Moon, Compass,
  Share2, Trophy, Award, CheckCircle2,
} from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";

/* ─────────────────────────────────────────
   Badge Definitions
   ───────────────────────────────────────── */
export const BADGE_DEFS = [
  {
    id: "first_read",
    label: "First Chapter",
    description: "Read your very first script on Ckript.",
    emoji: "📖",
    Icon: BookOpen,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/20",
    condition: (_, totalReads) => totalReads >= 1,
    rarity: "common",
  },
  {
    id: "streak_3",
    label: "On Fire",
    description: "Maintained a 3-day reading streak.",
    emoji: "🔥",
    Icon: Flame,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    glow: "shadow-orange-500/20",
    condition: (streak) => streak >= 3,
    rarity: "common",
  },
  {
    id: "streak_7",
    label: "Week Warrior",
    description: "Kept a 7-day reading streak alive!",
    emoji: "⚡",
    Icon: Zap,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    glow: "shadow-yellow-500/20",
    condition: (streak) => streak >= 7,
    rarity: "rare",
  },
  {
    id: "streak_30",
    label: "Legendary Reader",
    description: "30-day reading streak — you're unstoppable.",
    emoji: "👑",
    Icon: Trophy,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    glow: "shadow-amber-400/30",
    condition: (streak) => streak >= 30,
    rarity: "legendary",
  },
  {
    id: "reads_10",
    label: "Bookworm",
    description: "Completed 10 reading sessions.",
    emoji: "🐛",
    Icon: BookOpen,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    glow: "shadow-teal-500/20",
    condition: (_, totalReads) => totalReads >= 10,
    rarity: "common",
  },
  {
    id: "reads_25",
    label: "Script Aficionado",
    description: "25 scripts read — you clearly love stories.",
    emoji: "🎬",
    Icon: Star,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    glow: "shadow-violet-500/20",
    condition: (_, totalReads) => totalReads >= 25,
    rarity: "rare",
  },
  {
    id: "night_owl",
    label: "Night Owl",
    description: "Read a script between 10 PM and 4 AM.",
    emoji: "🦉",
    Icon: Moon,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    border: "border-indigo-400/20",
    glow: "shadow-indigo-400/20",
    condition: (_, __, extras) => !!extras?.nightOwl,
    rarity: "common",
  },
  {
    id: "genre_explorer",
    label: "Genre Explorer",
    description: "Read scripts across 3 or more different genres.",
    emoji: "🧭",
    Icon: Compass,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    glow: "shadow-sky-500/20",
    condition: (_, __, extras) => (extras?.genreCount || 0) >= 3,
    rarity: "rare",
  },
  {
    id: "social_sharer",
    label: "Social Butterfly",
    description: "Shared a script with your network.",
    emoji: "🦋",
    Icon: Share2,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    glow: "shadow-pink-500/20",
    condition: (_, __, extras) => !!extras?.shared,
    rarity: "common",
  },
];

const RARITY_ORDER = { legendary: 0, rare: 1, common: 2 };
const STORAGE_KEY = "sb-badges";

/* ─────────────────────────────────────────
   useBadges hook
   ───────────────────────────────────────── */
export const useBadges = () => {
  const [unlockedBadges, setUnlockedBadges] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  });

  // newlyUnlocked: badges just earned in this session (for toast display)
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);

  const checkBadges = useCallback((streak = 0, totalReads = 0, extras = {}) => {
    // Detect Night Owl based on current hour
    const hour = new Date().getHours();
    const isNightOwl = hour >= 22 || hour < 4;
    const enrichedExtras = { ...extras, nightOwl: isNightOwl };

    const current = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
      catch { return []; }
    })();

    const justUnlocked = [];
    BADGE_DEFS.forEach((def) => {
      if (current.includes(def.id)) return; // already earned
      if (def.condition(streak, totalReads, enrichedExtras)) {
        current.push(def.id);
        justUnlocked.push(def.id);
      }
    });

    if (justUnlocked.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* */ }
      setUnlockedBadges(current);
      setNewlyUnlocked((prev) => [...prev, ...justUnlocked]);
    }

    return justUnlocked;
  }, []);

  const dismissToast = useCallback((badgeId) => {
    setNewlyUnlocked((prev) => prev.filter((id) => id !== badgeId));
  }, []);

  const earnedDefs = BADGE_DEFS
    .filter((b) => unlockedBadges.includes(b.id))
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);

  return { unlockedBadges, earnedDefs, newlyUnlocked, checkBadges, dismissToast };
};

/* ─────────────────────────────────────────
   BadgeToast  – floating notification
   ───────────────────────────────────────── */
export const BadgeToast = ({ badgeId, onDismiss }) => {
  const { isDarkMode: dark } = useDarkMode();
  const def = BADGE_DEFS.find((b) => b.id === badgeId);
  if (!def) return null;

  // Auto-dismiss after 4.5s
  useEffect(() => {
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 64, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border shadow-xl ${def.glow} shadow-md cursor-pointer select-none ${
        dark
          ? `bg-[#0d1829] border-[#1a3050] ${def.bg}`
          : `bg-white border-gray-100 ${def.bg}`
      }`}
      onClick={onDismiss}
    >
      {/* Badge icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${def.bg} border ${def.border}`}>
        <span className="text-xl leading-none">{def.emoji}</span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${def.color}`}>
          Achievement Unlocked!
        </p>
        <p className={`text-sm font-extrabold leading-tight ${dark ? "text-gray-100" : "text-gray-900"}`}>
          {def.label}
        </p>
        <p className={`text-[11px] mt-0.5 font-medium line-clamp-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {def.description}
        </p>
      </div>

      {/* Rarity pip */}
      <div className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
        def.rarity === "legendary"
          ? "bg-amber-400/20 text-amber-500"
          : def.rarity === "rare"
            ? "bg-violet-500/15 text-violet-500"
            : dark ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400"
      }`}>
        {def.rarity}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────
   BadgeToastContainer  – portal anchor at bottom-right
   ───────────────────────────────────────── */
export const BadgeToastContainer = ({ newlyUnlocked, onDismiss }) => (
  <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2.5 items-end pointer-events-none">
    <AnimatePresence>
      {newlyUnlocked.map((id) => (
        <div key={id} className="pointer-events-auto">
          <BadgeToast badgeId={id} onDismiss={() => onDismiss(id)} />
        </div>
      ))}
    </AnimatePresence>
  </div>
);

/* ─────────────────────────────────────────
   BadgeShelf  – shown on ReaderProfile
   ───────────────────────────────────────── */
export const BadgeShelf = ({ earnedDefs = [], dark }) => {
  const [hoveredId, setHoveredId] = useState(null);
  const allBadges = BADGE_DEFS;

  return (
    <div>
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        Achievements ({earnedDefs.length}/{allBadges.length})
      </h3>
      <div className="flex flex-wrap gap-2.5">
        {allBadges.map((def) => {
          const earned = earnedDefs.some((e) => e.id === def.id);
          return (
            <div
              key={def.id}
              className="relative"
              onMouseEnter={() => setHoveredId(def.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <motion.div
                whileHover={{ scale: earned ? 1.1 : 1.04 }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                  earned
                    ? `${def.bg} ${def.border} shadow-md ${def.glow}`
                    : dark
                      ? "bg-white/[0.03] border-[#182840] opacity-35 grayscale"
                      : "bg-gray-50 border-gray-100 opacity-40 grayscale"
                }`}
              >
                <span className={`text-xl leading-none ${!earned ? "opacity-50" : ""}`}>
                  {def.emoji}
                </span>
              </motion.div>

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredId === def.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded-xl border px-3 py-2 z-20 shadow-lg pointer-events-none ${
                      dark
                        ? "bg-[#0d1829] border-[#1a3050] text-gray-200"
                        : "bg-white border-gray-100 text-gray-800"
                    }`}
                  >
                    <p className={`text-[11px] font-extrabold ${earned ? def.color : "text-gray-400"}`}>
                      {def.label}
                    </p>
                    <p className={`text-[10px] mt-0.5 leading-snug ${dark ? "text-gray-500" : "text-gray-400"}`}>
                      {earned ? def.description : "🔒 " + def.description}
                    </p>
                    <div className={`mt-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full w-fit ${
                      def.rarity === "legendary"
                        ? "bg-amber-400/20 text-amber-500"
                        : def.rarity === "rare"
                          ? "bg-violet-500/15 text-violet-500"
                          : dark ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400"
                    }`}>
                      {def.rarity}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   StreakWidget  – compact card for Profile
   ───────────────────────────────────────── */
export const StreakWidget = ({ streak = 0, longestStreak = 0, totalReads = 0, todayRead = false, dark }) => {
  const flames = Math.min(streak, 7); // show up to 7 flame dots

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${
      dark ? "bg-[#0d1829] border-[#1a3050]" : "bg-white border-gray-100 shadow-sm"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${streak > 0 ? "bg-orange-500/15" : dark ? "bg-white/5" : "bg-gray-50"}`}>
            <Flame size={16} className={streak > 0 ? "text-orange-500" : "text-gray-400"} />
          </div>
          <span className={`text-sm font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>
            Reading Streak
          </span>
        </div>
        {todayRead && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={9} /> Today ✓
          </span>
        )}
      </div>

      {/* Big streak number */}
      <div className="flex items-end gap-4">
        <div>
          <span className={`text-4xl font-black leading-none ${streak >= 7 ? "text-orange-500" : streak >= 3 ? "text-amber-500" : dark ? "text-gray-100" : "text-gray-900"}`}>
            {streak}
          </span>
          <span className={`text-sm font-semibold ml-1.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
            day{streak !== 1 ? "s" : ""}
          </span>
        </div>
        <div className={`mb-1 text-xs font-semibold ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Best: <span className={`font-extrabold ${dark ? "text-gray-300" : "text-gray-600"}`}>{longestStreak}</span>
        </div>
        <div className={`mb-1 ml-auto text-xs font-semibold ${dark ? "text-gray-500" : "text-gray-400"}`}>
          <span className={`font-extrabold ${dark ? "text-gray-300" : "text-gray-600"}`}>{totalReads}</span> total reads
        </div>
      </div>

      {/* Flame dots (last 7 days indicator) */}
      <div className="flex gap-1.5 items-center">
        {Array.from({ length: 7 }).map((_, i) => {
          const lit = i < flames;
          return (
            <motion.div
              key={i}
              initial={false}
              animate={{ scale: lit ? 1 : 0.8, opacity: lit ? 1 : 0.25 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className={`flex-1 h-1.5 rounded-full ${lit ? "bg-orange-500" : dark ? "bg-white/10" : "bg-gray-100"}`}
            />
          );
        })}
        <span className={`text-[10px] font-bold ml-1 ${dark ? "text-gray-600" : "text-gray-300"}`}>7d</span>
      </div>

      {/* Motivational line */}
      <p className={`text-[11px] font-semibold ${dark ? "text-gray-600" : "text-gray-400"}`}>
        {streak === 0
          ? "Start your streak — read a script today! 📖"
          : streak < 3
            ? `${3 - streak} more day${3 - streak !== 1 ? "s" : ""} to earn the 🔥 On Fire badge!`
            : streak < 7
              ? `${7 - streak} day${7 - streak !== 1 ? "s" : ""} until ⚡ Week Warrior!`
              : "You're on fire! Keep the streak alive 🏆"}
      </p>
    </div>
  );
};
