import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AlertCircle } from "lucide-react";

const GENRE_OPTIONS = [
  "Action", "Comedy", "Drama", "Horror", "Thriller",
  "Romance", "Sci-Fi", "Fantasy", "Mystery", "Adventure",
  "Crime", "Western", "Animation", "Documentary", "Historical",
  "War", "Musical", "Biographical", "Sports", "Political",
  "Legal", "Medical", "Supernatural", "Psychological", "Noir",
  "Family", "Teen", "Satire", "Dark Comedy", "Mockumentary"
];

const NUANCED_TAGS = [
  "Revenge", "Redemption", "Coming of Age", "Love Triangle", "Betrayal",
  "Family Drama", "Social Justice", "Identity Crisis", "Survival",
  "Power Struggle", "Forbidden Love", "Loss & Grief", "Ambition",
  "Good vs Evil", "Man vs Nature", "Isolation", "Corruption",
  "Second Chance", "Underdog Story", "Fish Out of Water", "Chosen One",
  "Quest", "Transformation", "Sacrifice", "Justice", "Freedom",
  "Urban", "Rural", "Suburban", "Space", "Historical", "Contemporary",
  "Post-Apocalyptic", "Dystopian", "Small Town", "Big City",
  "Wilderness", "Ocean/Sea", "Desert", "Jungle", "Medieval",
  "Future", "Alternate Reality", "Virtual Reality", "Underground",
  "Prison", "Hospital", "School/College", "Military Base",
  "Dark", "Satirical", "Gritty", "Lighthearted", "Noir",
  "Uplifting", "Tragic", "Suspenseful", "Whimsical", "Intense",
  "Edgy", "Heartwarming", "Cynical", "Hopeful", "Melancholic",
  "Surreal", "Cerebral", "Raw", "Poetic", "Epic"
];

