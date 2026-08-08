import { motion } from "framer-motion";
import { useDarkMode } from "../context/DarkModeContext";

const ReviewCard = ({ review, currentUserId, onEdit, onDelete }) => {
  const { isDarkMode: dark } = useDarkMode();
  if (!review) return null;
  const isOwner = review.user?._id === currentUserId;

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5002${url}`;
  };

  const renderStars = (rating) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? "text-amber-400 fill-amber-400" : dark ? "text-gray-600 fill-gray-600" : "text-gray-200 fill-gray-200"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );

  const timeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const ratingLabel = ["", "Poor", "Fair", "Good", "Great", "Excellent"][review.rating] || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border shadow-sm hover:-translate-y-0.5 transition-all duration-300 ${dark ? "bg-[#101e30] border-[#333] hover:shadow-lg hover:shadow-[#020609]/20" : "bg-white border-gray-100 hover:shadow-lg hover:shadow-gray-100"}`}
    >
      <div className="p-5">
        {/* Header: Avatar + Name + Time + Actions */}
        <div className="flex items-start gap-3 mb-3">
          {review.user?.profileImage ? (
            <img
              src={resolveImage(review.user.profileImage)}
              alt=""
              className={`w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ${dark ? "ring-[#333]" : "ring-gray-100"}`}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-[#111111]/10 to-[#333333]/10 flex items-center justify-center text-sm font-bold shrink-0 ${dark ? "text-gray-100" : "text-[#111111]"}`}>
              {review.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-sm ${dark ? "text-gray-100" : "text-gray-900"}`}>{review.user?.name || "Anonymous"}</span>
              {review.user?.role && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${dark ? "bg-white/[0.06] text-gray-400" : "bg-gray-100 text-gray-400"}`}>
                  {review.user.role}
                </span>
              )}
            </div>
            <p className={`text-[11px] font-medium mt-0.5 ${dark ? "text-gray-300" : "text-gray-400"}`}>{timeAgo(review.createdAt)}</p>
          </div>

          {/* Owner actions */}
          {isOwner && (onEdit || onDelete) && (
            <div className="flex gap-0.5 shrink-0 -mt-0.5">
              <button
                onClick={() => onEdit?.(review)}
                className={`p-2 text-gray-300 rounded-lg transition-colors ${dark ? "hover:text-white hover:bg-white/[0.06]" : "hover:text-[#111111] hover:bg-[#111111]/[0.05]"}`}
                title="Edit"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete?.(review._id)}
                className={`p-2 text-gray-300 hover:text-red-500 rounded-lg transition-colors ${dark ? "hover:bg-red-500/10" : "hover:bg-red-50"}`}
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Rating row */}
        <div className="flex items-center gap-2.5 mb-3">
          {renderStars(review.rating)}
          <span className={`text-xs font-bold ${review.rating >= 4 ? "text-emerald-500" : review.rating >= 3 ? "text-yellow-500" : "text-orange-400"
            }`}>
            {ratingLabel}
          </span>
        </div>

        {/* Comment */}
        <p className={`text-[13px] leading-relaxed font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>{review.comment}</p>
      </div>
    </motion.div>
  );
};

export default ReviewCard;
