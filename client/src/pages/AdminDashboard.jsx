import { useState, useEffect, useRef } from "react";
import axios from "axios";
import BrandLogo from "../components/BrandLogo";
import PasswordInput from "../components/PasswordInput";
import ConfirmDialog from "../components/ConfirmDialog";
import { formatCurrency } from "../utils/currency";
import { getScriptCompletionSummary } from "../utils/scriptCompletion";
import {
    clearAdminScriptAccess,
    getStoredAdminScriptAccess,
    isAdminScriptProtectedTab,
    storeAdminScriptAccess,
} from "../utils/adminScriptAccess";
import { Icon, StatCard } from "../components/AdminUI";
import AdminAnalyticsPanel from "../components/AdminAnalyticsPanel";
import AdminCompetitions from "./admin/AdminCompetitions";
import AdminReferrals from "./admin/AdminReferrals";
import {
    API_BASE_URL,
    MAX_ATTACHMENT_SIZE_BYTES,
    adminApi,
    TABS,
    DownloadIconButton,
    getUserAddressLine,
    getUserCompany,
    getUserGenres,
    formatIndustrySubRole,
    sanitizePreviousCreditsDisplay,
    formatUserExportLine,
    buildOverviewExportLines,
    PROJECT_CREATOR_ROLES,
    getScriptCreatorName,
    getScriptPreviewWindowLabel,
    parseTrailerRequestNote,
    BroadcastComposer,
    UserTable,
    ScriptTable,
    TransactionTable,
    ScoreModal,
    SearchBar,
    Pagination,
    BADGE_WATCH_KEYS,
    formatBadgeCount,
    SEARCH_PLACEHOLDER_BY_TAB,
    EMPTY_GLOBAL_RESULTS,
    formatExportDate,
    buildChatId,
    resolveMediaUrl,
    formatFileSize,
    getTransactionIdLabel,
    getPaymentIdLabel,
    getMessagePreview,
    writePdfSections,
    DiscountCodeFormModal,
    RejectInvestorModal,
} from "./admin/dashboardShared";

// Re-exported for AdminCompetitions, AdminReferrals and the competitions editor, which import
// the shared admin API client from this module — and for the tests that mock this module path.
export { adminApi };

