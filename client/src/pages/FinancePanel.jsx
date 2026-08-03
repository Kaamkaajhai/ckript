import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import "./finance-panel.css";

/**
 * The finance panel — every payment in the product, in one read-only place.
 *
 * Built to be handed to an external accountant, which drives three decisions:
 *
 *   • It is NOT part of the admin console. Admin carries user management, moderation and plan
 *     grants; a bookkeeper should not be able to change the things they are auditing.
 *   • It reads only the LedgerEntry collection. The older sources disagree with each other, so
 *     figures assembled from them could not be reconciled against Razorpay.
 *   • Currencies are never summed together. Nothing records the FX rate at capture time, so a single
 *     "total revenue" number would be invented. One line per currency instead.
 */

const KINDS = [
  { value: "", label: "All types" },
  { value: "plan_subscription", label: "Plans" },
  { value: "competition_registration", label: "Challenge entries" },
  { value: "script_purchase", label: "Script purchases" },
  { value: "script_hold", label: "Script holds" },
  { value: "ai_trailer", label: "AI trailers" },
  { value: "credits", label: "Credits" },
  { value: "other", label: "Other" },
];

const SETTLEMENTS = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "granted", label: "Granted (free)" },
  { value: "reversed", label: "Refunded" },
];

const SYMBOL = { INR: "₹", USD: "$" };

/** Minor units → a display string. Never rounds to a "nice" number: these are books. */
const money = (minor, currency) =>
  `${SYMBOL[currency] || `${currency} `}${(Number(minor || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${new Date().toISOString().slice(0, 7)}-01`;

