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

  // On mount, restore session from localStorage and validate token
  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          // Quick client-side expiry check before hitting the server
          if (parsed?.expiresAt && isTokenExpired(parsed.expiresAt)) {
            localStorage.removeItem("user");
            setLoading(false);
            return;
          }
          if (parsed?.token) {
            // Validate token with backend
            const { data } = await axios.get(`${API_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${parsed.token}` },
            });
            // Merge fresh user data with stored token & expiry
            const refreshedUser = {
              ...data,
              token: parsed.token,
              expiresAt: data.expiresAt || parsed.expiresAt,
            };
            setUser(refreshedUser);
            localStorage.setItem("user", JSON.stringify(refreshedUser));
            scheduleAutoLogout(refreshedUser.expiresAt);
          } else {
            localStorage.removeItem("user");
          }
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
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    if (data.expiresAt) scheduleAutoLogout(data.expiresAt);
    return data;
  };

  const join = async (formData) => {
    const { data } = await axios.post(`${API_URL}/auth/join`, formData);
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
    <AuthContext.Provider value={{ user, loading, login, join, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
