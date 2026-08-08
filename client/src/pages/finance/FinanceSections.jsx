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

/**
 * What each Transaction.type means to someone reading the books.
 *
 * "credit" is the one that matters. It reads like the retired credits feature and is nothing of the
 * sort — scriptController writes it on every sale to credit the writer's wallet ("Script purchase
 * payout", "Earned from script hold"). Showing the raw enum invited exactly that misreading, and
 * acting on it would have meant hiding every payout from the accountant's view. Naming it is the
 * fix; the rows themselves are the payout side of the business and belong here.
 */
const TRANSACTION_TYPE = {
  credit: { label: "Writer payout", tone: "success" },
  debit: { label: "Debit", tone: "danger" },
  payment: { label: "Payment", tone: "success" },
  refund: { label: "Refund", tone: "warn" },
  withdrawal: { label: "Withdrawal", tone: "warn" },
  subscription: { label: "Subscription", tone: "info" },
  bonus: { label: "Bonus", tone: "info" },
  commission: { label: "Commission", tone: "neutral" },
};

const describeType = (type) => TRANSACTION_TYPE[type] || { label: type || "—", tone: "neutral" };

/** Transactions — pure ledger reading, no controls in any role. */
export function PaymentsTable({ rows, total, loading, error, onRetry }) {
  const columns = [
    { key: "user", header: "User", sortable: true, sortValue: (t) => t.user?.name || "", render: (t) => t.user?.name || "—" },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (t) => describeType(t.type).label,
      render: (t) => {
        const { label, tone } = describeType(t.type);
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
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

/**
 * Challenge entries, read from the ledger rather than from payments or invoices.
 *
 * That choice is the substance of this table. A challenge is entered three ways — paid on Ckript,
 * granted by an admin, or approved as a third-party registration someone already paid for elsewhere
 * — and only the first writes a Transaction or an Invoice. Built on either of those, this section
 * would report a competition as emptier than it was and would show no cost for the entries given
 * away. The ledger records all three, so `settlement` separates them and `listPriceMinor` states
 * what a granted entry was worth.
 *
 * Amounts are minor units on the wire, converted here rather than server-side: the ledger stores
 * integers precisely so no rounding happens between the payment and the report.
 */
export function ChallengesTable({ rows, total, loading, error, onRetry }) {
  const SETTLEMENT_TONE = { paid: "success", granted: "info", reversed: "danger" };

  const columns = [
    {
      key: "entrant",
      header: "Entrant",
      sortable: true,
      sortValue: (e) => e.user?.name || "",
      render: (e) => (<>{e.user?.name || "—"}<span className="adtb-sub">{e.user?.email}</span></>),
    },
    {
      key: "challenge",
      header: "Challenge",
      sortable: true,
      sortValue: (e) => e.label || "",
      // `label` is written at capture time, so a renamed or deleted competition still reads back.
      render: (e) => e.label || "—",
    },
    {
      key: "settlement",
      header: "Entry",
      sortable: true,
      render: (e) => <Badge tone={SETTLEMENT_TONE[e.settlement] || "neutral"}>{e.settlement || "—"}</Badge>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (e) => Number(e.amountMinor) || 0,
      // A grant is zero, and showing "—" instead of "0.00" keeps a free entry from reading as a sale
      // of nothing. What it cost is the next column.
      render: (e) => (Number(e.amountMinor) ? money(Number(e.amountMinor) / 100, e.currency) : <span className="adtb-sub">—</span>),
    },
    {
      key: "listPrice",
      header: "List price",
      align: "right",
      hideable: true,
      sortable: true,
      sortValue: (e) => Number(e.listPriceMinor) || 0,
      render: (e) => (Number(e.listPriceMinor) ? money(Number(e.listPriceMinor) / 100, e.currency) : "—"),
    },
    {
      key: "provider",
      header: "Source",
      hideable: true,
      sortValue: (e) => e.provider || "",
      render: (e) => <Badge tone="neutral">{e.provider === "none" ? "grant" : e.provider || "—"}</Badge>,
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (e) => new Date(e.occurredAt || 0).getTime(),
      render: (e) => day(e.occurredAt),
    },
  ];

  return frame("Challenge entries", total, (
    <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={onRetry}
      search={false} paginate={false} exportName="challenge-entries"
      empty={{ title: "No challenge entries", body: "Entries appear here as they are paid or granted." }} />
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