const AdminDashboard = () => {
    const isDark = true;
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(false);

    // ─── Code Gate — always prompt on every visit ───
    const [authorized, setAuthorized] = useState(false);
    const [codeInput, setCodeInput] = useState("");
    const [codeError, setCodeError] = useState("");
    const [codeLoading, setCodeLoading] = useState(false);

    // ─── Data state ───
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [scripts, setScripts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [scoreModal, setScoreModal] = useState(null);
    const [scoreSubTab, setScoreSubTab] = useState("ai");
    const [total, setTotal] = useState(0);
    const [pendingInvestors, setPendingInvestors] = useState([]);
    const [membershipReviews, setMembershipReviews] = useState([]);
    const [bankReviews, setBankReviews] = useState([]);
    const [rejectModal, setRejectModal] = useState(null); // investor object
    const [selectedUserDetail, setSelectedUserDetail] = useState(null);
    const [userActionLoading, setUserActionLoading] = useState("");
    const [contacts, setContacts] = useState([]);
    const [deletedAccounts, setDeletedAccounts] = useState([]);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [analyticsSection, setAnalyticsSection] = useState("overview");
    const [analyticsAnonymousDetail, setAnalyticsAnonymousDetail] = useState(null);
    const [analyticsAnonymousDetailLoading, setAnalyticsAnonymousDetailLoading] = useState(false);
    const [analyticsUserDetail, setAnalyticsUserDetail] = useState(null);
    const [analyticsUserDetailLoading, setAnalyticsUserDetailLoading] = useState(false);
    const [analyticsRegisteredSearch, setAnalyticsRegisteredSearch] = useState("");
    const [analyticsRegisteredStatusFilter, setAnalyticsRegisteredStatusFilter] = useState("all");
    const [discountCodes, setDiscountCodes] = useState([]);
    const [discountCodeModal, setDiscountCodeModal] = useState(null); // null = closed, {} = create, {_id:...} = edit
    const [alertSummary, setAlertSummary] = useState({});
    const previousAlertSummaryRef = useRef(null);
    const [exportingCurrent, setExportingCurrent] = useState(false);
    const [exportingAll, setExportingAll] = useState(false);
    const [globalResults, setGlobalResults] = useState(EMPTY_GLOBAL_RESULTS);
    const [adminConversations, setAdminConversations] = useState([]);
    const [messageUsers, setMessageUsers] = useState([]);
    const [activeMessageUser, setActiveMessageUser] = useState(null);
    const [activeMessageChatId, setActiveMessageChatId] = useState("");
    const [messageList, setMessageList] = useState([]);
    const [messageText, setMessageText] = useState("");
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messageAttachment, setMessageAttachment] = useState(null);
    const [uploadingMessageAttachment, setUploadingMessageAttachment] = useState(false);
    const [showAdminScrollToBottomButton, setShowAdminScrollToBottomButton] = useState(false);
    const messageFileInputRef = useRef(null);
    const messageListContainerRef = useRef(null);
    const messageListEndRef = useRef(null);
    const shouldAutoScrollAdminMessagesRef = useRef(false);
    const previousAdminChatIdRef = useRef("");
    const scrollAdminMessagesToBottom = (behavior = "smooth") => {
        messageListEndRef.current?.scrollIntoView({ behavior, block: "end" });
        setShowAdminScrollToBottomButton(false);
    };
    const handleAdminMessageScroll = () => {
        const container = messageListContainerRef.current;
        if (!container) return;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        setShowAdminScrollToBottomButton(distanceFromBottom > 96);
    };
    const trailerFileInputRef = useRef(null);
    const [trailerUploadTargetScript, setTrailerUploadTargetScript] = useState(null);
    const [uploadingTrailerScriptId, setUploadingTrailerScriptId] = useState("");
    const [deletingScriptId, setDeletingScriptId] = useState("");
    const [writerBroadcastTitle, setWriterBroadcastTitle] = useState("");
    const [writerBroadcastContent, setWriterBroadcastContent] = useState("");
    const [writerBroadcastLink, setWriterBroadcastLink] = useState("");
    const [filmBroadcastTitle, setFilmBroadcastTitle] = useState("");
    const [filmBroadcastContent, setFilmBroadcastContent] = useState("");
    const [filmBroadcastLink, setFilmBroadcastLink] = useState("");
    const [scriptBroadcastTitle, setScriptBroadcastTitle] = useState("");
    const [scriptBroadcastContent, setScriptBroadcastContent] = useState("");
    const [scriptBroadcastLink, setScriptBroadcastLink] = useState("");
    const [trailerRequirementsModal, setTrailerRequirementsModal] = useState(null);

    // ─── Toast notification system ───
    const [toast, setToast] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [adminDialog, setAdminDialog] = useState(null);
    const adminDialogResolverRef = useRef(null);
    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSendAudienceBroadcast = async (audience) => {
        const broadcastConfigByAudience = {
            writers: {
                title: writerBroadcastTitle,
                content: writerBroadcastContent,
                actionUrl: writerBroadcastLink,
                audienceLabel: "writers",
                reset: () => {
                    setWriterBroadcastTitle("");
                    setWriterBroadcastContent("");
                    setWriterBroadcastLink("");
                },
            },
            "film-professionals": {
                title: filmBroadcastTitle,
                content: filmBroadcastContent,
                actionUrl: filmBroadcastLink,
                audienceLabel: "film professionals",
                reset: () => {
                    setFilmBroadcastTitle("");
                    setFilmBroadcastContent("");
                    setFilmBroadcastLink("");
                },
            },
            "script-uploaders": {
                title: scriptBroadcastTitle,
                content: scriptBroadcastContent,
                actionUrl: scriptBroadcastLink,
                audienceLabel: "script uploaders",
                reset: () => {
                    setScriptBroadcastTitle("");
                    setScriptBroadcastContent("");
                    setScriptBroadcastLink("");
                },
            },
        };
        const broadcastConfig = broadcastConfigByAudience[audience];

        if (!broadcastConfig) {
            showToast("Unsupported broadcast audience.", "error");
            return;
        }

        const { title, content, actionUrl, audienceLabel, reset } = broadcastConfig;

        if (!title.trim() || !content.trim()) {
            showToast(`Please enter both title and content for the ${audienceLabel} broadcast.`, "error");
            return;
        }

        const loadingKey = `broadcast:${audience}`;
        try {
            setUserActionLoading(loadingKey);
            const { data } = await adminApi.post(`/admin/broadcast/${audience}`, {
                title: title.trim(),
                content: content.trim(),
                actionUrl: actionUrl.trim(),
            });
            showToast(data?.message || `Broadcast sent to ${audienceLabel}.`);
            reset();
        } catch (err) {
            showToast(err?.response?.data?.message || `Failed to send ${audienceLabel} broadcast`, "error");
        } finally {
            setUserActionLoading("");
        }
    };

    const openAdminDialog = ({
        type = "confirm",
        title = "Confirm action",
        message = "Are you sure?",
        confirmText = "Confirm",
        cancelText = "Cancel",
        defaultValue = "",
        placeholder = "",
        inputType = "text",
        multiline = false,
        options = [],
    }) => new Promise((resolve) => {
        adminDialogResolverRef.current = resolve;
        setAdminDialog({
            type,
            title,
            message,
            confirmText,
            cancelText,
            value: String(defaultValue ?? ""),
            placeholder,
            inputType,
            multiline,
            options,
        });
    });

    const closeAdminDialog = (result) => {
        const resolver = adminDialogResolverRef.current;
        adminDialogResolverRef.current = null;
        setAdminDialog(null);
        if (typeof resolver === "function") resolver(result);
    };

    const ensureScriptSectionAccess = async () => {
        const existingAccess = getStoredAdminScriptAccess();
        if (existingAccess?.token) {
            return true;
        }

        const password = await openAdminDialog({
            type: "prompt",
            title: "Unlock Script Sections",
            message: "Enter the script-section password to open Scripts, Script Approvals, and Deleted Scripts.",
            confirmText: "Unlock",
            cancelText: "Cancel",
            placeholder: "Section password",
            inputType: "password",
        });

        if (password === null) {
            return false;
        }

        if (!String(password || "").length) {
            showToast("Script section password is required.", "error");
            return false;
        }

        try {
            const { data } = await adminApi.post("/admin/script-access/verify", { password });
            storeAdminScriptAccess(data);
            showToast("Script sections unlocked");
            return true;
        } catch (err) {
            clearAdminScriptAccess();
            showToast(err?.response?.data?.message || "Failed to unlock script sections", "error");
            return false;
        }
    };

    const handleTabChange = async (nextTab) => {
        if (nextTab === activeTab) return;

        if (isAdminScriptProtectedTab(nextTab)) {
            const hasAccess = await ensureScriptSectionAccess();
            if (!hasAccess) return;
        }

        setActiveTab(nextTab);
    };

    useEffect(() => {
        if (!adminDialog) return undefined;

        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeAdminDialog(null);
                return;
            }

            if (event.key === "Enter" && !event.shiftKey) {
                if (adminDialog.type === "prompt" && document.activeElement?.tagName === "TEXTAREA") {
                    return;
                }
                event.preventDefault();
                closeAdminDialog(adminDialog.type === "prompt" ? adminDialog.value : true);
            }
        };

        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [adminDialog]);

    const fetchAlertSummary = async ({ silent = false } = {}) => {
        if (!authorized) return;
        try {
            const { data } = await adminApi.get("/admin/alerts/summary");
            const summary = data || {};
            setAlertSummary(summary);

            const previous = previousAlertSummaryRef.current;
            if (!silent && previous) {
                const increasedSections = BADGE_WATCH_KEYS.filter((key) => (summary[key] || 0) > (previous[key] || 0));
                if (increasedSections.length > 0) {
                    const sectionLabelMap = {
                        approvals: "Script approvals",
                        trailers: "AI trailer approvals",
                        "pending-investors": "Film professional requests",
                        "membership-reviews": "SWA/WGA reviews",
                        "bank-reviews": "Bank detail reviews",
                        queries: "Queries",
                    };
                    const text = increasedSections.map((key) => sectionLabelMap[key] || key).join(" • ");
                    showToast(`New admin requests: ${text}`, "info");
                }
            }
            previousAlertSummaryRef.current = summary;
        } catch (err) {
            console.error("Admin alert summary fetch error:", err);
        }
    };

    const getBadgeCountForTab = (tabKey) => {
        if (!BADGE_WATCH_KEYS.includes(tabKey)) return 0;
        const count = Number(alertSummary?.[tabKey] || 0);
        return Number.isFinite(count) ? count : 0;
    };

    const searchTerm = search.trim().toLowerCase();
    const hasSearch = searchTerm.length > 0;
    const isGlobalSearchMode = activeTab === "overview" && hasSearch;
    const matchesSearch = (...values) => !hasSearch || values.some((value) => String(value ?? "").toLowerCase().includes(searchTerm));

    const sourceUsers = isGlobalSearchMode ? globalResults.users : users;
    const sourceScripts = isGlobalSearchMode ? globalResults.scripts : scripts;
    const sourceTransactions = isGlobalSearchMode ? globalResults.transactions : transactions;
    const sourceInvoices = isGlobalSearchMode ? globalResults.invoices : invoices;
    const sourcePendingInvestors = isGlobalSearchMode ? globalResults.pendingInvestors : pendingInvestors;
    const sourceMembershipReviews = membershipReviews;
    const sourceBankReviews = isGlobalSearchMode ? globalResults.bankReviews : bankReviews;
    const sourceContacts = isGlobalSearchMode ? globalResults.contacts : contacts;
    const sourceDeletedAccounts = deletedAccounts;
    const sourceMessageUsers = messageUsers;

    const filteredUsers = sourceUsers.filter((u) =>
        matchesSearch(
            u.name,
            u.email,
            u.role,
            u.sid,
            u.phone,
            getUserAddressLine(u),
            getUserCompany(u),
            getUserGenres(u),
            u.writerProfile?.username,
            u.writerProfile?.legalName,
            u.industryProfile?.jobTitle
        )
    );
    const filteredScripts = sourceScripts.filter((s) => matchesSearch(s.title, s.sid, s.genre, s.primaryGenre, s.status, getScriptCreatorName(s)));
    const filteredTransactions = sourceTransactions.filter((t) =>
        matchesSearch(
            t.user?.name,
            t.type,
            t.status,
            t.description,
            t.amount,
            t.currency,
            t.createdAt,
            t.reference,
            getTransactionIdLabel(t),
            getPaymentIdLabel(t)
        )
    );
    const filteredInvoices = sourceInvoices.filter((inv) => matchesSearch(inv.invoiceNumber, inv.creator?.name, inv.creatorSid, inv.creator?.sid, inv.script?.title, inv.scriptSid, inv.script?.sid, inv.accessType));
    const filteredPendingInvestors = sourcePendingInvestors.filter((inv) => matchesSearch(inv.name, inv.email, inv.createdAt));
    const filteredMembershipReviews = sourceMembershipReviews.filter((review) =>
        matchesSearch(
            review.name,
            review.email,
            review.sid,
            review.username,
            review.role,
            Array.isArray(review.pendingMemberships)
                ? review.pendingMemberships
                    .map((item) => `${item.label || ""} ${item.status || ""} ${item.proofFileName || ""}`)
                    .join(" ")
                : ""
        )
    );
    const filteredBankReviews = sourceBankReviews.filter((review) => matchesSearch(review.name, review.email, review.sid, review.requestedDetails?.bankName, review.status));
    const filteredContacts = sourceContacts.filter((c) => matchesSearch(c.name, c.email, c.reason, c.message, c.createdAt));
    const deletedFilmProfessionals = sourceDeletedAccounts.filter((item) => String(item?.role || "").toLowerCase() === "investor");
    const deletedWriters = sourceDeletedAccounts.filter((item) => PROJECT_CREATOR_ROLES.has(String(item?.role || "").toLowerCase()));
    const filteredDeletedFilmProfessionals = deletedFilmProfessionals.filter((item) => matchesSearch(item.name, item.email, item.sid, item.reason, item.source, item.deactivatedAt, item.requestedAt));
    const filteredDeletedWriters = deletedWriters.filter((item) => matchesSearch(item.name, item.email, item.sid, item.reason, item.source, item.deactivatedAt, item.requestedAt));
    const filteredMessageUsers = sourceMessageUsers.filter((u) => matchesSearch(u.name, u.email, u.sid));

    const buildCurrentSectionPayload = () => {
        switch (activeTab) {
            case "overview":
                return {
                    title: "Platform Overview",
                    lines: stats ? buildOverviewExportLines(stats) : ["No records"],
                };
            case "investors":
            case "writers":
            case "readers":
            case "premium-professionals":
                const sectionTitleByTab = {
                    investors: "Film Professionals",
                    writers: "Writers",
                    readers: "Readers",
                    "premium-professionals": "Premium Professionals",
                };
                return {
                    title: `${sectionTitleByTab[activeTab] || activeTab} (${users.length})`,
                    lines: users.map((u, idx) => formatUserExportLine(u, idx)),
                };
            case "projects":
            case "deleted-scripts":
            case "ai-usage":
            case "evaluations":
            case "investor-purchases":
            case "scores":
            case "approvals":
            case "trailers":
                return {
                    title: `${TABS.find((tab) => tab.key === activeTab)?.label || "Scripts"} (${scripts.length})`,
                    lines: scripts.map((s, idx) => `${idx + 1}. ${s.title || "-"} | SID: ${s.sid || "-"} | Creator: ${getScriptCreatorName(s)} | Genre: ${s.genre || s.primaryGenre || "-"} | Completion: ${getScriptCompletionSummary(s)} | Status: ${s.status || "-"} | Score: ${s.scriptScore?.overall || s.platformScore?.overall || s.rating || "-"} | Date: ${formatExportDate(s.createdAt)}`),
                };
            case "payments":
                return {
                    title: `Payments (${transactions.length})`,
                    lines: transactions.map((t, idx) => `${idx + 1}. ${t.user?.name || "-"} | ${t.type || "-"} | ${formatCurrency(t.amount || 0, t.currency || "INR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${t.status || "-"} | ${t.description || "-"} | Txn: ${getTransactionIdLabel(t) || "-"} | Pay ID: ${getPaymentIdLabel(t) || "-"} | ${formatExportDate(t.createdAt)}`),
                };
            case "invoices":
                return {
                    title: `Invoices (${invoices.length})`,
                    lines: invoices.map((inv, idx) => `${idx + 1}. ${inv.invoiceNumber || "-"} | Creator: ${inv.creator?.name || "-"} (${inv.creatorSid || inv.creator?.sid || "-"}) | Project: ${inv.script?.title || "-"} (${inv.scriptSid || inv.script?.sid || "-"}) | Access: ${inv.accessType || "-"} | Credits: ${inv.totalCreditsRequired || 0} | Date: ${formatExportDate(inv.invoiceDate || inv.createdAt)}`),
                };
            case "pending-investors":
                return {
                    title: `Film Professional Requests (${pendingInvestors.length})`,
                    lines: pendingInvestors.map((inv, idx) => `${idx + 1}. ${inv.name || "-"} | ${inv.email || "-"} | Date: ${formatExportDate(inv.createdAt)} | Status: pending`),
                };
            case "membership-reviews":
                return {
                    title: `SWA/WGA Reviews (${membershipReviews.length})`,
                    lines: membershipReviews.map((review, idx) => `${idx + 1}. ${review.name || "-"} | ${review.email || "-"} | SID: ${review.sid || "-"} | Pending: ${(review.pendingMemberships || []).map((item) => `${item.label}:${item.status}`).join(", ") || "-"}`),
                };
            case "bank-reviews":
                return {
                    title: `Bank Detail Reviews (${bankReviews.length})`,
                    lines: bankReviews.map((review, idx) => `${idx + 1}. ${review.name || "-"} | ${review.email || "-"} | Bank: ${review.requestedDetails?.bankName || "-"} | Status: ${review.status || "-"} | Attempts: ${review.bankSecurity?.invalidAttempts || 0} | Locked: ${review.bankSecurity?.isLocked ? "Yes" : "No"} | Submitted: ${formatExportDate(review.submittedAt)}`),
                };
            case "queries":
                return {
                    title: `Queries (${contacts.length})`,
                    lines: contacts.map((c, idx) => `${idx + 1}. ${c.name || "-"} | ${c.email || "-"} | Reason: ${c.reason || "-"} | Message: ${c.message || "-"} | Date: ${formatExportDate(c.createdAt)}`),
                };
            case "deleted-film-professionals":
                return {
                    title: `Deleted Film Professionals (${deletedFilmProfessionals.length})`,
                    lines: deletedFilmProfessionals.map((item, idx) => `${idx + 1}. ${item.name || "-"} | ${item.email || "-"} | SID: ${item.sid || "-"} | Role: ${item.role || "-"} | Source: ${item.source || "-"} | Reason: ${item.reason || "-"} | Requested: ${formatExportDate(item.requestedAt)} | Deactivated: ${formatExportDate(item.deactivatedAt)}`),
                };
            case "deleted-writers":
                return {
                    title: `Deleted Writers (${deletedWriters.length})`,
                    lines: deletedWriters.map((item, idx) => `${idx + 1}. ${item.name || "-"} | ${item.email || "-"} | SID: ${item.sid || "-"} | Role: ${item.role || "-"} | Source: ${item.source || "-"} | Reason: ${item.reason || "-"} | Requested: ${formatExportDate(item.requestedAt)} | Deactivated: ${formatExportDate(item.deactivatedAt)}`),
                };
            case "analytics":
                return {
                    title: "Analytics Summary",
                    lines: analyticsData
                        ? [
                            `Anonymous Visitors: ${analyticsData?.anonymousVisitors?.totalVisitors || 0}`,
                            `New Visitors: ${analyticsData?.anonymousVisitors?.newVisitors || 0}`,
                            `Returning Visitors: ${analyticsData?.anonymousVisitors?.returningVisitors || 0}`,
                            `Tracked Registered Users: ${analyticsData?.registeredUsers?.totalUsers || 0}`,
                            `Live Anonymous Users: ${analyticsData?.liveActivity?.activeAnonymousUsers || 0}`,
                            `Live Registered Users: ${analyticsData?.liveActivity?.activeRegisteredUsers || 0}`,
                        ]
                        : ["No records"],
                };
            case "meetings":
                return {
                    title: `Meetings (${meetings.length})`,
                    lines: meetings.map((m, idx) => `${idx + 1}. ${m.title || "-"} | Producer: ${m.producer_name || "-"} | Writer: ${m.writer_name || "-"} | Script: ${m.script_name || "-"} | Status: ${m.status || "-"} | Date: ${formatExportDate(m.scheduledDate)} | Duration: ${m.duration} min | Link: ${m.meetingLink || "-"}`),
                };
            case "messages":
                return {
                    title: `Admin Messages (${messageUsers.length})`,
                    lines: messageUsers.map((u, idx) => `${idx + 1}. ${u.name || "-"} | ${u.email || "-"} | SID: ${u.sid || "-"}`),
                };
            default:
                return { title: "Section", lines: ["No records"] };
        }
    };

    const handleDownloadCurrentSectionPdf = async () => {
        try {
            setExportingCurrent(true);
            const section = buildCurrentSectionPayload();
            writePdfSections({
                fileName: `admin-${activeTab}-report-${Date.now()}.pdf`,
                title: `Admin ${section.title} Report`,
                sections: [section],
            });
            showToast("Section PDF downloaded");
        } catch (err) {
            console.error(err);
            showToast("Failed to download section PDF", "error");
        } finally {
            setExportingCurrent(false);
        }
    };

    const fetchList = async (url, key) => {
        const { data } = await adminApi.get(url);
        return key ? (data?.[key] || []) : data;
    };

    const fetchMessagesDirectory = async ({ silent = false } = {}) => {
        if (!authorized) return;
        if (!silent) setMessagesLoading(true);

        try {
            const [conversationsRes, writersRes, creatorsRes] = await Promise.all([
                adminApi.get("/messages/conversations"),
                adminApi.get("/admin/users?role=writer&page=1&limit=1000"),
                adminApi.get("/admin/users?role=creator&page=1&limit=1000"),
            ]);

            const writerConversations = (conversationsRes.data || []).filter((conv) => ["writer", "creator"].includes(conv?.user?.role));
            const writerMap = new Map();

            [...(writersRes.data?.users || []), ...(creatorsRes.data?.users || [])].forEach((user) => {
                if (user?._id) writerMap.set(String(user._id), user);
            });

            writerConversations.forEach((conv) => {
                if (conv?.user?._id && !writerMap.has(String(conv.user._id))) {
                    writerMap.set(String(conv.user._id), conv.user);
                }
            });

            const conversationByUserId = new Map(
                writerConversations
                    .filter((conv) => conv?.user?._id)
                    .map((conv) => [String(conv.user._id), conv])
            );

            const writersWithConversation = Array.from(writerMap.values())
                .map((user) => ({
                    ...user,
                    conversation: conversationByUserId.get(String(user._id)) || null,
                }))
                .sort((a, b) => {
                    const aTs = a.conversation?.timestamp ? new Date(a.conversation.timestamp).getTime() : 0;
                    const bTs = b.conversation?.timestamp ? new Date(b.conversation.timestamp).getTime() : 0;
                    if (aTs !== bTs) return bTs - aTs;
                    return String(a.name || "").localeCompare(String(b.name || ""));
                });

            setAdminConversations(writerConversations);
            setMessageUsers(writersWithConversation);
            setTotalPages(1);
            setTotal(writersWithConversation.length);

            if (activeMessageUser?._id) {
                const selectedUserId = String(activeMessageUser._id);
                const refreshedSelectedUser = writersWithConversation.find((user) => String(user._id) === selectedUserId);
                if (refreshedSelectedUser) {
                    setActiveMessageUser(refreshedSelectedUser);
                }

                const refreshedConversation = writerConversations.find((conv) => String(conv?.user?._id) === selectedUserId);
                const nextChatId = refreshedConversation?.chatId || "";
                if (nextChatId !== activeMessageChatId) {
                    setActiveMessageChatId(nextChatId);
                }
            }
        } catch (err) {
            console.error("Admin message directory fetch error:", err);
            if (!silent) {
                showToast("Failed to load messages", "error");
            }
        } finally {
            if (!silent) setMessagesLoading(false);
        }
    };

    const handleDownloadWholeDashboardPdf = async () => {
        try {
            const hasScriptAccess = await ensureScriptSectionAccess();
            if (!hasScriptAccess) return;

            setExportingAll(true);

            const [
                overview,
                investorsData,
                writersData,
                creatorsData,
                readersData,
                projectsData,
                deletedScriptsData,
                aiUsageData,
                evaluationsData,
                purchasesData,
                invoicesData,
                paymentsData,
                aiScoresData,
                platformScoresData,
                readerScoresData,
                approvalsData,
                trailersData,
                pendingInvestorsData,
                membershipReviewsData,
                bankReviewsData,
                queriesData,
                deletedAccountsData,
            ] = await Promise.all([
                fetchList("/admin/stats"),
                fetchList("/admin/users?role=investor&page=1&limit=1000", "users"),
                fetchList("/admin/users?role=writer&page=1&limit=1000", "users"),
                fetchList("/admin/users?role=creator&page=1&limit=1000", "users"),
                fetchList("/admin/users?role=reader&page=1&limit=1000", "users"),
                fetchList("/admin/scripts?page=1&limit=1000", "scripts"),
                fetchList("/admin/scripts?status=deleted&page=1&limit=1000", "scripts"),
                fetchList("/admin/scripts/ai-usage?page=1&limit=1000", "scripts"),
                fetchList("/admin/scripts/evaluation-purchases?page=1&limit=1000", "scripts"),
                fetchList("/admin/scripts/investor-purchases?page=1&limit=1000", "scripts"),
                fetchList("/admin/invoices?page=1&limit=1000", "invoices"),
                fetchList("/admin/payments?page=1&limit=1000", "transactions"),
                fetchList("/admin/scores/ai?page=1&limit=1000", "scripts"),
                fetchList("/admin/scores/platform?page=1&limit=1000", "scripts"),
                fetchList("/admin/scores/reader?page=1&limit=1000", "scripts"),
                fetchList("/admin/scripts/pending?page=1&limit=1000", "scripts"),
                fetchList("/admin/scripts/trailer-requests?page=1&limit=1000", "scripts"),
                fetchList("/admin/investors/pending?page=1&limit=1000", "investors"),
                fetchList("/admin/writer-membership/pending?page=1&limit=1000", "reviews"),
                fetchList("/admin/bank-details/reviews?page=1&limit=1000", "reviews"),
                fetchList("/admin/queries?page=1&limit=1000", "submissions"),
                fetchList("/admin/users/deleted-requests?page=1&limit=1000", "requests"),
            ]);

            const sectionFromUsers = (title, list) => ({
                title: `${title} (${list.length})`,
                lines: list.map((u, idx) => formatUserExportLine(u, idx)),
            });

            const sectionFromScripts = (title, list) => ({
                title: `${title} (${list.length})`,
                lines: list.map((s, idx) => {
                    const approvalLabel = s.status === "pending_approval" && s.approvalRequestType === "edit_submission"
                        ? "edit approval"
                        : (s.status || "-");
                    const previewLabel = getScriptPreviewWindowLabel(s);
                    return `${idx + 1}. ${s.title || "-"} | SID: ${s.sid || "-"} | Creator: ${getScriptCreatorName(s)} | Genre: ${s.genre || s.primaryGenre || "-"} | Completion: ${getScriptCompletionSummary(s)} | Preview: ${previewLabel || "-"} | Status: ${approvalLabel} | Score: ${s.scriptScore?.overall || s.platformScore?.overall || s.rating || "-"} | Date: ${formatExportDate(s.createdAt)}`;
                }),
            });

            writePdfSections({
                fileName: `admin-complete-report-${Date.now()}.pdf`,
                title: "Admin Complete Dashboard Report",
                sections: [
                    {
                        title: "Overview",
                        lines: buildOverviewExportLines(overview),
                    },
                    sectionFromUsers("Investors", investorsData),
                    sectionFromUsers("Writers", [...writersData, ...creatorsData]),
                    sectionFromUsers("Readers", readersData),
                    sectionFromScripts("Projects", projectsData),
                    sectionFromScripts("Deleted Scripts", deletedScriptsData),
                    sectionFromScripts("AI Usage", aiUsageData),
                    sectionFromScripts("Evaluation Purchases", evaluationsData),
                    sectionFromScripts("Investor Purchases", purchasesData),
                    {
                        title: `Invoices (${invoicesData.length})`,
                        lines: invoicesData.map((inv, idx) => `${idx + 1}. ${inv.invoiceNumber || "-"} | Creator: ${inv.creator?.name || "-"} (${inv.creatorSid || inv.creator?.sid || "-"}) | Project: ${inv.script?.title || "-"} (${inv.scriptSid || inv.script?.sid || "-"}) | Access: ${inv.accessType || "-"} | Credits: ${inv.totalCreditsRequired || 0} | Date: ${formatExportDate(inv.invoiceDate || inv.createdAt)}`),
                    },
                    {
                        title: `Payments (${paymentsData.length})`,
                        lines: paymentsData.map((t, idx) => `${idx + 1}. ${t.user?.name || "-"} | ${t.type || "-"} | ${formatCurrency(t.amount || 0, t.currency || "INR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${t.status || "-"} | ${t.description || "-"} | Txn: ${getTransactionIdLabel(t) || "-"} | Pay ID: ${getPaymentIdLabel(t) || "-"} | ${formatExportDate(t.createdAt)}`),
                    },
                    sectionFromScripts("AI Scores", aiScoresData),
                    sectionFromScripts("Ckript Scores", platformScoresData),
                    sectionFromScripts("Reader Scores", readerScoresData),
                    sectionFromScripts("Pending Approvals", approvalsData),
                    sectionFromScripts("AI Trailer Approvals", trailersData),
                    {
                        title: `Film Professional Requests (${pendingInvestorsData.length})`,
                        lines: pendingInvestorsData.map((inv, idx) => `${idx + 1}. ${inv.name || "-"} | ${inv.email || "-"} | Date: ${formatExportDate(inv.createdAt)} | Status: pending`),
                    },
                    {
                        title: `SWA/WGA Reviews (${membershipReviewsData.length})`,
                        lines: membershipReviewsData.map((review, idx) => `${idx + 1}. ${review.name || "-"} | ${review.email || "-"} | SID: ${review.sid || "-"} | Pending: ${(review.pendingMemberships || []).map((item) => `${item.label}:${item.status}`).join(", ") || "-"}`),
                    },
                    {
                        title: `Bank Detail Reviews (${bankReviewsData.length})`,
                        lines: bankReviewsData.map((review, idx) => `${idx + 1}. ${review.name || "-"} | ${review.email || "-"} | Bank: ${review.requestedDetails?.bankName || "-"} | Status: ${review.status || "-"} | Attempts: ${review.bankSecurity?.invalidAttempts || 0} | Locked: ${review.bankSecurity?.isLocked ? "Yes" : "No"} | Submitted: ${formatExportDate(review.submittedAt)}`),
                    },
                    {
                        title: `Queries (${queriesData.length})`,
                        lines: queriesData.map((c, idx) => `${idx + 1}. ${c.name || "-"} | ${c.email || "-"} | Reason: ${c.reason || "-"} | Message: ${c.message || "-"} | Date: ${formatExportDate(c.createdAt)}`),
                    },
                    {
                        title: `Deleted Film Professionals (${deletedAccountsData.filter((item) => String(item?.role || "").toLowerCase() === "investor").length})`,
                        lines: deletedAccountsData
                            .filter((item) => String(item?.role || "").toLowerCase() === "investor")
                            .map((item, idx) => `${idx + 1}. ${item.name || "-"} | ${item.email || "-"} | SID: ${item.sid || "-"} | Role: ${item.role || "-"} | Source: ${item.source || "-"} | Reason: ${item.reason || "-"} | Requested: ${formatExportDate(item.requestedAt)} | Deactivated: ${formatExportDate(item.deactivatedAt)}`),
                    },
                    {
                        title: `Deleted Writers (${deletedAccountsData.filter((item) => PROJECT_CREATOR_ROLES.has(String(item?.role || "").toLowerCase())).length})`,
                        lines: deletedAccountsData
                            .filter((item) => PROJECT_CREATOR_ROLES.has(String(item?.role || "").toLowerCase()))
                            .map((item, idx) => `${idx + 1}. ${item.name || "-"} | ${item.email || "-"} | SID: ${item.sid || "-"} | Role: ${item.role || "-"} | Source: ${item.source || "-"} | Reason: ${item.reason || "-"} | Requested: ${formatExportDate(item.requestedAt)} | Deactivated: ${formatExportDate(item.deactivatedAt)}`),
                    },
                ],
            });
            showToast("Complete dashboard PDF downloaded");
        } catch (err) {
            console.error(err);
            showToast("Failed to download full dashboard PDF", "error");
        } finally {
            setExportingAll(false);
        }
    };

    // ─── Fetch data function ───
    const fetchData = async (searchValue = "") => {
        if (!authorized) return;
        setLoading(true);
        const activeSearch = searchValue.trim();
        try {
            if (isAdminScriptProtectedTab(activeTab)) {
                const hasScriptAccess = await ensureScriptSectionAccess();
                if (!hasScriptAccess) {
                    setLoading(false);
                    return;
                }
            }

            switch (activeTab) {
                case "overview": {
                    const { data } = await adminApi.get("/admin/stats");
                    setStats(data);
                    break;
                }
                case "investors": {
                    const { data } = await adminApi.get(`/admin/users?role=investor&page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    setUsers(data.users); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "premium-professionals": {
                    const { data } = await adminApi.get(`/admin/users?isPremium=true&role=investor&page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    setUsers(data.users); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "writer-plans": {
                    const { data } = await adminApi.get(`/admin/users?hasActiveWriterPlan=true&page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    setUsers(data.users); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "writers": {
                    const { data } = await adminApi.get(`/admin/users?role=writer&page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    const { data: data2 } = await adminApi.get(`/admin/users?role=creator&page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    setUsers([...data.users, ...data2.users]); setTotalPages(Math.max(data.totalPages, data2.totalPages)); setTotal(data.total + data2.total);
                    break;
                }
                case "readers": {
                    const { data } = await adminApi.get(`/admin/users?role=reader&page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    setUsers(data.users); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "projects": {
                    const { data } = await adminApi.get(`/admin/scripts?page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "deleted-scripts": {
                    const { data } = await adminApi.get(`/admin/scripts?status=deleted&page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "ai-usage": {
                    const { data } = await adminApi.get(`/admin/scripts/ai-usage?page=${page}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "evaluations": {
                    const { data } = await adminApi.get(`/admin/scripts/evaluation-purchases?page=${page}`);
                    const evaluationScripts = Array.isArray(data?.scripts)
                        ? data.scripts.filter((script) => ![true, "true", 1].includes(script?.isDeleted) && script?.status !== "rejected")
                        : [];
                    setScripts(evaluationScripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "investor-purchases": {
                    const { data } = await adminApi.get(`/admin/scripts/investor-purchases?page=${page}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "payments": {
                    const { data } = await adminApi.get(`/admin/payments?page=${page}`);
                    setTransactions(data.transactions); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "meetings": {
                    const { data } = await adminApi.get(`/meetings`);
                    setMeetings(data); setTotalPages(1); setTotal(data.length);
                    break;
                }
                case "invoices": {
                    const { data } = await adminApi.get(`/admin/invoices?page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    setInvoices(data.invoices); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "scores": {
                    const endpoint = scoreSubTab === "ai" ? "/admin/scores/ai" : scoreSubTab === "platform" ? "/admin/scores/platform" : "/admin/scores/reader";
                    const { data } = await adminApi.get(`${endpoint}?page=${page}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "approvals": {
                    const { data } = await adminApi.get(`/admin/scripts/pending?page=${page}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "trailers": {
                    const { data } = await adminApi.get(`/admin/scripts/trailer-requests?page=${page}`);
                    const trailerScripts = Array.isArray(data?.scripts)
                        ? data.scripts.filter((script) => ![true, "true", 1].includes(script?.isDeleted))
                        : [];
                    setScripts(trailerScripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "ai-trailers": {
                    const { data } = await adminApi.get(`/admin/scripts/ai-trailers?page=${page}`);
                    const trailerLibraryScripts = Array.isArray(data?.scripts)
                        ? data.scripts.filter((script) => ![true, "true", 1].includes(script?.isDeleted))
                        : [];
                    setScripts(trailerLibraryScripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "messages": {
                    await fetchMessagesDirectory();
                    break;
                }
                case "pending-investors": {
                    const { data } = await adminApi.get(`/admin/investors/pending?page=${page}`);
                    setPendingInvestors(data.investors); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "membership-reviews": {
                    const { data } = await adminApi.get(`/admin/writer-membership/pending?page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    setMembershipReviews(data.reviews); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "bank-reviews": {
                    const { data } = await adminApi.get(`/admin/bank-details/reviews?page=${page}&status=pending&search=${encodeURIComponent(activeSearch)}`);
                    setBankReviews(data.reviews); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "queries": {
                    const { data } = await adminApi.get(`/admin/queries?page=${page}`);
                    setContacts(data.submissions); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "deleted-film-professionals": {
                    const { data } = await adminApi.get(`/admin/users/deleted-requests?page=${page}&role=investor&search=${encodeURIComponent(activeSearch)}`);
                    setDeletedAccounts(data.requests || []); setTotalPages(data.totalPages || 1); setTotal(data.total || 0);
                    break;
                }
                case "deleted-writers": {
                    const { data } = await adminApi.get(`/admin/users/deleted-requests?page=${page}&role=writer&search=${encodeURIComponent(activeSearch)}`);
                    setDeletedAccounts(data.requests || []); setTotalPages(data.totalPages || 1); setTotal(data.total || 0);
                    break;
                }
                case "discount-codes": {
                    const { data } = await adminApi.get(`/admin/discount-codes?page=${page}&search=${encodeURIComponent(activeSearch)}`);
                    setDiscountCodes(data.codes); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "analytics": {
                    const { data } = await adminApi.get(`/admin/analytics`);
                    setAnalyticsData(data);
                    setTotalPages(1);
                    setTotal(data?.anonymousVisitors?.totalVisitors || 0);
                    break;
                }
            }
        } catch (err) {
            console.error("Admin fetch error:", err);
            if (err.response?.status === 401) {
                sessionStorage.removeItem("admin-session");
                clearAdminScriptAccess();
                setAuthorized(false);
                showToast("Session expired. Please re-enter the access code.", "error");
            } else if (err?.response?.data?.code === "ADMIN_SCRIPT_SECTION_PASSWORD_REQUIRED") {
                clearAdminScriptAccess();
                showToast("Script section unlock expired. Please enter the password again.", "error");
                ensureScriptSectionAccess().then((success) => {
                    if (success) {
                        fetchData(searchValue);
                    } else if (isAdminScriptProtectedTab(activeTab)) {
                        setActiveTab("overview");
                    }
                });
            } else {
                showToast(err?.response?.data?.message || "Failed to load admin data", "error");
            }
        }
        setMessagesLoading(false);
        await fetchAlertSummary({ silent: true });
        setLoading(false);
    };

    const fetchGlobalSearchData = async (searchValue = "") => {
        if (!authorized) return;
        const activeSearch = searchValue.trim();
        if (!activeSearch) {
            setGlobalResults(EMPTY_GLOBAL_RESULTS);
            return;
        }

        setLoading(true);
        try {
            const hasScriptAccess = Boolean(getStoredAdminScriptAccess()?.token);
            const [
                investorsRes,
                writersRes,
                creatorsRes,
                readersRes,
                scriptsRes,
                invoicesRes,
                paymentsRes,
                pendingInvestorsRes,
                bankReviewsRes,
                queriesRes,
            ] = await Promise.all([
                adminApi.get(`/admin/users?role=investor&page=1&limit=100&search=${encodeURIComponent(activeSearch)}`),
                adminApi.get(`/admin/users?role=writer&page=1&limit=100&search=${encodeURIComponent(activeSearch)}`),
                adminApi.get(`/admin/users?role=creator&page=1&limit=100&search=${encodeURIComponent(activeSearch)}`),
                adminApi.get(`/admin/users?role=reader&page=1&limit=100&search=${encodeURIComponent(activeSearch)}`),
                hasScriptAccess
                    ? adminApi.get(`/admin/scripts?page=1&limit=100&search=${encodeURIComponent(activeSearch)}`)
                    : Promise.resolve({ data: { scripts: [] } }),
                adminApi.get(`/admin/invoices?page=1&limit=100&search=${encodeURIComponent(activeSearch)}`),
                adminApi.get(`/admin/payments?page=1&limit=200`),
                adminApi.get(`/admin/investors/pending?page=1&limit=200`),
                adminApi.get(`/admin/bank-details/reviews?page=1&limit=200&search=${encodeURIComponent(activeSearch)}`),
                adminApi.get(`/admin/queries?page=1&limit=200`),
            ]);

            setGlobalResults({
                users: [
                    ...(investorsRes.data?.users || []),
                    ...(writersRes.data?.users || []),
                    ...(creatorsRes.data?.users || []),
                    ...(readersRes.data?.users || []),
                ],
                scripts: scriptsRes.data?.scripts || [],
                transactions: paymentsRes.data?.transactions || [],
                invoices: invoicesRes.data?.invoices || [],
                pendingInvestors: pendingInvestorsRes.data?.investors || [],
                bankReviews: bankReviewsRes.data?.reviews || [],
                contacts: queriesRes.data?.submissions || [],
            });
        } catch (err) {
            console.error("Admin global search fetch error:", err);
            if (err.response?.status === 401) {
                sessionStorage.removeItem("admin-session");
                clearAdminScriptAccess();
                setAuthorized(false);
                showToast("Session expired. Please re-enter the access code.", "error");
            } else if (err?.response?.data?.code === "ADMIN_SCRIPT_SECTION_PASSWORD_REQUIRED") {
                clearAdminScriptAccess();
                showToast("Scripts stay hidden in global search until the protected script sections are unlocked.", "info");
            }
        }
        setLoading(false);
    };

    const fetchAnalyticsUserDetail = async (userId) => {
        if (!userId) return;
        try {
            setAnalyticsUserDetailLoading(true);
            const { data } = await adminApi.get(`/admin/analytics/users/${userId}`);
            setAnalyticsUserDetail(data || null);
            setAnalyticsSection("registered");
        } catch (err) {
            console.error("Admin analytics user detail error:", err);
            showToast(err?.response?.data?.message || "Failed to load user activity details", "error");
        } finally {
            setAnalyticsUserDetailLoading(false);
        }
    };

    const fetchAnalyticsAnonymousDetail = async (anonymousId) => {
        if (!anonymousId) return;
        try {
            setAnalyticsAnonymousDetailLoading(true);
            const { data } = await adminApi.get(`/admin/analytics/anonymous/${encodeURIComponent(anonymousId)}`);
            setAnalyticsAnonymousDetail(data || null);
            setAnalyticsSection("anonymous");
        } catch (err) {
            console.error("Admin analytics anonymous detail error:", err);
            showToast(err?.response?.data?.message || "Failed to load anonymous user details", "error");
        } finally {
            setAnalyticsAnonymousDetailLoading(false);
        }
    };

    // ─── Effects ───
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        if (authorized) setPage(1);
    }, [activeTab, scoreSubTab, authorized]);

    useEffect(() => {
        if (authorized) setPage(1);
    }, [search, authorized]);

    useEffect(() => {
        if (activeTab !== "analytics") {
            setAnalyticsSection("anonymous");
            setAnalyticsAnonymousDetail(null);
            setAnalyticsAnonymousDetailLoading(false);
            setAnalyticsUserDetail(null);
            setAnalyticsUserDetailLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (!authorized) return;
        if (activeTab === "overview" && hasSearch) return;
        fetchData(search);
    }, [activeTab, page, scoreSubTab, authorized, search, hasSearch]);

    useEffect(() => {
        if (!authorized || activeTab !== "overview") return;
        if (!hasSearch) {
            setGlobalResults(EMPTY_GLOBAL_RESULTS);
            return;
        }
        fetchGlobalSearchData(search);
    }, [authorized, activeTab, hasSearch, search]);

    useEffect(() => {
        if (authorized && searchInput !== search) {
            setLoading(true);
        }
    }, [searchInput, search, authorized]);
    useEffect(() => {
        if (!authorized) return;
        fetchAlertSummary({ silent: true });
        const interval = setInterval(() => {
            fetchAlertSummary({ silent: false });
        }, 30000);
        return () => clearInterval(interval);
    }, [authorized]);

    useEffect(() => {
        if (!authorized || activeTab !== "messages") return;

        const interval = setInterval(async () => {
            await fetchMessagesDirectory({ silent: true });
            if (activeMessageChatId) {
                await fetchMessagesForChat(activeMessageChatId, { silent: true });
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [authorized, activeTab, activeMessageChatId, activeMessageUser?._id]);

    useEffect(() => {
        if (!authorized || activeTab !== "messages" || !activeMessageChatId) return;
        fetchMessagesForChat(activeMessageChatId, { silent: true });
    }, [authorized, activeTab, activeMessageChatId]);

    useEffect(() => {
        if (activeTab !== "messages" || !activeMessageChatId) {
            previousAdminChatIdRef.current = "";
            shouldAutoScrollAdminMessagesRef.current = false;
            setShowAdminScrollToBottomButton(false);
            return;
        }

        const chatChanged = previousAdminChatIdRef.current !== activeMessageChatId;
        if (chatChanged) {
            previousAdminChatIdRef.current = activeMessageChatId;
            shouldAutoScrollAdminMessagesRef.current = true;
            scrollAdminMessagesToBottom("auto");
            return;
        }

        if (!shouldAutoScrollAdminMessagesRef.current) return;
        shouldAutoScrollAdminMessagesRef.current = false;
        scrollAdminMessagesToBottom("smooth");
    }, [activeTab, activeMessageChatId, messageList.length]);

    useEffect(() => {
        const container = messageListContainerRef.current;
        if (activeTab !== "messages" || !activeMessageChatId || !container) {
            setShowAdminScrollToBottomButton(false);
            return;
        }
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        setShowAdminScrollToBottomButton(distanceFromBottom > 96);
    }, [activeTab, activeMessageChatId, messageList.length]);

    const fetchMessagesForChat = async (chatId, { silent = false } = {}) => {
        if (!chatId) {
            setMessageList([]);
            return;
        }
        if (!silent) setMessagesLoading(true);
        try {
            const { data } = await adminApi.get(`/messages/${chatId}`);
            const next = Array.isArray(data) ? data : [];
            setMessageList((prev) => {
                const sameLength = prev.length === next.length;
                const sameFirst = prev[0]?._id === next[0]?._id;
                const sameLast = prev[prev.length - 1]?._id === next[next.length - 1]?._id;
                if (sameLength && sameFirst && sameLast) return prev;
                return next;
            });
        } catch (err) {
            console.error("Admin messages fetch error:", err);
            if (!silent) showToast("Failed to load messages", "error");
            setMessageList([]);
        } finally {
            if (!silent) setMessagesLoading(false);
        }
    };

    const openWriterConversation = async (writerUser) => {
        if (!writerUser?._id) return;

        const writerId = String(writerUser._id);
        const existingConversation = adminConversations.find((conv) => String(conv?.user?._id) === writerId);

        setActiveTab("messages");
        setActiveMessageUser(writerUser);
        setMessageText("");
        setMessageAttachment(null);
        if (messageFileInputRef.current) messageFileInputRef.current.value = "";

        if (existingConversation?.chatId) {
            setActiveMessageChatId(existingConversation.chatId);
            await fetchMessagesForChat(existingConversation.chatId);
            return;
        }

        setActiveMessageChatId("");
        setMessageList([]);
    };

    const handlePickMessageAttachment = () => {
        if (!activeMessageUser || uploadingMessageAttachment) return;
        messageFileInputRef.current?.click();
    };

    const handleAdminAttachmentChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
            showToast("Attachment is too large. Maximum size is 250MB.", "error");
            if (messageFileInputRef.current) messageFileInputRef.current.value = "";
            return;
        }

        setUploadingMessageAttachment(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const { data } = await adminApi.post("/messages/upload", formData);
            setMessageAttachment(data || null);
        } catch (err) {
            console.error("Admin attachment upload error:", err);
            showToast(err?.response?.data?.message || "Failed to upload attachment", "error");
            if (messageFileInputRef.current) messageFileInputRef.current.value = "";
        } finally {
            setUploadingMessageAttachment(false);
        }
    };

    const handleSendAdminMessage = async () => {
        if (!activeMessageUser?._id) return;

        const trimmedText = messageText.trim();
        const attachmentPayload = messageAttachment
            ? {
                fileUrl: messageAttachment.fileUrl,
                fileType: messageAttachment.fileType,
                fileName: messageAttachment.fileName,
                fileSize: messageAttachment.fileSize,
            }
            : {};

        if (!trimmedText && !attachmentPayload.fileUrl) return;

        try {
            const { data: saved } = await adminApi.post("/messages/send", {
                receiverId: activeMessageUser._id,
                text: trimmedText,
                ...attachmentPayload,
            });

            setMessageText("");
            setMessageAttachment(null);
            if (messageFileInputRef.current) messageFileInputRef.current.value = "";
            shouldAutoScrollAdminMessagesRef.current = true;
            setMessageList((prev) => [...prev, saved]);

            const nextChatId = saved?.chatId || activeMessageChatId || buildChatId(saved?.sender?._id, activeMessageUser._id);
            if (nextChatId) setActiveMessageChatId(nextChatId);
            const previewText = getMessagePreview(saved);

            setAdminConversations((prev) => {
                const conversation = {
                    chatId: nextChatId,
                    user: activeMessageUser,
                    lastMessage: previewText,
                    timestamp: saved?.createdAt || new Date().toISOString(),
                    unreadCount: 0,
                };
                const rest = prev.filter((conv) => conv.chatId !== conversation.chatId);
                return [conversation, ...rest];
            });

            setMessageUsers((prev) => {
                const withoutCurrent = prev.filter((u) => String(u._id) !== String(activeMessageUser._id));
                return [{ ...activeMessageUser, conversation: { chatId: nextChatId, timestamp: saved?.createdAt || new Date().toISOString(), lastMessage: previewText, unreadCount: 0 } }, ...withoutCurrent];
            });
        } catch (err) {
            console.error("Admin send message error:", err);
            showToast(err?.response?.data?.message || "Failed to send message", "error");
        }
    };

    // ─── Action handlers (all use adminApi) ───
    const handleApprove = async (id) => {
        const hasScriptAccess = await ensureScriptSectionAccess();
        if (!hasScriptAccess) return;

        try {
            await adminApi.put(`/admin/scripts/${id}/approve`);
            showToast("Script approved and published successfully");
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to approve script", "error");
        }
    };

    const handleReject = async (id) => {
        const hasScriptAccess = await ensureScriptSectionAccess();
        if (!hasScriptAccess) return;

        const reason = await openAdminDialog({
            type: "prompt",
            title: "Reject script",
            message: "Add an optional rejection reason visible to the writer.",
            confirmText: "Reject",
            cancelText: "Cancel",
            placeholder: "Rejection reason (optional)",
            multiline: true,
        });
        if (reason === null) return;
        try {
            await adminApi.put(`/admin/scripts/${id}/reject`, { reason: reason.trim() || undefined });
            showToast("Script rejected");
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to reject script", "error");
        }
    };

    const handleDeleteProject = async (script) => {
        const hasScriptAccess = await ensureScriptSectionAccess();
        if (!hasScriptAccess) return;

        const scriptId = script?._id;
        if (!scriptId || deletingScriptId) return;

        const title = String(script?.title || "this project");
        const confirmed = await openAdminDialog({
            type: "confirm",
            title: "Delete project",
            message: `Delete "${title}" from platform listings? Existing buyers will retain access.`,
            confirmText: "Delete",
            cancelText: "Cancel",
        });
        if (!confirmed) return;

        try {
            setDeletingScriptId(scriptId);
            const { data } = await adminApi.delete(`/admin/scripts/${scriptId}`);
            showToast(data?.message || "Project deleted successfully");
            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to delete project", "error");
        } finally {
            setDeletingScriptId("");
        }
    };

    const handleScore = async (id, scores) => {
        const hasScriptAccess = await ensureScriptSectionAccess();
        if (!hasScriptAccess) return false;

        try {
            await adminApi.put(`/admin/scripts/${id}/score`, scores);
            showToast("Platform score saved successfully");
            setScoreModal(null);
            fetchData();
            return true;
        } catch (err) {
            console.error(err);
            showToast("Failed to save score", "error");
            return false;
        }
    };

    const handleTrailerApprove = async (script) => {
        const isRegeneration = script?.trailerWriterFeedback?.status === "revision_requested";
        const trimmedTrailerUrl = String(script?.trailerUrl || "").trim();
        if (!trimmedTrailerUrl) {
            if (!script?.creator?._id) {
                showToast("No trailer URL available for this script", "error");
                return;
            }

            const draft = isRegeneration
                ? `Hi ${script.creator?.name || "writer"}, please review this updated trailer for "${script?.title || "this script"}".\nTrailer URL: `
                : `Hi ${script.creator?.name || "writer"}, your trailer for "${script?.title || "this script"}" is ready.\nTrailer URL: `;

            await openWriterConversation(script.creator);
            setMessageText(draft);
            showToast("No trailer URL on script. Send trailer URL/file from Admin Messages.", "info");
            return;
        }

        const trailerThumbnail = script?.trailerThumbnail || "";
        const caption = isRegeneration
            ? `We've updated your AI trailer for "${script?.title || "this script"}". Please review this version.`
            : `Your AI trailer for "${script?.title || "this script"}" is ready.`;

        try {
            await adminApi.put(`/admin/scripts/${script._id}/trailer-approve`, {
                trailerUrl: trimmedTrailerUrl,
                trailerThumbnail: trailerThumbnail.trim() || undefined,
                caption: caption.trim() || undefined,
            });
            showToast(isRegeneration
                ? "Regenerated trailer sent to writer via message"
                : "Trailer approved and sent to writer via message");
            fetchData();
        } catch (err) {
            console.error(err);
            const msg = err?.response?.data?.message || (isRegeneration ? "Failed to regenerate trailer" : "Failed to approve trailer");
            showToast(msg, "error");
        }
    };

    const handleSendTrailerToWriter = async (script) => {
        await handleTrailerApprove(script);
    };

    const openTrailerRequirements = (script) => {
        if (!script) return;
        setTrailerRequirementsModal(script);
    };

    const handleOpenTrailerUpload = (script) => {
        if (!script?._id || uploadingTrailerScriptId) return;
        setTrailerUploadTargetScript(script);
        if (trailerFileInputRef.current) {
            trailerFileInputRef.current.value = "";
            trailerFileInputRef.current.click();
        }
    };

    const handleRemoveTrailer = async (script) => {
        const scriptId = script?._id;
        if (!scriptId) return;

        const title = String(script?.title || "this project");
        const confirmed = await openAdminDialog({
            type: "confirm",
            title: "Remove trailer",
            message: `Remove the trailer from "${title}"? It will no longer appear in the AI Trailer section.`,
            confirmText: "Remove",
            cancelText: "Cancel",
        });
        if (!confirmed) return;

        try {
            const { data } = await adminApi.delete(`/admin/scripts/${scriptId}/remove-trailer`);
            showToast(data?.message || "Trailer removed successfully");
            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to remove trailer", "error");
        }
    };

    const handleAdminTrailerFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !trailerUploadTargetScript?._id) return;

        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
            showToast("Trailer must be 250MB or smaller.", "error");
            if (trailerFileInputRef.current) trailerFileInputRef.current.value = "";
            setTrailerUploadTargetScript(null);
            return;
        }

        const scriptId = trailerUploadTargetScript._id;
        setUploadingTrailerScriptId(scriptId);

        try {
            const formData = new FormData();
            formData.append("trailer", file);

            const { data } = await adminApi.post(`/admin/scripts/${scriptId}/upload-trailer`, formData);

            if (data?.script?._id) {
                setScripts((prev) => prev.map((s) => (String(s._id) === String(data.script._id) ? { ...s, ...data.script } : s)));
            }

            showToast(data?.message || "Trailer uploaded and published successfully");
            if (activeTab === "trailers") {
                fetchData(search);
            }
        } catch (err) {
            console.error("Admin trailer upload error:", err);
            showToast(err?.response?.data?.message || "Failed to upload trailer", "error");
        } finally {
            setUploadingTrailerScriptId("");
            setTrailerUploadTargetScript(null);
            if (trailerFileInputRef.current) trailerFileInputRef.current.value = "";
        }
    };

    const handleApproveInvestor = async (id) => {
        try {
            await adminApi.put(`/admin/investors/${id}/approve`);
            showToast("Investor approved — they can now log in");
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to approve investor", "error");
        }
    };

    const handleRejectInvestor = async (id, note) => {
        try {
            await adminApi.put(`/admin/investors/${id}/reject`, { note });
            showToast("Investor rejected");
            setRejectModal(null);
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to reject investor", "error");
        }
    };

    const handleApproveBankReview = async (id) => {
        try {
            await adminApi.put(`/admin/bank-details/reviews/${id}/approve`);
            showToast("Bank details approved and activated");
            fetchData();
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to approve bank details", "error");
        }
    };

    const handleRejectBankReview = async (id) => {
        const note = await openAdminDialog({
            type: "prompt",
            title: "Reject bank details",
            message: "Add an optional rejection reason.",
            confirmText: "Reject",
            cancelText: "Cancel",
            placeholder: "Rejection reason (optional)",
            multiline: true,
        });
        if (note === null) return;
        try {
            await adminApi.put(`/admin/bank-details/reviews/${id}/reject`, { note });
            showToast("Bank details request rejected");
            fetchData();
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to reject bank details", "error");
        }
    };

    const handleUnblockBankReview = async (id) => {
        try {
            await adminApi.put(`/admin/bank-details/reviews/${id}/unblock`);
            showToast("User bank-detail lock removed");
            fetchData();
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to unblock user", "error");
        }
    };

    const handleReviewWriterMembership = async (userId, membershipType, decision) => {
        if (!userId || userActionLoading) return;

        const normalizedType = String(membershipType || "").toLowerCase();
        const normalizedDecision = String(decision || "").toLowerCase();
        if (!["wga", "swa"].includes(normalizedType)) return;
        if (!["approve", "reject"].includes(normalizedDecision)) return;

        let note = "";
        if (normalizedDecision === "reject") {
            const noteInput = await openAdminDialog({
                type: "prompt",
                title: `Reject ${normalizedType.toUpperCase()} membership`,
                message: "Add an optional note for the writer.",
                confirmText: "Reject",
                cancelText: "Cancel",
                placeholder: "Rejection note (optional)",
                multiline: true,
            });
            if (noteInput === null) return;
            note = String(noteInput || "").trim();
        }

        const loadingKey = `membership-${normalizedDecision}-${normalizedType}-${userId}`;
        try {
            setUserActionLoading(loadingKey);
            const { data } = await adminApi.put(
                `/admin/writer-membership/${userId}/${normalizedType}/${normalizedDecision}`,
                note ? { note } : {}
            );

            showToast(data?.message || `${normalizedType.toUpperCase()} membership updated`);

            if (data?.user?._id && data?.user?.writerProfile) {
                setSelectedUserDetail((prev) => {
                    if (!prev || String(prev._id) !== String(data.user._id)) return prev;
                    return {
                        ...prev,
                        writerProfile: data.user.writerProfile,
                    };
                });
            }

            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to update membership review", "error");
        } finally {
            setUserActionLoading("");
        }
    };

    const handleOpenMembershipProof = async (event, userId, membershipType, fallbackUrl) => {
        event.preventDefault();
        if (!userId) return;

        const normalizedType = String(membershipType || "").toLowerCase();
        if (!["wga", "swa"].includes(normalizedType)) return;

        try {
            const { data } = await adminApi.get(`/admin/writer-membership/${userId}/${normalizedType}/access-url`);
            const accessUrl = data?.url || fallbackUrl;
            if (accessUrl) {
                window.open(accessUrl, "_blank", "noopener,noreferrer");
                return;
            }
            showToast("Proof link unavailable", "error");
        } catch (err) {
            console.error(err);
            if (fallbackUrl) {
                window.open(fallbackUrl, "_blank", "noopener,noreferrer");
                return;
            }
            showToast(err?.response?.data?.message || "Failed to open proof", "error");
        }
    };

    // ─── Discount Code Handlers ───
    const handleSaveDiscountCode = async (formData) => {
        try {
            if (formData._id) {
                await adminApi.put(`/admin/discount-codes/${formData._id}`, formData);
                showToast("Discount code updated");
            } else {
                await adminApi.post("/admin/discount-codes", formData);
                showToast("Discount code created");
            }
            setDiscountCodeModal(null);
            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to save discount code", "error");
        }
    };

    const handleDeleteDiscountCode = async (id) => {
        const confirmed = await openAdminDialog({
            type: "confirm",
            title: "Deactivate discount code",
            message: "Deactivate this discount code?",
            confirmText: "Deactivate",
            cancelText: "Cancel",
        });
        if (!confirmed) return;
        try {
            await adminApi.delete(`/admin/discount-codes/${id}`);
            showToast("Discount code deactivated");
            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast("Failed to deactivate discount code", "error");
        }
    };

    const handleLoginAs = async (userId) => {
        try {
            const { data } = await adminApi.post(`/admin/login-as/${userId}`);
            const encoded = encodeURIComponent(JSON.stringify(data));
            window.open(`/dashboard?adminLogin=${encoded}`, "_blank");
            showToast(`Opened session as ${data.name || data.email}`);
        } catch (err) {
            console.error(err);
            showToast("Failed to login as user", "error");
        }
    };

    const handleFreezeToggleUser = async (user, freeze) => {
        if (!user?._id || userActionLoading) return;
        if (user.isDeactivated) {
            showToast("This account is already deleted", "error");
            return;
        }

        const freezeReasonInput = freeze
            ? await openAdminDialog({
                type: "prompt",
                title: "Freeze account",
                message: "Provide a reason that will be shown to the user.",
                confirmText: "Freeze",
                cancelText: "Cancel",
                defaultValue: user.frozenReason || "",
                placeholder: "Freeze reason",
                multiline: true,
            })
            : "";

        if (freeze && freezeReasonInput === null) return;
        const reason = String(freezeReasonInput || "").trim();

        if (freeze && !reason) {
            showToast("Freeze reason is required", "error");
            return;
        }

        const loadingKey = `${freeze ? "freeze" : "unfreeze"}-${user._id}`;
        try {
            setUserActionLoading(loadingKey);
            const endpoint = freeze ? `/admin/users/${user._id}/freeze` : `/admin/users/${user._id}/unfreeze`;
            const { data } = await adminApi.put(endpoint, freeze ? { reason } : {});
            showToast(data?.message || (freeze ? "Account frozen" : "Account unfrozen"));

            if (data?.user?._id) {
                setSelectedUserDetail((prev) => {
                    if (!prev || String(prev._id) !== String(data.user._id)) return prev;
                    return { ...prev, ...data.user };
                });
            }

            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to update account status", "error");
        } finally {
            setUserActionLoading("");
        }
    };



    const handleGrantPremiumToUser = async (user) => {
        if (!user?._id || userActionLoading) return;
        if (user.isDeactivated) {
            showToast("Cannot grant premium to a deleted account", "error");
            return;
        }

        const confirmed = await openAdminDialog({
            type: "confirm",
            title: "Grant Premium",
            message: `Grant 30 days of the premium model to ${user.name || user.email}?`,
            confirmText: "Grant",
            cancelText: "Cancel",
        });

        if (!confirmed) return;

        const loadingKey = `premium-${user._id}`;
        try {
            setUserActionLoading(loadingKey);
            const { data } = await adminApi.post(`/admin/users/${user._id}/grant-premium`);
            showToast(data?.message || "Premium model granted successfully");

            if (data?.user?._id) {
                setSelectedUserDetail((prev) => {
                    if (!prev || String(prev._id) !== String(data.user._id)) return prev;
                    return { ...prev, ...data.user };
                });
            }

            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to grant premium model", "error");
        } finally {
            setUserActionLoading("");
        }
    };

    const handleRemovePremiumFromUser = async (user) => {
        if (!user?._id || userActionLoading) return;
        if (user.isDeactivated) {
            showToast("Cannot modify a deleted account", "error");
            return;
        }

        const confirmed = await openAdminDialog({
            type: "confirm",
            title: "Remove Premium",
            message: `Remove the premium model from ${user.name || user.email}?`,
            confirmText: "Remove",
            cancelText: "Cancel",
        });

        if (!confirmed) return;

        const loadingKey = `remove-premium-${user._id}`;
        try {
            setUserActionLoading(loadingKey);
            const { data } = await adminApi.post(`/admin/users/${user._id}/remove-premium`);
            showToast(data?.message || "Premium model removed successfully");

            if (data?.user?._id) {
                setSelectedUserDetail((prev) => {
                    if (!prev || String(prev._id) !== String(data.user._id)) return prev;
                    return { ...prev, ...data.user };
                });
            }

            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to remove premium model", "error");
        } finally {
            setUserActionLoading("");
        }
    };

    const handleGrantWriterPlan = async (user, plan) => {
        if (!user?._id || userActionLoading) return;
        if (user.isDeactivated) {
            showToast("Cannot modify a deleted account", "error");
            return;
        }

        const planDisplayName = plan === "gold" ? "Gold" : plan === "silver" ? "Silver" : plan;

        const cycle = await openAdminDialog({
            type: "select",
            title: `Grant ${planDisplayName} Plan`,
            message: `Select the billing cycle for the ${planDisplayName} plan you are granting to ${user.name || user.email}.`,
            confirmText: "Grant",
            cancelText: "Cancel",
            defaultValue: "monthly",
            options: [
                { label: "Monthly (30 days)", value: "monthly" },
                { label: "Annual (365 days)", value: "annual" }
            ]
        });

        if (!cycle) return;

        const loadingKey = `grant-writer-plan-${user._id}`;
        try {
            setUserActionLoading(loadingKey);
            const { data } = await adminApi.post(`/admin/users/${user._id}/grant-writer-plan`, { plan, cycle });
            showToast(data?.message || `Granted ${planDisplayName} plan successfully`);

            if (data?.user?._id) {
                setSelectedUserDetail((prev) => {
                    if (!prev || String(prev._id) !== String(data.user._id)) return prev;
                    return { ...prev, ...data.user };
                });
            }

            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to grant writer plan", "error");
        } finally {
            setUserActionLoading("");
        }
    };

    const handleGrantFipPlan = async (user) => {
        if (!user?._id || userActionLoading) return;
        if (user.isDeactivated) {
            showToast("Cannot modify a deleted account", "error");
            return;
        }

        const confirmed = await openAdminDialog({
            type: "confirm",
            title: "Grant 1-Year FIP Plan",
            message: `Grant a 1-year Film Industry Professional (Diamond) plan to ${user.name || user.email}?`,
            confirmText: "Grant",
            cancelText: "Cancel",
        });

        if (!confirmed) return;

        const loadingKey = `grant-fip-plan-${user._id}`;
        try {
            setUserActionLoading(loadingKey);
            const { data } = await adminApi.post(`/admin/users/${user._id}/grant-fip-plan`);
            showToast(data?.message || "Granted 1-Year FIP plan successfully");

            if (data?.user?._id) {
                setSelectedUserDetail((prev) => {
                    if (!prev || String(prev._id) !== String(data.user._id)) return prev;
                    return { ...prev, ...data.user };
                });
            }

            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to grant FIP plan", "error");
        } finally {
            setUserActionLoading("");
        }
    };

    const handleRemoveWriterPlan = async (user) => {
        if (!user?._id || userActionLoading) return;
        if (user.isDeactivated) {
            showToast("Cannot modify a deleted account", "error");
            return;
        }

        const confirmed = await openAdminDialog({
            type: "confirm",
            title: "Remove Writer Plan",
            message: `Remove the ${user.subscription?.plan || "active"} plan from ${user.name || user.email}?`,
            confirmText: "Remove",
            cancelText: "Cancel",
        });

        if (!confirmed) return;

        const loadingKey = `remove-writer-plan-${user._id}`;
        try {
            setUserActionLoading(loadingKey);
            const { data } = await adminApi.post(`/admin/users/${user._id}/remove-writer-plan`);
            showToast(data?.message || "Writer plan removed successfully");

            if (data?.user?._id) {
                setSelectedUserDetail((prev) => {
                    if (!prev || String(prev._id) !== String(data.user._id)) return prev;
                    return { ...prev, ...data.user };
                });
            }

            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to remove writer plan", "error");
        } finally {
            setUserActionLoading("");
        }
    };

    const handleDeleteUserAccount = async (user) => {
        if (!user?._id || userActionLoading) return;
        if (user.isDeactivated) {
            showToast("Account already deleted", "info");
            return;
        }

        const confirmed = await openAdminDialog({
            type: "confirm",
            title: "Delete account",
            message: `Delete account for ${user.name || user.email}? This action deactivates and blocks access.`,
            confirmText: "Delete",
            cancelText: "Cancel",
        });
        if (!confirmed) return;

        const loadingKey = `delete-${user._id}`;
        try {
            setUserActionLoading(loadingKey);
            const { data } = await adminApi.delete(`/admin/users/${user._id}`);
            showToast(data?.message || "User account deleted successfully");

            if (data?.user?._id) {
                setSelectedUserDetail((prev) => {
                    if (!prev || String(prev._id) !== String(data.user._id)) return prev;
                    return { ...prev, ...data.user };
                });
            }

            fetchData(search);
        } catch (err) {
            console.error(err);
            showToast(err?.response?.data?.message || "Failed to delete account", "error");
        } finally {
            setUserActionLoading("");
        }
    };

    const handleInvoicePdfAction = async (invoice, action = "open") => {
        try {
            const { data } = await adminApi.get(`/invoices/${invoice._id}/pdf`, {
                params: action === "download" ? { download: 1 } : {},
                responseType: "blob",
            });
            const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));

            if (action === "download") {
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = `${invoice.invoiceNumber || "invoice"}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                return;
            }

            window.open(blobUrl, "_blank", "noopener,noreferrer");
            setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        } catch (err) {
            console.error(err);
            showToast("Failed to open invoice PDF", "error");
        }
    };

    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        setCodeError("");
        const enteredCode = codeInput.trim();
        if (!enteredCode) {
            setCodeError("Access code is required");
            return;
        }
        setCodeLoading(true);
        try {
            // Login as admin — store token ONLY in sessionStorage (does NOT affect user's localStorage session)
            const { data } = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: "admin@ckript.com",
                password: "admin123",
                adminCode: enteredCode,
            });
            sessionStorage.setItem("admin-session", JSON.stringify(data));
            clearAdminScriptAccess();
            setAuthorized(true);
            setCodeInput("");
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            setCodeError(apiMessage || "Admin login failed. Admin account may be missing after DB reset.");
        }
        setCodeLoading(false);
    };

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        setShowLogoutConfirm(false);
        sessionStorage.removeItem("admin-session");
        clearAdminScriptAccess();
        setAuthorized(false);
        previousAlertSummaryRef.current = null;
        setAlertSummary({});
    };

    // ═══════════════════════════════════════════════
    // If not authorized, show code entry screen
    // ═══════════════════════════════════════════════
    if (!authorized) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#050d1a] via-[#0b1a30] to-[#0a1628]">
                <div className="w-full max-w-md mx-4 rounded-2xl p-8 border bg-[#0f1d35]/80 border-[#1a3050] backdrop-blur-xl shadow-2xl">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white">Admin Panel</h1>
                        <p className="text-sm mt-1 text-gray-500">Enter access code to continue</p>
                    </div>
                    <form onSubmit={handleCodeSubmit}>
                        <PasswordInput
                            value={codeInput}
                            onChange={(e) => { setCodeInput(e.target.value); setCodeError(""); }}
                            placeholder="Access Code"
                            autoFocus
                            className="w-full px-4 py-3.5 rounded-xl text-center text-lg font-bold tracking-[0.3em] outline-none border bg-[#0b1426] border-[#1a3050] text-white placeholder-gray-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        {codeError && (
                            <p className="text-red-400 text-sm font-semibold mt-2 text-center">{codeError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={codeLoading || !codeInput}
                            className="w-full mt-4 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl hover:shadow-blue-500/20"
                        >
                            {codeLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Verifying...
                                </span>
                            ) : "Access Admin Panel"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ─── Render Content ───
    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            );
        }

        switch (activeTab) {
            case "overview":
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
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-700"}`}>
                                    {totalMatches} match{totalMatches === 1 ? "" : "es"}
                                </span>
                            </div>

                            {totalMatches === 0 ? (
                                <div className={`rounded-2xl border p-10 text-center ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                    <p className={`text-sm font-semibold ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                        No results found. Try a different keyword.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {resultBlocks.filter((block) => block.count > 0).map((block) => (
                                        <div key={block.key} className={`rounded-2xl border p-4 ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
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
                                    <StatCard isDark={isDark} label="Total Users" value={stats.totalUsers || 0} icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" color="bg-blue-500/15 text-blue-500" />
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

            case "premium-professionals":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Premium Professionals
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredUsers.length : total})</span>
                            </h2>
                        </div>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>User</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Email</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Joined</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Premium Expiry</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Days Left</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {filteredUsers.map((u) => {
                                            const expiryDate = u.subscription?.accessExpiresAt ? new Date(u.subscription.accessExpiresAt) : null;
                                            const daysLeft = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24))) : 0;
                                            return (
                                                <tr key={u._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            {u.profileImage ? (
                                                                <img src={u.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-[#1e3a5f]/10 text-[#1e3a5f]"}`}>
                                                                    {u.name?.charAt(0)?.toUpperCase() || "?"}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{u.name}</p>
                                                                <p className={`text-[11px] mt-0.5 font-bold ${u.isDeactivated ? "text-red-500" : u.isFrozen ? "text-amber-500" : (isDark ? "text-emerald-400" : "text-emerald-600")}`}>
                                                                    SID: {u.sid || "Pending"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{u.email}</td>
                                                    <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                        {new Date(u.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                        {expiryDate ? expiryDate.toLocaleDateString() : "Lifetime/None"}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${daysLeft > 7 ? (isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700") : daysLeft > 0 ? (isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700") : (isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700")}`}>
                                                            {daysLeft > 0 ? `${daysLeft} Days` : "Expired"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <button
                                                            onClick={() => handleRemovePremiumFromUser(u)}
                                                            disabled={Boolean(u.isDeactivated) || userActionLoading === `remove-premium-${u._id}`}
                                                            className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                        >
                                                            {userActionLoading === `remove-premium-${u._id}` ? "Removing..." : "Remove Premium"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "writer-plans":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Writer Plans
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredUsers.length : total})</span>
                            </h2>
                        </div>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>User</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Email</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Plan</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Joined</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Expiry</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Days Left</th>
                                            <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {filteredUsers.map((u) => {
                                            const expiryDate = u.subscription?.accessExpiresAt ? new Date(u.subscription.accessExpiresAt) : null;
                                            const daysLeft = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24))) : 0;
                                            const planName = u.subscription?.plan || "Unknown";
                                            return (
                                                <tr key={u._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            {u.profileImage ? (
                                                                <img src={u.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-[#1e3a5f]/10 text-[#1e3a5f]"}`}>
                                                                    {u.name?.charAt(0)?.toUpperCase() || "?"}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{u.name}</p>
                                                                <p className={`text-[11px] mt-0.5 font-bold ${u.isDeactivated ? "text-red-500" : u.isFrozen ? "text-amber-500" : (isDark ? "text-emerald-400" : "text-emerald-600")}`}>
                                                                    SID: {u.sid || "Pending"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{u.email}</td>
                                                    <td className={`px-5 py-3.5 text-sm font-bold capitalize ${isDark ? "text-purple-400" : "text-purple-600"}`}>{planName}</td>
                                                    <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                        {new Date(u.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                        {expiryDate ? expiryDate.toLocaleDateString() : "Lifetime/None"}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${daysLeft > 7 ? (isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700") : daysLeft > 0 ? (isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700") : (isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700")}`}>
                                                            {daysLeft > 0 ? `${daysLeft} Days` : "Expired"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleGrantWriterPlan(u, "gold")}
                                                                disabled={Boolean(u.isDeactivated) || userActionLoading === `grant-writer-plan-${u._id}`}
                                                                className="text-xs font-bold text-[#d4af37] hover:text-[#aa801a] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#d4af37]/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                            >
                                                                Gold
                                                            </button>
                                                            <button
                                                                onClick={() => handleGrantWriterPlan(u, "silver")}
                                                                disabled={Boolean(u.isDeactivated) || userActionLoading === `grant-writer-plan-${u._id}`}
                                                                className="text-xs font-bold text-gray-400 hover:text-gray-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-400/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                            >
                                                                Silver
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveWriterPlan(u)}
                                                                disabled={Boolean(u.isDeactivated) || userActionLoading === `remove-writer-plan-${u._id}`}
                                                                className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "investors":
            case "writers":
            case "readers":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                {activeTab === "investors" ? "Film Professionals" : activeTab === "writers" ? "Writers" : "Readers"}
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredUsers.length : total})</span>
                            </h2>
                        </div>
                        {activeTab === "writers" && (
                            <BroadcastComposer
                                isDark={isDark}
                                audienceLabel="Writers"
                                title={writerBroadcastTitle}
                                content={writerBroadcastContent}
                                actionUrl={writerBroadcastLink}
                                onTitleChange={setWriterBroadcastTitle}
                                onContentChange={setWriterBroadcastContent}
                                onActionUrlChange={setWriterBroadcastLink}
                                onSend={() => handleSendAudienceBroadcast("writers")}
                                sending={userActionLoading === "broadcast:writers"}
                            />
                        )}
                        {activeTab === "investors" && (
                            <BroadcastComposer
                                isDark={isDark}
                                audienceLabel="Film Professionals"
                                title={filmBroadcastTitle}
                                content={filmBroadcastContent}
                                actionUrl={filmBroadcastLink}
                                onTitleChange={setFilmBroadcastTitle}
                                onContentChange={setFilmBroadcastContent}
                                onActionUrlChange={setFilmBroadcastLink}
                                onSend={() => handleSendAudienceBroadcast("film-professionals")}
                                sending={userActionLoading === "broadcast:film-professionals"}
                            />
                        )}
                        <UserTable
                            users={filteredUsers}
                            isDark={isDark}
                            onLoginAs={null}
                            onViewUser={setSelectedUserDetail}
                            onFreezeUser={(user) => handleFreezeToggleUser(user, true)}
                            onUnfreezeUser={(user) => handleFreezeToggleUser(user, false)}
                            onGrantPremium={handleGrantPremiumToUser}
                            onRemovePremium={handleRemovePremiumFromUser}
                            onDeleteUser={handleDeleteUserAccount}
                            userActionLoading={userActionLoading}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "projects":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>All Scripts<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span></h2>
                        </div>
                        <BroadcastComposer
                            isDark={isDark}
                            audienceLabel="Script Uploaders"
                            title={scriptBroadcastTitle}
                            content={scriptBroadcastContent}
                            actionUrl={scriptBroadcastLink}
                            onTitleChange={setScriptBroadcastTitle}
                            onContentChange={setScriptBroadcastContent}
                            onActionUrlChange={setScriptBroadcastLink}
                            onSend={() => handleSendAudienceBroadcast("script-uploaders")}
                            sending={userActionLoading === "broadcast:script-uploaders"}
                        />
                        <ScriptTable scripts={filteredScripts} isDark={isDark} showScore={true}
                            actions={(s) => (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setScoreModal(s)} className="text-xs font-bold text-purple-500 hover:text-purple-400 px-2.5 py-1 rounded-lg hover:bg-purple-500/10 transition-colors">Score</button>
                                    <a href={`/admin/scripts/${s._id}`} className="text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1 rounded-lg hover:bg-blue-500/10 transition-colors">View</a>
                                    <button
                                        onClick={() => handleDeleteProject(s)}
                                        disabled={Boolean(s.isDeleted) || deletingScriptId === s._id}
                                        className="text-xs font-bold text-red-500 hover:text-red-400 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                    >
                                        {s.isDeleted ? "Deleted" : deletingScriptId === s._id ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "deleted-scripts":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Deleted Scripts<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span></h2>
                        </div>
                        <ScriptTable scripts={filteredScripts} isDark={isDark} showScore={true}
                            actions={(s) => (
                                <div className="flex items-center gap-2">
                                    <a href={`/admin/scripts/${s._id}`} className="text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1 rounded-lg hover:bg-blue-500/10 transition-colors">View</a>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isDark ? "bg-red-500/15 text-red-300" : "bg-red-50 text-red-700"}`}>Deleted</span>
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "ai-usage":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>AI Usage in Projects<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span></h2>
                        <ScriptTable scripts={filteredScripts} isDark={isDark} showScore={true} />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "evaluations":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>AI Evaluations<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span></h2>
                        <ScriptTable scripts={filteredScripts} isDark={isDark} showScore={true} />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "investor-purchases":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Investor Purchases<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span></h2>
                        <ScriptTable scripts={filteredScripts} isDark={isDark} showScore={false}
                            actions={(s) => (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <a
                                        href={`/admin/scripts/${s._id}`}
                                        className="text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1 rounded-lg hover:bg-blue-500/10 transition-colors"
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

            case "payments":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Payment Transactions<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredTransactions.length : total})</span></h2>
                        <TransactionTable transactions={filteredTransactions} isDark={isDark} />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "invoices":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Invoices<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredInvoices.length : total})</span></h2>
                        </div>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {[
                                                "Invoice #",
                                                "Creator",
                                                "Project",
                                                "Access",
                                                "Credits",
                                                "Date",
                                                "Actions",
                                            ].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {filteredInvoices.map((inv) => (
                                            <tr key={inv._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className={`px-5 py-3.5 text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{inv.invoiceNumber}</td>
                                                <td className="px-5 py-3.5">
                                                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{inv.creator?.name || "-"}</p>
                                                    <p className={`text-[11px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                                        SID: {inv.creatorSid || inv.creator?.sid || "-"}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{inv.script?.title || "-"}</p>
                                                    <p className={`text-[11px] mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                                        SID: {inv.scriptSid || inv.script?.sid || "-"}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${inv.accessType === "premium" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                                                        {inv.accessType === "premium" ? "Premium" : "Free"}
                                                    </span>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{inv.totalCreditsRequired || 0} cr</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>{new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString()}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleInvoicePdfAction(inv, "open")}
                                                            className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-500/10"
                                                        >
                                                            Open PDF
                                                        </button>
                                                        <button
                                                            onClick={() => handleInvoicePdfAction(inv, "download")}
                                                            className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-500/10"
                                                        >
                                                            Download
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredInvoices.length === 0 && (
                                            <tr><td colSpan={7} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No invoices found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "scores":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Score Rankings</h2>
                            <div className={`flex rounded-xl overflow-hidden border ${isDark ? "border-[#1a3050] bg-[#0b1426]" : "border-gray-200 bg-gray-50"}`}>
                                {[{ k: "ai", l: "AI Scores" }, { k: "platform", l: "Platform" }, { k: "reader", l: "Reader" }].map((t) => (
                                    <button key={t.k} onClick={() => setScoreSubTab(t.k)}
                                        className={`px-4 py-2 text-sm font-bold transition-all ${scoreSubTab === t.k
                                            ? isDark ? "bg-blue-500/15 text-blue-400" : "bg-[#1e3a5f] text-white"
                                            : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                                            }`}>{t.l}</button>
                                ))}
                            </div>
                        </div>
                        <ScriptTable scripts={filteredScripts} isDark={isDark} showScore={true}
                            actions={(s) => (
                                <button onClick={() => setScoreModal(s)} className="text-xs font-bold text-purple-500 hover:text-purple-400 px-2.5 py-1 rounded-lg hover:bg-purple-500/10 transition-colors">Score</button>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "approvals":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Script Approvals
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredScripts.length : total})</span>
                            </h2>
                        </div>
                        <ScriptTable scripts={filteredScripts} isDark={isDark} showScore={false} showApprovalType={true} showPreviewWindow={true}
                            actions={(s) => (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleApprove(s._id)} className="text-xs font-bold text-emerald-500 hover:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">✓ Approve</button>
                                    <button onClick={() => handleReject(s._id)} className="text-xs font-bold text-red-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">✕ Reject</button>
                                    <button onClick={() => setScoreModal(s)} className="text-xs font-bold text-purple-500 hover:text-purple-400 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/10 transition-colors">Score</button>
                                    <a href={`/admin/scripts/${s._id}`} className="text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors">View</a>
                                    <button
                                        onClick={() => handleDeleteProject(s)}
                                        disabled={Boolean(s.isDeleted) || deletingScriptId === s._id}
                                        className="text-xs font-bold text-red-500 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                    >
                                        {s.isDeleted ? "Deleted" : deletingScriptId === s._id ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "trailers": {
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
            }

            case "ai-trailers":
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

            case "meetings":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Scheduled Meetings<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({meetings.length})</span></h2>
                        <div className="space-y-4">
                            {meetings.length === 0 ? (
                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No meetings found.</p>
                            ) : (
                                meetings.map((meeting) => (
                                    <div key={meeting._id} className={`p-4 rounded-xl border ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200"}`}>
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                                            <div>
                                                <h3 className={`font-semibold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>{meeting.title}</h3>
                                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} mt-1`}>
                                                    Producer: <span className="font-semibold">{meeting.producer_name}</span> | Writer: <span className="font-semibold">{meeting.writer_name}</span>
                                                </p>
                                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                    Script: <a href={`/admin/scripts/${meeting.script}`} className="text-blue-500 hover:underline">{meeting.script_name}</a>
                                                </p>
                                                <div className={`mt-2 flex gap-4 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                                    <span>📅 {new Date(meeting.scheduledDate).toLocaleDateString()}</span>
                                                    <span>⏰ {meeting.scheduledTime}</span>
                                                    <span>⏱️ {meeting.duration} min</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:items-end gap-2">
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider ${
                                                    meeting.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                                                    meeting.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {meeting.status}
                                                </span>
                                                {meeting.status === "accepted" && (
                                                    <a
                                                        href={meeting.meetingLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-1 text-xs font-bold text-[#D14D37] hover:underline"
                                                    >
                                                        Meeting Link
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );

            case "messages": {
                const selectedWriterId = String(activeMessageUser?._id || "");
                const selectedConversation = adminConversations.find((conv) => String(conv?.user?._id) === selectedWriterId);

                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Admin Messages
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                    ({hasSearch ? filteredMessageUsers.length : messageUsers.length})
                                </span>
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className={`lg:col-span-1 h-[240px] sm:h-[280px] lg:h-[calc(100vh-240px)] lg:min-h-[520px] lg:max-h-[760px] rounded-2xl border flex flex-col overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
                                    <p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Writers</p>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {messagesLoading && filteredMessageUsers.length === 0 ? (
                                        <p className={`px-4 py-5 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading conversations...</p>
                                    ) : filteredMessageUsers.length === 0 ? (
                                        <p className={`px-4 py-5 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No writers found.</p>
                                    ) : (
                                        filteredMessageUsers.map((writer) => {
                                            const isSelected = String(writer._id) === selectedWriterId;
                                            const conversation = writer.conversation;
                                            return (
                                                <button
                                                    key={writer._id}
                                                    onClick={() => openWriterConversation(writer)}
                                                    className={`w-full text-left px-4 py-3 border-b transition-colors ${isDark ? "border-[#1a3050]" : "border-gray-100"} ${isSelected ? (isDark ? "bg-blue-500/10" : "bg-blue-50") : (isDark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50")}`}
                                                >
                                                    <p className={`text-sm font-semibold ${isDark ? "text-gray-100" : "text-gray-800"}`}>{writer.name || "Unknown"}</p>
                                                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{writer.email || "No email"}</p>
                                                    {conversation?.lastMessage && (
                                                        <p className={`text-xs mt-1 truncate ${isDark ? "text-gray-500" : "text-gray-500"}`}>{conversation.lastMessage}</p>
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className={`relative lg:col-span-2 h-[62vh] sm:h-[66vh] lg:h-[calc(100vh-240px)] lg:min-h-[520px] lg:max-h-[760px] rounded-2xl border flex flex-col overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                {!activeMessageUser ? (
                                    <div className="flex-1 py-20 flex items-center justify-center px-6 text-center">
                                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Select a writer to start or continue a trailer discussion.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
                                            <p className={`text-sm font-bold ${isDark ? "text-gray-100" : "text-gray-800"}`}>{activeMessageUser.name || "Writer"}</p>
                                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                                {activeMessageUser.email || "No email"}
                                                {selectedConversation?.timestamp ? ` • Last active ${new Date(selectedConversation.timestamp).toLocaleString()}` : ""}
                                            </p>
                                        </div>

                                        <div
                                            ref={messageListContainerRef}
                                            onScroll={handleAdminMessageScroll}
                                            className="p-4 space-y-3 flex-1 min-h-0 overflow-y-auto"
                                        >
                                            {messagesLoading ? (
                                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading thread...</p>
                                            ) : messageList.length === 0 ? (
                                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No messages yet. Send the first message to start this conversation.</p>
                                            ) : (
                                                messageList.map((msg) => {
                                                    const isWriterMessage = String(msg?.sender?._id || "") === String(activeMessageUser._id || "");
                                                    return (
                                                        <div key={msg._id} className={`flex ${isWriterMessage ? "justify-start" : "justify-end"}`}>
                                                            <div className={`max-w-[80%] px-3 py-2 rounded-xl ${isWriterMessage ? (isDark ? "bg-[#132744] text-gray-100" : "bg-gray-100 text-gray-800") : (isDark ? "bg-blue-500/20 text-blue-100" : "bg-blue-50 text-blue-900")}`}>
                                                                {msg.fileUrl && msg.fileType === "image" ? (
                                                                    <div className="space-y-2">
                                                                        <img src={resolveMediaUrl(msg.fileUrl)} alt="attachment" className="max-w-full rounded-xl" />
                                                                        {msg.text ? <p className="text-sm whitespace-pre-wrap">{msg.text}</p> : null}
                                                                    </div>
                                                                ) : msg.fileUrl && msg.fileType === "video" ? (
                                                                    <div className="space-y-2">
                                                                        <video src={resolveMediaUrl(msg.fileUrl)} controls preload="metadata" className="w-full rounded-xl max-h-72" />
                                                                        <a href={resolveMediaUrl(msg.fileUrl)} target="_blank" rel="noreferrer" className={`text-xs underline ${isDark ? "text-blue-200" : "text-blue-700"}`}>Open video in new tab</a>
                                                                        {msg.text ? <p className="text-sm whitespace-pre-wrap">{msg.text}</p> : null}
                                                                    </div>
                                                                ) : msg.fileUrl ? (
                                                                    <div className="space-y-2">
                                                                        <div className={`rounded-lg px-2.5 py-2 ${isWriterMessage ? (isDark ? "bg-[#0b1426]" : "bg-white") : (isDark ? "bg-blue-900/25" : "bg-blue-100/60")}`}>
                                                                            <p className="text-xs font-semibold truncate">{msg.fileName || "Attachment"}</p>
                                                                            <p className={`text-[10px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{formatFileSize(msg.fileSize)}</p>
                                                                            <a href={resolveMediaUrl(msg.fileUrl)} target="_blank" rel="noreferrer" className={`inline-block mt-1 text-xs underline ${isDark ? "text-blue-200" : "text-blue-700"}`}>Open file</a>
                                                                        </div>
                                                                        {msg.text ? <p className="text-sm whitespace-pre-wrap">{msg.text}</p> : null}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm whitespace-pre-wrap">{msg.text || "(attachment)"}</p>
                                                                )}
                                                                <p className={`text-[11px] mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                            <div ref={messageListEndRef} />
                                        </div>

                                        {showAdminScrollToBottomButton && (
                                            <button
                                                type="button"
                                                onClick={() => scrollAdminMessagesToBottom("smooth")}
                                                aria-label="Scroll to latest message"
                                                title="Scroll to latest"
                                                className={`absolute right-4 bottom-[78px] z-20 w-10 h-10 rounded-full flex items-center justify-center shadow-md border ${isDark ? "bg-[#132744] border-[#1c2a3a] text-gray-200 hover:bg-[#1a3354]" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        )}

                                        <div className={`p-3 border-t ${isDark ? "border-[#1a3050]" : "border-gray-100"}`}>
                                            {messageAttachment && (
                                                <div className={`mb-2 rounded-xl border px-3 py-2 flex items-center justify-between ${isDark ? "border-[#1a3050] bg-[#132744]" : "border-gray-200 bg-gray-50"}`}>
                                                    <div>
                                                        <p className={`text-xs font-semibold ${isDark ? "text-gray-100" : "text-gray-800"}`}>{messageAttachment.fileName || "Attachment"}</p>
                                                        <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{messageAttachment.fileType || "file"} • {formatFileSize(messageAttachment.fileSize)}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setMessageAttachment(null);
                                                            if (messageFileInputRef.current) messageFileInputRef.current.value = "";
                                                        }}
                                                        className={`text-xs font-bold px-2 py-1 rounded-lg ${isDark ? "text-red-300 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            )}

                                            <input
                                                ref={messageFileInputRef}
                                                type="file"
                                                className="hidden"
                                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip"
                                                onChange={handleAdminAttachmentChange}
                                            />

                                            <div className={`rounded-2xl border p-2 flex items-center gap-2 ${isDark ? "bg-[#0b1628] border-[#1a3050]" : "bg-gray-50 border-gray-200"}`}>
                                                <button
                                                    type="button"
                                                    onClick={handlePickMessageAttachment}
                                                    disabled={uploadingMessageAttachment || !activeMessageUser}
                                                    className={`w-12 h-12 shrink-0 rounded-full inline-flex items-center justify-center transition-colors ${uploadingMessageAttachment || !activeMessageUser ? (isDark ? "bg-[#122540] text-gray-500" : "bg-gray-200 text-gray-400") : (isDark ? "bg-[#10233f] text-gray-200 hover:bg-[#153156]" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100")}`}
                                                    title={uploadingMessageAttachment ? "Uploading..." : "Attach file"}
                                                >
                                                    {uploadingMessageAttachment ? (
                                                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v4m0 8v4m8-8h-4M8 12H4m12.364-5.657l-2.828 2.828M10.464 13.536l-2.828 2.828m0-9.9l2.828 2.828m5.072 5.072l2.828 2.828" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a5.5 5.5 0 01-7.78-7.78l9.19-9.19a3.5 3.5 0 114.95 4.95l-9.19 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.49" />
                                                        </svg>
                                                    )}
                                                </button>

                                                <textarea
                                                    rows={1}
                                                    value={messageText}
                                                    onChange={(e) => setMessageText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSendAdminMessage();
                                                        }
                                                    }}
                                                    placeholder="Reply with text or attach file..."
                                                    className={`flex-1 resize-none h-12 rounded-xl px-4 py-3 text-base border focus:outline-none focus:ring-2 ${isDark ? "bg-[#061327] border-[#204777] text-gray-100 placeholder:text-[#5c7190] focus:ring-blue-500/30" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 focus:ring-blue-200"}`}
                                                />
                                                <button
                                                    onClick={handleSendAdminMessage}
                                                    disabled={uploadingMessageAttachment || (!messageText.trim() && !messageAttachment)}
                                                    className={`w-12 h-12 shrink-0 rounded-full inline-flex items-center justify-center transition-colors ${(!uploadingMessageAttachment && (messageText.trim() || messageAttachment)) ? (isDark ? "bg-[#10233f] text-blue-200 hover:bg-[#153156]" : "bg-blue-600 text-white hover:bg-blue-700") : (isDark ? "bg-[#122540] text-gray-500" : "bg-gray-200 text-gray-400")}`}
                                                    title="Send message"
                                                >
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L15 22 11 13 2 9 22 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            }

            case "membership-reviews":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                SWA/WGA Reviews
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredMembershipReviews.length : total})</span>
                            </h2>
                        </div>

                        {filteredMembershipReviews.length === 0 ? (
                            <div className={`rounded-2xl border p-12 text-center ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                                    <svg className={`w-6 h-6 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className={`text-sm font-semibold ${isDark ? "text-gray-400" : "text-gray-600"}`}>No pending SWA/WGA reviews</p>
                            </div>
                        ) : (
                            <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                                {[
                                                    "Writer",
                                                    "Pending SWA/WGA",
                                                    "Submitted",
                                                    "Proof",
                                                    "Actions",
                                                ].map((h) => (
                                                    <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                            {filteredMembershipReviews.map((review) => {
                                                const pendingRows = Array.isArray(review.pendingMemberships)
                                                    ? review.pendingMemberships.filter((item) => String(item.status || "").toLowerCase() === "pending")
                                                    : [];

                                                return (
                                                    <tr key={review._id} className={`align-top transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                {review.profileImage ? (
                                                                    <img src={review.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                                                                        {review.name?.charAt(0)?.toUpperCase() || "?"}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{review.name || "-"}</p>
                                                                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{review.email || "-"}</p>
                                                                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>SID: {review.sid || "-"}</p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-3.5">
                                                            <div className="flex flex-wrap gap-2">
                                                                {pendingRows.map((item) => (
                                                                    <span key={`${review._id}-${item.type}`} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
                                                                        {item.label}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-3.5">
                                                            {pendingRows.length > 0 ? (
                                                                <div className="flex flex-col gap-1">
                                                                    {pendingRows.map((item) => (
                                                                        <p key={`${review._id}-${item.type}-submitted`} className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                                            {item.label}: {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "-"}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>-</p>
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-3.5">
                                                            <div className="flex flex-col gap-1">
                                                                {pendingRows.map((item) => (
                                                                    item.proofUrl ? (
                                                                        <a
                                                                            key={`${review._id}-${item.type}-proof`}
                                                                            href={item.proofUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={(event) => handleOpenMembershipProof(event, review._id, item.type, item.proofUrl)}
                                                                            className="text-xs font-bold text-blue-500 hover:text-blue-400"
                                                                        >
                                                                            {item.label} proof
                                                                        </a>
                                                                    ) : (
                                                                        <span key={`${review._id}-${item.type}-no-proof`} className={`text-xs ${isDark ? "text-red-300" : "text-red-600"}`}>
                                                                            {item.label}: no proof
                                                                        </span>
                                                                    )
                                                                ))}
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-3.5">
                                                            <div className="flex flex-col gap-2">
                                                                {pendingRows.map((item) => {
                                                                    const approveLoading = userActionLoading === `membership-approve-${item.type}-${review._id}`;
                                                                    const rejectLoading = userActionLoading === `membership-reject-${item.type}-${review._id}`;

                                                                    return (
                                                                        <div key={`${review._id}-${item.type}-actions`} className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={() => handleReviewWriterMembership(review._id, item.type, "approve")}
                                                                                disabled={approveLoading || rejectLoading}
                                                                                className="px-2.5 py-1.5 rounded-md text-xs font-bold text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                {approveLoading ? "Approving..." : `Approve ${item.label}`}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleReviewWriterMembership(review._id, item.type, "reject")}
                                                                                disabled={approveLoading || rejectLoading}
                                                                                className="px-2.5 py-1.5 rounded-md text-xs font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                {rejectLoading ? "Rejecting..." : `Reject ${item.label}`}
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "bank-reviews":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>
                            Bank Detail Reviews
                            <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredBankReviews.length : total})</span>
                        </h2>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {["Writer", "Requested Details", "Active Details", "Security", "Submitted", "Due", "Actions"].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {filteredBankReviews.map((review) => (
                                            <tr key={review._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className="px-5 py-3.5">
                                                    <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{review.name || "-"}</p>
                                                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{review.email || "-"}</p>
                                                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>SID: {review.sid || "-"}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className={`text-xs leading-5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Holder:</span> {review.requestedDetails?.accountHolderName || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Bank:</span> {review.requestedDetails?.bankName || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Account #:</span> {review.requestedDetails?.accountNumber || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Routing:</span> {review.requestedDetails?.routingNumber || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Type:</span> {review.requestedDetails?.accountType || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Country/Currency:</span> {review.requestedDetails?.country || "-"} / {review.requestedDetails?.currency || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>SWIFT:</span> {review.requestedDetails?.swiftCode || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>IBAN:</span> {review.requestedDetails?.iban || "-"}</p>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {review.activeDetails ? (
                                                        <div className={`text-xs leading-5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Holder:</span> {review.activeDetails?.accountHolderName || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Bank:</span> {review.activeDetails?.bankName || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Account #:</span> {review.activeDetails?.accountNumber || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Routing:</span> {review.activeDetails?.routingNumber || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Type:</span> {review.activeDetails?.accountType || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Country/Currency:</span> {review.activeDetails?.country || "-"} / {review.activeDetails?.currency || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>SWIFT:</span> {review.activeDetails?.swiftCode || "-"}</p>
                                                            <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>IBAN:</span> {review.activeDetails?.iban || "-"}</p>
                                                        </div>
                                                    ) : (
                                                        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>No active bank details yet</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className={`text-xs leading-5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Attempts:</span> {Number(review.bankSecurity?.invalidAttempts || 0)} / 5</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Locked:</span> {review.bankSecurity?.isLocked ? "Yes" : "No"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Last invalid:</span> {review.bankSecurity?.lastInvalidAttemptAt ? new Date(review.bankSecurity.lastInvalidAttemptAt).toLocaleString() : "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Reason:</span> {review.bankSecurity?.lastInvalidReason || "-"}</p>
                                                        <p><span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Review status:</span> {review.status || "-"}</p>
                                                    </div>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{review.submittedAt ? new Date(review.submittedAt).toLocaleString() : "-"}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{review.dueAt ? new Date(review.dueAt).toLocaleString() : "-"}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        {review.status === "pending" && (
                                                            <>
                                                                <button onClick={() => handleApproveBankReview(review._id)} className="text-xs font-bold text-emerald-500 hover:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">✓ Approve</button>
                                                                <button onClick={() => handleRejectBankReview(review._id)} className="text-xs font-bold text-red-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">✕ Reject</button>
                                                            </>
                                                        )}
                                                        {review.bankSecurity?.isLocked && (
                                                            <button onClick={() => handleUnblockBankReview(review._id)} className="text-xs font-bold text-amber-500 hover:text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors">Unblock User</button>
                                                        )}
                                                    </div>
                                                    {review.adminNote ? (
                                                        <p className={`text-xs mt-2 max-w-[200px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>Note: {review.adminNote}</p>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredBankReviews.length === 0 && (
                                            <tr><td colSpan={7} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No bank detail reviews found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            // The whole competitions panel lives in its own file to keep this switch readable.
            case "competitions":
                return <AdminCompetitions isDark={isDark} />;

            case "referrals":
                return <AdminReferrals isDark={isDark} />;

            case "queries":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>
                            Contact Queries
                            <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredContacts.length : total})</span>
                        </h2>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {["Name", "Email", "Reason", "Message", "Date"].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {filteredContacts.map((c) => (
                                            <tr key={c._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className={`px-5 py-3.5 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{c.name}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{c.email}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                        c.reason === "doubt" ? "bg-blue-100 text-blue-700" :
                                                        c.reason === "team" ? "bg-purple-100 text-purple-700" :
                                                        c.reason === "general" ? "bg-gray-100 text-gray-600" :
                                                        "bg-amber-100 text-amber-700"
                                                    }`}>
                                                        {c.reason === "doubt" ? "Question" : c.reason === "team" ? "Join Team" : c.reason === "general" ? "Feedback" : "Email"}
                                                    </span>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm max-w-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                    <p className="line-clamp-2">{c.message}</p>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>{new Date(c.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                        {filteredContacts.length === 0 && (
                                            <tr><td colSpan={5} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No queries yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "deleted-film-professionals":
            case "deleted-writers":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>
                            {activeTab === "deleted-film-professionals" ? "Deleted Film Professionals" : "Deleted Writers"}
                            <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                ({activeTab === "deleted-film-professionals" ? filteredDeletedFilmProfessionals.length : filteredDeletedWriters.length})
                            </span>
                        </h2>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {["User", "SID", "Role", "Reason", "Source", "Requested", "Deleted", "Actions"].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {(activeTab === "deleted-film-professionals" ? filteredDeletedFilmProfessionals : filteredDeletedWriters).map((item) => (
                                            <tr key={item._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className="px-5 py-3.5">
                                                    <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{item.name || "-"}</p>
                                                    <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{item.email || "-"}</p>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{item.sid || "-"}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isDark ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-700"}`}>{item.role || "-"}</span>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm max-w-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                    <p className="line-clamp-2">{item.reason || "No reason provided"}</p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.source === "admin" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                                        {item.source === "admin" ? "Admin" : "User"}
                                                    </span>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{item.requestedAt ? new Date(item.requestedAt).toLocaleString() : "-"}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{item.deactivatedAt ? new Date(item.deactivatedAt).toLocaleString() : "-"}</td>
                                                <td className="px-5 py-3.5">
                                                    <button
                                                        onClick={() => setSelectedUserDetail(item.profileSnapshot || {
                                                            _id: item._id,
                                                            sid: item.sid,
                                                            role: item.role,
                                                            name: item.name,
                                                            email: item.email,
                                                            isDeactivated: true,
                                                            deactivatedAt: item.deactivatedAt,
                                                            accountDeletion: {
                                                                reason: item.reason,
                                                                source: item.source,
                                                                requestedAt: item.requestedAt,
                                                                originalName: item.name,
                                                                originalEmail: item.email,
                                                            },
                                                        })}
                                                        className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-500/10"
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(activeTab === "deleted-film-professionals" ? filteredDeletedFilmProfessionals.length : filteredDeletedWriters.length) === 0 && (
                                            <tr><td colSpan={8} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No deleted accounts found in this section</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "analytics":
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

            case "discount-codes":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Discount Codes
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span>
                            </h2>
                            <button
                                onClick={() => setDiscountCodeModal({})}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all"
                            >+ Create Code</button>
                        </div>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {["Code", "Type", "Value", "Used / Max", "Min Purchase", "Valid Until", "Status", "Actions"].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {discountCodes.map((dc) => (
                                            <tr key={dc._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className={`px-5 py-3.5 text-sm font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>{dc.code}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${dc.discountType === "percentage" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}`}>
                                                        {dc.discountType === "percentage" ? "%" : "₹"}
                                                    </span>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                                                    {dc.discountType === "percentage" ? `${dc.discountValue}%` : `₹${dc.discountValue}`}
                                                    {dc.maxDiscountAmount > 0 && dc.discountType === "percentage" && <span className={`text-xs ml-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>(max ₹{dc.maxDiscountAmount})</span>}
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{dc.usedCount} / {dc.maxUses || "∞"}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{dc.minPurchaseAmount > 0 ? `₹${dc.minPurchaseAmount}` : "—"}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>{new Date(dc.validUntil).toLocaleDateString()}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${dc.isActive && new Date(dc.validUntil) > new Date() ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                                        {dc.isActive && new Date(dc.validUntil) > new Date() ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setDiscountCodeModal(dc)} className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-500/10">Edit</button>
                                                        {dc.isActive && <button onClick={() => handleDeleteDiscountCode(dc._id)} className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">Deactivate</button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {discountCodes.length === 0 && (
                                            <tr><td colSpan={8} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No discount codes yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                        {discountCodeModal !== null && <DiscountCodeFormModal initial={discountCodeModal} onClose={() => setDiscountCodeModal(null)} onSave={handleSaveDiscountCode} isDark={isDark} />}
                    </div>
                );

            default:
                return null;
        }
    };


    const UserDetailsModal = ({ user, onClose }) => {
        const [openingAttachmentKey, setOpeningAttachmentKey] = useState("");
        const normalizedRole = String(user?.role || "").toLowerCase();
        const isWriterRole = ["writer", "creator"].includes(normalizedRole);
        const isInvestorRole = ["investor", "producer", "director", "industry", "professional"].includes(normalizedRole);
        const isReaderRole = normalizedRole === "reader";
        const writerLinks = user?.writerProfile?.links || {};
        const investorSocialLinks = user?.industryProfile?.socialLinks || {};
        const investorDemographics = user?.industryProfile?.demographics || {};
        const membershipVerification = user?.writerProfile?.membershipVerification || {};
        const wgaVerification = membershipVerification?.wga || {};
        const swaVerification = membershipVerification?.swa || {};
        const mandates = user?.industryProfile?.mandates || {};
        const notableCreditAttachments = Array.isArray(user?.industryProfile?.notableCreditAttachments)
            ? user.industryProfile.notableCreditAttachments
            : [];
        const addressLine = getUserAddressLine(user);

        const isUserDeleted = Boolean(user?.isDeactivated);
        const isUserFrozen = Boolean(user?.isFrozen);
        const freezeLoading = userActionLoading === `freeze-${user?._id}`;
        const unfreezeLoading = userActionLoading === `unfreeze-${user?._id}`;

        const deleteLoading = userActionLoading === `delete-${user?._id}`;
        const wgaApproveLoading = userActionLoading === `membership-approve-wga-${user?._id}`;
        const wgaRejectLoading = userActionLoading === `membership-reject-wga-${user?._id}`;
        const swaApproveLoading = userActionLoading === `membership-approve-swa-${user?._id}`;
        const swaRejectLoading = userActionLoading === `membership-reject-swa-${user?._id}`;

        const handleOpenAdminAttachment = async (event, file) => {
            event.preventDefault();

            const fallbackUrl = String(file?.url || "");
            const fileKey = String(file?.publicId || fallbackUrl || "");
            if (!fallbackUrl) return;

            const mimeType = String(file?.mimeType || "").toLowerCase();
            if (mimeType !== "application/pdf") {
                window.open(fallbackUrl, "_blank", "noopener,noreferrer");
                return;
            }

            setOpeningAttachmentKey(fileKey);
            try {
                const response = await adminApi.get(`/admin/users/${user?._id}/industry-credit-attachments/file`, {
                    params: {
                        publicId: file?.publicId,
                        url: file?.url,
                    },
                    responseType: "blob",
                });

                const blob = response?.data instanceof Blob
                    ? response.data
                    : new Blob([response?.data], { type: "application/pdf" });
                const objectUrl = URL.createObjectURL(blob);
                window.open(objectUrl, "_blank", "noopener,noreferrer");
                setTimeout(() => URL.revokeObjectURL(objectUrl), 60 * 1000);
            } catch {
                window.open(fallbackUrl, "_blank", "noopener,noreferrer");
            } finally {
                setOpeningAttachmentKey("");
            }
        };

        const detailRows = [
            { label: "Name", value: user?.name },
            { label: "Email", value: user?.email },
            { label: "Phone", value: user?.phone },
            { label: "Role", value: user?.role },
            { label: "SID", value: user?.sid },
            { label: "Account Status", value: isUserDeleted ? "Deleted" : isUserFrozen ? "Frozen" : "Active" },
            { label: "Frozen Reason", value: user?.frozenReason },
            { label: "Date of Birth", value: user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "" },
            { label: "Address", value: addressLine || user?.address?.formatted },
            { label: "Bio", value: user?.bio },
            { label: "Approval Status", value: user?.approvalStatus },
            { label: "Approval Note", value: user?.approvalNote },
            { label: "Email Verified", value: user?.emailVerified === true ? "Yes" : user?.emailVerified === false ? "No" : "" },
            { label: "Joined", value: user?.createdAt ? new Date(user.createdAt).toLocaleString() : "" },
        ];

        const writerRows = [
            { label: "Legal Name", value: user?.writerProfile?.legalName },
            { label: "Username", value: user?.writerProfile?.username },
            { label: "WGA Member", value: user?.writerProfile?.wgaMember === true ? "Yes" : user?.writerProfile?.wgaMember === false ? "No" : "" },
            { label: "SWA Member", value: user?.writerProfile?.sgaMember === true ? "Yes" : user?.writerProfile?.sgaMember === false ? "No" : "" },
            { label: "Plan", value: user?.writerProfile?.plan },
            { label: "Representation", value: user?.writerProfile?.representationStatus },
            { label: "Agency", value: user?.writerProfile?.agencyName },
            { label: "Primary Genres", value: Array.isArray(user?.writerProfile?.genres) ? user.writerProfile.genres.join(", ") : "" },
            { label: "Specialized Tags", value: Array.isArray(user?.writerProfile?.specializedTags) ? user.writerProfile.specializedTags.join(", ") : "" },
            { label: "Demographic Privacy", value: user?.writerProfile?.demographicPrivacy },
            { label: "Gender", value: user?.writerProfile?.diversity?.gender },
            { label: "Nationality", value: user?.writerProfile?.diversity?.nationality },
            { label: "Ethnicity", value: user?.writerProfile?.diversity?.ethnicity },
            { label: "LGBTQ+", value: user?.writerProfile?.diversity?.lgbtqStatus },
            { label: "Disability", value: user?.writerProfile?.diversity?.disabilityStatus },
            { label: "Portfolio", value: writerLinks?.portfolio },
            { label: "Instagram", value: writerLinks?.instagram },
            { label: "Twitter", value: writerLinks?.twitter },
            { label: "LinkedIn", value: writerLinks?.linkedin },
            { label: "IMDb", value: writerLinks?.imdb },
            { label: "Facebook", value: writerLinks?.facebook },
            { label: "Accomplishments", value: Array.isArray(user?.writerProfile?.accomplishments) ? user.writerProfile.accomplishments.join(", ") : "" },
        ];

        const investorRows = [
            { label: "Sub Role", value: formatIndustrySubRole(user?.industryProfile?.subRole, user?.industryProfile?.subRoleOther) },
            { label: "Company", value: user?.industryProfile?.company },
            { label: "Job Title", value: user?.industryProfile?.jobTitle },
            { label: "Gender", value: investorDemographics?.gender },
            { label: "Nationality", value: investorDemographics?.nationality },
            { label: "Verified", value: user?.industryProfile?.isVerified === true ? "Yes" : user?.industryProfile?.isVerified === false ? "No" : "" },
            { label: "Investment Range", value: user?.industryProfile?.investmentRange },
            { label: "Previous Credits", value: sanitizePreviousCreditsDisplay(user?.industryProfile?.previousCredits) },
            { label: "LinkedIn", value: user?.industryProfile?.linkedInUrl },
            { label: "IMDb", value: user?.industryProfile?.imdbUrl },
            { label: "Portfolio / Other URL", value: user?.industryProfile?.otherUrl },
            { label: "Instagram", value: investorSocialLinks?.instagram },
            { label: "Twitter", value: investorSocialLinks?.twitter },
            { label: "Facebook", value: investorSocialLinks?.facebook },
            { label: "YouTube", value: investorSocialLinks?.youtube },
            { label: "Website", value: investorSocialLinks?.website },
            { label: "Mandates Formats", value: Array.isArray(mandates?.formats) ? mandates.formats.join(", ") : "" },
            { label: "Mandates Genres", value: Array.isArray(mandates?.genres) ? mandates.genres.join(", ") : "" },
            { label: "Mandates Exclude Genres", value: Array.isArray(mandates?.excludeGenres) ? mandates.excludeGenres.join(", ") : "" },
            { label: "Mandates Hooks", value: Array.isArray(mandates?.specificHooks) ? mandates.specificHooks.join(", ") : "" },
        ];

        const budgetRange = user?.preferences?.budgetRange;
        const readerRows = [
            { label: "Preferred Genres", value: Array.isArray(user?.preferences?.genres) ? user.preferences.genres.join(", ") : "" },
            { label: "Preferred Content Types", value: Array.isArray(user?.preferences?.contentTypes) ? user.preferences.contentTypes.join(", ") : "" },
            {
                label: "Budget Preference",
                value:
                    budgetRange && (budgetRange.min != null || budgetRange.max != null)
                        ? `${budgetRange.min ?? 0} - ${budgetRange.max ?? 0}`
                        : "",
            },
            {
                label: "Favorite Scripts",
                value: Array.isArray(user?.favoriteScripts) ? String(user.favoriteScripts.length) : "",
            },
            {
                label: "Scripts Read",
                value: Array.isArray(user?.scriptsRead) ? String(user.scriptsRead.length) : "",
            },
        ];

        const displayRowValue = (value) => {
            if (value === 0 || value === false) return String(value);
            const text = String(value ?? "").trim();
            return text || "-";
        };

        const sectionClass = `rounded-xl border p-4 ${isDark ? "border-[#1a3050] bg-[#0b1426]" : "border-gray-200 bg-gray-50"}`;

        return (
            <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
                <div className={`w-full max-w-3xl mx-4 rounded-2xl border max-h-[88vh] overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200"}`} onClick={(e) => e.stopPropagation()}>
                    <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? "border-[#1a3050]" : "border-gray-200"}`}>
                        <div>
                            <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>User Full Profile</h3>
                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Writer / Investor complete details for admin review</p>
                        </div>
                        <button onClick={onClose} className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${isDark ? "text-gray-300 hover:bg-white/[0.08]" : "text-gray-600 hover:bg-gray-100"}`}>Close</button>
                    </div>

                    <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(88vh-74px)]">
                        <div className={sectionClass}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Admin Actions</p>
                            <div className="flex flex-wrap items-center gap-2">
                                {isWriterRole && !isUserDeleted && (
                                    <>
                                        <button
                                            onClick={() => handleGrantWriterPlan(user, "gold")}
                                            disabled={userActionLoading === `grant-writer-plan-${user._id}`}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#d4af37] hover:text-[#aa801a] hover:bg-[#d4af37]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {userActionLoading === `grant-writer-plan-${user._id}` ? "Granting..." : "Grant Gold Plan"}
                                        </button>
                                        <button
                                            onClick={() => handleGrantWriterPlan(user, "silver")}
                                            disabled={userActionLoading === `grant-writer-plan-${user._id}`}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-gray-300 hover:bg-gray-400/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {userActionLoading === `grant-writer-plan-${user._id}` ? "Granting..." : "Grant Silver Plan"}
                                        </button>
                                    </>
                                )}
                                {["film_industry_professional", "investor", "director", "producer"].includes(user.role) && !isUserDeleted && (
                                    <button
                                        onClick={() => handleGrantFipPlan(user)}
                                        disabled={userActionLoading === `grant-fip-plan-${user._id}`}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#0e7490] hover:text-[#155e75] hover:bg-[#0e7490]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {userActionLoading === `grant-fip-plan-${user._id}` ? "Granting..." : "Grant 1-Year FIP Plan"}
                                    </button>
                                )}
                                {!isUserFrozen && !isUserDeleted && (
                                    <button
                                        onClick={() => handleFreezeToggleUser(user, true)}
                                        disabled={freezeLoading}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                                    >
                                        {freezeLoading ? "Freezing..." : "Freeze Account"}
                                    </button>
                                )}
                                {isUserFrozen && !isUserDeleted && (
                                    <button
                                        onClick={() => handleFreezeToggleUser(user, false)}
                                        disabled={unfreezeLoading}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                                    >
                                        {unfreezeLoading ? "Unfreezing..." : "Unfreeze Account"}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDeleteUserAccount(user)}
                                    disabled={isUserDeleted || deleteLoading}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                                >
                                    {isUserDeleted ? "Deleted" : deleteLoading ? "Deleting..." : "Delete Account"}
                                </button>
                                <button
                                    onClick={() => handleLoginAs(user?._id)}
                                    disabled={isUserDeleted || isUserFrozen}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                                >
                                    Login As User
                                </button>
                            </div>
                        </div>

                        <div className={sectionClass}>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Basic Info</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {detailRows.map((row) => (
                                    <div key={row.label}>
                                        <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-500"}`}>{row.label}</p>
                                        <p className={`text-sm mt-0.5 break-words ${isDark ? "text-gray-200" : "text-gray-800"}`}>{displayRowValue(row.value)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {isWriterRole && (
                            <div className={sectionClass}>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Writer Profile</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {writerRows.map((row) => (
                                        <div key={row.label}>
                                            <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-500"}`}>{row.label}</p>
                                            <p className={`text-sm mt-0.5 break-words ${isDark ? "text-gray-200" : "text-gray-800"}`}>{displayRowValue(row.value)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(wgaVerification?.requested || swaVerification?.requested) && (
                            <div className={sectionClass}>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Membership Verification Review</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        { key: "wga", label: "WGA", verification: wgaVerification, approveLoading: wgaApproveLoading, rejectLoading: wgaRejectLoading },
                                        { key: "swa", label: "SWA", verification: swaVerification, approveLoading: swaApproveLoading, rejectLoading: swaRejectLoading },
                                    ]
                                        .filter((item) => item.verification?.requested)
                                        .map((item) => {
                                            const status = String(item.verification?.status || "not_submitted");
                                            const submittedAt = item.verification?.submittedAt
                                                ? new Date(item.verification.submittedAt).toLocaleString()
                                                : "-";
                                            const reviewedAt = item.verification?.reviewedAt
                                                ? new Date(item.verification.reviewedAt).toLocaleString()
                                                : "-";
                                            const isPending = status === "pending";

                                            return (
                                                <div key={item.key} className={`rounded-lg border p-3 ${isDark ? "border-[#1a3050] bg-[#091121]" : "border-gray-200 bg-white"}`}>
                                                    <p className={`text-sm font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{item.label} Membership</p>
                                                    <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Status: <span className="font-semibold">{status}</span></p>
                                                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Submitted: {submittedAt}</p>
                                                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Reviewed: {reviewedAt}</p>

                                                    {item.verification?.adminNote && (
                                                        <p className={`text-xs mt-2 ${isDark ? "text-amber-300" : "text-amber-700"}`}>Admin note: {item.verification.adminNote}</p>
                                                    )}

                                                    {item.verification?.proofUrl ? (
                                                        <a
                                                            href={item.verification.proofUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex mt-2 text-xs font-bold text-blue-500 hover:text-blue-400"
                                                        >
                                                            View uploaded proof
                                                        </a>
                                                    ) : (
                                                        <p className={`text-xs mt-2 ${isDark ? "text-red-300" : "text-red-600"}`}>No proof uploaded</p>
                                                    )}

                                                    {isPending && (
                                                        <div className="flex items-center gap-2 mt-3">
                                                            <button
                                                                onClick={() => handleReviewWriterMembership(user._id, item.key, "approve")}
                                                                disabled={item.approveLoading || item.rejectLoading}
                                                                className="px-2.5 py-1.5 rounded-md text-xs font-bold text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {item.approveLoading ? "Approving..." : "Approve"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleReviewWriterMembership(user._id, item.key, "reject")}
                                                                disabled={item.approveLoading || item.rejectLoading}
                                                                className="px-2.5 py-1.5 rounded-md text-xs font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {item.rejectLoading ? "Rejecting..." : "Reject"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {isReaderRole && (
                            <div className={sectionClass}>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Reader Profile</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {readerRows.map((row) => (
                                        <div key={row.label}>
                                            <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-500"}`}>{row.label}</p>
                                            <p className={`text-sm mt-0.5 break-words ${isDark ? "text-gray-200" : "text-gray-800"}`}>{displayRowValue(row.value)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isInvestorRole && (
                            <div className={sectionClass}>
                                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Investor / Industry Profile</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {investorRows.map((row) => (
                                        <div key={row.label}>
                                            <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-500"}`}>{row.label}</p>
                                            <p className={`text-sm mt-0.5 break-words ${isDark ? "text-gray-200" : "text-gray-800"}`}>{displayRowValue(row.value)}</p>
                                        </div>
                                    ))}
                                </div>

                                {notableCreditAttachments.length > 0 && (
                                    <div className={`mt-4 pt-3 border-t ${isDark ? "border-[#1a3050]" : "border-gray-200"}`}>
                                        <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                            Notable Credit Attachments ({notableCreditAttachments.length})
                                        </p>
                                        <div className="space-y-1.5">
                                            {notableCreditAttachments.map((file, index) => (
                                                <a
                                                    key={`${file?.publicId || file?.url || "credit-file"}-${index}`}
                                                    href={file?.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(event) => handleOpenAdminAttachment(event, file)}
                                                    className={`block text-sm break-all underline underline-offset-2 ${isDark ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-700"}`}
                                                >
                                                    {openingAttachmentKey === String(file?.publicId || file?.url || "")
                                                        ? "Opening..."
                                                        : (file?.fileName || `Attachment ${index + 1}`)}
                                                    {file?.mimeType ? ` (${file.mimeType})` : ""}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };


    return (
        <>
        <div className="fixed inset-0 z-[9999] flex flex-col bg-[#060e1a] text-white overflow-hidden">
            {/* ─── Admin Header ─── */}
            <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-[#1a3050] bg-[#0b1628]">
                <div className="flex items-center gap-3">
                    <BrandLogo className="h-9 w-auto" />
                    <div>
                        <h1 className="text-sm font-extrabold tracking-tight text-white">Ckript Admin</h1>
                        <p className="text-[10px] text-gray-500 font-medium -mt-0.5">Management Console</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:block w-72">
                        <SearchBar
                            value={searchInput}
                            onChange={setSearchInput}
                            placeholder={SEARCH_PLACEHOLDER_BY_TAB[activeTab] || "Search current section..."}
                            isDark={true}
                        />
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden sm:block">Admin Mode</span>
                    <DownloadIconButton
                        onClick={handleDownloadWholeDashboardPdf}
                        disabled={exportingAll}
                        title={exportingAll ? "Preparing full dashboard PDF..." : "Download Complete Dashboard PDF"}
                        className="text-gray-400 hover:text-blue-300 hover:bg-blue-500/10 border-[#1a3050]"
                    />
                    <div className="w-px h-5 bg-[#1a3050] hidden sm:block"></div>
                    <button onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        Exit Admin
                    </button>
                </div>
            </header>

            {/* ─── Body ─── */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-[#1a3050] bg-[#0b1628] overflow-y-auto">
                    <div className="px-3 pt-4 pb-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 px-2">Navigation</p>
                    </div>
                    <nav className="flex-1 px-2 pb-4 space-y-0.5">
                        <a
                            href="/admin/agreements"
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-gray-400 hover:bg-[#132744] hover:text-gray-200 transition-all"
                        >
                            <Icon d="M9 12.75L11.25 15 15 9.75m-6-7.5A2.25 2.25 0 0111.25 3h1.5A2.25 2.25 0 0115 5.25v1.5A2.25 2.25 0 0113.5 9h-3A2.25 2.25 0 019 6.75v-1.5zM4.5 10.5h15m-15 4.5h15m-15 4.5h9" className="w-4 h-4" />
                            <span className="flex-1 text-left">Agreements</span>
                        </a>
                        {TABS.map((tab) => (
                            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${activeTab === tab.key
                                    ? "bg-blue-500/15 text-blue-400"
                                    : "text-gray-400 hover:bg-[#132744] hover:text-gray-200"
                                    }`}>
                                <Icon d={tab.icon} className="w-4 h-4" />
                                <span className="flex-1 text-left">{tab.label}</span>
                                {getBadgeCountForTab(tab.key) > 0 && (
                                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === tab.key ? "bg-blue-400/20 text-blue-300" : "bg-white/10 text-gray-200"}`}>
                                        {formatBadgeCount(getBadgeCountForTab(tab.key))}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Mobile tab bar */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#1a3050] bg-[#0b1628]/95 backdrop-blur-md">
                    <div className="flex overflow-x-auto gap-1 p-1.5">
                        <a
                            href="/admin/agreements"
                            className="whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold text-gray-500"
                        >
                            Agreements
                        </a>
                        {TABS.map((tab) => (
                            <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                                className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.key
                                    ? "bg-blue-500/15 text-blue-400"
                                    : "text-gray-500"
                                    }`}>{tab.label}{getBadgeCountForTab(tab.key) > 0 ? ` ${formatBadgeCount(getBadgeCountForTab(tab.key))}` : ""}</button>
                        ))}
                    </div>
                </div>

                {/* Main content */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="flex items-center justify-end mb-4">
                        <DownloadIconButton
                            onClick={handleDownloadCurrentSectionPdf}
                            disabled={loading || exportingCurrent}
                            title={exportingCurrent ? "Preparing section PDF..." : "Download This Section PDF"}
                            className={`${isDark ? "text-gray-300 hover:text-blue-300 hover:bg-blue-500/10 border-[#1a3050]" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50 border-gray-300"}`}
                        />
                    </div>
                    {renderContent()}
                </main>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] animate-[slideUp_0.3s_ease-out]">
                    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-sm ${toast.type === "error"
                        ? "bg-red-500/90 border-red-400/30 text-white"
                        : toast.type === "info"
                            ? "bg-blue-500/90 border-blue-400/30 text-white"
                        : "bg-emerald-500/90 border-emerald-400/30 text-white"
                        }`}>
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d={
                                toast.type === "error"
                                    ? "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                                    : toast.type === "info"
                                        ? "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    : "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            } />
                        </svg>
                        <span className="text-sm font-semibold">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Score Modal */}
            {scoreModal && <ScoreModal script={scoreModal} isDark={true} onClose={() => setScoreModal(null)} onSave={handleScore} />}

            {/* Reject Investor Modal */}
            {rejectModal && <RejectInvestorModal investor={rejectModal} onClose={() => setRejectModal(null)} onConfirm={handleRejectInvestor} isDark={isDark} />}

            {/* User Details Modal */}
            {selectedUserDetail && <UserDetailsModal user={selectedUserDetail} onClose={() => setSelectedUserDetail(null)} />}

        </div>

        <ConfirmDialog
            open={showLogoutConfirm}
            title="Exit admin mode"
            message="Are you sure you want to log out from admin mode?"
            confirmText="Exit"
            cancelText="Cancel"
            onConfirm={confirmLogout}
            onCancel={() => setShowLogoutConfirm(false)}
            isDarkMode={true}
        />

        {adminDialog && (
            <div className="fixed inset-0 z-[10060] flex items-center justify-center px-4" onClick={() => closeAdminDialog(null)}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div
                    className="relative w-[min(94vw,460px)] rounded-2xl border border-[#1a3050] bg-[#0f1d35] p-5 text-white shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <p className="text-base font-bold">{adminDialog.title}</p>
                    <p className="mt-1.5 text-sm text-gray-300 leading-relaxed">{adminDialog.message}</p>

                    {adminDialog.type === "prompt" && (
                        adminDialog.multiline ? (
                            <textarea
                                autoFocus
                                value={adminDialog.value}
                                onChange={(event) => setAdminDialog((prev) => ({ ...prev, value: event.target.value }))}
                                rows={4}
                                placeholder={adminDialog.placeholder}
                                className="mt-3 w-full rounded-xl border border-[#294468] bg-[#0b1426] px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none focus:border-blue-400/60"
                            />
                        ) : (
                            <input
                                autoFocus
                                type={adminDialog.inputType || "text"}
                                value={adminDialog.value}
                                onChange={(event) => setAdminDialog((prev) => ({ ...prev, value: event.target.value }))}
                                placeholder={adminDialog.placeholder}
                                className="mt-3 w-full rounded-xl border border-[#294468] bg-[#0b1426] px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 outline-none focus:border-blue-400/60"
                            />
                        )
                    )}

                    {adminDialog.type === "select" && (
                        <select
                            autoFocus
                            value={adminDialog.value}
                            onChange={(event) => setAdminDialog((prev) => ({ ...prev, value: event.target.value }))}
                            className="mt-3 w-full rounded-xl border border-[#294468] bg-[#0b1426] px-3 py-2.5 text-sm text-gray-100 outline-none focus:border-blue-400/60"
                        >
                            {adminDialog.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    )}

                    <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => closeAdminDialog(null)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/10"
                        >
                            {adminDialog.cancelText || "Cancel"}
                        </button>
                        <button
                            type="button"
                            onClick={() => closeAdminDialog(adminDialog.type === "prompt" || adminDialog.type === "select" ? adminDialog.value : true)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#1e3a5f] text-white hover:bg-[#2a4b77]"
                        >
                            {adminDialog.confirmText || "Confirm"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {trailerRequirementsModal && (
            <div
                className="fixed inset-0 z-[10055] flex items-center justify-center px-4"
                onClick={() => setTrailerRequirementsModal(null)}
            >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div
                    className="relative w-[min(94vw,560px)] rounded-2xl border border-[#1a3050] bg-[#0f1d35] p-5 text-white shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-base font-bold">Trailer Requirements</p>
                            <p className="mt-1.5 text-sm text-gray-300 leading-relaxed">
                                {trailerRequirementsModal?.title || "Selected script"} by {trailerRequirementsModal?.creator?.name || "the creator"}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setTrailerRequirementsModal(null)}
                            className="text-gray-400 hover:text-white transition-colors"
                            aria-label="Close requirements modal"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {(() => {
                        const parsed = parseTrailerRequestNote(trailerRequirementsModal?.trailerWriterFeedback?.note);
                        const summary = parsed?.fields || {};
                        return (
                            <div className="mt-4 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-[#1f3b61] bg-[#0b1426] px-4 py-3">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Duration</p>
                                        <p className="mt-1 text-sm font-semibold text-white">{summary.duration || "Not set"}</p>
                                    </div>
                                    <div className="rounded-xl border border-[#1f3b61] bg-[#0b1426] px-4 py-3">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Quality</p>
                                        <p className="mt-1 text-sm font-semibold text-white">{summary.quality || "Not set"}</p>
                                    </div>
                                    <div className="rounded-xl border border-[#1f3b61] bg-[#0b1426] px-4 py-3">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Layout</p>
                                        <p className="mt-1 text-sm font-semibold text-white">{summary.layout || "Not set"}</p>
                                    </div>
                                    <div className="rounded-xl border border-[#1f3b61] bg-[#0b1426] px-4 py-3">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Payment</p>
                                        <p className="mt-1 text-sm font-semibold text-white">{summary.price || "Not set"}</p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-[#1f3b61] bg-[#0b1426] px-4 py-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Request Note</p>
                                    <p className="mt-2 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                                        {parsed?.text || "No request note available."}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        )}
        </>
    );
};

export default AdminDashboard;


