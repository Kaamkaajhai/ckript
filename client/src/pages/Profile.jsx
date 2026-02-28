import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import ProjectCard from "../components/ProjectCard";
import EditProfileModal from "../components/EditProfileModal";
import BankDetails from "../components/BankDetails";
import Transactions from "../components/Transactions";

/* ── Helper components ── */

const SectionCard = ({ title, icon, badge, dark, children }) => (
  <div
    className={`rounded-2xl p-6 border transition-colors ${
      dark
        ? "bg-[#0d1829] border-white/[0.06]"
        : "bg-white border-gray-200/70 shadow-sm"
    }`}
  >
    <div className="flex items-center gap-2.5 mb-4">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          dark
            ? "bg-white/[0.05] text-white/40"
            : "bg-[#1e3a5f]/[0.06] text-[#1e3a5f]/60"
        }`}
      >
        {icon}
      </div>
      <h3
        className={`text-[13px] font-bold ${
          dark ? "text-white/70" : "text-gray-800"
        }`}
      >
        {title}
      </h3>
      {badge && (
        <span
          className={`ml-auto text-[11px] font-medium ${
            dark ? "text-white/25" : "text-gray-400"
          }`}
        >
          {badge}
        </span>
      )}
    </div>
    {children}
  </div>
);

const InfoRow = ({ label, value, dark }) => (
  <div className="flex items-center justify-between">
    <span className={`text-[13px] ${dark ? "text-white/35" : "text-gray-400"}`}>
      {label}
    </span>
    <span
      className={`text-[13px] font-semibold capitalize ${
        dark ? "text-white/65" : "text-gray-700"
      }`}
    >
      {value}
    </span>
  </div>
);

/* ═══════════════════════════════════════ */

/* ── DeleteProjectButton ── */
const DeleteProjectButton = ({ dark, onConfirm, title }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
        title="Delete project"
        className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 ${
          dark
            ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20"
            : "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className={`rounded-2xl shadow-2xl max-w-sm w-full p-6 border ${
              dark ? "bg-[#0d1829] border-white/[0.06]" : "bg-white border-gray-200"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-11 h-11 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
              dark ? "bg-red-500/10" : "bg-red-50"
            }`}>
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className={`text-[15px] font-extrabold text-center mb-1 ${
              dark ? "text-white" : "text-gray-900"
            }`}>Delete Project?</h3>
            <p className={`text-[13px] text-center mb-1 ${
              dark ? "text-neutral-400" : "text-gray-500"
            }`}>
              <span className={`font-semibold ${ dark ? "text-neutral-200" : "text-gray-800" }`}>{title}</span> will be removed from your profile.
            </p>
            <p className={`text-[11px] text-center mb-5 ${ dark ? "text-neutral-600" : "text-gray-400" }`}>
              Uploaded files are kept in storage.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                  dark ? "bg-white/[0.07] text-neutral-400 hover:bg-white/[0.12]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deleting...</>
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Profile = () => {
  const isWriter = (role) => role === "creator" || role === "writer";
  const { id } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();

  const [profile, setProfile] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("projects");

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleDeleteScript = async (scriptId) => {
    try {
      await api.delete(`/scripts/${scriptId}`);
      setScripts((prev) => prev.filter((s) => s._id !== scriptId));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/users/${id || currentUser._id}`);
      setProfile(data.user);
      setScripts((data.scripts || []).filter((s) => s.status !== "draft"));
      setIsFollowing(
        data.user.followers.some((f) => f._id === currentUser._id)
      );
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await api.post("/users/unfollow", { userId: profile._id });
        setIsFollowing(false);
        setProfile({
          ...profile,
          followers: profile.followers.filter(
            (f) => f._id !== currentUser._id
          ),
        });
      } else {
        await api.post("/users/follow", { userId: profile._id });
        setIsFollowing(true);
        setProfile({
          ...profile,
          followers: [
            ...profile.followers,
            { _id: currentUser._id, name: currentUser.name },
          ],
        });
      }
    } catch (error) {
      console.error("Error following/unfollowing:", error);
    }
  };

  const isOwnProfile = currentUser._id === profile?._id;

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5001${url}`;
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div
          className={`w-7 h-7 border-2 rounded-full animate-spin ${
            dark
              ? "border-white/10 border-t-white/50"
              : "border-gray-200 border-t-[#1e3a5f]"
          }`}
        />
      </div>
    );
  }

  /* ── Not found ── */
  if (!profile) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-3">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            dark ? "bg-white/[0.04]" : "bg-gray-100"
          }`}
        >
          <svg
            className={`w-6 h-6 ${dark ? "text-white/20" : "text-gray-300"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </div>
        <p
          className={`text-sm font-semibold ${
            dark ? "text-white/30" : "text-gray-400"
          }`}
        >
          User not found
        </p>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     Design tokens
     ═══════════════════════════════════════ */
  const t = {
    card: dark
      ? "bg-[#0d1829] border-white/[0.06]"
      : "bg-white border-gray-200/70 shadow-sm",
    coverFrom: dark ? "from-[#0a1628]" : "from-[#1e3a5f]",
    coverTo: dark ? "to-[#162d4a]" : "to-[#2d5a8e]",
    avatarRing: dark ? "ring-[#0d1829]" : "ring-white",
    avatarGrad: dark
      ? "from-[#1a3557] to-[#0f2439]"
      : "from-[#1e3a5f] to-[#2d5a8e]",
    h1: dark ? "text-white" : "text-gray-900",
    body: dark ? "text-white/50" : "text-gray-500",
    email: dark ? "text-white/30" : "text-gray-400",
    statNum: dark ? "text-white" : "text-gray-900",
    statLabel: dark ? "text-white/30" : "text-gray-400",
    joined: dark ? "text-white/60" : "text-gray-600",
    divider: dark ? "border-white/[0.06]" : "border-gray-100",
    roleBg: dark
      ? "bg-[#1e3a5f]/40 border-[#1e3a5f]/50 text-[#7aafff]"
      : "bg-[#1e3a5f]/[0.07] border-[#1e3a5f]/20 text-[#1e3a5f]",
    wgaBadge: dark
      ? "bg-amber-900/20 border-amber-800/30 text-amber-400"
      : "bg-amber-50 border-amber-200 text-amber-700",
    chip: dark
      ? "bg-white/[0.04] text-white/45 border-white/[0.06]"
      : "bg-gray-50 text-gray-600 border-gray-200/60",
    genreChip: dark
      ? "bg-[#1e3a5f]/20 text-[#7aafff]/75 border-[#1e3a5f]/30"
      : "bg-[#1e3a5f]/[0.06] text-[#1e3a5f] border-[#1e3a5f]/15",
    editBtn: dark
      ? "bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-white/70 hover:text-white"
      : "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 shadow-sm",
    followActive: dark
      ? "bg-white/[0.05] text-white/45 border-white/[0.07] hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/30"
      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200",
    followIdle: dark
      ? "bg-[#1e3a5f] text-white hover:bg-[#243f6a] shadow-lg shadow-[#1e3a5f]/25"
      : "bg-[#1e3a5f] text-white hover:bg-[#162d4a] shadow-md shadow-[#1e3a5f]/20",
    aboutText: dark ? "text-white/50" : "text-gray-500",
    aboutEmpty: dark ? "text-white/25" : "text-gray-400",
    roleTag: dark
      ? "bg-[#1e3a5f]/30 text-[#7aafff] border-[#1e3a5f]/40"
      : "bg-[#1e3a5f]/[0.07] text-[#1e3a5f] border-[#1e3a5f]/15",
    contactTxt: dark ? "text-white/55" : "text-gray-600",
    contactSub: dark ? "text-white/30" : "text-gray-400",
    wgaYes: dark
      ? "bg-amber-900/20 text-amber-400 border-amber-800/30"
      : "bg-amber-50 text-amber-700 border-amber-200",
    wgaNo: dark
      ? "bg-white/[0.04] text-white/25 border-white/[0.06]"
      : "bg-gray-50 text-gray-400 border-gray-200/60",
    emptyBg: dark ? "bg-white/[0.04]" : "bg-gray-100",
    emptyIcon: dark ? "text-white/20" : "text-gray-300",
    emptyH: dark ? "text-white/40" : "text-gray-600",
    emptyP: dark ? "text-white/25" : "text-gray-400",
  };

  /* ════════════════════════════════════
     RENDER
     ════════════════════════════════════ */
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* ──────── PROFILE CARD ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`rounded-2xl border transition-colors relative ${t.card}`}
      >
        {/* Cover gradient — no overflow-hidden so avatar is never clipped */}
        <div
          className={`h-36 sm:h-44 rounded-t-2xl relative bg-gradient-to-r ${t.coverFrom} ${t.coverTo}`}
        >
          {/* Glow */}
          <div
            className="absolute inset-0 rounded-t-2xl"
            style={{
              backgroundImage: dark
                ? "radial-gradient(ellipse 70% 50% at 50% 80%, rgba(30,58,95,0.5), transparent)"
                : "radial-gradient(ellipse 70% 50% at 50% 80%, rgba(255,255,255,0.2), transparent)",
            }}
          />
          {/* Dot pattern */}
          <div
            className="absolute inset-0 rounded-t-2xl"
            style={{
              opacity: dark ? 0.03 : 0.06,
              backgroundImage: `radial-gradient(circle, ${dark ? "#fff" : "#fff"} 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
            }}
          />

          {/* Edit / Follow button — pinned top-right of the cover */}
          <div className="absolute top-4 right-4 z-10">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className={`px-4 py-1.5 rounded-xl border text-[13px] font-semibold transition-all flex items-center gap-1.5 backdrop-blur-md ${t.editBtn}`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                  />
                </svg>
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className={`px-5 py-1.5 rounded-xl text-[13px] font-bold transition-all border backdrop-blur-md ${
                  isFollowing ? t.followActive : t.followIdle
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>

        {/* Avatar — positioned OUTSIDE the cover div, uses negative margin to overlap */}
        <div className="px-6 sm:px-8">
          <div className="-mt-16 sm:-mt-20 mb-5 relative z-20">
            {profile.profileImage ? (
              <img
                src={resolveImage(profile.profileImage)}
                alt={profile.name}
                className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover ring-[5px] shadow-2xl ${t.avatarRing}`}
              />
            ) : (
              <div
                className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full ring-[5px] bg-gradient-to-br flex items-center justify-center shadow-2xl ${t.avatarRing} ${t.avatarGrad}`}
              >
                <span className="text-5xl sm:text-6xl font-extrabold text-white/80">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Profile info */}
        <div className="px-6 sm:px-8 pb-7">
          {/* Name + badges */}
          <div className="mb-2">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1
                className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${t.h1}`}
              >
                {profile.name}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${t.roleBg}`}
              >
                {profile.role}
              </span>
              {isWriter(profile.role) &&
                profile.writerProfile?.wgaMember && (
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${t.wgaBadge}`}
                  >
                    WGA
                  </span>
                )}
            </div>
            {isOwnProfile && (
              <p className={`text-[13px] font-medium ${t.email}`}>
                {profile.email}
              </p>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p
              className={`text-[15px] leading-relaxed mb-4 max-w-xl ${t.body}`}
            >
              {profile.bio}
            </p>
          )}

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {profile.skills.map((skill, i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-[12px] font-semibold border ${t.chip}`}
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div
            className={`grid grid-cols-3 sm:grid-cols-4 gap-5 pt-5 border-t ${t.divider}`}
          >
            {[
              { value: scripts.length, label: "Projects" },
              { value: profile.followers.length, label: "Followers" },
              { value: profile.following.length, label: "Following" },
            ].map((s) => (
              <div key={s.label}>
                <p className={`text-2xl font-extrabold tabular-nums ${t.statNum}`}>
                  {s.value}
                </p>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${t.statLabel}`}
                >
                  {s.label}
                </p>
              </div>
            ))}
            {memberSince && (
              <div className="hidden sm:block">
                <p className={`text-[13px] font-bold ${t.joined}`}>
                  {memberSince}
                </p>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${t.statLabel}`}
                >
                  Joined
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ──────── TABS ──────── */}
      <div className="flex items-center gap-2">
        {[
          { key: "projects", label: "Projects", count: scripts.length },
          { key: "about", label: "About" },
          ...(isOwnProfile ? [{ key: "financial", label: "Financial" }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 border ${
              activeTab === tab.key
                ? dark
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f]/60 shadow-lg shadow-[#1e3a5f]/20"
                  : "bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-sm"
                : dark
                ? "bg-[#152236] text-white/80 border-white/[0.15] hover:bg-[#1a2d47] hover:text-white"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900 shadow-sm"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold tabular-nums ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : dark
                      ? "bg-white/10 text-white/60"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* ──────── PROJECTS TAB ──────── */}
      {activeTab === "projects" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {scripts.length === 0 ? (
            <div
              className={`rounded-2xl border py-20 text-center transition-colors ${t.card}`}
            >
              <div
                className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${t.emptyBg}`}
              >
                <svg
                  className={`w-6 h-6 ${t.emptyIcon}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <p className={`text-[15px] font-bold mb-1 ${t.emptyH}`}>
                No projects yet
              </p>
              <p className={`text-[13px] max-w-xs mx-auto ${t.emptyP}`}>
                {isOwnProfile
                  ? "Upload your first script to get started"
                  : "This user hasn't posted any projects yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {scripts.map((script, idx) => (
                <motion.div
                  key={script._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="relative group/card"
                >
                  <ProjectCard project={script} userName={profile.name} />
                  {isOwnProfile && (
                    <DeleteProjectButton
                      dark={dark}
                      onConfirm={() => handleDeleteScript(script._id)}
                      title={script.title}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ──────── ABOUT TAB ──────── */}
      {activeTab === "about" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {/* Bio */}
          <SectionCard
            dark={dark}
            title="About"
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            }
          >
            <p className={`text-[14px] leading-relaxed ${t.aboutText}`}>
              {profile.bio || (
                <span className={`italic ${t.aboutEmpty}`}>
                  No bio added yet.
                </span>
              )}
            </p>
          </SectionCard>

          {/* Role + Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SectionCard
              dark={dark}
              title="Role"
              icon={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              }
            >
              <span
                className={`inline-flex px-3 py-1.5 rounded-lg text-[13px] font-bold border ${t.roleTag}`}
              >
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
            </SectionCard>

            <SectionCard
              dark={dark}
              title={isOwnProfile ? "Contact" : "Member Info"}
              icon={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              }
            >
              {isOwnProfile && (
                <p className={`text-[13px] font-medium ${t.contactTxt}`}>
                  {profile.email}
                </p>
              )}
              {memberSince && (
                <p
                  className={`text-[12px] font-medium ${t.contactSub} ${
                    isOwnProfile ? "mt-1.5" : ""
                  }`}
                >
                  Member since {memberSince}
                </p>
              )}
            </SectionCard>
          </div>

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <SectionCard
              dark={dark}
              title="Skills & Expertise"
              icon={
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              }
            >
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border ${t.chip}`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Writer-specific sections */}
          {isWriter(profile.role) && profile.writerProfile && (
            <>
              <SectionCard
                dark={dark}
                title="Writer Info"
                icon={
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                    />
                  </svg>
                }
              >
                <div className="space-y-3">
                  <InfoRow
                    dark={dark}
                    label="Representation"
                    value={(
                      profile.writerProfile.representationStatus ||
                      "unrepresented"
                    ).replace(/_/g, " & ")}
                  />
                  {profile.writerProfile.agencyName && (
                    <InfoRow
                      dark={dark}
                      label="Agency"
                      value={profile.writerProfile.agencyName}
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[13px] ${
                        dark ? "text-white/35" : "text-gray-400"
                      }`}
                    >
                      WGA Member
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                        profile.writerProfile.wgaMember ? t.wgaYes : t.wgaNo
                      }`}
                    >
                      {profile.writerProfile.wgaMember ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </SectionCard>

              {profile.writerProfile.genres?.length > 0 && (
                <SectionCard
                  dark={dark}
                  title="Genres"
                  icon={
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125"
                      />
                    </svg>
                  }
                >
                  <div className="flex flex-wrap gap-2">
                    {profile.writerProfile.genres.map((genre, i) => (
                      <span
                        key={i}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border ${t.genreChip}`}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {profile.writerProfile.specializedTags?.length > 0 && (
                <SectionCard
                  dark={dark}
                  title="Specialized Tags"
                  icon={
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 6h.008v.008H6V6z"
                      />
                    </svg>
                  }
                >
                  <div className="flex flex-wrap gap-2">
                    {profile.writerProfile.specializedTags.map((tag, i) => (
                      <span
                        key={i}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border ${t.chip}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {isOwnProfile &&
                (profile.writerProfile.diversity?.gender ||
                  profile.writerProfile.diversity?.ethnicity) && (
                  <SectionCard
                    dark={dark}
                    title="Diversity Information"
                    badge="Only visible to you"
                    icon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                        />
                      </svg>
                    }
                  >
                    <div className="space-y-3">
                      {profile.writerProfile.diversity.gender && (
                        <InfoRow
                          dark={dark}
                          label="Gender"
                          value={profile.writerProfile.diversity.gender}
                        />
                      )}
                      {profile.writerProfile.diversity.ethnicity && (
                        <InfoRow
                          dark={dark}
                          label="Ethnicity"
                          value={profile.writerProfile.diversity.ethnicity}
                        />
                      )}
                    </div>
                  </SectionCard>
                )}
            </>
          )}
        </motion.div>
      )}

      {/* ──────── FINANCIAL TAB ──────── */}
      {activeTab === "financial" && isOwnProfile && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Transactions Overview */}
          <Transactions dark={dark} />

          {/* Bank Details */}
          <BankDetails dark={dark} />
        </motion.div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedData) => {
            setProfile({ ...profile, ...updatedData });
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Profile;
