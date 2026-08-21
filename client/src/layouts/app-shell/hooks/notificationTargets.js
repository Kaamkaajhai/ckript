/*
 * notificationTargets — "clicking this notification should take me where?"
 *
 * Pure functions, no React, so the routing rules are testable on their own. They
 * were previously a ~50-line if/else inside each shell's click handler, drifting
 * apart: MainLayout and the dashboard shell disagreed about several types, so the
 * same notification went to different places depending on the viewer's role.
 *
 * A FIXED BUG LIVES HERE
 * ----------------------
 * Both shells sent purchase_request / purchase_rejected to "/purchase-requests".
 * No such route is declared in App.jsx. It fell through to the "/:id" catch-all
 * and rendered the profile page with id="purchase-requests" — so a producer who
 * clicked "Purchase request" landed on a broken profile. There is no
 * purchase-requests list page in the app; those requests are surfaced on the
 * script's own detail page (which fetches /scripts/purchase-requests/mine), so
 * that is where the notification now goes.
 */
import { getScriptCanonicalPath } from "../../../utils/scriptPath";
import { getProfileCanonicalPath } from "../../../utils/profilePath";

/** Types that open the draft in the editor, because they are an invitation to work on it. */
const COLLAB_TYPES = new Set([
  "collab_invite",
  "collab_update",
  "revision_update",
]);

/** Types that belong on the script they concern. */
const SCRIPT_TYPES = new Set([
  "purchase_approved",
  "purchase",
  "unlock",
  "smart_match",
  "script_score",
  "trailer_ready",
  "audition",
  "hold",
  "hold_expiring",
  "script_approved",
  "script_rejected",
  "script_pitch",
  // Purchase requests are reviewed on the script's detail page — see above.
  "purchase_request",
  "purchase_rejected",
]);

/** Types that belong on the profile of whoever triggered them. */
const PROFILE_TYPES = new Set([
  "follow",
  "follow_request_accepted",
  "profile_view",
  "like",
  "comment",
]);

/** Types with one fixed destination regardless of payload. */
const FIXED_TYPES = {
  message_request: "/messages",
  follow_request: "/follow-requests",
  // Platform alerts are account-level (plan grants, verification) — the viewer's
  // own profile is where the resulting state is visible.
  admin_alert: "/profile",
};

/** Human label for the action button on a notification. */
export const getNotificationActionLabel = (notification) => {
  const type = String(notification?.type || "");
  if (type === "purchase_request" || type === "purchase_rejected") return "Review";
  if (type === "follow_request") return "Review";
  if (type === "collab_request") return "Review";
  if (type === "message_request") return "Reply";
  if (PROFILE_TYPES.has(type) && notification?.from) return "Profile";
  return "Open";
};

/**
 * Where a notification should navigate to.
 *
 * @param {Object} notification
 * @param {Object} [viewer]  the signed-in user, for canonical profile paths
 * @returns {string|null} a path, or null meaning "no destination — just open the panel"
 */
export const getNotificationTarget = (notification, viewer) => {
  const type = String(notification?.type || "");

  if (FIXED_TYPES[type]) return FIXED_TYPES[type];

  if (type === "collab_invite" && notification?.actionToken) {
    return `/invite/${encodeURIComponent(notification.actionToken)}`;
  }

  // An owner's incoming request needs a decision, which lives in the canonical request queue.
  // Invitations and membership/revision updates still open the project workspace itself.
  if (type === "collab_request") return "/collaborations";

  /*
   * Collaboration lands in the EDITOR, not on the script's public page: every one of these
   * notifications exists because someone wants you to work on the draft, and the read-only page
   * has nothing to act on.
   *
   * The fallback matters. These four used to live in SCRIPT_TYPES below, which never dead-ends —
   * moving them up here without a fallback meant a collab notification whose script carries no id
   * returned null and the click did nothing at all. The dashboard is the one place every audience
   * can act from, which is the same reasoning SCRIPT_TYPES uses.
   */
  if (COLLAB_TYPES.has(type)) {
    return notification?.script?._id
      ? `/create-project/${notification.script._id}`
      : "/dashboard";
  }

  if (SCRIPT_TYPES.has(type)) {
    const scriptPath = notification?.script
      ? getScriptCanonicalPath(notification.script)
      : null;
    if (scriptPath) return scriptPath;
    /*
     * A purchase notification with no script attached still must not dead-end.
     * The dashboard is the one place every audience can act from.
     */
    return "/dashboard";
  }

  if (PROFILE_TYPES.has(type) && notification?.from) {
    return getProfileCanonicalPath(notification.from, {
      viewerId: viewer?._id,
      viewerRole: viewer?.role,
    }) || null;
  }

  return null;
};

export default getNotificationTarget;
