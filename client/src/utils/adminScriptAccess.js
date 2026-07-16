// The admin "script section" password gate has been REMOVED. Admin auth (protect + adminOnly on the
// server) is now the only requirement to view/approve scripts. These helpers are kept as no-op stubs so
// the existing admin pages that import them keep working without a password prompt — access always
// reads as "granted", no tab is treated as protected, and no access header is attached.
export const ADMIN_SCRIPT_ACCESS_STORAGE_KEY = "admin-script-section-access";

// No tab requires the password prompt anymore.
export const ADMIN_SCRIPT_PROTECTED_TAB_KEYS = new Set();

// Always report access as granted so gated UIs render their content directly (never the prompt).
export const getStoredAdminScriptAccess = () => ({
    token: "granted",
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
});

export const storeAdminScriptAccess = () => getStoredAdminScriptAccess();

export const clearAdminScriptAccess = () => {};

// No extra header — the server no longer expects one.
export const attachAdminScriptAccessHeader = (config = {}) => config;

// Nothing is gated anymore.
export const isAdminScriptProtectedTab = () => false;
