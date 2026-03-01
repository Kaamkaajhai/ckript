import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";
import ScriptCard from "./ScriptCard";

const SORT_TABS = [
  { key: "featured", label: "Featured" },
  { key: "rating", label: "Highest Rated" },
  { key: "reads", label: "Most Read" },
];

const TrendingProjects = () => {
  const { isDarkMode: dark } = useDarkMode();
  const [activeTab, setActiveTab] = useState("featured");

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
        setFeaturedScripts(data);
      } catch {
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
  const isLoading =
    activeTab === "featured" ? featuredLoading : topLoading[activeTab];
  const scripts =
    activeTab === "featured"
      ? featuredScripts.slice(0, 8)
      : topScripts[activeTab] || [];

  return (
    <section>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2
          className={`text-xl font-semibold tracking-tight ${dark ? "text-gray-100" : "text-gray-800"
            }`}
        >
          Trending Projects
        </h2>
        <div
          className={`flex gap-0.5 border rounded-lg p-0.5 ${dark ? "border-[#182840]" : "border-gray-100"
            }`}
        >
          {SORT_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === t.key
                  ? "bg-gray-800 text-white"
                  : dark
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-400 hover:text-gray-600"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Banner — visible only on Featured tab */}
      {activeTab === "featured" &&
        !featuredLoading &&
        featuredScripts.length > 0 && (
          <div className="relative h-56 md:h-64 rounded-xl overflow-hidden mb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={heroIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                {hero.coverImage ? (
                  <img
                    src={hero.coverImage}
                    alt={hero.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex items-end p-6 md:p-8">
                  <div className="max-w-lg">
                    <div className="flex gap-2 mb-3">
                      {hero.genre && (
                        <span className="px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-md text-xs font-medium text-white/90">
                          {hero.genre}
                        </span>
                      )}
                      <span className="px-2.5 py-1 bg-amber-500/20 backdrop-blur-sm rounded-md text-xs font-medium text-amber-200">
                        Featured
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-semibold text-white mb-1.5">
                      {hero.title}
                    </h3>
                    {hero.logline && (
                      <p className="text-white/60 text-sm font-normal line-clamp-2 mb-4">
                        {hero.logline}
                      </p>
                    )}
                    <Link
                      to={`/reader/script/${hero._id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                    >
                      Read Now
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            {/* Dots */}
            {featuredScripts.length > 1 && (
              <div className="absolute bottom-3 right-4 flex gap-1.5">
                {featuredScripts.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === heroIdx
                        ? "bg-white w-5"
                        : "bg-white/40 w-1.5 hover:bg-white/60"
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
            <ScriptCard key={s._id} script={s} index={i} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400 font-normal py-8">
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
