import { useState } from "react";

const labels = ["Poor", "Fair", "Good", "Great", "Excellent"];

const ReviewForm = ({ onSubmit, loading = false, isEditing = false, initialRating = 0, initialComment = "" }) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating < 1 || !comment.trim()) return;
    onSubmit({ rating, comment: comment.trim() });
    if (!isEditing) { setRating(0); setComment(""); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-extrabold text-gray-900 mb-4">{isEditing ? "Edit Review" : "Write a Review"}</h3>

      {/* Star rating */}
      <div className="mb-4">
        <label className="text-sm font-bold text-gray-500 mb-2 block">Your Rating</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <svg className={`w-7 h-7 ${s <= (hover || rating) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} transition-colors`} viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
          {(hover || rating) > 0 && (
            <span className="ml-2 text-sm font-bold text-gray-500">{labels[(hover || rating) - 1]}</span>
          )}
        </div>
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className="text-sm font-bold text-gray-500 mb-2 block">Your Feedback</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you think about this script?"
          rows={4}
          maxLength={2000}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1e3a5f] resize-none transition-colors font-medium"
        />
        <p className="text-xs text-gray-300 text-right mt-1 font-bold">{comment.length}/2000</p>
      </div>

      <button
        type="submit"
        disabled={loading || rating < 1 || !comment.trim()}
        className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl font-bold text-sm hover:bg-[#162d4a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {isEditing ? "Update Review" : "Submit Review"}
      </button>
    </form>
  );
};

export default ReviewForm;
