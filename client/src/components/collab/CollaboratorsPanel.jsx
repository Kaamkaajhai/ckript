import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import InviteModal from "./InviteModal";

const getCollaboratorUserId = (entry) => String(
  entry?.user?._id
  || entry?.user
  || entry?.userId?._id
  || entry?.userId
  || ""
);
const dedupeCollaborators = (entries = []) => {
  const seen = new Set();
  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    const userId = getCollaboratorUserId(entry);
    const status = String(entry?.status || "");
    const key = `${userId}:${status}`;
    if (!userId || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function CollaboratorsPanel({ scriptId, currentUserId }) {
  const [data, setData] = useState({ collaborators: [], ownerId: "", collabVisibility: "private" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);

  const isOwner = currentUserId && data.ownerId === currentUserId;

  const loadCollaborators = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/collab/${scriptId}/collaborators`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load collaborators");
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  useEffect(() => {
    if (scriptId) loadCollaborators();
  }, [scriptId, loadCollaborators]);
  

  const pendingInvites = useMemo(
    () => dedupeCollaborators(data.collaborators.filter((entry) => entry.status === "pending" && entry.isActive)),
    [data.collaborators]
  );

  const activeCollaborators = useMemo(
    () => dedupeCollaborators(data.collaborators.filter((entry) => entry.status !== "pending" && entry.isActive)),
    [data.collaborators]
  );

  const updateRole = async (userId, collaboratorRole, accessLevel) => {
    try {
      await api.patch(`/collab/${scriptId}/collaborators/${userId}/role`, { role: collaboratorRole, accessLevel });
      loadCollaborators();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update collaborator access");
    }
  };

  const removeCollaborator = async (userId) => {
    try {
      await api.delete(`/collab/${scriptId}/collaborators/${userId}`);
      loadCollaborators();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove collaborator");
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-500">Loading collaborators...</div>;
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Collaborators</h3>
          <p className="text-sm text-gray-500">Visibility: {data.collabVisibility}</p>
        </div>
        {isOwner ? (
          <button
            onClick={() => setShowInviteModal(true)}
            className="rounded-2xl bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white"
          >
            Invite Someone
          </button>
        ) : null}
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="space-y-3">
        {activeCollaborators.map((entry) => (
          <div key={entry._id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-4 py-3">
            <div>
              <p className="font-semibold text-gray-900">{entry.user?.name || "Unknown user"}</p>
              <p className="text-xs text-gray-500">{entry.user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                {entry.status}
              </span>
              {isOwner ? (
                <select
                  value={entry.accessLevel || "full_access"}
                  onChange={(event) => updateRole(entry.user?._id, entry.role, event.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
                >
                  <option value="full_access">Full Access</option>
                  <option value="content_only">Content Only</option>
                </select>
              ) : (
                <span className="text-sm font-medium text-gray-700">{entry.accessLevel === "content_only" ? "Content Only" : "Full Access"}</span>
              )}
              {isOwner ? (
                <button
                  onClick={() => removeCollaborator(getCollaboratorUserId(entry))}
                  className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {pendingInvites.length ? (
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Pending Invites</p>
          <div className="space-y-3">
            {pendingInvites.map((entry) => (
              <div key={entry._id} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="font-semibold text-gray-900">{entry.user?.name || entry.user?.email}</p>
                <p className="text-sm text-gray-600">{entry.user?.email}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-amber-700">
                  {entry.role} invite pending • {entry.accessLevel === "content_only" ? "content only" : "full access"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showInviteModal ? (
        <InviteModal
          scriptId={scriptId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={loadCollaborators}
        />
      ) : null}
    </div>
  );
}
