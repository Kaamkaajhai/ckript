export const SEARCH_PAGE_SIZE = 10;

export const SEARCH_SCOPES = Object.freeze([
  { value: "all", label: "All" },
  { value: "projects", label: "Projects" },
  { value: "writers", label: "Writers" },
  { value: "investors", label: "Industry" },
]);

export const SEARCH_GENRES = Object.freeze([
  "Thriller", "Drama", "Comedy", "Sci-Fi", "Horror", "Romance",
  "Action", "Mystery", "Fantasy", "Animation", "Crime", "Adventure",
]);

export const SEARCH_CONTENT_TYPES = Object.freeze([
  { value: "movie", label: "Movie" },
  { value: "tv_series", label: "TV Series" },
  { value: "short_film", label: "Short Film" },
  { value: "web_series", label: "Web Series" },
  { value: "documentary", label: "Documentary" },
  { value: "micro_drama", label: "Micro Drama" },
  { value: "anime", label: "Anime" },
  { value: "book", label: "Book" },
  { value: "startup", label: "Startup" },
  { value: "songs", label: "Songs" },
  { value: "standup_comedy", label: "Stand-up Comedy" },
  { value: "dialogues", label: "Dialogues" },
  { value: "poet", label: "Poetry" },
]);

export const SEARCH_BUDGETS = Object.freeze([
  { value: "micro", label: "Micro" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "blockbuster", label: "Blockbuster" },
]);

export const SEARCH_PRICING = Object.freeze([
  { value: "all", label: "All projects" },
  { value: "free", label: "Free only" },
  { value: "premium", label: "Paid only" },
]);

export const SEARCH_SORTS = Object.freeze([
  { value: "newest", label: "Newest" },
  { value: "engagement", label: "Trending" },
  { value: "views", label: "Most viewed" },
  { value: "score", label: "Top rated" },
  { value: "price_high", label: "Highest price" },
  { value: "price_low", label: "Lowest price" },
]);

const allowed = (items, value, fallback) => (
  items.some((item) => (typeof item === "string" ? item : item.value) === value) ? value : fallback
);

export const EMPTY_SEARCH_STATE = Object.freeze({
  q: "",
  type: "all",
  genre: "",
  contentType: "",
  budget: "",
  pricing: "all",
  sort: "newest",
});

export function readSearchState(params) {
  const get = (key) => String(params?.get?.(key) || "").trim();
  return {
    q: get("q").slice(0, 120),
    type: allowed(SEARCH_SCOPES, get("type"), "all"),
    genre: allowed(SEARCH_GENRES, get("genre"), ""),
    contentType: allowed(SEARCH_CONTENT_TYPES, get("contentType"), ""),
    budget: allowed(SEARCH_BUDGETS, get("budget"), ""),
    pricing: allowed(SEARCH_PRICING, get("pricing"), "all"),
    sort: allowed(SEARCH_SORTS, get("sort"), "newest"),
  };
}

export function searchStateToParams(state = EMPTY_SEARCH_STATE) {
  const next = new URLSearchParams();
  if (state.q) next.set("q", state.q);
  if (state.type !== "all") next.set("type", state.type);
  if (state.genre) next.set("genre", state.genre);
  if (state.contentType) next.set("contentType", state.contentType);
  if (state.budget) next.set("budget", state.budget);
  if (state.pricing !== "all") next.set("pricing", state.pricing);
  if (state.sort !== "newest") next.set("sort", state.sort);
  return next;
}

export function buildSearchApiParams(state, page = 1) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim());
  params.set("type", state.type);
  params.set("sort", state.sort);
  params.set("page", String(page));
  params.set("limit", String(SEARCH_PAGE_SIZE));
  if (state.genre) params.set("genre", state.genre);
  if (state.contentType) params.set("contentType", state.contentType);
  if (state.budget) params.set("budget", state.budget);
  if (state.pricing === "premium") params.set("premium", "true");
  if (state.pricing === "free") params.set("premium", "false");
  return params;
}

export function hasSearchIntent(state) {
  return Boolean(
    state.q.trim()
      || state.genre
      || state.contentType
      || state.budget
      || state.pricing !== "all",
  );
}

export function activeSearchFilters(state) {
  const labels = [];
  if (state.genre) labels.push({ key: "genre", label: state.genre, reset: "" });
  if (state.contentType) {
    labels.push({
      key: "contentType",
      label: SEARCH_CONTENT_TYPES.find((item) => item.value === state.contentType)?.label || state.contentType,
      reset: "",
    });
  }
  if (state.budget) {
    const label = SEARCH_BUDGETS.find((item) => item.value === state.budget)?.label || state.budget;
    labels.push({ key: "budget", label: `${label} budget`, reset: "" });
  }
  if (state.pricing !== "all") {
    labels.push({
      key: "pricing",
      label: SEARCH_PRICING.find((item) => item.value === state.pricing)?.label || state.pricing,
      reset: "all",
    });
  }
  if (state.sort !== "newest") {
    labels.push({
      key: "sort",
      label: SEARCH_SORTS.find((item) => item.value === state.sort)?.label || state.sort,
      reset: "newest",
    });
  }
  return labels;
}

const distinctById = (items) => {
  const seen = new Set();
  return (items || []).filter((item) => {
    const id = String(item?._id || item?.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export function normalizeSearchPage(data = {}) {
  const users = distinctById(data.users);
  const scripts = distinctById(data.scripts);
  const userMeta = data?.pagination?.users;
  const scriptMeta = data?.pagination?.scripts;
  return {
    users,
    scripts,
    page: Number(data?.pagination?.page || 1),
    limit: Number(data?.pagination?.limit || SEARCH_PAGE_SIZE),
    usersTotal: Math.max(users.length, Number(userMeta?.total || 0)),
    scriptsTotal: Math.max(scripts.length, Number(scriptMeta?.total || 0)),
    usersHasMore: Boolean(userMeta?.hasMore),
    scriptsHasMore: Boolean(scriptMeta?.hasMore),
  };
}

export function appendSearchPage(current, incoming) {
  return {
    ...incoming,
    users: distinctById([...(current?.users || []), ...incoming.users]),
    scripts: distinctById([...(current?.scripts || []), ...incoming.scripts]),
  };
}
