import { useEffect, useState } from "react";
import api from "../services/api";
import PostCard from "../components/PostCard";
import CreatePostModal from "../components/CreatePostModal";
import { motion } from "framer-motion";
import { Plus, FileText } from "lucide-react";

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/posts/feed");
      setPosts(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost) => { setPosts([newPost, ...posts]); };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-3 border-[#c3d5e8] border-t-[#0f2544] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl lg:max-w-2xl mx-auto">
      {/* Create Post */}
      <motion.button
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setShowCreateModal(true)}
        className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-5 text-left hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#0f2544] to-[#1a365d] rounded-full flex items-center justify-center flex-shrink-0">
            <Plus size={20} className="text-white" />
          </div>
          <span className="text-sm text-gray-500 font-medium">Start a post...</span>
        </div>
      </motion.button>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 sm:p-14 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText size={32} className="text-gray-400" strokeWidth={1.5} />
          </div>
          <p className="text-base font-semibold text-gray-800 mb-1">No posts yet</p>
          <p className="text-sm text-gray-500">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
};

export default Feed;
