import { useEffect, useState } from "react";
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Icon, StatCard } from "./AdminUI";
import { formatDuration, formatDateTime, formatRelativeTime, formatPathLabel, getAnalyticsStatusTone, humanizeEventLabel, getInitials, getAvatarTone } from "../utils/adminFormatters";

// Validated (see dataviz skill) against this admin panel's card surface (#0f1d35, dark).
const COLORS = {
    visitors: "#3987e5",
    signups: "#008300",
    logins: "#d55181",
    deviceMobile: "#3987e5",
    deviceDesktop: "#199e70",
    deviceTablet: "#c98500",
    neutral: "#64748b",
    statusLive: "#059669",
    statusRecent: "#2563eb",
    statusToday: "#d97706",
    statusOffline: "#64748b",
    bar: "#3987e5",
};

const getTimeValue = (value) => {
    const ts = value ? new Date(value).getTime() : 0;
    return Number.isFinite(ts) ? ts : 0;
};

const getTooltipStyle = (isDark) => ({
    backgroundColor: isDark ? "#132744" : "#ffffff",
    border: `1px solid ${isDark ? "#294468" : "#e5e7eb"}`,
    borderRadius: 8,
    fontSize: 12,
    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.06)",
    color: isDark ? "#e5e7eb" : "#111827",
});

const Panel = ({ isDark, className = "", children }) => (
    <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"} ${className}`}>
        {children}
    </div>
);

