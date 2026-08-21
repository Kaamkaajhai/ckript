import { useEffect, useState } from "react";
import { getCollabErrorMessage, listCollabActivity } from "./collaborationRequests";

const describeAction = (entry) => String(entry?.action || "updated the project").replace(/_/g, " ");

const timeAgo = (value) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const delta = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
};

export default function ActivityLog({ scriptId }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ key: "", status: "idle", activity: [], pagination: null, error: "" });
  const requestKey = scriptId ? `${scriptId}:${page}` : "";

  useEffect(() => {
    if (!scriptId) return undefined;
    const controller = new AbortController();
    listCollabActivity(scriptId, { page, signal: controller.signal })
      .then((result) => setState({ key: requestKey, status: "ready", ...result, error: "" }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ key: requestKey, status: "error", activity: [], pagination: null, error: getCollabErrorMessage(error, "Could not load activity") });
      });
    return () => controller.abort();
  }, [page, requestKey, scriptId]);

  const view = state.key === requestKey
    ? state
    : { status: "loading", activity: [], pagination: null, error: "" };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">Activity</h3>
      {view.status === "loading" && !view.activity.length ? <p className="mt-4 text-sm text-gray-500">Loading activity…</p> : null}
      {view.status === "error" ? <p className="mt-4 text-sm text-red-700" role="alert">{view.error}</p> : null}
      <div className="mt-4 space-y-3">
        {view.activity.map((entry) => (
          <div key={entry._id} className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-sm font-bold text-white">
              {entry.actor?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-medium text-gray-900">{entry.actor?.name || "Unknown user"} {describeAction(entry)}</p>
              <p className="text-xs uppercase tracking-wide text-gray-500">{timeAgo(entry.createdAt)}</p>
            </div>
          </div>
        ))}
        {view.status === "ready" && !view.activity.length ? <p className="text-sm text-gray-500">No activity yet.</p> : null}
      </div>
      {view.pagination?.pages > 1 ? (
        <nav className="mt-5 flex items-center justify-between" aria-label="Activity pages">
          <button type="button" disabled={!view.pagination.hasPrevious} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-11 px-3 text-sm font-semibold disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-600">Page {view.pagination.page} of {view.pagination.pages}</span>
          <button type="button" disabled={!view.pagination.hasNext} onClick={() => setPage((value) => value + 1)} className="min-h-11 px-3 text-sm font-semibold disabled:opacity-40">Next</button>
        </nav>
      ) : null}
    </div>
  );
}
