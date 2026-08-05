/*
 * NotificationBell — the header bell, its unread badge and the panel it opens.
 *
 * Extracted from the topbar, where the panel was ~120 lines of JSX carrying
 * fifteen inline `style={{…}}` objects with hard-coded hex colours. Every one of
 * those is now a class in app-shell.css, so the panel re-themes with the rest of
 * the shell instead of pinning its own palette.
 */
import { useEffect, useRef } from "react";
import { MatIcon } from "../navigation/icons.jsx";
import { timeAgo, notificationIcon, isDecisionNotification } from "./notificationPresentation";

const formatCount = (value) => (value > 9 ? "9+" : String(value));

const NotificationRow = ({ notification, onOpen, onDelete, onDecide }) => (
  <div
    className={`ck-notif-item${notification.read ? "" : " is-unread"}`}
    onClick={() => onOpen(notification)}
    role="button"
    tabIndex={0}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen(notification);
      }
    }}
  >
    <div className="ck-notif-item__icon">
      <MatIcon name={notificationIcon(notification.type)} size={18} />
    </div>

    <div className="ck-notif-item__main">
      <div className="ck-notif-item__text">
        {notification.from?.name && (
          <strong className="ck-notif-item__actor">{notification.from.name} </strong>
        )}
        {notification.message}
        {notification.script?.title && (
          <strong className="ck-notif-item__actor"> “{notification.script.title}”</strong>
        )}
      </div>
      <div className="ck-notif-item__time">{timeAgo(notification.createdAt)}</div>

      {isDecisionNotification(notification) && (
        // Stop propagation so deciding does not also fire the row's navigation.
        <div className="ck-notif-actions" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="ck-btn ck-btn--solid ck-btn--sm"
            onClick={() => onDecide(notification, "accept")}
          >
            Approve
          </button>
          <button
            type="button"
            className="ck-btn ck-btn--ghost ck-btn--sm"
            onClick={() => onDecide(notification, "reject")}
          >
            Reject
          </button>
        </div>
      )}
    </div>

    <button
      type="button"
      className="ck-notif-item__dismiss"
      onClick={(event) => {
        event.stopPropagation();
        onDelete(notification._id);
      }}
      aria-label="Dismiss notification"
    >
      <MatIcon name="close" size={16} />
    </button>
  </div>
);

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onToggle
 * @param {Function} props.onClose
 * @param {Array} props.notifications
 * @param {number} props.unreadCount
 * @param {Function} props.onMarkAllRead
 * @param {Function} props.onOpenNotification
 * @param {Function} props.onDeleteNotification
 * @param {Function} props.onDecideFollowRequest
 */
const NotificationBell = ({
  open,
  onToggle,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAllRead,
  onOpenNotification,
  onDeleteNotification,
  onDecideFollowRequest,
}) => {
  const containerRef = useRef(null);

  /*
   * Close on an outside click or Escape. This lived in the shell as a document
   * listener wired to a ref passed down as a prop; owning it here means the
   * behaviour travels with the component instead of having to be re-wired by
   * every shell that renders a bell.
   */
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className="ck-header__slot" ref={containerRef}>
      <button
        type="button"
        className="ck-header__bell"
        onClick={onToggle}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
      >
        <MatIcon name="bell" size={22} />
        {unreadCount > 0 && (
          <span className="ck-header__bell-badge">{formatCount(unreadCount)}</span>
        )}
      </button>

      {open && (
        <div className="ck-notif-panel" role="dialog" aria-label="Notifications">
          <div className="ck-notif-panel__head">
            <span className="ck-notif-panel__title">
              Notifications
              {unreadCount > 0 && (
                <span className="ck-notif-panel__count">({unreadCount})</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button type="button" className="ck-link-btn" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="ck-notif-panel__body">
            {notifications.length === 0 ? (
              <div className="ck-notif-panel__empty">All caught up</div>
            ) : (
              notifications.map((notification) => (
                <NotificationRow
                  key={notification._id}
                  notification={notification}
                  onOpen={onOpenNotification}
                  onDelete={onDeleteNotification}
                  onDecide={onDecideFollowRequest}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
