import { parseMongoObjectId } from "./mongoId.js";

/**
 * Turn an untrusted request value into a typed primitive, at the point where it enters a query.
 *
 * middleware/sanitizeRequest.js already strips Mongo operators from every request, and that is the
 * control that actually stops `{"email": {"$ne": null}}`. These helpers are the second lock, and they
 * exist for two reasons the middleware cannot cover:
 *
 *   1. A guarantee held one layer away is one refactor from being gone. A handler that reads
 *      `req.body.userId` and hands it straight to `findById` is correct only for as long as the
 *      middleware stays mounted above it.
 *   2. Static analysis cannot see middleware. CodeQL traces `req.query.x` into a query object and
 *      reports it, and it is right to: nothing in the handler proves the value is a string. Coercing
 *      here is what makes the handler self-evidently safe, to a reader and to a scanner.
 *
 * They are also better behaviour. `findById("not-an-id")` throws a CastError that surfaces as a 500;
 * `asObjectId` returns null, so the handler can answer 400 with something the caller can act on.
 */

/** A string, trimmed and length-capped. Never an object, never an array. */
export const asTrimmedString = (value, maxLength = 200) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

/** A validated ObjectId, or null. Re-exported so call sites need one import, not two. */
export const asObjectId = parseMongoObjectId;

/**
 * An integer inside a range.
 *
 * Pagination is the usual caller: `.skip((page - 1) * limit)` with a non-numeric page produces NaN,
 * which Mongo rejects at the driver, and an unbounded limit is a way to ask for the whole collection.
 */
export const asInt = (value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = min } = {}) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

/** One of `allowed`, or the fallback. Comparison is on the coerced string, never the raw value. */
export const asEnum = (value, allowed, fallback = "") => {
  const text = typeof value === "string" ? value.trim() : "";
  return allowed.includes(text) ? text : fallback;
};

/** Every character that means something to a regex engine. */
const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

export const escapeRegex = (value) => String(value ?? "").replace(REGEX_METACHARACTERS, "\\$&");

/**
 * A case-insensitive "contains" regex built from user input, or null when there is nothing to search.
 *
 * Escaped AND length-bounded. Unescaped, a search for "(((((" is a regex-injection and the engine's
 * problem; bounded, a very long pattern is still a database's problem rather than a user's search.
 */
export const asSearchRegex = (value, { maxLength = 120 } = {}) => {
  const text = asTrimmedString(value, maxLength);
  if (!text) return null;
  return new RegExp(escapeRegex(text), "i");
};

export default { asTrimmedString, asObjectId, asInt, asEnum, escapeRegex, asSearchRegex };
