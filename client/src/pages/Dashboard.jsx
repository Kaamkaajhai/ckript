import { useEffect, useState, useContext } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import api from "../services/api";
import PostCard from "../components/PostCard";
import { AuthContext } from "../context/AuthContext";

/* ─────────────────── Main Dashboard ─────────────────── */
const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/dashboard/stats");
      setStats(data.stats);
      setRecentPosts(data.recentPosts);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Fallback mock stats
      setStats({
        totalScripts: 12, totalPosts: 45, totalEarnings: 2450.0, followersCount: 230,
        followingCount: 80, totalLikes: 560, totalComments: 120, totalSaves: 78, totalViews: 3200,
        totalAuditions: 8, profileViews: 1200, totalInvestments: 5, portfolioValue: 15000,
        roi: 24, activeProjects: 3, teamMembers: 12, scriptsReviewed: 28, totalBudget: 85000,
        scriptsRead: 42, savedScripts: 15, totalReviews: 22,
      });
      setRecentPosts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const dashboards = {
    creator: CreatorDashboard,
    actor: ActorDashboard,
    investor: InvestorDashboard,
    producer: ProducerDashboard,
    reader: ReaderDashboard,
  };
  const RoleDash = dashboards[user?.role] || CreatorDashboard;

  return (
    <div className="max-w-6xl mx-auto">
      <RoleDash stats={stats} recentPosts={recentPosts} user={user} />
    </div>
  );
};

/* ─────────────────── Shared Components ─────────────────── */

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

const PageHeader = ({ emoji, title, subtitle, gradient }) => (
  <motion.div {...fadeUp} className="mb-6 sm:mb-8">
    <div className="flex items-center gap-3 mb-1">
      <span className="text-2xl sm:text-3xl">{emoji}</span>
      <h1 className={["text-xl sm:text-2xl lg:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r", gradient].join(" ")}>
        {title}
      </h1>
    </div>
    <p className="text-gray-500 text-sm sm:text-base ml-11 sm:ml-12">{subtitle}</p>
  </motion.div>
);

const StatCard = ({ label, value, icon, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay }}
    className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-center justify-between mb-3">
      <div className={["w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xl sm:text-2xl", color].join(" ")}>
        {icon}
      </div>
    </div>
    <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium">{label}</p>
  </motion.div>
);

