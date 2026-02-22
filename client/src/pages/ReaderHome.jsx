import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
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
      <div className="max-w-6xl mx-auto px-4 space-y-14 mt-2">
        {/* Featured */}
        <FeaturedSection />

        {/* Top Projects */}
        <TopProjects />

        {/* Latest Scripts */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h2 className="text-xl font-semibold text-gray-800 tracking-tight">Latest Scripts</h2>
          </div>
          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${activeCategory === "all"
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-400 border-gray-150 hover:border-gray-300 hover:text-gray-600"
                }`}
            >
              All
            </button>
            {categories.contentTypes.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all capitalize border ${activeCategory === c
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-400 border-gray-150 hover:border-gray-300 hover:text-gray-600"
                  }`}
              >
                {c.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => <div key={i} className="h-64 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredLatest.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredLatest.map((s, i) => <ScriptCard key={s._id} script={s} index={i} />)}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9.75m3.75 3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-gray-400 font-normal text-sm">No scripts found</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReaderHome;