const PanelHeading = ({ isDark, action, children }) => (
    <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className={`text-sm font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>{children}</h3>
        {action}
    </div>
);

// ─── Trend line chart: New Visitors / Signups / Logins over the last 14 days ───
const TrendChart = ({ isDark, chartsReady, data }) => {
    const tick = { fontSize: 11, fill: isDark ? "#94a3b8" : "#6b7280" };
    const textMuted = isDark ? "text-gray-400" : "text-gray-500";
    const hasActivity = data.some((d) => d.visitors || d.signups || d.logins);
    const series = [
        { key: "visitors", label: "New Visitors", color: COLORS.visitors },
        { key: "signups", label: "Signups", color: COLORS.signups },
        { key: "logins", label: "Logins", color: COLORS.logins },
    ];

    return (
        <div>
            <div style={{ width: "100%", height: 240 }}>
                {chartsReady && (
                    <ResponsiveContainer width="100%" height={240} minWidth={0}>
                        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6"} vertical={false} />
                            <XAxis dataKey="label" tick={tick} axisLine={{ stroke: isDark ? "#294468" : "#e5e7eb" }} tickLine={false} minTickGap={24} />
                            <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={32} />
                            <Tooltip contentStyle={getTooltipStyle(isDark)} cursor={{ stroke: isDark ? "#294468" : "#e5e7eb" }} />
                            {series.map((s) => (
                                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
                {series.map((s) => (
                    <div key={s.key} className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className={`text-[11px] font-medium ${textMuted}`}>{s.label}</span>
                    </div>
                ))}
            </div>
            {!hasActivity && (
                <p className={`mt-2 text-center text-xs ${textMuted}`}>No visitor, signup, or login activity in the last 14 days yet.</p>
            )}
        </div>
    );
};

// ─── Donut breakdown with a hero total in the center and a numeric legend ───
const DonutBreakdown = ({ isDark, chartsReady, data }) => {
    const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
    const textMuted = isDark ? "text-gray-400" : "text-gray-500";
    const textStrong = isDark ? "text-gray-200" : "text-gray-800";

    if (total === 0) {
        return <p className={`text-sm ${textMuted}`}>No data yet.</p>;
    }

    return (
        <div className="flex items-center gap-5">
            <div style={{ width: 148, height: 148 }} className="relative shrink-0">
                {chartsReady && (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="label"
                                innerRadius="62%"
                                outerRadius="100%"
                                paddingAngle={2}
                                stroke={isDark ? "#0f1d35" : "#ffffff"}
                                strokeWidth={2}
                            >
                                {data.map((entry) => <Cell key={entry.key} fill={entry.color} />)}
                            </Pie>
                            <Tooltip
                                contentStyle={getTooltipStyle(isDark)}
                                formatter={(value, name) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-lg font-extrabold ${textStrong}`}>{total}</span>
                    <span className={`text-[10px] uppercase tracking-wide ${textMuted}`}>Total</span>
                </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
                {data.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className={`truncate font-semibold ${textStrong}`}>{entry.label}</span>
                        </span>
                        <span className={`shrink-0 font-bold ${textMuted}`}>{entry.value}{total ? ` · ${Math.round((entry.value / total) * 100)}%` : ""}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Ranked horizontal bar chart for a single-measure top-N list ───
const RankedBarChart = ({ isDark, chartsReady, data, barColor = COLORS.bar }) => {
    const textMuted = isDark ? "text-gray-400" : "text-gray-500";
    if (!data || data.length === 0) {
        return <p className={`text-sm ${textMuted}`}>No data yet.</p>;
    }
    const chartHeight = Math.max(120, data.length * 32);
    const tick = { fontSize: 11, fill: isDark ? "#94a3b8" : "#6b7280" };

    return (
        <div style={{ width: "100%", height: chartHeight }}>
            {chartsReady && (
                <ResponsiveContainer width="100%" height={chartHeight} minWidth={0}>
                    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6"} horizontal={false} />
                        <XAxis type="number" tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="label" width={132} tick={tick} axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={getTooltipStyle(isDark)}
                            cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}
                        />
                        <Bar dataKey="value" fill={barColor} radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

const ListRow = ({ isDark, left, right }) => (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-black/5 px-3 py-2">
        <span className={`truncate text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>{left}</span>
        <span className={`shrink-0 text-sm font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>{right}</span>
    </div>
);

// Small avatar circle with initials, used to make user lists scannable at a glance.
const Avatar = ({ name, size = "h-10 w-10 text-sm" }) => (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-full font-bold ${getAvatarTone(name)}`}>
        {getInitials(name)}
    </div>
);

// A compact icon + label + value tile, used for the key-metrics rows in the user detail panel.
const MetricTile = ({ isDark, icon, label, value }) => (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${isDark ? "bg-black/20" : "bg-slate-50"}`}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isDark ? "bg-white/5 text-gray-400" : "bg-white text-gray-500"}`}>
            <Icon d={icon} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
            <p className={`text-base font-extrabold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>{value}</p>
            <p className={`text-[11px] leading-tight ${isDark ? "text-gray-500" : "text-gray-500"}`}>{label}</p>
        </div>
    </div>
);

// A titled card used throughout the user detail panel, optionally with a right-aligned action/badge.
const DetailCard = ({ isDark, title, action, children, className = "" }) => (
    <div className={`rounded-xl border p-3 ${isDark ? "border-[#1a3050]" : "border-gray-200"} ${className}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className={`text-xs font-bold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-600"}`}>{title}</h4>
            {action}
        </div>
        {children}
    </div>
);

// ════════════════════════════════════════════════════════════════════════
// Overview tab
// ════════════════════════════════════════════════════════════════════════
const OverviewTab = ({
    isDark, chartsReady, anonymousSummary, registeredSummary, live, alerts, recentAuthEvents,
    trendData, deviceData, statusData, roleData, locationsTop, pagesTop, clickedTop, setAnalyticsSection,
}) => {
    const totalVisitors = anonymousSummary.totalVisitors || 0;
    const returningVisitors = anonymousSummary.returningVisitors || 0;
    const returningRate = totalVisitors > 0 ? Math.round((returningVisitors / totalVisitors) * 100) : 0;
    const totalFootprint = totalVisitors + (registeredSummary.totalUsers || 0);
    const liveNow = (live.activeAnonymousUsers || 0) + (live.activeRegisteredUsers || 0);
    const authSummary = registeredSummary.authSummary || {};

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard isDark={isDark} label="Total Footprint" value={totalFootprint} icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493" color="bg-blue-500/15 text-blue-500" />
                <StatCard isDark={isDark} label="Live Right Now" value={liveNow} icon="M3 12h4l3 8 4-16 3 8h4" color="bg-emerald-500/15 text-emerald-500" />
                <StatCard isDark={isDark} label="Returning Rate" value={`${returningRate}%`} icon="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992" color="bg-amber-500/15 text-amber-500" />
                <StatCard isDark={isDark} label="Total Signups" value={authSummary.totalSignupEvents || 0} icon="M12 4.5v15m7.5-7.5h-15" color="bg-purple-500/15 text-purple-500" />
                <StatCard isDark={isDark} label="Total Logins" value={authSummary.totalLoginEvents || 0} icon="M11.25 6.75v5.25l3.75 2.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-cyan-500/15 text-cyan-500" />
            </div>

            <Panel isDark={isDark}>
                <PanelHeading isDark={isDark}>14-Day Trend</PanelHeading>
                <TrendChart isDark={isDark} chartsReady={chartsReady} data={trendData} />
            </Panel>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel isDark={isDark}>
                    <PanelHeading isDark={isDark}>Device Breakdown</PanelHeading>
                    <DonutBreakdown isDark={isDark} chartsReady={chartsReady} data={deviceData} />
                </Panel>
                <Panel isDark={isDark}>
                    <PanelHeading isDark={isDark}>Registered User Status</PanelHeading>
                    <DonutBreakdown isDark={isDark} chartsReady={chartsReady} data={statusData} />
                </Panel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel isDark={isDark}>
                    <PanelHeading isDark={isDark}>Top Locations</PanelHeading>
                    <RankedBarChart isDark={isDark} chartsReady={chartsReady} data={locationsTop} />
                </Panel>
                <Panel isDark={isDark}>
                    <PanelHeading isDark={isDark}>Top Pages</PanelHeading>
                    <RankedBarChart isDark={isDark} chartsReady={chartsReady} data={pagesTop} />
                </Panel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel isDark={isDark}>
                    <PanelHeading isDark={isDark}>Registered Users By Role</PanelHeading>
                    <RankedBarChart isDark={isDark} chartsReady={chartsReady} data={roleData} />
                </Panel>
                <Panel isDark={isDark}>
                    <PanelHeading isDark={isDark}>Top Clicked Elements</PanelHeading>
                    <RankedBarChart isDark={isDark} chartsReady={chartsReady} data={clickedTop} />
                </Panel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel isDark={isDark}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>Returning Visitor Alerts</p>
                            <p className={`mt-1 text-2xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>{alerts.length}</p>
                        </div>
                        <button type="button" onClick={() => setAnalyticsSection("anonymous")} className="shrink-0 text-xs font-bold text-blue-400 hover:text-blue-300">
                            View all →
                        </button>
                    </div>
                    <div className="mt-3 space-y-1.5">
                        {alerts.length === 0 ? (
                            <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No return alerts yet.</p>
                        ) : (
                            alerts.slice(0, 3).map((alert, index) => (
                                <p key={`${alert.anonymousId}-${index}`} className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                    {alert.anonymousId} · {alert.city || "Unknown"}, {alert.country || "Unknown"}
                                </p>
                            ))
                        )}
                    </div>
                </Panel>
                <Panel isDark={isDark}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>Recent Login / Signup Events</p>
                            <p className={`mt-1 text-2xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>{recentAuthEvents.length}</p>
                        </div>
                        <button type="button" onClick={() => setAnalyticsSection("registered")} className="shrink-0 text-xs font-bold text-blue-400 hover:text-blue-300">
                            View all →
                        </button>
                    </div>
                    <div className="mt-3 space-y-1.5">
                        {recentAuthEvents.length === 0 ? (
                            <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No auth events yet.</p>
                        ) : (
                            recentAuthEvents.slice(0, 3).map((event, index) => (
                                <p key={`${event.userId}-${index}`} className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                    {event.userName} · {event.type}
                                </p>
                            ))
                        )}
                    </div>
                </Panel>
            </div>
        </div>
    );
};

export default function AdminAnalyticsPanel({
    isDark,
    analyticsData,
    analyticsSection,
    setAnalyticsSection,
    analyticsAnonymousDetail,
    analyticsAnonymousDetailLoading,
    fetchAnalyticsAnonymousDetail,
    setAnalyticsAnonymousDetail,
    analyticsUserDetail,
    analyticsUserDetailLoading,
    fetchAnalyticsUserDetail,
    setAnalyticsUserDetail,
    analyticsRegisteredSearch,
    setAnalyticsRegisteredSearch,
    analyticsRegisteredStatusFilter,
    setAnalyticsRegisteredStatusFilter,
    apiBaseUrl,
    onRefresh,
    refreshing,
}) {
    const [chartsReady, setChartsReady] = useState(false);
    const [showAllLocations, setShowAllLocations] = useState(false);
    const [showRawClicks, setShowRawClicks] = useState(false);
    const [registeredSort, setRegisteredSort] = useState("recent");
    const [showFullActivityTrail, setShowFullActivityTrail] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setChartsReady(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    const anonymousSummary = analyticsData?.anonymousVisitors || {};
    const registeredSummary = analyticsData?.registeredUsers || {};
    const alerts = analyticsData?.alerts?.returnedUsers || [];
    const live = analyticsData?.liveActivity || {};
    const trends = analyticsData?.trends || {};
    const pageVisits = anonymousSummary.pageVisits || [];
    const locations = anonymousSummary.locationBreakdown || [];
    const anonymousUsers = anonymousSummary.anonymousUsers || [];
    const usersTimeline = registeredSummary.users || [];
    const authSummary = registeredSummary.authSummary || {};
    const recentAuthEvents = registeredSummary.recentAuthEvents || [];
    const registeredActivitySummary = registeredSummary.activitySummary || {};

    const selectedAnonymous = analyticsAnonymousDetail?.anonymous || {};
    const selectedAnonymousSummary = analyticsAnonymousDetail?.summary || {};
    const selectedAnonymousDevices = analyticsAnonymousDetail?.devices || [];
    const selectedAnonymousLocations = analyticsAnonymousDetail?.locations || [];
    const selectedAnonymousPages = analyticsAnonymousDetail?.pages || [];
    const selectedAnonymousSessions = analyticsAnonymousDetail?.sessions || [];
    const selectedAnonymousEvents = analyticsAnonymousDetail?.latestEvents || [];
    const selectedAnonymousClicks = analyticsAnonymousDetail?.latestClicks || [];

    const selectedUser = analyticsUserDetail?.user || {};
    const selectedSummary = analyticsUserDetail?.summary || {};
    const selectedDevices = analyticsUserDetail?.devices || [];
    const selectedLocations = analyticsUserDetail?.locations || [];
    const selectedPages = analyticsUserDetail?.pages || [];
    const selectedSessions = analyticsUserDetail?.sessions || [];
    const selectedAuthEvents = analyticsUserDetail?.authEvents || [];
    const selectedActions = analyticsUserDetail?.latestActions || [];
    const selectedProjectSummary = analyticsUserDetail?.projectSummary || {};
    const selectedLatestSession = analyticsUserDetail?.latestSession || null;
    const selectedStatusTone = getAnalyticsStatusTone(selectedUser?.currentStatus?.key, isDark);

    const normalizedRegisteredSearch = analyticsRegisteredSearch.trim().toLowerCase();
    const filteredRegisteredUsers = usersTimeline.filter((entry) => {
        const matchesSearchValue = !normalizedRegisteredSearch || [
            entry?.name,
            entry?.email,
            entry?.role,
            entry?.sid,
            entry?.latestPath,
            entry?.latestAction,
            entry?.projectSummary?.recentProjects?.map((project) => project?.title).join(" "),
        ].some((value) => String(value || "").toLowerCase().includes(normalizedRegisteredSearch));

        const statusKey = String(entry?.currentStatus?.key || "offline").toLowerCase();
        const matchesStatus = analyticsRegisteredStatusFilter === "all" || statusKey === analyticsRegisteredStatusFilter;

        return matchesSearchValue && matchesStatus;
    });

    const REGISTERED_SORTERS = {
        recent: (a, b) => getTimeValue(b?.lastActiveAt) - getTimeValue(a?.lastActiveAt),
        sessions: (a, b) => (b?.sessionCount || 0) - (a?.sessionCount || 0),
        projects: (a, b) => (b?.projectSummary?.totalProjects || 0) - (a?.projectSummary?.totalProjects || 0),
        name: (a, b) => String(a?.name || "").localeCompare(String(b?.name || "")),
    };
    const sortedRegisteredUsers = [...filteredRegisteredUsers].sort(REGISTERED_SORTERS[registeredSort] || REGISTERED_SORTERS.recent);

    // ─── Derived chart data ───
    const trendDays = trends.newVisitorsByDay || [];
    const trendData = trendDays.map((day, index) => ({
        label: day.label,
        visitors: day.count || 0,
        signups: trends.signupsByDay?.[index]?.count || 0,
        logins: trends.loginsByDay?.[index]?.count || 0,
    }));

    const deviceBreakdown = anonymousSummary.deviceBreakdown || {};
    const deviceData = [
        { key: "mobile", label: "Mobile", value: deviceBreakdown.mobile || 0, color: COLORS.deviceMobile },
        { key: "desktop", label: "Desktop", value: deviceBreakdown.desktop || 0, color: COLORS.deviceDesktop },
        { key: "tablet", label: "Tablet", value: deviceBreakdown.tablet || 0, color: COLORS.deviceTablet },
        { key: "unknown", label: "Unknown", value: deviceBreakdown.unknown || 0, color: COLORS.neutral },
    ];

    const statusCounts = { live: 0, recent: 0, today: 0, offline: 0 };
    usersTimeline.forEach((user) => {
        const key = user?.currentStatus?.key;
        if (key && statusCounts[key] !== undefined) statusCounts[key] += 1;
        else statusCounts.offline += 1;
    });
    const statusData = [
        { key: "live", label: "Live now", value: statusCounts.live, color: COLORS.statusLive },
        { key: "recent", label: "Recently online", value: statusCounts.recent, color: COLORS.statusRecent },
        { key: "today", label: "Active today", value: statusCounts.today, color: COLORS.statusToday },
        { key: "offline", label: "Offline", value: statusCounts.offline, color: COLORS.statusOffline },
    ];

    const roleData = Object.entries(registeredSummary.roleBreakdown || {})
        .map(([role, count]) => ({ label: role || "unknown", value: count }))
        .sort((a, b) => b.value - a.value);

    const authSplitData = [
        { key: "signups", label: "Signups", value: authSummary.totalSignupEvents || 0, color: COLORS.signups },
        { key: "logins", label: "Logins", value: authSummary.totalLoginEvents || 0, color: COLORS.logins },
    ];

    const locationsTop = locations.slice(0, 8).map((entry) => ({
        label: `${entry.city || "Unknown"}, ${entry.country || "Unknown"}`,
        value: entry.count,
    }));

    const locationsTop15 = locations.slice(0, 15).map((entry) => ({
        label: `${entry.city || "Unknown"}, ${entry.country || "Unknown"}`,
        value: entry.count,
    }));

    const pagesTop = pageVisits.slice(0, 8).map((entry) => ({
        label: formatPathLabel(entry.page),
        value: entry.visits,
    }));

    const clickedTop = (anonymousSummary.topClickedElements || []).slice(0, 10).map((entry) => ({
        label: entry.section ? `${entry.label} · ${entry.section}` : entry.label,
        value: entry.count,
    }));

    const tabButtonClass = (key) => (
        `px-3 py-2 rounded-lg text-xs font-bold transition-all ${analyticsSection === key
            ? (isDark ? "bg-blue-500/25 text-blue-100 shadow-sm shadow-blue-500/20" : "bg-white text-blue-700 shadow-sm")
            : (isDark ? "text-gray-300 hover:bg-[#1b3558] hover:text-white" : "text-gray-600 hover:bg-white/70")
        }`
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>User Tracking Analytics</h2>
                    <p className={`mt-0.5 text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        {analyticsData?.generatedAt ? `Last updated ${formatRelativeTime(analyticsData.generatedAt)}` : "Loading latest data..."}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className={`flex gap-1 rounded-lg p-1 ${isDark ? "bg-[#132744]/60" : "bg-gray-100"}`}>
                        {[
                            { key: "overview", label: "Overview" },
                            { key: "anonymous", label: "Visitors" },
                            { key: "registered", label: "Registered Users" },
                        ].map((tab) => (
                            <button key={tab.key} type="button" onClick={() => setAnalyticsSection(tab.key)} className={tabButtonClass(tab.key)}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={refreshing}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${isDark ? "border-[#294468] bg-[#132744]/60 text-gray-200 hover:bg-[#1b3558]" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
                    >
                        <Icon d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <a
                        href={`${apiBaseUrl}/admin/analytics?format=csv`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                        Export CSV
                    </a>
                </div>
            </div>

            {analyticsSection === "overview" && (
                <OverviewTab
                    isDark={isDark}
                    chartsReady={chartsReady}
                    anonymousSummary={anonymousSummary}
                    registeredSummary={registeredSummary}
                    live={live}
                    alerts={alerts}
                    recentAuthEvents={recentAuthEvents}
                    trendData={trendData}
                    deviceData={deviceData}
                    statusData={statusData}
                    roleData={roleData}
                    locationsTop={locationsTop}
                    pagesTop={pagesTop}
                    clickedTop={clickedTop}
                    setAnalyticsSection={setAnalyticsSection}
                />
            )}

            {analyticsSection === "anonymous" && (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard isDark={isDark} label="Total Visitors" value={anonymousSummary.totalVisitors || 0} icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493" color="bg-blue-500/15 text-blue-500" />
                        <StatCard isDark={isDark} label="New Visitors" value={anonymousSummary.newVisitors || 0} icon="M12 4.5v15m7.5-7.5h-15" color="bg-emerald-500/15 text-emerald-500" />
                        <StatCard isDark={isDark} label="Returning Visitors" value={anonymousSummary.returningVisitors || 0} icon="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992" color="bg-amber-500/15 text-amber-500" />
                        <StatCard isDark={isDark} label="Live Anonymous" value={live.activeAnonymousUsers || 0} icon="M3 12h4l3 8 4-16 3 8h4" color="bg-purple-500/15 text-purple-500" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Panel isDark={isDark}>
                            <PanelHeading isDark={isDark}>Device Breakdown</PanelHeading>
                            <DonutBreakdown isDark={isDark} chartsReady={chartsReady} data={deviceData} />
                        </Panel>
                        <Panel isDark={isDark}>
                            <PanelHeading isDark={isDark}>Returning Visitor Alerts</PanelHeading>
                            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                                {alerts.length === 0 ? (
                                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No return alerts yet.</p>
                                ) : (
                                    alerts.map((alert, index) => (
                                        <div key={`${alert.anonymousId}-${index}`} className={`rounded-lg border px-3 py-2 ${isDark ? "border-[#1a3050]" : "border-gray-200"}`}>
                                            <p className={`text-xs font-semibold ${isDark ? "text-gray-100" : "text-gray-800"}`}>{alert.anonymousId}</p>
                                            <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                                {alert.city || "Unknown"}, {alert.country || "Unknown"} • {alert.path || "-"}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Panel>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Panel isDark={isDark}>
                            <PanelHeading
                                isDark={isDark}
                                action={locations.length > 8 && (
                                    <button type="button" onClick={() => setShowAllLocations((prev) => !prev)} className="text-xs font-bold text-blue-400 hover:text-blue-300">
                                        {showAllLocations ? "Hide full list" : `View all ${locations.length}`}
                                    </button>
                                )}
                            >
                                Top Locations
                            </PanelHeading>
                            <RankedBarChart isDark={isDark} chartsReady={chartsReady} data={locationsTop15} />
                            {showAllLocations && (
                                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                                    {locations.map((entry) => (
                                        <ListRow
                                            key={`${entry.region}-${entry.city}-${entry.country}`}
                                            isDark={isDark}
                                            left={`${entry.region || "Unknown"}, ${entry.city || "Unknown"}, ${entry.country || "Unknown"}`}
                                            right={entry.count}
                                        />
                                    ))}
                                </div>
                            )}
                        </Panel>

                        <Panel isDark={isDark}>
                            <PanelHeading
                                isDark={isDark}
                                action={(anonymousSummary.clickHeatmap || []).length > 0 && (
                                    <button type="button" onClick={() => setShowRawClicks((prev) => !prev)} className="text-xs font-bold text-blue-400 hover:text-blue-300">
                                        {showRawClicks ? "Hide raw clicks" : "Show recent raw clicks"}
                                    </button>
                                )}
                            >
                                Top Clicked Elements
                            </PanelHeading>
                            <RankedBarChart isDark={isDark} chartsReady={chartsReady} data={clickedTop} />
                            {showRawClicks && (
                                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                                    {(anonymousSummary.clickHeatmap || []).slice(0, 50).map((click, index) => (
                                        <div key={`${click.path}-${index}`} className={`rounded-lg border px-3 py-2 ${isDark ? "border-[#1a3050]" : "border-gray-200"}`}>
                                            <p className={`text-xs font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Button: {click.label || click.text || click.element || "Unknown"}</p>
                                            <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>Page: {click.path || "-"} • Section: {click.section || "General"}</p>
                                            <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>Position: ({click.x}, {click.y})</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Panel>
                    </div>

                    <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                        <div className="max-h-80 overflow-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                        {["Page", "Visits", "Avg Time", "Total Time"].map((h) => (
                                            <th key={h} className={`px-5 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                    {pageVisits.slice(0, 25).map((item) => (
                                        <tr key={item.page}>
                                            <td className={`px-5 py-3.5 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{item.page}</td>
                                            <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{item.visits}</td>
                                            <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{formatDuration(item.avgTimeSeconds)}</td>
                                            <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{formatDuration(item.totalTimeSeconds)}</td>
                                        </tr>
                                    ))}
                                    {pageVisits.length === 0 && (
                                        <tr><td colSpan={4} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No page analytics yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                        <div className={`xl:col-span-2 rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {["Temporary ID", "Last Active", "Location", "Browser / OS", "Action"].map((h) => (
                                                <th key={h} className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {anonymousUsers.slice(0, 120).map((entry) => (
                                            <tr key={entry.anonymousId}>
                                                <td className={`px-4 py-3 text-xs font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{entry.anonymousId}</td>
                                                <td className={`px-4 py-3 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{entry.lastEventAt ? new Date(entry.lastEventAt).toLocaleString() : "-"}</td>
                                                <td className={`px-4 py-3 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{entry.location || "Unknown"}</td>
                                                <td className={`px-4 py-3 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                    <p>{entry.browser || "Unknown"} / {entry.os || "Unknown"}</p>
                                                    <p className={`${isDark ? "text-gray-500" : "text-gray-500"}`}>{entry.deviceType || "unknown"}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchAnalyticsAnonymousDetail(entry.anonymousId)}
                                                        disabled={!entry.anonymousId || analyticsAnonymousDetailLoading}
                                                        className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {anonymousUsers.length === 0 && (
                                            <tr><td colSpan={5} className={`px-4 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No anonymous visitors yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={`xl:col-span-3 rounded-2xl border p-4 ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            {analyticsAnonymousDetailLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-7 h-7 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                </div>
                            ) : !analyticsAnonymousDetail ? (
                                <div className="py-20 text-center">
                                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Select a temporary anonymous ID to inspect full behavior.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Temp ID: {selectedAnonymous.temporaryId || "-"}</h3>
                                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Returning: {selectedAnonymous.isReturning ? "Yes" : "No"} • Last Active: {selectedAnonymous.lastEventAt ? new Date(selectedAnonymous.lastEventAt).toLocaleString() : "-"}</p>
                                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Device: {selectedAnonymous.device?.deviceType || "unknown"} / {selectedAnonymous.device?.browser || "Unknown"} / {selectedAnonymous.device?.os || "Unknown"}</p>
                                        </div>
                                        <button
                                            type="button"
                                            className={`text-xs font-bold ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                                            onClick={() => setAnalyticsAnonymousDetail(null)}
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                        <div className="rounded-lg bg-black/5 px-3 py-2"><p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>Sessions</p><p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{selectedAnonymousSummary.totalSessions || 0}</p></div>
                                        <div className="rounded-lg bg-black/5 px-3 py-2"><p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>Events</p><p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{selectedAnonymousSummary.totalEvents || 0}</p></div>
                                        <div className="rounded-lg bg-black/5 px-3 py-2"><p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>Page Visits</p><p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{selectedAnonymousSummary.totalPageVisits || 0}</p></div>
                                        <div className="rounded-lg bg-black/5 px-3 py-2"><p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>Time Spent</p><p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{formatDuration(selectedAnonymousSummary.totalTimeSeconds || 0)}</p></div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                        <div className="rounded-lg border p-3">
                                            <h4 className={`mb-2 text-xs font-bold uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>Devices</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedAnonymousDevices.length === 0 ? <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No data</span> : selectedAnonymousDevices.map((item) => (
                                                    <span key={item.label || `${item.deviceType}-${item.browser}-${item.os}`} className={`px-2 py-1 rounded-full text-xs font-semibold ${isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-100 text-blue-700"}`}>{item.label || `${item.deviceType || "unknown"} / ${item.browser || "Unknown"} / ${item.os || "Unknown"}`} ({item.count})</span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border p-3">
                                            <h4 className={`mb-2 text-xs font-bold uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>Locations</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedAnonymousLocations.length === 0 ? <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No data</span> : selectedAnonymousLocations.map((item) => (
                                                    <span key={item.location} className={`px-2 py-1 rounded-full text-xs font-semibold ${isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>{item.location} ({item.count})</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                        <div className="rounded-lg border p-3">
                                            <h4 className={`mb-2 text-xs font-bold uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>Top Pages</h4>
                                            <div className="max-h-40 overflow-y-auto space-y-1">
                                                {selectedAnonymousPages.length === 0 ? <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No page events</p> : selectedAnonymousPages.slice(0, 30).map((page) => (
                                                    <p key={page.path} className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>{page.path} • {page.visits} visits • {formatDuration(page.totalTimeSeconds)}</p>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border p-3">
                                            <h4 className={`mb-2 text-xs font-bold uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>Latest Clicks</h4>
                                            <div className="max-h-40 overflow-y-auto space-y-1">
                                                {selectedAnonymousClicks.length === 0 ? <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No click data</p> : selectedAnonymousClicks.slice(0, 30).map((click, index) => (
                                                    <p key={`${click.sessionId}-${index}`} className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>{click.timestamp ? new Date(click.timestamp).toLocaleString() : "-"} • Page: {click.path || "-"} • Button: {click.label || click.text || click.element || "Unknown"} • Section: {click.section || "General"} • ({click.x}, {click.y})</p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-3">
                                        <h4 className={`mb-2 text-xs font-bold uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>Session Journey</h4>
                                        <div className="max-h-48 overflow-y-auto space-y-2">
                                            {selectedAnonymousSessions.length === 0 ? <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No sessions found</p> : selectedAnonymousSessions.slice(0, 20).map((session) => (
                                                <div key={session.sessionId} className={`rounded-md border px-2.5 py-2 ${isDark ? "border-[#1a3050]" : "border-gray-200"}`}>
                                                    <p className={`text-xs font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{session.sessionId}</p>
                                                    <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{`${session.entryPath || "-"} to ${session.exitPath || "-"} - ${formatDuration(session.durationSeconds || 0)}`}</p>
                                                    <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{`${session.location?.city || "Unknown"}, ${session.location?.country || "Unknown"} - ${session.device?.deviceType || "unknown"} / ${session.device?.browser || "Unknown"} / ${session.device?.os || "Unknown"}`}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-3">
                                        <h4 className={`mb-2 text-xs font-bold uppercase ${isDark ? "text-gray-400" : "text-gray-600"}`}>Latest Events</h4>
                                        <div className="max-h-52 overflow-y-auto space-y-1">
                                            {selectedAnonymousEvents.length === 0 ? <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No events</p> : selectedAnonymousEvents.slice(0, 80).map((event, index) => (
                                                <p key={`${event.eventType}-${index}`} className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>{event.timestamp ? new Date(event.timestamp).toLocaleString() : "-"} • {event.eventType} • {event.action || "-"} • {event.path || "-"}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {analyticsSection === "registered" && (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard isDark={isDark} label="Tracked Users" value={registeredSummary.totalUsers || 0} icon="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5z" color="bg-emerald-500/15 text-emerald-500" />
                        <StatCard isDark={isDark} label="Live Right Now" value={live.activeRegisteredUsers || 0} icon="M3 12h4l3 8 4-16 3 8h4" color="bg-emerald-500/15 text-emerald-500" />
                        <StatCard isDark={isDark} label="Active In 30 Min" value={registeredActivitySummary.activeInLast30Minutes || 0} icon="M11.25 6.75v5.25l3.75 2.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-blue-500/15 text-blue-500" />
                        <StatCard isDark={isDark} label="Users With Projects" value={registeredActivitySummary.usersWithProjects || 0} icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12" color="bg-purple-500/15 text-purple-500" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Panel isDark={isDark}>
                            <PanelHeading isDark={isDark}>Auth Event Summary</PanelHeading>
                            <DonutBreakdown isDark={isDark} chartsReady={chartsReady} data={authSplitData} />
                        </Panel>
                        <Panel isDark={isDark}>
                            <PanelHeading isDark={isDark}>Registered Users By Role</PanelHeading>
                            <RankedBarChart isDark={isDark} chartsReady={chartsReady} data={roleData} />
                        </Panel>
                    </div>

                    <Panel isDark={isDark}>
                        <PanelHeading isDark={isDark}>Recent Login / Signup Events</PanelHeading>
                        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                            {recentAuthEvents.length === 0 ? (
                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No auth events yet.</p>
                            ) : (
                                recentAuthEvents.slice(0, 25).map((event, index) => (
                                    <div key={`${event.userId}-${index}`} className={`rounded-lg border px-3 py-2 ${isDark ? "border-[#1a3050]" : "border-gray-200"}`}>
                                        <p className={`text-xs font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{event.userName} • {event.type}</p>
                                        <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{event.userEmail || "-"} • {event.timestamp ? new Date(event.timestamp).toLocaleString() : "-"}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </Panel>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
                        <div className={`xl:col-span-2 rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className={`border-b px-4 py-4 ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Registered Users</h3>
                                            <p className={`mt-1 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{sortedRegisteredUsers.length} of {usersTimeline.length} user records</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={registeredSort}
                                                onChange={(event) => setRegisteredSort(event.target.value)}
                                                className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none ${isDark ? "border-[#294468] bg-[#132744] text-gray-200" : "border-gray-200 bg-white text-gray-700"}`}
                                            >
                                                <option value="recent">Sort: Most recent</option>
                                                <option value="sessions">Sort: Most sessions</option>
                                                <option value="projects">Sort: Most projects</option>
                                                <option value="name">Sort: Name A-Z</option>
                                            </select>
                                            <select
                                                value={analyticsRegisteredStatusFilter}
                                                onChange={(event) => setAnalyticsRegisteredStatusFilter(event.target.value)}
                                                className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none ${isDark ? "border-[#294468] bg-[#132744] text-gray-200" : "border-gray-200 bg-white text-gray-700"}`}
                                            >
                                                <option value="all">All statuses</option>
                                                <option value="live">Live now</option>
                                                <option value="recent">Recently online</option>
                                                <option value="today">Active today</option>
                                                <option value="offline">Offline</option>
                                            </select>
                                        </div>
                                    </div>
                                    <input
                                        value={analyticsRegisteredSearch}
                                        onChange={(event) => setAnalyticsRegisteredSearch(event.target.value)}
                                        placeholder="Search name, email, role, page, project..."
                                        className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${isDark ? "border-[#294468] bg-[#081221] text-gray-100 placeholder:text-gray-500" : "border-gray-200 bg-slate-50 text-gray-800 placeholder:text-gray-400"}`}
                                    />
                                </div>
                            </div>

                            <div className="max-h-[980px] space-y-3 overflow-y-auto p-4">
                                {sortedRegisteredUsers.length === 0 ? (
                                    <div className={`rounded-2xl border border-dashed px-4 py-8 text-center text-sm ${isDark ? "border-[#294468] text-gray-500" : "border-gray-300 text-gray-500"}`}>No registered users match this filter.</div>
                                ) : (
                                    sortedRegisteredUsers.slice(0, 120).map((entry) => (
                                        <button
                                            key={String(entry.userId || entry.email)}
                                            type="button"
                                            onClick={() => fetchAnalyticsUserDetail(String(entry.userId || ""))}
                                            disabled={!entry.userId || analyticsUserDetailLoading}
                                            className={`w-full rounded-2xl border p-4 text-left transition-all disabled:opacity-60 ${String(selectedUser?.id || "") === String(entry?.userId || "") ? (isDark ? "border-cyan-400/35 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]" : "border-cyan-300 bg-cyan-50") : (isDark ? "border-[#1a3050] bg-[#0c172b] hover:border-[#335782] hover:bg-[#10203a]" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm")}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Avatar isDark={isDark} name={entry.name} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className={`truncate text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{entry.name || "Unknown user"}</p>
                                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isDark ? "bg-white/10 text-gray-300" : "bg-slate-100 text-slate-700"}`}>{entry.role || "user"}</span>
                                                            </div>
                                                            <p className={`mt-0.5 truncate text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{entry.email || "-"}</p>
                                                        </div>
                                                        <span className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${getAnalyticsStatusTone(entry?.currentStatus?.key, isDark)}`}>{entry?.currentStatus?.label || "Offline"}</span>
                                                    </div>
                                                    {entry.sid && (
                                                        <span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] ${isDark ? "bg-black/30 text-gray-500" : "bg-gray-100 text-gray-500"}`}>{entry.sid}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <div className={`rounded-xl px-3 py-2 ${isDark ? "bg-black/20" : "bg-slate-50"}`}>
                                                    <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-500"}`}>Last activity</p>
                                                    <p className={`mt-1 text-xs font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{formatRelativeTime(entry?.lastActiveAt)}</p>
                                                    <p className={`mt-1 text-[11px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>{formatDateTime(entry?.lastActiveAt)}</p>
                                                </div>
                                                <div className={`rounded-xl px-3 py-2 ${isDark ? "bg-black/20" : "bg-slate-50"}`}>
                                                    <p className={`text-[10px] uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-500"}`}>Current focus</p>
                                                    <p className={`mt-1 text-xs font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{formatPathLabel(entry?.latestPath)}</p>
                                                    <p className={`mt-1 text-[11px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>{humanizeEventLabel(entry?.latestAction) || "No action label"}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? "bg-blue-500/10 text-blue-300" : "bg-blue-100 text-blue-700"}`}>{entry?.sessionCount || 0} sessions</span>
                                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? "bg-purple-500/10 text-purple-300" : "bg-purple-100 text-purple-700"}`}>{entry?.projectSummary?.totalProjects || 0} projects</span>
                                                {(entry?.projectSummary?.pendingProjects || 0) > 0 && (
                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-100 text-amber-700"}`}>{entry.projectSummary.pendingProjects} pending</span>
                                                )}
                                                {(entry?.projectSummary?.publishedProjects || 0) > 0 && (
                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>{entry.projectSummary.publishedProjects} published</span>
                                                )}
                                            </div>
                                            {entry?.projectSummary?.recentProjects?.[0] && (
                                                <p className={`mt-3 text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>Latest project: <span className={`${isDark ? "text-gray-200" : "text-gray-700"} font-semibold`}>{entry.projectSummary.recentProjects[0].title}</span></p>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={`xl:col-span-3 rounded-2xl border p-5 ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            {analyticsUserDetailLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-7 h-7 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                </div>
                            ) : !analyticsUserDetail ? (
                                <div className="py-20 text-center">
                                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Select a user from the list to inspect their work, recent online footprint, and detailed activity trail.</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <Avatar isDark={isDark} name={selectedUser.name} size="h-12 w-12 text-base" />
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className={`text-lg font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>{selectedUser.name || "Unknown User"}</h3>
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${selectedStatusTone}`}>{selectedUser?.currentStatus?.label || "Offline"}</span>
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${isDark ? "bg-white/10 text-gray-300" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>{selectedUser.role || "user"}</span>
                                                </div>
                                                <p className={`mt-1 truncate text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                                    {selectedUser.email || "-"} • {selectedUser.phoneMasked || "-"}
                                                    {selectedUser.sid && <span className={`ml-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] ${isDark ? "bg-black/30 text-gray-500" : "bg-gray-100 text-gray-500"}`}>{selectedUser.sid}</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={`shrink-0 text-xs font-bold ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                                            onClick={() => setAnalyticsUserDetail(null)}
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-[#1f3454] bg-[#0c1a30]" : "border-gray-200 bg-slate-50"}`}>
                                        <p className={`text-sm ${isDark ? "text-cyan-100/90" : "text-slate-700"}`}>
                                            Last seen {formatRelativeTime(selectedSummary.lastActiveAt)} on <span className="font-semibold">{formatPathLabel(selectedUser.latestPath)}</span>
                                            {selectedUser.latestAction ? ` — ${humanizeEventLabel(selectedUser.latestAction)}` : ""}.
                                        </p>
                                        <p className={`mt-1.5 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Joined {formatDateTime(selectedSummary.firstSeenAt)} · Last login {formatDateTime(selectedSummary.lastLoginAt)}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                        <MetricTile isDark={isDark} icon="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" label="Sessions" value={selectedSummary.totalSessions || 0} />
                                        <MetricTile isDark={isDark} icon="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" label="Actions" value={selectedSummary.totalActions || 0} />
                                        <MetricTile isDark={isDark} icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" label="Page Visits" value={selectedSummary.totalPageVisits || 0} />
                                        <MetricTile isDark={isDark} icon="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" label="Time Spent" value={formatDuration(selectedSummary.totalTimeSeconds || 0)} />
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                        <DetailCard isDark={isDark} title="Projects" action={<span className={`text-sm font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>{selectedProjectSummary.totalProjects || 0} total</span>}>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="rounded-lg bg-black/5 px-3 py-2"><p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>Draft</p><p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{selectedProjectSummary.draftProjects || 0}</p></div>
                                                <div className="rounded-lg bg-black/5 px-3 py-2"><p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>Pending</p><p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{selectedProjectSummary.pendingProjects || 0}</p></div>
                                                <div className="rounded-lg bg-black/5 px-3 py-2"><p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>Published</p><p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{selectedProjectSummary.publishedProjects || 0}</p></div>
                                                <div className="rounded-lg bg-black/5 px-3 py-2"><p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>Rejected</p><p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{selectedProjectSummary.rejectedProjects || 0}</p></div>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isDark ? "bg-purple-500/15 text-purple-300" : "bg-purple-100 text-purple-700"}`}>Trailer {selectedProjectSummary.aiTrailerProjects || 0}</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-100 text-blue-700"}`}>Evaluation {selectedProjectSummary.evaluationProjects || 0}</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-100 text-amber-700"}`}>Spotlight {selectedProjectSummary.spotlightProjects || 0}</span>
                                            </div>
                                        </DetailCard>

                                        <DetailCard isDark={isDark} title="Latest Session">
                                            {!selectedLatestSession ? (
                                                <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No session snapshot found.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    <p className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}><span className={isDark ? "text-gray-500" : "text-gray-500"}>Entry:</span> {formatPathLabel(selectedLatestSession.entryPath)}</p>
                                                    <p className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}><span className={isDark ? "text-gray-500" : "text-gray-500"}>Exit:</span> {formatPathLabel(selectedLatestSession.exitPath || selectedLatestSession.entryPath)}</p>
                                                    <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{formatDuration(selectedLatestSession.durationSeconds || 0)} · {formatDateTime(selectedLatestSession.startedAt)}</p>
                                                    <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{selectedLatestSession.location?.city || "Unknown"}, {selectedLatestSession.location?.country || "Unknown"}</p>
                                                    <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{selectedLatestSession.device?.deviceType || "unknown"} / {selectedLatestSession.device?.browser || "Unknown"} / {selectedLatestSession.device?.os || "Unknown"}</p>
                                                </div>
                                            )}
                                        </DetailCard>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                        <DetailCard isDark={isDark} title="Devices Used">
                                            <div className="flex flex-wrap gap-2">
                                                {selectedDevices.length === 0 ? <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No data</span> : selectedDevices.map((item) => (
                                                    <span key={item.label || `${item.deviceType}-${item.browser}-${item.os}`} className={`px-2 py-1 rounded-full text-xs font-semibold ${isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-100 text-blue-700"}`}>{item.label || `${item.deviceType || "unknown"} / ${item.browser || "Unknown"} / ${item.os || "Unknown"}`} ({item.count})</span>
                                                ))}
                                            </div>
                                        </DetailCard>

                                        <DetailCard isDark={isDark} title="Locations">
                                            <div className="flex flex-wrap gap-2">
                                                {selectedLocations.length === 0 ? <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No data</span> : selectedLocations.map((item) => (
                                                    <span key={item.location} className={`px-2 py-1 rounded-full text-xs font-semibold ${isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>{item.location} ({item.count})</span>
                                                ))}
                                            </div>
                                        </DetailCard>
                                    </div>

                                    <div className={`rounded-xl border ${isDark ? "border-[#1a3050]" : "border-gray-200"}`}>
                                        <button
                                            type="button"
                                            onClick={() => setShowFullActivityTrail((prev) => !prev)}
                                            className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left"
                                        >
                                            <span className={`text-xs font-bold uppercase tracking-wide ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                Full activity trail — auth events, page log, sessions, and raw actions
                                            </span>
                                            <Icon d={showFullActivityTrail ? "M4.5 15.75l7.5-7.5 7.5 7.5" : "M19.5 8.25l-7.5 7.5-7.5-7.5"} className={`h-4 w-4 shrink-0 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                                        </button>
                                        {showFullActivityTrail && (
                                            <div className="space-y-3 border-t p-3 pt-3" style={{ borderColor: isDark ? "#1a3050" : "#e5e7eb" }}>
                                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                                    <DetailCard isDark={isDark} title="Auth Timeline">
                                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                                            {selectedAuthEvents.length === 0 ? <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No login/signup events</p> : selectedAuthEvents.slice(0, 30).map((event, index) => (
                                                                <p key={`${event.type}-${index}`} className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>{humanizeEventLabel(event.type)} • {event.timestamp ? new Date(event.timestamp).toLocaleString() : "-"}</p>
                                                            ))}
                                                        </div>
                                                    </DetailCard>

                                                    <DetailCard isDark={isDark} title="Top Pages">
                                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                                            {selectedPages.length === 0 ? <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No page events</p> : selectedPages.slice(0, 30).map((page) => (
                                                                <p key={page.path} className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>{page.path} • {page.visits} visits • {formatDuration(page.totalTimeSeconds)}</p>
                                                            ))}
                                                        </div>
                                                    </DetailCard>
                                                </div>

                                                <DetailCard isDark={isDark} title="Session Journey">
                                                    <div className="max-h-48 overflow-y-auto space-y-2">
                                                        {selectedSessions.length === 0 ? <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No sessions found</p> : selectedSessions.slice(0, 20).map((session) => (
                                                            <div key={session.sessionId} className={`rounded-md border px-2.5 py-2 ${isDark ? "border-[#1a3050]" : "border-gray-200"}`}>
                                                                <p className={`text-xs font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{session.sessionId}</p>
                                                                <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>Entry: {formatPathLabel(session.entryPath)} · Exit: {formatPathLabel(session.exitPath || session.entryPath)} · {formatDuration(session.durationSeconds || 0)}</p>
                                                                <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{`${session.location?.city || "Unknown"}, ${session.location?.country || "Unknown"} - ${session.device?.deviceType || "unknown"} / ${session.device?.browser || "Unknown"} / ${session.device?.os || "Unknown"}`}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </DetailCard>

                                                <DetailCard isDark={isDark} title="Latest Actions">
                                                    <div className="max-h-56 overflow-y-auto space-y-1">
                                                        {selectedActions.length === 0 ? <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No action logs</p> : selectedActions.slice(0, 80).map((item, index) => (
                                                            <p key={`${item.eventType}-${index}`} className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>{item.timestamp ? new Date(item.timestamp).toLocaleString() : "-"} • {humanizeEventLabel(item.eventType)} • {item.action || "-"} • {item.page || item.path || "-"}</p>
                                                        ))}
                                                    </div>
                                                </DetailCard>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
