import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Search, Lock } from "lucide-react";
import api from "../../services/api";
import { getProfileCanonicalPath } from "../../utils/profilePath";

/**
 * The writers competing alongside you.
 *
 * Follow state has THREE values here, not two: the server's followUser always creates a pending
 * request (it never consults isPrivate), and only a follow-back is instant. So a participant is
 * either not-followed, requested, or followed — collapsing that to a boolean would offer "Follow"
 * to someone you have already asked.
 */

const resolveImage = (src) => {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  const base = import.meta.env.VITE_API_URL || "http://localhost:5002";
  return `${base}${src.startsWith("/") ? "" : "/"}${src}`;
};

const ParticipantCard = ({ participant, viewer, onFollowChange }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const state = participant.isFollowing ? "following" : participant.followRequestPending ? "requested" : "none";

  const act = async () => {
    setBusy(true);
    setError("");
    try {
      if (state === "none") {
        const { data } = await api.post("/users/follow", { userId: participant._id });
        // A follow-back is accepted immediately; everything else waits for approval.
        onFollowChange(participant._id, data?.status === "following"
          ? { isFollowing: true, followRequestPending: false }
          : { isFollowing: false, followRequestPending: true });
      } else if (state === "requested") {
        await api.post("/users/follow-requests/cancel", { userId: participant._id });
        onFollowChange(participant._id, { isFollowing: false, followRequestPending: false });
      } else {
        await api.post("/users/unfollow", { userId: participant._id });
        onFollowChange(participant._id, { isFollowing: false, followRequestPending: false });
      }
    } catch (err) {
      setError(err?.response?.data?.message || "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const label = { none: "Follow", requested: "Requested", following: "Following" }[state];
  const profilePath = getProfileCanonicalPath(participant, { viewerId: viewer?._id, viewerRole: viewer?.role });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3">
        {participant.profileImage ? (
          <img src={resolveImage(participant.profileImage)} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#D14D37]/10 font-bold text-[#D14D37]">
            {(participant.name || "?").charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {profilePath ? (
              <Link to={profilePath} className="truncate font-semibold text-gray-900 hover:text-[#D14D37] dark:text-white">
                {participant.name}
              </Link>
            ) : (
              <span className="truncate font-semibold text-gray-900 dark:text-white">{participant.name}</span>
            )}
            {participant.isPrivate ? (
              <Lock className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-label="Private account" />
            ) : null}
          </div>
          {participant.username ? (
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">@{participant.username}</p>
          ) : null}
        </div>

        {participant.isSelf ? (
          <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            You
          </span>
        ) : (
          <button
            type="button"
            onClick={act}
            disabled={busy}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              state === "none"
                ? "bg-[#D14D37] text-white hover:bg-[#b8402d]"
                : "border border-gray-300 text-gray-600 hover:border-[#D14D37] hover:text-[#D14D37] dark:border-gray-600 dark:text-gray-300"
            }`}
          >
            {busy ? "…" : label}
          </button>
        )}
      </div>

      {participant.bio ? (
        <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{participant.bio}</p>
      ) : null}

      {participant.genres?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {participant.genres.map((g) => (
            <span key={g} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {g}
            </span>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-[#D14D37]">{error}</p> : null}
    </div>
  );
};

const ParticipantsGrid = ({ competitionId, viewer }) => {
  const [participants, setParticipants] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!competitionId) return undefined;
    let alive = true;
    setLoading(true);
    api.get(`/competitions/${competitionId}/participants`)
      .then(({ data }) => {
        if (!alive) return;
        setParticipants(data.participants || []);
        setTotal(data.total || 0);
        setError("");
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message || "Failed to load the other writers.");
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [competitionId]);

  const handleFollowChange = useCallback((userId, patch) => {
    setParticipants((prev) => prev.map((p) => (p._id === userId ? { ...p, ...patch } : p)));
  }, []);

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? participants.filter((p) =>
      p.name?.toLowerCase().includes(needle)
      || p.username?.toLowerCase().includes(needle)
      || (p.genres || []).some((g) => g.toLowerCase().includes(needle)))
    : participants;

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Loading the room…</p>;

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-700 dark:text-gray-200">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Users className="h-4 w-4" aria-hidden="true" />
          <strong className="text-gray-900 dark:text-white">{total}</strong>
          {total === 1 ? "writer competing" : "writers competing"}
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or genre"
            aria-label="Search participants"
            className="w-56 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[#D14D37] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No writers match “{query}”.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((p) => (
            <ParticipantCard key={p._id} participant={p} viewer={viewer} onFollowChange={handleFollowChange} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantsGrid;
