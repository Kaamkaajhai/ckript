import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { AuthContext } from "./AuthContext";
import { detectUserCurrency, formatCurrency as fmt, formatSubunits as fmtSub } from "../utils/currency";

export const CurrencyContext = createContext();

const STORAGE_KEY = "preferredCurrency";
const isValid = (c) => c === "INR" || c === "USD";

export const CurrencyProvider = ({ children }) => {
  const { user, setUser } = useContext(AuthContext);
  const [currency, setCurrencyState] = useState(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return isValid(stored) ? stored : "INR";
  });

  // Resolve the initial currency: a saved user preference wins; else what's in localStorage; else
  // detect from IP. Runs once we know whether there's a logged-in user.
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (isValid(user?.preferredCurrency)) {
        if (!cancelled) applyLocal(user.preferredCurrency);
        return;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isValid(stored)) {
        if (!cancelled) applyLocal(stored);
        return;
      }
      const detected = await detectUserCurrency();
      if (!cancelled) applyLocal(detected);
    };
    resolve();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.preferredCurrency]);

  const applyLocal = (c) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch { /* ignore */ }
  };

  // Explicit user override (toggle): update local state + persist to the profile when logged in.
  const setCurrency = useCallback(async (next) => {
    if (!isValid(next)) return;
    applyLocal(next);
    if (user?._id) {
      try {
        await api.put("/users/settings", { preferredCurrency: next });
        setUser((u) => (u ? { ...u, preferredCurrency: next } : u));
      } catch { /* local change still applies */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const value = {
    currency,
    setCurrency,
    // Convenience formatters bound to the active currency.
    format: (amount, options) => fmt(amount, currency, options),
    formatSubunits: (minor, options) => fmtSub(minor, currency, options),
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => useContext(CurrencyContext);
