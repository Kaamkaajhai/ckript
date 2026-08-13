import { asEnum, asInt, asSearchRegex, asTrimmedString } from "./requestValue.js";

export const SEARCH_TYPES = Object.freeze(["all", "projects", "users", "writers", "investors"]);
export const SEARCH_SORTS = Object.freeze([
  "newest",
  "views",
  "score",
  "price_high",
  "price_low",
  "engagement",
]);

export const SEARCH_DEFAULT_LIMIT = 30;
export const SEARCH_MAX_LIMIT = 30;

// Search results are discovery summaries, never an alternate script-reader
// endpoint. Keeping the allowlist here makes it reviewable and testable: a new
// private Script field cannot leak merely because the model gained it.
export const SEARCH_SCRIPT_RESULT_PROJECT = Object.freeze({
  _id: 1,
  sid: 1,
  title: 1,
  description: 1,
  logline: 1,
  synopsis: 1,
  coverImage: 1,
  primaryGenre: 1,
  genre: 1,
  contentType: 1,
  format: 1,
  formatOther: 1,
  budget: 1,
  premium: 1,
  price: 1,
  pageCount: 1,
  status: 1,
  holdStatus: 1,
  isSold: 1,
  verifiedBadge: 1,
  rating: 1,
  reviewCount: 1,
  readsCount: 1,
  views: 1,
  unlockCount: 1,
  viewCount: 1,
  scriptScore: 1,
  platformScore: 1,
  promotion: 1,
  billing: 1,
  createdAt: 1,
  publishedAt: 1,
  creator: 1,
});

export const SEARCH_USER_RESULT_PROJECT = Object.freeze({
  _id: 1,
  sid: 1,
  name: 1,
  username: 1,
  role: 1,
  bio: 1,
  skills: 1,
  profileImage: 1,
  "writerProfile.username": 1,
  "writerProfile.genres": 1,
  "writerProfile.specializedTags": 1,
  "writerProfile.wgaMember": 1,
  "writerProfile.sgaMember": 1,
  "writerProfile.representationStatus": 1,
  followerCount: { $size: { $ifNull: ["$followers", []] } },
  followingCount: { $size: { $ifNull: ["$following", []] } },
});

export function parseSearchQuery(query = {}) {
  return {
    q: asTrimmedString(query.q, 120),
    regex: asSearchRegex(query.q, { maxLength: 120 }),
    type: asEnum(query.type, SEARCH_TYPES, "all"),
    role: asTrimmedString(query.role, 40),
    genre: asTrimmedString(query.genre, 80),
    contentType: asTrimmedString(query.contentType, 80),
    budget: asTrimmedString(query.budget, 40),
    premium: asEnum(query.premium, ["true", "false"], ""),
    sort: asEnum(query.sort, SEARCH_SORTS, "newest"),
    page: asInt(query.page, { min: 1, max: 1000, fallback: 1 }),
    limit: asInt(query.limit, {
      min: 1,
      max: SEARCH_MAX_LIMIT,
      fallback: SEARCH_DEFAULT_LIMIT,
    }),
  };
}

export function getScriptSearchSort(sort = "newest") {
  const stable = { _id: -1 };
  if (sort === "views") return { views: -1, ...stable };
  if (sort === "score") return { "scriptScore.overall": -1, ...stable };
  if (sort === "price_high") return { price: -1, ...stable };
  if (sort === "price_low") return { price: 1, _id: 1 };
  if (sort === "engagement") return { unlockCount: -1, views: -1, ...stable };
  return { publishedAt: -1, createdAt: -1, ...stable };
}

export function unpackSearchFacet(rows, { page, limit }) {
  const facet = Array.isArray(rows) ? rows[0] : null;
  const items = Array.isArray(facet?.items) ? facet.items : [];
  const total = Math.max(0, Number(facet?.meta?.[0]?.total || 0));
  return {
    items,
    total,
    hasMore: page * limit < total,
  };
}
