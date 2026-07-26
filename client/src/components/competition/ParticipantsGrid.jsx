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
    <div className="ckc-card ckc-card-pad">
      <div className="flex items-start gap-3">
        {participant.profileImage ? (
          <img src={resolveImage(participant.profileImage)} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          // The same fallback the shared Avatar uses: a quiet inset, not a coral badge. A missing
          // photo is not a live competition, and the accent has to keep meaning something.
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "var(--ckc-cream)",
              border: "1px solid var(--ckc-rule)",
              color: "var(--ckc-muted)",
              fontFamily: "var(--ckc-display)",
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            {(participant.name || "?").charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {profilePath ? (
              <Link
                to={profilePath}
                className="truncate hover:opacity-70"
                style={{ fontSize: 14, fontWeight: 500, color: "var(--ckc-ink)" }}
              >
                {participant.name}
              </Link>
            ) : (
              <span className="truncate" style={{ fontSize: 14, fontWeight: 500, color: "var(--ckc-ink)" }}>
                {participant.name}
              </span>
            )}
            {participant.isPrivate ? (
              <Lock className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ckc-muted)" }} aria-label="Private account" />
            ) : null}
          </div>
          {participant.username ? (
            // A handle keeps the monospace voice but not the uppercasing — @Ada is not @ADA.
            <p className="truncate" style={{ fontFamily: "var(--ckc-mono)", fontSize: 11, color: "var(--ckc-muted)" }}>
              @{participant.username}
            </p>
          ) : null}
        </div>

        {participant.isSelf ? (
          <span className="ckc-chip shrink-0">
            You
          </span>
        ) : (
          // A row action, so the button keeps the .ckc-btn shape at a compact size: following or
          // already asked is the quiet variant, and only the action still open to you reads primary.
          <button
            type="button"
            onClick={act}
            disabled={busy}
            className={`ckc-btn shrink-0 transition disabled:opacity-50 ${state === "none" ? "" : "ckc-btn-quiet"}`}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            {busy ? "…" : label}
          </button>
        )}
      </div>

      {participant.bio ? (
        <p className="mt-3 line-clamp-2" style={{ fontSize: 14, color: "var(--ckc-body)" }}>{participant.bio}</p>
      ) : null}

      {participant.genres?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {participant.genres.map((g) => (
            <span key={g} className="ckc-chip">
              {g}
            </span>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-2" style={{ fontSize: 12, color: "var(--ckc-accent-text)" }}>{error}</p> : null}
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

  if (loading) return <p className="ckc-meta">Loading the room…</p>;

  if (error) {
    return (
      <div className="ckc-card ckc-card-pad text-center">
        <p style={{ color: "var(--ckc-body)" }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="ckc-meta flex items-center gap-2">
          <Users className="h-4 w-4" aria-hidden="true" />
          <strong style={{ fontWeight: 500, color: "var(--ckc-ink)" }}>{total}</strong>
          {total === 1 ? "writer competing" : "writers competing"}
        </p>
        <div className="relative">
          {/* Decorative, never read — the one place the faint tone belongs. */}
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--ckc-faint)" }}
            aria-hidden="true"
          />
          {/* No focus ring of its own: .ckc's :focus-visible outline already speaks for the surface. */}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or genre"
            aria-label="Search participants"
            className="w-56 py-2 pl-9 pr-3 outline-none"
            style={{
              background: "var(--ckc-card)",
              border: "1px solid var(--ckc-rule)",
              borderRadius: 3,
              fontFamily: "var(--ckc-sans)",
              fontSize: 14,
              color: "var(--ckc-ink)",
            }}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--ckc-muted)" }}>No writers match “{query}”.</p>
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
