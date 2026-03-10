import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Eye, Star, Clock, Zap, Crown, Award } from "lucide-react";
import api from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";

const FeaturedSection = () => {
  const { isDarkMode: dark } = useDarkMode();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // Fetch both featured/premium and trending projects
        const [featuredRes, trendingRes] = await Promise.all([
          api.get("/scripts/featured"),
          api.get("/scripts?sort=views&limit=8").catch(() => ({ data: [] }))
        ]);
        
        const featured = featuredRes.data || [];
        const trending = Array.isArray(trendingRes.data) 
          ? trendingRes.data 
          : trendingRes.data?.scripts || [];
        
        // Prioritize premium/featured, then add trending
        const sponsored = featured.filter(s => s.premium || s.isFeatured);
        const fallbackTrending = trending.filter(s => 
          !sponsored.find(sp => sp._id === s._id)
        );
        
        // Combine: sponsored first, then trending if needed
        const combined = sponsored.length > 0 
          ? [...sponsored, ...fallbackTrending].slice(0, 12)
          : fallbackTrending.slice(0, 12);
          
        setScripts(combined);
      } catch { 
        setScripts([]); 
      }
      setLoading(false);
    };
    fetchFeatured();
  }, []);

  // Auto-rotate hero every 6 seconds
  useEffect(() => {
    if (scripts.length < 2) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % Math.min(scripts.length, 5)), 6000);
    return () => clearInterval(t);
  }, [scripts.length]);

  // Format numbers
  const fmtNum = (n) => {
    if (!n) return null;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className={`h-72 md:h-96 rounded-2xl animate-pulse ${dark ? "bg-white/[0.04]" : "bg-gray-100"}`} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-80 rounded-2xl animate-pulse ${dark ? "bg-white/[0.04]" : "bg-gray-100"}`} />
          ))}
        </div>
      </div>
    );
  }

  if (scripts.length === 0) return null;

  const hero = scripts[heroIdx] || scripts[0];
  const isSponsored = hero.premium || hero.isFeatured;

  return (
    <section className="mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${dark ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20" : "bg-gradient-to-br from-amber-50 to-orange-50"}`}>
            <Sparkles size={20} className={dark ? "text-amber-400" : "text-amber-600"} strokeWidth={2} />
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>
              Featured & Sponsored
            </h2>
            <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-500"}`}>
              Premium content and trending projects
            </p>
          </div>
        </div>
      </div>

      {/* Hero Promotional Banner */}
      <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden mb-6 group">
        <AnimatePresence mode="wait">
          <motion.div
            key={heroIdx}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {/* Background Image/Gradient */}
            {hero.coverImage ? (
              <img 
                src={hero.coverImage} 
                alt={hero.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
            )}
            
            {/* Overlay Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Animated Border Glow (for sponsored) */}
            {isSponsored && (
              <div className="absolute inset-0 rounded-2xl">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 animate-pulse" />
              </div>
            )}

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10">
              {/* Top Labels */}
              <div className="flex items-start justify-between">
                <div className="flex flex-wrap gap-2">
                  {isSponsored && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-lg"
                    >
                      <Crown size={14} className="text-white" fill="white" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        {hero.premium ? "Premium" : "Sponsored"}
                      </span>
                    </motion.div>
                  )}
                  {hero.genre && (
                    <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg text-xs font-bold text-white/90 border border-white/20">
                      {hero.genre}
                    </span>
                  )}
                  {!isSponsored && (
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-red-500/90 backdrop-blur-md rounded-lg text-xs font-bold text-white">
                      <TrendingUp size={12} />
                      Trending
                    </span>
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-3">
                  {hero.rating > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-white">{hero.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {(hero.readsCount || hero.views) > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                      <Eye size={12} className="text-white/80" />
                      <span className="text-xs font-bold text-white">{fmtNum(hero.readsCount || hero.views)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Content */}
              <div className="max-w-2xl">
                <motion.h3 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-lg"
                >
                  {hero.title}
                </motion.h3>
                
                {hero.logline && (
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-white/80 text-sm md:text-base font-medium line-clamp-2 mb-6 drop-shadow-md max-w-xl"
                  >
                    {hero.logline}
                  </motion.p>
                )}
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <Link 
                    to={`/reader/script/${hero._id}`} 
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <Zap size={16} fill="currentColor" />
                    Read Now
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  
                  {hero.author && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {hero.author.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-white/90">{hero.author.name}</span>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Navigation Dots */}
        {scripts.length > 1 && (
          <div className="absolute bottom-6 right-6 flex gap-2">
            {scripts.slice(0, 5).map((_, i) => (
              <button 
                key={i} 
                onClick={() => setHeroIdx(i)} 
                className={`h-2 rounded-full transition-all ${
                  i === heroIdx 
                    ? "bg-white w-8 shadow-lg" 
                    : "bg-white/40 w-2 hover:bg-white/60"
                }`} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Premium Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {scripts.slice(0, 8).map((s, i) => (
          <PromotionalCard key={s._id} script={s} index={i} dark={dark} />
        ))}
      </div>
    </section>
  );
};

/* Premium Promotional Card Component */
const PromotionalCard = ({ script, index, dark }) => {
  const [imgErr, setImgErr] = useState(false);
  const isSponsored = script.premium || script.isFeatured;

  const fmtNum = (n) => {
    if (!n) return null;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="flex-none"
    >
      <Link to={`/reader/script/${script._id}`} className="group block h-full">
        <div className={`rounded-2xl overflow-hidden flex flex-col transition-all duration-300 relative ${
          isSponsored
            ? dark
              ? "bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-amber-500/30 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 hover:border-amber-500/50"
              : "bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-lg shadow-amber-200/50 hover:shadow-amber-300/60 hover:border-amber-300"
            : dark
            ? "bg-[#0d1e30] border border-[#1a3050] hover:border-violet-500/40"
            : "bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
        }`}>
          {/* Cover Image */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "2/3" }}>
            {!script.coverImage || imgErr ? (
              <div className={`w-full h-full flex items-center justify-center ${
                isSponsored
                  ? "bg-gradient-to-br from-amber-400 to-orange-500"
                  : dark ? "bg-[#0a1828]" : "bg-gray-100"
              }`}>
                <Award size={32} className={isSponsored ? "text-white/60" : dark ? "text-white/20" : "text-gray-300"} strokeWidth={1.5} />
              </div>
            ) : (
              <img 
                src={script.coverImage} 
                alt={script.title}
                onError={() => setImgErr(true)}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
              />
            )}
            
            {/* Sponsored Badge */}
            {isSponsored && (
              <div className="absolute top-2 left-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-lg">
                  <Crown size={10} className="text-white" fill="white" />
                  <span className="text-[9px] font-black text-white uppercase tracking-wide">
                    {script.premium ? "Premium" : "Sponsored"}
                  </span>
                </div>
              </div>
            )}
            
            {/* Trending Badge */}
            {!isSponsored && (script.readsCount || script.views) > 1000 && (
              <div className="absolute top-2 left-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-red-500 rounded-lg shadow-lg">
                  <TrendingUp size={10} className="text-white" />
                  <span className="text-[9px] font-black text-white uppercase">Hot</span>
                </div>
              </div>
            )}
            
            {/* Rating */}
            {script.rating > 0 && (
              <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10">
                <Star size={9} className="text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-bold text-white">{script.rating.toFixed(1)}</span>
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-3 gap-2">
              {(script.readsCount || script.views) > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-white/15 backdrop-blur-sm rounded-full text-[11px] text-white font-bold border border-white/20">
                  <Eye size={10} /> {fmtNum(script.readsCount || script.views)}
                </span>
              )}
              <div className="w-full px-3 py-2 bg-white rounded-lg flex items-center justify-center gap-1.5 font-bold text-sm text-gray-900 shadow-lg">
                <Zap size={14} fill="currentColor" />
                Read Now
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-3 flex-1 flex flex-col">
            <h3 className={`font-bold text-sm line-clamp-2 mb-1 ${
              isSponsored
                ? dark ? "text-amber-100" : "text-amber-900"
                : dark ? "text-gray-100" : "text-gray-800"
            }`}>
              {script.title}
            </h3>
            
            {script.author && (
              <p className={`text-xs mb-2 ${dark ? "text-gray-500" : "text-gray-500"}`}>
                by {script.author.name}
              </p>
            )}
            
            <div className="mt-auto flex items-center justify-between">
              {script.genre && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  isSponsored
                    ? dark ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-amber-100 text-amber-700 border border-amber-300"
                    : dark ? "bg-white/5 text-gray-500 border border-white/10" : "bg-gray-50 text-gray-600 border border-gray-200"
                }`}>
                  {script.genre}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default FeaturedSection;
