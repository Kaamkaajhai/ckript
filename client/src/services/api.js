import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001/api",
});

// Auth endpoints that should never receive an Authorization header
const AUTH_ROUTES = ["/auth/login", "/auth/join"];

// Attach token & check client-side expiry before every request
api.interceptors.request.use((config) => {
  // Skip token injection for auth endpoints to prevent stale-token 401 loops
  const isAuthRoute = AUTH_ROUTES.some((route) => config.url?.includes(route));
  if (isAuthRoute) return config;

  const stored = localStorage.getItem("user");
  if (stored) {
    const { token, expiresAt } = JSON.parse(stored);
    // If token is expired, clear session immediately
    if (expiresAt && Date.now() >= expiresAt) {
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(new Error("Token expired"));
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-logout on 401 responses (server-side token rejection)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("user");
      // Only redirect if not already on login/join pages
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/join")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
