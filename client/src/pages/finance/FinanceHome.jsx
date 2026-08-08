import { useContext, useMemo, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/financeApi";
import { resolveEffectiveUser } from "../../utils/adminSession";
import AdminShell from "../admin/shell/AdminShell";
import { Pager, ToastProvider, useToast } from "../admin/ui";
import useFinanceData from "./useFinanceData";
import useFinanceActions from "./useFinanceActions";
import LedgerSection from "./LedgerSection";
import {
  PaymentsTable, InvoicesTable, PurchasesTable,
  PremiumTable, WriterPlansTable, BankReviewsTable,
} from "./FinanceSections";

/**
 * /finance — the product's payments home.
 *
 * Every payment surface lives HERE now, not in the admin console: transactions, invoices, script
 * purchases, premium subscribers, writer plans and bank-detail reviews, alongside the ledger
 * summary. One page, two audiences:
 *
 *   finance (the accountant)  reads everything, changes nothing
 *   admin                     the same page plus the control actions that used to sit in /admin
 *
 * The split is enforced server-side — reads are financeOnly, the control endpoints stay adminOnly
 * — so `canControl` below only decides what to RENDER. A finance user who forged the request would
 * still be refused.
 */

const SECTIONS = [
  { key: "ledger", label: "Overview", icon: "M3 3v18h18M7 14l3-3 2.25 2.25L17 8" },
  { key: "payments", label: "Transactions", icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" },
  { key: "invoices", label: "Invoices", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H6.75A2.25 2.25 0 004.5 4.5v15A2.25 2.25 0 006.75 21.75h10.5A2.25 2.25 0 0019.5 19.5v-1.125M15 12h-6m6 3h-6" },
  { key: "purchases", label: "Script purchases", icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272" },
  { key: "premium", label: "Premium subscribers", icon: "M11.48 3.5a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557L3.04 10.386a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
  { key: "writer-plans", label: "Writer plans", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" },
  { key: "bank-reviews", label: "Bank reviews", icon: "M3.75 4.5h16.5A1.5 1.5 0 0121.75 6v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5zM6 9h12M6 13.5h5.25" },
];

const NAV_GROUPS = [
  { title: "", items: SECTIONS.slice(0, 1) },
  { title: "Records", items: SECTIONS.slice(1, 4) },
  { title: "Subscriptions", items: SECTIONS.slice(4) },
];

function FinanceWorkspace({ canControl }) {
  const [section, setSection] = useState("ledger");
  const [search, setSearch] = useState("");
  const toast = useToast();

  const data = useFinanceData(section === "ledger" ? null : section, search);
  const actions = useFinanceActions({
    refresh: data.refresh,
    onResult: (message, tone) => (tone === "error" ? toast.error(message) : toast.success(message)),
  });

  // Invoice PDFs stream through the authenticated client — the endpoint is behind `protect`, so a
  // plain link would 401.
  const openInvoicePdf = useMemo(() => async (invoice, mode) => {
    try {
      const { data: blob } = await api.get(`/invoices/${invoice._id}/pdf`, {
        params: mode === "download" ? { download: 1 } : {},
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      if (mode === "download") {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${invoice.invoiceNumber || "invoice"}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.open(url, "_blank", "noopener");
      }
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not open that invoice.");
    }
  }, [toast]);

  const shared = {
    rows: data.rows,
    total: data.total,
    loading: data.loading,
    error: data.error,
    onRetry: data.refresh,
  };

  const body = (() => {
    switch (section) {
      case "ledger": return <LedgerSection />;
      case "payments": return <PaymentsTable {...shared} />;
      case "invoices": return <InvoicesTable {...shared} onOpenPdf={openInvoicePdf} />;
      case "purchases": return <PurchasesTable {...shared} />;
      case "premium": return <PremiumTable {...shared} actions={canControl ? actions : null} />;
      case "writer-plans": return <WriterPlansTable {...shared} actions={canControl ? actions : null} />;
      case "bank-reviews": return <BankReviewsTable {...shared} actions={canControl ? actions : null} />;
      default: return null;
    }
  })();

  const label = SECTIONS.find((s) => s.key === section)?.label || "Overview";

  return (
    <AdminShell
      brand="Ckript Payments"
      groups={NAV_GROUPS}
      activeKey={section}
      onNavigate={setSection}
      crumbs={[label]}
      searchValue={search}
      onSearchChange={section === "ledger" ? null : (e) => setSearch(e.target.value)}
      searchPlaceholder={`Search ${label.toLowerCase()}`}
    >
      {body}
      {section === "ledger" ? null : (
        <Pager
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={data.setPage}
          disabled={data.loading}
          label={label.toLowerCase()}
        />
      )}
    </AdminShell>
  );
}

export default function FinanceHome() {
  const { user: signedInUser } = useContext(AuthContext) || {};

  // An admin normally arrives here from the console, where signing in with the access code stores
  // the session in sessionStorage and leaves the ordinary localStorage login alone. Asking only
  // AuthContext meant that admin was greeted as whoever was signed in normally — usually their own
  // account, with no finance role — and turned away from a page they administer. Read on every
  // render rather than once, so signing in or out of the console lands without a reload.
  const user = resolveEffectiveUser(signedInUser);
  const role = String(user?.role || "");
  const allowed = role === "finance" || role === "admin";

  if (!allowed) {
    return (
      <div className="ckad" style={{ padding: 40 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Payments</h1>
        <p style={{ marginTop: 8, maxWidth: "60ch", lineHeight: 1.6 }}>
          This page is for finance accounts.
          {user ? ` You are signed in as ${user.name || user.email} (${role}).` : " You are not signed in."}
          {" "}Ask an administrator for finance access.
        </p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <FinanceWorkspace canControl={role === "admin"} />
    </ToastProvider>
  );
}
