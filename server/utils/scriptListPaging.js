import { asInt } from "./requestValue.js";

export const SCRIPT_LIST_DEFAULT_LIMIT = 24;
export const SCRIPT_LIST_MAX_LIMIT = 50;

/*
 * A list response is a discovery summary, never a second reader endpoint.
 * `fullContent` was already stripped by hand in getScripts ("Locked full
 * content"), but three sibling fields carry the same screenplay and one
 * carries the private asset URL, and all four escaped (DEF-21). Naming them
 * once here means a Script that grows a new body field is excluded by
 * changing this list rather than by remembering to edit two sanitizers.
 */
export const SCRIPT_LIST_BODY_FIELDS = Object.freeze([
  "fullContent",
  "textContent",
  "fountainContent",
  "fileUrl",
  "scriptPreviewPageTexts",
]);

/** The `$project` form, for the aggregation branch. */
export const SCRIPT_LIST_RESULT_EXCLUDE = Object.freeze(
  Object.fromEntries(SCRIPT_LIST_BODY_FIELDS.map((field) => [field, 0])),
);

/** The object form, for a sanitizer that already holds a plain object. */
export function stripScriptBody(script) {
  const out = { ...script };
  SCRIPT_LIST_BODY_FIELDS.forEach((field) => { delete out[field]; });
  return out;
}

/**
 * Paging is opt-in on presence of `page`, exactly as `parseTopListQuery` does
 * it: existing desktop and third-party callers pass no `page` and keep the
 * historical bare array, byte for byte.
 *
 * `limit` is honoured on BOTH paths. Callers have been passing it to
 * `GET /scripts` since long before this plan and receiving the whole
 * collection instead (DEF-22), so reading it is a correction, not a new
 * feature — and an unbounded list endpoint is what made DEF-21 expensive as
 * well as unsafe.
 */
export function parseScriptListPaging(query = {}) {
  const has = (key) => Object.prototype.hasOwnProperty.call(query, key);
  return {
    page: asInt(query.page, { min: 1, max: 1000, fallback: 1 }),
    limit: asInt(query.limit, { min: 1, max: SCRIPT_LIST_MAX_LIMIT, fallback: SCRIPT_LIST_DEFAULT_LIMIT }),
    paged: has("page"),
    limited: has("limit"),
  };
}

export function buildScriptListPagination({ page, limit, total }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  return {
    page,
    limit,
    total: safeTotal,
    hasMore: page * limit < safeTotal,
  };
}

export function unpackScriptListFacet(rows, { page, limit }) {
  const facet = Array.isArray(rows) ? rows[0] : null;
  const scripts = Array.isArray(facet?.scripts) ? facet.scripts : [];
  return {
    scripts,
    pagination: buildScriptListPagination({ page, limit, total: facet?.meta?.[0]?.total }),
  };
}
