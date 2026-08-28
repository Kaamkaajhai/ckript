import axios from "axios";
import { getApiBaseUrl } from "../utils/apiOrigin";

/**
 * The HTTP client for /judge.
 *
 * A sibling of financeApi.js, with two deliberate differences — and both are the point of the file,
 * so please read them before "simplifying" this into services/api.
 *
 * 1. NO ADMIN-SESSION FALLBACK. financeApi prefers the sessionStorage admin token because an admin
 *    arrives at /finance from the console and legitimately administers that page. Admins are NOT
 *    admitted to the judge panel (see server/middleware/judgeMiddleware.js): every score must be
 *    attributable to a named judge, and a client that could send an admin token would be building
 *    the request the server exists to refuse. A judge signs in normally, so localStorage is the only
 *    place their token lives.
 *
 * 2. NO RESPONSE INTERCEPTOR. The global services/api client hard-redirects any 401 to the marketing
 *    homepage unless the path starts with /login, /join, /signup or /admin — and /judge is not in
 *    that list. A judge whose token expired forty minutes into a feature-length script would be
 *    thrown onto the front page with their draft gone. Here a 401 simply rejects, the page catches
 *    it and re-renders its own sign-in card, and the unsaved score is still sitting in React state.
 */
const judgeApi = axios.create({ baseURL: getApiBaseUrl() });

judgeApi.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const { token } = JSON.parse(stored);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* malformed session — send it unauthenticated and let the server answer */ }
  return config;
});

export default judgeApi;
