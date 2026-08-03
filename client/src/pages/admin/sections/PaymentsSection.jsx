import { useAdminDashboard } from "../dashboardContext";
import { Pagination, TransactionTable } from "../dashboardShared";

/**
 * "payments" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const PaymentsSection = () => {
    const {
        filteredTransactions,
        hasSearch,
        isDark,
        page,
        setPage,
        total,
        totalPages,
    } = useAdminDashboard();

                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Payment Transactions<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredTransactions.length : total})</span></h2>
                        <TransactionTable transactions={filteredTransactions} isDark={isDark} />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default PaymentsSection;
