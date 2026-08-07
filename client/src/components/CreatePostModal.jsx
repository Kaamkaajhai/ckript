import { useState, useContext } from "react";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import { safeMediaSrc } from "../utils/safeMediaSrc";

// A post preview carries stills and clips alike, so data: URLs of all three media kinds pass. The
// video element shares this guard with the image, and an image-only allowlist rejected
// "data:video/mp4;…" — a valid, playable source the submit handler went on to post anyway.
const POST_MEDIA = { media: ["image", "video", "audio"] };

const CreatePostModal = ({ onClose, onPostCreated }) => {
  const { user } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content && !image && !video) {
      setError("Please add some content, image, or video");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const { data} = await api.post("/posts/create", {
        content,
        image,
        video,
      });

      onPostCreated({
        ...data,
        user: {
          _id: user._id,
          name: user.name,
          profileImage: user.profileImage,
          role: user.role,
        },
        likes: [],
        comments: [],
        saves: [],
      });
      
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-xl shadow-2xl max-w-2xl w-full p-6 ${dark ? 'bg-[#101e30]' : 'bg-white'}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${dark ? 'text-gray-100' : 'text-gray-800'}`}>Create Post</h2>
          <button
            onClick={onClose}
            className={`text-3xl leading-none ${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block font-bold mb-2 text-base ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              What's on your mind?
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-[#111111] focus:border-transparent text-base ${dark ? 'bg-[#242424] border-[#444] text-gray-200 placeholder-gray-600' : 'border-gray-300'}`}
              rows="5"
              placeholder="Share your thoughts, scripts, or updates..."
            />
          </div>

          <div>
            <label className={`block font-bold mb-2 text-base ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              Image URL (optional)
            </label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-[#111111] focus:border-transparent text-base ${dark ? 'bg-[#242424] border-[#444] text-gray-200 placeholder-gray-600' : 'border-gray-300'}`}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className={`block font-bold mb-2 text-base ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
              Video URL (optional)
            </label>
            <input
              type="url"
              value={video}
              onChange={(e) => setVideo(e.target.value)}
              className={`w-full p-3.5 border rounded-lg focus:ring-2 focus:ring-[#111111] focus:border-transparent text-base ${dark ? 'bg-[#242424] border-[#444] text-gray-200 placeholder-gray-600' : 'border-gray-300'}`}
              placeholder="https://..."
            />
          </div>

          {(image || video) && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Preview:</p>
              {image && (
                <img
                  src={safeMediaSrc(image, POST_MEDIA)}
                  alt="Preview"
                  className="max-h-48 rounded-lg mb-2"
                  onError={(e) => {
                    e.target.style.display = "none";
                    setError("Invalid image URL");
                  }}
                />
              )}
              {video && (
                <video
                  src={safeMediaSrc(video, POST_MEDIA)}
                  controls
                  className="max-h-48 rounded-lg"
                  onError={(e) => {
                    e.target.style.display = "none";
                    setError("Invalid video URL");
                  }}
                />
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-6 py-3 rounded-lg transition text-base font-semibold ${dark ? 'bg-[#333] text-gray-300 hover:bg-[#444]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#111111] text-white rounded-lg hover:bg-[#000000] transition disabled:opacity-50 text-base font-bold"
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreatePostModal;
