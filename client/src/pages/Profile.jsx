import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import ProjectCard from "../components/ProjectCard";
import EditProfileModal from "../components/EditProfileModal";

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("projects");

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/users/${id || currentUser._id}`);
      setProfile(data.user);
      setScripts(data.scripts || []);
      setIsFollowing(data.user.followers.some(f => f._id === currentUser._id));
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
        setProfile({ ...profile, followers: profile.followers.filter(f => f._id !== currentUser._id) });
      } else {
        await api.post("/users/follow", { userId: profile._id });
        setIsFollowing(true);
        setProfile({ ...profile, followers: [...profile.followers, { _id: currentUser._id, name: currentUser.name }] });
      }
    } catch (error) {
      console.error("Error following/unfollowing:", error);
    }
  };

  const isOwnProfile = currentUser._id === profile?._id;

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5001${url}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-2">
        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        <p className="text-sm font-semibold text-gray-400">User not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6 shadow-sm"
      >
        {/* Cover */}
        <div className="h-36 sm:h-44 relative bg-gradient-to-br from-[#0f2439] via-[#1e3a5f] to-[#2d5a8e]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.06),transparent_60%)]"></div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/10 to-transparent"></div>
          {/* Subtle dots pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
        </div>

        <div className="px-6 sm:px-8 pb-7">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-16 mb-6">
            <div className="relative">
              {profile.profileImage ? (
                <img src={resolveImage(profile.profileImage)} alt={profile.name}
                  className="w-[96px] h-[96px] sm:w-[112px] sm:h-[112px] rounded-2xl object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-[96px] h-[96px] sm:w-[112px] sm:h-[112px] rounded-2xl border-4 border-white shadow-lg bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center">
                  <span className="text-[36px] sm:text-[40px] font-extrabold text-white/90">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Online indicator */}
              {isOwnProfile && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-lg border-[2.5px] border-white"></div>
              )}
            </div>

            <div className="flex items-center gap-2 pb-1">
              {isOwnProfile ? (
                <button onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all text-[13px] font-semibold flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <button onClick={handleFollow}
                  className={`px-5 py-2 rounded-xl transition-all text-[13px] font-bold ${
                    isFollowing
                      ? "bg-gray-50 text-gray-600 border border-gray-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50"
                      : "bg-[#1e3a5f] text-white hover:bg-[#162d4a] shadow-sm"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>

          {/* Name + role */}
          <div className="mb-3">
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">{profile.name}</h1>
              <span className="px-2.5 py-0.5 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-[11px] font-bold uppercase tracking-wide">
                {profile.role}
              </span>
            </div>
            <p className="text-[13px] text-gray-400 font-medium">{profile.email}</p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-[14px] text-gray-600 leading-relaxed mb-4 max-w-xl">{profile.bio}</p>
          )}

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {profile.skills.map((skill, i) => (
                <span key={i} className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-[12px] font-semibold ring-1 ring-gray-100">
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-5 border-t border-gray-100">
            <div className="text-center sm:text-left">
              <p className="text-xl font-extrabold text-gray-900 tabular-nums">{scripts.length}</p>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Projects</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xl font-extrabold text-gray-900 tabular-nums">{profile.followers.length}</p>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Followers</p>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xl font-extrabold text-gray-900 tabular-nums">{profile.following.length}</p>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Following</p>
            </div>
            {memberSince && (
              <div className="hidden sm:block">
                <p className="text-[13px] font-bold text-gray-700">{memberSince}</p>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Joined</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100/60 rounded-xl p-1 w-fit">
        {[
          { key: "projects", label: "Projects", count: scripts.length },
          { key: "about", label: "About" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`relative px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold tabular-nums ${
                  activeTab === tab.key ? "bg-[#1e3a5f]/10 text-[#1e3a5f]" : "bg-gray-200/60 text-gray-400"
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "projects" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {scripts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-[15px] font-bold text-gray-700 mb-1">No projects yet</p>
              <p className="text-[13px] text-gray-400 max-w-xs mx-auto">
                {isOwnProfile ? "Upload your first script or project to get started" : "This user hasn't uploaded any projects yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {scripts.map((script, idx) => (
                <motion.div key={script._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}>
                  <ProjectCard project={script} userName={profile.name} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "about" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Bio Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h3 className="text-[13px] font-bold text-gray-900">About</h3>
            </div>
            <p className="text-[14px] text-gray-600 leading-relaxed">
              {profile.bio || <span className="text-gray-400 italic">No bio added yet</span>}
            </p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Role card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                <h3 className="text-[13px] font-bold text-gray-900">Role</h3>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-[13px] font-bold">
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
            </div>

            {/* Contact card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h3 className="text-[13px] font-bold text-gray-900">Contact</h3>
              </div>
              <p className="text-[13px] text-gray-600 font-medium">{profile.email}</p>
              {memberSince && (
                <p className="text-[12px] text-gray-400 font-medium mt-1.5">Member since {memberSince}</p>
              )}
            </div>
          </div>

          {/* Skills card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h3 className="text-[13px] font-bold text-gray-900">Skills & Expertise</h3>
            </div>
            {profile.skills?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-[13px] font-semibold ring-1 ring-gray-100">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-gray-400 italic">No skills added yet</p>
            )}
          </div>
        </motion.div>
      )}

      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedData) => { setProfile({ ...profile, ...updatedData }); setShowEditModal(false); }}
        />
      )}
    </div>
  );
};

export default Profile;
