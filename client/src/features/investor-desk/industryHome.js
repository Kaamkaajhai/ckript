import api from "../../services/api";

export const INDUSTRY_HOME_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  FAILED: "failed",
});

export const INDUSTRY_HOME_SORTS = Object.freeze(["match", "new", "reads", "rating", "price"]);

const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const text = (value) => String(value ?? "").trim();

export function normalizeIndustryFeed(payload = {}) {
  return {
    detectedGenres: list(payload.detectedGenres),
    genreSections: list(payload.genreSections).map((section) => ({
      genre: text(section?.genre),
      scripts: list(section?.scripts),
    })).filter((section) => section.genre && section.scripts.length),
    trending: list(payload.trending),
    newReleases: list(payload.newReleases),
    explore: list(payload.explore),
  };
}

export function readIndustryHomeQuery(search = "") {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const sort = text(params.get("sort")).toLowerCase();
  return {
    shelf: text(params.get("shelf")) || "all",
    sort: INDUSTRY_HOME_SORTS.includes(sort) ? sort : "match",
  };
}

export function writeIndustryHomeQuery(current = "", patch = {}) {
  const params = current instanceof URLSearchParams
    ? new URLSearchParams(current)
    : new URLSearchParams(current);
  const next = { ...readIndustryHomeQuery(params), ...patch };
  if (next.shelf && next.shelf !== "all") params.set("shelf", next.shelf);
  else params.delete("shelf");
  if (next.sort && next.sort !== "match") params.set("sort", next.sort);
  else params.delete("sort");
  return params;
}

const failed = (cause, message) => ({
  ok: false,
  cancelled: cause?.code === "ERR_CANCELED",
  message: cause?.response?.data?.message || message,
  cause,
});

export async function loadIndustryHome({ signal } = {}) {
  const [feedResult, profileResult] = await Promise.allSettled([
    api.get("/scripts/investor-home", { signal }),
    api.get("/users/me", { signal }),
  ]);

  if (signal?.aborted) return { ok: false, cancelled: true };

  let feed;
  let degraded = false;
  if (feedResult.status === "fulfilled") {
    feed = normalizeIndustryFeed(feedResult.value.data);
  } else {
    degraded = true;
    try {
      const { data } = await api.get("/scripts/latest", { signal, params: { limit: 12 } });
      feed = normalizeIndustryFeed({ trending: data });
    } catch (cause) {
      if (signal?.aborted) return { ok: false, cancelled: true };
      return failed(cause, "We couldn't load the industry desk just now.");
    }
  }

  return {
    ok: true,
    data: {
      feed,
      profile: profileResult.status === "fulfilled" ? profileResult.value.data : null,
      profileFailed: profileResult.status === "rejected",
      degraded,
    },
  };
}

export async function recordIndustryHomeOpen(projectId, { signal } = {}) {
  const id = text(projectId);
  if (!id) return { ok: false, message: "Project unavailable." };
  try {
    await api.post(`/scripts/${encodeURIComponent(id)}/interactions`, {
      type: "click",
      source: "investor_desk",
      metadata: { from: "lead" },
    }, { signal });
    return { ok: true };
  } catch (cause) {
    if (signal?.aborted) return { ok: false, cancelled: true };
    return failed(cause, "The project opened, but its desk interaction was not recorded.");
  }
}
