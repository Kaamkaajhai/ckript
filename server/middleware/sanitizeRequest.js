/**
 * Strip MongoDB operators out of request data before it can reach a query.
 *
 * Mongoose casts a string to a string, but it does NOT stop an object arriving where a string was
 * expected. A body of `{"email": {"$ne": null}}` turns `User.findOne({ email })` into "find any user
 * at all", and `{"$gt": ""}` does the same for most comparisons. That is the whole shape of the
 * "database query built from user-controlled sources" class — roughly forty-five of them across
 * fourteen controllers — and it is fixed once here rather than forty-five times at the call sites.
 *
 * The project already depended on express-mongo-sanitize, but nothing ever called it, so it was
 * providing no protection at all. It also cannot be used as-is: version 2 reassigns `req.query`, and
 * in Express 5 that property is a getter, so mounting it would throw on every request. This walks
 * the objects and deletes offending keys IN PLACE, which is what Express 5 permits.
 *
 * Keys are removed, not escaped. A request that legitimately needed a key named `$ne` does not
 * exist in this application — no client payload uses one, and no handler reads one — so silently
 * dropping it is safe, and rewriting it to `_ne` would only move the surprise somewhere else.
 */

/** Prototype-pollution keys. Distinct from Mongo operators, same fix: they must never be assigned. */
const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isForbiddenKey = (key) =>
  key.startsWith("$") ||        // a Mongo operator: $ne, $gt, $where, $function…
  key.includes(".") ||          // dot-notation, which reaches nested paths in an update
  POLLUTION_KEYS.has(key);

/**
 * Depth cap. A deeply nested body is cheap to send and expensive to walk, so the recursion is
 * bounded rather than trusting the payload to be reasonable. Real request data is nowhere near this.
 */
const MAX_DEPTH = 12;

const scrub = (value, depth, removed) => {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) scrub(item, depth + 1, removed);
    return;
  }

  // Own keys only: an inherited key is not something the parser put there.
  for (const key of Object.keys(value)) {
    if (isForbiddenKey(key)) {
      delete value[key];
      removed.push(key);
      continue;
    }
    scrub(value[key], depth + 1, removed);
  }
};

/**
 * Express middleware. Cleans req.body, req.params and req.query.
 *
 * Body and params are ordinary objects and are scrubbed in place. `req.query` is not: in Express 5
 * it is a lazy getter that PARSES THE QUERY STRING AFRESH ON EVERY ACCESS, so the object you read is
 * not the object the handler will read, and deleting a key from it is silently discarded. (This is
 * also why express-mongo-sanitize cannot be used — it assigns to `req.query`, and assigning to a
 * getter-only property throws.) The fix is to read once, scrub that snapshot, and shadow the
 * prototype getter with an own property, which every later read then sees.
 */
const sanitizeRequest = (req, _res, next) => {
  const removed = [];

  for (const source of [req.body, req.params]) {
    if (source && typeof source === "object") scrub(source, 0, removed);
  }

  try {
    const query = req.query;
    if (query && typeof query === "object") {
      scrub(query, 0, removed);
      Object.defineProperty(req, "query", {
        value: query,
        writable: false,
        enumerable: true,
        configurable: true,
      });
    }
  } catch (error) {
    // Losing query sanitisation is worse than noisy, so it is reported rather than swallowed — but
    // it must not take the request down, since body and params were cleaned above.
    console.warn("[sanitize] could not sanitise req.query:", error?.message || error);
  }

  if (removed.length) {
    // Observable on purpose: a spike here is somebody probing for operator injection, and a filter
    // that works silently is one nobody notices has stopped working.
    console.warn(
      `[sanitize] stripped ${removed.length} forbidden key(s) from ${req.method} ${req.originalUrl}:`,
      [...new Set(removed)].join(", "),
    );
  }

  next();
};

export default sanitizeRequest;
export { isForbiddenKey, scrub };
