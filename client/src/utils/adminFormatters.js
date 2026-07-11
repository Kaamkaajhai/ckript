export const formatDuration = (seconds = 0) => {
    const safeSeconds = Number(seconds || 0);
    if (!safeSeconds) return "0s";
    if (safeSeconds < 60) return `${safeSeconds}s`;
    const minutes = Math.floor(safeSeconds / 60);
    const remaining = safeSeconds % 60;
    if (minutes < 60) return `${minutes}m ${remaining}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
};

export const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

export const formatRelativeTime = (value) => {
    if (!value) return "Never";
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts)) return "Never";

    const diffMs = Date.now() - ts;
    if (diffMs < 60 * 1000) return "Just now";

    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDateTime(value);
};

export const formatPathLabel = (path = "") => {
    const normalized = String(path || "").trim();
    if (!normalized) return "No page captured";
    if (normalized === "/") return "Home";

    const cleaned = normalized
        .replace(/^\/+/, "")
        .split("?")[0]
        .split("#")[0];

    if (!cleaned) return "Home";

    return cleaned
        .split("/")
        .filter(Boolean)
        .map((segment) => segment.replace(/[-_]+/g, " ").trim())
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" / ");
};

const EVENT_LABELS = {
    session_start: "Started a session",
    session_end: "Ended a session",
    page_view: "Viewed a page",
    click: "Clicked something",
    login: "Logged in",
    signup: "Signed up",
    logout: "Logged out",
    user_returned: "Returned to the site",
    heartbeat: "Was active",
    scroll: "Scrolled the page",
    scroll_depth: "Scrolled the page",
};

export const humanizeEventLabel = (value) => {
    const key = String(value || "").trim().toLowerCase();
    if (!key) return "";
    if (EVENT_LABELS[key]) return EVENT_LABELS[key];

    return key
        .replace(/[-_]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
        .join(" ");
};

export const getInitials = (name = "") => {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const AVATAR_PALETTE = [
    "bg-blue-500/15 text-blue-300",
    "bg-purple-500/15 text-purple-300",
    "bg-emerald-500/15 text-emerald-300",
    "bg-amber-500/15 text-amber-300",
    "bg-cyan-500/15 text-cyan-300",
    "bg-rose-500/15 text-rose-300",
];

export const getAvatarTone = (seed = "") => {
    const text = String(seed || "");
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = (hash * 31 + text.charCodeAt(i)) % AVATAR_PALETTE.length;
    }
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

export const getAnalyticsStatusTone = (statusKey, isDark) => {
    const toneMap = {
        live: isDark ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20" : "bg-emerald-100 text-emerald-700 border border-emerald-200",
        recent: isDark ? "bg-blue-500/15 text-blue-300 border border-blue-400/20" : "bg-blue-100 text-blue-700 border border-blue-200",
        today: isDark ? "bg-amber-500/15 text-amber-300 border border-amber-400/20" : "bg-amber-100 text-amber-700 border border-amber-200",
        offline: isDark ? "bg-slate-500/15 text-slate-300 border border-slate-400/20" : "bg-slate-100 text-slate-700 border border-slate-200",
    };

    return toneMap[statusKey] || toneMap.offline;
};
