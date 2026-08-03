import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";
import { Badge, Button, Card, DataTable, SectionHeader } from "../ui";

/**
 * "invoices" — re-skinned onto the admin kit (stage 6b).
 *
 * Same integration shape as PaymentsSection: server pagination and the shell's search stay in
 * charge, the DataTable adds sorting, column visibility, CSV export and the shared states. The
 * open/download actions call the unchanged handleInvoicePdfAction from the dashboard scope.
 */

const InvoicesSection = () => {
  const {
    filteredInvoices,
    handleInvoicePdfAction,
    hasSearch,
    page,
    setPage,
    total,
    totalPages,
  } = useAdminDashboard();

  const columns = [
    {
      key: "invoiceNumber",
      header: "Invoice #",
      sortable: true,
      render: (inv) => <span className="ckad-mono">{inv.invoiceNumber}</span>,
    },
    {
      key: "creator",
      header: "Creator",
      sortable: true,
      sortValue: (inv) => inv.creator?.name || "",
      render: (inv) => (
        <>
          {inv.creator?.name || "-"}
          <span className="adtb-sub">SID: {inv.creatorSid || inv.creator?.sid || "-"}</span>
        </>
      ),
    },
    {
      key: "script",
      header: "Project",
      sortable: true,
      sortValue: (inv) => inv.script?.title || "",
      render: (inv) => (
        <>
          {inv.script?.title || "-"}
          <span className="adtb-sub">SID: {inv.scriptSid || inv.script?.sid || "-"}</span>
        </>
      ),
    },
    {
      key: "accessType",
      header: "Access",
      sortable: true,
      render: (inv) => (
        <Badge tone={inv.accessType === "premium" ? "success" : "info"}>
          {inv.accessType === "premium" ? "Premium" : "Free"}
        </Badge>
      ),
    },
    {
      key: "credits",
      header: "Credits",
      align: "right",
      hideable: true,
      sortValue: (inv) => Number(inv.totalCreditsRequired) || 0,
      render: (inv) => `${inv.totalCreditsRequired || 0} cr`,
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (inv) => new Date(inv.invoiceDate || inv.createdAt || 0).getTime(),
      render: (inv) => new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (inv) => (
        <span className="adtb-rowactions">
          <Button size="sm" variant="ghost" onClick={() => handleInvoicePdfAction(inv, "open")}>
            Open PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleInvoicePdfAction(inv, "download")}>
            Download
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader title="Invoices" count={hasSearch ? filteredInvoices.length : total} />
      <Card flush>
        <DataTable
          columns={columns}
          rows={filteredInvoices}
          search={false}
          paginate={false}
          exportName="invoices"
          empty={{ title: "No invoices found", body: "Invoices appear here as purchases and registrations complete." }}
        />
      </Card>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark />
    </div>
  );
};

export default InvoicesSection;
