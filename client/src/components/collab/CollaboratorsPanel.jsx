import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import InviteModal from "./InviteModal";
import { getCollabRoleLabel } from "../../constants/collabRoles";

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

export default function CollaboratorsPanel({ scriptId, currentUserId, compact = false, dark = false }) {
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
    return <div className={compact ? "p-3 text-sm text-gray-500" : "rounded-3xl border border-gray-200 bg-white p-5 text-sm text-gray-500"}>Loading collaborators...</div>;
  }

  return (
    <div className={compact ? "" : `rounded-3xl border ${dark ? "border-[#1d3350] bg-[#0d1829]" : "border-gray-200 bg-white"} p-5 shadow-sm`}>
      {compact && isOwner && (
        <button
          onClick={() => setShowInviteModal(true)}
          className={`w-full flex items-center justify-center gap-2 mb-4 px-3 py-2.5 rounded-xl text-[12.5px] font-bold transition ${dark ? "bg-[#1e3a5f] text-white hover:bg-[#244873]" : "bg-[#1e3a5f] text-white hover:bg-[#244873]"}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          Invite collaborator
        </button>
      )}
      {!compact && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className={`text-lg font-bold ${dark ? "text-gray-200" : "text-gray-900"}`}>Collaborators</h3>
            <p className={`text-sm ${dark ? "text-gray-500" : "text-gray-500"}`}>Visibility: {data.collabVisibility}</p>
          </div>
          {isOwner ? (
            <button
              onClick={() => setShowInviteModal(true)}
              className="rounded-2xl bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#244873]"
            >
              Invite Someone
            </button>
          ) : null}
        </div>
      )}

      {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}

      <div className="space-y-3">
        {activeCollaborators.map((entry) => (
          <div key={entry._id} className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 ${dark ? "border-[#1d3350] bg-white/[0.02]" : "border-gray-100 bg-white"} ${compact ? "flex-col items-start" : ""}`}>
            <div>
              <p className={`font-semibold ${compact ? "text-[13px]" : ""} ${dark ? "text-gray-200" : "text-gray-900"}`}>{entry.user?.name || entry.invitedEmail || "Unknown user"}</p>
              <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-500"}`}>{entry.user?.email || entry.invitedEmail}</p>
            </div>
            <div className={`flex items-center gap-2 ${compact ? "w-full justify-between mt-1" : ""}`}>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${dark ? "bg-[#1e3a5f]/40 text-blue-300" : "bg-gray-100 text-gray-600"}`}>
                {getCollabRoleLabel(entry.role)}
              </span>
              {isOwner && String(entry.user?._id) !== currentUserId ? (
                <div className="flex items-center gap-1.5 ml-auto">
                  <select
                    value={entry.accessLevel || "full_access"}
                    onChange={(event) => updateRole(entry.user?._id || entry.invitedEmail, entry.role, event.target.value)}
                    className={`rounded-xl border px-2 py-1 text-xs font-medium outline-none ${dark ? "border-[#2a4a6a] bg-[#0d1829] text-gray-300" : "border-gray-200 bg-gray-50 text-gray-700"}`}
                  >
                    <option value="full_access">Full</option>
                    <option value="content_only">Content</option>
                  </select>
                  <button
                    onClick={() => removeCollaborator(getCollaboratorUserId(entry) || entry.invitedEmail)}
                    className={`rounded-xl px-2 py-1 text-xs font-semibold transition ${dark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <span className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-700"} ml-auto`}>{entry.accessLevel === "content_only" ? "Content Only" : "Full Access"}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {pendingInvites.length ? (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-gray-500 px-1">Pending Invites</p>
          <div className="space-y-2">
            {pendingInvites.map((entry) => (
              <div key={entry._id} className={`rounded-2xl border px-3 py-2.5 flex flex-col items-start ${dark ? "border-amber-500/20 bg-amber-500/[0.05]" : "border-amber-100 bg-amber-50"}`}>
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`font-semibold truncate ${compact ? "text-[13px]" : ""} ${dark ? "text-amber-200" : "text-gray-900"}`}>{entry.user?.name || entry.invitedEmail}</p>
                    <p className={`text-xs truncate ${dark ? "text-amber-500/80" : "text-gray-600"}`}>{entry.user?.email || entry.invitedEmail}</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => removeCollaborator(getCollaboratorUserId(entry) || entry.invitedEmail)}
                      className={`shrink-0 rounded-xl px-2 py-1 text-[11px] font-bold transition ${dark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${dark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-800"}`}>
                    {getCollabRoleLabel(entry.role)}
                  </span>
                  <span className={`text-[10px] uppercase font-bold tracking-wide ${dark ? "text-amber-500/60" : "text-amber-700/60"}`}>
                    • {entry.accessLevel === "content_only" ? "content only" : "full access"}
                  </span>
                </div>
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
