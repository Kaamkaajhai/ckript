import { asEnum, asInt, asTrimmedString } from "./requestValue.js";

export const TOP_LIST_SORTS = Object.freeze(["platform", "score", "views", "featured", "trending"]);
export const TOP_LIST_DEFAULT_LIMIT = 24;
export const TOP_LIST_MAX_LIMIT = 50;

// Top-list is a discovery summary, not a second reader endpoint. The first
// creator lookup is intentionally broad because it qualifies writer plans;
// these fields make that internal document and all script bodies impossible
// to serialize from either the legacy or paged response.
export const TOP_LIST_RESULT_EXCLUDE = Object.freeze({
  creatorDoc: 0,
  textContent: 0,
  fullContent: 0,
  fountainContent: 0,
  fileUrl: 0,
  scriptPreviewPageTexts: 0,
});

export function parseTopListQuery(query = {}) {
  return {
    sort: asEnum(query.sort, TOP_LIST_SORTS, "platform"),
    genre: asTrimmedString(query.genre, 80),
    contentType: asTrimmedString(query.contentType, 80),
    budget: asTrimmedString(query.budget, 40),
    premium: asEnum(query.premium, ["true", "false"], ""),
    page: asInt(query.page, { min: 1, max: 1000, fallback: 1 }),
    limit: asInt(query.limit, { min: 1, max: TOP_LIST_MAX_LIMIT, fallback: TOP_LIST_DEFAULT_LIMIT }),
    // Existing desktop and third-party consumers receive the historical bare
    // array. A caller opts into the additive envelope by asking for a page.
    paged: Object.prototype.hasOwnProperty.call(query, "page"),
  };
}

export function unpackTopListFacet(rows, { page, limit }) {
  const facet = Array.isArray(rows) ? rows[0] : null;
  const scripts = Array.isArray(facet?.scripts) ? facet.scripts : [];
  const total = Math.max(0, Number(facet?.meta?.[0]?.total || 0));
  return {
    scripts,
    pagination: {
      page,
      limit,
      total,
      hasMore: page * limit < total,
    },
  };
}
