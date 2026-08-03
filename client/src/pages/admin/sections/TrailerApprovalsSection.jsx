import { useAdminDashboard } from "../dashboardContext";
import { Pagination, ScriptTable } from "../dashboardShared";

/**
 * "trailers" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5b. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const TrailerApprovalsSection = () => {
    const {
        filteredScripts,
        handleAdminTrailerFileChange,
        handleOpenTrailerUpload,
        handleSendTrailerToWriter,
        isDark,
        openTrailerRequirements,
        page,
        setPage,
        totalPages,
        trailerFileInputRef,
        uploadingTrailerScriptId,
    } = useAdminDashboard();

                const newTrailerRequests = filteredScripts;
                const trailerRequestCount = newTrailerRequests.length;
                return (
                    <div>
                        <input
                            ref={trailerFileInputRef}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={handleAdminTrailerFileChange}
                        />
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>AI Trailer Approvals<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({trailerRequestCount})</span></h2>
                        </div>
                        <ScriptTable scripts={newTrailerRequests} isDark={isDark} showScore={false}
                            actions={(s) => (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => handleOpenTrailerUpload(s)}
                                        disabled={uploadingTrailerScriptId === String(s._id)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${uploadingTrailerScriptId === String(s._id)
                                            ? isDark ? "text-gray-500 bg-white/[0.03]" : "text-gray-400 bg-gray-100"
                                            : isDark ? "text-amber-300 hover:text-amber-200 hover:bg-amber-500/10" : "text-amber-700 hover:bg-amber-100"
                                            }`}
                                    >
                                        {uploadingTrailerScriptId === String(s._id) ? "Uploading..." : "Add Trailer"}
                                    </button>
                                    <button
                                        onClick={() => handleSendTrailerToWriter(s)}
                                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                                    >
                                        Send Trailer
                                    </button>
                                    <button
                                        onClick={() => openTrailerRequirements(s)}
                                        className="text-xs font-bold text-violet-300 hover:text-violet-200 px-3 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors"
                                    >
                                        Requirements
                                    </button>
                                    <a href={`/admin/scripts/${s._id}`} className="text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors">View</a>
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default TrailerApprovalsSection;
