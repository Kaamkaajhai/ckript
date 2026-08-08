import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import { buildHoldsModel } from "../data/holdsModel";

/*
 * useHoldsData — the offers-and-holds screen's data session.
 *
 * Deliberately simpler than `useDashboardData`, and the differences are
 * decisions rather than omissions:
 *
 *  • ONE call, so there is no partial-failure story to tell. The dashboard uses
 *    `Promise.allSettled` because three independent sections must survive one
 *    another's failures; here a failed request means there is nothing to show,
 *    and the honest response is the error state with a retry.
 *
 *  • NO localStorage cache. The dashboard caches because it is the app's home
 *    screen and a cold skeleton on every visit is the cost. This screen's whole
 *    subject is a countdown — a cached "6 days left" painted before the network
 *    answers is exactly the class of stale-but-plausible number the 2026-08-07
 *    audit was about. A skeleton that resolves is better than a confident lie.
 *
 *  • THE CLOCK IS STATE, not `new Date()` read during render. Every row's group
 *    and countdown derives from now, so a session left open overnight would
 *    otherwise keep rendering yesterday's "1 day left" until something unrelated
 *    re-rendered it. The clock ticks hourly, which is the coarsest interval that
 *    cannot show a wrong whole-day count.
 */

// One hour. Rows are labelled in whole days, so anything finer re-renders the
// list for a number that cannot have changed.
const CLOCK_INTERVAL_MS = 60 * 60 * 1000;

export function useHoldsData({ enabled = true } = {}) {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const disposed = useRef(false);
  useEffect(() => {
    disposed.current = false;
    return () => { disposed.current = true; };
  }, []);

  const fetchHolds = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) return;
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);

    try {
      const { data } = await api.get("/scripts/holds");
      if (disposed.current) return;
      // The controller responds with the array directly (`res.json(options)`),
      // but a proxy or error page can substitute an object; coercing here keeps
      // that out of the model, which is entitled to assume an array or nothing.
      setRaw(Array.isArray(data) ? data : []);
      // Re-reading the clock on every load keeps the countdown honest after a
      // manual refresh, without waiting for the hourly tick.
      setNow(new Date());
    } catch (cause) {
      if (!disposed.current) setError(cause);
    } finally {
      if (!disposed.current) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => { fetchHolds(); }, [fetchHolds]);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setNow(new Date()), CLOCK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled]);

  // Keyed on `now` as well as `raw`: the same payload genuinely produces a
  // different model tomorrow, which is the point of the tick above.
  const data = useMemo(
    () => (raw === null ? null : buildHoldsModel(raw, { now })),
    [raw, now]
  );

  const refresh = useCallback(() => fetchHolds({ silent: Boolean(raw) }), [fetchHolds, raw]);

  return { data, loading, error, refreshing, refresh };
}

export default useHoldsData;
