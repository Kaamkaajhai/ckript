import { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import ReviewCard from "../components/ReviewCard";
import ReviewForm from "../components/ReviewForm";
import { Film } from "lucide-react";

const ScriptReader = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();
  const [script, setScript] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coverError, setCoverError] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [hasRead, setHasRead] = useState(false);
  const [activeTab, setActiveTab] = useState("synopsis");
  const [editingReview, setEditingReview] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [showContent, setShowContent] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [totalReviewPages, setTotalReviewPages] = useState(1);

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5001${url}`;
  };

  useEffect(() => {
    fetchScript();
    fetchReviews();
    setCoverError(false);
    api.post(`/scripts/${id}/read`).catch(() => {});
  }, [id]);

  const fetchScript = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/scripts/${id}`);
      setScript(data);
      setIsFavorited(user?.favoriteScripts?.includes(id) || false);
      setHasRead(user?.scriptsRead?.includes(id) || false);
    } catch { setScript(null); }
    finally { setLoading(false); }
  };

  const fetchReviews = async (page = 1) => {
    try {
      setReviewsLoading(true);
      const { data } = await api.get(`/reviews/${id}?page=${page}&limit=10`);
      setReviews(data.reviews || data);
      setTotalReviewPages(data.totalPages || 1);
      setReviewPage(page);
      const mine = (data.reviews || data).find((r) => r.user?._id === user?._id);
      if (mine) setMyReview(mine);
    } catch { setReviews([]); }
    finally { setReviewsLoading(false); }
  };

  const handleRecordRead = async () => {
    try { await api.post(`/scripts/${id}/read`); setHasRead(true); } catch { /* */ }
    setShowContent(true);
  };

  const handleToggleFavorite = async () => {
    try { const { data } = await api.post(`/scripts/${id}/favorite`); setIsFavorited(data.favorited); } catch { /* */ }
  };

  const handleSubmitReview = async ({ rating, comment }) => {
    try {
      setSubmitLoading(true);
      if (editingReview) {
        await api.put(`/reviews/${editingReview._id}`, { rating, comment });
        setEditingReview(null);
      } else {
        await api.post("/reviews", { script: id, rating, comment });
      }
      await fetchReviews(); await fetchScript();
    } catch (err) { alert(err.response?.data?.message || "Failed to submit review"); }
    finally { setSubmitLoading(false); }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm("Delete this review?")) return;
    try { await api.delete(`/reviews/${reviewId}`); setMyReview(null); await fetchReviews(); await fetchScript(); }
    catch { alert("Failed to delete review"); }
  };

  const handleEditReview = (review) => { setEditingReview(review); setActiveTab("reviews"); };

  const isUnlocked = !script?.premium || script?.isCreator || script?.isUnlocked;
  const isPro = ["investor", "producer", "director"].includes(user?.role);

  const renderStars = (rating) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-5 h-5 ${s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin" />
    </div>
  );

  if (!script) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400 font-bold text-lg">Script not found</p>
      <Link to="/reader" className="text-sm font-bold text-[#1e3a5f] hover:underline">← Back to Reader</Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Back */}
      <Link to="/reader" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-semibold mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back to Reader
      </Link>

      {/* Hero — Clean two-column */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl border shadow-sm overflow-hidden mb-6 ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
        <div className="flex flex-col md:flex-row">
          {/* Cover */}
          <div className="md:w-72 shrink-0">
            {script.coverImage && !coverError ? (
              <img src={resolveImage(script.coverImage)} alt={script.title} onError={() => setCoverError(true)} className="w-full h-64 md:h-full object-cover" />
            ) : (
              <div className="w-full h-64 md:h-full bg-gradient-to-b from-[#0f1c2e] to-[#1a2d45] flex flex-col items-center justify-center min-h-[320px]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/[0.08] bg-white/[0.05] mb-3">
                  <Film size={24} strokeWidth={1.5} className="text-white/40" />
                </div>
                <p className="text-white/60 text-sm font-medium text-center px-6 line-clamp-2">{script.title}</p>
                {script.genre && <p className="text-white/25 text-[10px] font-medium mt-1.5 uppercase tracking-[0.15em]">{script.genre}</p>}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-6 md:p-8">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {script.genre && <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${dark ? "bg-white/[0.06] text-gray-300" : "bg-gray-100 text-gray-500"}`}>{script.genre}</span>}
              {script.contentType && <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${dark ? "bg-white/[0.06] text-gray-300" : "bg-gray-100 text-gray-500"}`}>{script.contentType.replace(/_/g, " ")}</span>}
              {script.premium && <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${dark ? "bg-amber-500/20 border border-amber-500/30 text-amber-300" : "bg-amber-50 border border-amber-200/60 text-amber-600"}`}>Premium</span>}
            </div>

            {/* Title */}
            <h1 className={`text-2xl md:text-3xl font-extrabold mb-2 tracking-tight ${dark ? "text-gray-100" : "text-gray-900"}`}>{script.title}</h1>

            {/* Description / Logline */}
            {(script.logline || script.description) && (
              <p className="text-gray-500 text-[15px] leading-relaxed mb-5 max-w-xl">{script.logline || script.description}</p>
            )}

            {/* Author */}
            <Link to={`/profile/${script.creator?._id}`} className="inline-flex items-center gap-3 mb-5 group">
              {script.creator?.profileImage ? (
                <img src={resolveImage(script.creator.profileImage)} alt=""
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentElement.querySelector('.avatar-fallback').style.display = 'flex'; }}
                  className={`w-9 h-9 rounded-full object-cover ring-2 ${dark ? "ring-[#333]" : "ring-gray-100"}`} />
              ) : null}
              <div className={`avatar-fallback w-9 h-9 rounded-full bg-[#1e3a5f]/10 items-center justify-center text-xs font-bold text-[#1e3a5f] ${script.creator?.profileImage ? 'hidden' : 'flex'}`}>
                {script.creator?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <p className={`text-sm font-bold group-hover:text-[#1e3a5f] transition-colors ${dark ? "text-gray-200" : "text-gray-900"}`}>{script.creator?.name || "Unknown"}</p>
                <p className="text-[11px] text-gray-400 font-medium capitalize">{script.creator?.role || "Writer"}</p>
              </div>
            </Link>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
              <div className="flex items-center gap-1.5">
                {renderStars(script.rating || 0)}
                <span className="text-gray-500 font-semibold ml-1">{(script.rating || 0).toFixed(1)} ({script.reviewCount || 0})</span>
              </div>
              <span className="text-gray-200">|</span>
              <span className="text-gray-400 font-medium">{script.views || 0} views</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handleToggleFavorite} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${isFavorited ? (dark ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-red-50 text-red-500 border-red-200 hover:bg-red-100") : (dark ? "bg-white/[0.04] text-gray-300 border-[#444] hover:border-[#555]" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")}`}>
                <svg className={`w-4 h-4 ${isFavorited ? "fill-red-400" : ""}`} fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {isFavorited ? "Favorited" : "Favorite"}
              </button>
              {script.premium && !isUnlocked && isPro && (
                <button className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Unlock – ${script.price}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className={`flex gap-1 rounded-xl p-1 mb-6 ${dark ? "bg-white/[0.04]" : "bg-gray-100/60"}`}>
        {[
          { key: "synopsis", label: "Synopsis" },
          { key: "evaluation", label: "Evaluation" },
          { key: "reviews", label: `Reviews (${script.reviewCount || 0})` },
          { key: "details", label: "Details" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-2.5 px-4 rounded-lg text-[13px] font-semibold transition-all ${activeTab === tab.key ? (dark ? "bg-[#101e30] text-gray-100 shadow-sm" : "bg-white text-gray-900 shadow-sm") : (dark ? "text-gray-400 hover:text-gray-200" : "text-gray-400 hover:text-gray-600")}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "synopsis" && (
          <motion.div key="synopsis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className={`rounded-2xl border shadow-sm p-6 md:p-8 ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
              <h3 className={`text-lg font-extrabold mb-4 ${dark ? "text-gray-100" : "text-gray-900"}`}>Synopsis</h3>
              {script.synopsis ? (
                <p className={`leading-relaxed font-medium whitespace-pre-line ${dark ? "text-gray-300" : "text-gray-600"}`}>{script.synopsis}</p>
              ) : (
                <p className="text-gray-400 italic">No synopsis available for this script.</p>
              )}
            </div>

            {/* Locked content notice */}
            <div className={`mt-6 rounded-2xl p-6 text-center border ${dark ? "bg-[#242424] border-[#333]" : "bg-gray-50 border-gray-100"}`}>
              <svg className={`w-10 h-10 mx-auto mb-3 ${dark ? "text-gray-500" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              <p className={`text-sm font-bold mb-1 ${dark ? "text-gray-200" : "text-gray-700"}`}>Full Script Content</p>
              {isPro ? (
                <p className="text-xs text-gray-400">Unlock this premium script to access the full content.</p>
              ) : (
                <p className="text-xs text-gray-400">Only investors, producers, and directors can access the full script.</p>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "reviews" && (
          <motion.div key="reviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Write Review + Rating Summary */}
              <div className="lg:col-span-1 space-y-5">
                {/* Rating Overview Card */}
                <div className={`rounded-2xl border shadow-sm p-6 ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
                  <div className="flex items-center gap-5 mb-5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] flex flex-col items-center justify-center shrink-0">
                      <span className="text-2xl font-black text-white leading-none">{(script.rating || 0).toFixed(1)}</span>
                      <span className="text-[10px] text-white/50 font-bold mt-0.5">out of 5</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">{renderStars(script.rating || 0)}</div>
                      <p className="text-sm text-gray-500 font-semibold">{script.reviewCount || 0} review{(script.reviewCount || 0) !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {/* Rating breakdown */}
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-400 w-3 text-right">{star}</span>
                        <svg className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${script.reviewCount ? 0 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Write / Already Reviewed */}
                {!myReview || editingReview ? (
                  <ReviewForm onSubmit={handleSubmitReview} loading={submitLoading} isEditing={!!editingReview} initialRating={editingReview?.rating || 0} initialComment={editingReview?.comment || ""} />
                ) : (
                  <div className={`bg-white rounded-2xl border shadow-sm p-5 text-center ${dark ? "bg-[#101e30] border-[#333]" : "border-gray-100"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${dark ? "bg-emerald-500/15" : "bg-emerald-50"}`}>
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-sm font-bold text-gray-800 mb-0.5">Review submitted</p>
                    <p className="text-xs text-gray-400 font-medium">You can edit or delete your review from below.</p>
                  </div>
                )}
              </div>

              {/* Right Column: Review list */}
              <div className="lg:col-span-2 space-y-3">
                {reviewsLoading ? (
                  [...Array(3)].map((_, i) => <div key={i} className={`h-28 rounded-2xl animate-pulse ${dark ? "bg-[#333]" : "bg-gray-50"}`} />)
                ) : reviews.length > 0 ? (
                  <>
                    {reviews.map((r) => <ReviewCard key={r._id} review={r} currentUserId={user?._id} onEdit={handleEditReview} onDelete={handleDeleteReview} />)}
                    {totalReviewPages > 1 && (
                      <div className="flex justify-center gap-2 pt-4">
                        {[...Array(totalReviewPages)].map((_, i) => (
                          <button key={i} onClick={() => fetchReviews(i + 1)} className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${reviewPage === i + 1 ? "bg-[#1e3a5f] text-white shadow-sm" : (dark ? "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]" : "bg-gray-50 text-gray-400 hover:bg-gray-100")}`}>{i + 1}</button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`rounded-2xl border shadow-sm p-10 text-center ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
                      <svg className={`w-6 h-6 ${dark ? "text-gray-500" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                    </div>
                    <p className={`font-bold text-sm mb-1 ${dark ? "text-gray-200" : "text-gray-700"}`}>No reviews yet</p>
                    <p className="text-gray-400 text-xs font-medium">Be the first to share your thoughts on this script!</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "evaluation" && (() => {
          const sc = script.scriptScore || {};
          const ps = script.platformScore || {};
          const dk = dark;
          const dims = [
            { key: "plot",          label: "Plot",          color: dk ? "#818cf8" : "#4f46e5", track: dk ? "rgba(99,102,241,0.12)" : "#ede9fe" },
            { key: "characters",    label: "Characters",    color: dk ? "#a78bfa" : "#7c3aed", track: dk ? "rgba(167,139,250,0.12)" : "#ede9fe" },
            { key: "dialogue",      label: "Dialogue",      color: dk ? "#34d399" : "#059669", track: dk ? "rgba(52,211,153,0.12)"  : "#d1fae5" },
            { key: "pacing",        label: "Pacing",        color: dk ? "#fbbf24" : "#d97706", track: dk ? "rgba(251,191,36,0.12)"  : "#fef3c7" },
            { key: "marketability", label: "Marketability", color: dk ? "#fb923c" : "#ea580c", track: dk ? "rgba(249,115,22,0.12)"  : "#ffedd5" },
          ];
          const gradeLabel = (v) => v >= 90 ? "S" : v >= 80 ? "A" : v >= 70 ? "B" : v >= 60 ? "C" : v >= 50 ? "D" : "F";
          const gradeColor = (v) =>
            v >= 90 ? (dk ? "#c084fc" : "#9333ea") :
            v >= 80 ? (dk ? "#34d399" : "#059669") :
            v >= 70 ? (dk ? "#60a5fa" : "#2563eb") :
            v >= 60 ? (dk ? "#fbbf24" : "#d97706") :
                       (dk ? "#f87171" : "#dc2626");
          const gradeText = (v) => v >= 90 ? "Exceptional" : v >= 80 ? "Excellent" : v >= 70 ? "Strong" : v >= 60 ? "Promising" : v >= 50 ? "Developing" : "Needs Work";
          const hasScore = !!sc.overall;
          const ovColor = gradeColor(sc.overall || 0);
          return (
            <motion.div key="evaluation" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {hasScore ? (
                <>
                  {/* Score Hero */}
                  <div className={`rounded-2xl border shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6 ${dk ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
                    {/* Gauge */}
                    <div className="relative w-28 h-28 shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke={dk ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth="7" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke={ovColor} strokeWidth="7" strokeLinecap="round"
                          strokeDasharray={`${(sc.overall / 100) * 263.9} 263.9`}
                          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-black tabular-nums leading-none ${dk ? "text-white" : "text-gray-900"}`}>{sc.overall}</span>
                        <span className={`text-[9px] font-semibold uppercase tracking-widest mt-1 ${dk ? "text-white/30" : "text-gray-400"}`}>score</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm font-black px-3 py-1 rounded-full border" style={{ color: ovColor, backgroundColor: ovColor + "18", borderColor: ovColor + "33" }}>
                          {gradeLabel(sc.overall)} — {gradeText(sc.overall)}
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {dims.map(d => {
                          const val = sc[d.key] ?? 0;
                          return (
                            <div key={d.key} className="flex items-center gap-3">
                              <span className={`text-[11px] font-semibold shrink-0 w-24 ${dk ? "text-gray-400" : "text-gray-500"}`}>{d.label}</span>
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: d.track }}>
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, val)}%`, backgroundColor: d.color }} />
                              </div>
                              <span className="text-[12px] font-black tabular-nums w-14 text-right" style={{ color: d.color }}>
                                {val}<span className={`text-[10px] font-normal ${dk ? "text-gray-600" : "text-gray-300"}`}>/100</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* AI Feedback */}
                  {sc.feedback && (
                    <div className={`rounded-2xl border shadow-sm p-5 ${dk ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${dk ? "text-gray-500" : "text-gray-400"}`}>AI Analysis</p>
                      <p className={`text-sm leading-relaxed ${dk ? "text-gray-300" : "text-gray-600"}`}>{sc.feedback}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className={`text-center py-14 rounded-2xl border ${dk ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
                  <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3 ${dk ? "bg-white/[0.04]" : "bg-gray-100"}`}>
                    <svg className={`w-6 h-6 ${dk ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <p className={`text-[14px] font-bold mb-1 ${dk ? "text-gray-400" : "text-gray-600"}`}>No Evaluation Yet</p>
                  <p className={`text-[12px] max-w-[220px] mx-auto ${dk ? "text-gray-600" : "text-gray-400"}`}>This script hasn't been evaluated yet.</p>
                </div>
              )}

              {/* Platform Editorial */}
              {(ps.strengths || ps.weaknesses || ps.prospects) && (
                <div className={`rounded-2xl border shadow-sm p-5 space-y-4 ${dk ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${dk ? "text-gray-500" : "text-gray-400"}`}>Platform Review</p>
                  {[
                    { key: "strengths",  label: "Strengths",  color: "#10b981", bg: dk ? "rgba(16,185,129,0.08)" : "#f0fdf4", border: dk ? "rgba(16,185,129,0.18)" : "#bbf7d0" },
                    { key: "weaknesses", label: "Weaknesses", color: "#ef4444", bg: dk ? "rgba(239,68,68,0.08)"   : "#fff1f2", border: dk ? "rgba(239,68,68,0.18)"   : "#fecdd3" },
                    { key: "prospects",  label: "Prospects",  color: "#6366f1", bg: dk ? "rgba(99,102,241,0.08)"  : "#eef2ff", border: dk ? "rgba(99,102,241,0.18)"  : "#c7d2fe" },
                  ].filter(s => ps[s.key]).map(s => (
                    <div key={s.key} className="rounded-xl p-4 border" style={{ backgroundColor: s.bg, borderColor: s.border }}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: s.color }}>{s.label}</p>
                      <p className={`text-[13px] leading-relaxed ${dk ? "text-gray-300" : "text-gray-700"}`}>{ps[s.key]}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })()}

        {activeTab === "details" && (
          <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`rounded-2xl border shadow-sm p-6 ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
              <h3 className={`text-base font-extrabold mb-3 ${dark ? "text-gray-100" : "text-gray-900"}`}>Description</h3>
              <p className={`text-sm leading-relaxed font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>{script.description || "No description provided."}</p>
            </div>
            <div className={`rounded-2xl border shadow-sm p-6 ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
              <h3 className={`text-base font-extrabold mb-3 ${dark ? "text-gray-100" : "text-gray-900"}`}>Script Info</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Genre", value: script.genre },
                  { label: "Content Type", value: script.contentType?.replace(/_/g, " ") },
                  { label: "Format", value: script.format?.replace(/_/g, " ") },
                  { label: "Pages", value: script.pageCount },
                  { label: "Budget", value: script.budget },
                  { label: "Uploaded", value: script.createdAt ? new Date(script.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null },
                ].filter((i) => i.value).map((i) => (
                  <div key={i.label} className={`flex justify-between items-center py-2 border-b last:border-0 ${dark ? "border-[#333]" : "border-gray-50"}`}>
                    <span className="text-xs text-gray-400 font-bold">{i.label}</span>
                    <span className={`text-xs font-bold capitalize ${dark ? "text-gray-200" : "text-gray-700"}`}>{i.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {script.tags?.length > 0 && (
              <div className={`rounded-2xl border shadow-sm p-6 ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
                <h3 className={`text-base font-extrabold mb-3 ${dark ? "text-gray-100" : "text-gray-900"}`}>Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {script.tags.map((tag) => (
                    <span key={tag} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${dark ? "bg-white/[0.06] text-gray-300" : "bg-gray-50 text-gray-500"}`}>#{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {script.roles?.length > 0 && (
              <div className={`rounded-2xl border shadow-sm p-6 ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
                <h3 className={`text-base font-extrabold mb-3 ${dark ? "text-gray-100" : "text-gray-900"}`}>Roles</h3>
                <div className="space-y-3">
                  {script.roles.map((role) => (
                    <div key={role._id} className={`p-3 rounded-xl ${dark ? "bg-white/[0.04]" : "bg-gray-50"}`}>
                      <p className={`font-bold text-sm ${dark ? "text-gray-100" : "text-gray-900"}`}>{role.characterName}</p>
                      {role.type && <p className="text-xs text-gray-500 font-medium mt-0.5">{role.type}</p>}
                      {role.description && <p className="text-xs text-gray-400 mt-1">{role.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScriptReader;

