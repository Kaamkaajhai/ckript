/*
 * DashboardLayout — backward-compatible alias for the 2B application shell.
 *
 * The implementation now lives in ./dashboard/DashboardShell.jsx (composed of
 * Sidebar + Topbar + nav config). This file is kept so existing imports
 * (`layouts/DashboardLayout`) continue to resolve.
 */
export { default } from "./dashboard/DashboardShell";
