import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const genres = ["Drama", "Comedy", "Thriller", "Horror", "Action", "Romance", "Sci-Fi", "Fantasy", "Documentary", "Animation"];
const contentTypes = [
  { value: "feature_film", label: "Feature Film" },
  { value: "short_film", label: "Short Film" },
  { value: "tv_series", label: "TV Series" },
  { value: "documentary", label: "Documentary" },
  { value: "web_series", label: "Web Series" },
  { value: "other", label: "Other" },
];
const budgetLevels = [
  { value: "micro", label: "Micro (< $50K)" },
  { value: "low", label: "Low ($50K – $500K)" },
  { value: "medium", label: "Medium ($500K – $5M)" },
  { value: "high", label: "High ($5M – $50M)" },
  { value: "blockbuster", label: "Blockbuster ($50M+)" },
];

const ScriptUpload = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "", description: "", synopsis: "", genre: "", contentType: "feature_film",
    scriptUrl: "", coverImage: "", price: "", isPremium: false, budget: "medium",
    holdFee: "200", tags: "",
  });
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState({ characterName: "", type: "", description: "", ageMin: "", ageMax: "", gender: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const addRole = () => {
    if (!newRole.characterName || !newRole.type) return;
    setRoles([...roles, {
      ...newRole,
      ageRange: (newRole.ageMin && newRole.ageMax) ? { min: Number(newRole.ageMin), max: Number(newRole.ageMax) } : undefined,
    }]);
    setNewRole({ characterName: "", type: "", description: "", ageMin: "", ageMax: "", gender: "" });
  };

  const removeRole = (idx) => setRoles(roles.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        roles,
        holdFee: Number(formData.holdFee) || 200,
      };
      await api.post("/scripts/upload", payload);
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

  const inputCls = "w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a365d] focus:border-transparent transition";

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

        {/* Step indicators */}
        <div className="flex gap-2 mb-5">
          {[1, 2, 3].map(s => (
            <button key={s} onClick={() => setStep(s)}
              className={`flex-1 h-2 rounded-full transition ${step >= s ? "bg-[#0f2544]" : "bg-gray-200"}`} />
          ))}
        </div>
        <p className="text-xs text-gray-500 mb-4">Step {step} of 3 — {step === 1 ? "Basic Info" : step === 2 ? "Details & Roles" : "Pricing & Upload"}</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          {error && (
            <div className="mb-5 px-4 py-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <AnimatePresence mode="wait">
              {/* ── Step 1: Basic Info ── */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1.5">Script Title *</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="Enter your script title" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1.5">Logline / Description *</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} required rows={2} placeholder="One-line hook that sells the concept..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1.5">Synopsis</label>
                    <textarea name="synopsis" value={formData.synopsis} onChange={handleChange} rows={4} placeholder="Detailed summary of the story, characters, and arcs..." className={inputCls} />
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
                      <label className="block text-sm text-gray-700 font-medium mb-1.5">Content Type *</label>
                      <select name="contentType" value={formData.contentType} onChange={handleChange} className={inputCls}>
                        {contentTypes.map(ct => (<option key={ct.value} value={ct.value}>{ct.label}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="button" onClick={() => setStep(2)}
                      className="px-6 py-2.5 bg-[#0f2544] text-white rounded-xl text-sm font-medium hover:bg-[#1a365d] transition">
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Details & Roles ── */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1.5">Tags</label>
                    <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="thriller, detective, comeback (comma-separated)" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1.5">Cover Image URL</label>
                    <input type="url" name="coverImage" value={formData.coverImage} onChange={handleChange} placeholder="https://example.com/cover.jpg" className={inputCls} />
                    {formData.coverImage && (
                      <img src={formData.coverImage} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-xl" onError={(e) => { e.target.style.display = "none"; }} />
                    )}
                  </div>

                  {/* Roles section */}
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-2">Character Roles (for Talent Attachment)</label>
                    {roles.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {roles.map((r, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-[#edf2f7] rounded-xl p-3">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-gray-800">🎭 {r.characterName}</span>
                              <span className="text-xs text-[#0f2544] ml-2">{r.type}</span>
                              {r.gender && <span className="text-xs text-gray-500 ml-2">({r.gender})</span>}
                            </div>
                            <button type="button" onClick={() => removeRole(idx)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={newRole.characterName} onChange={e => setNewRole({...newRole, characterName: e.target.value})}
                          placeholder="Character name" className={inputCls} />
                        <input type="text" value={newRole.type} onChange={e => setNewRole({...newRole, type: e.target.value})}
                          placeholder="Type (e.g. Like Liam Neeson)" className={inputCls} />
                      </div>
                      <input type="text" value={newRole.description} onChange={e => setNewRole({...newRole, description: e.target.value})}
                        placeholder="Role description" className={inputCls} />
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" value={newRole.ageMin} onChange={e => setNewRole({...newRole, ageMin: e.target.value})}
                          placeholder="Min age" className={inputCls} />
                        <input type="number" value={newRole.ageMax} onChange={e => setNewRole({...newRole, ageMax: e.target.value})}
                          placeholder="Max age" className={inputCls} />
                        <select value={newRole.gender} onChange={e => setNewRole({...newRole, gender: e.target.value})} className={inputCls}>
                          <option value="">Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Any">Any</option>
                        </select>
                      </div>
                      <button type="button" onClick={addRole} disabled={!newRole.characterName || !newRole.type}
                        className="w-full py-2 bg-[#edf2f7] text-[#0f2544] rounded-lg text-sm font-medium hover:bg-[#c3d5e8] transition disabled:opacity-40">
                        + Add Role
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-between pt-2">
                    <button type="button" onClick={() => setStep(1)}
                      className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">← Back</button>
                    <button type="button" onClick={() => setStep(3)}
                      className="px-6 py-2.5 bg-[#0f2544] text-white rounded-xl text-sm font-medium hover:bg-[#1a365d] transition">Next →</button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Pricing & Upload ── */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 font-medium mb-1.5">Price (USD) *</label>
                      <input type="number" name="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" placeholder="99.99" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 font-medium mb-1.5">Budget Level</label>
                      <select name="budget" value={formData.budget} onChange={handleChange} className={inputCls}>
                        {budgetLevels.map(b => (<option key={b.value} value={b.value}>{b.label}</option>))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1.5">Hold Fee (USD)</label>
                    <input type="number" name="holdFee" value={formData.holdFee} onChange={handleChange} min="0" placeholder="200" className={inputCls} />
                    <p className="text-xs text-gray-400 mt-1">Fee for producers to place a 30-day hold on your script (10% platform cut)</p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1.5">Script File URL *</label>
                    <input type="url" name="scriptUrl" value={formData.scriptUrl} onChange={handleChange} required placeholder="https://example.com/your-script.pdf" className={inputCls} />
                    <p className="text-xs text-gray-400 mt-1">Upload to cloud storage and paste the public link</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-[#edf2f7] to-[#f0f4f8] rounded-xl">
                    <input type="checkbox" name="isPremium" checked={formData.isPremium} onChange={handleChange} id="isPremium" className="w-5 h-5 text-[#0f2544] rounded" />
                    <label htmlFor="isPremium">
                      <span className="text-sm font-semibold text-gray-800">Mark as Premium Content</span>
                      <p className="text-xs text-gray-500">Featured placement and exclusive exposure</p>
                    </label>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Upload Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <span>Title:</span><span className="font-medium text-gray-900">{formData.title || "—"}</span>
                      <span>Genre:</span><span className="font-medium">{formData.genre || "—"}</span>
                      <span>Content Type:</span><span className="font-medium capitalize">{formData.contentType?.replace("_", " ")}</span>
                      <span>Price:</span><span className="font-medium">${formData.price || "0"}</span>
                      <span>Roles:</span><span className="font-medium">{roles.length}</span>
                      <span>Hold Fee:</span><span className="font-medium">${formData.holdFee || "200"}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setStep(2)}
                      className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">← Back</button>
                    <button type="submit" disabled={loading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-[#0f2544] to-[#1a365d] text-white rounded-xl text-sm font-semibold hover:from-[#0a1628] hover:to-[#0f2544] transition disabled:opacity-50 shadow-md">
                      {loading ? "Uploading..." : "🚀 Upload Script"}
                    </button>
                    <button type="button" onClick={() => navigate("/dashboard")}
                      className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ScriptUpload;
