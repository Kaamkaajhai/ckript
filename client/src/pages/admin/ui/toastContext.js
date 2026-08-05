import { createContext, useContext } from "react";

/**
 * Split from Toast.jsx so that file exports only a component: mixing a hook export into a component
 * file disables Fast Refresh for it, and the provider is exactly the component whose edits you want
 * hot-reloaded while tuning toasts.
 */
export const ToastContext = createContext(null);

export function useToast() {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>.");
  return api;
}
