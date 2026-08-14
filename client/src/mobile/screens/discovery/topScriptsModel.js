import {
  SEARCH_CONTENT_TYPES,
  SEARCH_GENRES,
  SEARCH_PRICING,
} from "./searchModel";

export const TOP_SCRIPTS_PAGE_SIZE = 12;
export const TOP_SCRIPTS_GENRES = SEARCH_GENRES;
export const TOP_SCRIPTS_CONTENT_TYPES = SEARCH_CONTENT_TYPES;
export const TOP_SCRIPTS_PRICING = SEARCH_PRICING;
/*
 * DEF-20: the value is `medium`, not `mid`. `Script.budget`'s enum is
 * ["micro","low","medium","high","blockbuster"], and the desktop Top page has
 * offered `mid` since it shipped — a facet that matched nothing, on every
 * ranking. `/search` and `/featured` always used `medium`, so the three
 * discovery pages disagreed with each other. The ranges stay: they are the
 * only place the product states what a budget band means.
 */
export const TOP_SCRIPTS_BUDGETS = Object.freeze([
  { value: "micro", label: "Micro (under ₹10L)" },
  { value: "low", label: "Low (₹10L–₹1Cr)" },
  { value: "medium", label: "Medium (₹1Cr–₹10Cr)" },
  { value: "high", label: "High (₹10Cr–₹100Cr)" },
  { value: "blockbuster", label: "Blockbuster (over ₹100Cr)" },
]);

export const TOP_SCRIPTS_SORTS = Object.freeze([
  { value: "platform", label: "Top ranked", description: "Overall Ckript score", metric: "Ckript score" },
  { value: "score", label: "AI score", description: "Script quality evaluation", metric: "AI score" },
  { value: "views", label: "Most viewed", description: "Total project views", metric: "views" },
  { value: "featured", label: "Featured", description: "Verified services and engagement", metric: "engagement" },
  { value: "trending", label: "Trending", description: "Current reads, reviews, and views", metric: "trend score" },
]);

const allowed = (items, value, fallback) => (
  items.some((item) => (typeof item === "string" ? item : item.value) === value) ? value : fallback
);

export const EMPTY_TOP_SCRIPTS_STATE = Object.freeze({
  sort: "platform",
  genre: "",
  contentType: "",
  budget: "",
  pricing: "all",
});

export function readTopScriptsState(params) {
  const get = (key) => String(params?.get?.(key) || "").trim();
  return {
    sort: allowed(TOP_SCRIPTS_SORTS, get("sort"), "platform"),
    genre: allowed(TOP_SCRIPTS_GENRES, get("genre"), ""),
    contentType: allowed(TOP_SCRIPTS_CONTENT_TYPES, get("contentType"), ""),
    budget: allowed(TOP_SCRIPTS_BUDGETS, get("budget"), ""),
    pricing: allowed(TOP_SCRIPTS_PRICING, get("pricing"), "all"),
  };
}

export function topScriptsStateToParams(state = EMPTY_TOP_SCRIPTS_STATE) {
  const params = new URLSearchParams();
  if (state.sort !== "platform") params.set("sort", state.sort);
  if (state.genre) params.set("genre", state.genre);
  if (state.contentType) params.set("contentType", state.contentType);
  if (state.budget) params.set("budget", state.budget);
  if (state.pricing !== "all") params.set("pricing", state.pricing);
  return params;
}

export function buildTopScriptsApiParams(state, page = 1) {
  const params = new URLSearchParams();
  params.set("sort", state.sort);
  params.set("page", String(page));
  params.set("limit", String(TOP_SCRIPTS_PAGE_SIZE));
  if (state.genre) params.set("genre", state.genre);
  if (state.contentType) params.set("contentType", state.contentType);
  if (state.budget) params.set("budget", state.budget);
  if (state.pricing === "premium") params.set("premium", "true");
  if (state.pricing === "free") params.set("premium", "false");
  return params;
}

export function activeTopScriptsFilters(state) {
  const filters = [];
  if (state.genre) filters.push({ key: "genre", label: state.genre, reset: "" });
  if (state.contentType) {
    filters.push({
      key: "contentType",
      label: TOP_SCRIPTS_CONTENT_TYPES.find((item) => item.value === state.contentType)?.label || state.contentType,
      reset: "",
    });
  }
  if (state.budget) {
    filters.push({
      key: "budget",
      label: TOP_SCRIPTS_BUDGETS.find((item) => item.value === state.budget)?.label || state.budget,
      reset: "",
    });
  }
  if (state.pricing !== "all") {
    filters.push({
      key: "pricing",
      label: TOP_SCRIPTS_PRICING.find((item) => item.value === state.pricing)?.label || state.pricing,
      reset: "all",
    });
  }
  return filters;
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

export function normalizeTopScriptsPage(data) {
  const legacy = Array.isArray(data);
  const scripts = distinctById(legacy ? data : data?.scripts);
  const meta = legacy ? null : data?.pagination;
  return {
    scripts,
    page: Number(meta?.page || 1),
    limit: Number(meta?.limit || TOP_SCRIPTS_PAGE_SIZE),
    total: Math.max(scripts.length, Number(meta?.total || scripts.length)),
    hasMore: Boolean(meta?.hasMore),
  };
}

export function appendTopScriptsPage(current, incoming) {
  const scripts = distinctById([...(current?.scripts || []), ...incoming.scripts]);
  return { ...incoming, scripts, total: Math.max(incoming.total, scripts.length) };
}

const numeric = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function describeTopScriptMetric(project, sort) {
  if (sort === "score") {
    return { value: Math.round(numeric(project?.scriptScore?.overall)), label: "AI score" };
  }
  if (sort === "views") {
    return { value: numeric(project?.views).toLocaleString(), label: "views" };
  }
  if (sort === "featured") {
    return { value: Math.round(numeric(project?.engagementScore)), label: "engagement" };
  }
  if (sort === "trending") {
    return { value: Math.round(numeric(project?.trendScore)), label: "trend score" };
  }
  const score = typeof project?.platformScore === "object"
    ? project.platformScore?.overall
    : project?.platformScore;
  return { value: Math.round(numeric(score)), label: "Ckript score" };
}
