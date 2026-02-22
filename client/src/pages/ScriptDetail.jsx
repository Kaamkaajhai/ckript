import { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { Film } from "lucide-react";

const ScriptDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coverError, setCoverError] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [unlockLoading, setUnlockLoading] = useState(false);

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5001${url}`;
  };

  useEffect(() => {
    fetchScript();
    setCoverError(false);
  }, [id]);

  const fetchScript = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/scripts/${id}`);
      setScript(data);
    } catch (error) {
      setScript({
        _id: id, title: "The Last Detective",
        logline: "A retired detective is drawn back into one final case that will challenge everything he believes.",
        description: "A gripping thriller about a retired detective drawn back into one final case.",
        synopsis: "When a serial killer resurfaces after 20 years, retired detective Marcus Cole is the only one who can stop them.",
        genre: "Thriller", primaryGenre: "Thriller", contentType: "feature_film", format: "feature", pageCount: 110,
        classification: { primaryGenre: "Thriller", secondaryGenre: "Crime", tones: ["Dark", "Suspenseful", "Gritty"], themes: ["Revenge", "Redemption", "Justice"], settings: ["Urban", "Contemporary", "New York"] },
        contentIndicators: { bechdelTest: true, basedOnTrueStory: false, adaptation: false },
        creator: { _id: "demo", name: "Sarah Mitchell", profileImage: "" },
        price: 149.99, premium: true, trailerUrl: "", trailerStatus: "none",
        scriptScore: { overall: 87, plot: 90, characters: 85, dialogue: 88, pacing: 82, marketability: 92, feedback: "Strong commercial potential with a compelling protagonist and tight plot structure.", scoredAt: new Date().toISOString() },
        roles: [
          { _id: "r1", characterName: "Det. Marcus Cole", type: "Rough, older, like Liam Neeson", description: "Retired detective, haunted by his past", ageRange: { min: 45, max: 65 }, gender: "Male" },
          { _id: "r2", characterName: "Agent Williams", type: "Professional, sharp", description: "FBI agent assigned to the case", ageRange: { min: 30, max: 50 }, gender: "Female" },
        ],
        holdStatus: "available", holdFee: 200, views: 342, tags: ["thriller", "detective", "serial-killer"],
        budget: "medium", createdAt: new Date().toISOString(), auditionCount: 13,
        services: { hosting: true, evaluation: true, aiTrailer: false },
        rating: 4.2, reviewCount: 8, readsCount: 56,
      });
    } finally { setLoading(false); }
  };

  const handleHold = async () => {
    setHoldLoading(true);
    try { await api.post("/scripts/hold", { scriptId: script._id }); await fetchScript(); setShowHoldModal(false); }
    catch (error) { alert(error.response?.data?.message || "Failed to place hold"); }
    finally { setHoldLoading(false); }
  };
  const handleGenerateTrailer = async () => {
    setTrailerLoading(true);
    try { await api.post("/ai/generate-trailer", { scriptId: script._id }); await fetchScript(); }
    catch (error) { alert(error.response?.data?.message || "Failed to generate trailer"); }
    finally { setTrailerLoading(false); }
  };
  const handleGenerateScore = async () => {
    setScoreLoading(true);
    try { await api.post("/ai/script-score", { scriptId: script._id }); await fetchScript(); }
    catch (error) { alert(error.response?.data?.message || "Failed to generate score"); }
    finally { setScoreLoading(false); }
  };
  const handleUnlockSynopsis = async () => {
    setUnlockLoading(true);
    try { await api.post("/scripts/unlock", { scriptId: script._id }); await fetchScript(); }
    catch (error) { alert(error.response?.data?.message || "Failed to unlock synopsis"); }
    finally { setUnlockLoading(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A";
  const fmtFormat = (f) => {
    const map = { feature: "Feature Film", tv_1hr: "TV (1 Hour)", tv_halfhr: "TV (Half Hour)", short: "Short Film", feature_film: "Feature Film", tv_1hour: "TV (1 Hour)", tv_pilot_1hour: "TV Pilot (1 Hour)", tv_halfhour: "TV (Half Hour)", tv_pilot_halfhour: "TV Pilot (Half Hour)", short_film: "Short Film", web_series: "Web Series", play: "Play" };
    return map[f] || f?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "—";
  };
  const fmtBudget = (b) => {
    const map = { micro: "Micro (<$100K)", low: "Low ($100K–$1M)", medium: "Medium ($1M–$15M)", high: "High ($15M–$75M)", blockbuster: "Blockbuster ($75M+)" };
    return map[b] || b?.charAt(0).toUpperCase() + b?.slice(1) || "—";
  };

  if (loading) return <div className="flex justify-center items-center h-[60vh]"><div className="w-10 h-10 border-3 border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin"></div></div>;
  if (!script) return <div className="text-center py-20"><div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg></div><h2 className="text-lg font-bold text-gray-700 mb-1">Script not found</h2><Link to="/search" className="text-[#1e3a5f] hover:underline text-sm font-semibold">Browse scripts</Link></div>;

  const isOwner = script.creator?._id === user?._id;
  const isPro = ["investor", "producer", "director"].includes(user?.role);
  const showCoverPlaceholder = !script.coverImage || coverError;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-5 transition font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        {/* ── Hero Section ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
          {/* Cover / Trailer */}
          <div className="relative h-48 sm:h-64 bg-gradient-to-br from-[#0f1c2e] to-[#1a2d45]">
            {showCoverPlaceholder ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center border border-white/[0.08] bg-white/[0.05] mb-4">
                  <Film size={28} strokeWidth={1.5} className="text-white/40" />
                </div>
                <p className="text-white/70 text-lg font-semibold">{script.title}</p>
                {script.genre && (
                  <p className="text-white/25 text-xs font-medium mt-1 uppercase tracking-[0.15em]">{script.genre}</p>
                )}
              </div>
            ) : (
              <img
                src={resolveImage(script.coverImage)}
                alt={script.title}
                onError={() => setCoverError(true)}
                className="w-full h-full object-cover absolute inset-0"
              />
            )}
            {script.trailerUrl && (
              <button onClick={() => setShowTrailer(true)} className="absolute inset-0 flex items-center justify-center group">
                <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition shadow-lg">
                  <svg className="w-7 h-7 text-[#1e3a5f] ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </button>
            )}

            {/* Top badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {script.premium && <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-[11px] font-bold shadow-sm">★ Premium</span>}
              {script.holdStatus === "held" && <span className="px-3 py-1 bg-red-500/90 text-white rounded-lg text-[11px] font-bold">Held</span>}
              {script.isFeatured && <span className="px-3 py-1 bg-purple-500/90 text-white rounded-lg text-[11px] font-bold">Featured</span>}
            </div>

            {/* Bottom stats */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="flex gap-2">
                <span className="px-2.5 py-1 bg-white/15 backdrop-blur-md text-white rounded-lg text-[11px] font-semibold border border-white/20">{fmtFormat(script.format)}</span>
                {(script.primaryGenre || script.genre) && <span className="px-2.5 py-1 bg-white/15 backdrop-blur-md text-white rounded-lg text-[11px] font-semibold border border-white/20">{script.primaryGenre || script.genre}</span>}
                {cl.secondaryGenre && <span className="px-2.5 py-1 bg-white/15 backdrop-blur-md text-white rounded-lg text-[11px] font-semibold border border-white/20">{cl.secondaryGenre}</span>}
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 bg-black/40 backdrop-blur-sm text-white/90 rounded-lg text-[11px] font-medium">{script.views || 0} views</span>
                {script.readsCount > 0 && <span className="px-2.5 py-1 bg-black/40 backdrop-blur-sm text-white/90 rounded-lg text-[11px] font-medium">{script.readsCount} reads</span>}
              </div>
            </div>
          </div>

          {/* Script info */}
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{script.title}</h1>
                <Link to={`/profile/${script.creator?._id}`} className="inline-flex items-center gap-2 text-base text-[#1e3a5f] hover:underline font-semibold">
                  {script.creator?.profileImage && !coverError ? (
                    <img src={resolveImage(script.creator.profileImage)} alt="" className="w-6 h-6 rounded-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[10px] font-bold text-[#1e3a5f]">
                      {script.creator?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                  {script.creator?.name}
                </Link>

                {/* Logline */}
                {script.logline && (
                  <div className="bg-gradient-to-r from-[#0f2544]/[0.04] to-transparent rounded-xl p-4 mb-4 border-l-[3px] border-[#1e3a5f]">
                    <p className="text-[13px] text-gray-600 leading-relaxed italic">"{script.logline}"</p>
                  </div>
                )}

                {/* Description */}
                {script.description && <p className="text-sm text-gray-500 leading-relaxed mb-4">{script.description}</p>}

                {/* Synopsis (visible immediately) */}
                {script.synopsis && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Synopsis</p>
                    <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">{script.synopsis}</p>
                    {script.isSynopsisLocked && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                        <span className="font-semibold">Full synopsis locked — teaser shown</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Content Indicators */}
                {(ci.bechdelTest || ci.basedOnTrueStory || ci.adaptation) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {ci.bechdelTest && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200">✓ Bechdel Test</span>}
                    {ci.basedOnTrueStory && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200">Based on True Story</span>}
                    {ci.adaptation && <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-[11px] font-bold border border-purple-200">Adaptation{ci.adaptationSource ? `: ${ci.adaptationSource}` : ""}</span>}
                  </div>
                )}

                {/* Tags */}
                {script.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {script.tags.map(tag => <span key={tag} className="px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg text-[11px] font-medium ring-1 ring-gray-100">#{tag}</span>)}
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <div className="lg:w-64 space-y-3 flex-shrink-0">
                {/* Price card */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Price</p>
                  <p className="text-3xl font-extrabold text-gray-900 mb-3">${script.price}<span className="text-sm font-medium text-gray-400 ml-1">USD</span></p>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                    <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Pages</p><p className="text-lg font-extrabold text-gray-900 tabular-nums">{script.pageCount || "—"}</p></div>
                    <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Budget</p><p className="text-[13px] font-bold text-gray-900 capitalize">{script.budget || "—"}</p></div>
                    {score?.overall && <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Score</p><p className={`text-lg font-extrabold tabular-nums ${scoreColor(score.overall)}`}>{score.overall}</p></div>}
                    {script.rating > 0 && <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Rating</p><p className="text-lg font-extrabold text-amber-500 tabular-nums">★ {script.rating.toFixed(1)}</p></div>}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {!isOwner && isPro && script.holdStatus === "available" && (
                    <button onClick={() => setShowHoldModal(true)} className="w-full px-4 py-3 bg-[#1e3a5f] text-white rounded-xl text-sm font-bold hover:bg-[#162d4a] transition shadow-sm">
                      Place Hold — ${script.holdFee || 200}
                    </button>
                  )}
                  {script.holdStatus === "held" && <div className="w-full px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-200">Currently Held</div>}
                  {isOwner && !script.trailerUrl && script.trailerStatus !== "processing" && (
                    <button onClick={handleGenerateTrailer} disabled={trailerLoading} className="w-full px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-xs font-bold hover:bg-[#162d4a] transition disabled:opacity-50 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                      {trailerLoading ? "Generating..." : "Generate AI Trailer"}
                    </button>
                  )}
                  {script.trailerStatus === "processing" && <div className="w-full px-4 py-2.5 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold text-center border border-gray-200 flex items-center justify-center gap-2"><div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>Trailer Processing</div>}
                  {isOwner && !score?.overall && (
                    <button onClick={handleGenerateScore} disabled={scoreLoading} className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                      {scoreLoading ? "Scoring..." : "Get Script Score — $10"}
                    </button>
                  )}
                </div>

                {/* Services badge */}
                {script.services && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Active Services</p>
                    <div className="space-y-1.5">
                      {script.services.hosting && <div className="flex items-center gap-2 text-xs"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div><span className="text-gray-600 font-medium">Hosted & Searchable</span></div>}
                      {script.services.evaluation && <div className="flex items-center gap-2 text-xs"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div><span className="text-gray-600 font-medium">Professional Evaluation</span></div>}
                      {script.services.aiTrailer && <div className="flex items-center gap-2 text-xs"><div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div><span className="text-gray-600 font-medium">AI Trailer</span></div>}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-gray-400 font-medium text-center">Uploaded {formatDate(script.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 bg-gray-100/60 rounded-xl p-1 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-base font-bold rounded-lg transition-all whitespace-nowrap px-4 ${activeTab === tab.id ? "bg-white text-[#1e3a5f] shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>{tab.label}</button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Views", value: script.views || 0, icon: "👁" },
                  { label: "Reads", value: script.readsCount || 0, icon: "📖" },
                  { label: "Auditions", value: script.auditionCount || 0, icon: "🎭" },
                  { label: "Reviews", value: script.reviewCount || 0, icon: "⭐" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-2"><span className="text-lg">{s.icon}</span><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p></div>
                    <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Project Details */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-[13px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1e3a5f]/[0.06] flex items-center justify-center"><svg className="w-3.5 h-3.5 text-[#1e3a5f]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg></div>
                  Project Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    { label: "Format", value: fmtFormat(script.format) },
                    { label: "Primary Genre", value: cl.primaryGenre || script.primaryGenre || script.genre },
                    { label: "Secondary Genre", value: cl.secondaryGenre },
                    { label: "Page Count", value: script.pageCount },
                    { label: "Budget Level", value: fmtBudget(script.budget) },
                    { label: "Hold Fee", value: script.holdFee ? `$${script.holdFee}` : null },
                    { label: "Hold Status", value: script.holdStatus?.charAt(0).toUpperCase() + script.holdStatus?.slice(1) },
                    { label: "Uploaded", value: formatDate(script.createdAt) },
                  ].filter(i => i.value && i.value !== "—").map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</span>
                      <span className="text-sm font-bold text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* CLASSIFICATION */}
          {activeTab === "classification" && (
            <motion.div key="classification" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {[
                { label: "Tones", items: cl.tones, color: "bg-[#0f2544]/[0.06] text-[#0f2544]" },
                { label: "Themes", items: cl.themes, color: "bg-blue-50 text-blue-700" },
                { label: "Settings", items: cl.settings, color: "bg-gray-50 text-gray-700 ring-1 ring-gray-100" },
              ].filter(c => c.items?.length > 0).map(cat => (
                <div key={cat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-[13px] font-bold text-gray-900 mb-3">{cat.label}</h3>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map((item, i) => <span key={i} className={`px-3.5 py-1.5 rounded-lg text-[13px] font-bold ${cat.color}`}>{item}</span>)}
                  </div>
                </div>
              ))}
              {(!cl.tones?.length && !cl.themes?.length && !cl.settings?.length) && (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-4xl mb-3">🏷️</div>
                  <h3 className="text-base font-bold text-gray-800 mb-1">No Classification Data</h3>
                  <p className="text-sm text-gray-400">{isOwner ? "Add tones, themes, and settings when editing your script" : "Classification data hasn't been added yet"}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* SCRIPT SCORE */}
          {activeTab === "score" && (
            <motion.div key="score" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {score?.overall ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0f2544] to-[#1e3a5f] flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-extrabold text-white">{score.overall}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-gray-900 tracking-tight mb-0.5">Overall Score</h3>
                      <p className="text-xs text-gray-400 font-medium">AI-powered analysis across 5 dimensions</p>
                      {score.scoredAt && <p className="text-[11px] text-gray-400 mt-1">Scored on {formatDate(score.scoredAt)}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    {[
                      { label: "Plot", val: score.plot },
                      { label: "Characters", val: score.characters },
                      { label: "Dialogue", val: score.dialogue },
                      { label: "Pacing", val: score.pacing },
                      { label: "Marketability", val: score.marketability },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-gray-700">{item.label}</span>
                          <span className={`text-lg font-extrabold tabular-nums ${scoreColor(item.val)}`}>{item.val}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${item.val}%` }} transition={{ duration: 0.8, delay: 0.2 }} className={`h-full rounded-full ${scoreBg(item.val)}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {score.feedback && (
                    <div className="bg-[#0f2544]/[0.03] rounded-xl p-4 border border-[#0f2544]/[0.06]">
                      <p className="text-[11px] font-bold text-[#1e3a5f] uppercase tracking-wider mb-2">AI Feedback</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{score.feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg></div>
                  <h3 className="text-base font-bold text-gray-800 mb-1">No Score Yet</h3>
                  <p className="text-sm text-gray-400 mb-4">{isOwner ? "Generate an AI Script Score for detailed analysis" : "The creator hasn't scored this script yet"}</p>
                  {isOwner && <button onClick={handleGenerateScore} disabled={scoreLoading} className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-bold hover:bg-[#162d4a] transition disabled:opacity-50">{scoreLoading ? "Scoring..." : "Get Script Score — $10"}</button>}
                </div>
              )}
            </motion.div>
          )}

          {/* ROLES */}
          {activeTab === "roles" && (
            <motion.div key="roles" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {script.roles?.length > 0 ? script.roles.map(role => (
                <div key={role._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900 tracking-tight">{role.characterName}</h3>
                    {role.gender && <span className="px-2.5 py-0.5 bg-gray-50 text-gray-500 rounded-lg text-[11px] font-bold">{role.gender}</span>}
                  </div>
                  <p className="text-sm text-[#1e3a5f] font-semibold mb-1.5">{role.type}</p>
                  {role.description && <p className="text-sm text-gray-500 leading-relaxed mb-3">{role.description}</p>}
                  {role.ageRange && <span className="text-xs text-gray-400 font-medium">Age: {role.ageRange.min}–{role.ageRange.max}</span>}
                </div>
              )) : (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><span className="text-2xl">🎭</span></div>
                  <h3 className="text-base font-bold text-gray-800 mb-1">No Roles Defined</h3>
                  <p className="text-sm text-gray-400">{isOwner ? "Add character roles to attract talent" : "No roles have been added yet"}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* SYNOPSIS */}
          {activeTab === "synopsis" && (
            <motion.div key="synopsis" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              {script.synopsis ? (
                <>
                  <h3 className="text-lg font-extrabold text-gray-900 mb-4 tracking-tight">Synopsis</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-6">{script.synopsis}</p>
                  {script.isSynopsisLocked && (
                    <div className="pt-5 border-t border-gray-100">
                      <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-3"><svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg></div>
                        <h4 className="text-base font-bold text-gray-800 mb-2">Full Synopsis Locked</h4>
                        {script.isWriter ? (
                          <p className="text-sm text-gray-500">Writers cannot purchase synopsis access. Only industry professionals can unlock full scripts.</p>
                        ) : script.canPurchase ? (
                          <div><p className="text-sm text-gray-500 mb-4">Pay to unlock the full synopsis and content.</p><button onClick={handleUnlockSynopsis} disabled={unlockLoading} className="px-6 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-bold hover:bg-[#162d4a] transition disabled:opacity-50">{unlockLoading ? "Processing..." : `Unlock — $${script.price || 0}`}</button></div>
                        ) : <p className="text-sm text-gray-500">Sign in as a producer or director to unlock.</p>}
                      </div>
                    </div>
                  )}
                  {!script.isSynopsisLocked && !script.isCreator && (
                    <div className="mt-4 flex items-center gap-2 text-emerald-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-xs font-bold">Full synopsis unlocked</span></div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg></div>
                  <h3 className="text-base font-bold text-gray-800 mb-1">No Synopsis Available</h3>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Trailer Modal */}
      {showTrailer && script.trailerUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTrailer(false)}>
          <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2"><button onClick={() => setShowTrailer(false)} className="w-8 h-8 rounded-lg bg-white/10 text-white/80 hover:text-white flex items-center justify-center">✕</button></div>
            <div className="rounded-xl overflow-hidden shadow-2xl"><video src={script.trailerUrl} controls autoPlay className="w-full" /></div>
          </div>
        </div>
      )}

      {/* Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-900 mb-2 tracking-tight">Place Hold</h2>
            <p className="text-sm text-gray-500 mb-5">Reserve 30-day exclusive access to "<span className="font-semibold text-gray-700">{script.title}</span>"</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Hold Fee</span><span className="font-bold text-gray-900">${script.holdFee || 200}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Platform Fee (10%)</span><span className="font-bold text-gray-500">${((script.holdFee || 200) * 0.1).toFixed(2)}</span></div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200"><span className="font-bold text-gray-700">Creator Receives</span><span className="font-bold text-[#1e3a5f]">${((script.holdFee || 200) * 0.9).toFixed(2)}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowHoldModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleHold} disabled={holdLoading} className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-bold hover:bg-[#162d4a] transition disabled:opacity-50">{holdLoading ? "Processing..." : "Confirm Hold"}</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ScriptDetail;
