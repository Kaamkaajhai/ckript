import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";

/**
 * "bank-reviews" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5b. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const BankReviewsSection = () => {
    const {
        filteredBankReviews,
        handleApproveBankReview,
        handleRejectBankReview,
        handleUnblockBankReview,
        hasSearch,
        isDark,
        page,
        setPage,
        total,
        totalPages,
    } = useAdminDashboard();

                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>
                            Bank Detail Reviews
                            <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredBankReviews.length : total})</span>
                        </h2>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {["Writer", "Requested Details", "Active Details", "Security", "Submitted", "Due", "Actions"].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {filteredBankReviews.map((review) => (
                                            <tr key={review._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className="px-5 py-3.5">
                                                    <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{review.name || "-"}</p>
                                                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{review.email || "-"}</p>
                                                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>SID: {review.sid || "-"}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className={`text-xs leading-5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Holder:</span> {review.requestedDetails?.accountHolderName || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Bank:</span> {review.requestedDetails?.bankName || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Account #:</span> {review.requestedDetails?.accountNumber || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Routing:</span> {review.requestedDetails?.routingNumber || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Type:</span> {review.requestedDetails?.accountType || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Country/Currency:</span> {review.requestedDetails?.country || "-"} / {review.requestedDetails?.currency || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>SWIFT:</span> {review.requestedDetails?.swiftCode || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>IBAN:</span> {review.requestedDetails?.iban || "-"}</p>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {review.activeDetails ? (
                                                        <div className={`text-xs leading-5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Holder:</span> {review.activeDetails?.accountHolderName || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Bank:</span> {review.activeDetails?.bankName || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Account #:</span> {review.activeDetails?.accountNumber || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Routing:</span> {review.activeDetails?.routingNumber || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Type:</span> {review.activeDetails?.accountType || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Country/Currency:</span> {review.activeDetails?.country || "-"} / {review.activeDetails?.currency || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>SWIFT:</span> {review.activeDetails?.swiftCode || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>IBAN:</span> {review.activeDetails?.iban || "-"}</p>
                                                        </div>
                                                    ) : (
                                                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No active bank details yet</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className={`text-xs leading-5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Attempts:</span> {Number(review.bankSecurity?.invalidAttempts || 0)} / 5</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Locked:</span> {review.bankSecurity?.isLocked ? "Yes" : "No"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Last invalid:</span> {review.bankSecurity?.lastInvalidAttemptAt ? new Date(review.bankSecurity.lastInvalidAttemptAt).toLocaleString() : "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Reason:</span> {review.bankSecurity?.lastInvalidReason || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Review status:</span> {review.status || "-"}</p>
                                                    </div>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{review.submittedAt ? new Date(review.submittedAt).toLocaleString() : "-"}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{review.dueAt ? new Date(review.dueAt).toLocaleString() : "-"}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        {review.status === "pending" && (
                                                            <>
                                                                <button onClick={() => handleApproveBankReview(review._id)} className="text-xs font-bold text-emerald-500 hover:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">✓ Approve</button>
                                                                <button onClick={() => handleRejectBankReview(review._id)} className="text-xs font-bold text-red-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">✕ Reject</button>
                                                            </>
                                                        )}
                                                        {review.bankSecurity?.isLocked && (
                                                            <button onClick={() => handleUnblockBankReview(review._id)} className="text-xs font-bold text-amber-500 hover:text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors">Unblock User</button>
                                                        )}
                                                    </div>
                                                    {review.adminNote ? (
                                                        <p className={`text-xs mt-2 max-w-[200px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>Note: {review.adminNote}</p>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredBankReviews.length === 0 && (
                                            <tr><td colSpan={7} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No bank detail reviews found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            // The whole competitions panel lives in its own file to keep this switch readable.
};

export default BankReviewsSection;
