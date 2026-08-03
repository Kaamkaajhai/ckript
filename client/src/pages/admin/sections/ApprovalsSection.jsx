import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";
import ScriptsDataTable from "./shared/ScriptsDataTable";

/**
 * "approvals" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const ApprovalsSection = () => {
    const {
        deletingScriptId,
        filteredScripts,
        handleApprove,
        handleDeleteProject,
        handleReject,
        hasSearch,
        isDark,
        page,
        setPage,
        setScoreModal,
        total,
        totalPages,
    } = useAdminDashboard();

                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Script Approvals
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span>
                            </h2>
                        </div>
                        <ScriptsDataTable scripts={filteredScripts} isDark={isDark} showScore={false} showApprovalType={true} showPreviewWindow={true}
                            actions={(s) => (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleApprove(s._id)} className="text-xs font-bold text-emerald-500 hover:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">✓ Approve</button>
                                    <button onClick={() => handleReject(s._id)} className="text-xs font-bold text-red-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">✕ Reject</button>
                                    <button onClick={() => setScoreModal(s)} className="text-xs font-bold text-purple-500 hover:text-purple-400 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/10 transition-colors">Score</button>
                                    <a href={`/admin/scripts/${s._id}`} className="text-xs font-bold text-[#a83a4d] hover:text-[#e79aa6] px-2.5 py-1.5 rounded-lg hover:bg-[#a83a4d]/10 transition-colors">View</a>
                                    <button
                                        onClick={() => handleDeleteProject(s)}
                                        disabled={Boolean(s.isDeleted) || deletingScriptId === s._id}
                                        className="text-xs font-bold text-red-500 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                    >
                                        {s.isDeleted ? "Deleted" : deletingScriptId === s._id ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default ApprovalsSection;
