import { useState, useContext } from "react";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const CreatePostModal = ({ onClose, onPostCreated }) => {
  const { user } = useContext(AuthContext);
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
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Create Post</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
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
            <label className="block text-gray-700 font-semibold mb-2">
              What's on your mind?
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows="5"
              placeholder="Share your thoughts, scripts, or updates..."
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Image URL (optional)
            </label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Video URL (optional)
            </label>
            <input
              type="url"
              value={video}
              onChange={(e) => setVideo(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>

          {(image || video) && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Preview:</p>
              {image && (
                <img
                  src={image}
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
                  src={video}
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
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
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
