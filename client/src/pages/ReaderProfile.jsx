import { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import ScriptCard from "../components/ScriptCard";
import ReviewCard from "../components/ReviewCard";

const ReaderProfile = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("read");
  const [readScripts, setReadScripts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const profileId = id || user?._id;
  const isOwnProfile = !id || id === user?._id;

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5001${url}`;
  };

  useEffect(() => { fetchProfile(); }, [profileId]);
  useEffect(() => { if (profileId) fetchTabData(); }, [activeTab, profileId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/users/${profileId}`);
      setProfile(data);
    } catch { setProfile(null); }
    finally { setLoading(false); }
  };

  const fetchTabData = async () => {
    try {
      setDataLoading(true);
      if (activeTab === "read" || activeTab === "favorites") {
        const { data } = await api.get(`/users/${profileId}`);
        const arr = activeTab === "read" ? data.scriptsRead : data.favoriteScripts;
        if (arr?.length) {
          const scripts = await Promise.all(
            arr.slice(0, 20).map(async (sId) => {
              try {
                const s = typeof sId === "object" ? sId : (await api.get(`/scripts/${sId}`)).data;
                return s;
              } catch { return null; }
            })
          );
          if (activeTab === "read") setReadScripts(scripts.filter(Boolean));
          else setFavorites(scripts.filter(Boolean));
        } else {
          if (activeTab === "read") setReadScripts([]);
          else setFavorites([]);
        }
      } else if (activeTab === "reviews") {
        const { data } = await api.get(`/users/${profileId}`);
        if (data.scriptsRead?.length) {
          const allReviews = [];
          for (const sId of data.scriptsRead.slice(0, 20)) {
            try {
              const scriptId = typeof sId === "object" ? sId._id : sId;
              const res = await api.get(`/reviews/${scriptId}`);
              const userRevs = (res.data.reviews || res.data).filter((r) => r.user?._id === profileId);
              allReviews.push(...userRevs);
            } catch { /* skip */ }
          }
          setReviews(allReviews);
        } else { setReviews([]); }
      }
    } catch { /* silent */ }
    finally { setDataLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400 font-bold text-lg">Profile not found</p>
      <Link to="/reader" className="text-sm font-bold text-[#1e3a5f] hover:underline">← Back to Reader</Link>
    </div>
  );

  const stats = [
    { label: "Scripts Read", value: profile.scriptsRead?.length || 0 },
    { label: "Favorites", value: profile.favoriteScripts?.length || 0 },
    { label: "Reviews", value: reviews?.length || 0 },
  ];

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f2337] via-[#1e3a5f] to-[#2d5a8e]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-12 md:py-16">
          <Link to="/reader" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm font-bold mb-8 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back to Reader
          </Link>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {profile.profileImage ? (
              <img src={resolveImage(profile.profileImage)} alt={profile.name} className="w-28 h-28 rounded-3xl object-cover ring-4 ring-white/20 shadow-2xl" />
            ) : (
              <div className="w-28 h-28 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center text-4xl font-black text-white/80 ring-4 ring-white/20 shadow-2xl">
                {profile.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl md:text-4xl font-black text-white mb-1">{profile.name}</h1>
              <p className="text-white/50 font-bold text-sm mb-3 capitalize">{profile.role || "Reader"}</p>
              {profile.bio && <p className="text-white/60 font-medium max-w-lg mb-4">{profile.bio}</p>}
              <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-black text-white">{s.value}</p>
                    <p className="text-xs text-white/40 font-bold">{s.label}</p>
                  </div>
                ))}
              </div>
              {isOwnProfile && (
                <Link to="/settings" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                  Edit Profile
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-md">
          {[{ key: "read", label: "Scripts Read" }, { key: "favorites", label: "Favorites" }, { key: "reviews", label: "Reviews" }].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === tab.key ? "bg-white text-[#1e3a5f] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 mt-8">
        <AnimatePresence mode="wait">
          {dataLoading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-100 rounded-2xl h-72 animate-pulse" />)}
            </motion.div>
          ) : (
            <>
              {activeTab === "read" && (
                <motion.div key="read" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  {readScripts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {readScripts.map((s) => <ScriptCard key={s._id} script={s} />)}
                    </div>
                  ) : (
                    <EmptyState title="No scripts read yet" subtitle={isOwnProfile ? "Start exploring and reading scripts!" : "No scripts read yet."} />
                  )}
                </motion.div>
              )}
              {activeTab === "favorites" && (
                <motion.div key="favorites" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  {favorites.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {favorites.map((s) => <ScriptCard key={s._id} script={s} />)}
                    </div>
                  ) : (
                    <EmptyState title="No favorites yet" subtitle={isOwnProfile ? "Favorite scripts to save them here!" : "No favorites yet."} />
                  )}
                </motion.div>
              )}
              {activeTab === "reviews" && (
                <motion.div key="reviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  {reviews.length > 0 ? (
                    <div className="space-y-4 max-w-2xl">
                      {reviews.map((r) => (
                        <div key={r._id}>
                          {r.script && (
                            <Link to={`/reader/script/${r.script._id || r.script}`} className="text-xs font-bold text-[#1e3a5f] hover:underline mb-1 block">
                              {r.script.title || "View Script"}
                            </Link>
                          )}
                          <ReviewCard review={r} currentUserId={user?._id} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No reviews yet" subtitle={isOwnProfile ? "Start reviewing scripts you've read!" : "No reviews yet."} />
                  )}
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const EmptyState = ({ title, subtitle }) => (
  <div className="text-center py-16">
    <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
    <p className="text-gray-400 font-bold text-lg">{title}</p>
    <p className="text-gray-300 text-sm font-medium mt-1">{subtitle}</p>
  </div>
);

export default ReaderProfile;
