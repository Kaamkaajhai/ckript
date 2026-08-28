import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";

const SwaApprovedSection = () => {
    const {
        filteredUsers,
        handleOpenMembershipProof,
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
                <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                    SWA/WGA Approved Members
                    <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        ({hasSearch ? filteredUsers.length : total})
                    </span>
                </h2>
            </div>

            {filteredUsers.length === 0 ? (
                <div className={`rounded-2xl border p-12 text-center ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? "bg-blue-500/10" : "bg-blue-50"}`}>
                        <svg className={`w-6 h-6 ${isDark ? "text-blue-400" : "text-blue-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className={`text-sm font-semibold ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        No SWA/WGA approved members found
                    </p>
                </div>
            ) : (
                <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className={isDark ? "bg-[#221d1d]" : "bg-gray-50"}>
                                    <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Name</th>
                                    <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Certificate</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? "divide-[#2e2828]" : "divide-gray-100"}`}>
                                {filteredUsers.map((user) => {
                                    const swaVerification = user.writerProfile?.membershipVerification?.swa || {};
                                    const wgaVerification = user.writerProfile?.membershipVerification?.wga || {};
                                    const hasSwaProof = Boolean(swaVerification.proofFileName || swaVerification.proofPublicId || swaVerification.proofUrl);
                                    const hasWgaProof = Boolean(wgaVerification.proofFileName || wgaVerification.proofPublicId || wgaVerification.proofUrl);
                                    const hasProof = hasSwaProof || hasWgaProof;
                                    const proofType = hasSwaProof ? "swa" : "wga";
                                    
                                    return (
                                        <tr key={user._id} className={`align-top transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {user.profileImage ? (
                                                        <img src={user.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                    ) : (
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-50 text-blue-600"}`}>
                                                            {user.name?.charAt(0)?.toUpperCase() || "?"}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                                                            {user.name || "-"}
                                                            {(user.writerProfile?.wgaMember || user.writerProfile?.membershipVerification?.wga?.status === "approved") && (
                                                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">WGA</span>
                                                            )}
                                                            {(user.writerProfile?.sgaMember || user.writerProfile?.membershipVerification?.swa?.status === "approved") && (
                                                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">SWA</span>
                                                            )}
                                                        </p>
                                                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{user.email || "-"}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 align-middle">
                                                {hasProof ? (
                                                    <a
                                                        href={`#${proofType}-proof`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(event) => handleOpenMembershipProof(event, user._id, proofType)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                                        </svg>
                                                        View Certificate
                                                    </a>
                                                ) : (
                                                    <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                                        No certificate available
                                                    </span>
                                                )}
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

export default SwaApprovedSection;
