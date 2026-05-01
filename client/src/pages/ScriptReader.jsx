import { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import ReviewCard from "../components/ReviewCard";
import ReviewForm from "../components/ReviewForm";
import ConfirmDialog from "../components/ConfirmDialog";
import { Film } from "lucide-react";
import { getScriptCanonicalPath } from "../utils/scriptPath";
import { getProfileCanonicalPath } from "../utils/profilePath";
import {
  getScriptCompletionBadgeClasses,
  getScriptCompletionFuturePlans,
  getScriptCompletionProgressText,
  getScriptCompletionStatusLabel,
} from "../utils/scriptCompletion";

const ScriptReader = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [pendingDeleteReviewId, setPendingDeleteReviewId] = useState("");

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5002${url}`;
  };

  const completionLabel = getScriptCompletionStatusLabel(script || {});
  const completionProgress = getScriptCompletionProgressText(script || {});
  const completionFuturePlans = getScriptCompletionFuturePlans(script || {});

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
    if (!canSubmitReview) {
      setReviewFeedback(reviewGateMessage);
      return;
    }

    try {
      setSubmitLoading(true);
      setReviewFeedback("");
      if (editingReview) {
        await api.put(`/reviews/${editingReview._id}`, { rating, comment });
        setEditingReview(null);
      } else {
        await api.post("/reviews", { script: id, rating, comment });
      }
      await fetchReviews(); await fetchScript();
    } catch (err) { setReviewFeedback(err.response?.data?.message || "Failed to submit review"); }
    finally { setSubmitLoading(false); }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!canSubmitReview) {
      setReviewFeedback(reviewGateMessage);
      return;
    }

    setPendingDeleteReviewId(reviewId);
  };

  const confirmDeleteReview = async () => {
    if (!pendingDeleteReviewId) return;
    try {
      setReviewFeedback("");
      await api.delete(`/reviews/${pendingDeleteReviewId}`);
      setMyReview(null);
      await fetchReviews();
      await fetchScript();
    } catch {
      setReviewFeedback("Failed to delete review");
    } finally {
      setPendingDeleteReviewId("");
    }
  };

  const handleEditReview = (review) => {
    if (!canSubmitReview) {
      setReviewFeedback(reviewGateMessage);
      return;
    }

    setEditingReview(review);
    setActiveTab("reviews");
  };

  const isUnlocked = !script?.premium || script?.isCreator || script?.isUnlocked;
  const isPro = ["investor", "producer", "director"].includes(user?.role);
  const isReaderReviewer = String(user?.role || "").toLowerCase() === "reader";
  const canSubmitReview = Boolean(
    user?._id &&
    isReaderReviewer &&
    !script?.isCreator &&
    script?.status === "published"
  );
  const reviewGateMessage = !isReaderReviewer
    ? "Only readers can submit reviews."
    : script?.isCreator
      ? "You cannot review your own project."
      : "Reviews are available after the project is published.";

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
    <>
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
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide ${getScriptCompletionBadgeClasses(script, dark)}`}>{completionLabel}</span>
              {completionProgress && <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${dark ? "bg-white/[0.04] text-gray-400" : "bg-gray-50 text-gray-500 border border-gray-100"}`}>{completionProgress}</span>}
            </div>

            {/* Title */}
            <h1 className={`text-2xl md:text-3xl font-extrabold mb-2 tracking-tight ${dark ? "text-gray-100" : "text-gray-900"}`}>{script.title}</h1>

            {/* Logline / Synopsis */}
            {(script.logline || script.synopsis || script.description) && (
              <p className="text-gray-500 text-[15px] leading-relaxed mb-5 max-w-xl">{script.logline || script.synopsis || script.description}</p>
            )}

            {/* Author */}
            <Link to={getProfileCanonicalPath(script.creator)} className="inline-flex items-center gap-3 mb-5 group">
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
                <button
                  onClick={() => navigate(getScriptCanonicalPath(script))}
                  className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Request to Buy – ₹{script.price}
                </button>
              )}
              {!isUnlocked && !isPro && !script.isCreator && (
                <p className="text-xs text-amber-500 font-semibold">Sign in as a producer, director, or investor to unlock.</p>
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
          { key: "insights", label: "Insights" },
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
              {completionFuturePlans && (
                <div className={`mt-5 rounded-xl border p-4 ${dark ? "bg-white/[0.03] border-white/[0.08]" : "bg-gray-50 border-gray-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${dark ? "text-gray-400" : "text-gray-500"}`}>Future Updates</p>
                  <p className={`mt-1 text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-700"}`}>{completionFuturePlans}</p>
                </div>
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
            {reviewFeedback && (
              <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${dark ? "bg-red-500/10 border-red-400/30 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}>
                {reviewFeedback}
              </div>
            )}
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
                {canSubmitReview ? (
                  (!myReview || editingReview) ? (
                    <ReviewForm onSubmit={handleSubmitReview} loading={submitLoading} isEditing={!!editingReview} initialRating={editingReview?.rating || 0} initialComment={editingReview?.comment || ""} />
                  ) : (
                    <div className={`bg-white rounded-2xl border shadow-sm p-5 text-center ${dark ? "bg-[#101e30] border-[#333]" : "border-gray-100"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${dark ? "bg-emerald-500/15" : "bg-emerald-50"}`}>
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-sm font-bold text-gray-800 mb-0.5">Review submitted</p>
                      <p className="text-xs text-gray-400 font-medium">You can edit or delete your review from below.</p>
                    </div>
                  )
                ) : (
                  <div className={`rounded-2xl border shadow-sm p-5 text-center ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
                    <p className={`text-sm font-bold mb-1 ${dark ? "text-gray-200" : "text-gray-700"}`}>Review access restricted</p>
                    <p className="text-xs text-gray-400 font-medium">{reviewGateMessage}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Review list */}
              <div className="lg:col-span-2 space-y-3">
                {reviewsLoading ? (
                  [...Array(3)].map((_, i) => <div key={i} className={`h-28 rounded-2xl animate-pulse ${dark ? "bg-[#333]" : "bg-gray-50"}`} />)
                ) : reviews.length > 0 ? (
                  <>
                    {reviews.map((r) => (
                      <ReviewCard
                        key={r._id}
                        review={r}
                        currentUserId={user?._id}
                        onEdit={canSubmitReview ? handleEditReview : undefined}
                        onDelete={canSubmitReview ? handleDeleteReview : undefined}
                      />
                    ))}
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
          const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const card = dk ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100";

          const dims = [
            { key: "plot",          label: "Plot",          icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: dk ? "#818cf8" : "#4f46e5" },
            { key: "characters",    label: "Characters",    icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", color: dk ? "#a78bfa" : "#7c3aed" },
            { key: "dialogue",      label: "Dialogue",      icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z", color: dk ? "#34d399" : "#059669" },
            { key: "pacing",        label: "Pacing",        icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", color: dk ? "#fbbf24" : "#d97706" },
            { key: "marketability", label: "Marketability", icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941", color: dk ? "#fb923c" : "#ea580c" },
          ];

          const gradeLabel = (v) => v >= 90 ? "S" : v >= 80 ? "A" : v >= 70 ? "B" : v >= 60 ? "C" : v >= 50 ? "D" : "F";
          const gradeColor = (v) =>
            v >= 90 ? (dk ? "#c084fc" : "#9333ea") :
            v >= 80 ? (dk ? "#34d399" : "#059669") :
            v >= 70 ? (dk ? "#60a5fa" : "#2563eb") :
            v >= 60 ? (dk ? "#fbbf24" : "#d97706") :
                       (dk ? "#f87171" : "#dc2626");
          const gradeText = (v) => v >= 90 ? "Exceptional" : v >= 80 ? "Excellent" : v >= 70 ? "Strong" : v >= 60 ? "Promising" : v >= 50 ? "Developing" : "Needs Work";
          const gradeBand = (v) =>
            v >= 90 ? (dk ? "bg-purple-400/10 border-purple-400/20 text-purple-300"   : "bg-purple-50 border-purple-200 text-purple-700") :
            v >= 80 ? (dk ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700") :
            v >= 70 ? (dk ? "bg-blue-400/10 border-blue-400/20 text-blue-300"         : "bg-blue-50 border-blue-200 text-blue-700") :
            v >= 60 ? (dk ? "bg-amber-400/10 border-amber-400/20 text-amber-300"       : "bg-amber-50 border-amber-200 text-amber-700") :
                       (dk ? "bg-red-400/10 border-red-400/20 text-red-300"             : "bg-red-50 border-red-200 text-red-700");

          /* Radar geometry */
          const cx = 110, cy = 110, rr = 80;
          const angleStep = (2 * Math.PI) / dims.length;
          const radarPts = dims.map((d, i) => {
            const v = (sc[d.key] || 0) / 100;
            const a = angleStep * i - Math.PI / 2;
            return { x: cx + rr * v * Math.cos(a), y: cy + rr * v * Math.sin(a) };
          });
          const gridLevels = [0.25, 0.5, 0.75, 1];
          const overallColor = gradeColor(sc.overall || 0);

          return (
            <motion.div key="evaluation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {sc.overall ? (
                <>
                  {/* ── 1. Score Hero ── */}
                  <div className={`rounded-2xl border overflow-hidden ${card}`}>
                    <div className="flex flex-col sm:flex-row items-center gap-0 divide-y sm:divide-y-0 sm:divide-x"
                      style={{ divideColor: dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>

                      {/* Overall gauge */}
                      <div className="flex flex-col items-center justify-center gap-3 px-8 py-7 sm:w-56 shrink-0">
                        <div className="relative w-28 h-28">
                          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="42" fill="none"
                              stroke={dk ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth="7" />
                            <circle cx="50" cy="50" r="42" fill="none"
                              stroke={overallColor} strokeWidth="7" strokeLinecap="round"
                              strokeDasharray={`${(sc.overall / 100) * 263.9} 263.9`}
                              style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-3xl font-black tabular-nums leading-none ${dk ? "text-white" : "text-gray-900"}`}>{sc.overall}</span>
                            <span className={`text-[9px] font-semibold uppercase tracking-widest mt-1 ${dk ? "text-white/30" : "text-gray-400"}`}>score</span>
                          </div>
                        </div>
                        {/* Grade badge */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${gradeBand(sc.overall)}`}>
                          <span className="text-base font-black leading-none">{gradeLabel(sc.overall)}</span>
                          <span>{gradeText(sc.overall)}</span>
                        </div>
                      </div>

                      {/* Dimension pills grid */}
                      <div className="flex-1 px-6 py-6">
                        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-4 ${dk ? "text-white/25" : "text-gray-400"}`}>
                          Dimension Scores{sc.scoredAt ? ` · ${fmtDate(sc.scoredAt)}` : ""}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {dims.map(d => {
                            const val = sc[d.key] || 0;
                            return (
                              <div key={d.key}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${dk ? "bg-white/[0.03] border-white/[0.07]" : "bg-gray-50/80 border-gray-200/60"}`}>
                                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                                  style={{ backgroundColor: `${d.color}${dk ? "18" : "10"}` }}>
                                  <svg className="w-4 h-4" style={{ color: d.color }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={d.icon} />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-[10px] font-medium truncate ${dk ? "text-white/35" : "text-gray-400"}`}>{d.label}</p>
                                  <p className="text-sm font-black tabular-nums leading-tight" style={{ color: d.color }}>{val}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── 2. Radar + Bar Chart ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                    {/* Radar */}
                    <div className={`rounded-2xl border p-5 ${card}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${dk ? "text-white/25" : "text-gray-400"}`}>Performance Radar</p>
                      <svg viewBox="0 0 220 220" className="w-full max-w-xs mx-auto">
                        <defs>
                          <radialGradient id="readerRadarFill" cx="50%" cy="50%" r="50%">
                            <stop offset="0%"   stopColor={overallColor} stopOpacity={dk ? "0.22" : "0.16"} />
                            <stop offset="100%" stopColor={overallColor} stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        {/* Grid rings */}
                        {gridLevels.map((lv, gi) => {
                          const pts = dims.map((_, j) => {
                            const a = angleStep * j - Math.PI / 2;
                            return `${cx + rr * lv * Math.cos(a)},${cy + rr * lv * Math.sin(a)}`;
                          }).join(" ");
                          return <polygon key={gi} points={pts} fill="none"
                            stroke={dk ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth="1" />;
                        })}
                        {/* Axis spokes */}
                        {dims.map((_, i) => {
                          const a = angleStep * i - Math.PI / 2;
                          return <line key={i} x1={cx} y1={cy} x2={cx + rr * Math.cos(a)} y2={cy + rr * Math.sin(a)}
                            stroke={dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="1" />;
                        })}
                        {/* Data shape */}
                        <polygon points={radarPts.map(p => `${p.x},${p.y}`).join(" ")}
                          fill="url(#readerRadarFill)" stroke={overallColor} strokeWidth="2" strokeLinejoin="round" />
                        {/* Dots + labels */}
                        {radarPts.map((p, i) => {
                          const a = angleStep * i - Math.PI / 2;
                          const lx = cx + (rr + 22) * Math.cos(a);
                          const ly = cy + (rr + 22) * Math.sin(a);
                          const axisX = Math.cos(a);
                          const labelAnchor = axisX > 0.2 ? "end" : axisX < -0.2 ? "start" : "middle";
                          const labelX = lx + (axisX > 0.2 ? -4 : axisX < -0.2 ? 4 : 0);
                          return (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="4" fill={dims[i].color}
                                stroke={dk ? "#0d1829" : "#ffffff"} strokeWidth="2" />
                              <text x={labelX} y={ly} textAnchor={labelAnchor} dominantBaseline="middle"
                                style={{ fontSize: 8.5, fontWeight: 700, fill: dk ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
                                {dims[i].label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Bar Chart */}
                    <div className={`rounded-2xl border p-5 ${card}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${dk ? "text-white/25" : "text-gray-400"}`}>Score Overview</p>
                      {(() => {
                        const barH = 180;
                        const bars = [{ key: "overall", label: "Overall", color: overallColor }, ...dims];
                        const gridLines = [0, 25, 50, 75, 100];
                        const gridColor = dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
                        const labelColor = dk ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
                        const chartWidth = 308;
                        const chartPadLeft = 26;
                        const chartPadRight = 8;
                        const plotWidth = chartWidth - chartPadLeft - chartPadRight;
                        const slotW = plotWidth / bars.length;
                        const barW = Math.min(slotW * 0.56, 30);
                        return (
                          <svg viewBox={`0 0 ${chartWidth} ${barH + 56}`} className="w-full">
                            {gridLines.map(v => {
                              const y = barH - (v / 100) * barH + 4;
                              return (
                                <g key={v}>
                                  <line x1={chartPadLeft} y1={y} x2={chartWidth - chartPadRight} y2={y} stroke={gridColor} strokeWidth={v === 0 ? "1.5" : "1"} strokeDasharray={v === 0 ? "" : "3,3"} />
                                  <text x={chartPadLeft - 6} y={y + 3.5} textAnchor="end" style={{ fontSize: 8, fontWeight: 600, fill: labelColor }}>{v}</text>
                                </g>
                              );
                            })}
                            {bars.map((d, i) => {
                              const val = sc[d.key] || 0;
                              const filledH = (val / 100) * barH;
                              const slotCenterX = chartPadLeft + i * slotW + slotW / 2;
                              const x = slotCenterX - barW / 2;
                              const y = barH - filledH + 4;
                              const isFirst = i === 0;
                              const isLast = i === bars.length - 1;
                              const labelAnchor = isFirst ? "start" : isLast ? "end" : "middle";
                              const labelX = isFirst ? slotCenterX - 8 : isLast ? slotCenterX + 8 : slotCenterX;
                              const labelY = barH + 18 + (i % 2 === 0 ? 0 : 10);
                              return (
                                <g key={d.key}>
                                  <rect x={x} y={4} width={barW} height={barH} rx="4"
                                    fill={dk ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)"} />
                                  <rect x={x} y={y} width={barW} height={filledH} rx="4" fill={d.color}>
                                    <animate attributeName="height" from="0" to={filledH} dur="0.75s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                    <animate attributeName="y" from={barH + 4} to={y} dur="0.75s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                  </rect>
                                  <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                                    style={{ fontSize: 8, fontWeight: 800, fill: dk ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)" }}>{val}</text>
                                  <text x={labelX} y={labelY} textAnchor={labelAnchor}
                                    style={{ fontSize: 8, fontWeight: 700, fill: d.color }}>{d.label}</text>
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>

                  {/* ── 3. AI Feedback ── */}
                  {sc.feedback && (
                    <div className={`rounded-2xl border p-5 ${card}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${dk ? "text-white/25" : "text-gray-400"}`}>AI Analysis</p>
                      <p className={`text-sm leading-relaxed ${dk ? "text-white/60" : "text-gray-600"}`}>{sc.feedback}</p>
                    </div>
                  )}

                  {/* ── 4. Platform Editorial ── */}
                  {(() => {
                    const sections = [
                      { key: "strengths",  label: "Strengths",  icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",        band: dk ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700" },
                      { key: "weaknesses", label: "Weaknesses", icon: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z", band: dk ? "bg-red-400/10 border-red-400/20 text-red-300"             : "bg-red-50 border-red-200 text-red-700" },
                      { key: "prospects",  label: "Prospects",  icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941", band: dk ? "bg-indigo-400/10 border-indigo-400/20 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-700" },
                    ];
                    return (
                      <div className="space-y-3">
                        {sections.map(s => (
                          <div key={s.key} className={`rounded-2xl border overflow-hidden ${card}`}>
                            <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${dk ? "border-white/[0.06]" : "border-gray-100"}`}>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${s.band}`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                                </svg>
                                {s.label}
                              </span>
                              <span className={`ml-auto text-[10px] font-medium ${dk ? "text-white/20" : "text-gray-300"}`}>Platform Editorial</span>
                            </div>
                            <div className="px-5 py-4">
                              {ps[s.key] ? (
                                <p className={`text-sm leading-relaxed whitespace-pre-line ${dk ? "text-white/65" : "text-gray-600"}`}>{ps[s.key]}</p>
                              ) : (
                                <p className={`text-sm italic ${dk ? "text-white/20" : "text-gray-300"}`}>Not yet reviewed by the platform.</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className={`text-center py-16 rounded-2xl border ${card}`}>
                  <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${dk ? "bg-white/[0.04]" : "bg-gray-100"}`}>
                    <svg className={`w-6 h-6 ${dk ? "text-gray-500" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <h3 className={`text-base font-bold mb-1.5 ${dk ? "text-gray-300" : "text-gray-700"}`}>No Evaluation Yet</h3>
                  <p className={`text-sm max-w-xs mx-auto ${dk ? "text-gray-500" : "text-gray-400"}`}>This script hasn't been evaluated yet.</p>
                </div>
              )}
            </motion.div>
          );
        })()}

        {activeTab === "insights" && (() => {
          const sc = script.scriptScore || {};
          const dk = dark;
          const card = dk ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100";
          const gradeColor = (v) =>
            v >= 90 ? (dk ? "#c084fc" : "#9333ea") :
            v >= 80 ? (dk ? "#34d399" : "#059669") :
            v >= 70 ? (dk ? "#60a5fa" : "#2563eb") :
            v >= 60 ? (dk ? "#fbbf24" : "#d97706") :
                       (dk ? "#f87171" : "#dc2626");
          const gradeLabel = (v) => v >= 90 ? "S" : v >= 80 ? "A" : v >= 70 ? "B" : v >= 60 ? "C" : v >= 50 ? "D" : "F";
          const gradeText = (v) => v >= 90 ? "Exceptional" : v >= 80 ? "Excellent" : v >= 70 ? "Strong" : v >= 60 ? "Promising" : v >= 50 ? "Developing" : "Needs Work";
          const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const dims = [
            { key: "plot",          label: "Plot",          color: dk ? "#818cf8" : "#4f46e5", track: dk ? "rgba(129,140,248,0.12)" : "#ede9fe" },
            { key: "characters",    label: "Characters",    color: dk ? "#a78bfa" : "#7c3aed", track: dk ? "rgba(167,139,250,0.12)" : "#ede9fe" },
            { key: "dialogue",      label: "Dialogue",      color: dk ? "#34d399" : "#059669", track: dk ? "rgba(52,211,153,0.12)"  : "#d1fae5" },
            { key: "pacing",        label: "Pacing",        color: dk ? "#fbbf24" : "#d97706", track: dk ? "rgba(251,191,36,0.12)"  : "#fef3c7" },
            { key: "marketability", label: "Marketability", color: dk ? "#fb923c" : "#ea580c", track: dk ? "rgba(251,146,60,0.12)"  : "#ffedd5" },
          ];
          const overallColor = gradeColor(sc.overall || 0);
          const engStats = [
            {
              label: "Total Views",
              value: (script.views || 0).toLocaleString(),
              icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
              color: dk ? "#60a5fa" : "#2563eb",
              bg: dk ? "rgba(96,165,250,0.1)" : "#eff6ff",
              border: dk ? "rgba(96,165,250,0.2)" : "#bfdbfe",
            },
            {
              label: "Total Reads",
              value: (script.readsCount || 0).toLocaleString(),
              icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
              color: dk ? "#34d399" : "#059669",
              bg: dk ? "rgba(52,211,153,0.1)" : "#f0fdf4",
              border: dk ? "rgba(52,211,153,0.2)" : "#bbf7d0",
            },
            {
              label: "Reviews",
              value: (script.reviewCount || 0).toLocaleString(),
              icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
              color: dk ? "#fbbf24" : "#d97706",
              bg: dk ? "rgba(251,191,36,0.1)" : "#fffbeb",
              border: dk ? "rgba(251,191,36,0.2)" : "#fde68a",
            },
            {
              label: "Avg. Rating",
              value: (script.rating || 0).toFixed(1) + " / 5",
              icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z",
              color: dk ? "#f472b6" : "#db2777",
              bg: dk ? "rgba(244,114,182,0.1)" : "#fdf2f8",
              border: dk ? "rgba(244,114,182,0.2)" : "#fbcfe8",
            },
          ];
          return (
            <motion.div key="insights" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* ── Reader Engagement ── */}
              <div className={`rounded-2xl border overflow-hidden ${card}`}>
                <div className={`px-5 py-4 border-b flex items-center gap-3 ${dk ? "border-[#333]" : "border-gray-100"}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dk ? "bg-blue-500/10" : "bg-blue-50"}`}>
                    <svg className={`w-4 h-4 ${dk ? "text-blue-400" : "text-blue-500"}`} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${dk ? "text-gray-100" : "text-gray-900"}`}>Reader Engagement</p>
                    <p className={`text-[11px] font-medium ${dk ? "text-gray-500" : "text-gray-400"}`}>Audience interaction metrics</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {engStats.map((s) => (
                      <div key={s.label} className="rounded-xl border p-4 flex flex-col gap-2"
                        style={{ backgroundColor: s.bg, borderColor: s.border }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + "18" }}>
                          <svg className="w-4 h-4" style={{ color: s.color }} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xl font-black tabular-nums leading-tight" style={{ color: s.color }}>{s.value}</p>
                          <p className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${dk ? "text-gray-500" : "text-gray-400"}`}>{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rating bar breakdown */}
                  {script.reviewCount > 0 && (
                    <div className={`mt-4 rounded-xl border p-4 ${dk ? "bg-white/[0.03] border-white/[0.06]" : "bg-gray-50/60 border-gray-100"}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${dk ? "text-gray-500" : "text-gray-400"}`}>Rating Distribution</p>
                      <div className="flex items-end gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`text-3xl font-black tabular-nums ${dk ? "text-white" : "text-gray-900"}`}>{(script.rating || 0).toFixed(1)}</span>
                          <div className="flex gap-0.5 my-1">
                            {[1,2,3,4,5].map(s => (
                              <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.round(script.rating || 0) ? "text-amber-400 fill-amber-400" : (dk ? "text-gray-700 fill-gray-700" : "text-gray-200 fill-gray-200")}`} viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className={`text-[10px] font-semibold ${dk ? "text-gray-500" : "text-gray-400"}`}>{script.reviewCount} reviews</span>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {[5,4,3,2,1].map(star => (
                            <div key={star} className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold w-2 text-right ${dk ? "text-gray-500" : "text-gray-400"}`}>{star}</span>
                              <svg className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${dk ? "bg-white/[0.06]" : "bg-gray-200"}`}>
                                <div className="h-full bg-amber-400 rounded-full transition-all duration-700"
                                  style={{ width: `${star === Math.round(script.rating || 0) ? Math.min(100, (script.reviewCount / Math.max(1, script.reviewCount)) * 100) : Math.max(0, 100 - Math.abs(star - (script.rating || 0)) * 30)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── AI Analysis ── */}
              <div className={`rounded-2xl border overflow-hidden ${card}`}>
                <div className={`px-5 py-4 border-b flex items-center gap-3 ${dk ? "border-[#333]" : "border-gray-100"}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dk ? "bg-violet-500/10" : "bg-violet-50"}`}>
                    <svg className={`w-4 h-4 ${dk ? "text-violet-400" : "text-violet-500"}`} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${dk ? "text-gray-100" : "text-gray-900"}`}>AI Analysis</p>
                    <p className={`text-[11px] font-medium ${dk ? "text-gray-500" : "text-gray-400"}`}>
                      {sc.scoredAt ? `Evaluated · ${fmtDate(sc.scoredAt)}` : "Script quality evaluation"}
                    </p>
                  </div>
                  {sc.overall && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full border"
                        style={{ color: overallColor, backgroundColor: overallColor + "15", borderColor: overallColor + "30" }}>
                        {gradeLabel(sc.overall)} &mdash; {gradeText(sc.overall)}
                      </span>
                    </div>
                  )}
                </div>

                {sc.overall ? (
                  <div className="p-5 space-y-5">
                    {/* Score + dims in a clean 2-col layout */}
                    <div className="flex flex-col sm:flex-row gap-5">
                      {/* Gauge */}
                      <div className="flex flex-col items-center justify-center gap-2 sm:w-36 shrink-0 py-2">
                        <div className="relative w-24 h-24">
                          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="42" fill="none"
                              stroke={dk ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth="8" />
                            <circle cx="50" cy="50" r="42" fill="none"
                              stroke={overallColor} strokeWidth="8" strokeLinecap="round"
                              strokeDasharray={`${(sc.overall / 100) * 263.9} 263.9`}
                              style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-2xl font-black tabular-nums leading-none ${dk ? "text-white" : "text-gray-900"}`}>{sc.overall}</span>
                            <span className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${dk ? "text-white/30" : "text-gray-400"}`}>/ 100</span>
                          </div>
                        </div>
                        <p className={`text-[11px] font-semibold text-center ${dk ? "text-gray-400" : "text-gray-500"}`}>Overall Score</p>
                      </div>

                      {/* Dimension bars */}
                      <div className="flex-1 space-y-2.5 justify-center flex flex-col">
                        {dims.map(d => {
                          const val = sc[d.key] || 0;
                          return (
                            <div key={d.key} className="flex items-center gap-3">
                              <span className={`text-[11px] font-semibold shrink-0 w-24 ${dk ? "text-gray-400" : "text-gray-500"}`}>{d.label}</span>
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: d.track }}>
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, val)}%`, backgroundColor: d.color }} />
                              </div>
                              <span className="text-[12px] font-black tabular-nums shrink-0" style={{ color: d.color }}>{val}<span className={`text-[9px] font-normal ml-0.5 ${dk ? "text-gray-600" : "text-gray-300"}`}>/100</span></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI Feedback */}
                    {sc.feedback && (
                      <div className={`rounded-xl p-4 border ${dk ? "bg-white/[0.03] border-white/[0.06]" : "bg-violet-50/60 border-violet-100"}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${dk ? "text-violet-400" : "text-violet-500"}`}>AI Feedback</p>
                        <p className={`text-sm leading-relaxed ${dk ? "text-gray-300" : "text-gray-600"}`}>{sc.feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`flex flex-col items-center justify-center py-12 px-6 text-center`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${dk ? "bg-white/[0.04]" : "bg-gray-100"}`}>
                      <svg className={`w-6 h-6 ${dk ? "text-gray-600" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                      </svg>
                    </div>
                    <p className={`text-sm font-bold mb-1 ${dk ? "text-gray-400" : "text-gray-600"}`}>Not Yet Evaluated</p>
                    <p className={`text-xs max-w-[200px] ${dk ? "text-gray-600" : "text-gray-400"}`}>No AI analysis has been run on this script yet.</p>
                  </div>
                )}
              </div>

            </motion.div>
          );
        })()}

        {activeTab === "details" && (
          <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`rounded-2xl border shadow-sm p-6 ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
              <h3 className={`text-base font-extrabold mb-3 ${dark ? "text-gray-100" : "text-gray-900"}`}>Synopsis</h3>
              <p className={`text-sm leading-relaxed font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>{script.synopsis || script.description || "No synopsis provided."}</p>
            </div>
            <div className={`rounded-2xl border shadow-sm p-6 ${dark ? "bg-[#101e30] border-[#333]" : "bg-white border-gray-100"}`}>
              <h3 className={`text-base font-extrabold mb-3 ${dark ? "text-gray-100" : "text-gray-900"}`}>Script Info</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Company Name", value: script.companyName, preserveCase: true },
                  { label: "Genre", value: script.genre },
                  { label: "Content Type", value: script.contentType?.replace(/_/g, " ") },
                  { label: "Format", value: script.format?.replace(/_/g, " ") },
                  { label: "Completion", value: completionProgress ? `${completionLabel} · ${completionProgress}` : completionLabel, preserveCase: true },
                  { label: "Pages", value: script.pageCount },
                  { label: "Budget", value: script.budget },
                  { label: "Uploaded", value: script.createdAt ? new Date(script.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null },
                ].filter((i) => i.value).map((i) => (
                  <div key={i.label} className={`flex justify-between items-center py-2 border-b last:border-0 ${dark ? "border-[#333]" : "border-gray-50"}`}>
                    <span className="text-xs text-gray-400 font-bold">{i.label}</span>
                    <span className={`text-xs font-bold ${i.preserveCase ? "" : "capitalize"} ${dark ? "text-gray-200" : "text-gray-700"}`}>{i.value}</span>
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

    <ConfirmDialog
      open={Boolean(pendingDeleteReviewId)}
      title="Delete review"
      message="Delete this review? This cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={confirmDeleteReview}
      onCancel={() => setPendingDeleteReviewId("")}
      isDarkMode={dark}
    />
    </>
  );
};

export default ScriptReader;

