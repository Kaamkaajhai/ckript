import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";
import ScriptsDataTable from "./shared/ScriptsDataTable";

/**
 * "ai-usage" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const AiUsageSection = () => {
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
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>AI Usage in Projects<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span></h2>
                        <ScriptsDataTable scripts={filteredScripts} isDark={isDark} showScore={true} />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default AiUsageSection;
