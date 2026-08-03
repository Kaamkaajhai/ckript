import { useAdminDashboard } from "../dashboardContext";
import { getScriptCreatorName, getUserCompany, getUserGenres } from "../dashboardShared";
import { formatCurrency } from "../../../utils/currency";
import { StatCard } from "../../../components/AdminUI";

/**
 * "overview" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5b. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const OverviewSection = () => {
    const {
        search,
        filteredContacts,
        filteredInvoices,
        filteredPendingInvestors,
        filteredScripts,
        filteredTransactions,
        filteredUsers,
        hasSearch,
        isDark,
        stats,
    } = useAdminDashboard();

                if (!stats) return null;
                if (hasSearch) {
                    const totalMatches =
                        filteredUsers.length +
                        filteredScripts.length +
                        filteredInvoices.length +
                        filteredTransactions.length +
                        filteredPendingInvestors.length +
                        filteredContacts.length;

                    const resultBlocks = [
                        {
                            key: "users",
                            title: "Users",
                            count: filteredUsers.length,
                            lines: filteredUsers.slice(0, 6).map((u) => `${u.name || "-"} • ${u.email || "-"} • ${u.role || "-"} • ${u.phone || "No phone"} • ${getUserCompany(u) || "No company"} • ${getUserGenres(u) || "No genres"}`),
                        },
                        {
                            key: "projects",
                            title: "Projects",
                            count: filteredScripts.length,
                            lines: filteredScripts.slice(0, 6).map((s) => `${s.title || "-"} • SID: ${s.sid || "-"} • ${getScriptCreatorName(s)}`),
                        },
                        {
                            key: "invoices",
                            title: "Invoices",
                            count: filteredInvoices.length,
                            lines: filteredInvoices.slice(0, 6).map((inv) => `${inv.invoiceNumber || "-"} • ${inv.creator?.name || "-"} • ${inv.script?.title || "-"}`),
                        },
                        {
                            key: "payments",
                            title: "Payments",
                            count: filteredTransactions.length,
                            lines: filteredTransactions.slice(0, 6).map((t) => `${t.user?.name || "-"} • ${t.type || "-"} • ${formatCurrency(t.amount || 0, t.currency || "INR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
                        },
                        {
                            key: "requests",
                            title: "Investor Requests",
                            count: filteredPendingInvestors.length,
                            lines: filteredPendingInvestors.slice(0, 6).map((inv) => `${inv.name || "-"} • ${inv.email || "-"}`),
                        },
                        {
                            key: "queries",
                            title: "Queries",
                            count: filteredContacts.length,
                            lines: filteredContacts.slice(0, 6).map((c) => `${c.name || "-"} • ${c.reason || "-"} • ${c.email || "-"}`),
                        },
                    ];

                    return (
                        <div>
                            <div className="flex items-end justify-between mb-5 gap-4">
                                <div>
                                    <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Search Results</h2>
                                    <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                        Showing cross-section matches for "{search.trim()}"
                                    </p>
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDark ? "bg-[#a83a4d]/15 text-[#e79aa6]" : "bg-[#f7edee] text-[#a83a4d]"}`}>
                                    {totalMatches} match{totalMatches === 1 ? "" : "es"}
                                </span>
                            </div>

                            {totalMatches === 0 ? (
                                <div className={`rounded-2xl border p-10 text-center ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                    <p className={`text-sm font-semibold ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                        No results found. Try a different keyword.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {resultBlocks.filter((block) => block.count > 0).map((block) => (
                                        <div key={block.key} className={`rounded-2xl border p-4 ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className={`text-sm font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>{block.title}</h3>
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isDark ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-700"}`}>{block.count}</span>
                                            </div>
                                            <div className="space-y-2">
                                                {block.lines.map((line, index) => (
                                                    <p key={`${block.key}-${index}`} className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                        {line}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                }
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Platform Overview</h2>
                        <div className="space-y-8">
                            <div>
                                <h3 className={`text-sm font-extrabold uppercase tracking-wide mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Platform Snapshot</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard isDark={isDark} label="Total Users" value={stats.totalUsers || 0} icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" color="bg-[#a83a4d]/15 text-[#a83a4d]" />
                                    <StatCard isDark={isDark} label="Total Scripts" value={stats.totalScripts || 0} icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" color="bg-purple-500/15 text-purple-500" />
                                    <StatCard isDark={isDark} label="Published Scripts" value={stats.publishedScripts || 0} icon="M5.25 6.75h13.5M5.25 12h13.5m-13.5 5.25h13.5" color="bg-indigo-500/15 text-indigo-500" />
                                    <StatCard isDark={isDark} label="Deleted Scripts" value={stats.deletedScripts || 0} icon="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79" color="bg-rose-500/15 text-rose-500" />
                                    <StatCard isDark={isDark} label="Writers" value={stats.totalWriters || 0} icon="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" color="bg-amber-500/15 text-amber-500" />
                                    <StatCard isDark={isDark} label="Film Professionals" value={stats.totalInvestors || 0} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-emerald-500/15 text-emerald-500" />
                                    <StatCard isDark={isDark} label="Readers" value={stats.totalReaders || 0} icon="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" color="bg-cyan-500/15 text-cyan-500" />
                                    <StatCard isDark={isDark} label="Total Revenue" value={`₹${stats.totalRevenue?.toFixed(2) || "0.00"}`} icon="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-green-500/15 text-green-500" />
                                </div>
                            </div>

                            <div>
                                <h3 className={`text-sm font-extrabold uppercase tracking-wide mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Script Pipeline</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard isDark={isDark} label="Draft Scripts" value={stats.draftScripts || 0} icon="M3.375 19.5h17.25M4.5 16.5V6.75A2.25 2.25 0 016.75 4.5h10.5A2.25 2.25 0 0119.5 6.75v9.75" color="bg-slate-500/15 text-slate-500" />
                                    <StatCard isDark={isDark} label="Rejected Scripts" value={stats.rejectedScripts || 0} icon="M6 18L18 6M6 6l12 12" color="bg-red-500/15 text-red-500" />
                                    <StatCard isDark={isDark} label="Sold Scripts" value={stats.soldScripts || 0} icon="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25h11.218" color="bg-lime-500/15 text-lime-500" />
                                    <StatCard isDark={isDark} label="Pending Script Approvals" value={stats.pendingApprovals || 0} icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-orange-500/15 text-orange-500" />
                                    <StatCard isDark={isDark} label="Pending AI Trailer Approvals" value={stats.pendingTrailerRequests || 0} icon="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375V5.625A1.125 1.125 0 016 4.5h12a1.125 1.125 0 011.125 1.125v12.75c0 .621-.504 1.125-1.125 1.125h1.5" color="bg-fuchsia-500/15 text-fuchsia-500" />
                                    <StatCard isDark={isDark} label="AI Usage Scripts" value={stats.aiUsageScripts || 0} icon="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" color="bg-violet-500/15 text-violet-500" />
                                    <StatCard isDark={isDark} label="Evaluation Scripts" value={stats.evaluationScripts || 0} icon="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" color="bg-sky-500/15 text-sky-500" />
                                    <StatCard isDark={isDark} label="Transactions" value={stats.totalTransactions || 0} icon="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" color="bg-pink-500/15 text-pink-500" />
                                </div>
                            </div>

                            <div>
                                <h3 className={`text-sm font-extrabold uppercase tracking-wide mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Pending Actions</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard isDark={isDark} label="Pending SWA/WGA Reviews" value={stats.pendingMembershipReviews || 0} icon="M9 12.75L11.25 15 15 9.75m-6-7.5A2.25 2.25 0 0111.25 0h1.5A2.25 2.25 0 0115 2.25v1.134a9 9 0 11-6 0V2.25z" color="bg-amber-500/15 text-amber-500" />
                                    <StatCard isDark={isDark} label="Pending Bank Reviews" value={stats.pendingBankReviews || 0} icon="M3.75 4.5h16.5A1.5 1.5 0 0121.75 6v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5zM6 9h12M6 13.5h5.25" color="bg-orange-500/15 text-orange-500" />
                                    <StatCard isDark={isDark} label="Locked Bank Users" value={stats.lockedBankUsers || 0} icon="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5A1.5 1.5 0 0118.75 12v7.5a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5V12a1.5 1.5 0 011.5-1.5z" color="bg-yellow-500/15 text-yellow-500" />
                                    <StatCard isDark={isDark} label="Bank Review Alerts" value={stats.bankReviewAlerts || 0} icon="M12 9v3.75m9 0a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-red-500/15 text-red-500" />
                                    <StatCard isDark={isDark} label="Queries" value={stats.queries || 0} icon="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75" color="bg-cyan-500/15 text-cyan-500" />
                                    <StatCard isDark={isDark} label="Deleted Accounts" value={stats.deletedAccounts || 0} icon="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166" color="bg-rose-500/15 text-rose-500" />
                                    <StatCard isDark={isDark} label="Deleted Film Professionals" value={stats.deletedFilmProfessionals || 0} icon="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166" color="bg-orange-500/15 text-orange-500" />
                                    <StatCard isDark={isDark} label="Deleted Writers" value={stats.deletedWriters || 0} icon="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166" color="bg-pink-500/15 text-pink-500" />
                                    <StatCard isDark={isDark} label="Open Admin Actions" value={stats.openAdminActions || 0} icon="M11.25 3.75h1.5m-1.5 16.5h1.5m-7.5-7.5h16.5" color="bg-indigo-500/15 text-indigo-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
};

export default OverviewSection;
