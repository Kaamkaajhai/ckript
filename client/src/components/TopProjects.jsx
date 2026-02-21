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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="text-xl font-semibold text-gray-800 tracking-tight">Top Projects</h2>
        <div className="flex gap-0.5 border border-gray-100 rounded-lg p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveSort(t.key)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${activeSort === t.key
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-gray-600"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-64 bg-gray-50 rounded-xl animate-pulse" />)}
        </div>
      ) : scripts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {scripts.map((s, i) => <ScriptCard key={s._id} script={s} index={i} />)}
        </div>
      ) : (
        <p className="text-center text-gray-400 font-normal py-8">No projects found</p>
      )}
    </section>
  );
};

export default TopProjects;
