import { AnimatePresence, motion } from "framer-motion";
import Icon from "../../components/Icon";
import "./NotificationsPanel.css";

/*
 * NotificationsPanel — a popover that drops from under the bell (reference
 * screen 04). Unread rows are tinted; "Mark all read" clears them. Dismisses
 * on scrim tap. State is owned by the shell so the bell badge stays in sync.
 */
export default function NotificationsPanel({ open, onClose, items, onMarkAllRead }) {
  const unread = items.filter((n) => n.unread).length;

  return (
    <AnimatePresence>
      {open && (
        <div className="ckm-noti__layer">
          <motion.div
            className="ckm-noti__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className="ckm-noti"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 460, damping: 32 }}
          >
            <div className="ckm-noti__head">
              <span className="ckm-noti__title">
                Notifications <span className="ckm-noti__count">({items.length})</span>
              </span>
              <button
                type="button"
                className="ckm-noti__markall"
                onClick={onMarkAllRead}
                disabled={!unread}
              >
                Mark all read
              </button>
            </div>
            <div className="ckm-noti__list">
              {items.map((n) => (
                <div key={n.id} className={`ckm-noti__item${n.unread ? " is-unread" : ""}`}>
                  <span className={`ckm-noti__icon${n.unread ? " is-unread" : ""}`}>
                    <Icon name={n.icon} size={17} />
                  </span>
                  <div className="ckm-noti__body">
                    <p className="ckm-noti__text" dangerouslySetInnerHTML={{ __html: n.html }} />
                    <p className="ckm-noti__time">{n.time}</p>
                  </div>
                  {n.unread && <span className="ckm-noti__unread-dot" />}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
