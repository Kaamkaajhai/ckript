import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, DataTable, SectionHeader, StatusPill } from "../ui";
import { EXTERNAL_EVENT_PROVIDERS, providerName } from "../../../data/externalEventProviders";
import ProviderMark from "../../../components/ProviderMark";
import api from "../../../services/api";

/**
 * Claims that someone already paid to enter a challenge on another platform.
 *
 * This queue is unlike the rest of the console: there is nothing to verify automatically. A reviewer
 * is matching a name, a phone number and a booking ID against what the entrant says they bought on
 * Luma or BookMyShow, so the screen's whole job is to put those four things in front of them at once
 * and make the two decisions one click each.
 *
 * Rejection REQUIRES a reason. It is not politeness: the entrant can resubmit, and a rejection with
 * no explanation gives them nothing to correct, which turns a fixable typo into a lost entry.
 */

const day = (value) => (value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function ExternalRegistrationsSection() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("pending");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState("");
  const [token, setToken] = useState(0);
  const [notes, setNotes] = useState({});
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/admin/external-registrations", {
          params: { status: status || undefined, provider: provider || undefined, limit: 100 },
        });
        if (cancelled) return;
        setRows(Array.isArray(data?.requests) ? data.requests : []);
        setTotal(Number(data?.total) || 0);
        setError("");
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || "Could not load registration claims.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [status, provider, token]);

  const refresh = useCallback(() => { setLoading(true); setToken((t) => t + 1); }, []);

  // Escape closes the proof dialog and focus returns to where it was. Declaring aria-modal without
  // this is a promise to assistive tech that the rest of the page is inert, while it stays reachable.
  const closeButtonRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    if (!preview) return undefined;
    openerRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === "Escape") setPreview(null); };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [preview]);

  const decide = async (row, decision) => {
    const note = (notes[row._id] || "").trim();
    if (decision === "reject" && !note) {
      setActionError("Write a reason before rejecting — the entrant needs to know what to fix.");
      return;
    }
    setBusy(`${decision}-${row._id}`);
    try {
      await api.put(`/admin/external-registrations/${row._id}/${decision}`, { note });
      setNotes((n) => ({ ...n, [row._id]: "" }));
      setActionError("");
      refresh();
    } catch (err) {
      setActionError(err?.response?.data?.message || "That action could not be completed.");
    } finally {
      setBusy("");
    }
  };

  const columns = [
    {
      key: "entrant",
      header: "Entrant",
      sortable: true,
      sortValue: (r) => r.user?.name || "",
      render: (r) => (
        <>
          {r.user?.name || "—"}
          <span className="adtb-sub">{r.user?.email}</span>
        </>
      ),
    },
    {
      key: "platform",
      header: "Platform",
      sortable: true,
      sortValue: (r) => r.provider || "",
      render: (r) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ProviderMark slug={r.provider} size={20} />
          {providerName(r.provider)}
        </span>
      ),
    },
    {
      key: "claim",
      header: "Claimed as",
      // The point of the screen: the name and number they used THERE, which often differ from the
      // Ckript account above and are most of what the reviewer is comparing.
      render: (r) => (
        <>
          {r.fullName}
          <span className="adtb-sub">{r.phone}</span>
        </>
      ),
    },
    {
      key: "ref",
      header: "Reference",
      // The clash matters more than the reference itself: one third-party ticket admitting two people
      // is what this queue is most exposed to, and every claim looks ordinary on its own.
      render: (r) => (
        <>
          <span className="ckad-mono">{r.externalRef}</span>
          {r.duplicateOf ? (
            <span className="adtb-sub" style={{ color: "var(--ad-danger)", fontWeight: 600 }}>
              Already approved for {r.duplicateOf.name || r.duplicateOf.email}
            </span>
          ) : null}
        </>
      ),
    },
    {
      key: "proof",
      header: "Proof",
      render: (r) => (r.screenshotUrl ? (
        <Button size="sm" variant="ghost" onClick={() => setPreview(r)}>View</Button>
      ) : <span className="adtb-sub">None</span>),
    },
    {
      key: "attempt",
      header: "Try",
      sortable: true,
      sortValue: (r) => r.attempt || 1,
      // A fourth attempt is a signal in itself, so it is shown rather than buried in the history.
      render: (r) => (r.attempt > 1 ? <Badge tone="warn">#{r.attempt}</Badge> : <span className="adtb-sub">1st</span>),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => <StatusPill status={r.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      sortable: true,
      sortValue: (r) => new Date(r.createdAt || 0).getTime(),
      render: (r) => day(r.createdAt),
    },
    {
      key: "actions",
      header: "",
      sortValue: () => "",
      render: (r) => (r.status === "approved" ? (
        <span className="adtb-sub">Approved {day(r.reviewedAt)}</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
          <input
            className="adf-control"
            placeholder="Reason (required to reject)"
            value={notes[r._id] || ""}
            onChange={(e) => setNotes((n) => ({ ...n, [r._id]: e.target.value }))}
            aria-label={`Reason for ${r.user?.name || "this entrant"}`}
          />
          <span className="adtb-rowactions">
            <Button
              size="sm"
              variant="ghost"
              loading={busy === `approve-${r._id}`}
              disabled={Boolean(busy)}
              onClick={() => decide(r, "approve")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="adtb-danger"
              loading={busy === `reject-${r._id}`}
              disabled={Boolean(busy)}
              onClick={() => decide(r, "reject")}
            >
              Reject
            </Button>
          </span>
        </div>
      )),
    },
  ];

  return (
    <div>
      <SectionHeader title="Third-party registrations" count={total || rows.length}>
        <label className="adf-selectwrap" style={{ minWidth: 150 }}>
          <span className="ckad-sr-only">Status</span>
          <select
            className="adf-control adf-control--select"
            value={status}
            onChange={(e) => { setLoading(true); setStatus(e.target.value); }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
          <span className="adf-selectcaret" aria-hidden="true">▾</span>
        </label>
        <label className="adf-selectwrap" style={{ minWidth: 160 }}>
          <span className="ckad-sr-only">Platform</span>
          <select
            className="adf-control adf-control--select"
            value={provider}
            onChange={(e) => { setLoading(true); setProvider(e.target.value); }}
          >
            <option value="">All platforms</option>
            {EXTERNAL_EVENT_PROVIDERS.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
          <span className="adf-selectcaret" aria-hidden="true">▾</span>
        </label>
      </SectionHeader>

      {actionError ? (
        <div className="ade" role="alert" style={{ marginBottom: "var(--ad-s3)" }}>
          <p className="ade-body">{actionError}</p>
        </div>
      ) : null}

      {total > rows.length ? (
        // Never silently: a queue that stops at 100 while 140 wait is a queue that loses people.
        <p className="adst-label" style={{ marginBottom: "var(--ad-s3)" }}>
          Showing the {rows.length} most recent of {total}. Filter by status or platform to narrow it.
        </p>
      ) : null}

      <Card flush>
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={refresh}
          searchPlaceholder="Search by name, phone or reference…"
          pageSize={25}
          exportName="third-party-registrations"
          empty={{
            title: "Nothing waiting",
            body: "Claims from Luma, BookMyShow, FilmFreeway and the rest appear here for review.",
          }}
        />
      </Card>

      {preview ? (
        <div
          className="ado ado--dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Registration proof"
          onClick={() => setPreview(null)}
        >
          <div className="ado-backdrop" />
          <div className="ado-panel" onClick={(e) => e.stopPropagation()}>
            <div className="adc" style={{ maxWidth: 720, width: "100%" }}>
              <div className="adc-head">
                <div>
                  <h3 className="adc-title">{preview.fullName}</h3>
                  <p className="adc-desc">
                    {providerName(preview.provider)} · <span className="ckad-mono">{preview.externalRef}</span>
                  </p>
                </div>
                <Button ref={closeButtonRef} size="sm" variant="ghost" onClick={() => setPreview(null)}>Close</Button>
              </div>
              <div className="adc-body">
                <img
                  src={preview.screenshotUrl}
                  alt={`Proof of registration submitted by ${preview.fullName}`}
                  style={{ width: "100%", height: "auto", borderRadius: 6, border: "1px solid var(--ad-line)" }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
