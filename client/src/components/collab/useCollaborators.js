import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";

/*
 * The collaborator list, its four server calls, and its loading/error state —
 * extracted from `CollaboratorsPanel` so the mobile People surface reuses the
 * SERVICE CALLS rather than the desktop DOM (plan §15).
 *
 * `CollaboratorsPanel` now calls this too, so there is exactly one place that
 * knows the endpoints and one definition of "an active collaborator". Two
 * copies of `dedupeCollaborators` would be two answers to "is this person
 * listed twice?" — the bug it exists to prevent.
 */

export const getCollaboratorUserId = (entry) => String(
  entry?.user?._id
  || entry?.user
  || entry?.userId?._id
  || entry?.userId
  || ""
);

/*
 * The server can return the same person twice — once per status — when an
 * invite is accepted while the panel is open. Keyed by identity AND status so a
 * pending row and an active row for one person both survive, which is what
 * makes "invited, now accepted" visible rather than a silent replacement.
 *
 * DEF-15 — THE IDENTITY IS `userId` OR `invitedEmail`, NEVER `userId` ALONE.
 * `collab.controller.js` stores `invitedEmail: invitedUser ? undefined : email`,
 * so an invitation to somebody WITHOUT a Ckript account yet has no user id at
 * all. This filter used to require one, which silently dropped exactly those
 * rows: the owner never saw the invite in "Pending Invites", could not cancel
 * it, and re-inviting the same address created a second one. A live desktop
 * defect, found by porting the panel rather than by using it.
 */
export const dedupeCollaborators = (entries = []) => {
  const seen = new Set();
  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    const identity = getCollaboratorUserId(entry) || String(entry?.invitedEmail || "");
    const status = String(entry?.status || "");
    const key = `${identity}:${status}`;
    if (!identity || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function useCollaborators(scriptId, currentUserId) {
  const [data, setData] = useState({ collaborators: [], ownerId: "", collabVisibility: "private" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!scriptId) { setLoading(false); return; }
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

  useEffect(() => { load(); }, [load]);

  const updateRole = useCallback(async (userId, role, accessLevel) => {
    try {
      await api.patch(`/collab/${scriptId}/collaborators/${userId}/role`, { role, accessLevel });
      await load();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update collaborator access");
      return false;
    }
  }, [scriptId, load]);

  const remove = useCallback(async (userId) => {
    try {
      await api.delete(`/collab/${scriptId}/collaborators/${userId}`);
      await load();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove collaborator");
      return false;
    }
  }, [scriptId, load]);

  const invite = useCallback(async (form) => {
    try {
      setError("");
      await api.post(`/collab/${scriptId}/invite`, form);
      await load();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send the invitation");
      return false;
    }
  }, [scriptId, load]);

  const pending = useMemo(
    () => dedupeCollaborators(data.collaborators.filter((entry) => entry.status === "pending" && entry.isActive)),
    [data.collaborators],
  );
  const active = useMemo(
    () => dedupeCollaborators(data.collaborators.filter((entry) => entry.status !== "pending" && entry.isActive)),
    [data.collaborators],
  );

  return {
    loading,
    error,
    setError,
    ownerId: data.ownerId,
    collabVisibility: data.collabVisibility,
    isOwner: Boolean(currentUserId) && String(data.ownerId) === String(currentUserId),
    active,
    pending,
    reload: load,
    updateRole,
    remove,
    invite,
  };
}
