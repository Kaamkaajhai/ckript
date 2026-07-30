/*
 * Presentation helpers shared by the notification panel and the toasts.
 *
 * `timeAgo` had four identical copies across the two shells and their children;
 * the icon map had two that disagreed about which types even had an icon, so the
 * panel and the toast could show different glyphs for the same notification.
 */

/** "3m ago" / "2h ago" / a date once it stops being recent. */
export const timeAgo = (date) => {
  const stamp = new Date(date).getTime();
  if (!Number.isFinite(stamp)) return "";

  const seconds = Math.floor((Date.now() - stamp) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(stamp).toLocaleDateString();
};

/* Notification type → key in navigation/icons SYMBOLS or a raw ligature. */
const TYPE_ICONS = {
  like: "favorite",
  comment: "chat_bubble",
  follow: "person_add",
  follow_request: "person_add",
  follow_request_accepted: "how_to_reg",
  unlock: "lock_open",
  hold: "gavel",
  hold_expiring: "schedule",
  script_score: "star",
  trailer_ready: "movie",
  message_request: "chat",
  purchase: "payments",
  purchase_request: "request_quote",
  purchase_approved: "check_circle",
  purchase_rejected: "cancel",
  script_approved: "check_circle",
  script_rejected: "report",
  smart_match: "auto_awesome",
  audition: "person",
  profile_view: "visibility",
  script_view: "visibility",
  collab_invite: "group_add",
  collab_request: "group_add",
  collab_update: "groups",
  revision_update: "history_edu",
  script_pitch: "campaign",
  admin_alert: "campaign",
};

export const notificationIcon = (type) => TYPE_ICONS[type] || "notifications";

/** Types that carry an inline Approve / Reject decision. */
export const isDecisionNotification = (notification) =>
  String(notification?.type || "") === "follow_request";