const ActionCard = ({ title, description, icon, action, to = "#", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <Link
      to={to}
      className="block bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 shadow-md shadow-indigo-200/50">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{title}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-2">{description}</p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 mt-2 group-hover:gap-2 transition-all">
            {action}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </span>
        </div>
      </div>
    </Link>
  </motion.div>
);

const MiniStat = ({ label, value, icon }) => (
  <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3">
    <span className="text-lg">{icon}</span>
    <div>
      <p className="text-sm sm:text-base font-bold text-gray-900">{value}</p>
      <p className="text-[11px] sm:text-xs text-gray-500">{label}</p>
    </div>
  </div>
);

const RecentPosts = ({ posts }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 sm:mt-10">
    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
    {posts.length === 0 ? (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-12 text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium">No posts yet</p>
        <p className="text-sm text-gray-400 mt-1">Your activity will appear here</p>
      </div>
    ) : (
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>
    )}
  </motion.div>
);

/* ─────────────────── Creator Dashboard ─────────────────── */
const CreatorDashboard = ({ stats, recentPosts, user }) => (
  <>
    <PageHeader emoji="✍️" title="Creator Studio" subtitle="Manage your scripts and track your creative impact" gradient="from-blue-600 to-indigo-600" />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <StatCard label="Scripts" value={stats?.totalScripts ?? 0} icon="🎬" color="bg-blue-50" delay={0} />
      <StatCard label="Posts" value={stats?.totalPosts ?? 0} icon="📝" color="bg-purple-50" delay={0.05} />
      <StatCard label="Earnings" value={`$${(stats?.totalEarnings ?? 0).toLocaleString()}`} icon="💰" color="bg-green-50" delay={0.1} />
      <StatCard label="Followers" value={stats?.followersCount ?? 0} icon="👥" color="bg-indigo-50" delay={0.15} />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
      <MiniStat label="Likes" value={stats?.totalLikes ?? 0} icon="❤️" />
      <MiniStat label="Comments" value={stats?.totalComments ?? 0} icon="💬" />
      <MiniStat label="Saves" value={stats?.totalSaves ?? 0} icon="🔖" />
      <MiniStat label="Views" value={stats?.totalViews ?? 0} icon="👁️" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
      <ActionCard title="Upload New Script" description="Share your latest creative work" icon="📤" action="Upload" to="/upload" delay={0.1} />
      <ActionCard title="Create Post" description="Share updates with your followers" icon="✏️" action="Post" to="/feed" delay={0.15} />
    </div>

    <RecentPosts posts={recentPosts} />
  </>
);

/* ─────────────────── Actor Dashboard ─────────────────── */
const ActorDashboard = ({ stats, recentPosts, user }) => (
  <>
    <PageHeader emoji="🎭" title="Actor Hub" subtitle="Discover opportunities and showcase your talent" gradient="from-pink-600 to-rose-600" />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <StatCard label="Auditions" value={stats?.totalAuditions ?? 0} icon="🎭" color="bg-pink-50" delay={0} />
      <StatCard label="Profile Views" value={stats?.profileViews ?? 0} icon="👁️" color="bg-purple-50" delay={0.05} />
      <StatCard label="Followers" value={stats?.followersCount ?? 0} icon="👥" color="bg-indigo-50" delay={0.1} />
      <StatCard label="Posts" value={stats?.totalPosts ?? 0} icon="📝" color="bg-blue-50" delay={0.15} />
    </div>

    {/* Audition Progress */}
    <motion.div {...fadeUp} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
      <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Audition Pipeline</h3>
      <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
        <div className="bg-yellow-50 rounded-xl p-3 sm:p-4">
          <p className="text-lg sm:text-2xl font-bold text-yellow-700">{Math.ceil((stats?.totalAuditions ?? 0) * 0.4)}</p>
          <p className="text-[11px] sm:text-xs text-yellow-600 font-medium mt-1">Applied</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 sm:p-4">
          <p className="text-lg sm:text-2xl font-bold text-blue-700">{Math.ceil((stats?.totalAuditions ?? 0) * 0.3)}</p>
          <p className="text-[11px] sm:text-xs text-blue-600 font-medium mt-1">In Review</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 sm:p-4">
          <p className="text-lg sm:text-2xl font-bold text-green-700">{Math.ceil((stats?.totalAuditions ?? 0) * 0.3)}</p>
          <p className="text-[11px] sm:text-xs text-green-600 font-medium mt-1">Callbacks</p>
        </div>
      </div>
    </motion.div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
      <ActionCard title="Browse Roles" description="Find open casting calls" icon="🎬" action="View Roles" to="/search" delay={0.1} />
      <ActionCard title="Update Portfolio" description="Showcase your best work" icon="📸" action="Edit Profile" to={`/profile/${user?._id}`} delay={0.15} />
    </div>

    <RecentPosts posts={recentPosts} />
  </>
);

/* ─────────────────── Investor Dashboard ─────────────────── */
const InvestorDashboard = ({ stats, recentPosts, user }) => (
  <>
    <PageHeader emoji="📈" title="Investment Hub" subtitle="Track investments and discover new opportunities" gradient="from-emerald-600 to-teal-600" />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <StatCard label="Investments" value={stats?.totalInvestments ?? 0} icon="💼" color="bg-emerald-50" delay={0} />
      <StatCard label="Portfolio Value" value={`$${(stats?.portfolioValue ?? 0).toLocaleString()}`} icon="📊" color="bg-green-50" delay={0.05} />
      <StatCard label="ROI" value={`${stats?.roi ?? 0}%`} icon="💹" color="bg-yellow-50" delay={0.1} />
      <StatCard label="Active Projects" value={stats?.activeProjects ?? 0} icon="🎬" color="bg-blue-50" delay={0.15} />
    </div>

    {/* Portfolio Breakdown */}
    <motion.div {...fadeUp} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
      <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Portfolio Overview</h3>
      <div className="space-y-3">
        {[
          { label: "Scripts", pct: 45, color: "bg-indigo-500" },
          { label: "Productions", pct: 35, color: "bg-purple-500" },
          { label: "Talent", pct: 20, color: "bg-pink-500" },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs sm:text-sm mb-1">
              <span className="text-gray-600 font-medium">{item.label}</span>
              <span className="text-gray-900 font-semibold">{item.pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.pct}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={`h-full rounded-full ${item.color}`}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
      <ActionCard title="Browse Scripts" description="Discover investment opportunities" icon="📄" action="Explore" to="/search" delay={0.1} />
      <ActionCard title="My Portfolio" description="Track your investments" icon="💰" action="View" to="/dashboard" delay={0.15} />
      <ActionCard title="Market Trends" description="Industry insights & analytics" icon="📊" action="Analyze" to="/search" delay={0.2} />
    </div>

    <RecentPosts posts={recentPosts} />
  </>
);

/* ─────────────────── Producer Dashboard ─────────────────── */
const ProducerDashboard = ({ stats, recentPosts, user }) => (
  <>
    <PageHeader emoji="🎥" title="Production Deck" subtitle="Manage productions and collaborate with talent" gradient="from-orange-600 to-amber-600" />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <StatCard label="Active Projects" value={stats?.activeProjects ?? 0} icon="🎬" color="bg-orange-50" delay={0} />
      <StatCard label="Team Members" value={stats?.teamMembers ?? 0} icon="👥" color="bg-purple-50" delay={0.05} />
      <StatCard label="Scripts Reviewed" value={stats?.scriptsReviewed ?? 0} icon="📄" color="bg-blue-50" delay={0.1} />
      <StatCard label="Budget" value={`$${(stats?.totalBudget ?? 0).toLocaleString()}`} icon="💰" color="bg-green-50" delay={0.15} />
    </div>

    {/* Project Timeline */}
    <motion.div {...fadeUp} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
      <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Project Status</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pre-Production", count: 1, emoji: "📋", bg: "bg-yellow-50 text-yellow-700" },
          { label: "In Production", count: 1, emoji: "🎥", bg: "bg-blue-50 text-blue-700" },
          { label: "Post-Production", count: 1, emoji: "🎞️", bg: "bg-purple-50 text-purple-700" },
          { label: "Completed", count: 2, emoji: "✅", bg: "bg-green-50 text-green-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.bg}`}>
            <span className="text-xl">{s.emoji}</span>
            <p className="text-lg sm:text-xl font-bold mt-1">{s.count}</p>
            <p className="text-[10px] sm:text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </motion.div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
      <ActionCard title="Find Scripts" description="Browse production-ready scripts" icon="🎬" action="Browse" to="/search" delay={0.1} />
      <ActionCard title="Hire Talent" description="Connect with actors and crew" icon="🎭" action="Find" to="/search" delay={0.15} />
    </div>

    <RecentPosts posts={recentPosts} />
  </>
);

/* ─────────────────── Reader Dashboard ─────────────────── */
const ReaderDashboard = ({ stats, recentPosts, user }) => (
  <>
    <PageHeader emoji="📚" title="Reading Room" subtitle="Explore and engage with creative content" gradient="from-violet-600 to-indigo-600" />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <StatCard label="Scripts Read" value={stats?.scriptsRead ?? 0} icon="📖" color="bg-violet-50" delay={0} />
      <StatCard label="Saved" value={stats?.savedScripts ?? 0} icon="🔖" color="bg-purple-50" delay={0.05} />
      <StatCard label="Following" value={stats?.followingCount ?? 0} icon="👥" color="bg-blue-50" delay={0.1} />
      <StatCard label="Reviews" value={stats?.totalReviews ?? 0} icon="⭐" color="bg-yellow-50" delay={0.15} />
    </div>

    {/* Reading Streak */}
    <motion.div {...fadeUp} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">This Week</h3>
      <div className="flex items-center gap-2 sm:gap-3">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
          <div key={i} className="flex-1 text-center">
            <div className={[
              "w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-lg flex items-center justify-center text-sm sm:text-base font-semibold",
              i < 4 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400",
            ].join(" ")}>
              {i < 4 ? "✓" : ""}
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{day}</p>
          </div>
        ))}
      </div>
      <p className="text-xs sm:text-sm text-gray-500 mt-3">🔥 4 day reading streak!</p>
    </motion.div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
      <ActionCard title="Discover Scripts" description="Find your next favorite read" icon="📖" action="Browse" to="/search" delay={0.1} />
      <ActionCard title="My Library" description="Your saved scripts" icon="📚" action="View" to="/search" delay={0.15} />
      <ActionCard title="For You" description="Personalized recommendations" icon="✨" action="Explore" to="/search" delay={0.2} />
    </div>

    <RecentPosts posts={recentPosts} />
  </>
);

export default Dashboard;
