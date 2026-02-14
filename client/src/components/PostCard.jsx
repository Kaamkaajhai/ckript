import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState } from "react";

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
            src={post.user.profileImage || "https://via.placeholder.com/40"} 
            alt={post.user.name} 
            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" 
          />
          <div>
            <h3 className="font-semibold text-gray-900">{post.user.name}</h3>
            <p className="text-xs text-gray-500 capitalize">{post.user.role}</p>
          </div>
        </Link>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
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
              {liked ? (
                <svg className="w-6 h-6 text-red-500 fill-current" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{post.likes?.length || 0}</span>
            </button>

            {/* Comment Button */}
            <button className="flex items-center gap-2 text-gray-700 hover:text-blue-500 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-medium">{post.comments?.length || 0}</span>
            </button>

            {/* Share Button */}
            <button className="text-gray-700 hover:text-green-500 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>

          {/* Save Button */}
          <button 
            onClick={() => setSaved(!saved)}
            className="text-gray-700 hover:text-indigo-500 transition"
          >
            {saved ? (
              <svg className="w-6 h-6 text-indigo-500 fill-current" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
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