export default function FinancePanel() {
  // The server already 403s non-finance callers on every endpoint — this guard exists so a person
  // who is not the accountant sees a plain explanation instead of a panel shell full of errors.
  const { user } = useContext(AuthContext) || {};
  const allowed = ["finance", "admin"].includes(String(user?.role || ""));

  const [filters, setFilters] = useState({
    from: monthStart(), to: today(), kind: "", settlement: "", currency: "",
  });
  const [summary, setSummary] = useState(null);
  const [list, setList] = useState({ entries: [], page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const p = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [filters]);

  // `loading` is turned ON by the interaction that causes a fetch and OFF here, rather than being
  // set at the top of the effect: a synchronous setState in an effect body triggers a second render
  // pass before paint. It starts true for the initial load.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [s, l] = await Promise.all([
          api.get("/finance/summary", { params }),
          api.get("/finance/entries", { params: { ...params, page, limit: 50 } }),
        ]);
        if (cancelled) return;
        setSummary(s.data);
        setList(l.data);
        setError("");
      } catch (err) {
        // A superseded request must not overwrite the state of the one that replaced it.
        if (!cancelled) setError(err?.response?.data?.message || "Could not load the finance data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [params, page]);

  // Changing a filter must reset to page 1 — otherwise a narrower filter can land on a page that no
  // longer exists and the table reads as empty.
  const setFilter = (key, value) => {
    setLoading(true);
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };
  const goToPage = (next) => { setLoading(true); setPage(next); };

  const exportCsv = async () => {
    try {
      const { data } = await api.get("/finance/export.csv", { params, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `ckript-transactions-${today()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not export the transactions.");
    }
  };

  if (!allowed) {
    return (
      <div className="fin">
        <header className="fin-head">
          <div>
            <h1 className="fin-title">Payments</h1>
            <p className="fin-sub">
              This panel is for finance accounts. You are signed in as
              {user ? ` ${user.name || user.email} (${user.role})` : " no one"} — ask an
              administrator to grant finance access, or sign in with a finance account.
            </p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="fin">
      <header className="fin-head">
        <div>
          <h1 className="fin-title">Payments</h1>
          <p className="fin-sub">
            Every payment across Ckript — plans, challenge entries, scripts and trailers.
            Read-only.
          </p>
        </div>
        <button type="button" className="fin-btn" onClick={exportCsv}>Export CSV</button>
      </header>

      <section className="fin-filters" aria-label="Filters">
        <label className="fin-field">
          <span>From</span>
          <input type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
        </label>
        <label className="fin-field">
          <span>To</span>
          <input type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
        </label>
        <label className="fin-field">
          <span>Type</span>
          <select value={filters.kind} onChange={(e) => setFilter("kind", e.target.value)}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>
        <label className="fin-field">
          <span>Status</span>
          <select value={filters.settlement} onChange={(e) => setFilter("settlement", e.target.value)}>
            {SETTLEMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </section>

      {error ? <p className="fin-error" role="alert">{error}</p> : null}

      {/* Per currency, never combined — see the note at the top of this file. */}
      <section className="fin-cards" aria-label="Totals by currency">
        {(summary?.currencies || []).map((c) => (
          <div key={c.currency} className="fin-card">
            <div className="fin-card-k">Net revenue · {c.currency}</div>
            <div className="fin-card-v">{money(c.netMinor, c.currency)}</div>
            <div className="fin-card-m">
              {c.payments} payment{c.payments === 1 ? "" : "s"}
              {c.refunds ? ` · ${c.refunds} refunded (${money(c.refundedMinor, c.currency)})` : ""}
            </div>
          </div>
        ))}
        {summary && !summary.currencies.length && !loading ? (
          <p className="fin-empty">No payments in this period.</p>
        ) : null}
      </section>

      <div className="fin-split">
        <section className="fin-panel" aria-label="Revenue by type">
          <h2 className="fin-h2">By type</h2>
          {(summary?.byKind || []).length ? (
            <table className="fin-mini">
              <tbody>
                {summary.byKind.map((r) => (
                  <tr key={`${r.kind}-${r.currency}`}>
                    <td>{KINDS.find((k) => k.value === r.kind)?.label || r.kind}</td>
                    <td className="fin-num">{r.count}</td>
                    <td className="fin-num fin-strong">{money(r.netMinor, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="fin-empty">Nothing yet.</p>}
        </section>

        {/* Free access, and what it would have been worth. Previously invisible: a granted plan and
            a paid one are the same record on the user. */}
        <section className="fin-panel" aria-label="Granted access">
          <h2 className="fin-h2">Granted free <span className="fin-note">value foregone</span></h2>
          {(summary?.grants || []).length ? (
            <table className="fin-mini">
              <tbody>
                {summary.grants.map((r) => (
                  <tr key={`${r.kind}-${r.currency}`}>
                    <td>{KINDS.find((k) => k.value === r.kind)?.label || r.kind}</td>
                    <td className="fin-num">{r.count}</td>
                    <td className="fin-num">{money(r.forgoneMinor, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="fin-empty">No free grants in this period.</p>}
        </section>
      </div>

      <section className="fin-panel" aria-label="Transactions">
        <h2 className="fin-h2">Transactions <span className="fin-note">{list.total} total</span></h2>
        <div className="fin-scroll">
          <table className="fin-table">
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Description</th><th>User</th>
                <th>Status</th><th className="fin-num">Amount</th><th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {list.entries.map((e) => (
                <tr key={e._id}>
                  <td className="fin-mono">{new Date(e.occurredAt).toLocaleDateString()}</td>
                  <td>{KINDS.find((k) => k.value === e.kind)?.label || e.kind}</td>
                  <td>{e.label || "—"}</td>
                  <td>
                    {e.user?.name || "—"}
                    {e.user?.email ? <span className="fin-dim"> · {e.user.email}</span> : null}
                  </td>
                  <td><span className={`fin-tag fin-tag--${e.settlement}`}>{e.settlement}</span></td>
                  <td className="fin-num fin-strong">
                    {e.settlement === "granted"
                      ? <span className="fin-dim">{money(e.listPriceMinor, e.currency)}</span>
                      : money(e.amountMinor, e.currency)}
                  </td>
                  <td className="fin-mono fin-dim">{e.providerPaymentId || "—"}</td>
                </tr>
              ))}
              {!list.entries.length && !loading ? (
                <tr><td colSpan={7} className="fin-empty">No transactions match these filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {list.pages > 1 ? (
          <div className="fin-pager">
            <button type="button" onClick={() => goToPage(Math.max(1, page - 1))} disabled={page <= 1}>
              Previous
            </button>
            <span>Page {list.page} of {list.pages}</span>
            <button type="button" onClick={() => goToPage(Math.min(list.pages, page + 1))} disabled={page >= list.pages}>
              Next
            </button>
          </div>
        ) : null}
      </section>

      {loading ? <p className="fin-loading">Loading…</p> : null}
    </div>
  );
}
