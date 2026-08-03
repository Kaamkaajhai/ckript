import { useAdminDashboard } from "../dashboardContext";
import { Pagination, ScriptTable } from "../dashboardShared";

/**
 * "evaluations" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const EvaluationsSection = () => {
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
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>AI Evaluations<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span></h2>
                        <ScriptTable scripts={filteredScripts} isDark={isDark} showScore={true} />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default EvaluationsSection;
