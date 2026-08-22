import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";

/**
 * "membership-reviews" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5b. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const MembershipReviewsSection = () => {
    const {
        filteredMembershipReviews,
        handleOpenMembershipProof,
        handleReviewWriterMembership,
        hasSearch,
        isDark,
        page,
        setPage,
        total,
        totalPages,
        userActionLoading,
    } = useAdminDashboard();

                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                SWA/WGA Reviews
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredMembershipReviews.length : total})</span>
                            </h2>
                        </div>

                        {filteredMembershipReviews.length === 0 ? (
                            <div className={`rounded-2xl border p-12 text-center ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                                    <svg className={`w-6 h-6 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className={`text-sm font-semibold ${isDark ? "text-gray-400" : "text-gray-600"}`}>No pending SWA/WGA reviews</p>
                            </div>
                        ) : (
                            <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className={isDark ? "bg-[#221d1d]" : "bg-gray-50"}>
                                                {[
                                                    "Writer",
                                                    "Pending SWA/WGA",
                                                    "Submitted",
                                                    "Proof",
                                                    "Actions",
                                                ].map((h) => (
                                                    <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? "divide-[#2e2828]" : "divide-gray-100"}`}>
                                            {filteredMembershipReviews.map((review) => {
                                                const pendingRows = Array.isArray(review.pendingMemberships)
                                                    ? review.pendingMemberships.filter((item) => String(item.status || "").toLowerCase() === "pending")
                                                    : [];

                                                return (
                                                    <tr key={review._id} className={`align-top transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                {review.profileImage ? (
                                                                    <img src={review.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-[#a83a4d]/20 text-[#e79aa6]" : "bg-[#f7edee] text-[#a83a4d]"}`}>
                                                                        {review.name?.charAt(0)?.toUpperCase() || "?"}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{review.name || "-"}</p>
                                                                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{review.email || "-"}</p>
                                                                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>SID: {review.sid || "-"}</p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-3.5">
                                                            <div className="flex flex-wrap gap-2">
                                                                {pendingRows.map((item) => (
                                                                    <span key={`${review._id}-${item.type}`} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                                                                        {item.label}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-3.5">
                                                            {pendingRows.length > 0 ? (
                                                                <div className="flex flex-col gap-1">
                                                                    {pendingRows.map((item) => (
                                                                        <p key={`${review._id}-${item.type}-submitted`} className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                                            {item.label}: {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "-"}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>-</p>
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-3.5">
                                                            <div className="flex flex-col gap-1">
                                                                {pendingRows.map((item) => (
                                                                    item.hasProof ? (
                                                                        <a
                                                                            key={`${review._id}-${item.type}-proof`}
                                                                            href={`#${item.type}-proof`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={(event) => handleOpenMembershipProof(event, review._id, item.type)}
                                                                            className="text-xs font-bold text-[#a83a4d] hover:text-[#e79aa6]"
                                                                        >
                                                                            {item.label} proof
                                                                        </a>
                                                                    ) : (
                                                                        <span key={`${review._id}-${item.type}-no-proof`} className={`text-xs ${isDark ? "text-red-300" : "text-red-600"}`}>
                                                                            {item.label}: no proof
                                                                        </span>
                                                                    )
                                                                ))}
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-3.5">
                                                            <div className="flex flex-col gap-2">
                                                                {pendingRows.map((item) => {
                                                                    const approveLoading = userActionLoading === `membership-approve-${item.type}-${review._id}`;
                                                                    const rejectLoading = userActionLoading === `membership-reject-${item.type}-${review._id}`;

                                                                    return (
                                                                        <div key={`${review._id}-${item.type}-actions`} className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={() => handleReviewWriterMembership(review._id, item.type, "approve")}
                                                                                disabled={approveLoading || rejectLoading}
                                                                                className="px-2.5 py-1.5 rounded-md text-xs font-bold text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                {approveLoading ? "Approving..." : `Approve ${item.label}`}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleReviewWriterMembership(review._id, item.type, "reject")}
                                                                                disabled={approveLoading || rejectLoading}
                                                                                className="px-2.5 py-1.5 rounded-md text-xs font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                {rejectLoading ? "Rejecting..." : `Reject ${item.label}`}
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default MembershipReviewsSection;
