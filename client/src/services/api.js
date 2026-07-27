import axios from "axios";
import { getApiBaseUrl } from "../utils/apiOrigin";

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

// Where to send someone whose session just died.
//
// This used to return `/login?reason=session-expired&next=...`, but /login is `<Navigate to="/">`
// and nothing has ever read `next` — so the user was silently dumped on the homepage with no sign-in
// prompt and no way back to what they were doing. This interceptor lives outside React, so it can't
// call openAuthModal directly; instead it parks the intended destination in sessionStorage and
// AuthModalProvider picks it up on mount (see PENDING_AUTH_REDIRECT_KEY there).
export const PENDING_AUTH_REDIRECT_KEY = "ckript:pendingAuthRedirect";

const buildLoginRedirectUrl = () => {
  if (typeof window === "undefined") return "/";
  const currentPath = `${window.location.pathname || "/"}${window.location.search || ""}`;
  try {
    sessionStorage.setItem(PENDING_AUTH_REDIRECT_KEY, currentPath);
  } catch { /* private mode / storage disabled — fall through to the homepage */ }
  return "/?reason=session-expired";
};

// Endpoints that should never receive an Authorization header
const AUTH_HEADER_EXEMPT_ROUTES = [
  "/auth/login",
  "/auth/join",
  "/auth/verify-otp",
  "/auth/resend-otp",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/resend-reset-otp",
  "/auth/validate-address",
  "/auth/zip-info",
];

// Endpoints that should not trigger forced login redirect on 401.
const NO_REDIRECT_ROUTES = [
  ...AUTH_HEADER_EXEMPT_ROUTES,
  "/onboarding/check-username",
];

// Attach token & check client-side expiry before every request
api.interceptors.request.use((config) => {
  // Skip token injection for auth endpoints to prevent stale-token 401 loops
  const isAuthRoute = AUTH_HEADER_EXEMPT_ROUTES.some((route) => config.url?.includes(route));
  if (isAuthRoute) return config;

  const stored = localStorage.getItem("user");
  if (stored) {
    try {
      const { token, expiresAt } = JSON.parse(stored);
      // If token is expired, clear session immediately
      if (expiresAt && Date.now() >= expiresAt) {
        localStorage.removeItem("user");
        if (typeof window !== "undefined") {
          window.location.href = buildLoginRedirectUrl();
        }
        return Promise.reject(new Error("Token expired"));
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      localStorage.removeItem("user");
    }
  }
  return config;
});

// Auto-logout on 401 responses (server-side token rejection)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthRoute = NO_REDIRECT_ROUTES.some((route) => requestUrl.includes(route));

    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem("user");
      // Only redirect if not already on login/join/admin pages
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/join") &&
        !window.location.pathname.startsWith("/signup") &&
        !window.location.pathname.startsWith("/admin")
      ) {
        window.location.href = buildLoginRedirectUrl();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
