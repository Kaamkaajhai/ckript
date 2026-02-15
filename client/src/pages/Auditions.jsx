import { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const genres = ["Drama", "Comedy", "Thriller", "Horror", "Action", "Romance", "Sci-Fi", "Fantasy", "Documentary", "Animation"];

const Auditions = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(user?.role === "actor" ? "browse" : "manage");
  const [availableRoles, setAvailableRoles] = useState([]);
  const [myAuditions, setMyAuditions] = useState([]);
  const [scriptAuditions, setScriptAuditions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [showAuditionModal, setShowAuditionModal] = useState(null);
  const [auditionForm, setAuditionForm] = useState({ videoUrl: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === "browse") fetchAvailableRoles();
    else if (activeTab === "my") fetchMyAuditions();
  }, [activeTab, selectedGenre]);

  const fetchAvailableRoles = async () => {
    try {
      setLoading(true);
      const params = selectedGenre ? `?genre=${selectedGenre}` : "";
      const { data } = await api.get(`/auditions/roles${params}`);
      setAvailableRoles(data);
    } catch (error) {
      // Demo data
      setAvailableRoles([
        {
          script: { _id: "s1", title: "The Last Detective", genre: "Thriller", creator: { name: "Sarah Mitchell" } },
          role: { _id: "r1", characterName: "Det. Marcus Cole", type: "Rough, older, like Liam Neeson", description: "Retired detective", ageRange: { min: 45, max: 65 }, gender: "Male" },
          auditionCount: 5,
        },
        {
          script: { _id: "s2", title: "Neon Dreams", genre: "Sci-Fi", creator: { name: "Alex Chen" } },
          role: { _id: "r2", characterName: "Kai", type: "Young, rebellious, tech-savvy", description: "Teenage hacker", ageRange: { min: 16, max: 25 }, gender: "Any" },
          auditionCount: 12,
        },
        {
          script: { _id: "s1", title: "The Last Detective", genre: "Thriller", creator: { name: "Sarah Mitchell" } },
          role: { _id: "r3", characterName: "Agent Williams", type: "Professional, sharp, authoritative", description: "FBI agent assigned to the case", ageRange: { min: 30, max: 50 }, gender: "Female" },
          auditionCount: 8,
        },
      ]);
    } finally { setLoading(false); }
  };

  const fetchMyAuditions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/auditions/my-auditions");
      setMyAuditions(data);
    } catch (error) {
      setMyAuditions([]);
    } finally { setLoading(false); }
  };

  const handleSubmitAudition = async () => {
    if (!auditionForm.videoUrl) return;
    setSubmitting(true);
    try {
      await api.post("/auditions/submit", {
        scriptId: showAuditionModal.script._id,
        roleId: showAuditionModal.role._id,
        videoUrl: auditionForm.videoUrl,
        notes: auditionForm.notes,
      });
      setShowAuditionModal(null);
      setAuditionForm({ videoUrl: "", notes: "" });
      if (activeTab === "my") fetchMyAuditions();
      else fetchAvailableRoles();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to submit audition");
    } finally { setSubmitting(false); }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    shortlisted: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const tabs = user?.role === "actor" 
    ? [
        { id: "browse", label: "Browse Roles", icon: "🎭" },
        { id: "my", label: "My Auditions", icon: "📋" },
      ]
    : [
        { id: "browse", label: "Browse Roles", icon: "🎭" },
        { id: "manage", label: "Manage Auditions", icon: "📋" },
      ];

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <span className="text-3xl">🎭</span> Talent Attachment
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.role === "actor" 
              ? "Find roles that match your talent and submit auditions"
              : "Attach talent to your scripts — build the dream team"
            }
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              <span className="mr-1.5">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* Genre filter */}
        {activeTab === "browse" && (
          <div className="flex flex-wrap gap-2 mb-5">
            <button onClick={() => setSelectedGenre("")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                !selectedGenre ? "bg-[#0f2544] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>All</button>
            {genres.map(g => (
              <button key={g} onClick={() => setSelectedGenre(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  selectedGenre === g ? "bg-[#0f2544] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>{g}</button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-3 border-[#c3d5e8] border-t-[#0f2544] rounded-full animate-spin"></div>
          </div>
        )}

        {/* Browse Roles */}
        {!loading && activeTab === "browse" && (
          <div className="space-y-4">
            {availableRoles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <span className="text-5xl mb-4 block">🎭</span>
                <p className="text-base font-semibold text-gray-700">No roles available yet</p>
                <p className="text-sm text-gray-500">Check back later or expand your genre filters</p>
              </div>
            ) : (
              availableRoles.map((item, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-[#edf2f7] text-[#0f2544] px-2.5 py-1 rounded-lg text-xs font-medium">{item.script.genre}</span>
                        <Link to={`/script/${item.script._id}`} className="text-xs text-gray-500 hover:text-[#0f2544] transition">
                          {item.script.title}
                        </Link>
                        <span className="text-xs text-gray-400">by {item.script.creator?.name}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{item.role.characterName}</h3>
                      <p className="text-sm text-[#0f2544] font-medium mb-1">Type: {item.role.type}</p>
                      <p className="text-sm text-gray-600 mb-2">{item.role.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {item.role.ageRange && <span>Age: {item.role.ageRange.min}–{item.role.ageRange.max}</span>}
                        {item.role.gender && <span>Gender: {item.role.gender}</span>}
                        <span>{item.auditionCount} audition(s) submitted</span>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center gap-2">
                      {user?.role === "actor" && (
                        <button onClick={() => setShowAuditionModal(item)}
                          className="px-5 py-2.5 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-xl text-sm font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition shadow-md">
                          🎬 Audition
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* My Auditions */}
        {!loading && activeTab === "my" && (
          <div className="space-y-4">
            {myAuditions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <span className="text-5xl mb-4 block">📋</span>
                <p className="text-base font-semibold text-gray-700">No auditions yet</p>
                <p className="text-sm text-gray-500">Browse roles and submit your first audition</p>
              </div>
            ) : (
              myAuditions.map((aud) => (
                <div key={aud._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">{aud.script?.title}</h3>
                      <p className="text-sm text-gray-500">by {aud.script?.creator?.name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[aud.status]}`}>
                      {aud.status}
                    </span>
                  </div>
                  {aud.videoUrl && (
                    <video src={aud.videoUrl} controls className="w-full h-40 object-cover rounded-xl mb-3 bg-black" />
                  )}
                  {aud.feedback && (
                    <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
                      <p className="font-semibold mb-1">Feedback:</p>
                      <p>{aud.feedback}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>

      {/* Audition Modal */}
      {showAuditionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Submit Audition</h2>
                <p className="text-sm text-gray-500">
                  For: <span className="font-semibold text-[#0f2544]">{showAuditionModal.role.characterName}</span> 
                  {" "}in {showAuditionModal.script.title}
                </p>
              </div>
              <button onClick={() => setShowAuditionModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="bg-[#edf2f7] rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-[#0a1628] mb-1">Role Requirements:</p>
              <p className="text-sm text-[#0f2544]">{showAuditionModal.role.type}</p>
              <p className="text-xs text-[#0f2544] mt-1">{showAuditionModal.role.description}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Audition Video URL *</label>
                <input type="url" value={auditionForm.videoUrl} onChange={e => setAuditionForm({...auditionForm, videoUrl: e.target.value})}
                  placeholder="https://youtube.com/your-1-min-audition" 
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a365d] focus:border-transparent" />
                <p className="text-xs text-gray-400 mt-1">Upload a 1-minute video acting out a scene from this script</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea value={auditionForm.notes} onChange={e => setAuditionForm({...auditionForm, notes: e.target.value})}
                  placeholder="Tell the creator why you're perfect for this role..."
                  rows={3} className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a365d] focus:border-transparent" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAuditionModal(null)}
                  className="flex-1 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
                <button onClick={handleSubmitAudition} disabled={submitting || !auditionForm.videoUrl}
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-xl text-sm font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition disabled:opacity-50">
                  {submitting ? "Submitting..." : "🎬 Submit Audition"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Auditions;
