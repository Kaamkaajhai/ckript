import { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { ChevronLeft, Play } from "lucide-react";

const ScriptDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchScript();
  }, [id]);

  const fetchScript = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/scripts/${id}`);
      setScript(data);
    } catch (error) {
      // Demo fallback
      setScript({
        _id: id,
        title: "The Last Detective",
        description: "A gripping thriller about a retired detective drawn back into one final case that will challenge everything he believes.",
        synopsis: "When a serial killer resurfaces after 20 years, retired detective Marcus Cole is the only one who can stop them. But this time, the killer knows all of Marcus's tricks.",
        genre: "Thriller",
        contentType: "feature_film",
        creator: { _id: "demo", name: "Sarah Mitchell", profileImage: "" },
        price: 149.99,
        premium: true,
        trailerUrl: "",
        trailerStatus: "none",
        scriptScore: {
          overall: 87,
          plot: 90,
          characters: 85,
          dialogue: 88,
          pacing: 82,
          marketability: 92,
          feedback: "Strong commercial potential with a compelling protagonist and tight plot structure.",
          scoredAt: new Date().toISOString(),
        },
        roles: [
          { _id: "r1", characterName: "Det. Marcus Cole", type: "Rough, older, like Liam Neeson", description: "Retired detective, haunted by his past", ageRange: { min: 45, max: 65 }, gender: "Male" },
          { _id: "r2", characterName: "Agent Williams", type: "Professional, sharp", description: "FBI agent assigned to the case", ageRange: { min: 30, max: 50 }, gender: "Female" },
        ],
        holdStatus: "available",
        holdFee: 200,
        views: 342,
        tags: ["thriller", "detective", "serial-killer", "comeback"],
        budget: "medium",
        createdAt: new Date().toISOString(),
        auditionCount: 13,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHold = async () => {
    setHoldLoading(true);
    try {
      await api.post("/scripts/hold", { scriptId: script._id });
      await fetchScript();
      setShowHoldModal(false);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to place hold");
    } finally {
      setHoldLoading(false);
    }
  };

  const handleGenerateTrailer = async () => {
    setTrailerLoading(true);
    try {
      await api.post("/ai/generate-trailer", { scriptId: script._id });
      await fetchScript();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to generate trailer");
    } finally {
      setTrailerLoading(false);
    }
  };

  const handleGenerateScore = async () => {
    setScoreLoading(true);
    try {
      await api.post("/ai/script-score", { scriptId: script._id });
      await fetchScript();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to generate score");
    } finally {
      setScoreLoading(false);
    }
  };

  const scoreColor = (val) => {
    if (val >= 85) return "text-green-600";
    if (val >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const scoreBg = (val) => {
    if (val >= 85) return "bg-green-100";
    if (val >= 70) return "bg-yellow-100";
    return "bg-red-100";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-3 border-[#c3d5e8] border-t-[#0f2544] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="text-center py-20">
        <span className="text-5xl block mb-4">📄</span>
        <h2 className="text-xl font-bold text-gray-700">Script not found</h2>
        <Link to="/search" className="text-[#0f2544] hover:underline text-sm mt-2 block">Browse scripts</Link>
      </div>
    );
  }

  const isOwner = script.creator?._id === user?._id;
  const isPro = ["investor", "producer", "director"].includes(user?.role);

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition">
          <ChevronLeft size={16} />
          Back
        </button>

        {/* Hero section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
          {/* Cover / Trailer */}
          <div className="relative h-48 sm:h-64 bg-gradient-to-br from-[#0f2544] via-[#1a365d] to-[#0a1628]">
            {script.coverImage && (
              <img src={script.coverImage} alt={script.title} className="w-full h-full object-cover absolute inset-0" />
            )}
            {script.trailerUrl && (
              <button onClick={() => setShowTrailer(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition group">
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition">
                  <Play size={32} className="text-[#0f2544] ml-1" fill="currentColor" />
                </div>
                <span className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 text-white text-xs rounded-full font-medium">
                  🎬 AI-Generated Trailer
                </span>
              </button>
            )}
            {/* Badges */}
            <div className="absolute top-3 right-3 flex gap-2">
              {script.premium && <span className="px-3 py-1 bg-[#0f2544] text-white rounded-full text-xs font-semibold">⭐ Premium</span>}
              <span className="px-3 py-1 bg-black/40 text-white rounded-full text-xs font-medium">{script.genre}</span>
            </div>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <span className="px-2.5 py-1 bg-black/40 text-white rounded-full text-xs">{script.views || 0} views</span>
              {script.contentType && (
                <span className="px-2.5 py-1 bg-black/40 text-white rounded-full text-xs capitalize">
                  {script.contentType.replace("_", " ")}
                </span>
              )}
            </div>
          </div>

          {/* Script info */}
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">{script.title}</h1>
                <Link to={`/profile/${script.creator?._id}`} className="text-sm text-[#0f2544] hover:underline font-medium">
                  by {script.creator?.name}
                </Link>
                <p className="text-sm text-gray-600 mt-3">{script.description}</p>
                {script.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {script.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-2xl font-extrabold text-gray-900">${script.price}</span>
                {script.budget && (
                  <span className="text-xs text-gray-500 capitalize">Budget: {script.budget}</span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mt-5">
              {!isOwner && isPro && script.holdStatus === "available" && (
                <button onClick={() => setShowHoldModal(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-xl text-sm font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition shadow-md">
                  🔒 Hold Script — ${script.holdFee || 200}
                </button>
              )}
              {script.holdStatus === "held" && (
                <span className="px-5 py-2.5 bg-red-100 text-red-700 rounded-xl text-sm font-semibold">🔒 Currently Held</span>
              )}

              {isOwner && !script.trailerUrl && script.trailerStatus !== "processing" && (
                <button onClick={handleGenerateTrailer} disabled={trailerLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-xl text-sm font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition shadow-md disabled:opacity-50">
                  {trailerLoading ? "Generating..." : "🎬 Generate AI Trailer"}
                </button>
              )}
              {script.trailerStatus === "processing" && (
                <span className="px-5 py-2.5 bg-[#edf2f7] text-[#0f2544] rounded-xl text-sm font-semibold animate-pulse">⏳ Trailer Processing...</span>
              )}

              {isOwner && !script.scriptScore?.overall && (
                <button onClick={handleGenerateScore} disabled={scoreLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-xl text-sm font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition shadow-md disabled:opacity-50">
                  {scoreLoading ? "Scoring..." : "📊 Get Script Score — $10"}
                </button>
              )}

              {!isOwner && (
                <Link to="/messages"
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  ✉️ Contact Creator
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {[
            { id: "overview", label: "Overview" },
            { id: "score", label: "Script Score" },
            { id: "roles", label: `Roles (${script.roles?.length || 0})` },
            { id: "synopsis", label: "Synopsis" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap px-3 ${
                activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>{tab.label}</button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Views", value: script.views || 0, icon: "👁️" },
                { label: "Auditions", value: script.auditionCount || 0, icon: "🎭" },
                { label: "Hold Fee", value: `$${script.holdFee || 200}`, icon: "🔒" },
                { label: "Score", value: script.scriptScore?.overall || "N/A", icon: "📊" },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                  <span className="text-2xl">{stat.icon}</span>
                  <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "score" && (
            <motion.div key="score" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {script.scriptScore?.overall ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-20 h-20 rounded-2xl ${scoreBg(script.scriptScore.overall)} flex items-center justify-center`}>
                      <span className={`text-3xl font-extrabold ${scoreColor(script.scriptScore.overall)}`}>
                        {script.scriptScore.overall}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Overall Score</h3>
                      <p className="text-xs text-gray-500">AI-powered analysis across 5 dimensions</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {[
                      { label: "Plot", val: script.scriptScore.plot },
                      { label: "Characters", val: script.scriptScore.characters },
                      { label: "Dialogue", val: script.scriptScore.dialogue },
                      { label: "Pacing", val: script.scriptScore.pacing },
                      { label: "Marketability", val: script.scriptScore.marketability },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.val >= 85 ? "bg-green-500" : item.val >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                              style={{ width: `${item.val}%` }} />
                          </div>
                          <span className={`text-sm font-bold ${scoreColor(item.val)}`}>{item.val}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {script.scriptScore.feedback && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm font-semibold text-blue-800 mb-1">AI Feedback</p>
                      <p className="text-sm text-blue-700">{script.scriptScore.feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <span className="text-5xl block mb-3">📊</span>
                  <p className="text-base font-semibold text-gray-700">No score yet</p>
                  <p className="text-sm text-gray-500">
                    {isOwner ? "Generate an AI Script Score ($10) to get detailed analysis" : "The creator hasn't scored this script yet"}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "roles" && (
            <motion.div key="roles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">
              {script.roles?.length > 0 ? (
                script.roles.map(role => (
                  <div key={role._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                          🎭 {role.characterName}
                        </h3>
                        <p className="text-sm text-[#0f2544] font-medium mt-0.5">{role.type}</p>
                        <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          {role.ageRange && <span>Age: {role.ageRange.min}–{role.ageRange.max}</span>}
                          {role.gender && <span>Gender: {role.gender}</span>}
                        </div>
                      </div>
                      {user?.role === "actor" && (
                        <Link to="/auditions"
                          className="px-4 py-2 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-lg text-xs font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition shrink-0">
                          Audition
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <span className="text-5xl block mb-3">🎭</span>
                  <p className="text-base font-semibold text-gray-700">No roles defined</p>
                  <p className="text-sm text-gray-500">
                    {isOwner ? "Add character roles to attract talent" : "No roles have been added yet"}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "synopsis" && (
            <motion.div key="synopsis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              {script.synopsis ? (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Synopsis</h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{script.synopsis}</p>
                </>
              ) : (
                <div className="text-center py-8">
                  <span className="text-5xl block mb-3">📝</span>
                  <p className="text-base font-semibold text-gray-700">No synopsis available</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Trailer Modal */}
      {showTrailer && script.trailerUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowTrailer(false)}>
          <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setShowTrailer(false)} className="text-white/70 hover:text-white text-2xl">×</button>
            </div>
            <video src={script.trailerUrl} controls autoPlay className="w-full rounded-2xl" />
          </div>
        </div>
      )}

      {/* Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">🔒 Place Hold on Script</h2>
            <p className="text-sm text-gray-600 mb-4">
              Place a 30-day hold on "<span className="font-semibold">{script.title}</span>" to reserve exclusive access while you evaluate.
            </p>
            <div className="bg-[#edf2f7] rounded-xl p-4 mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700">Hold Fee</span>
                <span className="text-lg font-bold text-gray-900">${script.holdFee || 200}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700">Platform Fee (10%)</span>
                <span className="text-sm font-medium text-gray-600">${((script.holdFee || 200) * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#c3d5e8] pt-2">
                <span className="text-sm text-gray-700">Creator Receives</span>
                <span className="text-sm font-bold text-green-700">${((script.holdFee || 200) * 0.9).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowHoldModal(false)}
                className="flex-1 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleHold} disabled={holdLoading}
                className="flex-1 px-5 py-2.5 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-xl text-sm font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition disabled:opacity-50">
                {holdLoading ? "Processing..." : "Confirm Hold"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ScriptDetail;
