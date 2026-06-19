import { useState, useEffect, useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";
import { AuthContext } from "../context/AuthContext";
import {
  hasActiveFilmIndustryProfessionalAccess,
  isIndustryProfessionalWithPersonalEmail,
} from "../utils/industryAccess";
import ScriptCard from "./ScriptCard";
import { getScriptCanonicalPath } from "../utils/scriptPath";

const SORT_TABS = [
  { key: "featured", label: "Featured" },
  { key: "rating", label: "Highest Rated" },
  { key: "reads", label: "Most Read" },
];

const TrendingProjects = () => {
  const { isDarkMode: dark } = useDarkMode();
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("featured");
  const [accessNotice, setAccessNotice] = useState("");
  const accessNoticeTimerRef = useRef(null);

  // Featured state
  const [featuredScripts, setFeaturedScripts] = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  // Top / sorted state
  const [topScripts, setTopScripts] = useState({});
  const [topLoading, setTopLoading] = useState({});

  // Load featured once
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await api.get("/scripts/featured");
        setFeaturedScripts(Array.isArray(data) ? data : data.scripts || []);
      } catch (err) {
        console.error("Featured scripts fetch failed:", err?.response?.data || err?.message || err);
        setFeaturedScripts([]);
      }
      setFeaturedLoading(false);
    };
    fetchFeatured();
  }, []);

  // Auto-rotate hero
  useEffect(() => {
    if (featuredScripts.length < 2) return;
    const t = setInterval(
      () => setHeroIdx((i) => (i + 1) % Math.min(featuredScripts.length, 5)),
      5000
    );
    return () => clearInterval(t);
  }, [featuredScripts.length]);

  // Lazy-load top scripts per sort key when tab is first visited
  useEffect(() => {
    if (activeTab === "featured") return;
    if (topScripts[activeTab] !== undefined) return; // already loaded

    const fetchTop = async () => {
      setTopLoading((prev) => ({ ...prev, [activeTab]: true }));
      try {
        const { data } = await api.get(`/scripts/top?sort=${activeTab}`);
        setTopScripts((prev) => ({ ...prev, [activeTab]: data }));
      } catch {
        setTopScripts((prev) => ({ ...prev, [activeTab]: [] }));
      }
      setTopLoading((prev) => ({ ...prev, [activeTab]: false }));
    };
    fetchTop();
  }, [activeTab]);

  const hero = featuredScripts[heroIdx] || featuredScripts[0];
  const isBlockedViewer =
    isIndustryProfessionalWithPersonalEmail(user) &&
    !hasActiveFilmIndustryProfessionalAccess(user);
  const handleScriptClick = (event) => {
    if (!isBlockedViewer) return;
    event.preventDefault();
    setAccessNotice("Please login with a company email or purchase a plan to open scripts.");
    if (accessNoticeTimerRef.current) window.clearTimeout(accessNoticeTimerRef.current);
    accessNoticeTimerRef.current = window.setTimeout(() => setAccessNotice(""), 3500);
  };
  const isLoading =
    activeTab === "featured" ? featuredLoading : topLoading[activeTab];
  const scripts =
    activeTab === "featured"
      ? featuredScripts.slice(0, 8)
      : topScripts[activeTab] || [];

  return (
    <section>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className={`text-3xl lg:text-4xl font-extrabold tracking-tight ${dark ? "text-gray-100" : "text-gray-900"}`}>
            Trending Projects
          </h2>
          <p className={`text-base mt-1 ${dark ? "text-gray-500" : "text-gray-500"}`}>Discover the most popular scripts right now</p>
        </div>
        <div className={`flex gap-1 border rounded-xl p-1 ${dark ? "border-[#1a3050] bg-[#0e1c2e]" : "border-gray-200 bg-gray-50"}`}>
          {SORT_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === t.key
                  ? dark ? "bg-[#1e3a5f] text-white shadow-sm" : "bg-gray-800 text-white shadow-sm"
                  : dark
                    ? "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {accessNotice && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {accessNotice}
        </div>
      )}

      {/* Hero Banner — visible only on Featured tab */}
      {activeTab === "featured" &&
        !featuredLoading &&
        featuredScripts.length > 0 && (
          <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden mb-8 shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={heroIdx}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0"
              >
                {hero.coverImage ? (
                  <img
                    src={hero.coverImage}
                    alt={hero.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#1e293b]" />
                )}
                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

                <div className="absolute inset-0 flex items-end p-8 md:p-10">
                  <div className="max-w-2xl">
                    <div className="flex gap-2 mb-4">
                      {hero.genre && (
                        <span className="px-3 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-sm font-semibold text-white/90 border border-white/10">
                          {hero.genre}
                        </span>
                      )}
                      <span className="px-3 py-1.5 bg-amber-500/30 backdrop-blur-md rounded-full text-sm font-semibold text-amber-200 border border-amber-400/20">
                        ✦ Featured
                      </span>
                    </div>
                    <h3 className="text-4xl md:text-5xl font-extrabold text-white mb-3 leading-tight drop-shadow-lg">
                      {hero.title}
                    </h3>
                    {hero.logline && (
                      <p className="text-white/75 text-base md:text-lg font-normal line-clamp-2 mb-6 leading-relaxed max-w-2xl">
                        {hero.logline}
                      </p>
                    )}
                    <Link
                      to={getScriptCanonicalPath(hero)}
                      onClick={handleScriptClick}
                      className="inline-flex items-center gap-2.5 px-6 py-3 bg-white text-gray-900 rounded-xl font-bold text-base hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      Read Now
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            {/* Dots */}
            {featuredScripts.length > 1 && (
              <div className="absolute bottom-5 right-6 flex gap-2 items-center">
                {featuredScripts.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIdx(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === heroIdx ? "bg-white w-6 h-2" : "bg-white/40 w-2 h-2 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`h-64 rounded-xl animate-pulse ${dark ? "bg-[#182840]" : "bg-gray-50"
                }`}
            />
          ))}
        </div>
      ) : scripts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {scripts.map((s, i) => (
            <ScriptCard
              key={s._id}
              script={s}
              index={i}
              onClick={handleScriptClick}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 text-base font-medium py-8">
          No projects found
        </p>
      )}

      {/* View all link for featured */}
      {activeTab === "featured" && !featuredLoading && featuredScripts.length > 0 && (
        <div className="mt-4 text-right">
          <Link
            to="/reader/featured"
            className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            View all →
          </Link>
        </div>
      )}
    </section>
  );
};

export default TrendingProjects;
