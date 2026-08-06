import { useAdminDashboard } from "../dashboardContext";
import { Pagination, getPaymentIdLabel, getTransactionIdLabel } from "../dashboardShared";
import { formatCurrency } from "../../../utils/currency";
import { Card, DataTable, SectionHeader, StatusPill, Badge } from "../ui";

/**
 * "payments" — first section re-skinned onto the admin kit (stage 6b).
 *
 * The DataTable runs with its OWN search and pagination off: rows arrive server-paginated
 * (page/totalPages from the dashboard) and the shell's header search already filters them into
 * filteredTransactions. What the kit adds is sorting, column visibility, CSV export, the sticky
 * header and the shared empty state — the behaviours the hand-rolled table lacked.
 */

const TYPE_TONE = { credit: "success", payment: "success", debit: "danger" };

const COLUMNS = [
  {
    key: "user",
    header: "User",
    sortable: true,
    sortValue: (t) => t.user?.name || "",
    render: (t) => t.user?.name || "—",
  },
  {
    key: "type",
    header: "Type",
    sortable: true,
    render: (t) => <Badge tone={TYPE_TONE[t.type] || "neutral"}>{t.type}</Badge>,
  },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    sortable: true,
    sortValue: (t) => Number(t.amount) || 0,
    render: (t) => formatCurrency(t.amount || 0, t.currency || "INR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (t) => <StatusPill status={t.status} />,
  },
  {
    key: "description",
    header: "Description",
    hideable: true,
    render: (t) => t.description || "—",
  },
  {
    key: "refs",
    header: "Txn / Pay ID",
    hideable: true,
    sortValue: (t) => `${getTransactionIdLabel(t) || ""} ${getPaymentIdLabel(t) || ""}`,
    render: (t) => (
      <span className="ckad-mono">
        Txn: {getTransactionIdLabel(t) || "-"}
        <br />
        Pay: {getPaymentIdLabel(t) || "-"}
      </span>
    ),
  },
  {
    key: "date",
    header: "Date",
    sortable: true,
    sortValue: (t) => new Date(t.createdAt || 0).getTime(),
    render: (t) => new Date(t.createdAt).toLocaleDateString(),
  },
];

const PaymentsSection = () => {
  const {
    filteredTransactions,
    hasSearch,
    page,
    setPage,
    total,
    totalPages,
  } = useAdminDashboard();

  return (
    <div>
      <SectionHeader title="Payment Transactions" count={hasSearch ? filteredTransactions.length : total} />
      <Card flush>
        <DataTable
          columns={COLUMNS}
          rows={filteredTransactions}
          search={false}
          paginate={false}
          exportName="transactions"
          empty={{ title: "No transactions found", body: "Payments appear here as they are captured." }}
        />
      </Card>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark />
    </div>
  );
};

export default PaymentsSection;
