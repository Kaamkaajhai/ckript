import { createContext, useContext } from "react";

/**
 * The admin dashboard's shared scope, as a context.
 *
 * AdminDashboard owns ~70 pieces of state and ~200 handlers that its tab panels read through
 * closures. Stage 5b moves those panels into pages/admin/sections/, and this context is how they
 * keep reaching the same scope — the provider's value is built in AdminDashboard from exactly the
 * names the extracted panels were measured to use, so the surface is explicit instead of ambient.
 *
 * Deliberately NOT memoised: the provider re-renders whenever dashboard state changes, which is
 * precisely when the panels re-rendered as closures too. Memoising the value object with a
 * hundred-entry dependency list would be a lie that changes nothing.
 */
export const AdminDashboardContext = createContext(null);

export function useAdminDashboard() {
  const scope = useContext(AdminDashboardContext);
  if (!scope) throw new Error("useAdminDashboard must be used inside AdminDashboard's provider.");
  return scope;
}
