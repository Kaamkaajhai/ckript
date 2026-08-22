import api from "../../services/api";

export const PROFILE_COLLECTION_SECTIONS = Object.freeze([
  { key: "activity", label: "Activity" },
  { key: "bookmarks", label: "Saved" },
]);

export const PROFILE_COLLECTION_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  FAILED: "failed",
});

const text = (value) => String(value ?? "").trim();
const failure = (cause, fallbackMessage) => ({
  ok: false,
  statusCode: Number(cause?.response?.status || 0),
  message: cause?.response?.data?.message || fallbackMessage,
  flags: cause?.response?.data || {},
  cause,
});

export function readProfileCollectionLocation(search = "", { own = false } = {}) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const requested = text(params.get("tab")).toLowerCase();
  const savedRequested = own && ["bookmarks", "saved"].includes(requested);
  const collectionRequested = requested === "activity" || savedRequested;
  const section = savedRequested ? "bookmarks" : "activity";
  return {
    section,
    page: collectionRequested ? Math.max(1, Number.parseInt(params.get("page"), 10) || 1) : 1,
  };
}

export function writeProfileCollectionLocation(current, { section, page = 1 } = {}) {
  const params = new URLSearchParams(current);
  params.set("tab", section === "bookmarks" ? "bookmarks" : "activity");
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  return params;
}

export function normalizeProfileCollectionResponse(data = {}) {
  const pagination = data.pagination || {};
  const serverSection = text(pagination.section).toLowerCase();
  return {
    profileId: text(data.profileId),
    own: Boolean(data.own),
    counts: {
      activity: Math.max(0, Number(data.counts?.activity) || 0),
      bookmarks: data.counts?.saved == null ? null : Math.max(0, Number(data.counts.saved) || 0),
    },
    items: (Array.isArray(data.items) ? data.items : []).filter((item) => item && (item._id || item.id)),
    pagination: {
      section: serverSection === "saved" ? "bookmarks" : "activity",
      page: Math.max(1, Number(pagination.page) || 1),
      limit: Math.max(1, Number(pagination.limit) || 12),
      total: Math.max(0, Number(pagination.total) || 0),
      totalPages: Math.max(1, Number(pagination.totalPages) || 1),
      hasPrevious: Boolean(pagination.hasPrevious),
      hasNext: Boolean(pagination.hasNext),
      privateCollection: Boolean(pagination.privateCollection),
    },
  };
}

export async function loadProfileCollection({ profileId, section = "activity", page = 1, query = "", sort = "recent", signal } = {}) {
  const id = text(profileId);
  if (!id) return failure(null, "This profile cannot load activity.");
  try {
    const { data } = await api.get(`/users/${encodeURIComponent(id)}/profile-collections`, {
      params: {
        section: section === "bookmarks" ? "saved" : "activity",
        page,
        ...(section === "bookmarks" && text(query) ? { q: text(query).slice(0, 100) } : {}),
        ...(section === "bookmarks" && sort !== "recent" ? { sort } : {}),
      },
      signal,
    });
    return { ok: true, data: normalizeProfileCollectionResponse(data) };
  } catch (cause) {
    if (signal?.aborted || cause?.code === "ERR_CANCELED") return { ok: false, cancelled: true };
    return failure(cause, "Could not load this profile section.");
  }
}

export async function removeSavedProfileProject(projectId) {
  const id = text(projectId);
  if (!id) return failure(null, "This saved project is no longer available.");
  try {
    const { data } = await api.post(`/scripts/${encodeURIComponent(id)}/favorite`);
    if (data?.favorited !== false) return failure(null, "The project is still saved. Please try again.");
    return { ok: true, data: { projectId: id } };
  } catch (cause) {
    return failure(cause, "Could not remove this saved project.");
  }
}
