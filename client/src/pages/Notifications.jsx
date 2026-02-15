import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const typeIcons = {
  smart_match: "🎯",
  audition: "🎭",
  hold: "🔒",
  hold_expiring: "⏰",
  profile_view: "👁️",
  script_score: "📊",
  trailer_ready: "🎬",
  like: "❤️",
  comment: "💬",
  follow: "👤",
  unlock: "🔓",
};

const typeLabels = {
  smart_match: "Smart Match",
  audition: "Audition Update",
  hold: "Script Hold",
  hold_expiring: "Hold Expiring",
  profile_view: "Profile View",
  script_score: "Script Score",
  trailer_ready: "Trailer Ready",
  like: "Like",
  comment: "Comment",
  follow: "Follow",
  unlock: "Script Unlock",
};

const typeBg = {
  smart_match: "bg-[#edf2f7] border-[#c3d5e8]",
  audition: "bg-[#edf2f7] border-[#c3d5e8]",
  hold: "bg-[#edf2f7] border-[#c3d5e8]",
  hold_expiring: "bg-red-50 border-red-200",
  profile_view: "bg-blue-50 border-blue-200",
  script_score: "bg-[#edf2f7] border-[#c3d5e8]",
  trailer_ready: "bg-[#edf2f7] border-[#c3d5e8]",
  like: "bg-rose-50 border-rose-200",
  comment: "bg-green-50 border-green-200",
  follow: "bg-[#edf2f7] border-[#c3d5e8]",
  unlock: "bg-[#edf2f7] border-[#c3d5e8]",
};

const Notifications = () => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/match/notifications");
      setNotifications(data);
    } catch (error) {
      // Demo data
      setNotifications([
        {
          _id: "n1", type: "smart_match", message: "New script match: 'The Last Detective' — 92% match score!",
          matchScore: 92, script: { _id: "s1", title: "The Last Detective" }, read: false, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          _id: "n2", type: "trailer_ready", message: "AI trailer for 'Neon Dreams' is ready to preview",
          script: { _id: "s2", title: "Neon Dreams" }, read: false, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          _id: "n3", type: "audition", message: "Your audition for 'Det. Marcus Cole' has been shortlisted!",
          script: { _id: "s1", title: "The Last Detective" }, read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          _id: "n4", type: "hold", message: "Producer John placed a $200 hold on your script",
          from: { _id: "u1", name: "John Producer" }, script: { _id: "s3", title: "Echoes of Tomorrow" }, read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
        {
          _id: "n5", type: "profile_view", message: "A director from Netflix viewed your profile",
          from: { _id: "u2", name: "Netflix Director" }, read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        },
        {
          _id: "n6", type: "script_score", message: "Your Script Score for 'Echoes of Tomorrow' is ready: 87/100",
          script: { _id: "s3", title: "Echoes of Tomorrow" }, read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/match/notifications/read");
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const filterTypes = [
    { id: "all", label: "All" },
    { id: "smart_match", label: "🎯 Matches" },
    { id: "audition", label: "🎭 Auditions" },
    { id: "hold", label: "🔒 Holds" },
    { id: "trailer_ready", label: "🎬 Trailers" },
    { id: "script_score", label: "📊 Scores" },
  ];

  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <span className="text-3xl">🔔</span> Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-[#0f2544] font-medium mt-1">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="px-4 py-2 bg-[#edf2f7] text-[#0f2544] rounded-xl text-sm font-medium hover:bg-[#c3d5e8] transition">
              Mark all read
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-5 overflow-x-auto pb-1">
          {filterTypes.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                filter === f.id ? "bg-[#0f2544] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{f.label}</button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-3 border-[#c3d5e8] border-t-[#0f2544] rounded-full animate-spin"></div>
          </div>
        )}

        {/* Notification list */}
        {!loading && (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <span className="text-5xl mb-4 block">🔔</span>
                <p className="text-base font-semibold text-gray-700">No notifications</p>
                <p className="text-sm text-gray-500">You're all caught up!</p>
              </div>
            ) : (
              filtered.map((notif, idx) => (
                <motion.div key={notif._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`rounded-2xl border p-4 transition ${typeBg[notif.type] || "bg-white border-gray-100"} ${
                    !notif.read ? "ring-2 ring-[#c3d5e8] shadow-sm" : ""
                  }`}>
                  <div className="flex gap-3">
                    <span className="text-2xl shrink-0">{typeIcons[notif.type] || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {typeLabels[notif.type] || notif.type}
                        </span>
                        {!notif.read && <span className="w-2 h-2 rounded-full bg-[#0f2544]"></span>}
                        {notif.matchScore && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">{notif.matchScore}% match</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 font-medium">{notif.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400">{timeAgo(notif.createdAt)}</span>
                        {notif.script && (
                          <Link to={`/script/${notif.script._id}`}
                            className="text-xs text-[#0f2544] hover:underline font-medium">View Script →</Link>
                        )}
                        {notif.from && (
                          <Link to={`/profile/${notif.from._id}`}
                            className="text-xs text-[#0f2544] hover:underline font-medium">View Profile →</Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Notifications;
