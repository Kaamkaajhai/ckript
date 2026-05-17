export const ADMIN_SCRIPT_ACCESS_STORAGE_KEY = "admin-script-section-access";

export const ADMIN_SCRIPT_PROTECTED_TAB_KEYS = new Set([
    "projects",
    "approvals",
    "deleted-scripts",
]);

const normalizeRequestPath = (url = "") => {
    const raw = String(url || "").trim();
    if (!raw) return "";

    try {
        const parsed = raw.startsWith("http://") || raw.startsWith("https://")
            ? new URL(raw)
            : new URL(raw.startsWith("/") ? raw : `/${raw}`, "http://localhost");
        return `${parsed.pathname}${parsed.search}`.trim();
    } catch {
        return raw.startsWith("/") ? raw : `/${raw}`;
    }
};

const stripQuery = (value = "") => String(value || "").split("?")[0].trim();
const OBJECT_ID_SEGMENT = "[a-fA-F0-9]{24}";

const isProtectedAdminScriptRequest = (url = "") => {
    const normalizedPath = stripQuery(normalizeRequestPath(url));
    if (!normalizedPath) return false;

    if (normalizedPath === "/admin/scripts") return true;
    if (normalizedPath === "/admin/scripts/pending") return true;
    if (new RegExp(`^/admin/scripts/${OBJECT_ID_SEGMENT}$`).test(normalizedPath)) return true;
    if (new RegExp(`^/admin/scripts/${OBJECT_ID_SEGMENT}/(approve|reject|score)$`).test(normalizedPath)) return true;

    return false;
};

const safeParseJson = (value) => {
    if (!value) return null;

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

export const getStoredAdminScriptAccess = () => {
    const parsed = safeParseJson(sessionStorage.getItem(ADMIN_SCRIPT_ACCESS_STORAGE_KEY));
    const token = String(parsed?.token || "").trim();
    const expiresAt = Number(parsed?.expiresAt || 0);

    if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        sessionStorage.removeItem(ADMIN_SCRIPT_ACCESS_STORAGE_KEY);
        return null;
    }

    return { token, expiresAt };
};

export const storeAdminScriptAccess = (payload) => {
    const token = String(payload?.token || "").trim();
    const expiresAt = Number(payload?.expiresAt || 0);

    if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        clearAdminScriptAccess();
        return null;
    }

    const value = { token, expiresAt };
    sessionStorage.setItem(ADMIN_SCRIPT_ACCESS_STORAGE_KEY, JSON.stringify(value));
    return value;
};

export const clearAdminScriptAccess = () => {
    sessionStorage.removeItem(ADMIN_SCRIPT_ACCESS_STORAGE_KEY);
};

export const attachAdminScriptAccessHeader = (config = {}) => {
    if (!isProtectedAdminScriptRequest(config?.url)) return config;

    const access = getStoredAdminScriptAccess();
    if (!access?.token) return config;

    config.headers = config.headers || {};
    config.headers["x-admin-script-access-token"] = access.token;
    return config;
};

export const isAdminScriptProtectedTab = (tabKey = "") =>
    ADMIN_SCRIPT_PROTECTED_TAB_KEYS.has(String(tabKey || "").trim());
