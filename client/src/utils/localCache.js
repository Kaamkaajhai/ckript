/*
 * localCache.js — tiny namespaced localStorage cache with TTL + bulk clear.
 *
 * Purpose: stale-while-revalidate. Read a cached snapshot instantly on mount,
 * render it, then refresh from the network in the background and write the fresh
 * copy back. The next visit paints immediately from cache.
 *
 * Every operation is wrapped in try/catch and guards for missing storage, so
 * private mode, disabled storage, sandboxed iframes, SSR/prerender (no window),
 * and quota-exceeded never throw into the UI — they just degrade to "no cache".
 *
 * On-disk shape:  ck_cache_<key>  ->  { "t": <written-at ms>, "d": <payload> }
 * The shared `ck_cache_` prefix makes entries easy to find and clear in bulk.
 */

const PREFIX = "ck_cache_";
const DAY = 24 * 60 * 60 * 1000;

const store = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null; // access itself can throw (sandboxed iframe, blocked cookies)
  }
};

/**
 * Read a cached value.
 * @param {string} key      logical key (without the ck_cache_ prefix)
 * @param {number} [maxAge] max age in ms; pass 0 to disable the age check. Default 24h.
 * @returns the stored payload, or null if missing / unparseable / expired.
 */
export function readCache(key, maxAge = DAY) {
  const ls = store();
  if (!ls || !key) return null;
  try {
    const raw = ls.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.t !== "number") return null;
    if (maxAge > 0 && Date.now() - parsed.t > maxAge) {
      ls.removeItem(PREFIX + key); // evict expired entries as we find them
      return null;
    }
    return parsed.d ?? null;
  } catch {
    return null;
  }
}

/**
 * Write a value.
 * @param {string} key                logical key (without the prefix)
 * @param {*}      data               JSON-serializable payload
 * @param {object} [opts]
 * @param {string} [opts.prune]       logical prefix whose sibling entries (other
 *                                    users / older versions) are removed first,
 *                                    keeping the cache bounded to one live entry.
 * @returns {boolean} true if the write succeeded.
 */
export function writeCache(key, data, { prune } = {}) {
  const ls = store();
  if (!ls || !key) return false;
  const fullKey = PREFIX + key;
  try {
    if (prune) clearCacheByPrefix(prune, fullKey);
    ls.setItem(fullKey, JSON.stringify({ t: Date.now(), d: data }));
    return true;
  } catch {
    // Quota exceeded or value not serializable — drop this key so we never leave
    // a half-written entry, and let the caller decide whether to retry smaller.
    try { ls.removeItem(fullKey); } catch { /* ignore */ }
    return false;
  }
}

/** Remove a single cached key. */
export function clearCache(key) {
  const ls = store();
  if (!ls || !key) return;
  try { ls.removeItem(PREFIX + key); } catch { /* ignore */ }
}

/**
 * Remove every cache entry under a logical prefix.
 * @param {string} prefix        logical prefix (without ck_cache_)
 * @param {string} [keepFullKey] a fully-prefixed key to preserve (skip)
 */
export function clearCacheByPrefix(prefix, keepFullKey) {
  const ls = store();
  if (!ls) return;
  try {
    const full = PREFIX + prefix;
    // Iterate backwards — removeItem shifts indices.
    for (let i = ls.length - 1; i >= 0; i--) {
      const k = ls.key(i);
      if (k && k.startsWith(full) && k !== keepFullKey) ls.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
