import { useAdminDashboard } from "../dashboardContext";
import { Pagination, ScriptTable } from "../dashboardShared";

/**
 * "investor-purchases" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const InvestorPurchasesSection = () => {
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
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Investor Purchases<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span></h2>
                        <ScriptTable scripts={filteredScripts} isDark={isDark} showScore={false}
                            actions={(s) => (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <a
                                        href={`/admin/scripts/${s._id}`}
                                        className="text-xs font-bold text-[#a83a4d] hover:text-[#e79aa6] px-2.5 py-1 rounded-lg hover:bg-[#a83a4d]/10 transition-colors"
                                    >
                                        View
                                    </a>
                                    {s.unlockedBy?.map((u) => (
                                        <span key={u._id || u} className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                                            {u.name || "Investor"}
                                        </span>
                                    ))}
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default InvestorPurchasesSection;
