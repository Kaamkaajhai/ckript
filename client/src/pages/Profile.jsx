import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import EditProfileModal from "../components/EditProfileModal";

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
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
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
        <div className="h-28 sm:h-36 lg:h-44 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <div className="px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 -mt-12 sm:-mt-10">
            {/* Avatar */}
            <img
              src={profile.profileImage || "https://via.placeholder.com/150"}
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  ) : (
                    <>
                      <button onClick={handleFollow}
                        className={[
                          "px-5 py-2 rounded-xl transition text-sm font-medium",
                          isFollowing ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-indigo-600 text-white hover:bg-indigo-700",
                        ].join(" ")}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                      <button className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Role */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100 mb-3">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
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
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
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
