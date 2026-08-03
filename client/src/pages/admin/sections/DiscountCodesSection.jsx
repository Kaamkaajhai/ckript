import { useAdminDashboard } from "../dashboardContext";
import { DiscountCodeFormModal, Pagination } from "../dashboardShared";

/**
 * "discount-codes" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const DiscountCodesSection = () => {
    const {
        discountCodeModal,
        discountCodes,
        handleDeleteDiscountCode,
        handleSaveDiscountCode,
        isDark,
        page,
        setDiscountCodeModal,
        setPage,
        total,
        totalPages,
    } = useAdminDashboard();

                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Discount Codes
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span>
                            </h2>
                            <button
                                onClick={() => setDiscountCodeModal({})}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all"
                            >+ Create Code</button>
                        </div>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {["Code", "Type", "Value", "Used / Max", "Min Purchase", "Valid Until", "Status", "Actions"].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {discountCodes.map((dc) => (
                                            <tr key={dc._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className={`px-5 py-3.5 text-sm font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>{dc.code}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${dc.discountType === "percentage" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}`}>
                                                        {dc.discountType === "percentage" ? "%" : "₹"}
                                                    </span>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                                                    {dc.discountType === "percentage" ? `${dc.discountValue}%` : `₹${dc.discountValue}`}
                                                    {dc.maxDiscountAmount > 0 && dc.discountType === "percentage" && <span className={`text-xs ml-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>(max ₹{dc.maxDiscountAmount})</span>}
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{dc.usedCount} / {dc.maxUses || "∞"}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{dc.minPurchaseAmount > 0 ? `₹${dc.minPurchaseAmount}` : "—"}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>{new Date(dc.validUntil).toLocaleDateString()}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${dc.isActive && new Date(dc.validUntil) > new Date() ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                                        {dc.isActive && new Date(dc.validUntil) > new Date() ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setDiscountCodeModal(dc)} className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-500/10">Edit</button>
                                                        {dc.isActive && <button onClick={() => handleDeleteDiscountCode(dc._id)} className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">Deactivate</button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {discountCodes.length === 0 && (
                                            <tr><td colSpan={8} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No discount codes yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                        {discountCodeModal !== null && <DiscountCodeFormModal initial={discountCodeModal} onClose={() => setDiscountCodeModal(null)} onSave={handleSaveDiscountCode} isDark={isDark} />}
                    </div>
                );
};

export default DiscountCodesSection;
