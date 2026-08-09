import Icon from "../../components/Icon";
import Button from "../../components/buttons/Button";
import EmptyState from "../../components/EmptyState";
import Sheet from "../../components/overlays/Sheet";
import {
  timeAgo,
  notificationIcon,
  isDecisionNotification,
} from "../../../layouts/app-shell/components/notificationPresentation";
import "./NotificationsPanel.css";

/*
 * NotificationsPanel — the writer's real notifications.
 *
 * 2026-08-07 (plan §11 Phase 2). What this replaces was a hand-written array of
 * three rows in `data/dashboardData.js` — "Meera K. liked Nocturne" — shipped
 * to every account and rendered through `dangerouslySetInnerHTML`. The bell
 * badge counted them, so it was a real-looking number about nothing.
 *
 * The data and every mutation now come from `useShellNotifications`, the same
 * hook the desktop shell uses (plan §5.4: shared logic, not a second copy with
 * its own bugs). Presentation helpers — `timeAgo`, the type → glyph map, the
 * follow-request test — are shared too, so the same notification cannot show a
 * different icon on a phone than on a laptop.
 *
 * It is a `Sheet` rather than an anchored popover: a dropdown hanging off a bell
 * is a pointer affordance, and on a 320px phone it is a full-width panel with a
 * decorative arrow. A sheet is the native equivalent, and it brings the focus
 * trap, scroll lock and inert background the old popover had none of.
 */
export default function NotificationsPanel({
  open,
  onClose,
  items = [],
  unreadCount = 0,
  onMarkAllRead,
  onOpen,
  onDelete,
  onDecide,
  returnFocusTo = null,
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Notifications"
      description={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
      returnFocusTo={returnFocusTo}
      headerAction={unreadCount > 0 ? (
        <Button variant="tertiary" size="md" onClick={onMarkAllRead}>
          Mark all read
        </Button>
      ) : null}
      className="ckm-noti__sheet"
    >
      {items.length === 0 ? (
        <EmptyState
          icon="notifications"
          title="Nothing new"
          body="Likes, follows, offers and score results land here."
        />
      ) : (
        <ul className="ckm-noti__list">
          {items.map((n) => (
            <li key={n._id} className={`ckm-noti__item${n.read ? "" : " is-unread"}`}>
              <span className={`ckm-noti__icon${n.read ? "" : " is-unread"}`} aria-hidden="true">
                <Icon name={notificationIcon(n.type)} size={18} />
              </span>

              <div className="ckm-noti__body">
                {/*
                 * The whole row navigates, and its ::after covers the row — so
                 * Dismiss and the two decision buttons stay siblings rather than
                 * being nested inside it, which would be invalid and would
                 * swallow their taps.
                 */}
                <button type="button" className="ckm-noti__open" onClick={() => onOpen?.(n)}>
                  <span className="ckm-noti__text">
                    {n.from?.name && <b>{n.from.name} </b>}
                    {n.message}
                    {n.script?.title && <b> “{n.script.title}”</b>}
                  </span>
                  <span className="ckm-noti__time">{timeAgo(n.createdAt)}</span>
                </button>

                {isDecisionNotification(n) && (
                  <div className="ckm-noti__actions">
                    <Button variant="primary" size="md" onClick={() => onDecide?.(n, "accept")}>
                      Approve
                    </Button>
                    <Button variant="secondary" size="md" onClick={() => onDecide?.(n, "reject")}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="ckm-noti__dismiss"
                onClick={() => onDelete?.(n._id)}
                aria-label={`Dismiss: ${n.message || "notification"}`}
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
