import { useState, useContext } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const genres = ["Drama", "Comedy", "Thriller", "Horror", "Action", "Romance", "Sci-Fi", "Fantasy", "Documentary", "Animation"];

const ScriptUpload = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "", description: "", genre: "", scriptUrl: "", coverImage: "", price: "", isPremium: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/scripts/upload", formData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload script");
    } finally { setLoading(false); }
  };

  if (user?.role !== "creator") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 sm:p-10 max-w-sm text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-600">Only creators can upload scripts. Switch to a creator account.</p>
        </div>
      </div>
    );
  }

  const inputCls = "w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-5 sm:mb-6">
          <span className="text-2xl">🎬</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Upload Your Script</h1>
            <p className="text-xs sm:text-sm text-gray-500">Share your creative work with investors and producers</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          {error && (
            <div className="mb-5 px-4 py-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1.5">Script Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="Enter your script title" className={inputCls} />
            </div>

            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1.5">Description *</label>
              <textarea name="description" value={formData.description} onChange={handleChange} required rows={3} placeholder="Brief description of your script..." className={inputCls} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1.5">Genre *</label>
                <select name="genre" value={formData.genre} onChange={handleChange} required className={inputCls}>
                  <option value="">Select a genre</option>
                  {genres.map((g) => (<option key={g} value={g}>{g}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1.5">Price (USD) *</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" placeholder="99.99" className={inputCls} />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1.5">Script File URL *</label>
              <input type="url" name="scriptUrl" value={formData.scriptUrl} onChange={handleChange} required placeholder="https://example.com/your-script.pdf" className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Upload to cloud storage and paste the public link</p>
            </div>

            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1.5">Cover Image URL</label>
              <input type="url" name="coverImage" value={formData.coverImage} onChange={handleChange} placeholder="https://example.com/cover.jpg" className={inputCls} />
              {formData.coverImage && (
                <div className="mt-3">
                  <img src={formData.coverImage} alt="Preview" className="w-full h-36 sm:h-44 object-cover rounded-xl" onError={(e) => { e.target.src = "https://via.placeholder.com/400x300?text=Invalid+URL"; }} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
              <input type="checkbox" name="isPremium" checked={formData.isPremium} onChange={handleChange} id="isPremium" className="w-5 h-5 text-indigo-600 rounded" />
              <label htmlFor="isPremium">
                <span className="text-sm font-semibold text-gray-800">Mark as Premium Content</span>
                <p className="text-xs text-gray-500">Featured placement and exclusive exposure</p>
              </label>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                {loading ? "Uploading..." : "Upload Script"}
              </button>
              <button type="button" onClick={() => navigate("/dashboard")}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ScriptUpload;
