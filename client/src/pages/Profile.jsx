import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import EditProfileModal from "../components/EditProfileModal";
import { Pencil, MessageCircle, Briefcase, LayoutGrid } from "lucide-react";

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/users/${id || currentUser._id}`);
      setProfile(data.user);
      setPosts(data.posts);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-3 border-[#c3d5e8] border-t-[#0f2544] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return <div className="flex justify-center items-center h-[60vh]"><p className="text-gray-500">User not found</p></div>;
  }

  return (
    <div className="max-w-3xl lg:max-w-4xl mx-auto">
      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6"
      >
        {/* Cover */}
        <div className="h-28 sm:h-36 lg:h-44 bg-gradient-to-r from-[#0f2544] via-[#1a365d] to-[#0a1628]"></div>

        <div className="px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 -mt-12 sm:-mt-10">
            {/* Avatar */}
            <img
              src={profile.profileImage || "https://placehold.co/150x150/e2e8f0/64748b?text=User"}
              alt={profile.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-lg flex-shrink-0"
            />

            {/* Info */}
            <div className="flex-1 w-full pt-2 sm:pt-14">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{profile.name}</h1>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                </div>
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <button onClick={() => setShowEditModal(true)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium flex items-center gap-1.5"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>
                  ) : (
                    <>
                      <button onClick={handleFollow}
                        className={[
                          "px-5 py-2 rounded-xl transition text-sm font-medium",
                          isFollowing ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-[#0f2544] text-white hover:bg-[#1a365d]",
                        ].join(" ")}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                      <button className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition">
                        <MessageCircle size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Role */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#edf2f7] to-[#f0f4f8] text-[#0f2544] rounded-full text-xs font-semibold border border-[#c3d5e8] mb-3">
                <Briefcase size={14} />
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>

              {/* Stats */}
              <div className="flex gap-6 py-3 border-t border-gray-100">
                <div><p className="text-lg font-bold text-gray-900">{posts.length}</p><p className="text-xs text-gray-500">Posts</p></div>
                <div><p className="text-lg font-bold text-gray-900">{profile.followers.length}</p><p className="text-xs text-gray-500">Followers</p></div>
                <div><p className="text-lg font-bold text-gray-900">{profile.following.length}</p><p className="text-xs text-gray-500">Following</p></div>
              </div>

              {profile.bio && <p className="text-sm text-gray-700 leading-relaxed mt-2">{profile.bio}</p>}

              {profile.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {profile.skills.map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">{skill}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Posts */}
      <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
        <LayoutGrid size={20} className="text-gray-600" />
        Posts
      </h2>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-500">No posts yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => <PostCard key={post._id} post={post} />)}
        </div>
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
