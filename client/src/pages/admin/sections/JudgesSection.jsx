import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../dashboardShared";
import {
  Badge, Button, Card, ConfirmDialog, DataTable, Dialog, EmptyState,
  Field, Input, SectionHeader, Select, ToastProvider, useToast,
} from "../ui";

/**
 * Judge accounts and their panel assignments.
 *
 * A judge is a login the admin creates, not a platform user who applied — so this screen owns the
 * whole lifecycle: create the account, send the invite, put them on a panel, watch the progress,
 * take them off again.
 *
 * THE ADMIN NEVER SEES A JUDGE'S PASSWORD, and that is the point rather than an oversight. Creating
 * an account issues a one-time link; the judge sets their own secret from it. If the admin chose the
 * password they could sign in as that judge and score in their name, and "every score is
 * attributable to a named judge" would be a convention rather than something the system enforces.
 *
 * The link is shown once — only its hash is stored — so the dialog says so and offers a copy button
 * rather than implying it can be fetched again later.
 */

function JudgesWorkspace() {
  const toast = useToast();
  const [judges, setJudges] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [issued, setIssued] = useState(null);        // { judge, invitePath } — shown once
  const [assigning, setAssigning] = useState(null);  // the judge being assigned
  const [assignTo, setAssignTo] = useState("");
  const [revoking, setRevoking] = useState(null);    // { judge, competition }
  const [busy, setBusy] = useState(false);

  // Refetching is a counter the effect depends on, so the cleanup flag lives in the effect body
  // where it actually works — a cleanup returned from an async function is a promise React discards.
  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminApi.get("/admin/judges"), adminApi.get("/admin/competitions")])
      .then(([j, c]) => {
        if (cancelled) return;
        setJudges(j.data.judges || []);
        setCompetitions(c.data.competitions || c.data || []);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || "Could not load judges.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tick]);

  const createJudge = async () => {
    setBusy(true);
    try {
      const { data } = await adminApi.post("/admin/judges", { name: form.name.trim(), email: form.email.trim() });
      setIssued(data);
      setCreating(false);
      setForm({ name: "", email: "" });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not create the judge.");
    } finally {
      setBusy(false);
    }
  };

  const resendInvite = async (judge) => {
    setBusy(true);
    try {
      const { data } = await adminApi.post(`/admin/judges/${judge._id}/resend-invite`);
      setIssued(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not re-issue the invite.");
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    if (!assignTo) return;
    setBusy(true);
    try {
      await adminApi.post(`/admin/competitions/${assignTo}/judges`, { judgeId: assigning._id });
      toast.success(`${assigning.name} added to the panel.`);
      setAssigning(null);
      setAssignTo("");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not assign the judge.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await adminApi.delete(`/admin/competitions/${revoking.competitionId}/judges/${revoking.judgeId}`);
      toast.success("Assignment revoked.");
      setRevoking(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not revoke the assignment.");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "name", header: "Judge" },
    { key: "email", header: "Email", hideable: true },
    {
      key: "assignments",
      header: "Panels",
      sortValue: (row) => (row.assignments || []).filter((a) => a.status === "active").length,
      render: (row) => {
        const active = (row.assignments || []).filter((a) => a.status === "active");
        if (!active.length) return <span className="ckjs-muted">Not assigned</span>;
        return (
          <div className="ckjs-panels">
            {active.map((a) => (
              <span key={String(a.competitionId)} className="ckjs-panel">
                {a.name}
                <b className="ckad-num">{a.submittedCount} scored</b>
                <button
                  type="button"
                  className="ckjs-x"
                  aria-label={`Remove ${row.name} from ${a.name}`}
                  onClick={() => setRevoking({ judgeId: row._id, competitionId: a.competitionId, judgeName: row.name, name: a.name })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: 120,
      sortValue: (row) => (row.isFrozen ? "frozen" : row.inviteAccepted ? "active" : "invited"),
      render: (row) => {
        if (row.isFrozen) return <Badge tone="danger">Frozen</Badge>;
        // "Invited" is not a lesser kind of active — until they accept, no password exists that
        // opens this account at all, so the admin needs to see who has not set one yet.
        if (!row.inviteAccepted) return <Badge tone="warn">Invite sent</Badge>;
        return <Badge tone="success">Active</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      width: 210,
      render: (row) => (
        <div className="ckjs-actions">
          <Button size="sm" onClick={() => { setAssigning(row); setAssignTo(""); }}>Assign</Button>
          <Button size="sm" variant="ghost" onClick={() => resendInvite(row)} disabled={busy}>
            {row.inviteAccepted ? "Reset access" : "New invite link"}
          </Button>
        </div>
      ),
    },
  ];

  // Only competitions this judge is not already actively on — offering a panel they are already on
  // just produces a 409 the admin has to read.
  const assignable = assigning
    ? competitions.filter(
      (c) => !(assigning.assignments || []).some((a) => String(a.competitionId) === String(c._id) && a.status === "active")
    )
    : [];

  return (
    <>
      <SectionHeader title="Judges" count={judges.length}>
        <Button variant="primary" onClick={() => setCreating(true)}>Create judge</Button>
      </SectionHeader>

      {error ? <div className="ade" role="alert">{error}</div> : null}

      <Card flush>
        <DataTable
          columns={columns}
          rows={judges}
          loading={loading}
          searchPlaceholder="Search judges…"
          empty={{
            title: "No judges yet",
            body: "Create a judge account, send them the invite link, then assign them to the competitions they will score.",
          }}
        />
      </Card>

      {/* ── Create ─────────────────────────────────────────────────────────── */}
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Create a judge"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button variant="primary" onClick={createJudge} disabled={busy || !form.name.trim() || !form.email.trim()}>
              Create
            </Button>
          </>
        )}
      >
        <p className="ckjs-note">
          This creates a login and a one-time link the judge uses to set their own password. Use an
          address that is not already a Ckript account — an existing account keeps whatever it is
          being used for, so judges get their own.
        </p>
        <Field label="Name" required>
          {(props) => <Input {...props} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />}
        </Field>
        <Field label="Email" required>
          {(props) => <Input {...props} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />}
        </Field>
      </Dialog>

      {/* ── The password, shown once ───────────────────────────────────────── */}
      <Dialog
        open={Boolean(issued)}
        onClose={() => setIssued(null)}
        title="Judge invite link"
        footer={issued ? (
          <>
            <Button
              onClick={() => {
                navigator.clipboard
                  ?.writeText(`${window.location.origin}${issued.invitePath}`)
                  .then(() => toast.success("Link copied."))
                  .catch(() => toast.error("Could not copy — select the link instead."));
              }}
            >
              Copy link
            </Button>
            <Button variant="primary" onClick={() => setIssued(null)}>Done</Button>
          </>
        ) : null}
      >
        {issued ? (
          <>
            <p className="ckjs-note">
              Send this link to <strong>{issued.judge.email}</strong>. They choose their own password
              from it — <strong>you never see it</strong>, which is what keeps every score attributable
              to the judge who cast it.
              {" "}<strong>Shown once.</strong> The link is not stored anywhere and cannot be retrieved;
              if it is lost, issue a new one.
            </p>
            <div className="ckjs-cred">
              <div><span>One-time invite link</span><code>{`${window.location.origin}${issued.invitePath}`}</code></div>
              {issued.inviteExpiresAt ? (
                <div><span>Expires</span><code>{new Date(issued.inviteExpiresAt).toLocaleString()}</code></div>
              ) : null}
            </div>
          </>
        ) : null}
      </Dialog>

      {/* ── Assign ────────────────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title={`Assign ${assigning?.name || ""}`}
        footer={assignable.length ? (
          <>
            <Button variant="ghost" onClick={() => setAssigning(null)}>Cancel</Button>
            <Button variant="primary" onClick={assign} disabled={busy || !assignTo}>Assign</Button>
          </>
        ) : null}
      >
        {assignable.length ? (
          <>
            <Field label="Competition">
              {(props) => (
                <Select {...props} value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                  <option value="">Choose a competition…</option>
                  {assignable.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </Select>
              )}
            </Field>
          </>
        ) : (
          <EmptyState title="Nothing to assign" body="This judge is already on every competition." />
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(revoking)}
        title="Remove from this panel?"
        body={
          revoking
            ? `${revoking.judgeName} will lose access to ${revoking.name} on their next request. Scores they have already submitted are kept and still count — void a specific score if you need it discounted.`
            : ""
        }
        confirmLabel="Remove"
        danger
        loading={busy}
        onConfirm={revoke}
        onClose={() => setRevoking(null)}
      />
    </>
  );
}

export default function JudgesSection() {
  return (
    <ToastProvider>
      <JudgesWorkspace />
    </ToastProvider>
  );
}
