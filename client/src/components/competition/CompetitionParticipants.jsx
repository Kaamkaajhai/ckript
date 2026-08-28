import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../../utils/mediaUrl";

const labelFor = (participant) => {
  if (participant.isFollowing) return "Following";
  if (participant.followRequestPending) return "Requested";
  return "Follow";
};

// The participant room is deliberately presentation-only. Desktop and native receive the same
// bounded page and invoke the same shared follow operation; neither component owns a second fetch.
export default function CompetitionParticipants({ state, pendingId = "", followError = "", onToggleFollow, onLoadMore, onRetry }) {
  const items = state?.items || [];
  const loading = state?.status === "loading";
  const failed = state?.status === "failed";
  if (loading && !items.length) return <p className="ckc-meta">Loading participants…</p>;
  if (failed && !items.length) return <div><p className="ckc-prose">{state.failure?.message || "Could not load participants."}</p><button type="button" className="ckc-btn ckc-btn-quiet mt-3" onClick={onRetry}>Try again</button></div>;
  if (!items.length) return <p className="ckc-prose">No participants to show yet.</p>;

  return (
    <div>
      {followError ? <p className="ckc-prose mb-3" style={{ color: "var(--ckc-accent-text)" }}>{followError}</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((participant) => (
          <li key={participant._id} className="ckc-card ckc-card-pad flex items-start gap-3">
            {participant.profileImage ? <img src={resolveMediaUrl(participant.profileImage)} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" /> : <span className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--ckc-cream)", color: "var(--ckc-ink)" }} aria-hidden="true">{String(participant.name || "W").charAt(0)}</span>}
            <div className="min-w-0 flex-1">
              <Link to={participant.canonicalPath} className="ckc-link font-medium">{participant.name || "Writer"}</Link>
              {participant.username ? <p className="ckc-meta mt-1">@{participant.username}</p> : null}
              {participant.bio ? <p className="ckc-prose mt-2" style={{ fontSize: 13 }}>{participant.bio}</p> : participant.isPrivate ? <p className="ckc-meta mt-2">Private profile</p> : null}
              {!participant.isSelf ? <button type="button" className="ckc-btn ckc-btn-quiet mt-3" disabled={pendingId === String(participant._id)} onClick={() => onToggleFollow?.(participant)}>{pendingId === String(participant._id) ? "Updating…" : labelFor(participant)}</button> : <span className="ckc-chip mt-3">You</span>}
            </div>
          </li>
        ))}
      </ul>
      <p className="ckc-meta mt-4">Showing {items.length} of {state.total} writers</p>
      {state.failure?.message ? <p className="ckc-prose mt-3" style={{ color: "var(--ckc-accent-text)" }}>{state.failure.message}</p> : null}
      {state.hasMore ? <button type="button" className="ckc-btn ckc-btn-quiet mt-3" disabled={loading} onClick={onLoadMore}>{loading ? "Loading…" : `Load ${Math.min(state.limit, state.total - items.length)} more writers`}</button> : null}
    </div>
  );
}
