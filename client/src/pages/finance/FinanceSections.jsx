import { formatCurrency } from "../../utils/currency";
import { Badge, Button, Card, DataTable, SectionHeader, StatusPill } from "../admin/ui";

/**
 * The payment surfaces that moved out of the admin console.
 *
 * Each takes rows plus an `actions` object that is NULL for a finance viewer and populated for an
 * admin. That single prop is what makes one page serve both audiences: the accountant sees the
 * same figures with no way to change them, and the admin sees the controls that used to live in
 * /admin — no duplicate screen to keep in sync.
 */

const money = (v, c) => formatCurrency(v || 0, c || "INR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const frame = (title, count, table) => (
  <div>
    <SectionHeader title={title} count={count} />
    <Card flush>{table}</Card>
  </div>
);

/** Transactions — pure ledger reading, no controls in any role. */
export function PaymentsTable({ rows, total, loading, error, onRetry }) {
  const columns = [
    { key: "user", header: "User", sortable: true, sortValue: (t) => t.user?.name || "", render: (t) => t.user?.name || "—" },
    { key: "type", header: "Type", sortable: true, render: (t) => <Badge tone={t.type === "debit" ? "danger" : "success"}>{t.type}</Badge> },
    { key: "amount", header: "Amount", align: "right", sortable: true, sortValue: (t) => Number(t.amount) || 0, render: (t) => money(t.amount, t.currency) },
    { key: "status", header: "Status", sortable: true, render: (t) => <StatusPill status={t.status} /> },
    { key: "description", header: "Description", hideable: true, render: (t) => t.description || "—" },
    { key: "date", header: "Date", sortable: true, sortValue: (t) => new Date(t.createdAt || 0).getTime(), render: (t) => day(t.createdAt) },
  ];
  return frame("Transactions", total, (
    <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={onRetry}
      search={false} paginate={false} exportName="transactions"
      empty={{ title: "No transactions", body: "Payments appear here as they are captured." }} />
  ));
}

export function InvoicesTable({ rows, total, loading, error, onRetry, onOpenPdf }) {
  const columns = [
    { key: "invoiceNumber", header: "Invoice #", sortable: true, render: (i) => <span className="ckad-mono">{i.invoiceNumber}</span> },
    { key: "creator", header: "Creator", sortable: true, sortValue: (i) => i.creator?.name || "", render: (i) => i.creator?.name || "—" },
    { key: "script", header: "Project", sortable: true, sortValue: (i) => i.script?.title || "", render: (i) => i.script?.title || "—" },
    { key: "access", header: "Access", sortable: true, sortValue: (i) => i.accessType || "", render: (i) => <Badge tone={i.accessType === "premium" ? "success" : "info"}>{i.accessType === "premium" ? "Premium" : "Free"}</Badge> },
    { key: "date", header: "Date", sortable: true, sortValue: (i) => new Date(i.invoiceDate || i.createdAt || 0).getTime(), render: (i) => day(i.invoiceDate || i.createdAt) },
    ...(onOpenPdf ? [{
      key: "actions", header: "", sortValue: () => "",
      render: (i) => (
        <span className="adtb-rowactions">
          <Button size="sm" variant="ghost" onClick={() => onOpenPdf(i, "open")}>Open</Button>
          <Button size="sm" variant="ghost" onClick={() => onOpenPdf(i, "download")}>Download</Button>
        </span>
      ),
    }] : []),
  ];
  return frame("Invoices", total, (
    <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={onRetry}
      search={false} paginate={false} exportName="invoices" empty={{ title: "No invoices" }} />
  ));
}

export function PurchasesTable({ rows, total, loading, error, onRetry }) {
  const columns = [
    { key: "title", header: "Script", sortable: true, sortValue: (s) => s.title || "", render: (s) => (<>{s.title}<span className="adtb-sub">SID: {s.sid || "—"}</span></>) },
    { key: "buyer", header: "Buyer", sortable: true, sortValue: (s) => s.purchasedBy?.name || s.buyer?.name || "", render: (s) => s.purchasedBy?.name || s.buyer?.name || "—" },
    { key: "amount", header: "Amount", align: "right", sortable: true, sortValue: (s) => Number(s.price || s.purchaseAmount) || 0, render: (s) => money(s.price || s.purchaseAmount, s.currency) },
    { key: "status", header: "Status", sortable: true, render: (s) => <StatusPill status={s.transactionStatus || s.status} /> },
    { key: "date", header: "Date", sortable: true, sortValue: (s) => new Date(s.updatedAt || s.createdAt || 0).getTime(), render: (s) => day(s.updatedAt || s.createdAt) },
  ];
  return frame("Script purchases", total, (
    <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={onRetry}
      search={false} paginate={false} exportName="purchases" empty={{ title: "No purchases" }} />
  ));
}

