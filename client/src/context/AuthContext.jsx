import { createContext, useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { getApiBaseUrl } from "../utils/apiOrigin";
import { clearCacheByPrefix } from "../utils/localCache";
import { clearAllDrafts } from "../mobile/screens/auth/authDraft";
import { linkAnonymousSessionToUser } from "../tracking/linkUserSession";
import { sendTrackEvent } from "../tracking/analyticsClient";

// Context and provider intentionally share this module to preserve the app's established import path.
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

const API_URL = getApiBaseUrl();
const FORCE_DEFAULT_REDIRECT_KEY = "auth:force-default-redirect";
const REFERRAL_STORAGE_KEY = "sb:referral-code";
const REFERRAL_MAX_LENGTH = 40;

const normalizeReferralInput = (value) => {
  const str = String(value || "").trim();
  if (str === "null" || str === "undefined") return "";
  return str.slice(0, REFERRAL_MAX_LENGTH);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const logoutTimerRef = useRef(null);

  const updateSessionUser = useCallback((update) => {
    setUser((current) => {
      if (!current) return current;
      const patch = typeof update === "function" ? update(current) : update;
      if (!patch || typeof patch !== "object") return current;
      const next = { ...current, ...patch };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("user", JSON.stringify(next));
        } catch {
          // The live in-memory session remains authoritative when storage is unavailable.
        }
      }
      return next;
    });
  }, []);

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
      clearCacheByPrefix("dashboard:"); // don't leave a session's data cached
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

  const trackAuthEvent = useCallback(async (action, currentUser) => {
    if (!currentUser?._id || typeof window === "undefined") return;

    await sendTrackEvent({
      eventType: "auth",
      action,
      path: `${window.location.pathname}${window.location.search}`,
      userContext: {
        userId: currentUser._id,
        email: currentUser.email || "",
        phone: currentUser.phone || "",
      },
      metadata: {
        role: currentUser.role || "",
        source: "auth-context",
      },
    });
  }, []);

  // Capture referral code from URL once and persist it for signup flows.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search || "");
    const referralFromUrl = normalizeReferralInput(
      params.get("ref") || params.get("referral") || params.get("referralCode")
    );

    if (referralFromUrl) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, referralFromUrl);
    }
  }, []);

  // On mount, restore session from localStorage and validate token
  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        let sessionUser = null;
        let sessionExpiry = null;
        try {
          const parsed = JSON.parse(storedUser);
          sessionUser = parsed;
          if (!parsed?.token) {
            localStorage.removeItem("user");
            setLoading(false);
            return;
          }

          const effectiveExpiry = parsed?.expiresAt || getTokenExpiryFromJwt(parsed.token);
          sessionExpiry = effectiveExpiry;

          // Quick client-side expiry check before hitting the server
          if (!effectiveExpiry || isTokenExpired(effectiveExpiry)) {
            localStorage.removeItem("user");
            setLoading(false);
            return;
          }

          // Restore the cached identity, but keep the transition boundary in its
          // neutral loading state until the server confirms the current role.
          // A role may have changed since this snapshot was written; exposing
          // its old audience for a frame is both a data leak and a navigation
          // mismatch on refresh.
          setUser(parsed);

          // Validate token with backend in the background
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
          await linkAnonymousSessionToUser(refreshedUser);
          await trackAuthEvent("session_restored", refreshedUser);
        } catch (error) {
          const status = error?.response?.status;
          const isUnauthorized = status === 401 || status === 403;

          if (isUnauthorized) {
            // Token is invalid/expired on server.
            localStorage.removeItem("user");
            setUser(null);
          } else {
            // Keep session on transient failures (network/server hiccups).
            if (sessionUser && sessionExpiry && !isTokenExpired(sessionExpiry)) {
              setUser(sessionUser);
              scheduleAutoLogout(sessionExpiry);
            } else {
              localStorage.removeItem("user");
              setUser(null);
            }
          }
        }
      }
      setLoading(false);
    };
    restoreSession();
    return () => clearLogoutTimer();
  }, [clearLogoutTimer, scheduleAutoLogout, trackAuthEvent]);

  /*
   * Take on an authenticated payload as the live session — the ONE place that
   * decides what "signed in" means to this client.
   *
   * Everything a session needs happens here together: the in-memory user, the
   * persisted copy, the expiry timer that signs a stale token out, the link
   * from the visitor's pre-auth anonymous tracking session to the account it
   * became, and the auth analytics event.
   *
   * It exists because those five had drifted apart. `login` and `join` did all
   * of it; `components/OTPVerification.jsx` wrote localStorage itself and left
   * its callers to call `setUser`, and none of those callers scheduled the
   * timer, linked the session or reported the event. Since OTP verification is
   * the *primary* sign-up path, that meant every new account had a session
   * that never expired in the browser and had silently lost its attribution,
   * while an ordinary password login kept both (DEF-34).
   *
   * `reason` names the auth event ("login_success" / "signup_success" /
   * "session_restored"); pass null to adopt the session without reporting one.
   */
  const adoptSession = useCallback((userData, { reason = "login_success" } = {}) => {
    if (!userData?.token) return userData;

    const expiresAt = userData.expiresAt || getTokenExpiryFromJwt(userData.token);
    const session = expiresAt ? { ...userData, expiresAt } : userData;

    setUser(session);
    try {
      localStorage.setItem("user", JSON.stringify(session));
    } catch {
      // The live in-memory session remains authoritative when storage is unavailable.
    }
    if (session.expiresAt) scheduleAutoLogout(session.expiresAt);

    // Fire-and-forget so navigation is never waiting on analytics.
    linkAnonymousSessionToUser(session).catch(console.error);
    if (reason) trackAuthEvent(reason, session).catch(console.error);

    return session;
  }, [scheduleAutoLogout, trackAuthEvent]);

  const login = async (email, password) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const { data } = await axios.post(`${API_URL}/auth/login`, { email: normalizedEmail, password });

    // If OTP verification is required, don't set user yet
    if (data.requiresVerification) {
      return data;
    }

    adoptSession(data, { reason: "login_success" });
    return data;
  };

  const join = async (formData) => {
    const hasExplicitReferralField = Object.prototype.hasOwnProperty.call(formData || {}, "referralCode");
    const explicitReferral = normalizeReferralInput(formData?.referralCode);
    const storedReferral =
      typeof window !== "undefined"
        ? normalizeReferralInput(localStorage.getItem(REFERRAL_STORAGE_KEY))
        : "";

    const effectiveReferral = hasExplicitReferralField ? explicitReferral : storedReferral;
    const signupPayload = { ...formData };

    if (typeof window !== "undefined" && hasExplicitReferralField) {
      if (explicitReferral) {
        localStorage.setItem(REFERRAL_STORAGE_KEY, explicitReferral);
      } else {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }
    }

    if (effectiveReferral) {
      signupPayload.referralCode = effectiveReferral;
    } else if (hasExplicitReferralField) {
      delete signupPayload.referralCode;
    }

    const { data } = await axios.post(`${API_URL}/auth/join`, signupPayload);

    // If OTP verification is required, don't set user yet. The surface that
    // runs the OTP step adopts the session itself once the code is accepted.
    if (data.requiresVerification) {
      return data;
    }

    adoptSession(data, { reason: "signup_success" });
    return data;
  };

  const googleSignIn = async (credential, { referralCode, role } = {}) => {
    const payload = { credential };
    if (referralCode) payload.referralCode = referralCode;
    if (role) payload.role = role;
    const { data } = await axios.post(`${API_URL}/auth/google`, payload);

    adoptSession(data, { reason: data?.isNewUser ? "signup_success" : "login_success" });
    return data;
  };

  const logout = (options = {}) => {
    const { redirect = true } = options;
    clearLogoutTimer();

    if (typeof window !== "undefined") {
      sessionStorage.setItem(FORCE_DEFAULT_REDIRECT_KEY, "1");
    }

    setUser(null);
    localStorage.removeItem("user");
    clearCacheByPrefix("dashboard:"); // clear any cached dashboard snapshot for privacy

    // Any half-finished native sign-up goes with the session. `logout` navigates
    // with location.replace, which does NOT clear sessionStorage — so without
    // this, one person's part-filled sign-up survives in a browser the next
    // person is about to use. See mobile/screens/auth/authDraft.js.
    clearAllDrafts();

    if (redirect && typeof window !== "undefined") {
      window.location.replace("/");
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, updateSessionUser, adoptSession, loading, login, join, googleSignIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
