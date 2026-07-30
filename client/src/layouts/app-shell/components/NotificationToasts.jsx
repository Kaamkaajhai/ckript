/*
 * NotificationToasts — the transient card that slides in when something arrives
 * while the user is on the page.
 *
 * Extracted from the shell, where it was ~60 lines of JSX with every colour,
 * radius and padding written inline. Same classes as the panel now, so a toast
 * and its panel row cannot look like they came from different products.
 */
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

/**
 * @param {Object} props
 * @param {Array} props.toasts
 * @param {Function} props.onOpen
 * @param {Function} props.onDismiss
 * @param {Function} props.onDecideFollowRequest
 */
const NotificationToasts = ({ toasts = [], onOpen, onDismiss, onDecideFollowRequest }) => (
  <div className="ck-notif-popup">
    <AnimatePresence initial={false}>
      {toasts.map((notification) => (
        <Motion.div
          key={notification._id}
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
              <p className="ck-notif-popup__text">
                {notification.from?.name && <span>{notification.from.name} </span>}
                {notification.message}
              </p>
              <p className="ck-notif-popup__time">{timeAgo(notification.createdAt)}</p>

              <div className="ck-notif-actions">
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
                  onClick={() => onDismiss(notification._id)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </Motion.div>
      ))}
    </AnimatePresence>
  </div>
);

export default NotificationToasts;
