import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import ScriptCard from "./ScriptCard";

const FeaturedSection = () => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await api.get("/scripts/featured");
        setScripts(data);
      } catch { setScripts([]); }
      setLoading(false);
    };
    fetchFeatured();
  }, []);

  // Auto-rotate hero
  useEffect(() => {
    if (scripts.length < 2) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % Math.min(scripts.length, 5)), 5000);
    return () => clearInterval(t);
  }, [scripts.length]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (scripts.length === 0) return null;

  const hero = scripts[heroIdx] || scripts[0];

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Featured Projects</h2>
        <Link to="/reader/featured" className="text-sm font-bold text-[#1e3a5f] hover:underline">View all →</Link>
      </div>

      {/* Hero Banner */}
      <div className="relative h-64 md:h-72 rounded-2xl overflow-hidden mb-6">
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
              <img src={hero.coverImage} alt={hero.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-end p-6 md:p-8">
              <div className="max-w-lg">
                <div className="flex gap-2 mb-3">
                  {hero.genre && <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-md text-xs font-bold text-white">{hero.genre}</span>}
                  <span className="px-2.5 py-1 bg-amber-500/80 backdrop-blur-sm rounded-md text-xs font-bold text-white">⭐ Featured</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">{hero.title}</h3>
                {hero.logline && <p className="text-white/70 text-sm font-medium line-clamp-2 mb-4">{hero.logline}</p>}
                <Link to={`/reader/script/${hero._id}`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#1e3a5f] rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">
                  Read Now
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        {/* Dots */}
        {scripts.length > 1 && (
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {scripts.slice(0, 5).map((_, i) => (
              <button key={i} onClick={() => setHeroIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === heroIdx ? "bg-white w-5" : "bg-white/40 hover:bg-white/60"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {scripts.slice(0, 8).map((s, i) => (
          <ScriptCard key={s._id} script={s} index={i} />
        ))}
      </div>
    </section>
  );
};

export default FeaturedSection;
