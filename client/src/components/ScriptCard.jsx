import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useDarkMode } from "../context/DarkModeContext";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  getScriptCompletionBadgeClasses,
  getScriptCompletionProgressText,
  getScriptCompletionStatusLabel,
} from "../utils/scriptCompletion";
import {
  Drama, Laugh, Crosshair, Skull, Heart, Flame, Atom, Wand2,
  Search, Clapperboard, Sparkles, ScrollText, Swords, Globe,
  Music, BookOpen, Eye
} from "lucide-react";

const genreIcons = {
  drama: Drama, comedy: Laugh, thriller: Crosshair, horror: Skull,
  romance: Heart, action: Flame, sci_fi: Atom, fantasy: Wand2,
  mystery: Search, documentary: Clapperboard, animation: Sparkles,
  historical: Globe, war: Swords, musical: Music, biography: BookOpen,
  crime: Crosshair,
};

const getIcon = (genre) => {
  const key = (genre || "").toLowerCase().replace(/[\s-]/g, "_");
  return genreIcons[key] || ScrollText;
};

const StarSvg = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" className="fill-amber-400 text-amber-400 shrink-0">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/* ─── Placeholder (no cover image) ─── */
const PlaceholderCover = ({ script, dark }) => {
  const IconComponent = getIcon(script.genre);
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-3 ${dark ? "bg-[#141c2b]" : "bg-[#f0f3f8]"}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${dark ? "bg-[#1e2a3e] border border-[#2a3a52]" : "bg-white border border-gray-200 shadow-sm"}`}>
        <IconComponent size={26} strokeWidth={1.5} className={dark ? "text-gray-500" : "text-gray-400"} />
      </div>
      <h4 className={`text-sm font-bold text-center px-4 leading-tight line-clamp-2 ${dark ? "text-gray-200" : "text-gray-700"}`}>
        {script.title}
      </h4>
      {script.genre && (
        <span className={`text-[9px] font-bold uppercase tracking-[0.18em] ${dark ? "text-gray-600" : "text-gray-400"}`}>
          {script.genre}
        </span>
      )}
    </div>
  );
};

const ScriptCard = ({ script, index = 0 }) => {
  const { isDarkMode: dark } = useDarkMode();
  const [imgErr, setImgErr] = useState(false);
  if (!script) return null;

  const coverImage = resolveMediaUrl(script.coverImage);
  const creatorImage = resolveMediaUrl(script.creator?.profileImage);
  const noImage = !coverImage || imgErr;
  const rating = script.rating || script.scriptScore?.overall || 0;
  const reviewCount = script.reviewCount || 0;
  const views = script.views || 0;
  const hasPaidPrice = Boolean(script?.premium) && Number(script?.price || 0) > 0;
  const priceText = hasPaidPrice ? `\u20b9${Number(script.price).toLocaleString("en-IN")}` : "Free";
  const completionLabel = getScriptCompletionStatusLabel(script);
  const completionProgress = getScriptCompletionProgressText(script);
  const completionBadgeCls = getScriptCompletionBadgeClasses(script, dark);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="h-full"
    >
      <Link to={`/reader/script/${script._id}`} className="group block h-full">
        <div
          className={`
            rounded-2xl overflow-hidden flex flex-col h-full
            transition-all duration-300
            hover:-translate-y-1
            ${dark
              ? "bg-[#141c2b] border border-[#1e2a3e] hover:border-[#2e4060] hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
              : "bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
            }
          `}
        >
          {/* ── Cover ── */}
          <div className="relative" style={{ aspectRatio: "16/10" }}>
            {noImage ? (
              <PlaceholderCover script={script} dark={dark} />
            ) : (
              <>
                <img
                  src={coverImage}
                  alt={script.title}
                  onError={() => setImgErr(true)}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />

              </>
            )}

            {/* Badges row */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between z-10">
              {/* Left badges */}
              <div className="flex flex-col gap-1.5">
                {script.isFeatured && (
                  <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[9px] font-bold tracking-wide uppercase bg-violet-600 text-white">
                    + Featured
                  </span>
                )}
              </div>
              {/* Right: rating */}
              {rating > 0 && (
                <div className={`flex items-center gap-1 px-2 py-[3px] rounded-md text-[11px] font-bold ${dark ? "bg-[#141c2b]/80 backdrop-blur text-amber-400" : "bg-white/90 backdrop-blur text-amber-600"}`}>
                  <StarSvg size={11} />
                  {rating.toFixed(1)}
                </div>
              )}
            </div>
          </div>

          {/* ── Info ── */}
          <div className="flex flex-col flex-1 px-3.5 pt-2.5 pb-2">
            {/* Genre + read time */}
            {script.genre && (
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-[2px] rounded ${dark ? "bg-violet-500/20 text-violet-400" : "bg-violet-50 text-violet-600"}`}>
                  {script.genre}
                </span>
                {script.pageCount && (
                  <span className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>• {Math.ceil(script.pageCount / 1.5)} min read</span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-[2px] rounded ${completionBadgeCls}`}>
                {completionLabel}
              </span>
              {completionProgress && (
                <span className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  {completionProgress}
                </span>
              )}
            </div>

            {/* Author */}
            <div className="flex items-center gap-2 mb-1">
              {creatorImage ? (
                <img src={creatorImage} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
              ) : (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${dark ? "bg-[#1e2a3e] text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                  {script.creator?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <span className={`text-[11px] truncate ${dark ? "text-gray-500" : "text-gray-400"}`}>
                {script.creator?.name || "Unknown"}
              </span>
            </div>

            {/* Title */}
            <h3 className={`text-[13px] font-bold leading-snug line-clamp-1 mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>
              {script.title}
            </h3>

            {/* Logline */}
            {script.logline && (
              <p className={`text-[11px] leading-relaxed line-clamp-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                {script.logline}
              </p>
            )}

            <div className="flex-1" />

            {/* Footer stats */}
            <div className={`mt-2 pt-2 border-t ${dark ? "border-[#1e2a3e]" : "border-gray-100"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1 shrink-0">
                    <StarSvg size={11} />
                    <span className={`text-[11px] font-semibold ${dark ? "text-gray-300" : "text-gray-600"}`}>{rating.toFixed(1)}</span>
                    {reviewCount > 0 && (
                      <span className={`text-[10px] ${dark ? "text-gray-600" : "text-gray-400"}`}>({reviewCount})</span>
                    )}
                  </div>
                  {views > 0 && (
                    <div className={`flex items-center gap-1 shrink-0 ${dark ? "text-gray-600" : "text-gray-400"}`}>
                      <Eye size={11} strokeWidth={2} />
                      <span className="text-[10px] font-medium">{fmt(views)}</span>
                    </div>
                  )}
                </div>

                <span className={`shrink-0 text-[11px] font-bold tabular-nums ${hasPaidPrice ? (dark ? "text-white" : "text-gray-900") : (dark ? "text-[#8fa3b8]" : "text-gray-500")}`}>
                  {priceText}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ScriptCard;
