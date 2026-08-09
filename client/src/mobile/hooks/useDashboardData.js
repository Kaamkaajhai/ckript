import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { readCache, writeCache } from "../../utils/localCache";
import { buildDashboardModel } from "../data/dashboardModel";
import { DASHBOARD_PREVIEW_DATA } from "../data/dashboardData";

/*
 * useDashboardData — the writer dashboard's data session.
 *
 * Deliberately the same three calls, the same cache namespace and the same
 * stale-while-revalidate behaviour as `pages/Dashboard.jsx`, because they are
 * the same dashboard for the same user. A phone that has visited before paints
 * the real numbers immediately from cache and revalidates behind them; only a
 * genuinely cold session sees a skeleton.
 *
 * What changed on 2026-08-07 (plan §11 Phase 2)
 * ---------------------------------------------
 *  • The raw → view mapping moved out to `data/dashboardModel.js`, where it can
 *    be tested against the payload shapes in `server/controllers/dashboard
 *    Controller.js`. That is how the review-mapping defect was found: this hook
 *    read `review.score`/`review.summary`, the server sends `rating`/`feedback`.
 *  • A total failure used to `console.error` and leave `data` null, so the
 *    screen rendered its pending skeleton forever with no error and no retry.
 *    There is now an explicit `error` with a `refresh()` the screen can offer.
 *  • The cache is shared with desktop, so switching form factors mid-session
 *    does not throw away the snapshot the other one just wrote.
 */

// Same namespace and version as pages/Dashboard.jsx — one cache, both clients.
// Bump both together if the cached payload shape changes.
const DASH_CACHE_NS = "dashboard:v1:";

export function useDashboardData(user, { preview = false } = {}) {
  const cacheKey = user?._id ? `${DASH_CACHE_NS}${user._id}` : null;

  /*
   * Read the cache once, during the first render, so the first paint is the
   * real dashboard rather than a skeleton that is immediately replaced.
   * A ref (guarded on `undefined`) rather than an effect: an effect would let
   * one skeleton frame paint before the cached data arrives.
   */
  const cachedRef = useRef();
  if (cachedRef.current === undefined) {
    cachedRef.current = preview ? null : (cacheKey ? readCache(cacheKey) : null);
  }
  const cached = cachedRef.current;

  const [raw, setRaw] = useState(() => (cached || null));
  // A mirror of `raw` readable inside the async fetch without making it a
  // dependency — reading it from state there would either capture a stale
  // closure or restart the fetch on every successful load.
  const rawRef = useRef(cached || null);
  const [data, setData] = useState(() => {
    if (preview) return DASHBOARD_PREVIEW_DATA;
    return cached ? buildDashboardModel({ ...cached, user }) : null;
  });
  const [loading, setLoading] = useState(() => !preview && !cached);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const disposed = useRef(false);
  useEffect(() => {
    disposed.current = false;
    return () => { disposed.current = true; };
  }, []);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (preview) return;
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);

    try {
      const [scriptsRes, statsRes, reviewsRes] = await Promise.allSettled([
        api.get("/scripts/mine?includeCollaborations=1"),
        api.get("/dashboard"),
        api.get("/dashboard/reviews"),
      ]);

      if (disposed.current) return;

      /*
       * Every leg failing is a real error the user must be told about. Some
       * legs failing is not: keep whatever that section already showed rather
       * than blanking a good list because an unrelated call timed out. This is
       * the desktop rule, and the reason all three calls are `allSettled`.
       */
      const settled = [scriptsRes, statsRes, reviewsRes];
      if (settled.every((r) => r.status === "rejected")) {
        throw settled[0].reason || new Error("Dashboard request failed");
      }

      const prev = rawRef.current;
      const next = {
        scripts: scriptsRes.status === "fulfilled" && Array.isArray(scriptsRes.value.data)
          ? scriptsRes.value.data
          : (prev?.scripts || []),
        stats: statsRes.status === "fulfilled"
          ? (statsRes.value.data?.stats ?? statsRes.value.data ?? null)
          : (prev?.stats || null),
        reviews: reviewsRes.status === "fulfilled"
          ? (reviewsRes.value.data ?? null)
          : (prev?.reviews || null),
      };
      rawRef.current = next;
      setRaw(next);
      setData(buildDashboardModel({ ...next, user }));
    } catch (cause) {
      if (!disposed.current) setError(cause);
    } finally {
      if (!disposed.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [preview, user]);

  useEffect(() => {
    if (preview) {
      setData(DASHBOARD_PREVIEW_DATA);
      setLoading(false);
      return;
    }
    // With a cache hit the first request is a revalidation, not a cold load, so
    // it must not raise the skeleton over content the user is already reading.
    fetchData({ silent: Boolean(cachedRef.current) });
  }, [fetchData, preview]);

  /*
   * Persist the freshest snapshot for the next visit — and for desktop. Only
   * once past the skeleton, so a half-loaded state is never what gets cached.
   */
  useEffect(() => {
    if (preview || !cacheKey || loading || !raw) return;
    if (!writeCache(cacheKey, raw, { prune: "dashboard:" })) {
      // A power user's full project list can blow the quota; a trimmed snapshot
      // still beats a cold start next time.
      writeCache(
        cacheKey,
        { ...raw, scripts: (raw.scripts || []).slice(0, 24) },
        { prune: "dashboard:" }
      );
    }
  }, [cacheKey, loading, preview, raw]);

  const refresh = useCallback(() => fetchData({ silent: Boolean(data) }), [fetchData, data]);

  return { data, loading, error, refreshing, refresh };
}

export default useDashboardData;
