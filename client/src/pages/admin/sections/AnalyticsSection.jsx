import { useAdminDashboard } from "../dashboardContext";
import AdminAnalyticsPanel from "../../../components/AdminAnalyticsPanel";
import { API_BASE_URL } from "../dashboardShared";

/**
 * "analytics" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const AnalyticsSection = () => {
    const {
        analyticsAnonymousDetail,
        analyticsAnonymousDetailLoading,
        analyticsData,
        analyticsRegisteredSearch,
        analyticsRegisteredStatusFilter,
        analyticsSection,
        analyticsUserDetail,
        analyticsUserDetailLoading,
        fetchAnalyticsAnonymousDetail,
        fetchAnalyticsUserDetail,
        fetchData,
        isDark,
        loading,
        setAnalyticsAnonymousDetail,
        setAnalyticsRegisteredSearch,
        setAnalyticsRegisteredStatusFilter,
        setAnalyticsSection,
        setAnalyticsUserDetail,
    } = useAdminDashboard();

                return (
                    <AdminAnalyticsPanel
                        isDark={isDark}
                        analyticsData={analyticsData}
                        analyticsSection={analyticsSection}
                        setAnalyticsSection={setAnalyticsSection}
                        analyticsAnonymousDetail={analyticsAnonymousDetail}
                        analyticsAnonymousDetailLoading={analyticsAnonymousDetailLoading}
                        fetchAnalyticsAnonymousDetail={fetchAnalyticsAnonymousDetail}
                        setAnalyticsAnonymousDetail={setAnalyticsAnonymousDetail}
                        analyticsUserDetail={analyticsUserDetail}
                        analyticsUserDetailLoading={analyticsUserDetailLoading}
                        fetchAnalyticsUserDetail={fetchAnalyticsUserDetail}
                        setAnalyticsUserDetail={setAnalyticsUserDetail}
                        analyticsRegisteredSearch={analyticsRegisteredSearch}
                        setAnalyticsRegisteredSearch={setAnalyticsRegisteredSearch}
                        analyticsRegisteredStatusFilter={analyticsRegisteredStatusFilter}
                        setAnalyticsRegisteredStatusFilter={setAnalyticsRegisteredStatusFilter}
                        apiBaseUrl={API_BASE_URL}
                        onRefresh={() => fetchData()}
                        refreshing={loading}
                    />
                );
};

export default AnalyticsSection;
