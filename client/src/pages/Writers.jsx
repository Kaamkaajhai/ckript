import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../services/api";

const Writers = () => {
  const [writers, setWriters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("reputation");

  useEffect(() => {
    fetchWriters();
  }, [sortBy]);

  const fetchWriters = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/users/writers?sort=${sortBy}`);
      setWriters(data);
    } catch {
      setWriters([]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-[2.5px] border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin"></div>
      </div>
    );
  }

  const medalColors = [
    { bg: "bg-amber-50", border: "border-amber-200/60", text: "text-amber-600" },
    { bg: "bg-gray-50", border: "border-gray-200/60", text: "text-gray-500" },
    { bg: "bg-orange-50", border: "border-orange-200/60", text: "text-orange-600" },
  ];

  const sortTabs = [
    { key: "reputation", label: "Reputation", icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" },
    { key: "score", label: "AI Score", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" },
    { key: "views", label: "Views", icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    { key: "followers", label: "Followers", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" },
  ];

  const getGenreColor = (genre) => {
    const colors = {
      "Drama": "bg-blue-50 text-blue-600",
      "Comedy": "bg-amber-50 text-amber-600",
      "Thriller": "bg-red-50 text-red-600",
      "Horror": "bg-purple-50 text-purple-600",
      "Sci-Fi": "bg-cyan-50 text-cyan-600",
      "Action": "bg-orange-50 text-orange-600",
      "Romance": "bg-pink-50 text-pink-600",
      "Fantasy": "bg-violet-50 text-violet-600",
      "Documentary": "bg-teal-50 text-teal-600",
      "Animation": "bg-emerald-50 text-emerald-600",
    };
    return colors[genre] || "bg-gray-50 text-gray-600";
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/[0.06] flex items-center justify-center">
                <svg className="w-[18px] h-[18px] text-[#1e3a5f]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Writers</h1>
            </div>
            <p className="text-[13px] text-gray-400 font-medium ml-[46px]">
              {sortBy === "reputation" ? "Ranked by overall reputation" :
               sortBy === "score" ? "Ranked by average AI script score" :
               sortBy === "views" ? "Ranked by total script views" :
               "Ranked by follower count"}
            </p>
          </div>

          {/* Sort toggle */}
          <div className="flex items-center gap-1 bg-gray-100/60 rounded-xl p-1">
            {sortTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSortBy(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all duration-200 ${
                  sortBy === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {writers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </div>
          <p className="text-[15px] font-bold text-gray-700 mb-1">No writers found</p>
          <p className="text-[13px] text-gray-400">Check back later for registered writers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {writers.map((writer, index) => {
            const medal = index < 3 ? medalColors[index] : null;
            const isTop3 = index < 3;
            const genres = writer.writerProfile?.genres || [];
            const isWGA = writer.writerProfile?.wgaMember;
            const representation = writer.writerProfile?.representationStatus;

            return (
              <motion.div key={writer._id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.25 }}
              >
                <Link
                  to={`/profile/${writer._id}`}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-200 group ${
                    isTop3
                      ? "bg-white border-gray-100 shadow-sm hover:shadow-md"
                      : "bg-white border-gray-100/80 hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  {/* Rank badge */}
                  {isTop3 ? (
                    <div className={`w-9 h-9 rounded-xl ${medal.bg} ${medal.text} border ${medal.border} flex items-center justify-center shrink-0`}>
                      <span className="text-[14px] font-extrabold">{index + 1}</span>
                    </div>
                  ) : (
                    <div className="w-9 h-9 flex items-center justify-center shrink-0">
                      <span className="text-[14px] font-bold text-gray-300 tabular-nums">{index + 1}</span>
                    </div>
                  )}

                  {/* Avatar */}
                  {writer.profileImage ? (
                    <img
                      src={writer.profileImage.startsWith("http") ? writer.profileImage : `${import.meta.env.VITE_API_URL || "http://localhost:5001"}${writer.profileImage}`}
                      alt={writer.name}
                      className="w-11 h-11 rounded-full object-cover bg-gray-100 shrink-0 ring-2 ring-gray-100"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center shrink-0 ring-2 ring-gray-100">
                      <span className="text-white font-bold text-[14px]">{writer.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-bold text-gray-900 truncate group-hover:text-[#1e3a5f] transition-colors">
                        {writer.name}
                      </h3>
                      {isWGA && (
                        <span className="text-[10px] font-bold bg-[#1e3a5f]/[0.08] text-[#1e3a5f] px-1.5 py-0.5 rounded-md shrink-0">
                          WGA
                        </span>
                      )}
                      {representation && representation !== "unrepresented" && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md shrink-0">
                          Repped
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
                      {genres.length > 0 ? (
                        <div className="flex items-center gap-1 overflow-hidden">
                          {genres.slice(0, 3).map((g) => (
                            <span key={g} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getGenreColor(g)} shrink-0`}>
                              {g}
                            </span>
                          ))}
                          {genres.length > 3 && (
                            <span className="text-[10px] text-gray-400 font-medium shrink-0">+{genres.length - 3}</span>
                          )}
                        </div>
                      ) : writer.bio ? (
                        <span className="text-[12px] text-gray-400 font-medium truncate">{writer.bio}</span>
                      ) : (
                        <span className="text-[12px] text-gray-400 font-medium">Writer</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 sm:gap-5 shrink-0">
                    {/* Scripts count */}
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1.5 justify-end">
                        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <p className="text-[14px] font-extrabold text-gray-900 tabular-nums">{writer.scriptCount || 0}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">Scripts</p>
                    </div>

                    {/* Primary sort metric */}
                    {sortBy === "score" && (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <svg className={`w-3.5 h-3.5 ${(writer.avgScore || 0) >= 80 ? "text-emerald-400" : (writer.avgScore || 0) >= 60 ? "text-amber-400" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                          <p className={`text-[14px] font-extrabold tabular-nums ${
                            (writer.avgScore || 0) >= 80 ? "text-emerald-600" : (writer.avgScore || 0) >= 60 ? "text-amber-600" : "text-gray-900"
                          }`}>{Math.round(writer.avgScore || 0)}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">Avg Score</p>
                      </div>
                    )}

                    {sortBy === "views" && (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="text-[14px] font-extrabold text-gray-900 tabular-nums">{(writer.totalViews || 0).toLocaleString()}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">Views</p>
                      </div>
                    )}

                    {sortBy === "followers" && (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                          </svg>
                          <p className="text-[14px] font-extrabold text-gray-900 tabular-nums">{(writer.followerCount || 0).toLocaleString()}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">Followers</p>
                      </div>
                    )}

                    {sortBy === "reputation" && (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <svg className={`w-3.5 h-3.5 ${(writer.reputation || 0) >= 40 ? "text-violet-400" : (writer.reputation || 0) >= 20 ? "text-blue-400" : "text-gray-300"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172" />
                          </svg>
                          <p className={`text-[14px] font-extrabold tabular-nums ${
                            (writer.reputation || 0) >= 40 ? "text-violet-600" : (writer.reputation || 0) >= 20 ? "text-blue-600" : "text-gray-900"
                          }`}>{Math.round(writer.reputation || 0)}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">Rep</p>
                      </div>
                    )}

                    {/* Unlocks - secondary */}
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1.5 justify-end">
                        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <p className="text-[13px] font-bold text-gray-500 tabular-nums">{writer.totalUnlocks || 0}</p>
                      </div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">Unlocks</p>
                    </div>

                    {/* Arrow */}
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Writers;