const EditProfileModal = ({ profile, onClose, onUpdate }) => {
  const isWriter = profile.role === "creator" || profile.role === "writer";
  const wp = profile.writerProfile || {};

  const [formData, setFormData] = useState({
    name: profile.name || "",
    bio: profile.bio || "",
    skills: profile.skills?.join(", ") || "",
    profileImage: profile.profileImage || "",
  });

  // Writer-specific state
  const [representationStatus, setRepresentationStatus] = useState(wp.representationStatus || "unrepresented");
  const [agencyName, setAgencyName] = useState(wp.agencyName || "");
  const [wgaMember, setWgaMember] = useState(wp.wgaMember || false);
  const [selectedGenres, setSelectedGenres] = useState(wp.genres || []);
  const [specializedTags, setSpecializedTags] = useState(wp.specializedTags || []);
  const [diversity, setDiversity] = useState({
    gender: wp.diversity?.gender || "",
    ethnicity: wp.diversity?.ethnicity || "",
  });
  const [showTagError, setShowTagError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(profile.profileImage || "");
  const fileInputRef = useRef(null);

  // Active section for mobile-friendly navigation
  const [activeSection, setActiveSection] = useState("basic");

  const sections = isWriter
    ? [
      { key: "basic", label: "Basic" },
      { key: "writer", label: "Writer" },
      { key: "genres", label: "Genres" },
      { key: "tags", label: "Tags" },
      { key: "diversity", label: "Diversity" },
    ]
    : [{ key: "basic", label: "Basic" }];

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const toggleTag = (tag) => {
    if (specializedTags.includes(tag)) {
      setSpecializedTags(specializedTags.filter((t) => t !== tag));
    } else {
      if (specializedTags.length >= 5) {
        setShowTagError(true);
        setTimeout(() => setShowTagError(false), 2000);
        return;
      }
      setSpecializedTags([...specializedTags, tag]);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("Only JPEG, PNG, WebP and GIF images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("profileImage", file);
      const { data } = await api.post("/users/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFormData({ ...formData, profileImage: data.profileImage });
      setImagePreview(`http://localhost:5001${data.profileImage}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload image");
      setImagePreview(profile.profileImage || "");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, profileImage: "" });
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const skillsArray = formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      const payload = {
        ...formData,
        skills: skillsArray,
      };

      if (isWriter) {
        payload.writerProfile = {
          representationStatus,
          agencyName,
          wgaMember,
          genres: selectedGenres,
          specializedTags,
          diversity,
        };
      }

      const { data } = await api.put("/users/update", payload);
      onUpdate(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const displayImage = imagePreview
    ? imagePreview.startsWith("data:") || imagePreview.startsWith("http")
      ? imagePreview
      : `http://localhost:5001${imagePreview}`
    : "";

  const inputClass =
    "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl border border-gray-200/80 w-full overflow-hidden"
        style={{ maxWidth: "520px", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section Tabs */}
        {isWriter && (
          <div className="flex items-center gap-1 px-5 pt-3 pb-2 overflow-x-auto">
            {sections.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveSection(s.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeSection === s.key
                    ? "bg-[#0f2544] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mx-5 mt-3 px-3 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 130px)" }}>
          {/* === BASIC SECTION === */}
          {activeSection === "basic" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Profile Image Upload */}
              <div>
                <label className={labelClass}>Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt="Profile"
                        className="w-[72px] h-[72px] rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-[72px] h-[72px] rounded-full bg-[#1e3a5f]/10 border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <span className="text-2xl font-bold text-[#1e3a5f]">
                          {formData.name ? formData.name.charAt(0).toUpperCase() : "?"}
                        </span>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-3.5 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-semibold hover:bg-[#162d4a] transition-colors disabled:opacity-50"
                    >
                      {uploading ? "Uploading..." : "Upload Photo"}
                    </button>
                    {displayImage && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-3.5 py-1.5 bg-white text-gray-500 rounded-lg text-xs font-semibold border border-gray-200 hover:text-red-500 hover:border-red-200 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-[10px] text-gray-400">JPG, PNG, WebP or GIF. Max 5MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows="3"
                  maxLength={500}
                  placeholder="Tell us about yourself..."
                />
                <p className="text-[10px] text-gray-400 mt-1">{formData.bio.length}/500</p>
              </div>

              <div>
                <label className={labelClass}>Skills</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className={inputClass}
                  placeholder="Writing, Directing, Acting"
                />
                <p className="text-[11px] text-gray-400 mt-1">Separate skills with commas</p>
              </div>
            </motion.div>
          )}

          {/* === WRITER DETAILS SECTION === */}
          {activeSection === "writer" && isWriter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Writer Details</h3>
                <p className="text-xs text-gray-400 mb-4">Professional information visible to industry contacts</p>
              </div>

              <div>
                <label className={labelClass}>Representation Status</label>
                <select
                  value={representationStatus}
                  onChange={(e) => setRepresentationStatus(e.target.value)}
                  className={inputClass}
                >
                  <option value="unrepresented">Unrepresented</option>
                  <option value="manager">Manager</option>
                  <option value="agent">Agent</option>
                  <option value="manager_and_agent">Manager & Agent</option>
                </select>
              </div>

              {(representationStatus === "agent" || representationStatus === "manager_and_agent") && (
                <div>
                  <label className={labelClass}>Agency Name</label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g., CAA, WME, UTA"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="wgaMemberEdit"
                  checked={wgaMember}
                  onChange={(e) => setWgaMember(e.target.checked)}
                  className="w-5 h-5 text-[#1a365d] border-gray-300 rounded focus:ring-[#1a365d]"
                />
                <label htmlFor="wgaMemberEdit" className="text-sm font-semibold text-gray-700">
                  I am a WGA member
                </label>
              </div>
            </motion.div>
          )}

          {/* === GENRES SECTION === */}
          {activeSection === "genres" && isWriter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Primary Genres</h3>
                <p className="text-xs text-gray-400 mb-3">Select all genres that apply to your work</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {GENRE_OPTIONS.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-2.5 rounded-lg font-medium text-xs transition-all border-2 ${selectedGenres.includes(genre)
                        ? "bg-[#0f2544] text-white border-[#0f2544]"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]"
                      }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
              {selectedGenres.length > 0 && (
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-[#0f2544]">{selectedGenres.length}</span> genre{selectedGenres.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </motion.div>
          )}

          {/* === SPECIALIZED TAGS SECTION === */}
          {activeSection === "tags" && isWriter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Specialized Tags</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Choose themes, tones, or settings you specialize in (max 5)
                </p>
              </div>

              <AnimatePresence>
                {showTagError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-3 rounded-lg"
                  >
                    <AlertCircle size={14} />
                    <span>Please choose your top 5 only.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                {NUANCED_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${specializedTags.includes(tag)
                        ? "bg-[#0f2544] text-white border-[#0f2544]"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#1a365d]"
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 flex items-center justify-between">
                <span>{specializedTags.length}/5 tags selected</span>
                {specializedTags.length > 0 && (
                  <span className="font-medium text-[#0f2544]">{specializedTags.join(", ")}</span>
                )}
              </p>
            </motion.div>
          )}

          {/* === DIVERSITY SECTION === */}
          {activeSection === "diversity" && isWriter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Diversity Information</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Optional — helps producers find underrepresented voices
                </p>
              </div>

              <div>
                <label className={labelClass}>Gender</label>
                <input
                  type="text"
                  value={diversity.gender}
                  onChange={(e) => setDiversity({ ...diversity, gender: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className={labelClass}>Ethnicity</label>
                <input
                  type="text"
                  value={diversity.ethnicity}
                  onChange={(e) => setDiversity({ ...diversity, ethnicity: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
            </motion.div>
          )}

          {/* Action Buttons - always visible */}
          <div className="flex items-center gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#162d4a] transition-colors disabled:opacity-50 text-sm font-bold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditProfileModal;
