import axios from "axios";
import { getApiBaseUrl } from "../utils/apiOrigin";
import { readAdminSession } from "../utils/adminSession";

/**
 * The HTTP client for /finance, which has to serve two different kinds of session.
 *
 * An accountant signs in normally, so their token is in localStorage like everyone else's. An admin
 * usually arrives through the console's access code, and THAT token lives in sessionStorage and is
 * kept deliberately apart from the ordinary one. The default `services/api` client only ever reads
 * localStorage, so an admin's requests went out as whoever happened to be signed in normally — or
 * as nobody — and the page refused them.
 *
 * Prefer the admin token when one is live, otherwise fall back to the normal session. Both are only
 * a claim: reads are financeOnly and the control endpoints stay adminOnly, so the server decides.
 *
 * Kept separate from `services/api` rather than folded into it. Making the global client prefer the
 * admin token would mean that merely having the console open in a tab silently changed who you are
 * on every other page in the app — which is the property the sessionStorage split exists to prevent.
 */
const financeApi = axios.create({ baseURL: getApiBaseUrl() });

financeApi.interceptors.request.use((config) => {
  const admin = readAdminSession();
  if (admin?.token) {
    config.headers.Authorization = `Bearer ${admin.token}`;
    return config;
  }

  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const { token } = JSON.parse(stored);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* malformed session — send it unauthenticated and let the server answer */ }

  return config;
});

export default financeApi;
