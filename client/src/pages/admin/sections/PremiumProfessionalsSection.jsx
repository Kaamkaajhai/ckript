import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";

/**
 * "premium-professionals" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5b. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const PremiumProfessionalsSection = () => {
    const {
        filteredUsers,
        handleRemovePremiumFromUser,
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
                                Premium Professionals
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredUsers.length : total})</span>
                            </h2>
                        </div>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#221d1d]" : "bg-gray-50"}>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>User</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Email</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Joined</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Premium Expiry</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Days Left</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#2e2828]" : "divide-gray-100"}`}>
                                        {filteredUsers.map((u) => {
                                            const expiryDate = u.subscription?.accessExpiresAt ? new Date(u.subscription.accessExpiresAt) : null;
                                            const daysLeft = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24))) : 0;
                                            return (
                                                <tr key={u._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            {u.profileImage ? (
                                                                <img src={u.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-[#a83a4d]/20 text-[#e79aa6]" : "bg-[#7a2233]/10 text-[#7a2233]"}`}>
                                                                    {u.name?.charAt(0)?.toUpperCase() || "?"}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{u.name}</p>
                                                                <p className={`text-[11px] mt-0.5 font-bold ${u.isDeactivated ? "text-red-500" : u.isFrozen ? "text-amber-500" : (isDark ? "text-emerald-400" : "text-emerald-600")}`}>
                                                                    SID: {u.sid || "Pending"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{u.email}</td>
                                                    <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                        {new Date(u.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                        {expiryDate ? expiryDate.toLocaleDateString() : "Lifetime/None"}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${daysLeft > 7 ? (isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700") : daysLeft > 0 ? (isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700") : (isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700")}`}>
                                                            {daysLeft > 0 ? `${daysLeft} Days` : "Expired"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <button
                                                            onClick={() => handleRemovePremiumFromUser(u)}
                                                            disabled={Boolean(u.isDeactivated) || userActionLoading === `remove-premium-${u._id}`}
                                                            className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                        >
                                                            {userActionLoading === `remove-premium-${u._id}` ? "Removing..." : "Remove Premium"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default PremiumProfessionalsSection;
