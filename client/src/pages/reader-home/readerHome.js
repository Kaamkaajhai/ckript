import api from "../../services/api";
import { loadReaderProfile } from "../reader-profile/readerProfile";

export const READER_HOME_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  FAILED: "failed",
});

export const READER_DISCOVER_PAGE_SIZE = 12;

export const READER_DISCOVER_GENRES = Object.freeze([
  "Thriller", "Drama", "Comedy", "Sci-Fi", "Horror", "Romance",
  "Action", "Mystery", "Fantasy", "Animation", "Crime", "Adventure",
]);

export const READER_DISCOVER_FORMATS = Object.freeze([
  { value: "", label: "All formats" },
  { value: "movie", label: "Movie" },
  { value: "tv_series", label: "TV series" },
  { value: "short_film", label: "Short film" },
  { value: "web_series", label: "Web series" },
  { value: "documentary", label: "Documentary" },
  { value: "micro_drama", label: "Micro drama" },
]);

const text = (value) => String(value ?? "").trim();
const uniqueProjects = (items) => {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((project) => {
    const id = text(project?._id || project?.id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const allowedGenre = (value) => READER_DISCOVER_GENRES.includes(value) ? value : "";
const allowedFormat = (value) => READER_DISCOVER_FORMATS.some((item) => item.value === value) ? value : "";

export function readReaderDiscoverQuery(search = "") {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  return {
    q: text(params.get("q")).slice(0, 120),
    genre: allowedGenre(text(params.get("genre"))),
    category: allowedFormat(text(params.get("category"))),
    page: Math.max(1, Number.parseInt(params.get("page"), 10) || 1),
  };
}

export function writeReaderDiscoverQuery(current = "", patch = {}) {
  const next = { ...readReaderDiscoverQuery(current), ...patch };
  const params = new URLSearchParams();
  if (text(next.q)) params.set("q", text(next.q).slice(0, 120));
  if (allowedGenre(next.genre)) params.set("genre", next.genre);
  if (allowedFormat(next.category)) params.set("category", next.category);
  const page = Math.max(1, Number.parseInt(next.page, 10) || 1);
  if (page > 1) params.set("page", String(page));
  return params;
}

export function normalizeReaderDiscoverPage(payload = {}) {
  const scripts = uniqueProjects(payload.scripts);
  const requestedPage = Math.max(1, Number(payload.page) || 1);
  const total = Math.max(scripts.length, Number(payload.total) || 0);
  const totalPages = Math.max(1, Number(payload.totalPages) || Math.ceil(total / READER_DISCOVER_PAGE_SIZE) || 1);
  const page = Math.min(requestedPage, totalPages);
  return {
    scripts,
    page,
    total,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}

const failure = (cause, fallback) => ({
  ok: false,
  cancelled: cause?.code === "ERR_CANCELED",
  message: cause?.response?.data?.message || fallback,
  cause,
});

export async function loadReaderDiscover({ query = {}, signal } = {}) {
  const normalized = readReaderDiscoverQuery(writeReaderDiscoverQuery("", query));
  try {
    const { data } = await api.get("/scripts/reader-search", {
      params: {
        page: normalized.page,
        limit: READER_DISCOVER_PAGE_SIZE,
        ...(normalized.q ? { q: normalized.q } : {}),
        ...(normalized.genre ? { genre: normalized.genre } : {}),
        ...(normalized.category ? { category: normalized.category } : {}),
      },
      signal,
    });
    return { ok: true, data: normalizeReaderDiscoverPage(data) };
  } catch (cause) {
    if (signal?.aborted) return { ok: false, cancelled: true };
    return failure(cause, "Reader discovery is unavailable right now.");
  }
}

const settledData = (result) => result?.status === "fulfilled" && result.value?.ok
  ? result.value.data
  : null;

export async function loadReaderHome({ readerId, signal } = {}) {
  const id = text(readerId);
  if (!id) return { ok: false, message: "Reader account unavailable." };

  const results = await Promise.allSettled([
    loadReaderDiscover({ query: { page: 1 }, signal }),
    loadReaderProfile({ profileId: id, section: "read", page: 1, signal }),
    loadReaderProfile({ profileId: id, section: "favorites", page: 1, signal }),
  ]);
  if (signal?.aborted) return { ok: false, cancelled: true };

  const fresh = settledData(results[0]);
  const read = settledData(results[1]);
  const favorites = settledData(results[2]);
  if (!fresh && !read && !favorites) {
    const firstFailure = results.find((result) => result.status === "fulfilled" && result.value?.message);
    return { ok: false, message: firstFailure?.value?.message || "Your reader home could not be loaded." };
  }

  return {
    ok: true,
    data: {
      fresh: fresh?.scripts || [],
      read: read?.items || [],
      favorites: favorites?.items || [],
      counts: {
        read: read?.counts?.read ?? null,
        favorites: favorites?.counts?.favorites ?? null,
      },
      degraded: {
        fresh: !fresh,
        read: !read,
        favorites: !favorites,
      },
    },
  };
}
