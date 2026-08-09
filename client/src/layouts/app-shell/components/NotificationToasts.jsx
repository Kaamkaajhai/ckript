import { useState, useEffect } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { MatIcon } from "../navigation/icons.jsx";
import {
  timeAgo,
  notificationIcon,
  isDecisionNotification,
} from "./notificationPresentation";
import { getNotificationActionLabel } from "../hooks/notificationTargets";

const ENTER = { opacity: 0, x: 60, scale: 0.92 };
const SETTLED = { opacity: 1, x: 0, scale: 1 };
const EXIT = { opacity: 0, x: 80, scale: 0.9 };
const SPRING = { type: "spring", stiffness: 200, damping: 26 };

const ToastItem = ({ notification, onOpen, onDismiss, onExplicitDismiss, onDecideFollowRequest }) => {
  const [showModal, setShowModal] = useState(false);
  const isLong = notification.message && notification.message.length > 120;

  useEffect(() => {
    if (showModal) return;
    const timer = setTimeout(() => {
      onDismiss(notification._id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification._id, onDismiss, showModal]);

  return (
    <>
      <Motion.div
        initial={ENTER}
        animate={SETTLED}
        exit={EXIT}
        transition={SPRING}
        className="ck-notif-popup__card"
        role="status"
      >
        <div className="ck-notif-popup__row">
          <div className="ck-notif-item__icon">
            <MatIcon name={notificationIcon(notification.type)} size={18} />
          </div>

          <div className="ck-notif-popup__main">
            <p className={`ck-notif-popup__text ${isLong ? "is-clamped" : ""}`}>
              {notification.from?.name && <span>{notification.from.name} </span>}
              {notification.message}
            </p>
            <p className="ck-notif-popup__time">{timeAgo(notification.createdAt)}</p>

            <div className="ck-notif-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {isLong && (
                <button
                  type="button"
                  className="ck-btn ck-btn--ghost ck-btn--sm"
                  onClick={() => setShowModal(true)}
                >
                  View more
                </button>
              )}
              {isDecisionNotification(notification) ? (
                <>
                  <button
                    type="button"
                    className="ck-btn ck-btn--solid ck-btn--sm"
                    onClick={() => onDecideFollowRequest(notification, "accept")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="ck-btn ck-btn--ghost ck-btn--sm"
                    onClick={() => onDecideFollowRequest(notification, "reject")}
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ck-btn ck-btn--solid ck-btn--sm"
                  onClick={() => onOpen(notification)}
                >
                  {getNotificationActionLabel(notification)}
                </button>
              )}
              <button
                type="button"
                className="ck-btn ck-btn--ghost ck-btn--sm"
                onClick={() => (onExplicitDismiss ? onExplicitDismiss(notification._id) : onDismiss(notification._id))}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </Motion.div>

      {showModal && (
        <div
          className="ck-notif-full-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="ck-notif-full-modal__surface" role="dialog" aria-modal="true">
            <h3>Notification</h3>
            <p>
              {notification.from?.name && <strong>{notification.from.name} </strong>}
              {notification.message}
            </p>
            <div className="ck-notif-full-modal__actions">
               {isDecisionNotification(notification) ? (
                <>
                  <button
                    type="button"
                    className="ck-btn ck-btn--solid ck-btn--sm"
                    style={{ marginRight: 8 }}
                    onClick={() => { setShowModal(false); onDecideFollowRequest(notification, "accept"); }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="ck-btn ck-btn--ghost ck-btn--sm"
                    style={{ marginRight: 8 }}
                    onClick={() => { setShowModal(false); onDecideFollowRequest(notification, "reject"); }}
                  >
                    Reject
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ck-btn ck-btn--solid ck-btn--sm"
                  style={{ marginRight: 8 }}
                  onClick={() => { setShowModal(false); onOpen(notification); }}
                >
                  {getNotificationActionLabel(notification)}
                </button>
              )}
              <button type="button" className="ck-btn ck-btn--ghost ck-btn--sm" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * @param {Object} props
 * @param {Array} props.toasts
 * @param {Function} props.onOpen
 * @param {Function} props.onDismiss
 * @param {Function} props.onExplicitDismiss
 * @param {Function} props.onDecideFollowRequest
 */
const NotificationToasts = ({ toasts = [], onOpen, onDismiss, onExplicitDismiss, onDecideFollowRequest }) => (
  <div className="ck-notif-popup">
    <AnimatePresence initial={false}>
      {toasts.map((notification) => (
        <ToastItem
          key={notification._id}
          notification={notification}
          onOpen={onOpen}
          onDismiss={onDismiss}
          onExplicitDismiss={onExplicitDismiss}
          onDecideFollowRequest={onDecideFollowRequest}
        />
      ))}
    </AnimatePresence>
  </div>
);

export default NotificationToasts;
