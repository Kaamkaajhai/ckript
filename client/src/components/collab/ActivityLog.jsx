import { useEffect, useState } from "react";
import api from "../../services/api";

const describeAction = (entry) => entry.action.replace(/_/g, " ");

const timeAgo = (value) => {
  const delta = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
};

export default function ActivityLog({ scriptId }) {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!scriptId) return undefined;

    const load = async () => {
      const { data } = await api.get(`/collab/${scriptId}/activity`);
      setActivity(data.activity || []);
    };

    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [scriptId]);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900">Activity</h3>
      <div className="mt-4 space-y-3">
        {activity.length ? activity.map((entry) => (
          <div key={entry._id} className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e3a5f] text-sm font-bold text-white">
              {entry.actorId?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {entry.actorId?.name || "Unknown user"} {describeAction(entry)}
              </p>
              <p className="text-xs uppercase tracking-wide text-gray-500">{timeAgo(entry.createdAt)}</p>
            </div>
          </div>
        )) : <p className="text-sm text-gray-500">No activity yet.</p>}
      </div>
    </div>
  );
}
