import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark, MoreVertical } from "lucide-react";

const PostCard = ({ post }) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${post.user._id}`} className="flex items-center gap-3 hover:opacity-80 transition">
          <img 
            src={post.user.profileImage || "https://placehold.co/40x40/e2e8f0/64748b?text=U"} 
            alt={post.user.name} 
            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" 
          />
          <div>
            <h3 className="font-semibold text-gray-900">{post.user.name}</h3>
            <p className="text-xs text-gray-500 capitalize">{post.user.role}</p>
          </div>
        </Link>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Post Image/Video */}
      {post.image && (
        <div className="w-full">
          <img 
            src={post.image} 
            alt="post content" 
            className="w-full object-cover"
            style={{ maxHeight: '600px' }}
          />
        </div>
      )}
      {post.video && (
        <div className="w-full">
          <video 
            src={post.video} 
            controls 
            className="w-full"
            style={{ maxHeight: '600px' }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <button 
              onClick={() => setLiked(!liked)}
              className="flex items-center gap-2 text-gray-700 hover:text-red-500 transition"
            >
              <Heart size={22} className={liked ? "text-red-500 fill-red-500" : ""} />
              <span className="text-sm font-medium">{post.likes?.length || 0}</span>
            </button>

            {/* Comment Button */}
            <button className="flex items-center gap-2 text-gray-700 hover:text-blue-500 transition">
              <MessageCircle size={22} />
              <span className="text-sm font-medium">{post.comments?.length || 0}</span>
            </button>

            {/* Share Button */}
            <button className="text-gray-700 hover:text-green-500 transition">
              <Share2 size={22} />
            </button>
          </div>

          {/* Save Button */}
          <button 
            onClick={() => setSaved(!saved)}
            className="text-gray-700 hover:text-[#1a365d] transition"
          >
            <Bookmark size={22} className={saved ? "text-[#1a365d] fill-[#1a365d]" : ""} />
          </button>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-gray-500">
          {new Date(post.createdAt).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
      </div>
    </motion.div>
  );
};

export default PostCard;
