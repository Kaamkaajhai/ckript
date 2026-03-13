import { useState, useEffect, useContext, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Heart, MessageSquare, Pencil, ArrowLeft, X, Camera, Save, Loader2 } from "lucide-react";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import ProjectCard from "../components/ProjectCard";
import ReviewCard from "../components/ReviewCard";

/* ── Edit Profile Modal ─────────────────────────────── */
const EditProfileModal = ({ profile, onClose, onSaved }) => {
  const { isDarkMode: dark } = useDarkMode();
  const { setUser, user } = useContext(AuthContext);
  const [name, setName] = useState(profile.name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [skills, setSkills] = useState(profile.skills?.join(", ") || "");
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
    return `http://localhost:5001${url}`;
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    setPreviewImage(URL.createObjectURL(file));
    setError("");
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      let profileImageUrl = profile.profileImage;

      // Upload image first if changed
      if (imageFile) {
        const formData = new FormData();
        formData.append("profileImage", imageFile);
        const { data: imgData } = await api.post("/users/upload-image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        profileImageUrl = imgData.profileImage;
      }

      // Update profile
      const skillsArr = skills
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      const { data } = await api.put("/users/update", {
        name: name.trim(),
        bio: bio.trim(),
        skills: skillsArr,
        profileImage: profileImageUrl,
      });

      // Update AuthContext
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setSuccess(true);
      setTimeout(() => {
        onSaved(data);
        onClose();
      }, 600);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    }
    setSaving(false);
  };

  const currentImage = previewImage || resolveImage(profile.profileImage);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`relative rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden ${dark ? "bg-[#101e30]" : "bg-white"}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${dark ? "border-[#182840]" : "border-gray-100"}`}>
          <div>
            <h2 className={`text-lg font-extrabold ${dark ? "text-gray-100" : "text-gray-900"}`}>Edit Profile</h2>
            <p className="text-[12px] text-gray-400 font-medium mt-0.5">Update your profile information</p>
          </div>
            <button
            onClick={onClose}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${dark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            <X size={16} strokeWidth={2.5} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">

          {/* Avatar Upload */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt="Profile"
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-gray-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center ring-2 ring-gray-100 border border-gray-200">
                  <span className="text-2xl font-black text-gray-400">
                    {name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-[#1e3a5f] rounded-xl flex items-center justify-center shadow-lg shadow-[#1e3a5f]/25 hover:bg-[#162d4a] transition-colors group-hover:scale-110"
              >
                <Camera size={14} className="text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-700">Profile Photo</p>
              <p className="text-[11px] text-gray-400 mt-0.5">JPG, PNG or GIF. Max 5MB.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-[12px] font-bold text-[#1e3a5f] hover:text-[#162d4a] transition-colors"
              >
                Change photo
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              className={`w-full h-11 px-4 border rounded-xl text-[14px] font-medium focus:outline-none focus:border-[#1e3a5f]/30 focus:ring-2 focus:ring-[#1e3a5f]/5 transition-all ${dark ? "bg-white/[0.04] border-[#1d3350] text-gray-200 placeholder:text-gray-500 focus:bg-white/[0.06]" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white"}`}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              <span>Bio</span>
              <span className="text-gray-300 normal-case tracking-normal font-semibold">{bio.length}/300</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              placeholder="Tell others a bit about yourself..."
              rows={3}
              className={`w-full px-4 py-3 border rounded-xl text-[14px] font-medium focus:outline-none focus:border-[#1e3a5f]/30 focus:ring-2 focus:ring-[#1e3a5f]/5 transition-all resize-none leading-relaxed ${dark ? "bg-white/[0.04] border-[#1d3350] text-gray-200 placeholder:text-gray-500 focus:bg-white/[0.06]" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white"}`}
            />
          </div>

          {/* Skills / Interests */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Interests & Skills
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Screenwriting, Drama, Sci-Fi, Film Analysis"
              className={`w-full h-11 px-4 border rounded-xl text-[14px] font-medium focus:outline-none focus:border-[#1e3a5f]/30 focus:ring-2 focus:ring-[#1e3a5f]/5 transition-all ${dark ? "bg-white/[0.04] border-[#1d3350] text-gray-200 placeholder:text-gray-500 focus:bg-white/[0.06]" : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white"}`}
            />
            <p className="text-[11px] text-gray-400 mt-1.5 ml-0.5">Separate with commas</p>
          </div>

          {/* Error / Success */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl"
              >
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
                <p className="text-[12px] font-semibold text-red-600">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl"
              >
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-[12px] font-semibold text-green-700">Profile updated successfully!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${dark ? "border-[#182840] bg-[#242424]" : "border-gray-100 bg-gray-50/50"}`}>
          <button
            onClick={onClose}
            disabled={saving}
            className={`px-5 py-2.5 text-sm font-bold rounded-xl border transition-all disabled:opacity-50 ${dark ? "text-gray-300 bg-white/[0.04] border-[#1d3350] hover:border-[#244060]" : "text-gray-600 hover:text-gray-800 bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#1e3a5f] rounded-xl hover:bg-[#162d4a] transition-all shadow-sm shadow-[#1e3a5f]/15 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ── Main Component ─────────────────────────────────── */
const ReaderProfile = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("read");
  const [readScripts, setReadScripts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const profileId = id || user?._id;
  const isOwnProfile = !id || id === user?._id;

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5001${url}`;
  };

  useEffect(() => { fetchProfile(); }, [profileId]);
  useEffect(() => { if (profileId) fetchTabData(); }, [activeTab, profileId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [userRes, reviewsRes] = await Promise.all([
        api.get(`/users/${profileId}`),
        api.get(`/reviews/user/${profileId}?limit=1`) // Fetch total review count
      ]);
      const userObj = userRes.data.user || userRes.data;
      setProfile({ ...userObj, reviewsCount: reviewsRes.data.total || 0 });
    } catch { setProfile(null); }
    finally { setLoading(false); }
  };

  const fetchTabData = async () => {
    try {
      setDataLoading(true);
      if (activeTab === "read" || activeTab === "favorites") {
        const { data } = await api.get(`/users/${profileId}`);
        const userObj = data.user || data;
        const arr = activeTab === "read" ? userObj.scriptsRead : userObj.favoriteScripts;

        if (arr?.length) {
          const scripts = await Promise.all(
            arr.slice(0, 20).map(async (sId) => {
              try {
                const s = typeof sId === "object" ? sId : (await api.get(`/scripts/${sId}`)).data;
                return s;
              } catch { return null; }
            })
          );
          if (activeTab === "read") setReadScripts(scripts.filter(Boolean));
          else setFavorites(scripts.filter(Boolean));
        } else {
          if (activeTab === "read") setReadScripts([]);
          else setFavorites([]);
        }
      } else if (activeTab === "reviews") {
        const { data } = await api.get(`/reviews/user/${profileId}`);
        setReviews(data.reviews || []);
      }
    } catch { /* silent */ }
    finally { setDataLoading(false); }
  };

  const handleProfileSaved = (updatedData) => {
    setProfile((prev) => ({ ...prev, ...updatedData }));
  };

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 bg-gray-50 rounded-2xl m-6">
      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-2">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-gray-900 font-extrabold text-xl">Profile not found</p>
      <p className="text-gray-500 font-medium text-sm mb-2">This user might have been removed or deleted.</p>
      <Link to="/reader" className="text-sm font-bold text-white bg-[#1e3a5f] hover:bg-[#162d4a] px-6 py-2.5 rounded-xl transition-colors">
        Back to Reader
      </Link>
    </div>
  );

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : null;

  const tabs = [
    { key: "read", label: "Scripts Read", icon: BookOpen, count: profile.scriptsRead?.length || 0 },
    { key: "favorites", label: "Favorites", icon: Heart, count: profile.favoriteScripts?.length || 0 },
    { key: "reviews", label: "Reviews", icon: MessageSquare, count: profile.reviewsCount || 0 },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4 pt-6">
      {/* Back Button */}
      <Link to="/reader" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#1e3a5f] text-sm font-bold mb-6 transition-colors group">
        <span className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-[#1e3a5f]/10 transition-colors">
          <ArrowLeft size={16} />
        </span>
        Back to Reader
      </Link>

      {/* Main Profile Header Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`rounded-3xl border shadow-sm overflow-hidden mb-8 ${dark ? "bg-[#101e30] border-[#182840]" : "bg-white border-gray-100"}`}>
        {/* Decorative Gradient Banner */}
        <div className="h-32 bg-gradient-to-tr from-[#0f1c2e] via-[#1e3a5f] to-[#3a6ea5] relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-16 left-1/4 w-64 h-64 rounded-full bg-[#60a5fa]/20 blur-3xl" />
          </div>
        </div>

        {/* Profile Content */}
        <div className="px-6 sm:px-10 pb-8 -mt-16 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              {/* Avatar */}
              <div className="relative">
                {profile.profileImage ? (
                  <img
                    src={resolveImage(profile.profileImage)}
                    alt={profile.name}
                    className="w-32 h-32 rounded-2xl object-cover ring-4 ring-white shadow-xl bg-white"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center ring-4 ring-white shadow-xl border border-gray-200">
                    <span className="text-4xl font-black text-gray-400">
                      {profile.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Role */}
              <div className="text-center sm:text-left pb-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1.5">
                    <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${dark ? "text-gray-100" : "text-gray-900"}`}>
                    {profile.name || "User Profile"}
                  </h1>
                  <span className="px-2.5 py-1 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-xs font-bold uppercase tracking-widest border border-[#1e3a5f]/10 shadow-sm w-max mx-auto sm:mx-0">
                    {profile.role || "Reader"}
                  </span>
                </div>
                {memberSince && (
                  <p className="text-sm text-gray-400 font-semibold">Member since {memberSince}</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {isOwnProfile && (
              <div className="flex shrink-0 justify-center sm:justify-start">
                <button
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-sm font-bold shadow-sm transition-all hover:shadow hover:border-gray-300 active:scale-95"
                >
                  <Pencil size={16} strokeWidth={2.5} />
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className={`rounded-2xl p-5 mb-8 border ${dark ? "bg-white/[0.04] border-[#182840]" : "bg-gray-50 border-gray-100"}`}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">About Me</h3>
              <p className={`text-sm leading-relaxed font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>{profile.bio}</p>
            </div>
          )}

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Interests & Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <span key={i} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border ${dark ? "bg-[#1e3a5f]/20 text-blue-300 border-[#1e3a5f]/30" : "bg-[#1e3a5f]/[0.04] text-[#1e3a5f] border-[#1e3a5f]/8"}`}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Stat Tabs */}
          <div className={`flex flex-wrap items-center gap-3 pt-4 border-t ${dark ? "border-[#182840]" : "border-gray-100"}`}>
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${isActive
                    ? "bg-[#1e3a5f] text-white shadow-md shadow-[#1e3a5f]/20 scale-105"
                    : dark
                      ? "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:scale-105 border border-transparent hover:border-[#1d3350]"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:scale-105 border border-transparent hover:border-gray-200"
                    }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-blue-200" : "text-gray-400"} />
                  <span>{t.label}</span>
                  <div className={`ml-1.5 px-2 py-0.5 rounded-md text-[11px] font-black ${isActive ? "bg-white/20 text-white" : dark ? "bg-white/[0.06] border border-[#1d3350] text-gray-400" : "bg-white border border-gray-200 text-gray-600 shadow-sm"
                    }`}>
                    {t.count}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {dataLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`rounded-2xl border h-[280px] animate-pulse shadow-sm ${dark ? "bg-[#101e30] border-[#182840]" : "bg-white border-gray-100"}`} />
            ))}
          </motion.div>
        ) : (
          <div className="min-h-[400px]">
            {activeTab === "read" && (
              <motion.div key="read" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {readScripts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {readScripts.map((s) => <ProjectCard key={s._id} project={s} userName={s.creator?.name || "Unknown"} />)}
                  </div>
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title="No scripts read yet"
                    subtitle={isOwnProfile ? "Discover new scripts and dive into a reading adventure!" : "This user hasn't made their reading list public."}
                    action={isOwnProfile ? <Link to="/reader" className="mt-4 inline-block px-6 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-bold hover:bg-[#162d4a] transition-colors shadow-sm">Explore Scripts</Link> : null}
                  />
                )}
              </motion.div>
            )}

            {activeTab === "favorites" && (
              <motion.div key="favorites" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {favorites.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((s) => <ProjectCard key={s._id} project={s} userName={s.creator?.name || "Unknown"} />)}
                  </div>
                ) : (
                  <EmptyState
                    icon={Heart}
                    title="No favorites saved"
                    subtitle={isOwnProfile ? "Save your favorite scripts by tapping the heart icon!" : "This user hasn't saved any favorites."}
                  />
                )}
              </motion.div>
            )}

            {activeTab === "reviews" && (
              <motion.div key="reviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {reviews.length > 0 ? (
                  <div className="columns-1 md:columns-2 gap-6 space-y-6 max-w-5xl">
                    {reviews.map((r) => (
                      <div key={r._id} className="break-inside-avoid">
                        <div className={`rounded-2xl border shadow-sm p-5 hover:shadow-md transition-shadow ${dark ? "bg-[#101e30] border-[#182840]" : "bg-white border-gray-100"}`}>
                          {r.script && (
                            <Link to={`/reader/script/${r.script._id || r.script}`} className={`flex items-center justify-between mb-4 pb-4 border-b group ${dark ? "border-[#182840]" : "border-gray-50"}`}>
                              <span className={`text-sm font-black group-hover:text-[#1e3a5f] transition-colors truncate pr-4 ${dark ? "text-gray-100" : "text-gray-900"}`}>
                                {r.script.title || "View Script"}
                              </span>
                              <span className="text-gray-300 group-hover:text-[#1e3a5f] transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                              </span>
                            </Link>
                          )}
                          <ReviewCard review={r} currentUserId={user?._id} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={MessageSquare}
                    title="No reviews left"
                    subtitle={isOwnProfile ? "Help writers by sharing your thoughtful feedback!" : "This user hasn't reviewed any scripts."}
                  />
                )}
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editOpen && (
          <EditProfileModal
            profile={profile}
            onClose={() => setEditOpen(false)}
            onSaved={handleProfileSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, subtitle, action }) => {
  const { isDarkMode: dark } = useDarkMode();
  return (
  <div className={`backdrop-blur-xl rounded-3xl border shadow-sm p-12 lg:p-16 text-center max-w-2xl mx-auto flex flex-col items-center ${dark ? "bg-[#101e30]/50 border-[#182840]" : "bg-white/50 border-gray-100/50"}`}>
    <div className={`w-20 h-20 rounded-2xl border shadow-sm flex items-center justify-center mb-6 ${dark ? "bg-white/[0.04] border-[#182840]" : "bg-gradient-to-br from-gray-50 to-gray-100 border-white"}`}>
      <Icon size={32} strokeWidth={1.5} className="text-gray-400" />
    </div>
    <h3 className={`text-xl font-black mb-2 ${dark ? "text-gray-100" : "text-gray-900"}`}>{title}</h3>
    <p className="text-sm text-gray-500 font-medium max-w-md mx-auto leading-relaxed mb-2">{subtitle}</p>
    {action}
  </div>
  );
};

export default ReaderProfile;
