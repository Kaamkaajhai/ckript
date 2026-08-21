import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { COLLAB_ROLES, getCollabRoleLabel } from "../../constants/collabRoles";

export const COLLAB_REQUEST_ROLES = COLLAB_ROLES;
export { getCollabRoleLabel };

const asText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

export const normalizeCollabRequest = (value = {}) => ({
  id: asText(value._id || value.id),
  scriptId: asText(value.scriptId?._id || value.scriptId),
  scriptTitle: asText(value.scriptTitle || value.scriptId?.title, "Untitled project"),
  requester: value.requester || value.requesterId
    ? {
      id: asText(value.requester?._id || value.requester?.id || value.requesterId?._id || value.requesterId),
      name: asText(value.requester?.name || value.requesterId?.name, "Writer"),
      profileImage: asText(value.requester?.profileImage || value.requesterId?.profileImage),
    }
    : null,
  requestedRole: asText(value.requestedRole, "editor").toLowerCase(),
  legacyRequestedRole: asText(value.legacyRequestedRole).toLowerCase() || null,
  message: asText(value.message),
  status: asText(value.status, "pending").toLowerCase(),
  createdAt: value.createdAt || null,
  respondedAt: value.respondedAt || null,
});

export const normalizePagination = (value = {}) => ({
  page: Math.max(1, Number(value.page) || 1),
  limit: Math.max(1, Number(value.limit) || 12),
  total: Math.max(0, Number(value.total) || 0),
  pages: Math.max(1, Number(value.pages) || 1),
  hasNext: Boolean(value.hasNext),
  hasPrevious: Boolean(value.hasPrevious),
});

export const normalizeRequestPage = (payload = {}) => ({
  requests: Array.isArray(payload.requests) ? payload.requests.map(normalizeCollabRequest) : [],
  pagination: normalizePagination(payload.pagination),
});

export const listCollabRequests = async ({ scope = "inbox", page = 1, limit = 12, signal } = {}, client = api) => {
  if (!["inbox", "outgoing"].includes(scope)) throw new Error("Invalid collaboration request scope");
  const { data } = await client.get(`/collab/requests/${scope}`, { params: { page, limit }, signal });
  return normalizeRequestPage(data);
};

export const loadMyCollabRequest = async (scriptId, { signal } = {}, client = api) => {
  if (!scriptId) throw new Error("Project id is required");
  const { data } = await client.get(`/collab/${encodeURIComponent(scriptId)}/request/mine`, { signal });
  return {
    request: data?.request ? normalizeCollabRequest(data.request) : null,
    isOwner: Boolean(data?.isOwner),
    isCollaborator: Boolean(data?.isCollaborator),
    canRequest: Boolean(data?.canRequest),
  };
};

export const sendCollabRequest = async (scriptId, { requestedRole, message } = {}, client = api) => {
  if (!scriptId) throw new Error("Project id is required");
  const { data } = await client.post(`/collab/${encodeURIComponent(scriptId)}/request`, {
    requestedRole,
    message: asText(message),
  });
  return {
    message: asText(data?.message, "Request sent"),
    request: data?.request ? normalizeCollabRequest(data.request) : null,
  };
};

export const respondToCollabRequest = async (request, { decision, role, accessLevel } = {}, client = api) => {
  const normalized = normalizeCollabRequest(request);
  if (!normalized.id || !normalized.scriptId) throw new Error("Request identity is incomplete");
  const { data } = await client.post(
    `/collab/${encodeURIComponent(normalized.scriptId)}/request/${encodeURIComponent(normalized.id)}/respond`,
    { decision, role, accessLevel },
  );
  return {
    message: asText(data?.message, decision === "accepted" ? "Request accepted" : "Request rejected"),
    request: data?.request ? normalizeCollabRequest(data.request) : { ...normalized, status: decision },
  };
};

export const listCollabActivity = async (scriptId, { page = 1, limit = 12, signal } = {}, client = api) => {
  if (!scriptId) throw new Error("Project id is required");
  const { data } = await client.get(`/collab/${encodeURIComponent(scriptId)}/activity`, {
    params: { page, limit },
    signal,
  });
  return {
    activity: Array.isArray(data?.activity) ? data.activity : [],
    pagination: normalizePagination(data?.pagination),
  };
};

export const getCollabErrorMessage = (error, fallback = "Collaboration request failed") => (
  error?.response?.data?.error
  || error?.response?.data?.message
  || error?.message
  || fallback
);

export function useCollabRequestPage({ scope = "inbox", page = 1, enabled = true } = {}) {
  const [state, setState] = useState({ key: "", status: "idle", requests: [], pagination: normalizePagination({ page }), error: "" });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const requestKey = enabled ? `${scope}:${page}:${revision}` : "";

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    listCollabRequests({ scope, page, signal: controller.signal })
      .then((result) => setState({ key: requestKey, status: "ready", ...result, error: "" }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ key: requestKey, status: "error", requests: [], pagination: normalizePagination({ page }), error: getCollabErrorMessage(error, "Could not load collaboration requests") });
      });
    return () => controller.abort();
  }, [enabled, page, requestKey, scope]);

  if (!enabled) return { status: "idle", requests: [], pagination: normalizePagination({ page }), error: "", refresh };
  if (state.key !== requestKey) return { status: "loading", requests: [], pagination: normalizePagination({ page }), error: "", refresh };
  return { ...state, refresh };
}

export function useMyCollabRequest(scriptId, { enabled = true } = {}) {
  const [state, setState] = useState({ key: "", status: "idle", request: null, isOwner: false, isCollaborator: false, canRequest: false, error: "" });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const requestKey = enabled && scriptId ? `${scriptId}:${revision}` : "";

  useEffect(() => {
    if (!enabled || !scriptId) return undefined;
    const controller = new AbortController();
    loadMyCollabRequest(scriptId, { signal: controller.signal })
      .then((result) => setState({ key: requestKey, status: "ready", ...result, error: "" }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({ key: requestKey, status: "error", request: null, isOwner: false, isCollaborator: false, canRequest: false, error: getCollabErrorMessage(error, "Could not load your request") });
      });
    return () => controller.abort();
  }, [enabled, requestKey, scriptId]);

  if (!enabled || !scriptId) return { status: "idle", request: null, isOwner: false, isCollaborator: false, canRequest: false, error: "", setState, refresh };
  if (state.key !== requestKey) return { status: "loading", request: null, isOwner: false, isCollaborator: false, canRequest: false, error: "", setState, refresh };
  return { ...state, setState, refresh };
}
