import { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import ReviewCard from "../components/ReviewCard";
import ReviewForm from "../components/ReviewForm";

const ScriptReader = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [script, setScript] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [hasRead, setHasRead] = useState(false);
  const [activeTab, setActiveTab] = useState("read");
  const [editingReview, setEditingReview] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [showContent, setShowContent] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [totalReviewPages, setTotalReviewPages] = useState(1);

  useEffect(() => { fetchScript(); fetchReviews(); }, [id]);

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
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f2337] via-[#1e3a5f] to-[#2d5a8e]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
          <Link to="/reader" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm font-bold mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back to Reader
          </Link>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Cover */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="shrink-0">
              {script.coverImage ? (
                <img src={script.coverImage} alt={script.title} className="w-48 h-64 md:w-56 md:h-80 object-cover rounded-2xl shadow-2xl ring-1 ring-white/10" />
              ) : (
                <div className="w-48 h-64 md:w-56 md:h-80 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
                  <svg className="w-16 h-16 text-white/30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>
              )}
            </motion.div>

            {/* Info */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-3">
                {script.genre && <span className="px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-bold text-white/80">{script.genre}</span>}
                {script.contentType && <span className="px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs font-bold text-white/80">{script.contentType.replace(/_/g, " ")}</span>}
                {script.premium && <span className="px-3 py-1 bg-amber-500/20 backdrop-blur rounded-full text-xs font-bold text-amber-300">Premium</span>}
                {script.isFeatured && <span className="px-3 py-1 bg-purple-500/20 backdrop-blur rounded-full text-xs font-bold text-purple-300">⭐ Featured</span>}
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white mb-3">{script.title}</h1>
              {script.logline && <p className="text-white/60 text-lg font-medium mb-4 max-w-2xl">{script.logline}</p>}

              {/* Author */}
              <Link to={`/profile/${script.creator?._id}`} className="inline-flex items-center gap-3 mb-6 group">
                {script.creator?.profileImage ? (
                  <img src={script.creator.profileImage} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/80">
                    {script.creator?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
                <div>
                  <p className="text-white font-bold group-hover:underline">{script.creator?.name || "Unknown"}</p>
                  <p className="text-white/40 text-xs font-medium">Writer</p>
                </div>
              </Link>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  {renderStars(script.rating || 0)}
                  <span className="text-white/60 text-sm font-bold">{(script.rating || 0).toFixed(1)} ({script.reviewCount || 0})</span>
                </div>
                <span className="text-white/30">·</span>
                <span className="text-white/60 text-sm font-bold">{script.readsCount || 0} reads</span>
                <span className="text-white/30">·</span>
                <span className="text-white/60 text-sm font-bold">{script.views || 0} views</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {!showContent && (
                  <button onClick={handleRecordRead} className="px-6 py-3 bg-white text-[#1e3a5f] rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    Start Reading
                  </button>
                )}
                <button onClick={handleToggleFavorite} className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isFavorited ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
                  <svg className={`w-5 h-5 ${isFavorited ? "fill-red-400" : ""}`} fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  {isFavorited ? "Favorited" : "Favorite"}
                </button>
                {script.premium && !isUnlocked && (
                  <button className="px-5 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Unlock – ${script.price}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-md">
          {[{ key: "read", label: "Read" }, { key: "reviews", label: `Reviews (${script.reviewCount || 0})` }, { key: "details", label: "Details" }].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === tab.key ? "bg-white text-[#1e3a5f] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <AnimatePresence mode="wait">
          {activeTab === "read" && (
            <motion.div key="read" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {script.synopsis && (
                <div className="mb-8">
                  <h3 className="text-lg font-extrabold text-gray-900 mb-3">Synopsis</h3>
                  <p className="text-gray-600 leading-relaxed font-medium">{script.synopsis}</p>
                </div>
              )}
              {showContent || hasRead ? (
                isUnlocked ? (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-lg font-extrabold text-gray-900">Full Script</h3>
                      {script.fileUrl && (
                        <a href={script.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#1e3a5f] hover:underline flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download PDF
                        </a>
                      )}
                    </div>
                    {script.fullContent ? (
                      <div className="p-6 md:p-10 max-h-[70vh] overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed">{script.fullContent}</pre>
                      </div>
                    ) : script.fileUrl ? (
                      <div className="p-6">
                        <iframe src={script.fileUrl} className="w-full h-[70vh] rounded-xl border border-gray-100" title="Script PDF" />
                      </div>
                    ) : (
                      <div className="p-12 text-center text-gray-400"><p className="font-bold">No content available</p></div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-10 text-center">
                    <svg className="w-12 h-12 text-amber-400 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                    <h3 className="text-xl font-extrabold text-gray-900 mb-2">Premium Content</h3>
                    <p className="text-gray-500 font-medium mb-4">Unlock this script for ${script.price} to read the full content.</p>
                    <button className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors">Unlock – ${script.price}</button>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <button onClick={handleRecordRead} className="px-8 py-4 bg-[#1e3a5f] text-white rounded-2xl font-bold hover:bg-[#162d4a] transition-colors text-lg flex items-center gap-3 mx-auto shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    Start Reading
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "reviews" && (
            <motion.div key="reviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  {!myReview || editingReview ? (
                    <ReviewForm onSubmit={handleSubmitReview} loading={submitLoading} isEditing={!!editingReview} initialRating={editingReview?.rating || 0} initialComment={editingReview?.comment || ""} />
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                      <svg className="w-10 h-10 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-green-800 font-bold mb-1">You&apos;ve reviewed this script</p>
                      <p className="text-green-600 text-sm font-medium">Edit or delete your review below.</p>
                    </div>
                  )}
                  {/* Rating Summary */}
                  <div className="mt-6 bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-sm">
                    <div className="text-center">
                      <p className="text-4xl font-black text-gray-900">{(script.rating || 0).toFixed(1)}</p>
                      <div className="flex justify-center mt-1">{renderStars(script.rating || 0)}</div>
                      <p className="text-sm text-gray-400 font-bold mt-1">{script.reviewCount || 0} reviews</p>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2 space-y-4">
                  {reviewsLoading ? (
                    [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)
                  ) : reviews.length > 0 ? (
                    <>
                      {reviews.map((r) => <ReviewCard key={r._id} review={r} currentUserId={user?._id} onEdit={handleEditReview} onDelete={handleDeleteReview} />)}
                      {totalReviewPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                          {[...Array(totalReviewPages)].map((_, i) => (
                            <button key={i} onClick={() => fetchReviews(i + 1)} className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${reviewPage === i + 1 ? "bg-[#1e3a5f] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{i + 1}</button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-400 font-bold">No reviews yet</p>
                      <p className="text-gray-300 text-sm font-medium mt-1">Be the first to review this script!</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "details" && (
            <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-extrabold text-gray-900 mb-4">Description</h3>
                <p className="text-gray-600 leading-relaxed font-medium">{script.description || "No description provided."}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-extrabold text-gray-900 mb-4">Script Info</h3>
                <div className="space-y-3">
                  {[
                    { label: "Genre", value: script.genre },
                    { label: "Content Type", value: script.contentType?.replace(/_/g, " ") },
                    { label: "Format", value: script.format?.replace(/_/g, " ") },
                    { label: "Pages", value: script.pageCount },
                    { label: "Budget", value: script.budget },
                    { label: "Uploaded", value: script.createdAt ? new Date(script.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null },
                  ].filter((i) => i.value).map((i) => (
                    <div key={i.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-400 font-bold">{i.label}</span>
                      <span className="text-sm text-gray-700 font-bold capitalize">{i.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {script.tags?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-extrabold text-gray-900 mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {script.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1.5 bg-gray-100 rounded-full text-xs font-bold text-gray-600">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {script.roles?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="text-lg font-extrabold text-gray-900 mb-4">Roles</h3>
                  <div className="space-y-3">
                    {script.roles.map((role) => (
                      <div key={role._id} className="p-3 bg-gray-50 rounded-xl">
                        <p className="font-bold text-gray-900">{role.characterName}</p>
                        {role.type && <p className="text-sm text-gray-500 font-medium mt-0.5">{role.type}</p>}
                        {role.description && <p className="text-sm text-gray-400 mt-1">{role.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {script.scriptScore?.overall && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 md:col-span-2">
                  <h3 className="text-lg font-extrabold text-gray-900 mb-4">Script Score</h3>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center">
                      <span className="text-2xl font-black text-white">{script.scriptScore.overall}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {["plot", "characters", "dialogue", "pacing", "marketability"].map((key) => (
                        script.scriptScore[key] != null && (
                          <div key={key}>
                            <p className="text-xs text-gray-400 font-bold capitalize">{key}</p>
                            <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#1e3a5f] rounded-full" style={{ width: `${script.scriptScore[key]}%` }} />
                            </div>
                            <p className="text-xs text-gray-600 font-bold mt-0.5">{script.scriptScore[key]}%</p>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ScriptReader;