/** Premium subscribers. `actions` present only for an admin viewer. */
export function PremiumTable({ rows, total, loading, error, onRetry, actions }) {
  const columns = [
    { key: "name", header: "User", sortable: true, render: (u) => (<>{u.name}<span className="adtb-sub">{u.email}</span></>) },
    { key: "activated", header: "Activated", sortable: true, sortValue: (u) => new Date(u.subscription?.accessActivatedAt || 0).getTime(), render: (u) => day(u.subscription?.accessActivatedAt) },
    { key: "expires", header: "Expires", sortable: true, sortValue: (u) => new Date(u.subscription?.accessExpiresAt || 0).getTime(), render: (u) => day(u.subscription?.accessExpiresAt) },
    { key: "provider", header: "Source", hideable: true, sortValue: (u) => u.subscription?.checkoutProvider || "", render: (u) => <Badge tone="neutral">{u.subscription?.checkoutProvider || "—"}</Badge> },
    ...(actions ? [{
      key: "actions", header: "", sortValue: () => "",
      render: (u) => (
        <span className="adtb-rowactions">
          <Button size="sm" variant="ghost" className="adtb-danger"
            loading={actions.busy === `remove-premium-${u._id}`}
            onClick={() => actions.removePremium(u)}>Remove premium</Button>
        </span>
      ),
    }] : []),
  ];
  return frame("Premium subscribers", total, (
    <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={onRetry}
      search={false} paginate={false} exportName="premium-subscribers" empty={{ title: "No premium subscribers" }} />
  ));
}

export function WriterPlansTable({ rows, total, loading, error, onRetry, actions }) {
  const columns = [
    { key: "name", header: "Writer", sortable: true, render: (u) => (<>{u.name}<span className="adtb-sub">{u.email}</span></>) },
    { key: "plan", header: "Plan", sortable: true, sortValue: (u) => u.subscription?.plan || "", render: (u) => <Badge tone={u.subscription?.plan === "gold" ? "gold" : "accent"}>{u.subscription?.plan || "—"}</Badge> },
    { key: "activated", header: "Activated", sortable: true, sortValue: (u) => new Date(u.subscription?.accessActivatedAt || 0).getTime(), render: (u) => day(u.subscription?.accessActivatedAt) },
    { key: "expires", header: "Expires", sortable: true, sortValue: (u) => new Date(u.subscription?.accessExpiresAt || 0).getTime(), render: (u) => day(u.subscription?.accessExpiresAt) },
    ...(actions ? [{
      key: "actions", header: "", sortValue: () => "",
      render: (u) => (
        <span className="adtb-rowactions">
          <Button size="sm" variant="ghost" loading={actions.busy === `writer-plan-${u._id}`}
            onClick={() => actions.grantWriterPlan(u, "gold")}>Grant gold</Button>
          <Button size="sm" variant="ghost" className="adtb-danger"
            loading={actions.busy === `remove-writer-plan-${u._id}`}
            onClick={() => actions.removeWriterPlan(u)}>Remove</Button>
        </span>
      ),
    }] : []),
  ];
  return frame("Writer plans", total, (
    <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={onRetry}
      search={false} paginate={false} exportName="writer-plans" empty={{ title: "No active writer plans" }} />
  ));
}

export function BankReviewsTable({ rows, total, loading, error, onRetry, actions }) {
  const columns = [
    { key: "user", header: "User", sortable: true, sortValue: (r) => r.user?.name || "", render: (r) => (<>{r.user?.name || "—"}<span className="adtb-sub">{r.user?.email}</span></>) },
    { key: "holder", header: "Account holder", hideable: true, render: (r) => r.bankDetails?.accountHolderName || "—" },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status} /> },
    { key: "submitted", header: "Submitted", sortable: true, sortValue: (r) => new Date(r.createdAt || 0).getTime(), render: (r) => day(r.createdAt) },
    ...(actions ? [{
      key: "actions", header: "", sortValue: () => "",
      render: (r) => (
        <span className="adtb-rowactions adtb-rowactions--wrap">
          <Button size="sm" variant="ghost" loading={actions.busy === `bank-approve-${r._id}`} onClick={() => actions.approveBankReview(r)}>Approve</Button>
          <Button size="sm" variant="ghost" className="adtb-danger" loading={actions.busy === `bank-reject-${r._id}`} onClick={() => actions.rejectBankReview(r)}>Reject</Button>
          <Button size="sm" variant="ghost" loading={actions.busy === `bank-unblock-${r._id}`} onClick={() => actions.unblockBankReview(r)}>Unblock</Button>
        </span>
      ),
    }] : []),
  ];
  return frame("Bank detail reviews", total, (
    <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={onRetry}
      search={false} paginate={false} exportName="bank-reviews" empty={{ title: "No bank reviews" }} />
  ));
}
