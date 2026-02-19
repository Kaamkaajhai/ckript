import { useState, useEffect } from "react";
import api from "../services/api";
import ScriptCard from "./ScriptCard";

const tabs = [
  { key: "rating", label: "Highest Rated" },
  { key: "reads", label: "Most Read" },
  { key: "purchases", label: "Most Purchased" },
];

const TopProjects = () => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSort, setActiveSort] = useState("rating");

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/scripts/top?sort=${activeSort}`);
        setScripts(data);
      } catch { setScripts([]); }
      setLoading(false);
    };
    fetch();
  }, [activeSort]);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Top Projects</h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveSort(t.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSort === t.key ? "bg-white text-[#1e3a5f] shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : scripts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {scripts.map((s, i) => <ScriptCard key={s._id} script={s} index={i} />)}
        </div>
      ) : (
        <p className="text-center text-gray-400 font-bold py-8">No projects found</p>
      )}
    </section>
  );
};

export default TopProjects;
