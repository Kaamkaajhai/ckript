/*
 * DashboardLayout — backward-compatible alias for the application shell.
 *
 * The shell is no longer writer-specific (it renders the producer section too),
 * so its real name is AppShell and it lives in ./app-shell — composed of a nav
 * rail, an overlay drawer, a topbar, and a role-aware nav model.
 *
 * This alias is kept because several in-flight branches import
 * `layouts/DashboardLayout`. New code should import from "../layouts/app-shell".
 */
export { default } from "./app-shell";
