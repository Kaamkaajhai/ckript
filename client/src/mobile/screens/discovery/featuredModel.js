/*
 * featuredModel.js — the URL contract and paging shape for the native
 * `/featured` screen (D27).
 *
 * WHAT THIS FILE IS NOT
 * ---------------------
 * It is not a second copy of the broadsheet's business rules. Spotlight
 * windows, mandate fit, "why this leads", score provenance and the compact
 * metric formatters all live in `features/featured-broadsheet/
 * featuredBroadsheet.js`, are already unit tested there, and are imported by
 * both platforms (§5.4). Duplicating them is how the two surfaces would start
 * disagreeing about which projects are paid placement — the one thing this
 * page must never get wrong.
 *
 * What lives here is what desktop does not have: state that belongs in the
 * URL, and a bounded server page.
 */
import {
  SEARCH_CONTENT_TYPES,
  SEARCH_GENRES,
  SEARCH_PRICING,
} from "./searchModel";
import { TOP_SCRIPTS_BUDGETS } from "./topScriptsModel";
import {
  getReads,
  getScore,
  getViews,
  formatCount,
} from "../../../features/featured-broadsheet/featuredBroadsheet";

export const FEATURED_PAGE_SIZE = 12;
export const FEATURED_GENRES = SEARCH_GENRES;
export const FEATURED_CONTENT_TYPES = SEARCH_CONTENT_TYPES;
export const FEATURED_PRICING = SEARCH_PRICING;
export const FEATURED_BUDGETS = TOP_SCRIPTS_BUDGETS;

/*
 * The six sorts `GET /scripts` actually implements. `engagement` and
 * `platform` are aggregation branches; the rest are index sorts. Desktop
 * exposes the same six, so this is the server's contract rather than a
 * mobile subset.
 */
export const FEATURED_SORTS = Object.freeze([
  { value: "engagement", label: "Trending", description: "Views weighted by reads", metric: "engagement" },
  { value: "score", label: "Top rated", description: "Evaluation score", metric: "score" },
  { value: "views", label: "Most viewed", description: "Total project views", metric: "views" },
  { value: "price_high", label: "Highest priced", description: "Most expensive first", metric: "price" },
  { value: "price_low", label: "Lowest priced", description: "Least expensive first", metric: "price" },
  { value: "createdAt", label: "Newest", description: "Most recently published", metric: "published" },
]);

const allowed = (items, value, fallback) => (
  items.some((item) => (typeof item === "string" ? item : item.value) === value) ? value : fallback
);

export const EMPTY_FEATURED_STATE = Object.freeze({
  sort: "engagement",
  genre: "",
  contentType: "",
  budget: "",
  pricing: "all",
});

export function readFeaturedState(params) {
  const get = (key) => String(params?.get?.(key) || "").trim();
  return {
    sort: allowed(FEATURED_SORTS, get("sort"), "engagement"),
    genre: allowed(FEATURED_GENRES, get("genre"), ""),
    contentType: allowed(FEATURED_CONTENT_TYPES, get("contentType"), ""),
    budget: allowed(FEATURED_BUDGETS, get("budget"), ""),
    pricing: allowed(FEATURED_PRICING, get("pricing"), "all"),
  };
}

export function featuredStateToParams(state = EMPTY_FEATURED_STATE) {
  const params = new URLSearchParams();
  if (state.sort !== "engagement") params.set("sort", state.sort);
  if (state.genre) params.set("genre", state.genre);
  if (state.contentType) params.set("contentType", state.contentType);
  if (state.budget) params.set("budget", state.budget);
  if (state.pricing !== "all") params.set("pricing", state.pricing);
  return params;
}

/*
 * The ranked-list request. `goldOnly` is not a mobile decision — it is what
 * makes this the FEATURED list rather than the whole catalogue, and desktop
 * sends it too.
 */
