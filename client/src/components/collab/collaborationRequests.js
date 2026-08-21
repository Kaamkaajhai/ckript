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

export const normalizeCollabInvite = (value = {}) => ({
  id: asText(value._id || value.id),
  scriptId: asText(value.scriptId?._id || value.scriptId),
  scriptTitle: asText(value.scriptTitle || value.scriptId?.title, "Untitled project"),
  owner: value.owner ? {
    id: asText(value.owner._id || value.owner.id),
    name: asText(value.owner.name, "Writer"),
    profileImage: asText(value.owner.profileImage),
  } : null,
  invitedBy: value.invitedBy ? {
    id: asText(value.invitedBy._id || value.invitedBy.id),
    name: asText(value.invitedBy.name, "Writer"),
    profileImage: asText(value.invitedBy.profileImage),
  } : null,
  role: asText(value.role, "editor").toLowerCase(),
  accessLevel: asText(value.accessLevel, "full_access").toLowerCase(),
  invitedAt: value.invitedAt || null,
  expiresAt: value.expiresAt || null,
  expired: Boolean(value.expired),
  token: asText(value.token),
});

export const normalizeCollabActivity = (value = {}) => ({
  id: asText(value._id || value.id),
  scriptId: asText(value.scriptId?._id || value.scriptId),
  scriptTitle: asText(value.scriptTitle || value.scriptId?.title, "Untitled project"),
  action: asText(value.action, "project_updated").toLowerCase(),
  actor: value.actor ? {
    id: asText(value.actor._id || value.actor.id),
    name: asText(value.actor.name, "Unknown user"),
    profileImage: asText(value.actor.profileImage),
  } : null,
  role: asText(value.metadata?.role || value.role).toLowerCase() || null,
  createdAt: value.createdAt || null,
});

export const describeCollabActivity = (entry) => String(entry?.action || "project_updated").replace(/_/g, " ");

export const formatCollabTimeAgo = (value, now = Date.now()) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const delta = Math.max(1, Math.floor((now - timestamp) / 1000));
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
};

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

export const listCollabInvites = async ({ page = 1, limit = 12, signal } = {}, client = api) => {
  const { data } = await client.get("/collab/invites/inbox", { params: { page, limit }, signal });
  return {
    invitations: Array.isArray(data?.invitations) ? data.invitations.map(normalizeCollabInvite) : [],
    pagination: normalizePagination(data?.pagination),
  };
};

export const acceptCollabInvite = async (token, client = api) => {
  if (!token) throw new Error("Invitation token is missing");
  const { data } = await client.post(`/collab/invite/${encodeURIComponent(token)}/accept`);
  return {
    message: asText(data?.message, "Invitation accepted"),
    script: data?.script ? {
      id: asText(data.script._id || data.script.id),
      title: asText(data.script.title, "Untitled project"),
    } : null,
    role: asText(data?.role).toLowerCase() || null,
  };
};

export const sendCollabInvite = async (scriptId, form, client = api) => {
  if (!scriptId) throw new Error("Save the project once before inviting collaborators");
  const { data } = await client.post(`/collab/${encodeURIComponent(scriptId)}/invite`, form);
  return {
    message: asText(data?.message, "Invitation sent"),
    emailSent: Boolean(data?.emailSent),
  };
};

export const refreshCollabInvite = async (scriptId, identity, { message = "" } = {}, client = api) => {
  if (!scriptId || !identity) throw new Error("Invitation identity is incomplete");
  const { data } = await client.post(
    `/collab/${encodeURIComponent(scriptId)}/collaborators/${encodeURIComponent(identity)}/resend-invite`,
    { message },
  );
  return {
    message: asText(data?.message, "Invitation refreshed"),
    emailSent: Boolean(data?.emailSent),
  };
};

export const listCollabActivity = async (scriptId = null, { page = 1, limit = 12, signal } = {}, client = api) => {
  const path = scriptId ? `/collab/${encodeURIComponent(scriptId)}/activity` : "/collab/activity";
  const { data } = await client.get(path, {
    params: { page, limit },
    signal,
  });
  return {
    activity: Array.isArray(data?.activity) ? data.activity.map(normalizeCollabActivity) : [],
    pagination: normalizePagination(data?.pagination),
  };
};

export const getCollabErrorMessage = (error, fallback = "Collaboration request failed") => (
  error?.response?.data?.error
  || error?.response?.data?.message
  || error?.message
  || fallback
);

const PAGED_RESOURCES = {
  requests: {
    collection: "requests",
    fallback: "Could not load collaboration requests",
    load: ({ scope, page, signal }) => listCollabRequests({ scope, page, signal }),
  },
  invitations: {
    collection: "invitations",
    fallback: "Could not load collaboration invitations",
    load: ({ page, signal }) => listCollabInvites({ page, signal }),
  },
  activity: {
    collection: "activity",
    fallback: "Could not load collaboration activity",
    load: ({ page, signal }) => listCollabActivity(null, { page, signal }),
  },
};

const emptyPagedState = (collection, page, status) => ({
  status,
  [collection]: [],
  pagination: normalizePagination({ page }),
  error: "",
});

function useCollabPagedResource(resource, { scope = "", page = 1, enabled = true } = {}) {
  const config = PAGED_RESOURCES[resource];
  const [state, setState] = useState({ key: "", ...emptyPagedState(config.collection, page, "idle") });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const requestKey = enabled ? `${resource}:${scope}:${page}:${revision}` : "";

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    config.load({ scope, page, signal: controller.signal })
      .then((result) => setState({ key: requestKey, status: "ready", ...result, error: "" }))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({
          key: requestKey,
          ...emptyPagedState(config.collection, page, "error"),
          error: getCollabErrorMessage(error, config.fallback),
        });
      });
    return () => controller.abort();
  }, [config, enabled, page, requestKey, scope]);

  if (!enabled) return { ...emptyPagedState(config.collection, page, "idle"), refresh };
  if (state.key !== requestKey) return { ...emptyPagedState(config.collection, page, "loading"), refresh };
  return { ...state, refresh };
}

export function useCollabRequestPage({ scope = "inbox", page = 1, enabled = true } = {}) {
  return useCollabPagedResource("requests", { scope, page, enabled });
}

export function useCollabInvitePage({ page = 1, enabled = true } = {}) {
  return useCollabPagedResource("invitations", { page, enabled });
}

export function useCollabActivityPage({ page = 1, enabled = true } = {}) {
  return useCollabPagedResource("activity", { page, enabled });
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
