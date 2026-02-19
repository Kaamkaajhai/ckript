import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import SearchBar from "../components/SearchBar";
import FeaturedSection from "../components/FeaturedSection";
import TopProjects from "../components/TopProjects";
import ScriptCard from "../components/ScriptCard";

const ReaderHome = () => {
  const [latestScripts, setLatestScripts] = useState([]);
  const [categories, setCategories] = useState({ contentTypes: [], genres: [] });
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [latestRes, catRes] = await Promise.all([
          api.get("/scripts/latest"),
          api.get("/scripts/categories"),
        ]);
        setLatestScripts(latestRes.data);
        setCategories(catRes.data);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredLatest = activeCategory === "all"
    ? latestScripts
    : latestScripts.filter((s) => s.contentType === activeCategory || s.genre === activeCategory);

  return (
    <div className="min-h-screen pb-16">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f2337] via-[#1e3a5f] to-[#2d5a8e] -mt-4 pt-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-bold text-white/70 mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Reader Dashboard
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
              Discover Stories That<br />
              <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">Deserve to Be Told</span>
            </h1>
            <p className="text-white/50 text-lg font-medium max-w-xl mx-auto mb-8">
              Explore scripts from talented writers. Read, review, and help bring stories to life.
            </p>
            <SearchBar className="max-w-xl mx-auto" />
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-16 mt-12">
        {/* Featured */}
        <FeaturedSection />

        {/* Top Projects */}
        <TopProjects />

        {/* Latest Scripts */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Latest Scripts</h2>
          </div>
          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === "all" ? "bg-[#1e3a5f] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {categories.contentTypes.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all capitalize ${
                  activeCategory === c ? "bg-[#1e3a5f] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {c.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredLatest.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredLatest.map((s, i) => <ScriptCard key={s._id} script={s} index={i} />)}
            </div>
          ) : (
            <p className="text-center text-gray-400 font-bold py-8">No scripts found</p>
          )}
        </section>

        {/* Browse by Genre */}
        {categories.genres.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6">Browse by Genre</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.genres.map((genre) => (
                <Link
                  key={genre}
                  to={`/reader/search?genre=${encodeURIComponent(genre)}`}
                  className="group p-5 bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl hover:border-[#1e3a5f]/20 hover:shadow-md transition-all text-center"
                >
                  <p className="font-bold text-gray-700 group-hover:text-[#1e3a5f] transition-colors text-sm">{genre}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ReaderHome;
