/*
 * useShellNotifications — the shell's notification + realtime session.
 *
 * Owns polling, the socket, the unread counters, the toast queue and every
 * mutation (mark read, delete, act on a follow request). This was ~200 lines
 * inlined in the dashboard shell and another ~200 in MainLayout, implementing
 * the same feature twice with different bugs. Pulling it out means the producer
 * shell gets the behaviour for free instead of a third copy.
 *
 * Everything here is presentation-agnostic: it returns state and callbacks, and
 * never renders. That is what makes it reusable by any shell.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../../../services/api";
import { getApiOrigin, isSocketSupported } from "../../../utils/apiOrigin";
import { getNotificationTarget } from "./notificationTargets";

const SOCKET_ORIGIN =
  getApiOrigin() || (typeof window !== "undefined" ? window.location.origin : "");

const POLL_INTERVAL_MS = 30000;
/* Coalesce a burst of socket events into a single refetch. */
const REFRESH_DEBOUNCE_MS = 350;
/* One toast at a time — a stack of them buries the page. */
const TOAST_LIMIT = 1;

/**
 * @param {Object} options
 * @param {Object} options.user      the authenticated user
 * @param {Function} options.navigate  react-router navigate
 */
export function useShellNotifications({ user, navigate }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  /*
   * Toasts a user has already seen. A ref, not state: it must not trigger a
   * re-render, and the poll callback needs the latest value without being
   * re-created (which would restart the interval on every notification).
   */
  const seenToastIds = useRef(new Set());
  const refreshTimer = useRef(null);

  const userId = user?._id;
  const token = user?.token;

  // ── Reads ─────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);

      const unread = list.filter((n) => !n.read);
      setUnreadCount(unread.length);

      const fresh = unread.filter((n) => n._id && !seenToastIds.current.has(n._id));
      if (fresh.length) {
        setToasts((prev) => {
          const existing = new Set(prev.map((t) => t._id));
          const additions = fresh.filter((n) => !existing.has(n._id));
          if (!additions.length) return prev;
          return [...additions, ...prev].slice(0, TOAST_LIMIT);
        });
      }
    } catch {
      // A failed poll keeps the last good state rather than blanking the bell.
    }
  }, []);

  const fetchMessageCount = useCallback(async () => {
    if (!userId) {
      setMessageCount(0);
      return;
    }
    try {
      const { data } = await api.get("/messages/unread-count");
      setMessageCount(data?.count || 0);
    } catch {
      setMessageCount(0);
    }
  }, [userId]);

  const refresh = useCallback(() => {
    fetchNotifications();
    fetchMessageCount();
  }, [fetchNotifications, fetchMessageCount]);

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return undefined;

    /*
     * A new session has not seen anything yet. Reset here (rather than during
     * render) so the ref mutation stays outside render; this runs before the
     * deferred first fetch below, so nothing is wrongly suppressed.
     */
    seenToastIds.current = new Set();

    /*
     * Defer the first fetch past paint. Firing it synchronously on mount makes
     * the shell's request compete with the page's own initial data fetch, which
     * is the request the user is actually waiting on.
     */
    const initial = window.setTimeout(refresh, 0);
    const interval = window.setInterval(fetchNotifications, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [fetchNotifications, refresh, userId]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !userId || !isSocketSupported()) return undefined;

    const socket = io(SOCKET_ORIGIN, { auth: { token } });
    socket.on("connect", () => socket.emit("join-notifications", userId));

    /*
     * Any server event may have changed the counters, so rather than mirroring
     * every event name we simply refetch — debounced, because a single action
     * server-side can emit several events.
     */
    socket.onAny((event) => {
      if (event === "connect" || event === "disconnect") return;
      if (refreshTimer.current) return;
      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        refresh();
      }, REFRESH_DEBOUNCE_MS);
    });

    return () => {
      socket.disconnect();
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
    };
  }, [refresh, token, userId]);

  /*
   * Clear per-user state when the session changes, so a second account signed in
   * to the same tab never inherits the first one's counters or toasts.
   *
   * The visible state is reset during render rather than in an effect: an effect
   * would let one frame paint the previous account's unread badge to the new
   * user. The `seenToastIds` ref is reset in the polling effect below instead —
   * mutating a ref during render is not safe under concurrent rendering, and that
   * effect already keys on `userId` and runs before the first fetch.
   */
  const [renderedUserId, setRenderedUserId] = useState(userId);
  if (renderedUserId !== userId) {
    setRenderedUserId(userId);
    setNotifications([]);
    setUnreadCount(0);
    setToasts([]);
  }

  // ── Toasts ────────────────────────────────────────────────────────────────
  const dismissToast = useCallback((id) => {
    if (id) seenToastIds.current.add(id);
    setToasts((prev) => prev.filter((t) => t._id !== id));
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts((prev) => {
      prev.forEach((t) => t?._id && seenToastIds.current.add(t._id));
      return [];
    });
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await api.put("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      dismissAllToasts();
    } catch {
      // Non-blocking: the badge simply stays until the next poll.
    }
  }, [dismissAllToasts]);

  const deleteNotification = useCallback(async (id) => {
    if (!id) return;
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => {
        const removed = prev.find((n) => n._id === id);
        if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n._id !== id);
      });
      dismissToast(id);
    } catch {
      /* ignore */
    }
  }, [dismissToast]);

  const openNotification = useCallback(async (notification) => {
    if (!notification?._id) return;

    try {
      await api.put(`/notifications/${notification._id}/read`);
    } catch {
      // Marking read is best-effort; navigation should still happen.
    }

    setNotifications((prev) =>
      prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n)));
    if (!notification.read) setUnreadCount((c) => Math.max(0, c - 1));
    dismissToast(notification._id);

    const target = getNotificationTarget(notification, user);
    if (target) navigate(target);
    return target;
  }, [dismissToast, navigate, user]);

  const markNotificationRead = useCallback(async (id) => {
    if (!id) return;
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {}
    setNotifications((prev) => {
      const target = prev.find((n) => n._id === id);
      if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1));
      return prev.map((n) => (n._id === id ? { ...n, read: true } : n));
    });
    dismissToast(id);
  }, [dismissToast]);

  const decideFollowRequest = useCallback(async (notification, decision) => {
    const fromUserId = notification?.from?._id || notification?.from;
    if (!fromUserId) return;

    try {
      await api.post(
        decision === "accept"
          ? "/users/follow-requests/accept"
          : "/users/follow-requests/reject",
        { fromUserId },
      );
      await deleteNotification(notification._id);
    } catch {
      /* ignore — the request stays actionable */
    }
  }, [deleteNotification]);

  /*
   * Opening the bell is also an acknowledgement, so it marks everything read and
   * clears the toast queue in one step.
   */
  const acknowledgeAll = useCallback(() => {
    fetchNotifications();
    markAllRead();
    dismissAllToasts();
  }, [dismissAllToasts, fetchNotifications, markAllRead]);

  return useMemo(() => ({
    notifications,
    unreadCount,
    messageCount,
    toasts: toasts.slice(0, TOAST_LIMIT),
    refresh,
    acknowledgeAll,
    markAllRead,
    deleteNotification,
    openNotification,
    markNotificationRead,
    decideFollowRequest,
    dismissToast,
    dismissAllToasts,
  }), [
    notifications, unreadCount, messageCount, toasts,
    refresh, acknowledgeAll, markAllRead, deleteNotification,
    openNotification, markNotificationRead, decideFollowRequest, dismissToast, dismissAllToasts,
  ]);
}

export default useShellNotifications;
