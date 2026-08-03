import { useAdminDashboard } from "../dashboardContext";
import { Pagination, ScriptTable } from "../dashboardShared";

/**
 * "deleted-scripts" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const DeletedScriptsSection = () => {
    const {
        filteredScripts,
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
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Deleted Scripts<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span></h2>
                        </div>
                        <ScriptTable scripts={filteredScripts} isDark={isDark} showScore={true}
                            actions={(s) => (
                                <div className="flex items-center gap-2">
                                    <a href={`/admin/scripts/${s._id}`} className="text-xs font-bold text-[#a83a4d] hover:text-[#e79aa6] px-2.5 py-1 rounded-lg hover:bg-[#a83a4d]/10 transition-colors">View</a>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isDark ? "bg-red-500/15 text-red-300" : "bg-red-50 text-red-700"}`}>Deleted</span>
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default DeletedScriptsSection;
