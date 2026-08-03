import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";

/**
 * "invoices" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5b. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const InvoicesSection = () => {
    const {
        filteredInvoices,
        handleInvoicePdfAction,
        hasSearch,
        isDark,
        page,
        setPage,
        total,
        totalPages,
    } = useAdminDashboard();

                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Invoices<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredInvoices.length : total})</span></h2>
                        </div>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {[
                                                "Invoice #",
                                                "Creator",
                                                "Project",
                                                "Access",
                                                "Credits",
                                                "Date",
                                                "Actions",
                                            ].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {filteredInvoices.map((inv) => (
                                            <tr key={inv._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className={`px-5 py-3.5 text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{inv.invoiceNumber}</td>
                                                <td className="px-5 py-3.5">
                                                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{inv.creator?.name || "-"}</p>
                                                    <p className={`text-[11px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                                        SID: {inv.creatorSid || inv.creator?.sid || "-"}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{inv.script?.title || "-"}</p>
                                                    <p className={`text-[11px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                                        SID: {inv.scriptSid || inv.script?.sid || "-"}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${inv.accessType === "premium" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                                                        {inv.accessType === "premium" ? "Premium" : "Free"}
                                                    </span>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{inv.totalCreditsRequired || 0} cr</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>{new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString()}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleInvoicePdfAction(inv, "open")}
                                                            className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-500/10"
                                                        >
                                                            Open PDF
                                                        </button>
                                                        <button
                                                            onClick={() => handleInvoicePdfAction(inv, "download")}
                                                            className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-500/10"
                                                        >
                                                            Download
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredInvoices.length === 0 && (
                                            <tr><td colSpan={7} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No invoices found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default InvoicesSection;
