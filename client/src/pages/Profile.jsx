import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import { sendPitch } from "../services/scriptPitchService";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import ProjectCard from "../components/ProjectCard";
import EditProfileModal from "../components/EditProfileModal";
import BankDetails from "../components/BankDetails";
import Transactions from "../components/Transactions";
import SocialShareButton from "../components/SocialShareButton";
import ProfileCompletionBanner from "../components/ProfileCompletionBanner";
import { formatCurrency } from "../utils/currency";
import { applyLanguagePreference, getBackendLanguageValue, getProfileLanguageValue } from "../utils/languagePreference";
import { getScriptCanonicalPath } from "../utils/scriptPath";

/* â”€â”€ Helper components â”€â”€ */

const SectionCard = ({ title, icon, badge, dark, children }) => (
  <div
    className={`rounded-2xl p-4 sm:p-6 border transition-colors ${dark
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
        className={`text-[16px] font-bold ${dark ? "text-white/70" : "text-gray-800"
          }`}
      >
        {title}
      </h3>
      {badge && (
        <span
          className={`ml-auto text-[13px] font-medium ${dark ? "text-white/25" : "text-gray-400"
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
  <div className="flex items-start justify-between gap-3 max-[640px]:flex-col max-[640px]:items-start">
    <span className={`text-[15px] ${dark ? "text-white/35" : "text-gray-400"}`}>
      {label}
    </span>
    <span
      className={`text-[15px] font-semibold capitalize text-right max-[420px]:text-left break-words [overflow-wrap:anywhere] ${dark ? "text-white/65" : "text-gray-700"
        }`}
    >
      {value}
    </span>
  </div>
);

const INDUSTRY_SUB_ROLE_LABELS = {
  producer: "Producer",
  director: "Director",
  executive_producer: "Executive Producer",
  line_producer: "Line Producer",
  showrunner: "Showrunner",
  development_executive: "Development Executive",
  studio_executive: "Studio Executive",
  agent: "Agent",
  actor: "Actor",
  other: "Other",
};

const formatIndustrySubRole = (value = "", otherValue = "") => {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return "";
  if (normalized === "other") {
    const custom = String(otherValue || "").trim();
    return custom ? `Other (${custom})` : "Other";
  }
  if (INDUSTRY_SUB_ROLE_LABELS[normalized]) return INDUSTRY_SUB_ROLE_LABELS[normalized];
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const normalizePublicShareUrl = (rawUrl = "", fallbackUrl = "") => {
  const candidate = String(rawUrl || fallbackUrl || "").trim();
  if (!candidate) return "";
  if (candidate.includes("/share/profile/") || candidate.includes("/share/project/")) return candidate;
  return candidate
    .replace(/\/profile\/([^/?#]+)/i, "/share/profile/$1")
    .replace(/\/script\/([^/?#]+)/i, "/share/project/$1");
};

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
              <span className={`font-semibold ${dark ? "text-neutral-200" : "text-gray-800"}`}>{title}</span> will be removed from your profile and listings.
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
  const navigate = useNavigate();
  const { user: currentUser, setUser, logout } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();

  const [profile, setProfile] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [deletedScripts, setDeletedScripts] = useState([]);
  const [purchasedScripts, setPurchasedScripts] = useState([]);
  const [bookmarkedScripts, setBookmarkedScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("projects");
  const [showMessageRequestModal, setShowMessageRequestModal] = useState(false);
  const [messageRequestText, setMessageRequestText] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionsType, setConnectionsType] = useState("followers");
  
  // Pitch
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [myScripts, setMyScripts] = useState([]);
  const [pitchData, setPitchData] = useState({ scriptId: "", note: "" });
  const [sendingPitch, setSendingPitch] = useState(false);
  const [pitchSuccess, setPitchSuccess] = useState(false);

  // Settings state
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsErr, setSettingsErr] = useState("");
  const [isBlockedByCurrent, setIsBlockedByCurrent] = useState(false);
  const [blockedByProfile, setBlockedByProfile] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockingAction, setBlockingAction] = useState(false);
  const [emailForm, setEmailForm] = useState({ password: "", newEmail: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [sendingVerificationCode, setSendingVerificationCode] = useState(false);
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false);
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountReason, setDeleteAccountReason] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [referralSummary, setReferralSummary] = useState(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState("");
  const [referralCopyFeedback, setReferralCopyFeedback] = useState("");
  const [profileAccessMessage, setProfileAccessMessage] = useState("");
  const isFetchingProfileRef = useRef(false);
  const bookmarkRefreshTimerRef = useRef(null);
  const tabInitializedForProfileRef = useRef(null);

  const fetchProfile = useCallback(async ({ silent = false } = {}) => {
    const profileId = id || currentUser?._id;
    if (!profileId || isFetchingProfileRef.current) return;

    try {
      isFetchingProfileRef.current = true;
      if (!silent) setLoading(true);

      const { data } = await api.get(`/users/${profileId}`);
      const canonicalUsername = String(data?.user?.writerProfile?.username || "").trim().toLowerCase();
      const requestedProfileKey = String(id || "").trim().toLowerCase();
      if (id && canonicalUsername && requestedProfileKey !== canonicalUsername) {
        navigate(`/profile/${canonicalUsername}`, { replace: true });
      }
      setProfileAccessMessage("");
      setProfile(data.user);
      setScripts((data.scripts || []).filter((s) => s.status !== "draft" && !s.isDeleted));
      setDeletedScripts(data.deletedScripts || []);
      setPurchasedScripts(data.purchasedScripts || []);
      setBookmarkedScripts(data.bookmarkedScripts || []);
      setBlockedUsers(Array.isArray(data.user.blockedUsers) ? data.user.blockedUsers : []);
      setIsBlockedByCurrent(Boolean(data.user.blockedByCurrent));
      setBlockedByProfile(Boolean(data.user.blockedByProfile));
      setIsFollowing(
        data.user.followers.some((f) => f._id === currentUser?._id)
      );

      if (tabInitializedForProfileRef.current !== data.user._id) {
        const role = String(data.user.role || "").toLowerCase();
        const isInvestorProfile = role === "investor";
        const nextScripts = (data.scripts || []).filter((s) => s.status !== "draft" && !s.isDeleted);
        setActiveTab(isInvestorProfile ? "about" : (nextScripts.length > 0 ? "projects" : "about"));
        tabInitializedForProfileRef.current = data.user._id;
      }
    } catch (error) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;
      const isPrivateAccount = Boolean(error?.response?.data?.privateAccount);
      const isBlockedView = Boolean(error?.response?.data?.blockedByProfile);

      if (status === 403 && isPrivateAccount) {
        setProfile(null);
        setProfileAccessMessage(serverMessage || "This account is private.");
      } else if (status === 403 && isBlockedView) {
        setProfile(null);
        setProfileAccessMessage(serverMessage || "This user has blocked you.");
      } else if (status === 404) {
        setProfile(null);
        setProfileAccessMessage("User not found");
      } else {
        setProfile(null);
        setProfileAccessMessage("Unable to load profile right now.");
      }
      console.error("Error fetching profile:", error);
    } finally {
      isFetchingProfileRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [id, currentUser?._id, navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const routeProfileKey = String(id || "").trim().toLowerCase();
    const currentUserId = String(currentUser?._id || "").trim().toLowerCase();
    const currentUserUsername = String(currentUser?.writerProfile?.username || "").trim().toLowerCase();
    const isOwnView = !id || routeProfileKey === currentUserId || (currentUserUsername && routeProfileKey === currentUserUsername);
    if (!isOwnView) return undefined;

    const refreshBookmarks = () => {
      if (bookmarkRefreshTimerRef.current) {
        clearTimeout(bookmarkRefreshTimerRef.current);
      }
      bookmarkRefreshTimerRef.current = setTimeout(() => {
        fetchProfile({ silent: true });
      }, 250);
    };

    window.addEventListener("bookmarkUpdated", refreshBookmarks);
    return () => {
      window.removeEventListener("bookmarkUpdated", refreshBookmarks);
      if (bookmarkRefreshTimerRef.current) {
        clearTimeout(bookmarkRefreshTimerRef.current);
      }
    };
  }, [id, currentUser?._id, currentUser?.writerProfile?.username, fetchProfile]);

  const handleDeleteScript = async (scriptId) => {
    try {
      await api.delete(`/scripts/${scriptId}`);
      setScripts((prev) => {
        const deletedScript = prev.find((s) => s._id === scriptId);
        if (deletedScript) {
          setDeletedScripts((existing) => [
            { ...deletedScript, isDeleted: true, deletedAt: new Date().toISOString() },
            ...existing.filter((s) => s._id !== scriptId),
          ]);
        }
        return prev.filter((s) => s._id !== scriptId);
      });
      window.dispatchEvent(new CustomEvent("scriptDeleted", { detail: { id: scriptId } }));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleFollow = async () => {
    if (isBlockedByCurrent || blockedByProfile) return;
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

  const handleToggleBlock = async () => {
    if (!profile?._id || blockingAction) return;
    try {
      setBlockingAction(true);
      if (isBlockedByCurrent) {
        await api.post("/users/unblock", { userId: profile._id });
        setIsBlockedByCurrent(false);
        setSettingsMsg("User unblocked");
      } else {
        await api.post("/users/block", { userId: profile._id });
        setIsBlockedByCurrent(true);
        setIsFollowing(false);
        setSettingsMsg("User blocked");
      }
      setTimeout(() => setSettingsMsg(""), 2500);
    } catch (error) {
      setSettingsErr(error.response?.data?.message || "Failed to update block status");
    } finally {
      setBlockingAction(false);
    }
  };

  const handleUnblockFromSettings = async (userId) => {
    try {
      setSavingSettings(true);
      await api.post("/users/unblock", { userId });
      setBlockedUsers((prev) => prev.filter((u) => u._id !== userId));
      setSettingsMsg("User unblocked");
      setTimeout(() => setSettingsMsg(""), 2500);
    } catch (error) {
      setSettingsErr(error.response?.data?.message || "Failed to unblock user");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenPitchModal = async () => {
    setShowPitchModal(true);
    try {
      const { data } = await api.get("/scripts/mine");
      setMyScripts(data);
      if (data.length > 0) {
        setPitchData(prev => ({ ...prev, scriptId: data[0]._id }));
      }
    } catch (err) {
      console.error("Error fetching user scripts:", err);
    }
  };

  const handleSendPitch = async () => {
    if (!pitchData.scriptId) return alert("Please select a script");
    try {
      setSendingPitch(true);
      await sendPitch({
        scriptId: pitchData.scriptId,
        investorId: profile._id,
        note: pitchData.note
      });
      setPitchSuccess(true);
      setTimeout(() => {
        setShowPitchModal(false);
        setPitchSuccess(false);
        setPitchData({ scriptId: "", note: "" });
      }, 2000);
    } catch (error) {
      console.error("Error sending pitch:", error);
      alert(error.response?.data?.message || "Failed to send pitch");
    } finally {
      setSendingPitch(false);
    }
  };

  const handleSendMessageRequest = async () => {
    if (!messageRequestText.trim()) return;

    try {
      setSendingRequest(true);
      await api.post("/users/message-request", {
        recipientId: profile._id,
        message: messageRequestText
      });
      setRequestSuccess(true);
      setTimeout(() => {
        setShowMessageRequestModal(false);
        setRequestSuccess(false);
        setMessageRequestText("");
      }, 2000);
    } catch (error) {
      console.error("Error sending message request:", error);
      alert(error.response?.data?.message || "Failed to send message request");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleDeleteAccount = async () => {
    const reason = deleteAccountReason.trim();
    if (reason.length < 5) {
      setSettingsErr("Please share a short reason (minimum 5 characters).");
      return;
    }

    try {
      setDeletingAccount(true);
      setSettingsErr("");
      await api.delete("/users/account", { data: { reason } });
      setShowDeleteAccountModal(false);
      setDeleteAccountReason("");
      setSettingsMsg("Account deleted successfully");
      logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setSettingsErr(error.response?.data?.message || "Failed to delete account");
    } finally {
      setDeletingAccount(false);
    }
  };

  const copyToClipboard = async (value) => {
    if (!value) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // Fallback below.
    }

    try {
      const temp = document.createElement("textarea");
      temp.value = value;
      temp.setAttribute("readonly", "true");
      temp.style.position = "absolute";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(temp);
      return copied;
    } catch {
      return false;
    }
  };

  const openConnectionsModal = (type) => {
    setConnectionsType(type);
    setShowConnectionsModal(true);
  };

  const getProfilePath = (userRef) => {
    const userId = typeof userRef === "string" ? userRef : userRef?._id;
    const username = typeof userRef === "string"
      ? ""
      : String(userRef?.username || "").trim().toLowerCase();
    if (!userId) return "/profile";

    const isCurrentReaderProfile =
      String(currentUser?.role || "").toLowerCase() === "reader" &&
      String(currentUser?._id || "") === String(userId);

    return isCurrentReaderProfile ? `/reader/profile/${userId}` : `/profile/${username || userId}`;
  };

  const handleConnectionClick = (userRef) => {
    const userId = typeof userRef === "string" ? userRef : userRef?._id;
    if (!userId) return;
    setShowConnectionsModal(false);
    navigate(getProfilePath(userRef));
  };

  const isOwnProfile = currentUser._id === profile?._id;
  const isWriterUser = isWriter(profile?.role);
  const isInvestorProfile = String(profile?.role || "").toLowerCase() === "investor";
  const connectionsLabel = connectionsType === "followers" ? "Followers" : "Following";
  const connectionList =
    connectionsType === "followers" ? profile?.followers || [] : profile?.following || [];
  const normalizedConnections = connectionList
    .map((user) => {
      if (!user) return null;
      if (typeof user === "string") {
        return { _id: user, name: "Unknown User", profileImage: "" };
      }
      return {
        _id: user._id,
        name: user.name || "Unknown User",
        profileImage: user.profileImage || "",
        username: user.writerProfile?.username || user.username || "",
      };
    })
    .filter(Boolean);
  const purchasedCount = purchasedScripts.length;
  const profileCompletion = profile?.profileCompletion;
  const showProfileCompletion = isOwnProfile && profileCompletion && !profileCompletion.isComplete;

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    : null;
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const referralCode = String(referralSummary?.referralCode || profile?.referralCode || currentUser?.referralCode || "").trim();
  const fallbackReferralLink = referralCode
    ? `${browserOrigin}/${encodeURIComponent(referralCode)}`
    : "";
  const referralShareLink = String(referralSummary?.referralLink || "").trim() || fallbackReferralLink;
  const profileShareKey = String(profile?.writerProfile?.username || "").trim().toLowerCase() || String(profile?._id || "").trim();
  const defaultProfileRoute = profileShareKey
    ? `/share/profile/${encodeURIComponent(profileShareKey)}`
    : "";
  const fallbackShareUrl = defaultProfileRoute ? `${browserOrigin}${defaultProfileRoute}` : "";
  const profileShare = {
    url: normalizePublicShareUrl(fallbackShareUrl, profile?.shareMeta?.url),
    title: profile?.shareMeta?.title || `${profile?.name || "Profile"} | Ckript`,
    text: profile?.shareMeta?.text || `Check out ${profile?.name || "this creator"}'s profile on Ckript.`,
  };

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `${(import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "").replace(/\/$/, "")}${url}`;
  };

  const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(Number(value) || 0);

  const handleCopyReferralLink = async () => {
    if (!referralShareLink) return;
    const copied = await copyToClipboard(referralShareLink);
    setReferralCopyFeedback(copied ? "Referral link copied" : "Copy failed. Please copy manually.");
    setTimeout(() => setReferralCopyFeedback(""), 2200);
  };

  useEffect(() => {
    if (activeTab !== "settings" || !isOwnProfile || !isWriterUser) {
      setReferralSummary(null);
      setReferralError("");
      setReferralCopyFeedback("");
      return;
    }

    let isActive = true;

    const loadReferralSummary = async () => {
      try {
        setReferralLoading(true);
        setReferralError("");
        const { data } = await api.get("/auth/referral-summary");
        if (!isActive) return;
        setReferralSummary(data || null);
      } catch {
        if (!isActive) return;
        setReferralSummary(null);
        setReferralError("Unable to load referral details right now.");
      } finally {
        if (isActive) setReferralLoading(false);
      }
    };

    loadReferralSummary();

    return () => {
      isActive = false;
    };
  }, [activeTab, isOwnProfile, isWriterUser]);

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
          {profileAccessMessage || "User not found"}
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
      : "bg-[#fcfdff] border-[#d7e2ef] shadow-sm",
    coverFrom: dark ? "from-[#0a1628]" : "from-[#1e3a5f]",
    coverTo: dark ? "to-[#162d4a]" : "to-[#5f8fc6]",
    avatarRing: dark ? "ring-[#0d1520]" : "ring-white",
    avatarGrad: dark
      ? "from-[#1a3557] to-[#0f2439]"
      : "from-[#1e3a5f] to-[#2d5a8e]",
    h1: dark ? "text-white" : "text-gray-900",
    body: dark ? "text-white/65" : "text-gray-600",
    email: dark ? "text-white/60" : "text-gray-600",
    statNum: dark ? "text-white" : "text-gray-900",
    statLabel: dark ? "text-white/30" : "text-gray-400",
    joined: dark ? "text-white/60" : "text-gray-600",
    divider: dark ? "border-white/[0.06]" : "border-gray-100",
    roleBg: dark
      ? "bg-[#1e3a5f]/25 border-[#4a6f9b]/45 text-[#9dc2f8]"
      : "bg-[#eaf2ff] border-[#bfd4f3] text-[#204774]",
    wgaBadge: dark
      ? "bg-amber-500/12 border-amber-400/30 text-amber-300"
      : "bg-[#fff7e8] border-[#f4d8a8] text-[#8a5a10]",
    repBadge: dark
      ? "bg-emerald-500/12 border-emerald-400/30 text-emerald-300"
      : "bg-[#e9f9f2] border-[#bfe9d2] text-[#11633f]",
    writerPanel: dark
      ? "bg-[#0a1628]/82 border-white/[0.12] shadow-[0_20px_45px_-24px_rgba(0,0,0,0.9)]"
      : "bg-white/92 border-[#d4e2f1] shadow-[0_20px_45px_-24px_rgba(37,75,120,0.25)]",
    writerPanelSub: dark ? "text-[#9bb3cd]" : "text-[#45607f]",
    writerName: dark ? "text-white" : "text-[#10233d]",
    writerStatCard: dark
      ? "bg-white/[0.04] border-white/[0.09]"
      : "bg-[#f8fbff] border-[#cfdeef]",
    writerStatLabel: dark ? "text-[#89a1bc]" : "text-[#4f6786]",
    writerStatValue: dark ? "text-white" : "text-[#10233d]",
    chip: dark
      ? "bg-white/[0.04] text-white/65 border-white/[0.08]"
      : "bg-[#f5f9ff] text-[#3f5878] border-[#d4e0ef]",
    genreChip: dark
      ? "bg-[#1e3a5f]/20 text-[#7aafff]/75 border-[#1e3a5f]/30"
      : "bg-[#1e3a5f]/[0.06] text-[#1e3a5f] border-[#1e3a5f]/15",
    editBtn: dark
      ? "bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white"
      : "bg-white hover:bg-[#f4f8ff] text-[#365273] hover:text-[#1a3557] shadow-sm",
    followActive: dark
      ? "bg-white/[0.05] text-white/45 border-white/[0.07] hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/30"
      : "bg-[#f5f8fc] text-[#526780] border-[#d3deeb] hover:bg-red-50 hover:text-red-500 hover:border-red-200",
    followIdle: dark
      ? "bg-[#1e3a5f] text-white hover:bg-[#243f6a] shadow-lg shadow-[#1e3a5f]/25"
      : "bg-[#1e3a5f] text-white hover:bg-[#162d4a] shadow-md shadow-[#1e3a5f]/20",
    blockBtn: dark
      ? "bg-red-500/10 text-red-300 border-red-500/25 hover:bg-red-500/18"
      : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
    unblockBtn: dark
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/18"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
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
    // Writer-specific layout tokens
    bentoCard: dark
      ? "bg-[#0d1520] border-white/[0.06]"
      : "bg-white border-gray-200/70 shadow-sm",
    subtleBg: dark ? "bg-white/[0.02]" : "bg-gray-50/60",
  };

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     RENDER
     â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  return (
    <div className={`mx-auto space-y-5 ${isWriterUser || isInvestorProfile ? "max-w-6xl" : "max-w-3xl"}`}>
      <ProfileCompletionBanner
        completion={showProfileCompletion ? profileCompletion : null}
        subtitle="Your profile is incomplete. Add missing details from Edit Profile."
        ctaLabel="Edit Profile"
        onCta={() => setShowEditModal(true)}
      />

      {/* ════════ PROFILE CARD ════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`rounded-2xl transition-colors relative overflow-visible ${t.card}`}
      >
        {/* Writer-first premium hero */}
        {isWriterUser ? (
          <div className="px-5 sm:px-8 pt-2 sm:pt-3 pb-7 relative z-20">
            <div className={`rounded-3xl p-5 sm:p-6 ${dark ? "bg-[#0b1320]/95" : "bg-white/95"}`}>
              {!isOwnProfile && (
                <div className="hidden max-[470px]:flex items-center max-[470px]:justify-between gap-1 mb-3.5 max-[470px]:w-full">
                  <button
                    onClick={handleFollow}
                    disabled={isBlockedByCurrent || blockedByProfile}
                    className={`px-4 sm:px-5 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all border max-[470px]:flex-1 max-[470px]:px-2 max-[470px]:text-[11px] disabled:opacity-55 disabled:cursor-not-allowed ${isFollowing ? t.followActive : t.followIdle}`}
                  >
                    {blockedByProfile ? "Blocked You" : isBlockedByCurrent ? "Blocked" : isFollowing ? "Following" : "Follow"}
                  </button>
                  <button
                    onClick={handleToggleBlock}
                    disabled={blockingAction || blockedByProfile}
                    className={`px-3 sm:px-4 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all border max-[470px]:flex-1 max-[470px]:px-2 max-[470px]:text-[11px] disabled:opacity-55 disabled:cursor-not-allowed ${isBlockedByCurrent ? t.unblockBtn : t.blockBtn}`}
                  >
                    {blockingAction ? "Updating..." : isBlockedByCurrent ? "Unblock" : "Block"}
                  </button>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-start gap-4 sm:gap-5">
                <div className="flex items-start gap-3 flex-1 min-w-0 max-[470px]:flex-col max-[470px]:items-center">
                  <div className="shrink-0 flex flex-col items-start gap-2 max-[470px]:items-center">
                    {profile.profileImage ? (
                      <img
                        src={resolveImage(profile.profileImage)}
                        alt={profile.name}
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-[3px] ${t.avatarRing}`}
                      />
                    ) : (
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br flex items-center justify-center ring-[3px] ${t.avatarRing} ${t.avatarGrad}`}>
                        <span className="text-3xl sm:text-4xl font-extrabold text-white/85">
                          {profile.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                      <div className="flex flex-col items-start gap-2 mt-2 max-[470px]:items-center">
                        <SocialShareButton
                          share={profileShare}
                          buttonLabel="Share"
                          className={`px-3 sm:px-4 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 ${dark ? "bg-white/[0.07] hover:bg-white/[0.14] text-white/80" : "bg-white hover:bg-[#f4f8ff] text-[#1a3557] shadow-sm"}`}
                        />
                        {isOwnProfile ? (
                          <button
                            onClick={() => setShowEditModal(true)}
                            className={`px-3 sm:px-4 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 ${t.editBtn}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                            Edit Profile
                          </button>
                        ) : (
                          <button
                            onClick={handleFollow}
                            disabled={isBlockedByCurrent || blockedByProfile}
                            className={`px-4 sm:px-5 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all border disabled:opacity-55 disabled:cursor-not-allowed ${isFollowing ? t.followActive : t.followIdle}`}
                          >
                            {blockedByProfile ? "Blocked You" : isBlockedByCurrent ? "Blocked" : isFollowing ? "Following" : "Follow"}
                          </button>
                        )}
                      </div>
                  </div>

                  <div className="min-w-0 flex-1 max-[470px]:w-full max-[470px]:text-center">
                    <div className="flex items-center gap-2 flex-wrap max-[470px]:justify-center">
                      <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${t.h1}`}>{profile.name}</h1>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] border ${t.roleBg}`}>
                        {profile.role}
                      </span>
                      {profile.writerProfile?.wgaMember && (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] border ${t.wgaBadge}`}>WGA</span>
                      )}
                      {profile.writerProfile?.sgaMember && (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] border ${t.wgaBadge}`}>SWA</span>
                      )}
                      {!isOwnProfile && (
                        <button
                          onClick={handleToggleBlock}
                          disabled={blockingAction || blockedByProfile}
                          className={`px-3 sm:px-4 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all border sm:ml-auto max-[470px]:hidden disabled:opacity-55 disabled:cursor-not-allowed ${isBlockedByCurrent ? t.unblockBtn : t.blockBtn}`}
                        >
                          {blockingAction ? "Updating..." : isBlockedByCurrent ? "Unblock" : "Block"}
                        </button>
                      )}
                    </div>

                    {profile.writerProfile?.representationStatus && profile.writerProfile.representationStatus !== "unrepresented" && (
                      <p className={`text-[13px] mt-1.5 capitalize max-[470px]:text-center ${dark ? "text-white/50" : "text-gray-600"}`}>
                        {profile.writerProfile.representationStatus.replace(/_/g, " & ")}
                        {profile.writerProfile?.agencyName ? ` at ${profile.writerProfile.agencyName}` : ""}
                      </p>
                    )}

                    {isOwnProfile && (
                      <p className={`text-[12px] font-medium mt-1.5 max-[470px]:text-center ${t.email}`}>{profile.email}</p>
                    )}

                    {profile.bio && (
                      <p className={`text-[14px] leading-relaxed mt-3 line-clamp-4 max-[470px]:text-center ${t.body}`}>
                        {profile.bio}
                      </p>
                    )}

                    <div className="w-full mt-3.5">
                      <div className="grid grid-cols-3 gap-1.5 w-full max-[470px]:gap-1">
                        {[
                          { label: "Projects", value: scripts.length },
                          { label: "Followers", value: profile.followers.length, connectionType: "followers" },
                          { label: "Following", value: profile.following.length, connectionType: "following" },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            disabled={!item.connectionType}
                            onClick={item.connectionType ? () => openConnectionsModal(item.connectionType) : undefined}
                            className={`rounded-xl px-2.5 py-2 text-left max-[470px]:text-center overflow-hidden transition-colors disabled:opacity-100 ${item.connectionType ? dark ? "hover:bg-white/[0.08]" : "hover:bg-[#f0f6ff]" : "cursor-default"}`}
                          >
                            <p className={`text-lg font-black tabular-nums leading-none ${dark ? "text-white" : "text-gray-900"}`}>{item.value}</p>
                            <p className={`block w-full text-[10px] max-[470px]:text-[9px] font-bold uppercase tracking-[0.12em] max-[470px]:tracking-[0.08em] mt-0.5 max-[470px]:truncate ${dark ? "text-white/35" : "text-gray-500"}`}>{item.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>


                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {profile.role === "investor" ? (
              <div className="px-4 sm:px-8 pt-2 sm:pt-3 pb-6 sm:pb-7 relative z-20">
                <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${dark ? "bg-[#0b1320]/95" : "bg-white/95"}`}>
                  <div className="hidden max-[460px]:flex items-center justify-center gap-x-3 gap-y-2 mb-5 flex-wrap">
                    <SocialShareButton
                      share={profileShare}
                      buttonLabel="Share"
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 ${dark ? "bg-white/[0.07] hover:bg-white/[0.14] text-white/80" : "bg-white hover:bg-[#f4f8ff] text-[#1a3557] shadow-sm"}`}
                    />
                    {isOwnProfile ? (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 ${t.editBtn}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleFollow}
                          disabled={isBlockedByCurrent || blockedByProfile}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border disabled:opacity-55 disabled:cursor-not-allowed ${isFollowing ? t.followActive : t.followIdle}`}
                        >
                          {blockedByProfile ? "Blocked You" : isBlockedByCurrent ? "Blocked" : isFollowing ? "Following" : "Follow"}
                        </button>
                        <button
                          onClick={handleToggleBlock}
                          disabled={blockingAction || blockedByProfile}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border disabled:opacity-55 disabled:cursor-not-allowed ${isBlockedByCurrent ? t.unblockBtn : t.blockBtn}`}
                        >
                          {blockingAction ? "Updating..." : isBlockedByCurrent ? "Unblock" : "Block"}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col min-[1000px]:flex-row min-[1000px]:items-start gap-4 sm:gap-5 min-[1000px]:gap-6">
                    <div className="flex items-start max-[460px]:flex-col max-[460px]:items-center gap-4 sm:gap-5 min-w-0 flex-1">
                      <div className="shrink-0 flex flex-col items-start gap-2 max-[460px]:items-center">
                        {profile.profileImage ? (
                          <img
                            src={resolveImage(profile.profileImage)}
                            alt={profile.name}
                            className={`w-20 h-20 min-[420px]:w-24 min-[420px]:h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-[3px] ${t.avatarRing}`}
                          />
                        ) : (
                          <div className={`w-20 h-20 min-[420px]:w-24 min-[420px]:h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br flex items-center justify-center ring-[3px] ${t.avatarRing} ${t.avatarGrad}`}>
                            <span className="text-3xl min-[420px]:text-4xl sm:text-5xl font-extrabold text-white/85">
                              {profile.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        <div className="hidden min-[461px]:flex flex-col items-start gap-2 mt-2">
                          <SocialShareButton
                            share={profileShare}
                            buttonLabel="Share"
                            className={`px-3 sm:px-4 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 ${dark ? "bg-white/[0.07] hover:bg-white/[0.14] text-white/80" : "bg-white hover:bg-[#f4f8ff] text-[#1a3557] shadow-sm"}`}
                          />
                          {isOwnProfile ? (
                            <button
                              onClick={() => setShowEditModal(true)}
                              className={`px-3 sm:px-4 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 ${t.editBtn}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                              </svg>
                              Edit Profile
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={handleFollow}
                                disabled={isBlockedByCurrent || blockedByProfile}
                                className={`px-4 sm:px-5 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all border disabled:opacity-55 disabled:cursor-not-allowed ${isFollowing ? t.followActive : t.followIdle}`}
                              >
                                {blockedByProfile ? "Blocked You" : isBlockedByCurrent ? "Blocked" : isFollowing ? "Following" : "Follow"}
                              </button>
                              <button
                                onClick={handleToggleBlock}
                                disabled={blockingAction || blockedByProfile}
                                className={`px-3 sm:px-4 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all border disabled:opacity-55 disabled:cursor-not-allowed ${isBlockedByCurrent ? t.unblockBtn : t.blockBtn}`}
                              >
                                {blockingAction ? "Updating..." : isBlockedByCurrent ? "Unblock" : "Block"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 max-[460px]:w-full max-[460px]:text-center">
                        <div className="flex items-center gap-2 flex-wrap max-[460px]:justify-center">
                          <h1 className={`text-[26px] min-[420px]:text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.05] break-words ${t.h1}`}>{profile.name}</h1>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] border ${t.roleBg}`}>
                            Investor
                          </span>
                        </div>

                        {(profile.industryProfile?.company || profile.industryProfile?.jobTitle) && (
                          <p className={`text-[14px] mt-2 font-medium max-[460px]:text-center ${dark ? "text-white/55" : "text-gray-600"}`}>
                            {profile.industryProfile?.jobTitle || "Investor"}
                            {profile.industryProfile?.company ? ` at ${profile.industryProfile.company}` : ""}
                          </p>
                        )}

                        {isOwnProfile && (
                          <p className={`text-[13px] font-semibold mt-2 break-all max-[460px]:text-center ${t.email}`}>{profile.email}</p>
                        )}

                        {profile.bio && (
                          <p className={`text-[15px] leading-relaxed mt-3 line-clamp-4 max-[460px]:text-center ${t.body}`}>
                            {profile.bio}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2.5 mt-3.5 max-[460px]:justify-center">
                          {memberSince && (
                            <span className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${dark ? "bg-white/[0.04] text-white/55 border-white/[0.08]" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                              Joined {memberSince}
                            </span>
                          )}
                          {profile.industryProfile?.investmentRange && (
                            <span className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${dark ? "bg-white/[0.04] text-white/55 border-white/[0.08]" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                              {profile.industryProfile.investmentRange.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 w-full min-[1000px]:w-[360px] min-[1000px]:shrink-0 rounded-2xl p-2.5 sm:p-3">
                      {[
                        { label: "Followers", value: profile.followers.length, connectionType: "followers" },
                        { label: "Following", value: profile.following.length, connectionType: "following" },
                        { label: "Purchased", value: purchasedCount },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          disabled={!item.connectionType}
                          onClick={item.connectionType ? () => openConnectionsModal(item.connectionType) : undefined}
                          className={`rounded-2xl px-3.5 py-3 min-h-[92px] text-left max-[460px]:text-center transition-all duration-200 disabled:opacity-100 ${item.connectionType ? dark ? "hover:bg-[#142234] hover:-translate-y-[1px]" : "hover:bg-[#f8fbff] hover:-translate-y-[1px]" : "cursor-default"}`}
                        >
                          <p className={`text-lg min-[1000px]:text-xl font-black tabular-nums leading-none ${dark ? "text-white" : "text-gray-900"}`}>{item.value}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-[0.12em] mt-1.5 ${dark ? "text-white/35" : "text-gray-500"}`}>{item.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Avatar + Info row */}
                <div className="px-6 sm:px-8">
                  <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 relative z-20">
                    <div className="shrink-0">
                      {profile.profileImage ? (
                        <img src={resolveImage(profile.profileImage)} alt={profile.name}
                          className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover ring-[5px] ${t.avatarRing}`} />
                      ) : (
                        <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full ring-[5px] bg-gradient-to-br flex items-center justify-center ${t.avatarRing} ${t.avatarGrad}`}>
                          <span className="text-4xl sm:text-5xl font-extrabold text-white/80">
                            {profile.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pb-1 pt-1 sm:pt-0">
                      <div className="space-y-2">
                        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${t.h1}`}>
                          {profile.name}
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] border ${t.roleBg}`}>
                            {profile.role}
                          </span>
                        </div>
                      </div>
                      {isOwnProfile && <p className={`text-[13px] font-medium mt-2 ${t.email}`}>{profile.email}</p>}
                      {profile.bio && (
                        <p className={`text-[14px] leading-relaxed mt-2.5 line-clamp-4 ${t.body}`}>
                          {profile.bio}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <SocialShareButton
                          share={profileShare}
                          buttonLabel="Share"
                          className={`px-3 sm:px-4 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 ${dark ? "bg-white/[0.07] hover:bg-white/[0.14] text-white/80" : "bg-white hover:bg-[#f4f8ff] text-[#1a3557] shadow-sm"}`}
                        />
                        {isOwnProfile ? (
                          <button
                            onClick={() => setShowEditModal(true)}
                            className={`px-3 sm:px-4 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 ${t.editBtn}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                            Edit Profile
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={handleFollow}
                              disabled={isBlockedByCurrent || blockedByProfile}
                              className={`px-4 sm:px-5 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all border disabled:opacity-55 disabled:cursor-not-allowed ${isFollowing ? t.followActive : t.followIdle}`}
                            >
                              {blockedByProfile ? "Blocked You" : isBlockedByCurrent ? "Blocked" : isFollowing ? "Following" : "Follow"}
                            </button>
                            <button
                              onClick={handleToggleBlock}
                              disabled={blockingAction || blockedByProfile}
                              className={`px-3 sm:px-4 py-1.5 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all border disabled:opacity-55 disabled:cursor-not-allowed ${isBlockedByCurrent ? t.unblockBtn : t.blockBtn}`}
                            >
                              {blockingAction ? "Updating..." : isBlockedByCurrent ? "Unblock" : "Block"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats for non-writer */}
                <div className="px-6 sm:px-8 pb-7 pt-5">
                  <div className={`flex flex-wrap items-end gap-6 sm:gap-8 pt-5 border-t ${t.divider}`}>
                    {[
                      ...(profile.role !== "investor" ? [{ value: scripts.length, label: "Projects" }] : []),
                      { value: profile.followers.length, label: "Followers", connectionType: "followers" },
                      { value: profile.following.length, label: "Following", connectionType: "following" },
                      ...(memberSince ? [{ value: memberSince, label: "Joined", isStr: true }] : []),
                    ].map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        disabled={!s.connectionType}
                        onClick={s.connectionType ? () => openConnectionsModal(s.connectionType) : undefined}
                        className={`${s.connectionType ? "rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors disabled:opacity-100 text-left" : ""} ${s.connectionType ? dark ? "hover:bg-white/[0.08]" : "hover:bg-[#f0f6ff]" : "cursor-default"}`}
                      >
                        <p className={`${s.isStr ? "text-lg sm:text-xl" : "text-2xl"} font-extrabold tabular-nums ${t.statNum}`}>{s.value}</p>
                        <p className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${t.statLabel}`}>{s.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </motion.div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ TABS â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "about", label: "About" },
          ...(profile.role !== "investor" ? [{ key: "projects", label: "Projects", count: scripts.length }] : []),
          ...(isOwnProfile ? [{ key: "bookmarks", label: "Bookmarks", count: profile.favoriteScripts?.length || bookmarkedScripts.length }] : []),
          ...(isOwnProfile && ["investor", "producer", "director"].includes(profile.role)
            ? [{ key: "purchased", label: "Purchased", count: purchasedCount }]
            : []),
          ...(isOwnProfile ? [{ key: "financial", label: "Financial" }] : []),
          ...(isOwnProfile ? [{ key: "settings", label: "Settings" }] : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 border shrink-0 max-[585px]:px-3 max-[585px]:py-2 max-[585px]:text-[12px] max-[350px]:text-[11px] ${activeTab === tab.key
              ? dark
                ? "bg-[#1c2b42] text-white border-[#314765]"
                : "bg-[#1e3a5f] text-white border-[#1e3a5f]"
              : dark
                ? "bg-[#121d2f] text-white/75 border-white/[0.12] hover:bg-[#18273d] hover:text-white"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900"
              }`}
          >
            <span className="flex items-center justify-center gap-1.5 min-w-0">
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
            <div className={`grid grid-cols-1 min-[460px]:grid-cols-2 ${isWriterUser ? "lg:grid-cols-3" : ""} gap-4`}>
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

      {activeTab === "bookmarks" && isOwnProfile && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {bookmarkedScripts.length === 0 ? (
            <div className={`rounded-2xl border py-20 text-center transition-colors ${t.card}`}>
              <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${t.emptyBg}`}>
                <svg className={`w-6 h-6 ${t.emptyIcon}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5h13.5a.75.75 0 01.75.75v15.69a.75.75 0 01-1.219.594L12 16.34l-6.281 5.194a.75.75 0 01-1.219-.594V5.25a.75.75 0 01.75-.75z" />
                </svg>
              </div>
              <p className={`text-[15px] font-bold mb-1 ${t.emptyH}`}>No bookmarks yet</p>
              <p className={`text-[13px] max-w-xs mx-auto ${t.emptyP}`}>Bookmark projects from cards or project pages to quickly access them here.</p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 min-[460px]:grid-cols-2 ${isWriterUser ? "lg:grid-cols-3" : ""} gap-4`}>
              {bookmarkedScripts.map((script, idx) => (
                <motion.div
                  key={script._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="relative group/card"
                >
                  <ProjectCard project={script} userName={script.creator?.name || "Unknown Author"} />
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
              {/* Professional Info */}
              <div className="grid grid-cols-1 gap-3">
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
                    <InfoRow
                      dark={dark}
                      label="Sub-Role"
                      value={profile.industryProfile?.subRole
                        ? formatIndustrySubRole(profile.industryProfile.subRole, profile.industryProfile?.subRoleOther)
                        : <span className={`italic ${dark ? "text-white/20" : "text-gray-300"}`}>Not set</span>}
                    />
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
          {/* Writer-specific sections — Bento Grid */}
          {isWriter(profile.role) && profile.writerProfile && (
            <>
              {/* Bento Grid Row 1: Writer Info + WGA Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Writer Info Card */}
                <div className={`profile-bento-card rounded-2xl p-6 border col-span-1 sm:col-span-1 lg:col-span-2 ${t.bentoCard}`}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? "bg-[#1e3a5f]/30" : "bg-[#1e3a5f]/[0.06]"}`}>
                      <svg className={`w-4.5 h-4.5 ${dark ? "text-[#7aafff]" : "text-[#1e3a5f]"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </div>
                    <h3 className={`text-[14px] font-bold ${dark ? "text-white/80" : "text-gray-800"}`}>Writer Profile</h3>
                    {profile.writerProfile.plan === "paid" && (
                      <span className={`ml-auto px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${dark ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"}`}>PRO</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`rounded-xl p-4 ${t.subtleBg}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5 ${dark ? "text-white/25" : "text-gray-400"}`}>Representation</p>
                      <p className={`text-[14px] font-bold capitalize ${dark ? "text-white/80" : "text-gray-800"}`}>
                        {(profile.writerProfile.representationStatus || "unrepresented").replace(/_/g, " & ")}
                      </p>
                      {profile.writerProfile.agencyName && (
                        <p className={`text-[12px] mt-1 ${dark ? "text-white/40" : "text-gray-500"}`}>{profile.writerProfile.agencyName}</p>
                      )}
                    </div>
                    {profile.writerProfile.legalName && (
                      <div className={`rounded-xl p-4 ${t.subtleBg}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5 ${dark ? "text-white/25" : "text-gray-400"}`}>Legal Name</p>
                        <p className={`text-[14px] font-bold ${dark ? "text-white/80" : "text-gray-800"}`}>{profile.writerProfile.legalName}</p>
                      </div>
                    )}
                    {memberSince && (
                      <div className={`rounded-xl p-4 ${t.subtleBg}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5 ${dark ? "text-white/25" : "text-gray-400"}`}>Career Since</p>
                        <p className={`text-[14px] font-bold ${dark ? "text-white/80" : "text-gray-800"}`}>{memberSince}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* WGA Status Card */}
                <div className={`profile-bento-card rounded-2xl p-6 border flex flex-col items-center justify-center text-center ${t.bentoCard}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${(profile.writerProfile.wgaMember || profile.writerProfile.sgaMember)
                    ? dark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"
                    : dark ? "bg-white/[0.04] border border-white/[0.06]" : "bg-gray-50 border border-gray-200"}`}>
                    <svg className={`w-7 h-7 ${(profile.writerProfile.wgaMember || profile.writerProfile.sgaMember) ? dark ? "text-amber-400" : "text-amber-600" : dark ? "text-white/20" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <p className={`text-[13px] font-bold mb-2 ${dark ? "text-white/70" : "text-gray-700"}`}>Guild Memberships</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-[12px] font-bold border ${profile.writerProfile.wgaMember ? t.wgaYes : t.wgaNo}`}>
                      WGA: {profile.writerProfile.wgaMember ? "Verified" : "Not a Member"}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-[12px] font-bold border ${profile.writerProfile.sgaMember ? t.wgaYes : t.wgaNo}`}>
                      SWA: {profile.writerProfile.sgaMember ? "Verified" : "Not a Member"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bento Grid Row 2: Genres + Specialized Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Genres */}
                <div className={`profile-bento-card rounded-2xl p-6 border ${t.bentoCard}`}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-white/[0.05] text-white/40" : "bg-[#1e3a5f]/[0.06] text-[#1e3a5f]/50"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-white/40" : "text-[#1e3a5f]/50"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125" />
                      </svg>
                    </div>
                    <h3 className={`text-[13px] font-bold ${dark ? "text-white/70" : "text-gray-800"}`}>Genres</h3>
                    <span className={`ml-auto text-[11px] font-semibold tabular-nums ${dark ? "text-white/25" : "text-gray-400"}`}>{profile.writerProfile.genres?.length || 0}</span>
                  </div>
                  {profile.writerProfile.genres?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.writerProfile.genres.map((genre, i) => (
                        <span key={i} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border ${t.genreChip}`}>
                          {genre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-[12px] italic ${dark ? "text-white/20" : "text-gray-300"}`}>No genres selected</p>
                  )}
                </div>

                {/* Specialized Tags */}
                <div className={`profile-bento-card rounded-2xl p-6 border ${t.bentoCard}`}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-white/[0.05] text-white/40" : "bg-[#1e3a5f]/[0.06] text-[#1e3a5f]/50"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-white/40" : "text-[#1e3a5f]/50"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                      </svg>
                    </div>
                    <h3 className={`text-[13px] font-bold ${dark ? "text-white/70" : "text-gray-800"}`}>Specialized Tags</h3>
                    <span className={`ml-auto text-[11px] font-semibold tabular-nums ${dark ? "text-white/25" : "text-gray-400"}`}>{profile.writerProfile.specializedTags?.length || 0}</span>
                  </div>
                  {profile.writerProfile.specializedTags?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.writerProfile.specializedTags.map((tag, i) => (
                        <span key={i} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border ${t.chip}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-[12px] italic ${dark ? "text-white/20" : "text-gray-300"}`}>No tags specified</p>
                  )}
                </div>
              </div>

              {/* Skills Matrix — full width */}
              {profile.skills?.length > 0 && (
                <div className={`profile-bento-card rounded-2xl p-6 border ${t.bentoCard}`}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-white/[0.05] text-white/40" : "bg-[#1e3a5f]/[0.06] text-[#1e3a5f]/50"}`}>
                      <svg className={`w-4 h-4 ${dark ? "text-white/40" : "text-[#1e3a5f]/50"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <h3 className={`text-[13px] font-bold ${dark ? "text-white/70" : "text-gray-800"}`}>Skills & Expertise</h3>
                    <span className={`ml-auto text-[11px] font-semibold tabular-nums ${dark ? "text-white/25" : "text-gray-400"}`}>{profile.skills.length}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {profile.skills.map((skill, i) => (
                      <div key={i} className={`rounded-lg px-4 py-3 text-center cursor-default border ${dark ? "bg-white/[0.03] border-white/[0.06]" : "bg-gray-50 border-gray-200/60"}`}>
                        <p className={`text-[12px] font-bold ${dark ? "text-white/65" : "text-gray-700"}`}>{skill}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diversity Info (owner only) */}
              {isOwnProfile &&
                (profile.writerProfile.diversity?.gender ||
                  profile.writerProfile.diversity?.ethnicity) && (
                  <div className={`profile-bento-card rounded-2xl p-6 border relative ${t.bentoCard}`}>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-white/[0.05] text-white/40" : "bg-[#1e3a5f]/[0.06] text-[#1e3a5f]/50"}`}>
                        <svg className={`w-4 h-4 ${dark ? "text-white/40" : "text-[#1e3a5f]/50"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <h3 className={`text-[13px] font-bold ${dark ? "text-white/70" : "text-gray-800"}`}>Diversity Information</h3>
                      <span className={`ml-auto px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${dark ? "bg-white/[0.04] text-white/25 border border-white/[0.06]" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>Private</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.writerProfile.diversity.gender && (
                        <div className={`rounded-xl p-4 ${t.subtleBg}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1 ${dark ? "text-white/25" : "text-gray-400"}`}>Gender</p>
                          <p className={`text-[14px] font-bold capitalize ${dark ? "text-white/70" : "text-gray-700"}`}>{profile.writerProfile.diversity.gender}</p>
                        </div>
                      )}
                      {profile.writerProfile.diversity.ethnicity && (
                        <div className={`rounded-xl p-4 ${t.subtleBg}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1 ${dark ? "text-white/25" : "text-gray-400"}`}>Ethnicity</p>
                          <p className={`text-[14px] font-bold capitalize ${dark ? "text-white/70" : "text-gray-700"}`}>{profile.writerProfile.diversity.ethnicity}</p>
                        </div>
                      )}
                    </div>
                  </div>
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
                  href={getScriptCanonicalPath(script)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group cursor-pointer ${dark ? "bg-[#0d1520] border-white/[0.06] hover:border-white/[0.12] hover:bg-[#112030]" : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-md shadow-sm"}`}
                >
                  {/* Thumbnail */}
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 ${dark ? "bg-[#1a2d47]" : "bg-gray-100"}`}>
                    {script.coverImage ? (
                      <img src={script.coverImage.startsWith("http") ? script.coverImage : `${(import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "").replace(/\/$/, "")}${script.coverImage}`}
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
                    {script.isDeleted && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${dark ? "bg-amber-500/10 text-amber-300 border-amber-400/20" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                        Deleted by creator
                      </span>
                    )}
                    {script.price > 0 && (
                      <span className={`text-[12px] font-bold ${dark ? "text-white/30" : "text-gray-400"}`}>{formatCurrency(script.price, "INR")}</span>
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
                  <p className={`text-[11px] ${dark ? "text-white/25" : "text-gray-400"}`}>{profile.pendingEmail ? `Current: ${profile.email}` : profile.email}</p>
                  {profile.pendingEmail && (
                    <p className={`text-[11px] mt-0.5 ${dark ? "text-amber-300/70" : "text-amber-700"}`}>Pending: {profile.pendingEmail}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(profile.pendingEmail || !profile.emailVerified) && (
                    <button
                      disabled={sendingVerificationCode || savingSettings}
                      onClick={async () => {
                        try {
                          setSendingVerificationCode(true);
                          setSettingsErr("");
                          await api.post("/users/email-verification/send");
                          setVerificationCodeSent(true);
                          setSettingsMsg("Verification code sent to your email");
                          setTimeout(() => setSettingsMsg(""), 3000);
                        } catch (e) {
                          setSettingsErr(e.response?.data?.message || "Failed to send verification code");
                        } finally {
                          setSendingVerificationCode(false);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${dark ? "bg-[#1e3a5f]/30 text-blue-300 border-[#1e3a5f]/40 hover:bg-[#1e3a5f]/40 disabled:opacity-40" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 disabled:opacity-40"}`}
                    >
                      {sendingVerificationCode ? "Sending..." : "Send Code"}
                    </button>
                  )}
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${(profile.emailVerified && !profile.pendingEmail) ? dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200" : dark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200"}`}>{(profile.emailVerified && !profile.pendingEmail) ? "Verified" : "Unverified"}</span>
                </div>
              </div>
              {(profile.pendingEmail || !profile.emailVerified) && (
                <div className={`rounded-xl border p-4 ${dark ? "border-white/[0.06]" : "border-gray-100"}`}>
                  <p className={`text-[12px] font-bold uppercase tracking-wider mb-3 ${dark ? "text-white/30" : "text-gray-400"}`}>Verify Email</p>
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={emailVerificationCode}
                      onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] border outline-none transition-colors ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/15 focus:border-white/20" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-300 focus:border-gray-400"}`}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        disabled={verifyingEmailCode || emailVerificationCode.length !== 6}
                        onClick={async () => {
                          try {
                            setVerifyingEmailCode(true);
                            setSettingsErr("");
                            await api.post("/users/email-verification/verify", { otp: emailVerificationCode });
                            const verifiedEmail = profile.pendingEmail || profile.email;
                            setProfile({ ...profile, email: verifiedEmail, emailVerified: true, pendingEmail: undefined });
                            setEmailVerificationCode("");
                            setVerificationCodeSent(false);
                            setSettingsMsg("Email verified successfully");
                            setTimeout(() => setSettingsMsg(""), 3000);
                          } catch (e) {
                            setSettingsErr(e.response?.data?.message || "Failed to verify email");
                          } finally {
                            setVerifyingEmailCode(false);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-colors ${dark ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40" : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40"}`}
                      >
                        {verifyingEmailCode ? "Verifying..." : "Verify Code"}
                      </button>
                      <button
                        disabled={sendingVerificationCode || savingSettings}
                        onClick={async () => {
                          try {
                            setSendingVerificationCode(true);
                            setSettingsErr("");
                            await api.post("/users/email-verification/send");
                            setVerificationCodeSent(true);
                            setSettingsMsg("Verification code resent");
                            setTimeout(() => setSettingsMsg(""), 3000);
                          } catch (e) {
                            setSettingsErr(e.response?.data?.message || "Failed to resend verification code");
                          } finally {
                            setSendingVerificationCode(false);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-colors ${dark ? "bg-white/[0.04] text-white/70 border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-40" : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 disabled:opacity-40"}`}
                      >
                        {sendingVerificationCode ? "Sending..." : "Resend"}
                      </button>
                    </div>
                    {verificationCodeSent && (
                      <p className={`text-[11px] ${dark ? "text-white/30" : "text-gray-500"}`}>
                        A verification code was sent to {profile.pendingEmail || profile.email}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className={`rounded-xl border p-4 ${dark ? "border-white/[0.06]" : "border-gray-100"}`}>
                <p className={`text-[12px] font-bold uppercase tracking-wider mb-3 ${dark ? "text-white/30" : "text-gray-400"}`}>Change Email</p>
                <div className="space-y-2.5">
                  <input type="email" placeholder="New email address" value={emailForm.newEmail} onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })} className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] border outline-none transition-colors ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/15 focus:border-white/20" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-300 focus:border-gray-400"}`} />
                  <input type="password" placeholder="Current password" value={emailForm.password} onChange={e => setEmailForm({ ...emailForm, password: e.target.value })} className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] border outline-none transition-colors ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/15 focus:border-white/20" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-300 focus:border-gray-400"}`} />
                  <button disabled={savingSettings || !emailForm.newEmail || !emailForm.password} onClick={async () => { try { setSavingSettings(true); setSettingsErr(""); const { data } = await api.put("/users/change-email", emailForm); setProfile({ ...profile, email: data.email, pendingEmail: data.pendingEmail, emailVerified: true }); setEmailForm({ password: "", newEmail: "" }); setEmailVerificationCode(""); setVerificationCodeSent(true); setSettingsMsg(data.message || "Verification code sent to new email."); setTimeout(() => setSettingsMsg(""), 3000); } catch (e) { setSettingsErr(e.response?.data?.message || "Failed"); } finally { setSavingSettings(false); } }}
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

          {isWriterUser && (
            <SectionCard
              dark={dark}
              title="Referral"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25l1.72 3.486 3.848.559-2.784 2.714.657 3.832L12 17.034l-3.441 1.807.657-3.832-2.784-2.714 3.848-.559L12 8.25z" /></svg>}
            >
              <div className="space-y-3">
                <p className={`text-[12px] ${dark ? "text-white/45" : "text-gray-500"}`}>
                  Share your referral link. If a writer signs up with your link or referral and verifies their account, both writers get 15 credits.
                </p>

                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 ${dark ? "text-white/30" : "text-gray-400"}`}>
                    Referral Code
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-black tracking-wider ${dark ? "bg-white/[0.06] text-white" : "bg-gray-100 text-gray-900"}`}>
                      {referralCode || "--"}
                    </div>
                    <div className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold ${dark ? "bg-emerald-500/12 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
                      Bonus: {formatNumber(referralSummary?.totalBonusCredits || 0)} credits
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyReferralLink}
                      disabled={!referralShareLink || referralLoading}
                      className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${dark ? "bg-white/[0.08] text-white hover:bg-white/[0.14]" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 ${dark ? "text-white/30" : "text-gray-400"}`}>
                    Referral Link
                  </p>
                  <div className={`rounded-xl border px-3 py-2.5 text-xs break-all ${dark ? "border-white/[0.08] bg-white/[0.02] text-white/75" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                    {referralLoading ? "Loading referral link..." : referralShareLink || "Referral link unavailable"}
                  </div>
                  {referralError && <p className="mt-1.5 text-xs text-red-500">{referralError}</p>}
                  {referralCopyFeedback && (
                    <p className={`mt-1.5 text-xs ${dark ? "text-emerald-300" : "text-emerald-600"}`}>
                      {referralCopyFeedback}
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {/* Notification Preferences */}
          <SectionCard dark={dark} title="Notification Preferences" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>}>
            <div className="space-y-2.5">
              {[{ key: "smartMatchAlerts", label: "Smart Match Alerts", desc: "When a new script matches your mandates" }, { key: "holdAlerts", label: "Hold Alerts", desc: "Option hold status updates" }, { key: "viewAlerts", label: "View Alerts", desc: "When someone views your profile" }].map((pref) => (
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

          {/* Localization */}
          <SectionCard dark={dark} title="Localization" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" /></svg>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-white/30" : "text-gray-400"}`}>Language</p>
                <select value={getProfileLanguageValue(profile.language)} onChange={async (e) => { const nextLanguage = getBackendLanguageValue(e.target.value); try { await api.put("/users/settings", { language: nextLanguage }); setProfile({ ...profile, language: nextLanguage }); if (currentUser) { const updatedUser = { ...currentUser, language: nextLanguage }; setUser(updatedUser); localStorage.setItem("user", JSON.stringify(updatedUser)); } await applyLanguagePreference(nextLanguage, { forceReload: true }); setSettingsMsg("Language updated"); setTimeout(() => setSettingsMsg(""), 3000); } catch (err) { setSettingsErr("Failed"); } }}
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

          {/* Blocked Users */}
          <SectionCard dark={dark} title="Blocked Users" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" /></svg>}>
            {blockedUsers.length === 0 ? (
              <p className={`text-[12px] italic ${dark ? "text-white/25" : "text-gray-400"}`}>No blocked users.</p>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {blockedUsers.map((u) => (
                  <div key={u._id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${dark ? "bg-white/[0.02] border-white/[0.06]" : "bg-gray-50 border-gray-200"}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {u.profileImage ? (
                        <img src={resolveImage(u.profileImage)} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${dark ? "bg-white/[0.06] text-white/70" : "bg-gray-200 text-gray-700"}`}>
                          {u.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${dark ? "text-white/75" : "text-gray-800"}`}>{u.name}</p>
                        <p className={`text-[11px] capitalize ${dark ? "text-white/30" : "text-gray-400"}`}>{u.role || "user"}</p>
                      </div>
                    </div>
                    <button
                      disabled={savingSettings}
                      onClick={() => handleUnblockFromSettings(u._id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-40 ${dark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"}`}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {isWriterUser && (
            <SectionCard
              dark={dark}
              title="Deleted Projects"
              badge={`${deletedScripts.length}`}
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>}
            >
              {deletedScripts.length === 0 ? (
                <p className={`text-[12px] italic ${dark ? "text-white/25" : "text-gray-400"}`}>
                  No deleted projects yet.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {deletedScripts.map((script) => (
                    <div
                      key={script._id}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${dark ? "bg-white/[0.02] border-white/[0.06]" : "bg-gray-50 border-gray-200"}`}
                    >
                      {script.coverImage ? (
                        <img
                          src={resolveImage(script.coverImage)}
                          alt={script.title}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${dark ? "bg-white/[0.06] text-white/40" : "bg-gray-200 text-gray-500"}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V8.25A2.25 2.25 0 015.25 6h13.5A2.25 2.25 0 0121 8.25v8.25M3 16.5l4.586-4.586a2.25 2.25 0 013.182 0L15 16.146m6 0l-3.586-3.586a2.25 2.25 0 00-3.182 0L12 14.793" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-semibold truncate ${dark ? "text-white/80" : "text-gray-800"}`}>
                          {script.title}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${dark ? "text-white/30" : "text-gray-500"}`}>
                          {script.genre || "Unspecified genre"}
                          {script.format ? ` \u00b7 ${script.format.replace(/_/g, " ")}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${dark ? "text-red-300/70" : "text-red-600"}`}>
                          Deleted
                        </p>
                        <p className={`text-[11px] ${dark ? "text-white/30" : "text-gray-500"}`}>
                          {new Date(script.deletedAt || script.updatedAt || script.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* Danger Zone */}
          <SectionCard dark={dark} title="Danger Zone" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}>
            <div className={`flex items-center justify-between py-3 px-4 rounded-xl border ${dark ? "border-red-500/15 bg-red-500/[0.03]" : "border-red-100 bg-red-50/40"}`}>
              <div><p className={`text-[13px] font-semibold ${dark ? "text-red-400/80" : "text-red-600"}`}>Delete Account</p><p className={`text-[11px] ${dark ? "text-red-400/30" : "text-red-400"}`}>Permanently delete your account and all data</p></div>
              <button
                onClick={() => setShowDeleteAccountModal(true)}
                className={`px-3.5 py-1.5 rounded-xl text-[12px] font-bold border transition-colors ${dark ? "border-red-500/30 text-red-400/70 hover:bg-red-500/10" : "border-red-200 text-red-500 hover:bg-red-50"}`}
              >
                Delete
              </button>
            </div>
          </SectionCard>

          {showDeleteAccountModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 p-4 flex items-center justify-center" onClick={() => !deletingAccount && setShowDeleteAccountModal(false)}>
              <div
                className={`w-full max-w-md rounded-2xl border p-5 ${dark ? "bg-[#0d1520] border-white/[0.08]" : "bg-white border-gray-200"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className={`text-[15px] font-extrabold mb-1 ${dark ? "text-white" : "text-gray-900"}`}>Delete Account</h3>
                <p className={`text-[12px] mb-3 ${dark ? "text-white/40" : "text-gray-500"}`}>
                  Share the reason for deletion. This is visible to admin, and your account will be hidden across the platform.
                </p>
                <textarea
                  value={deleteAccountReason}
                  onChange={(e) => setDeleteAccountReason(e.target.value)}
                  rows={4}
                  placeholder="Please tell us why you are deleting your account..."
                  className={`w-full rounded-xl px-3.5 py-2.5 text-[13px] border outline-none resize-none ${dark ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/20" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400"}`}
                />
                <div className="mt-4 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setShowDeleteAccountModal(false)}
                    disabled={deletingAccount}
                    className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-colors disabled:opacity-50 ${dark ? "bg-white/[0.06] text-white/65 hover:bg-white/[0.1]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount || deleteAccountReason.trim().length < 5}
                    className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-colors disabled:opacity-50 ${dark ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-red-500 text-white hover:bg-red-600"}`}
                  >
                    {deletingAccount ? "Deleting..." : "Delete Account"}
                  </button>
                </div>
              </div>
            </div>
          )}
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
          <Transactions
            dark={dark}
            middleContent={isWriter(profile.role) ? <BankDetails dark={dark} /> : null}
          />
        </motion.div>
      )}

      {showConnectionsModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowConnectionsModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`rounded-2xl shadow-2xl max-w-md w-full border overflow-hidden ${dark ? "bg-[#0d1520] border-white/[0.08]" : "bg-white border-gray-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-white/[0.08]" : "border-gray-100"}`}>
              <div>
                <h3 className={`text-[16px] font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>{connectionsLabel}</h3>
                <p className={`text-[12px] mt-0.5 ${dark ? "text-white/35" : "text-gray-500"}`}>
                  {normalizedConnections.length} account{normalizedConnections.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={() => setShowConnectionsModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-white/[0.08] text-white/45 hover:text-white/70" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-3">
              {normalizedConnections.length === 0 ? (
                <div className={`rounded-xl border p-4 text-center ${dark ? "bg-white/[0.02] border-white/[0.06]" : "bg-gray-50 border-gray-100"}`}>
                  <p className={`text-[13px] font-semibold ${dark ? "text-white/55" : "text-gray-700"}`}>
                    No {connectionsType} yet
                  </p>
                  <p className={`text-[12px] mt-1 ${dark ? "text-white/30" : "text-gray-400"}`}>
                    Accounts will appear here as this profile grows.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {normalizedConnections.map((user, index) => (
                    <button
                      key={user._id || `${user.name}-${index}`}
                      type="button"
                      onClick={() => handleConnectionClick(user)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${dark ? "hover:bg-white/[0.06]" : "hover:bg-[#f5f9ff]"}`}
                    >
                      {user.profileImage ? (
                        <img
                          src={resolveImage(user.profileImage)}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${dark ? "bg-white/[0.08] text-white/75" : "bg-[#e5edf8] text-[#355172]"}`}>
                          {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-semibold truncate ${dark ? "text-white/80" : "text-gray-900"}`}>
                          {user.name}
                        </p>
                      </div>

                      <svg className={`w-4 h-4 shrink-0 ${dark ? "text-white/25" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Pitch Modal */}
      {showPitchModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowPitchModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl shadow-2xl max-w-lg w-full p-6 border ${dark ? "bg-[#0d1520] border-white/[0.06]" : "bg-white border-gray-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {pitchSuccess ? (
              <div className="text-center py-8">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${dark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={`text-lg font-extrabold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>Pitch Sent!</h3>
                <p className={`text-sm ${dark ? "text-white/50" : "text-gray-500"}`}>
                  Your pitch to {profile.name} was successfully submitted.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-lg font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>Pitch Script</h3>
                    <p className={`text-sm mt-1 ${dark ? "text-white/50" : "text-gray-500"}`}>
                      Select a script to pitch to {profile.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPitchModal(false)}
                    className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-white/[0.06] text-white/40 hover:text-white/60" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className={`block text-[13px] font-bold mb-2 ${dark ? "text-white/70" : "text-gray-700"}`}>
                      Select Script
                    </label>
                    <select
                      value={pitchData.scriptId}
                      onChange={(e) => setPitchData({ ...pitchData, scriptId: e.target.value })}
                      className={`w-full p-3 rounded-xl border text-[13px] outline-none transition-all ${
                        dark 
                          ? "bg-white/[0.03] border-white/[0.06] text-white focus:bg-white/[0.05] focus:border-white/20" 
                          : "bg-gray-50 border-gray-200 text-gray-800 focus:bg-white focus:border-purple-500"
                      }`}
                    >
                      <option value="">-- Choose a script --</option>
                      {myScripts.map(script => (
                        <option key={script._id} value={script._id}>{script.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[13px] font-bold mb-2 ${dark ? "text-white/70" : "text-gray-700"}`}>
                      Pitch Note (Optional)
                    </label>
                    <textarea
                      value={pitchData.note}
                      onChange={(e) => setPitchData({ ...pitchData, note: e.target.value })}
                      placeholder="Add a brief note about why this fits their mandate..."
                      className={`w-full min-h-[100px] p-3 rounded-xl border text-[13px] outline-none resize-none transition-all ${
                        dark 
                          ? "bg-white/[0.03] border-white/[0.06] text-white focus:bg-white/[0.05] focus:border-white/20 placeholder-white/20" 
                          : "bg-gray-50 border-gray-200 text-gray-800 focus:bg-white focus:border-purple-500 placeholder-gray-400"
                      }`}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPitchModal(false)}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                      dark ? "bg-white/[0.07] text-white/70 hover:bg-white/[0.12]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendPitch}
                    disabled={!pitchData.scriptId || sendingPitch}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      dark ? "bg-purple-500 text-white hover:bg-purple-600" : "bg-purple-600 text-white hover:bg-purple-700 shadow-md"
                    }`}
                  >
                    {sendingPitch ? "Sending..." : "Submit Pitch"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Message Request Modal */}
      {showMessageRequestModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowMessageRequestModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl shadow-2xl max-w-lg w-full p-6 border ${dark ? "bg-[#0d1520] border-white/[0.06]" : "bg-white border-gray-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {requestSuccess ? (
              <div className="text-center py-8">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${dark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={`text-lg font-extrabold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>Request Sent!</h3>
                <p className={`text-sm ${dark ? "text-white/50" : "text-gray-500"}`}>
                  Your message request has been sent to {profile.name}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={`text-lg font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>
                      Send Message Request
                    </h3>
                    <p className={`text-sm mt-1 ${dark ? "text-white/50" : "text-gray-500"}`}>
                      Introduce yourself to {profile.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMessageRequestModal(false)}
                    className={`p-1.5 rounded-lg transition-colors ${dark ? "hover:bg-white/[0.06] text-white/40 hover:text-white/60" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4">
                  <label className={`block text-sm font-semibold mb-2 ${dark ? "text-white/70" : "text-gray-700"}`}>
                    Your Message
                  </label>
                  <textarea
                    value={messageRequestText}
                    onChange={(e) => setMessageRequestText(e.target.value)}
                    placeholder="Tell them about your work and why you'd like to connect..."
                    rows={5}
                    className={`w-full px-4 py-3 rounded-xl text-sm border outline-none transition-colors resize-none ${
                      dark
                        ? "bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/25 focus:border-white/20"
                        : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-blue-400"
                    }`}
                    maxLength={500}
                  />
                  <p className={`text-xs mt-1.5 ${dark ? "text-white/30" : "text-gray-400"}`}>
                    {messageRequestText.length}/500 characters
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowMessageRequestModal(false)}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                      dark
                        ? "bg-white/[0.07] text-white/70 hover:bg-white/[0.12]"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMessageRequest}
                    disabled={!messageRequestText.trim() || sendingRequest}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      dark
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-blue-500 text-white hover:bg-blue-600 shadow-md"
                    }`}
                  >
                    {sendingRequest ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      "Send Request"
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedData) => {
            const mergedProfile = { ...profile, ...updatedData };
            setProfile(mergedProfile);

            if (isOwnProfile && currentUser) {
              const nextSessionUser = {
                ...currentUser,
                ...updatedData,
                profileCompletion: updatedData.profileCompletion || mergedProfile.profileCompletion || currentUser.profileCompletion,
              };
              setUser(nextSessionUser);
              localStorage.setItem("user", JSON.stringify(nextSessionUser));
            }

            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Profile;
