import { useAdminDashboard } from "../dashboardContext";
import { Pagination } from "../dashboardShared";
import ScriptsDataTable from "./shared/ScriptsDataTable";

/**
 * "scores" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const ScoresSection = () => {
    const {
        filteredScripts,
        isDark,
        page,
        scoreSubTab,
        setPage,
        setScoreModal,
        setScoreSubTab,
        totalPages,
    } = useAdminDashboard();

                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Score Rankings</h2>
                            <div className="flex rounded-xl overflow-hidden border border-[var(--ad-line)] bg-[var(--ad-surface-2)]">
                                {[{ k: "ai", l: "AI Scores" }, { k: "platform", l: "Platform" }, { k: "reader", l: "Reader" }].map((t) => (
                                    <button key={t.k} onClick={() => setScoreSubTab(t.k)}
                                        className={`px-4 py-2 text-sm font-bold transition-all ${scoreSubTab === t.k
                                            ? isDark ? "bg-[#a83a4d]/15 text-[#e79aa6]" : "bg-[#7a2233] text-white"
                                            : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                                            }`}>{t.l}</button>
                                ))}
                            </div>
                        </div>
                        <ScriptsDataTable scripts={filteredScripts} isDark={isDark} showScore={true}
                            actions={(s) => (
                                <button onClick={() => setScoreModal(s)} className="text-xs font-bold text-purple-500 hover:text-purple-400 px-2.5 py-1 rounded-lg hover:bg-purple-500/10 transition-colors">Score</button>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default ScoresSection;
