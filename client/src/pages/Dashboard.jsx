import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import ProjectCard from "../components/ProjectCard";
import { AuthContext } from "../context/AuthContext";
import { FileText, Plus } from "lucide-react";

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [myScripts, setMyScripts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scriptsRes, statsRes] = await Promise.allSettled([
        api.get("/scripts"),
        api.get("/dashboard"),
      ]);

      if (scriptsRes.status === "fulfilled") {
        const mine = scriptsRes.value.data.filter(
          (s) => s.creator?._id === user?._id || s.creator === user?._id
        );
        setMyScripts(mine);
      } else {
        setMyScripts([]);
      }

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      } else {
        // Demo stats
        setStats({
          totalScripts: 3, totalEarnings: 450, totalUnlocks: 12, holdEarnings: 360,
          totalViews: 1247, trailersGenerated: 2, scoredScripts: 3, avgScore: 84,
          auditionCount: 15, activeHolds: 1, scriptScoreCredits: 5, plan: "free",
        });
      }
    } catch { } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-3 border-[#c3d5e8] border-t-[#0f2544] rounded-full animate-spin"></div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: "Total Views", value: stats.totalViews || 0, icon: "👁️", color: "from-[#0f2544] to-[#1a365d]" },
    { label: "Earnings", value: `$${(stats.totalEarnings || 0) + (stats.holdEarnings || 0)}`, icon: "💰", color: "from-green-500 to-emerald-500" },
    { label: "Hold Earnings", value: `$${stats.holdEarnings || 0}`, icon: "🔒", color: "from-[#0f2544] to-[#1a365d]" },
    { label: "Unlocks", value: stats.totalUnlocks || 0, icon: "🔓", color: "from-[#0f2544] to-[#1a365d]" },
    { label: "AI Trailers", value: stats.trailersGenerated || 0, icon: "🎬", color: "from-[#0f2544] to-[#1a365d]" },
    { label: "Avg Score", value: stats.avgScore || "N/A", icon: "📊", color: "from-[#0f2544] to-[#1a365d]" },
    { label: "Auditions", value: stats.auditionCount || 0, icon: "🎭", color: "from-[#0f2544] to-[#1a365d]" },
    { label: "Active Holds", value: stats.activeHolds || 0, icon: "⏳", color: "from-[#0f2544] to-[#1a365d]" },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Page heading */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            MY DASHBOARD
          </h1>
          {stats?.plan && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              stats.plan === "pro" ? "bg-[#edf2f7] text-[#0a1628]" : "bg-gray-100 text-gray-600"
            }`}>
              {stats.plan === "pro" ? "⭐ Pro" : "Free Plan"}
            </span>
          )}
        </div>

        {/* Stats grid */}
        {statCards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {statCards.map((card, idx) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{card.icon}</span>
                  <span className="text-xs text-gray-500 font-medium">{card.label}</span>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900">{card.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link to="/upload"
            className="px-5 py-2.5 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-xl text-sm font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition shadow-md flex items-center gap-2">
            ➕ Add Project
          </Link>
          <Link to="/smart-match"
            className="px-5 py-2.5 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-xl text-sm font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition shadow-md flex items-center gap-2">
            🎯 Smart Match
          </Link>
          <Link to="/auditions"
            className="px-5 py-2.5 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-xl text-sm font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition shadow-md flex items-center gap-2">
            🎭 Auditions
          </Link>
          <Link to="/notifications"
            className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition flex items-center gap-2">
            🔔 Notifications
          </Link>
        </div>

        {/* Section heading */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">MY PROJECTS</h2>

        {/* Projects grid */}
        {myScripts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myScripts.map((script) => (
              <ProjectCard
                key={script._id}
                project={script}
                userName={
                  script.creator?.name?.toUpperCase() ||
                  user?.name?.toUpperCase() ||
                  "UNKNOWN"
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <FileText size={40} className="text-gray-400" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No projects yet</h2>
            <p className="text-gray-500 mb-6">Upload your first script to get started</p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white font-semibold rounded-xl hover:from-[#0a1628] hover:to-[#0f2544] transition-all shadow-md"
            >
              <Plus size={20} />
              ADD PROJECT
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
