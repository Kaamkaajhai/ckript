import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";

/**
 * "deleted-film-professionals" / "deleted-writers" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5b. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const DeletedUsersSection = () => {
    const {
        activeTab,
        filteredDeletedFilmProfessionals,
        filteredDeletedWriters,
        isDark,
        page,
        setPage,
        setSelectedUserDetail,
        totalPages,
    } = useAdminDashboard();

                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>
                            {activeTab === "deleted-film-professionals" ? "Deleted Film Professionals" : "Deleted Writers"}
                            <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                ({activeTab === "deleted-film-professionals" ? filteredDeletedFilmProfessionals.length : filteredDeletedWriters.length})
                            </span>
                        </h2>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#221d1d]" : "bg-gray-50"}>
                                            {["User", "SID", "Role", "Reason", "Source", "Requested", "Deleted", "Actions"].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#2e2828]" : "divide-gray-100"}`}>
                                        {(activeTab === "deleted-film-professionals" ? filteredDeletedFilmProfessionals : filteredDeletedWriters).map((item) => (
                                            <tr key={item._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className="px-5 py-3.5">
                                                    <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{item.name || "-"}</p>
                                                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{item.email || "-"}</p>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{item.sid || "-"}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isDark ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-700"}`}>{item.role || "-"}</span>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm max-w-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                    <p className="line-clamp-2">{item.reason || "No reason provided"}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.source === "admin" ? "bg-amber-100 text-amber-700" : "bg-[#f7edee] text-[#a83a4d]"}`}>
                                                        {item.source === "admin" ? "Admin" : "User"}
                                                    </span>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{item.requestedAt ? new Date(item.requestedAt).toLocaleString() : "-"}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{item.deactivatedAt ? new Date(item.deactivatedAt).toLocaleString() : "-"}</td>
                                                <td className="px-5 py-3.5">
                                                    <button
                                                        onClick={() => setSelectedUserDetail(item.profileSnapshot || {
                                                            _id: item._id,
                                                            sid: item.sid,
                                                            role: item.role,
                                                            name: item.name,
                                                            email: item.email,
                                                            isDeactivated: true,
                                                            deactivatedAt: item.deactivatedAt,
                                                            accountDeletion: {
                                                                reason: item.reason,
                                                                source: item.source,
                                                                requestedAt: item.requestedAt,
                                                                originalName: item.name,
                                                                originalEmail: item.email,
                                                            },
                                                        })}
                                                        className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-500/10"
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(activeTab === "deleted-film-professionals" ? filteredDeletedFilmProfessionals.length : filteredDeletedWriters.length) === 0 && (
                                            <tr><td colSpan={8} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No deleted accounts found in this section</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default DeletedUsersSection;
