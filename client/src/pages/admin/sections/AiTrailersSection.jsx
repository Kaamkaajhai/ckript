import { useAdminDashboard } from "../dashboardContext";
import { Pagination, ScriptTable } from "../dashboardShared";

/**
 * "ai-trailers" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const AiTrailersSection = () => {
    const {
        filteredScripts,
        handleRemoveTrailer,
        handleSendTrailerToWriter,
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
                                AI Trailer
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span>
                            </h2>
                        </div>
                        <ScriptTable
                            scripts={filteredScripts}
                            isDark={isDark}
                            showScore={false}
                            actions={(s) => (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => handleSendTrailerToWriter(s)}
                                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                                    >
                                        Send Trailer
                                    </button>
                                    <button
                                        onClick={() => handleRemoveTrailer(s)}
                                        className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                    >
                                        Remove Trailer
                                    </button>
                                    <a href={`/admin/scripts/${s._id}`} className="text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors">View</a>
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default AiTrailersSection;
