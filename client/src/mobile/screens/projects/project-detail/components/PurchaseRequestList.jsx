import Badge from "../../../../components/badges/Badge";
import Button from "../../../../components/buttons/Button";
import SkeletonGroup, { SkeletonShape } from "../../../../components/feedback/Skeletons";
import { describeRequestRow } from "../projectDetailModel";

/*
 * PurchaseRequestList — the asks waiting on the writer's own project (D29).
 *
 * Presentational on purpose. It owns no overlay and makes no request: the screen holds the
 * confirmation state because `.ckm-root` is the overlay's positioning context, and an overlay
 * rendered inside the scrolling `<main>` would be positioned against the scroll CONTENT rather
 * than the frame — it would sit at the top of the document and scroll away with it.
 *
 * Every row states its own outcome even when there is nothing left to decide. A writer opening
 * this a week later needs to see that a request was approved and never paid for, because that is
 * the state that is still holding their project.
 */
const relativeDay = (value) => {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export default function PurchaseRequestList({
  requests = [],
  loading = false,
  decidingId = null,
  onApprove = null,
  onDecline = null,
}) {
  if (loading && requests.length === 0) {
    return (
      <SkeletonGroup label="Loading purchase requests">
        <SkeletonShape height={92} radius="var(--ckm-r-lg)" />
        <SkeletonShape height={92} radius="var(--ckm-r-lg)" />
      </SkeletonGroup>
    );
  }

  if (requests.length === 0) {
    return <p className="ckm-project__muted">No one has asked to buy this project yet.</p>;
  }

  return (
    <ul className="ckm-project__requests">
      {requests.map((request) => {
        const row = describeRequestRow(request);
        const busy = decidingId === row.id;
        return (
          <li className="ckm-project__request" key={row.id}>
            <div className="ckm-project__request-head">
              <p className="ckm-project__request-name">{row.name}</p>
              <Badge tone={row.tone} size="sm">{row.statusLabel}</Badge>
            </div>
            <p className="ckm-project__request-meta">
              {[row.role, row.amount, relativeDay(row.createdAt)].filter(Boolean).join(" · ")}
            </p>
            {row.note && <p className="ckm-project__request-note">“{row.note}”</p>}
            {row.decidable && (
              /*
               * Decline first in the DOM, approve second — but approve is the primary. The order
               * is the ConfirmDialog rule applied to a list: the less consequential control is
               * the one a reflex tap and the first Tab stop reach, and here approving is what
               * locks the project to one buyer for three days.
               */
              <div className="ckm-project__request-actions">
                <Button
                  variant="tertiary"
                  size="sm"
                  disabled={busy}
                  onClick={() => onDecline?.(row)}
                >
                  Decline
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  pending={busy}
                  pendingLabel="Working…"
                  onClick={() => onApprove?.(row)}
                >
                  Approve
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
