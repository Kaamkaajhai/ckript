/*
 * useDrawerCollection — the drawer's contextual list of recent things.
 *
 * The drawer used to hardcode "My Projects": a writer-only fetch of
 * /scripts/mine, filtered and sorted inline in the shell component. That made
 * the shell un-reusable — a producer opening the same drawer would either see a
 * writer's project list or nothing, and giving them a Watchlist meant another
 * `if (role === …)` branch inside the shell.
 *
 * Now the audience's nav preset declares WHAT to show:
 *
 *   collection: { title: "Watchlist", endpoint: "/users/watchlist" }
 *
 * and this hook handles the how. Both endpoints happen to return an array of
 * Scripts, so one code path serves both; `select` covers any per-audience
 * filtering.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../services/api";
import { getScriptCanonicalPath } from "../../../utils/scriptPath";

/* The drawer is navigation, not a list page — five entries is the useful depth. */
const MAX_ENTRIES = 5;

const timeOf = (item) =>
  new Date(item?.updatedAt || item?.createdAt || 0).getTime() || 0;

/**
 * @param {Object} options
 * @param {{title: string, endpoint: string, select?: Function}|null} options.collection
 * @param {boolean} options.active  whether the drawer is open
 * @returns {{ title: string, entries: Array<{id: string, title: string, path: string}>, loading: boolean }}
 */
export function useDrawerCollection({ collection, active }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  /*
   * Fetch on the FIRST open only, never on mount. The drawer is closed on every
   * page load, so fetching eagerly would add a request to every single
   * navigation for a list most users never look at.
   */
  const loadedEndpoint = useRef(null);

  const endpoint = collection?.endpoint || null;
  const select = collection?.select;

  const load = useCallback(async (signal) => {
    if (!endpoint) return;
    setLoading(true);
    try {
      const { data } = await api.get(endpoint, { signal });
      const list = Array.isArray(data) ? data : [];

      const mapped = list
        .map((item) => (select ? select(item) : item))
        .filter(Boolean)
        .sort((a, b) => timeOf(b) - timeOf(a))
        .slice(0, MAX_ENTRIES)
        .map((item) => ({
          id: item._id,
          title: item.title || "Untitled",
          path: getScriptCanonicalPath(item),
        }))
        // A record with no canonical path would render a link to nowhere.
        .filter((entry) => entry.id && entry.path);

      setEntries(mapped);
      loadedEndpoint.current = endpoint;
    } catch {
      /*
       * Leave loadedEndpoint unset so the next open retries. A transient failure
       * should not permanently empty the drawer for the rest of the session.
       */
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, select]);

  useEffect(() => {
    if (!active || !endpoint) return undefined;
    if (loadedEndpoint.current === endpoint) return undefined;

    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [active, endpoint, load]);

  /* Switching audience (or signing out) must not leave stale entries behind. */
  useEffect(() => {
    if (loadedEndpoint.current && loadedEndpoint.current !== endpoint) {
      loadedEndpoint.current = null;
      setEntries([]);
    }
  }, [endpoint]);

  return {
    title: collection?.title || "",
    entries: endpoint ? entries : [],
    loading,
  };
}

export default useDrawerCollection;
