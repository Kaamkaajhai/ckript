import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import DiffViewer from "./DiffViewer";

const timeAgo = (value) => {
  const delta = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
};

export default function ReviewQueue({ scriptId, originalContent = "" }) {
  const [revisions, setRevisions] = useState([]);
  const [selectedRevision, setSelectedRevision] = useState(null);

  const loadRevisions = useCallback(async () => {
    const { data } = await api.get(`/collab/${scriptId}/revisions`);
    setRevisions((data.revisions || []).filter((revision) => revision.status === "pending_review"));
  }, [scriptId]);

  useEffect(() => {
    if (!scriptId) return;

    Promise.resolve().then(() => {
      loadRevisions();
    });
  }, [scriptId, loadRevisions]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">Review Queue</h3>
        <div className="mt-4 space-y-3">
          {revisions.length ? revisions.map((revision) => (
            <button
              key={revision._id}
              onClick={() => setSelectedRevision(revision)}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 text-left"
            >
              <div>
                <p className="font-semibold text-gray-900">{revision.authorId?.name}</p>
                <p className="text-sm text-gray-500">{revision.sectionRef}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-gray-500">{timeAgo(revision.createdAt)}</span>
            </button>
          )) : <p className="text-sm text-gray-500">No pending revisions right now.</p>}
        </div>
      </div>

      {selectedRevision ? (
        <DiffViewer
          scriptId={scriptId}
          revision={selectedRevision}
          originalContent={originalContent}
          onReviewed={() => {
            setSelectedRevision(null);
            loadRevisions();
          }}
        />
      ) : null}
    </div>
  );
}
