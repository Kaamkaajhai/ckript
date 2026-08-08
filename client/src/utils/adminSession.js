/**
 * The admin console's session, which is NOT the normal one.
 *
 * Signing in with the access code parks its token in sessionStorage under "admin-session", on
 * purpose: an admin can open the console without displacing whoever is signed in normally in
 * localStorage, and closing the tab ends it. That separation is deliberate and worth keeping.
 *
 * The cost is that any surface an admin reaches has to look HERE first, or it reads the other
 * identity and shows the wrong person. /finance did exactly that — an admin who signed in with the
 * code was greeted as their own ordinary account and refused, because the page asked AuthContext,
 * which only ever sees localStorage.
 */

export const ADMIN_SESSION_KEY = "admin-session";

/**
 * @returns {null | { token: string, role?: string, name?: string, email?: string, expiresAt?: number }}
 *   the live admin session, or null when there isn't one.
 */
export const readAdminSession = () => {
  if (typeof window === "undefined") return null;

  let raw;
  try {
    raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
  } catch {
    return null; // private mode, or storage disabled
  }
  if (!raw) return null;

  let session;
  try {
    session = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!session || typeof session !== "object" || !session.token) return null;

  // The same expiry rule the normal session gets. Without it, an admin whose token has died keeps
  // being shown the console while every request behind it 401s — which reads as the page being
  // broken rather than as a session that ended.
  if (session.expiresAt && Date.now() >= session.expiresAt) {
    try {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch { /* nothing to do if storage is gone */ }
    return null;
  }

  return session;
};

/** The identity a page should show and authorise against: the admin session wins when one is live. */
export const resolveEffectiveUser = (signedInUser) => readAdminSession() || signedInUser || null;

export default readAdminSession;
