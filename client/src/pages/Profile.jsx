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

/* â”€â”€ Helper components â”€â”€ */

const SectionCard = ({ title, icon, badge, dark, children }) => (
  <div
    className={`rounded-2xl p-6 border transition-colors ${dark
      ? "bg-[#0d1520] border-white/[0.06]"
      : "bg-white border-gray-200/70 shadow-sm"
      }`}
  >
    <div className="flex items-center gap-2.5 mb-4">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center ${dark
          ? "bg-white/[0.05] text-white/40"
          : "bg-[#1e3a5f]/[0.06] text-[#1e3a5f]/60"
          }`}
      >
        {icon}
      </div>
      <h3
        className={`text-[13px] font-bold ${dark ? "text-white/70" : "text-gray-800"
          }`}
      >
        {title}
      </h3>
      {badge && (
        <span
          className={`ml-auto text-[11px] font-medium ${dark ? "text-white/25" : "text-gray-400"
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
      className={`text-[13px] font-semibold capitalize ${dark ? "text-white/65" : "text-gray-700"
        }`}
    >
      {value}
    </span>
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€ DeleteProjectButton â”€â”€ */
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
        className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200 ${dark
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
            className={`rounded-2xl shadow-2xl max-w-sm w-full p-6 border ${dark ? "bg-[#0d1520] border-white/[0.06]" : "bg-white border-gray-200"
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-11 h-11 mx-auto rounded-2xl flex items-center justify-center mb-4 ${dark ? "bg-red-500/10" : "bg-red-50"
              }`}>
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className={`text-[15px] font-extrabold text-center mb-1 ${dark ? "text-white" : "text-gray-900"
              }`}>Delete Project?</h3>
            <p className={`text-[13px] text-center mb-1 ${dark ? "text-neutral-400" : "text-gray-500"
              }`}>
              <span className={`font-semibold ${dark ? "text-neutral-200" : "text-gray-800"}`}>{title}</span> will be removed from your profile.
            </p>
            <p className={`text-[11px] text-center mb-5 ${dark ? "text-neutral-600" : "text-gray-400"}`}>
              Uploaded files are kept in storage.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${dark ? "bg-white/[0.07] text-neutral-400 hover:bg-white/[0.12]" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
  const [purchasedScripts, setPurchasedScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState(currentUser?.role === "investor" ? "about" : "projects");

  // Settings state
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsErr, setSettingsErr] = useState("");
  const [emailForm, setEmailForm] = useState({ password: "", newEmail: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingSettings, setSavingSettings] = useState(false);

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
      setPurchasedScripts(data.purchasedScripts || []);
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

  /* â”€â”€ Loading â”€â”€ */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div
          className={`w-7 h-7 border-2 rounded-full animate-spin ${dark
            ? "border-white/10 border-t-white/50"
            : "border-gray-200 border-t-[#1e3a5f]"
            }`}
        />
      </div>
    );
  }

  /* â”€â”€ Not found â”€â”€ */
  if (!profile) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-3">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-gray-100"
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
          className={`text-sm font-semibold ${dark ? "text-white/30" : "text-gray-400"
            }`}
        >
          User not found
        </p>
      </div>
    );
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     Design tokens
     â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  const t = {
    card: dark
      ? "bg-[#0d1520] border-white/[0.06]"
      : "bg-white border-gray-200/70 shadow-sm",
    coverFrom: dark ? "from-[#0a1628]" : "from-[#1e3a5f]",
    coverTo: dark ? "to-[#162d4a]" : "to-[#2d5a8e]",
    avatarRing: dark ? "ring-[#0d1520]" : "ring-white",
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

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     RENDER
     â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* â”€â”€â”€â”€â”€â”€â”€â”€ PROFILE CARD â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`rounded-2xl border transition-colors relative ${t.card}`}
      >
        {/* Cover gradient â€” no overflow-hidden so avatar is never clipped */}
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

          {/* Edit / Follow button â€” pinned top-right of the cover */}
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
                className={`px-5 py-1.5 rounded-xl text-[13px] font-bold transition-all border backdrop-blur-md ${isFollowing ? t.followActive : t.followIdle
                  }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>

        {/* Avatar + Info row */}
        <div className="px-6 sm:px-8">
          <div className="-mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 relative z-20">
            {/* Avatar */}
            <div className="shrink-0">
              {profile.profileImage ? (
                <img
                  src={resolveImage(profile.profileImage)}
                  alt={profile.name}
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover ring-[5px] shadow-2xl ${t.avatarRing}`}
                />
              ) : (
                <div
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full ring-[5px] bg-gradient-to-br flex items-center justify-center shadow-2xl ${t.avatarRing} ${t.avatarGrad}`}
                >
                  <span className="text-4xl sm:text-5xl font-extrabold text-white/80">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name, badges, email, bio â€” beside avatar */}
            <div className="flex-1 min-w-0 pb-1">
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
              {profile.bio && (
                <p
                  className={`text-[14px] leading-relaxed mt-2 line-clamp-2 ${t.body}`}
                >
                  {profile.bio}
                </p>
              )}
              {profile.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
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
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 sm:px-8 pb-7 pt-5">
          <div
            className={`flex flex-wrap items-end gap-6 sm:gap-8 pt-5 border-t ${t.divider}`}
          >
            {[
              ...(profile.role !== "investor" ? [{ value: scripts.length, label: "Projects" }] : []),
              ...(profile.role === "investor" ? [
                { value: `â‚¹${(profile.wallet?.balance || 0).toLocaleString()}`, label: "Balance", isStr: true },
                { value: `â‚¹${(profile.wallet?.totalEarnings || 0).toLocaleString()}`, label: "Total Invested", isStr: true },
                { value: profile.subscription?.scriptScoreCredits || 0, label: "Credits" },
              ] : []),
              { value: profile.followers.length, label: "Followers" },
              { value: profile.following.length, label: "Following" },
              ...(memberSince ? [{ value: memberSince, label: "Joined", isStr: true }] : []),
            ].map((s) => (
              <div key={s.label}>
                <p className={`${s.isStr ? "text-lg sm:text-xl" : "text-2xl"} font-extrabold tabular-nums ${t.statNum}`}>
                  {s.value}
                </p>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${t.statLabel}`}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ TABS â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center gap-2">
        {[
          ...(profile.role !== "investor" ? [{ key: "projects", label: "Projects", count: scripts.length }] : []),
          { key: "about", label: "About" },
          ...(isOwnProfile && ["investor", "producer", "director"].includes(profile.role)
            ? [{ key: "purchased", label: "Purchased", count: purchasedScripts.length }]
            : []),
          ...(isOwnProfile ? [{ key: "financial", label: "Financial" }] : []),
          ...(isOwnProfile ? [{ key: "settings", label: "Settings" }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 border ${activeTab === tab.key
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
                  className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold tabular-nums ${activeTab === tab.key
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ PROJECTS TAB â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "projects" && profile.role !== "investor" && (
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ ABOUT TAB â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  className={`text-[12px] font-medium ${t.contactSub} ${isOwnProfile ? "mt-1.5" : ""
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

          {/* â”€â”€â”€â”€â”€â”€â”€â”€ INVESTOR-SPECIFIC SECTIONS â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {profile.role === "investor" && (
            <>
              {/* Row 1: Professional Info + External Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SectionCard
                  dark={dark}
                  title="Professional Info"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                  }
                >
                  <div className="space-y-3">
                    <InfoRow dark={dark} label="Company" value={profile.industryProfile?.company || <span className={`italic ${dark ? "text-white/20" : "text-gray-300"}`}>Not set</span>} />
                    <InfoRow dark={dark} label="Job Title" value={profile.industryProfile?.jobTitle || <span className={`italic ${dark ? "text-white/20" : "text-gray-300"}`}>Not set</span>} />
                    <InfoRow dark={dark} label="Sub-Role" value={profile.industryProfile?.subRole || <span className={`italic ${dark ? "text-white/20" : "text-gray-300"}`}>Not set</span>} />
                    <div>
                      <p className={`text-[13px] mb-1 ${dark ? "text-white/35" : "text-gray-400"}`}>Previous Credits</p>
                      <p className={`text-[13px] font-medium leading-relaxed ${dark ? "text-white/65" : "text-gray-700"}`}>
                        {profile.industryProfile?.previousCredits || <span className={`italic font-normal ${dark ? "text-white/20" : "text-gray-300"}`}>No credits added yet</span>}
                      </p>
                    </div>
                  </div>
                </SectionCard>

                {/* External Links */}
                <SectionCard
                  dark={dark}
                  title="External Links"
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  }
                >
                  <div className="space-y-2.5">
                    {profile.industryProfile?.imdbUrl ? (
                      <a href={profile.industryProfile.imdbUrl} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors group ${dark ? "border-white/[0.06] hover:bg-white/[0.03]" : "border-gray-200 hover:bg-gray-50"}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? "bg-amber-500/10" : "bg-amber-50"}`}>
                          <span className={`text-[11px] font-extrabold ${dark ? "text-amber-400" : "text-amber-600"}`}>IMDb</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-semibold truncate ${dark ? "text-white/70 group-hover:text-white" : "text-gray-700 group-hover:text-gray-900"}`}>IMDb Profile</p>
                          <p className={`text-[11px] truncate ${dark ? "text-white/30" : "text-gray-400"}`}>{profile.industryProfile.imdbUrl}</p>
                        </div>
                        <svg className={`w-3.5 h-3.5 shrink-0 ${dark ? "text-white/20" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </a>
                    ) : (
                      <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${dark ? "border-white/[0.04]" : "border-gray-100"}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                          <span className={`text-[11px] font-extrabold ${dark ? "text-white/15" : "text-gray-300"}`}>IMDb</span>
                        </div>
                        <p className={`text-[12px] italic ${dark ? "text-white/20" : "text-gray-300"}`}>No IMDb profile linked</p>
                      </div>
                    )}
                    {profile.industryProfile?.linkedInUrl ? (
                      <a href={profile.industryProfile.linkedInUrl} target="_blank" rel="noopener noreferrer"
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors group ${dark ? "border-white/[0.06] hover:bg-white/[0.03]" : "border-gray-200 hover:bg-gray-50"}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? "bg-blue-500/10" : "bg-blue-50"}`}>
                          <span className={`text-[11px] font-extrabold ${dark ? "text-blue-400" : "text-blue-600"}`}>in</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-semibold truncate ${dark ? "text-white/70 group-hover:text-white" : "text-gray-700 group-hover:text-gray-900"}`}>LinkedIn Profile</p>
                          <p className={`text-[11px] truncate ${dark ? "text-white/30" : "text-gray-400"}`}>{profile.industryProfile.linkedInUrl}</p>
                        </div>
                        <svg className={`w-3.5 h-3.5 shrink-0 ${dark ? "text-white/20" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </a>
                    ) : (
                      <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${dark ? "border-white/[0.04]" : "border-gray-100"}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${dark ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                          <span className={`text-[11px] font-extrabold ${dark ? "text-white/15" : "text-gray-300"}`}>in</span>
                        </div>
                        <p className={`text-[12px] italic ${dark ? "text-white/20" : "text-gray-300"}`}>No LinkedIn profile linked</p>
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>

              {/* Investment Mandates â€” full width */}
              <SectionCard
                dark={dark}
                title="Investment Mandates"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                }
              >
                <div className="space-y-4">
                  {/* Genres */}
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-white/30" : "text-gray-400"}`}>Preferred Genres</p>
                    {profile.industryProfile?.mandates?.genres?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.industryProfile.mandates.genres.map((g, i) => (
                          <span key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${dark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{g}</span>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-[12px] italic ${dark ? "text-white/20" : "text-gray-300"}`}>No genres selected</p>
                    )}
                  </div>
                  {/* Formats */}
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-white/30" : "text-gray-400"}`}>Formats</p>
                    {profile.industryProfile?.mandates?.formats?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.industryProfile.mandates.formats.map((f, i) => (
                          <span key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${dark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"}`}>{f}</span>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-[12px] italic ${dark ? "text-white/20" : "text-gray-300"}`}>No formats selected</p>
                    )}
                  </div>
                  {/* Budget Tiers */}
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-white/30" : "text-gray-400"}`}>Budget Tiers</p>
                    {profile.industryProfile?.mandates?.budgetTiers?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.industryProfile.mandates.budgetTiers.map((b, i) => (
                          <span key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border capitalize ${dark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{b}</span>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-[12px] italic ${dark ? "text-white/20" : "text-gray-300"}`}>No budget tiers selected</p>
                    )}
                  </div>
                  {/* Hooks */}
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-white/30" : "text-gray-400"}`}>Looking For</p>
                    {profile.industryProfile?.mandates?.specificHooks?.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.industryProfile.mandates.specificHooks.map((h, i) => (
                          <span key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${dark ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200"}`}>{h}</span>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-[12px] italic ${dark ? "text-white/20" : "text-gray-300"}`}>No hooks specified</p>
                    )}
                  </div>
                  {/* Excluded */}
                  {profile.industryProfile?.mandates?.excludeGenres?.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-white/30" : "text-gray-400"}`}>Excluded Genres</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.industryProfile.mandates.excludeGenres.map((g, i) => (
                          <span key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${dark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-600 border-red-200"}`}>{g}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            </>
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
                      className={`text-[13px] ${dark ? "text-white/35" : "text-gray-400"
                        }`}
                    >
                      WGA Member
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${profile.writerProfile.wgaMember ? t.wgaYes : t.wgaNo
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

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ PURCHASED SCRIPTS TAB â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "purchased" && isOwnProfile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {purchasedScripts.length === 0 ? (
            <div className={`rounded-2xl border py-20 text-center transition-colors ${t.card}`}>
              <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${t.emptyBg}`}>
                <svg className={`w-6 h-6 ${t.emptyIcon}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <p className={`text-[15px] font-bold mb-1 ${t.emptyH}`}>No scripts purchased yet</p>
              <p className={`text-[13px] max-w-xs mx-auto ${t.emptyP}`}>Scripts you purchase will appear here for instant access.</p>
              <a href="/search" className={`inline-block mt-5 px-5 py-2.5 rounded-xl text-[13px] font-bold transition ${dark ? "bg-[#1e3a5f] text-white hover:bg-[#254a75]" : "bg-[#1e3a5f] text-white hover:bg-[#254a75]"}`}>Browse Scripts</a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`flex items-center justify-between px-1 mb-1`}>
                <p className={`text-[13px] font-semibold ${dark ? "text-white/40" : "text-gray-400"}`}>{purchasedScripts.length} script{purchasedScripts.length !== 1 ? "s" : ""} purchased</p>
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>Full Access</span>
              </div>
              {purchasedScripts.map((script, idx) => (
                <motion.a
                  key={script._id}
                  href={`/script/${script._id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group cursor-pointer ${dark ? "bg-[#0d1520] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#112030]" : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-md shadow-sm"}`}
                >
                  {/* Thumbnail */}
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 ${dark ? "bg-[#1a2d47]" : "bg-gray-100"}`}>
                    {script.coverImage ? (
                      <img src={script.coverImage.startsWith("http") ? script.coverImage : `http://localhost:5001${script.coverImage}`}
                        alt={script.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className={`w-6 h-6 ${dark ? "text-white/15" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-bold truncate mb-0.5 group-hover:text-[#4a90d9] transition-colors ${dark ? "text-white" : "text-gray-900"}`}>{script.title}</p>
                    <p className={`text-[12px] truncate mb-2 ${dark ? "text-white/40" : "text-gray-400"}`}>
                      by {script.creator?.name || "Unknown"}
                      {script.genre && <> &middot; {script.genre}</>}
                      {script.format && <> &middot; {script.format.replace(/_/g, " ")}</>}
                    </p>
                    {script.logline && (
                      <p className={`text-[12px] line-clamp-1 ${dark ? "text-white/30" : "text-gray-400"}`}>{script.logline}</p>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Purchased
                    </span>
                    {script.price > 0 && (
                      <span className={`text-[12px] font-bold ${dark ? "text-white/30" : "text-gray-400"}`}>â‚¹{script.price}</span>
                    )}
                    <svg className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${dark ? "text-white/30" : "text-gray-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ SETTINGS TAB â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "settings" && isOwnProfile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
          {settingsMsg && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[13px] font-medium">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {settingsMsg}
              <button onClick={() => setSettingsMsg("")} className="ml-auto text-emerald-400/60 hover:text-emerald-400">&times;</button>
            </div>
          )}
          {settingsErr && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] font-medium">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              {settingsErr}
              <button onClick={() => setSettingsErr("")} className="ml-auto text-red-400/60 hover:text-red-400">&times;</button>
            </div>
          )}

          {/* Account */}
          <SectionCard dark={dark} title="Account" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>
            <div className="space-y-4">
              <div className={`flex items-center justify-between py-3 px-4 rounded-xl border ${dark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-100 bg-gray-50/60"}`}>
                <div>
                  <p className={`text-[13px] font-semibold ${dark ? "text-white/70" : "text-gray-700"}`}>Private Account</p>
                  <p className={`text-[11px] ${dark ? "text-white/25" : "text-gray-400"}`}>Only approved followers can see your profile</p>
                </div>
                <button onClick={async () => { try { setSavingSettings(true); await api.put("/users/settings", { isPrivate: !profile.isPrivate }); setProfile({ ...profile, isPrivate: !profile.isPrivate }); setSettingsMsg("Privacy updated"); setTimeout(() => setSettingsMsg(""), 3000); } catch (e) { setSettingsErr("Failed"); } finally { setSavingSettings(false); } }}
                  className={`w-10 h-[22px] rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${profile.isPrivate ? dark ? "bg-emerald-500/30" : "bg-emerald-100" : dark ? "bg-white/[0.06]" : "bg-gray-200"}`}>
                  <div className={`w-[18px] h-[18px] rounded-full transition-all ${profile.isPrivate ? `${dark ? "bg-emerald-400" : "bg-emerald-500"} translate-x-[18px]` : `${dark ? "bg-white/30" : "bg-white"}`}`} />
                </button>
              </div>
              <div className={`flex items-center justify-between py-3 px-4 rounded-xl border ${dark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-100 bg-gray-50/60"}`}>
                <div>
                  <p className={`text-[13px] font-semibold ${dark ? "text-white/70" : "text-gray-700"}`}>Email Verified</p>
                  <p className={`text-[11px] ${dark ? "text-white/25" : "text-gray-400"}`}>{profile.email}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${profile.emailVerified ? dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200" : dark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200"}`}>{profile.emailVerified ? "Verified" : "Unverified"}</span>
              </div>
              <div className={`rounded-xl border p-4 ${dark ? "border-white/[0.06]" : "border-gray-100"}`}>
                <p className={`text-[12px] font-bold uppercase tracking-wider mb-3 ${dark ? "text-white/30" : "text-gray-400"}`}>Change Email</p>
                <div className="space-y-2.5">
                  <input type="email" placeholder="New email address" value={emailForm.newEmail} onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })} className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] border outline-none transition-colors ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/15 focus:border-white/20" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-300 focus:border-gray-400"}`} />
                  <input type="password" placeholder="Current password" value={emailForm.password} onChange={e => setEmailForm({ ...emailForm, password: e.target.value })} className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] border outline-none transition-colors ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/15 focus:border-white/20" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-300 focus:border-gray-400"}`} />
                  <button disabled={savingSettings || !emailForm.newEmail || !emailForm.password} onClick={async () => { try { setSavingSettings(true); setSettingsErr(""); const { data } = await api.put("/users/change-email", emailForm); setProfile({ ...profile, email: data.email, emailVerified: false }); setEmailForm({ password: "", newEmail: "" }); setSettingsMsg("Email changed"); setTimeout(() => setSettingsMsg(""), 3000); } catch (e) { setSettingsErr(e.response?.data?.message || "Failed"); } finally { setSavingSettings(false); } }}
                    className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-colors ${dark ? "bg-[#1e3a5f] text-white hover:bg-[#254a75] disabled:opacity-30" : "bg-[#1e3a5f] text-white hover:bg-[#254a75] disabled:opacity-40"}`}>{savingSettings ? "Saving..." : "Update Email"}</button>
                </div>
              </div>
              <div className={`rounded-xl border p-4 ${dark ? "border-white/[0.06]" : "border-gray-100"}`}>
                <p className={`text-[12px] font-bold uppercase tracking-wider mb-3 ${dark ? "text-white/30" : "text-gray-400"}`}>Change Password</p>
                <div className="space-y-2.5">
                  <input type="password" placeholder="Current password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] border outline-none transition-colors ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/15 focus:border-white/20" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-300 focus:border-gray-400"}`} />
                  <input type="password" placeholder="New password (min 6 chars)" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] border outline-none transition-colors ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/15 focus:border-white/20" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-300 focus:border-gray-400"}`} />
                  <input type="password" placeholder="Confirm new password" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] border outline-none transition-colors ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/15 focus:border-white/20" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-300 focus:border-gray-400"}`} />
                  <button disabled={savingSettings || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword} onClick={async () => { try { setSavingSettings(true); setSettingsErr(""); await api.put("/users/change-password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }); setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setSettingsMsg("Password changed"); setTimeout(() => setSettingsMsg(""), 3000); } catch (e) { setSettingsErr(e.response?.data?.message || "Failed"); } finally { setSavingSettings(false); } }}
                    className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-colors ${dark ? "bg-[#1e3a5f] text-white hover:bg-[#254a75] disabled:opacity-30" : "bg-[#1e3a5f] text-white hover:bg-[#254a75] disabled:opacity-40"}`}>{savingSettings ? "Saving..." : "Change Password"}</button>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Notification Preferences */}
          <SectionCard dark={dark} title="Notification Preferences" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>}>
            <div className="space-y-2.5">
              {[{ key: "smartMatchAlerts", label: "Smart Match Alerts", desc: "When a new script matches your mandates" }, { key: "holdAlerts", label: "Hold Alerts", desc: "Option hold status updates" }, { key: "viewAlerts", label: "View Alerts", desc: "When someone views your profile" }, { key: "auditionAlerts", label: "Audition Alerts", desc: "New audition opportunities" }].map((pref) => (
                <div key={pref.key} className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${dark ? "bg-white/[0.02]" : "bg-gray-50/60"}`}>
                  <div><p className={`text-[13px] font-semibold ${dark ? "text-white/65" : "text-gray-700"}`}>{pref.label}</p><p className={`text-[11px] ${dark ? "text-white/25" : "text-gray-400"}`}>{pref.desc}</p></div>
                  <button onClick={async () => { const nv = !profile.notificationPrefs?.[pref.key]; try { await api.put("/users/settings", { notificationPrefs: { [pref.key]: nv } }); setProfile({ ...profile, notificationPrefs: { ...profile.notificationPrefs, [pref.key]: nv } }); } catch (e) { setSettingsErr("Failed"); } }}
                    className={`w-10 h-[22px] rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${profile.notificationPrefs?.[pref.key] ? dark ? "bg-emerald-500/30" : "bg-emerald-100" : dark ? "bg-white/[0.06]" : "bg-gray-200"}`}>
                    <div className={`w-[18px] h-[18px] rounded-full transition-all ${profile.notificationPrefs?.[pref.key] ? `${dark ? "bg-emerald-400" : "bg-emerald-500"} translate-x-[18px]` : `${dark ? "bg-white/30" : "bg-white"}`}`} />
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Content Preferences + Subscription */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SectionCard dark={dark} title="Content Preferences" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>
              <div className="space-y-3">
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-white/30" : "text-gray-400"}`}>Preferred Genres</p>
                  {profile.preferences?.genres?.length > 0 ? (<div className="flex flex-wrap gap-1.5">{profile.preferences.genres.map((g, i) => (<span key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${t.genreChip}`}>{g}</span>))}</div>) : (<p className={`text-[12px] italic ${dark ? "text-white/20" : "text-gray-300"}`}>No genres selected</p>)}
                </div>
                <InfoRow dark={dark} label="Budget Range" value={profile.preferences?.budgetRange ? `â‚¹${(profile.preferences.budgetRange.min || 0).toLocaleString()} â€“ â‚¹${(profile.preferences.budgetRange.max || 0).toLocaleString()}` : <span className={`italic font-normal ${dark ? "text-white/20" : "text-gray-300"}`}>Not set</span>} />
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-white/30" : "text-gray-400"}`}>Content Types</p>
                  {profile.preferences?.contentTypes?.length > 0 ? (<div className="flex flex-wrap gap-1.5">{profile.preferences.contentTypes.map((ct, i) => (<span key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border capitalize ${t.chip}`}>{ct.replace(/_/g, " ")}</span>))}</div>) : (<p className={`text-[12px] italic ${dark ? "text-white/20" : "text-gray-300"}`}>No content types selected</p>)}
                </div>
              </div>
            </SectionCard>
            <SectionCard dark={dark} title="Subscription" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>}>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className={`text-[13px] ${dark ? "text-white/35" : "text-gray-400"}`}>Plan</span><span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border uppercase ${profile.subscription?.plan === "enterprise" ? dark ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200" : profile.subscription?.plan === "pro" ? dark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200" : dark ? "bg-white/[0.04] text-white/45 border-white/[0.06]" : "bg-gray-50 text-gray-600 border-gray-200"}`}>{profile.subscription?.plan || "free"}</span></div>
                <InfoRow dark={dark} label="Script Score Credits" value={profile.subscription?.scriptScoreCredits || 0} />
                {profile.subscription?.expiresAt && (<InfoRow dark={dark} label="Expires" value={new Date(profile.subscription.expiresAt).toLocaleDateString()} />)}
              </div>
            </SectionCard>
          </div>

          {/* Localization */}
          <SectionCard dark={dark} title="Localization" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" /></svg>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-white/30" : "text-gray-400"}`}>Language</p>
                <select value={profile.language || "en"} onChange={async (e) => { try { await api.put("/users/settings", { language: e.target.value }); setProfile({ ...profile, language: e.target.value }); setSettingsMsg("Language updated"); setTimeout(() => setSettingsMsg(""), 3000); } catch (err) { setSettingsErr("Failed"); } }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] border outline-none cursor-pointer ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80" : "bg-white border-gray-200 text-gray-800"}`}>
                  <option value="en">English</option><option value="hi">Hindi</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="ja">Japanese</option><option value="ko">Korean</option><option value="zh">Chinese</option>
                </select>
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-white/30" : "text-gray-400"}`}>Timezone</p>
                <select value={profile.timezone || "Asia/Kolkata"} onChange={async (e) => { try { await api.put("/users/settings", { timezone: e.target.value }); setProfile({ ...profile, timezone: e.target.value }); setSettingsMsg("Timezone updated"); setTimeout(() => setSettingsMsg(""), 3000); } catch (err) { setSettingsErr("Failed"); } }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] border outline-none cursor-pointer ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80" : "bg-white border-gray-200 text-gray-800"}`}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option><option value="America/New_York">America/New_York (EST)</option><option value="America/Los_Angeles">America/Los_Angeles (PST)</option><option value="America/Chicago">America/Chicago (CST)</option><option value="Europe/London">Europe/London (GMT)</option><option value="Europe/Paris">Europe/Paris (CET)</option><option value="Asia/Tokyo">Asia/Tokyo (JST)</option><option value="Asia/Shanghai">Asia/Shanghai (CST)</option><option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                </select>
              </div>
            </div>
          </SectionCard>

          {/* Danger Zone */}
          <SectionCard dark={dark} title="Danger Zone" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}>
            <div className={`flex items-center justify-between py-3 px-4 rounded-xl border ${dark ? "border-red-500/15 bg-red-500/[0.03]" : "border-red-100 bg-red-50/40"}`}>
              <div><p className={`text-[13px] font-semibold ${dark ? "text-red-400/80" : "text-red-600"}`}>Delete Account</p><p className={`text-[11px] ${dark ? "text-red-400/30" : "text-red-400"}`}>Permanently delete your account and all data</p></div>
              <button className={`px-3.5 py-1.5 rounded-xl text-[12px] font-bold border transition-colors ${dark ? "border-red-500/30 text-red-400/70 hover:bg-red-500/10" : "border-red-200 text-red-500 hover:bg-red-50"}`}>Delete</button>
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ FINANCIAL TAB â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {false && (() => {
        /* Gather scores from all scripts */
        const scored = scripts.filter(s => s.scriptScore?.overall);
        const dims = ["plot", "characters", "dialogue", "pacing", "marketability"];
        const dimLabels = { plot: "Plot", characters: "Characters", dialogue: "Dialogue", pacing: "Pacing", marketability: "Marketability" };
        const dimColors = { plot: "#3b82f6", characters: "#8b5cf6", dialogue: "#06b6d4", pacing: "#f59e0b", marketability: "#10b981" };
        const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        const overallAvg = avg(scored.map(s => s.scriptScore.overall));
        const dimAvgs = Object.fromEntries(dims.map(d => [d, avg(scored.filter(s => s.scriptScore[d]).map(s => s.scriptScore[d]))]));
        const scoreLabel = (v) => v >= 90 ? "Exceptional" : v >= 80 ? "Excellent" : v >= 70 ? "Strong" : v >= 60 ? "Promising" : v >= 50 ? "Developing" : "Needs Work";
        const scoreColorFn = (v) => v >= 80 ? "#10b981" : v >= 60 ? "#f59e0b" : "#ef4444";
        /* Distribution buckets */
        const buckets = [{ label: "90-100", min: 90, max: 100 }, { label: "80-89", min: 80, max: 89 }, { label: "70-79", min: 70, max: 79 }, { label: "60-69", min: 60, max: 69 }, { label: "<60", min: 0, max: 59 }];
        const dist = buckets.map(b => ({ ...b, count: scored.filter(s => s.scriptScore.overall >= b.min && s.scriptScore.overall <= b.max).length }));
        const maxDist = Math.max(...dist.map(d => d.count), 1);

        return (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">

            {scored.length === 0 ? (
              <div className={`rounded-2xl border py-20 text-center ${t.card}`}>
                <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${t.emptyBg}`}>
                  <svg className={`w-6 h-6 ${t.emptyIcon}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <p className={`text-[15px] font-bold mb-1 ${t.emptyH}`}>No evaluations yet</p>
                <p className={`text-[13px] max-w-xs mx-auto ${t.emptyP}`}>Script scores will appear here once projects are evaluated.</p>
              </div>
            ) : (
              <>
                {/* â”€â”€ Overall Score Gauge + Summary â”€â”€ */}
                <div className={`rounded-2xl border p-6 sm:p-8 ${t.card}`}>
                  <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    {/* Radial gauge */}
                    <div className="relative w-36 h-36 shrink-0">
                      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                        <circle cx="60" cy="60" r="52" fill="none" stroke={dark ? "rgba(255,255,255,0.04)" : "#f3f4f6"} strokeWidth="10" />
                        <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColorFn(overallAvg)} strokeWidth="10" strokeLinecap="round"
                          strokeDasharray={`${(overallAvg / 100) * 326.7} 326.7`}
                          className="transition-all duration-1000" style={{ filter: `drop-shadow(0 0 8px ${scoreColorFn(overallAvg)}40)` }} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-extrabold tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>{overallAvg}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${dark ? "text-white/30" : "text-gray-400"}`}>Average</span>
                      </div>
                    </div>
                    {/* Summary stats */}
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className={`text-lg font-extrabold tracking-tight mb-1 ${dark ? "text-white" : "text-gray-900"}`}>Overall Performance</h3>
                      <p className={`text-sm mb-4 ${dark ? "text-white/40" : "text-gray-500"}`}>
                        Based on {scored.length} evaluated {scored.length === 1 ? "project" : "projects"} â€” <span className="font-bold" style={{ color: scoreColorFn(overallAvg) }}>{scoreLabel(overallAvg)}</span>
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {[{ label: "Best Score", value: Math.max(...scored.map(s => s.scriptScore.overall)) }, { label: "Latest", value: scored.sort((a, b) => new Date(b.scriptScore?.scoredAt || 0) - new Date(a.scriptScore?.scoredAt || 0))[0]?.scriptScore?.overall || 0 }, { label: "Projects", value: scored.length }].map(s => (
                          <div key={s.label} className={`rounded-xl p-3 border ${dark ? "bg-white/[0.03] border-white/[0.06]" : "bg-gray-50 border-gray-100"}`}>
                            <p className={`text-xl font-extrabold tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>{s.value}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${dark ? "text-white/25" : "text-gray-400"}`}>{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* â”€â”€ Dimension Breakdown Bars â”€â”€ */}
                <div className={`rounded-2xl border p-6 ${t.card}`}>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dark ? "bg-white/[0.05]" : "bg-[#1e3a5f]/[0.06]"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-white/40" : "text-[#1e3a5f]/60"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                    </div>
                    <h3 className={`text-[13px] font-bold ${dark ? "text-white/70" : "text-gray-800"}`}>Dimension Breakdown</h3>
                  </div>
                  <div className="space-y-4">
                    {dims.map(d => (
                      <div key={d}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[12px] font-semibold ${dark ? "text-white/60" : "text-gray-600"}`}>{dimLabels[d]}</span>
                          <span className={`text-sm font-extrabold tabular-nums ${dark ? "text-white" : "text-gray-900"}`}>{dimAvgs[d]}</span>
                        </div>
                        <div className={`h-3 rounded-full overflow-hidden ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`}>
                          <div className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${dimAvgs[d]}%`, backgroundColor: dimColors[d], boxShadow: `0 0 12px ${dimColors[d]}30` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* â”€â”€ Score Distribution â”€â”€ */}
                <div className={`rounded-2xl border p-6 ${t.card}`}>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dark ? "bg-white/[0.05]" : "bg-[#1e3a5f]/[0.06]"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-white/40" : "text-[#1e3a5f]/60"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                      </svg>
                    </div>
                    <h3 className={`text-[13px] font-bold ${dark ? "text-white/70" : "text-gray-800"}`}>Score Distribution</h3>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {dist.map((b, i) => (
                      <div key={b.label} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className={`text-[11px] font-bold tabular-nums ${dark ? "text-white/50" : "text-gray-500"}`}>{b.count}</span>
                        <div className={`w-full rounded-t-lg transition-all duration-700 ${dark ? "bg-white/[0.06]" : "bg-gray-100"}`} style={{ height: "100%", position: "relative" }}>
                          <div className="absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-700"
                            style={{
                              height: `${b.count ? Math.max((b.count / maxDist) * 100, 8) : 0}%`,
                              background: `linear-gradient(to top, ${["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"][i]}, ${["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"][i]}90)`,
                              boxShadow: `0 -4px 12px ${["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"][i]}20`
                            }} />
                        </div>
                        <span className={`text-[10px] font-bold ${dark ? "text-white/30" : "text-gray-400"}`}>{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* â”€â”€ Per-Project Score Cards â”€â”€ */}
                <div className={`rounded-2xl border p-6 ${t.card}`}>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dark ? "bg-white/[0.05]" : "bg-[#1e3a5f]/[0.06]"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-white/40" : "text-[#1e3a5f]/60"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <h3 className={`text-[13px] font-bold ${dark ? "text-white/70" : "text-gray-800"}`}>Project Scores</h3>
                    <span className={`ml-auto text-[11px] font-medium ${dark ? "text-white/25" : "text-gray-400"}`}>{scored.length} evaluated</span>
                  </div>
                  <div className="space-y-3">
                    {scored.sort((a, b) => (b.scriptScore?.overall || 0) - (a.scriptScore?.overall || 0)).map((s, i) => (
                      <div key={s._id} className={`rounded-xl border p-4 transition-all hover:scale-[1.01] ${dark ? "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]" : "bg-gray-50/50 border-gray-100 hover:border-gray-200"}`}>
                        <div className="flex items-center gap-4 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0`}
                            style={{ backgroundColor: `${scoreColorFn(s.scriptScore.overall)}15`, color: scoreColorFn(s.scriptScore.overall) }}>
                            {s.scriptScore.overall}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold truncate ${dark ? "text-white" : "text-gray-900"}`}>{s.title}</h4>
                            <p className={`text-[11px] ${dark ? "text-white/30" : "text-gray-400"}`}>
                              {s.format?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} Â· {s.scriptScore.scoredAt ? new Date(s.scriptScore.scoredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: `${scoreColorFn(s.scriptScore.overall)}15`, color: scoreColorFn(s.scriptScore.overall) }}>
                            {scoreLabel(s.scriptScore.overall)}
                          </span>
                        </div>
                        {/* Mini horizontal bars */}
                        <div className="grid grid-cols-5 gap-2">
                          {dims.map(d => (
                            <div key={d} className="text-center">
                              <div className={`h-1.5 rounded-full overflow-hidden mb-1 ${dark ? "bg-white/[0.06]" : "bg-gray-200"}`}>
                                <div className="h-full rounded-full" style={{ width: `${s.scriptScore[d] || 0}%`, backgroundColor: dimColors[d] }} />
                              </div>
                              <p className={`text-[9px] font-bold ${dark ? "text-white/30" : "text-gray-400"}`}>{dimLabels[d]}</p>
                              <p className={`text-[11px] font-extrabold tabular-nums ${dark ? "text-white/60" : "text-gray-600"}`}>{s.scriptScore[d] || "â€”"}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        );
      })()}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ FINANCIAL TAB â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
          {isWriter(profile.role) && <BankDetails dark={dark} />}
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
