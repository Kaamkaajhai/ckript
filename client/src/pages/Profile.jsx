import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import ProjectCard from "../components/ProjectCard";
import EditProfileModal from "../components/EditProfileModal";

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/users/${id || currentUser._id}`);
      setProfile(data.user);
      setPosts(data.posts);
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="bg-white rounded-xl border border-gray-200/80 overflow-hidden mb-5"
      >
        {/* Cover gradient */}
        <div className="h-32 sm:h-40 bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#2a5180] relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTAgMjBoNDBNMjAgMHYyMCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iMC4wNCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+')] opacity-40"></div>
        </div>

        <div className="px-5 sm:px-7 pb-6">
          {/* Avatar + action row */}
          <div className="flex items-end justify-between -mt-14 mb-5">
            <div className="relative">
              {profile.profileImage ? (
                <img src={resolveImage(profile.profileImage)} alt={profile.name}
                  className="w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-full object-cover border-[3px] border-white ring-1 ring-gray-200/60" />
              ) : (
                <div className="w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-full border-[3px] border-white ring-1 ring-gray-200/60 bg-[#1e3a5f]/10 flex items-center justify-center">
                  <span className="text-[32px] sm:text-[36px] font-bold text-[#1e3a5f]">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pb-1">
              {isOwnProfile ? (
                <button onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-[13px] font-semibold flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  Edit Profile
                </button>
              ) : (
                <>
                  <button onClick={handleFollow}
                    className={`px-5 py-2 rounded-lg transition-all text-[13px] font-semibold ${
                      isFollowing
                        ? "bg-white text-gray-600 border border-gray-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50"
                        : "bg-[#1e3a5f] text-white hover:bg-[#162d4a]"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name + details */}
          <div className="mb-4">
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{profile.name}</h1>
              <span className="px-2 py-0.5 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded text-[11px] font-bold uppercase tracking-wide">
                {profile.role}
              </span>
            </div>
            <p className="text-sm text-gray-400 font-medium">{profile.email}</p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-[14px] text-gray-600 leading-relaxed mb-4 max-w-xl">{profile.bio}</p>
          )}

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {profile.skills.map((skill, i) => (
                <span key={i} className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-md text-xs font-semibold border border-gray-100">
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Stats bar */}
          <div className="flex items-center gap-0 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5 pr-6">
              <span className="text-lg font-bold text-gray-900">{posts.length}</span>
              <span className="text-xs text-gray-400 font-medium">Posts</span>
            </div>
            <div className="w-px h-4 bg-gray-200"></div>
            <div className="flex items-center gap-1.5 px-6">
              <span className="text-lg font-bold text-gray-900">{scripts.length}</span>
              <span className="text-xs text-gray-400 font-medium">Projects</span>
            </div>
            <div className="w-px h-4 bg-gray-200"></div>
            <div className="flex items-center gap-1.5 px-6">
              <span className="text-lg font-bold text-gray-900">{profile.followers.length}</span>
              <span className="text-xs text-gray-400 font-medium">Followers</span>
            </div>
            <div className="w-px h-4 bg-gray-200"></div>
            <div className="flex items-center gap-1.5 px-6">
              <span className="text-lg font-bold text-gray-900">{profile.following.length}</span>
              <span className="text-xs text-gray-400 font-medium">Following</span>
            </div>
            {memberSince && (
              <>
                <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>
                <div className="hidden sm:flex items-center gap-1.5 pl-6 text-xs text-gray-400 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  Joined {memberSince}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-0 mb-5 border-b border-gray-200">
        {[
          { key: "posts", label: "Posts", count: posts.length },
          { key: "projects", label: "Projects", count: scripts.length },
          { key: "about", label: "About" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-[13px] font-semibold transition-colors ${
              activeTab === tab.key
                ? "text-[#1e3a5f]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? "bg-[#1e3a5f]/10 text-[#1e3a5f]" : "bg-gray-100 text-gray-400"
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
            {activeTab === tab.key && (
              <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1e3a5f] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "posts" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          {posts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200/80 py-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">No posts yet</p>
              <p className="text-xs text-gray-400 mt-1">
                {isOwnProfile ? "Share your first post with the community" : "This user hasn't posted anything yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => <PostCard key={post._id} post={post} />)}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "projects" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          {scripts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200/80 py-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m1.5 3.75c.621 0 1.125-.504 1.125-1.125v-1.5" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">No projects yet</p>
              <p className="text-xs text-gray-400 mt-1">
                {isOwnProfile ? "Upload your first script or project" : "This user hasn't uploaded any projects yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {scripts.map((script) => (
                <ProjectCard key={script._id} project={script} userName={profile.name} />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "about" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
          className="bg-white rounded-xl border border-gray-200/80 divide-y divide-gray-100"
        >
          {/* Bio */}
          <div className="p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bio</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {profile.bio || <span className="text-gray-400 italic">No bio added yet</span>}
            </p>
          </div>

          {/* Role */}
          <div className="p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Role</h3>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f]/[0.06] text-[#1e3a5f] rounded-lg text-sm font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
            </span>
          </div>

          {/* Skills */}
          <div className="p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Skills</h3>
            {profile.skills?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-sm font-semibold border border-gray-100">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No skills added yet</p>
            )}
          </div>

          {/* Contact */}
          <div className="p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              {profile.email}
            </div>
            {memberSince && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Member since {memberSince}
              </div>
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