export function buildFeaturedApiParams(state, page = 1) {
  const params = new URLSearchParams();
  params.set("sort", state.sort);
  params.set("page", String(page));
  params.set("limit", String(FEATURED_PAGE_SIZE));
  params.set("goldOnly", "true");
  if (state.genre) params.set("genre", state.genre);
  if (state.contentType) params.set("contentType", state.contentType);
  if (state.budget) params.set("budget", state.budget);
  if (state.pricing === "premium") params.set("premium", "true");
  if (state.pricing === "free") params.set("premium", "false");
  return params;
}

/*
 * The editorial set is ranked server-side and is not filtered by the facets:
 * shelf 01 answers "who is paying for placement right now", which the viewer's
 * genre filter does not change. It is bounded so the screen never asks for an
 * unbounded collection even here.
 */
export function buildFeaturedEditorialParams(page = 1) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(FEATURED_PAGE_SIZE));
  return params;
}

export function activeFeaturedFilters(state) {
  const filters = [];
  if (state.genre) filters.push({ key: "genre", label: state.genre, reset: "" });
  if (state.contentType) {
    filters.push({
      key: "contentType",
      label: FEATURED_CONTENT_TYPES.find((item) => item.value === state.contentType)?.label || state.contentType,
      reset: "",
    });
  }
  if (state.budget) {
    filters.push({
      key: "budget",
      label: FEATURED_BUDGETS.find((item) => item.value === state.budget)?.label || state.budget,
      reset: "",
    });
  }
  if (state.pricing !== "all") {
    filters.push({
      key: "pricing",
      label: FEATURED_PRICING.find((item) => item.value === state.pricing)?.label || state.pricing,
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

export function normalizeFeaturedPage(data) {
  const legacy = Array.isArray(data);
  const scripts = distinctById(legacy ? data : data?.scripts);
  const meta = legacy ? null : data?.pagination;
  return {
    scripts,
    page: Number(meta?.page || 1),
    limit: Number(meta?.limit || FEATURED_PAGE_SIZE),
    total: Math.max(scripts.length, Number(meta?.total || scripts.length)),
    hasMore: Boolean(meta?.hasMore),
  };
}

export function appendFeaturedPage(current, incoming) {
  const scripts = distinctById([...(current?.scripts || []), ...incoming.scripts]);
  return { ...incoming, scripts, total: Math.max(incoming.total, scripts.length) };
}

/**
 * The number the active sort ranks on, stated in words on every card.
 *
 * `price_high` and `price_low` rank on the same field, so they share a metric
 * — a card under "Lowest priced" states the price, not the direction.
 */
export function describeFeaturedMetric(project, sort) {
  if (sort === "views") return { value: formatCount(getViews(project)), label: "views" };
  if (sort === "score") {
    const score = getScore(project);
    return score ? { value: `${score}/100`, label: "score" } : { value: "Not", label: "evaluated" };
  }
  if (sort === "price_high" || sort === "price_low") {
    return project?.premium
      ? { value: `₹${Number(project?.price || 0).toLocaleString()}`, label: "price" }
      : { value: "Free", label: "to read" };
  }
  if (sort === "createdAt") {
    const at = project?.publishedAt || project?.createdAt;
    const when = at ? new Date(at) : null;
    return Number.isFinite(when?.getTime())
      ? { value: when.toLocaleDateString(undefined, { month: "short", year: "numeric" }), label: "published" }
      : { value: "—", label: "published" };
  }
  return { value: formatCount(getViews(project) + getReads(project) * 2), label: "engagement" };
}

/**
 * Shelf 01's membership. The server already ranks spotlight placements first,
 * but "is this placement still running" is a date comparison the client must
 * make against its own clock, because a response cached for an hour can
 * outlive the window it describes.
 */
export { isSpotlightActive, getSpotlightLabel, getWhyLead, getMandate, matchesMandate, getMandateMatches } from "../../../features/featured-broadsheet/featuredBroadsheet";
