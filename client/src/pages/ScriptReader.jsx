import { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import ReviewCard from "../components/ReviewCard";
import ReviewForm from "../components/ReviewForm";
import { Film } from "lucide-react";

const ScriptReader = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
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

  useEffect(() => { fetchScript(); fetchReviews(); setCoverError(false); }, [id]);

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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
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
              {script.genre && <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[11px] font-bold text-gray-500 uppercase tracking-wide">{script.genre}</span>}
              {script.contentType && <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[11px] font-bold text-gray-500 uppercase tracking-wide">{script.contentType.replace(/_/g, " ")}</span>}
              {script.premium && <span className="px-2.5 py-1 bg-amber-50 border border-amber-200/60 rounded-lg text-[11px] font-bold text-amber-600 uppercase tracking-wide">Premium</span>}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">{script.title}</h1>

            {/* Description / Logline */}
            {(script.logline || script.description) && (
              <p className="text-gray-500 text-[15px] leading-relaxed mb-5 max-w-xl">{script.logline || script.description}</p>
            )}

            {/* Author */}
            <Link to={`/profile/${script.creator?._id}`} className="inline-flex items-center gap-3 mb-5 group">
              {script.creator?.profileImage ? (
                <img src={resolveImage(script.creator.profileImage)} alt=""
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentElement.querySelector('.avatar-fallback').style.display = 'flex'; }}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100" />
              ) : null}
              <div className={`avatar-fallback w-9 h-9 rounded-full bg-[#1e3a5f]/10 items-center justify-center text-xs font-bold text-[#1e3a5f] ${script.creator?.profileImage ? 'hidden' : 'flex'}`}>
                {script.creator?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 group-hover:text-[#1e3a5f] transition-colors">{script.creator?.name || "Unknown"}</p>
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
              <button onClick={handleToggleFavorite} className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${isFavorited ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}>
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
      <div className="flex gap-1 bg-gray-100/60 rounded-xl p-1 max-w-sm mb-6">
        {[
          { key: "synopsis", label: "Synopsis" },
          { key: "reviews", label: `Reviews (${script.reviewCount || 0})` },
          { key: "details", label: "Details" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-2.5 px-4 rounded-lg text-[13px] font-semibold transition-all ${activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "synopsis" && (
          <motion.div key="synopsis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <h3 className="text-lg font-extrabold text-gray-900 mb-4">Synopsis</h3>
              {script.synopsis ? (
                <p className="text-gray-600 leading-relaxed font-medium whitespace-pre-line">{script.synopsis}</p>
              ) : (
                <p className="text-gray-400 italic">No synopsis available for this script.</p>
              )}
            </div>

            {/* Locked content notice */}
            <div className="mt-6 bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              <p className="text-sm font-bold text-gray-700 mb-1">Full Script Content</p>
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
                <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
          <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-extrabold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-600 text-sm leading-relaxed font-medium">{script.description || "No description provided."}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-extrabold text-gray-900 mb-3">Script Info</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Genre", value: script.genre },
                  { label: "Content Type", value: script.contentType?.replace(/_/g, " ") },
                  { label: "Format", value: script.format?.replace(/_/g, " ") },
                  { label: "Pages", value: script.pageCount },
                  { label: "Budget", value: script.budget },
                  { label: "Uploaded", value: script.createdAt ? new Date(script.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null },
                ].filter((i) => i.value).map((i) => (
                  <div key={i.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400 font-bold">{i.label}</span>
                    <span className="text-xs text-gray-700 font-bold capitalize">{i.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {script.tags?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-extrabold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {script.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-bold text-gray-500">#{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {script.roles?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-extrabold text-gray-900 mb-3">Roles</h3>
                <div className="space-y-3">
                  {script.roles.map((role) => (
                    <div key={role._id} className="p-3 bg-gray-50 rounded-xl">
                      <p className="font-bold text-gray-900 text-sm">{role.characterName}</p>
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

