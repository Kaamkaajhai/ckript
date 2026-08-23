import { Link } from "react-router-dom";
import { useDarkMode } from "../context/DarkModeContext";
import {
  INCOMING_FOLLOW_REQUEST_STATUS,
  useIncomingFollowRequests,
} from "./profile/useIncomingFollowRequests";

export default function FollowRequests() {
  const { isDarkMode } = useDarkMode();
  const { requests, status, error, actingId, reload, decide } = useIncomingFollowRequests();

  const cardCls = isDarkMode
    ? "bg-[#0d1520] border-white/[0.06]"
    : "bg-white border-gray-200 shadow-sm";
  const textPrimary = isDarkMode ? "text-white" : "text-gray-900";
  const textSecondary = isDarkMode ? "text-[#b0c0d0]" : "text-gray-600";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className={`text-xl font-bold ${textPrimary}`}>Follow requests</h1>
        <p className={`text-sm mt-1 ${textSecondary}`}>
          Review people who want to follow your private profile.
        </p>
      </div>

      {error && (
        <div className={`mb-4 px-3 py-2 rounded-lg text-sm ${
          isDarkMode ? "bg-red-500/10 text-red-300 border border-red-500/20" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          <span>{error}</span>
          {status === INCOMING_FOLLOW_REQUEST_STATUS.FAILED ? (
            <button type="button" onClick={reload} className="ml-2 font-bold underline">Try again</button>
          ) : null}
        </div>
      )}

      {status === INCOMING_FOLLOW_REQUEST_STATUS.LOADING ? (
        <div className="flex justify-center items-center py-16">
          <div className={`w-6 h-6 border-2 rounded-full animate-spin ${
            isDarkMode ? "border-white/10 border-t-white/50" : "border-gray-200 border-t-[#1e3a5f]"
          }`} />
        </div>
      ) : status === INCOMING_FOLLOW_REQUEST_STATUS.FAILED ? null : requests.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center ${cardCls}`}>
          <p className={`text-sm font-semibold ${textSecondary}`}>No pending follow requests.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((req) => {
            const u = req.from || {};
            const initials = String(u.name || "?").trim().slice(0, 1).toUpperCase();
            const username = u?.writerProfile?.username;
            const profilePath = username ? `/profile/${username}` : `/profile/${u._id}`;
            return (
              <div key={req._id || u._id} className={`flex items-center gap-3 rounded-2xl border p-3 ${cardCls}`}>
                <Link to={profilePath} className="shrink-0">
                  {u.profileImage ? (
                    <img src={u.profileImage} alt={u.name} className="w-11 h-11 rounded-xl object-cover" />
                  ) : (
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold ${
                      isDarkMode ? "bg-[#0d1520] text-[#c3d2e6] ring-1 ring-[#1c2a3a]" : "bg-gray-100 text-gray-700"
                    }`}>
                      {initials}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={profilePath} className={`text-sm font-semibold truncate ${textPrimary}`}>
                    {u.name || "Unknown user"}
                  </Link>
                  {u.bio && (
                    <p className={`text-xs mt-0.5 line-clamp-1 ${textSecondary}`}>{u.bio}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => decide(u._id, "accept")}
                    disabled={actingId === u._id}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors disabled:opacity-60 ${
                      isDarkMode ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-[#1e3a5f] text-white hover:bg-[#152a47]"
                    }`}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => decide(u._id, "reject")}
                    disabled={actingId === u._id}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors disabled:opacity-60 ${
                      isDarkMode ? "border-white/15 text-[#b0c0d0] hover:bg-white/[0.05]" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
