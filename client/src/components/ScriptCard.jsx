import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useDarkMode } from "../context/DarkModeContext";
import {
  Drama, Laugh, Crosshair, Skull, Heart, Flame, Atom, Wand2,
  Search, Clapperboard, Sparkles, ScrollText, Swords, Globe,
  Music, BookOpen
} from "lucide-react";

// Genre → icon mapping (all use the same theme color)
const genreIcons = {
  drama: Drama,
  comedy: Laugh,
  thriller: Crosshair,
  horror: Skull,
  romance: Heart,
  action: Flame,
  sci_fi: Atom,
  fantasy: Wand2,
  mystery: Search,
  documentary: Clapperboard,
  animation: Sparkles,
  historical: Globe,
  war: Swords,
  musical: Music,
  biography: BookOpen,
  crime: Crosshair,
};

const getIcon = (genre, contentType) => {
  const key = (genre || contentType || "").toLowerCase().replace(/[\s-]/g, "_");
  return genreIcons[key] || ScrollText;
};

// Stable hash for consistent pattern
const hashStr = (str) => {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const PlaceholderCover = ({ script }) => {
  const IconComponent = getIcon(script.genre, script.contentType);
  const hash = hashStr(script._id || script.title);
  const patternIdx = hash % 3;

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#0f1c2e] to-[#1a2d45]">
      {/* Subtle pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {patternIdx === 0 && (
            <pattern id={`p-${hash}`} width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="1" fill="white" />
            </pattern>
          )}
          {patternIdx === 1 && (
            <pattern id={`p-${hash}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 20L20 0M-5 5L5 -5M15 25L25 15" stroke="white" strokeWidth="0.4" />
            </pattern>
          )}
          {patternIdx === 2 && (
            <pattern id={`p-${hash}`} width="28" height="28" patternUnits="userSpaceOnUse">
              <rect x="4" y="4" width="20" height="20" rx="4" fill="none" stroke="white" strokeWidth="0.4" />
            </pattern>
          )}
        </defs>
        <rect width="100%" height="100%" fill={`url(#p-${hash})`} />
      </svg>

      {/* Soft glow */}
      <div className="absolute bottom-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-[0.08] bg-white" />

      {/* Icon */}
      <div className="relative z-10 mb-4 group-hover:scale-105 transition-transform duration-300">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/[0.08] bg-white/[0.05]">
          <IconComponent size={24} strokeWidth={1.5} className="text-white/50" />
        </div>
      </div>

      {/* Title */}
      <div className="relative z-10 px-5 text-center max-w-[90%]">
        <p className="text-white/80 text-[13px] font-medium leading-snug line-clamp-2">
          {script.title}
        </p>
        {script.genre && (
          <p className="text-white/25 text-[10px] font-medium mt-2 uppercase tracking-[0.15em]">
            {script.genre}
          </p>
        )}
      </div>

      {/* Bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
};


const ScriptCard = ({ script, index = 0 }) => {
  const { isDarkMode: dark } = useDarkMode();
  const [imgError, setImgError] = useState(false);
  if (!script) return null;

  const showPlaceholder = !script.coverImage || imgError;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="h-full"
    >
      <Link to={`/reader/script/${script._id}`} className="group block h-full">
          <div className={`rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col h-full ${dark ? "bg-[#101e30] border-[#182840] hover:shadow-xl hover:shadow-[#020609]/20 hover:border-[#1d3350]" : "bg-white border-gray-100/80 hover:shadow-xl hover:shadow-gray-200/60 hover:border-gray-200"}`}>
          {/* Cover */}
          <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
            {showPlaceholder ? (
              <PlaceholderCover script={script} />
            ) : (
              <img
                src={script.coverImage}
                alt={script.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              />
            )}
            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
              {script.premium && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-md border border-amber-200/60">
                  PREMIUM
                </span>
              )}
              {script.isFeatured && (
                <span className="px-2 py-0.5 bg-violet-50 text-violet-600 text-[10px] font-semibold rounded-md border border-violet-200/60">
                  FEATURED
                </span>
              )}
            </div>
            {script.rating > 0 && (
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-md text-xs font-medium text-gray-700 flex items-center gap-1 border border-gray-100/50">
                <svg className="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {(script.rating || 0).toFixed(1)}
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <span className="text-white font-medium text-sm flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Read Now
              </span>
            </div>
          </div>
          {/* Info */}
          <div className="p-3.5 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              {script.creator?.profileImage ? (
                <img src={script.creator.profileImage} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium shrink-0 ${dark ? "bg-white/[0.06] text-gray-400" : "bg-gray-100 text-gray-400"}`}>
                  {script.creator?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <span className="text-[11px] text-gray-400 font-normal truncate">{script.creator?.name || "Unknown"}</span>
            </div>
            <h3 className={`font-semibold text-sm leading-snug mb-1 line-clamp-2 group-hover:text-[#1e3a5f] transition-colors ${dark ? "text-gray-100" : "text-gray-800"}`}>
              {script.title}
            </h3>
            {script.logline && (
              <p className="text-xs text-gray-400 line-clamp-2 mb-2 font-normal leading-relaxed">{script.logline}</p>
            )}
            <div className="flex-1" />
            <div className={`flex items-center justify-between mt-1.5 pt-2 border-t ${dark ? "border-[#182840]" : "border-gray-50"}`}>
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs text-gray-500 font-medium">{(script.rating || 0).toFixed(1)}</span>
                <span className="text-[10px] text-gray-300 ml-0.5">({script.reviewCount || 0})</span>
              </div>
              {script.genre && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${dark ? "bg-white/[0.06] text-gray-400 border-[#1d3350]" : "bg-gray-50 text-gray-400 border-gray-100"}`}>{script.genre}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ScriptCard;
