import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";
import ScriptsDataTable from "./shared/ScriptsDataTable";

/**
 * "deleted-scripts" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 *
 * The Restore button follows that rule: the handler lives in AdminDashboard beside handleApprove and
 * arrives through context, so this file still only renders.
 *
 * Why restoring is possible at all: deleting a project is a SOFT delete — the document, its content
 * and any competition entry pointing at it survive untouched, and only an `isDeleted` flag changes.
 * Until this button existed there was no way to clear that flag from anywhere in the product.
 */
const DeletedScriptsSection = () => {
    const {
        filteredScripts,
        handleRestoreScript,
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
            {/* Says the quiet part out loud: an admin looking at this list is usually here because a
                writer asked for something back, and needs to know that is possible. */}
            <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Deleting a project only hides it — the script and any competition entry are still intact.
                Restore puts it back in the writer&apos;s dashboard and notifies them.
            </p>
            <ScriptsDataTable scripts={filteredScripts} isDark={isDark} showScore={true}
                actions={(s) => (
                    <div className="flex items-center gap-2">
                        <a href={`/admin/scripts/${s._id}`} className="text-xs font-bold text-[#a83a4d] hover:text-[#e79aa6] px-2.5 py-1 rounded-lg hover:bg-[#a83a4d]/10 transition-colors">View</a>
                        <button
                            type="button"
                            onClick={() => handleRestoreScript(s)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${isDark ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                        >
                            Restore
                        </button>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isDark ? "bg-red-500/15 text-red-300" : "bg-red-50 text-red-700"}`}>Deleted</span>
                    </div>
                )}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
        </div>
    );
};

export default DeletedScriptsSection;
