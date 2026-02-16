import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { SlidersHorizontal, Play, X, Info, Heart } from "lucide-react";

const SmartMatch = () => {
  const { user } = useContext(AuthContext);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [preferences, setPreferences] = useState({
    genres: [],
    contentTypes: [],
    budgetRange: { min: 0, max: 1000000 },
  });
  const [showPrefs, setShowPrefs] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);

  const genres = ["Drama", "Comedy", "Thriller", "Horror", "Action", "Romance", "Sci-Fi", "Fantasy", "Documentary", "Animation"];
  const contentTypes = ["movie", "tv_series", "anime", "documentary", "short_film", "web_series", "book", "startup"];

  useEffect(() => { fetchMatches(); }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/match");
      setMatches(data.matches || []);
    } catch (error) {
      console.error("Error fetching matches:", error);
      // Demo data
      setMatches([
        {
          script: {
            _id: "demo1", title: "The Last Detective", genre: "Thriller", contentType: "movie",
            description: "A retired detective is pulled back into action when a serial killer begins recreating crimes from his past cases.",
            trailerThumbnail: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=800",
            trailerStatus: "ready", views: 1240, price: 150,
            scriptScore: { overall: 87, plot: 90, characters: 85, dialogue: 88, pacing: 82, marketability: 90 },
            creator: { _id: "c1", name: "Sarah Mitchell", profileImage: "", role: "creator" },
            roles: [{ characterName: "Det. Marcus Cole", type: "Rough, older, like Liam Neeson", description: "Retired detective, haunted by past" }],
            holdStatus: "available",
          },
          matchScore: 95,
          matchReasons: ["Matches your interest in Thriller", "High script score: 87/100", "Has AI-generated trailer preview"],
        },
        {
          script: {
            _id: "demo2", title: "Neon Dreams", genre: "Sci-Fi", contentType: "tv_series",
            description: "In 2089, a young hacker discovers that the virtual reality everyone lives in is actually a prison designed by an AI overlord.",
            trailerThumbnail: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800",
            trailerStatus: "ready", views: 890, price: 200,
            scriptScore: { overall: 78, plot: 82, characters: 75, dialogue: 80, pacing: 70, marketability: 83 },
            creator: { _id: "c2", name: "Alex Chen", profileImage: "", role: "creator" },
            roles: [{ characterName: "Kai", type: "Young, rebellious, tech-savvy", description: "Teenage hacker who uncovers the truth" }],
            holdStatus: "available",
          },
          matchScore: 88,
          matchReasons: ["Matches your interest in Sci-Fi", "2 roles attached", "New script in your area of interest"],
        },
        {
          script: {
            _id: "demo3", title: "Whispers in the Dark", genre: "Horror", contentType: "movie",
            description: "A family moves into a century-old mansion only to discover that the previous owners never truly left.",
            trailerThumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800",
            trailerStatus: "ready", views: 650, price: 100,
            scriptScore: { overall: 72, plot: 75, characters: 68, dialogue: 72, pacing: 78, marketability: 67 },
            creator: { _id: "c3", name: "Jordan Blake", profileImage: "", role: "creator" },
            roles: [],
            holdStatus: "available",
          },
          matchScore: 82,
          matchReasons: ["Matches your interest in Horror", "Has AI-generated trailer preview"],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (action) => {
    setSwipeDirection(action === "like" ? "right" : "left");
    try {
      const current = matches[currentIndex];
      await api.post("/match/swipe", { scriptId: current.script._id, action });
    } catch (e) { /* silent */ }
    
    setTimeout(() => {
      setSwipeDirection(null);
      setCurrentIndex(prev => prev + 1);
    }, 300);
  };

  const handleUpdatePreferences = async () => {
    try {
      await api.put("/match/preferences", preferences);
      setShowPrefs(false);
      fetchMatches();
    } catch (e) { console.error(e); }
  };

  const toggleGenre = (genre) => {
    setPreferences(p => ({
      ...p,
      genres: p.genres.includes(genre) ? p.genres.filter(g => g !== genre) : [...p.genres, genre]
    }));
  };

  const toggleContentType = (type) => {
    setPreferences(p => ({
      ...p,
      contentTypes: p.contentTypes.includes(type) ? p.contentTypes.filter(t => t !== type) : [...p.contentTypes, type]
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-3 border-[#c3d5e8] border-t-[#0f2544] rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentMatch = matches[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <span className="text-3xl">🎯</span> Smart Match
          </h1>
          <p className="text-sm text-gray-500 mt-1">Scripts matched to your preferences. Swipe right to connect.</p>
        </div>
        <button onClick={() => setShowPrefs(!showPrefs)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition flex items-center gap-2">
          <SlidersHorizontal size={16} />
          Preferences
        </button>
      </div>

      {/* Preferences Panel */}
      <AnimatePresence>
        {showPrefs && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 overflow-hidden">
            <h3 className="text-sm font-bold text-gray-800 mb-3">PREFERRED GENRES</h3>
            <div className="flex flex-wrap gap-2 mb-5">
              {genres.map(g => (
                <button key={g} onClick={() => toggleGenre(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    preferences.genres.includes(g) ? "bg-[#0f2544] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>{g}</button>
              ))}
            </div>
            <h3 className="text-sm font-bold text-gray-800 mb-3">CONTENT TYPE</h3>
            <div className="flex flex-wrap gap-2 mb-5">
              {contentTypes.map(t => (
                <button key={t} onClick={() => toggleContentType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition capitalize ${
                    preferences.contentTypes.includes(t) ? "bg-[#1a365d] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>{t.replace("_", " ")}</button>
              ))}
            </div>
            <button onClick={handleUpdatePreferences}
              className="w-full py-2.5 bg-[#0f2544] text-white rounded-xl text-sm font-medium hover:bg-[#1a365d] transition">
              Apply Preferences & Reload Matches
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Card */}
      {currentMatch ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMatch.script._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, scale: 1, 
              x: swipeDirection === "right" ? 300 : swipeDirection === "left" ? -300 : 0,
              rotate: swipeDirection === "right" ? 15 : swipeDirection === "left" ? -15 : 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden"
          >
            {/* Trailer/Cover Image */}
            <div className="relative h-64 sm:h-80 bg-gray-900">
              {currentMatch.script.trailerThumbnail ? (
                <img src={currentMatch.script.trailerThumbnail} alt="" className="w-full h-full object-cover opacity-80" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#060e1a] to-[#0a1628] flex items-center justify-center">
                  <span className="text-6xl">🎬</span>
                </div>
              )}
              {/* Match score badge */}
              <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                {currentMatch.matchScore}% Match
              </div>
              {currentMatch.script.trailerStatus === "ready" && (
                <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <Play size={16} fill="currentColor" />
                  AI Trailer Available
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              {/* Title overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h2 className="text-2xl font-extrabold text-white mb-1">{currentMatch.script.title}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="bg-white/20 px-2 py-0.5 rounded-lg">{currentMatch.script.genre}</span>
                  <span className="capitalize">{currentMatch.script.contentType?.replace("_", " ")}</span>
                  <span>{currentMatch.script.views?.toLocaleString() || 0} views</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Creator info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0f2544] to-[#1a365d] flex items-center justify-center text-white font-bold text-sm">
                  {currentMatch.script.creator?.name?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{currentMatch.script.creator?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{currentMatch.script.creator?.role}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-lg font-bold text-[#0f2544]">${currentMatch.script.price}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">to unlock</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-700 leading-relaxed mb-4">{currentMatch.script.description}</p>

              {/* Script Score */}
              {currentMatch.script.scriptScore?.overall && (
                <div className="bg-gradient-to-r from-[#edf2f7] to-[#f0f4f8] rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Script Score</span>
                    <span className="text-2xl font-extrabold text-[#0f2544]">{currentMatch.script.scriptScore.overall}/100</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {["plot", "characters", "dialogue", "pacing", "marketability"].map(key => (
                      <div key={key} className="text-center">
                        <div className="text-xs font-bold text-gray-900">{currentMatch.script.scriptScore[key]}</div>
                        <div className="text-[10px] text-gray-500 capitalize">{key}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Roles attached */}
              {currentMatch.script.roles?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    🎭 {currentMatch.script.roles.length} Role(s) Attached
                  </p>
                  {currentMatch.script.roles.slice(0, 3).map((role, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <span className="text-[#0f2544] font-semibold">{role.characterName}</span>
                      <span className="text-gray-400">—</span>
                      <span className="text-gray-500">{role.type || role.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Match reasons */}
              <div className="border-t border-gray-100 pt-3 mb-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Why this matches you</p>
                <div className="flex flex-wrap gap-2">
                  {currentMatch.matchReasons?.map((reason, i) => (
                    <span key={i} className="bg-green-50 text-green-700 px-2.5 py-1 rounded-lg text-xs font-medium">{reason}</span>
                  ))}
                </div>
              </div>

              {/* Swipe buttons */}
              <div className="flex items-center justify-center gap-6">
                <button onClick={() => handleSwipe("pass")}
                  className="w-16 h-16 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:scale-110 transition-all shadow-md">
                  <X size={32} strokeWidth={2.5} />
                </button>
                <Link to={`/script/${currentMatch.script._id}`}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 hover:scale-110 transition-all shadow-md">
                  <Info size={24} />
                </Link>
                <button onClick={() => handleSwipe("like")}
                  className="w-16 h-16 flex items-center justify-center rounded-full bg-green-50 text-green-500 hover:bg-green-100 hover:scale-110 transition-all shadow-md">
                  <Heart size={32} fill="currentColor" />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No more matches right now</h2>
          <p className="text-sm text-gray-500 mb-6">Update your preferences or check back later for new scripts.</p>
          <button onClick={() => { setCurrentIndex(0); fetchMatches(); }}
            className="px-6 py-2.5 bg-[#0f2544] text-white rounded-xl text-sm font-medium hover:bg-[#1a365d] transition">
            Refresh Matches
          </button>
        </div>
      )}

      {/* Progress indicator */}
      {matches.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-xs text-gray-500">{Math.min(currentIndex + 1, matches.length)} of {matches.length}</span>
          <div className="flex gap-1">
            {matches.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition ${
                i < currentIndex ? "bg-green-400" : i === currentIndex ? "bg-[#0f2544]" : "bg-gray-200"
              }`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartMatch;
