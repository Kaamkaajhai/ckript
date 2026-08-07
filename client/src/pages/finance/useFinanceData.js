import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";

/**
 * Data for the payment sections that moved out of the admin console.
 *
 * Deliberately mirrors the SHAPE the sections already consumed in AdminDashboard — `rows`, `page`,
 * `total`, `totalPages`, a search string and a `refresh()` — so each section moved across without
 * its rendering being rewritten. What changed is only where the data comes from: `/api/finance/*`
 * behind financeOnly, rather than `/api/admin/*` behind adminOnly.
 *
 * One section is loaded at a time (the shell renders one), so this fetches for the active section
 * only. Requests are cancel-guarded: switching sections mid-flight must never let a stale response
 * overwrite the new section's rows.
 */

/** Section key → the endpoint and the response field its rows live under. */
const SOURCES = {
  payments: { url: "/finance/payments", key: "transactions" },
  invoices: { url: "/finance/invoices", key: "invoices" },
  purchases: { url: "/finance/purchases", key: "scripts" },
  premium: { url: "/finance/users", key: "users", params: { isPremium: true, role: "investor" } },
  "writer-plans": { url: "/finance/users", key: "users", params: { hasActiveWriterPlan: true } },
  "bank-reviews": { url: "/finance/bank-reviews", key: "reviews" },
};

export default function useFinanceData(section, search) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  // Reset to page 1 when the section or search term changes — adjusted DURING RENDER, which is the
  // pattern React sanctions for "derive state from a changed input". Doing it in an effect would
  // fetch page 3 of the new section first and then correct itself, showing a wrong result set for
  // one round trip.
  const queryKey = `${section || ""}|${search || ""}`;
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (queryKey !== lastQueryKey) {
    setLastQueryKey(queryKey);
    setPage(1);
  }

  const source = section ? SOURCES[section] : null;

  useEffect(() => {
    if (!source) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get(source.url, {
          params: { page, search: search || undefined, ...(source.params || {}) },
        });
        if (cancelled) return;
        setRows(Array.isArray(data?.[source.key]) ? data[source.key] : []);
        setTotal(Number(data?.total) || 0);
        setTotalPages(Number(data?.totalPages) || 1);
        setError("");
      } catch (err) {
        // A superseded request must never overwrite the state of the one that replaced it.
        if (!cancelled) {
          setError(err?.response?.data?.message || "Could not load this section.");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [source, page, search, reloadToken]);

  /** Re-fetch after a control action (a grant, a bank-review decision) changes the data. */
  const refresh = useCallback(() => { setLoading(true); setReloadToken((t) => t + 1); }, []);
  const goToPage = useCallback((next) => { setLoading(true); setPage(next); }, []);

  return useMemo(() => ({
    // With no active section (the ledger tab owns its own data) this reports an empty, settled
    // state rather than whatever the previously-viewed section left behind.
    rows: source ? rows : [],
    total: source ? total : 0,
    totalPages: source ? totalPages : 1,
    loading: source ? loading : false,
    error: source ? error : "",
    page,
    refresh,
    setPage: goToPage,
  }), [source, rows, total, totalPages, loading, error, page, refresh, goToPage]);
}
