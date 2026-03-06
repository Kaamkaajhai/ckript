import { createContext, useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

export const AuthContext = createContext();

const API_URL = "http://localhost:5001/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutTimerRef = useRef(null);

  // Clear any existing auto-logout timer
  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  // Schedule auto-logout when token expires
  const scheduleAutoLogout = useCallback((expiresAt) => {
    clearLogoutTimer();
    const msUntilExpiry = expiresAt - Date.now();
    if (msUntilExpiry <= 0) return false; // already expired
    // Cap at 24h to avoid setTimeout overflow issues, re-check on next mount
    const delay = Math.min(msUntilExpiry, 24 * 60 * 60 * 1000);
    logoutTimerRef.current = setTimeout(() => {
      setUser(null);
      localStorage.removeItem("user");
      window.location.href = "/login";
    }, delay);
    return true;
  }, [clearLogoutTimer]);

  // Check if token is expired client-side
  const isTokenExpired = (expiresAt) => {
    return !expiresAt || Date.now() >= expiresAt;
  };

  // Decode JWT exp (seconds) into ms epoch; returns null for invalid tokens
  const getTokenExpiryFromJwt = (token) => {
    try {
      const payload = token?.split(".")?.[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(window.atob(normalized));
      return decoded?.exp ? decoded.exp * 1000 : null;
    } catch {
      return null;
    }
  };

  // On mount, restore session from localStorage and validate token
  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (!parsed?.token) {
            localStorage.removeItem("user");
            setLoading(false);
            return;
          }

          const effectiveExpiry = parsed?.expiresAt || getTokenExpiryFromJwt(parsed.token);

          // Quick client-side expiry check before hitting the server
          if (!effectiveExpiry || isTokenExpired(effectiveExpiry)) {
            localStorage.removeItem("user");
            setLoading(false);
            return;
          }

          // Validate token with backend
          const { data } = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${parsed.token}` },
          });
          // Merge fresh user data with stored token & expiry
          const refreshedUser = {
            ...data,
            token: parsed.token,
            expiresAt: data.expiresAt || effectiveExpiry,
          };
          setUser(refreshedUser);
          localStorage.setItem("user", JSON.stringify(refreshedUser));
          scheduleAutoLogout(refreshedUser.expiresAt);
        } catch {
          // Token expired or invalid — clear session
          localStorage.removeItem("user");
          setUser(null);
        }
      }
      setLoading(false);
    };
    restoreSession();
    return () => clearLogoutTimer();
  }, []);

  const login = async (email, password) => {
    const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
    
    // If OTP verification is required, don't set user yet
    if (data.requiresVerification) {
      return data;
    }
    
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    if (data.expiresAt) scheduleAutoLogout(data.expiresAt);
    return data;
  };

  const join = async (formData) => {
    const { data } = await axios.post(`${API_URL}/auth/join`, formData);
    
    // If OTP verification is required, don't set user yet
    if (data.requiresVerification) {
      return data;
    }
    
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    if (data.expiresAt) scheduleAutoLogout(data.expiresAt);
    return data;
  };

  const logout = () => {
    clearLogoutTimer();
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, join, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
