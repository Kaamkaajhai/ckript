import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, ChevronLeft, Clock } from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { getScriptCanonicalPath } from "../utils/scriptPath";
import api from "../services/api";

const ContinueReading = () => {
  const { isDarkMode: dark } = useDarkMode();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const rowRef = useRef(null);

  useEffect(() => {
    api
      .get("/scripts/continue-reading")
      .then((r) => setScripts(r.data || []))
      .catch(() => setScripts([]))
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir) => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  // Don't render if no reading history
  if (!loading && scripts.length === 0) return null;

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <BookOpen size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${dark ? "text-gray-100" : "text-gray-900"}`}>
              Continue Reading
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll(-1)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              dark
                ? "bg-[#182840] hover:bg-[#1d3350] text-gray-400 hover:text-gray-200"
                : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            }`}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => scroll(1)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              dark
                ? "bg-[#182840] hover:bg-[#1d3350] text-gray-400 hover:text-gray-200"
                : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            }`}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Horizontal scroll row */}
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {loading
          ? [...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`flex-none w-56 h-24 rounded-2xl animate-pulse ${dark ? "bg-[#182840]" : "bg-gray-100"}`}
              />
            ))
          : scripts.map((script, i) => (
              <ContinueCard key={script._id} script={script} index={i} dark={dark} />
            ))}
      </div>
    </section>
  );
};

const ContinueCard = ({ script, index, dark }) => {
  const [imgError, setImgError] = useState(false);
  const coverImage = resolveMediaUrl(script.coverImage);
  const showCover = coverImage && !imgError;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex-none w-56"
    >
      <Link
        to={getScriptCanonicalPath(script)}
        className={`group flex gap-3 p-3 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
          dark
            ? "bg-[#101e30] border-[#182840] hover:border-[#1d3350] hover:shadow-lg hover:shadow-[#020609]/30"
            : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-md hover:shadow-gray-100"
        }`}
      >
        {/* Thumbnail */}
        <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 bg-[#0f1c2e]">
          {showCover ? (
            <img
              src={coverImage}
              alt={script.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-[#0f1c2e] to-[#111111] flex items-center justify-center">
              <BookOpen size={16} className="text-white/30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
          <div>
            <p className={`text-xs font-semibold leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors ${dark ? "text-gray-200" : "text-gray-800"}`}>
              {script.title}
            </p>
            {script.genre && (
              <p className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">
                {script.genre}
              </p>
            )}
          </div>
          {/* Progress bar placeholder (50% visual hint) */}
          <div>
            <div className={`h-1 rounded-full overflow-hidden mt-2 ${dark ? "bg-[#182840]" : "bg-gray-100"}`}>
              <div
                className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-400"
                style={{ width: "45%" }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5">
              <Clock size={8} />
              Continue
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ContinueReading;
