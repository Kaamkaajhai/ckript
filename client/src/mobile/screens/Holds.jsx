import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import AppBar from "../components/app-bars/AppBar";
import NavBar from "../components/navigation/NavBar";
import Badge from "../components/badges/Badge";
import Button from "../components/buttons/Button";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import InlineMessage from "../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonRows } from "../components/feedback/Skeletons";
import ConfirmDialog from "../components/overlays/ConfirmDialog";
import MobileShell from "../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../shell/mobileShellModes";
import { useHoldsData } from "../hooks/useHoldsData";
import "./Holds.css";

/*
 * Holds — the industry viewer's options and holds (prefix: ckm-holds, plan §11
 * Phase 2 bullet 5).
 *
 * WHY THIS IS AN INDUSTRY SCREEN IN THE WRITER PHASE
 * --------------------------------------------------
 * The server decides, not preference. `holdScript` 403s any role that is not
 * investor/producer/director, and `getMyHolds` queries `{ holder: req.user._id }`
 * — so `GET /scripts/holds` returns [] for a writer unconditionally. The route
 * manifest marks this AUDIENCE.INDUSTRY and leaves every other audience on the
 * existing desktop route.
 *
 * WHAT THIS SCREEN IS, IN NATIVE TERMS (§4.2)
 * -------------------------------------------
 * A single scrolling list screen under the standard shell, not a detail stack:
 * every row already carries its own destination (the project), and there is no
 * per-hold view that would justify a second level. Rows are grouped by urgency
 * rather than filtered by a control, because the number of holds one viewer has
 * is small and a segmented filter would hide the one group that matters.
 *
 * The summary strip is a header, not a dashboard: three facts a holder needs
 * before scanning — how many are open, how many need attention this week, and
 * what is committed. It is the same "at a glance" role the dashboard's own
 * overview plays, at the size this screen earns.
 *
 * Releasing is the one mutation this collection owns. It uses the same shared
 * request as the desktop ledger and a destructive confirmation that states the
 * no-refund rule before anything changes.
 */

const money = (amount) => `₹${Number(amount || 0).toLocaleString()}`;

/* "in 3 days" / "1 day left" / "Last day". Only ever called on an open hold. */
const countdownFor = (daysLeft) => {
  if (daysLeft === null) return { text: "No end date", urgent: false };
  if (daysLeft <= 1) return { text: "Last day", urgent: true };
  return { text: `${daysLeft} days left`, urgent: daysLeft <= 7 };
};

/*
 * A date a person can read, in the viewer's own locale. Deliberately not
 * relative: "expired 2 months ago" is the countdown's job while a hold is live,
 * and a closed row wants the actual date it ended for the record.
 */
const formatDate = (date) => (
  date ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""
);

function HoldRow({ row, onAskRelease }) {
  const countdown = row.isOpen ? countdownFor(row.daysLeft) : null;

  /*
   * The whole row is the link when there is somewhere to go, so the target is
   * the row rather than the title alone — the same 44px reasoning the project
   * cards follow. A row whose script was deleted has no destination, so it is a
   * plain <div>: a link to nowhere is worse than no link.
   */
  const Surface = row.path ? Link : "div";
  const surfaceProps = row.path ? { to: row.path } : {};

  return (
    <li className="ckm-holds__item">
      <Surface
        {...surfaceProps}
        className={`ckm-holds__row${row.path ? "" : " ckm-holds__row--inert"}`}
      >
        <div className="ckm-holds__media" aria-hidden="true">
          {row.cover
            ? <img className="ckm-holds__cover" src={row.cover} alt="" loading="lazy" />
            : <Icon name="draft" size={20} color="var(--ckm-text-3)" />}
        </div>

        <div className="ckm-holds__body">
          <p className="ckm-holds__title">{row.title}</p>

          <p className="ckm-holds__meta">
            {row.writerName && <span className="ckm-holds__writer">{row.writerName}</span>}
            {row.writerName && row.genre && <span aria-hidden="true"> · </span>}
            {row.genre && <span>{row.genre}</span>}
          </p>

          <p className="ckm-holds__terms">
            <span className="ckm-holds__fee">{money(row.fee)}</span>
            <span className="ckm-holds__terms-sep" aria-hidden="true">·</span>
            <span>
              {row.isOpen
                ? <>Until {formatDate(row.endDate)}</>
                : <>Ended {formatDate(row.endDate)}</>}
            </span>
          </p>

          {row.isMissingScript && (
            // Trap 2. The hold is real and was paid for; only the project is
            // gone. Saying so is better than an untitled row that looks broken.
            <p className="ckm-holds__note">
              This project was removed by its writer. Your option record is kept.
            </p>
          )}
        </div>

        <div className="ckm-holds__state">
          {row.isOpen ? (
            <Badge
              tone={countdown.urgent ? "warning" : "neutral"}
              size="sm"
              srLabel={`Expires ${countdown.text.toLowerCase()}`}
            >
              {countdown.text}
            </Badge>
          ) : (
            <Badge tone={row.closedTone} size="sm">{row.closedLabel}</Badge>
          )}
        </div>
      </Surface>
      {row.isOpen && row.scriptId && (
        <Button
          className="ckm-holds__release"
          variant="tertiary"
          onClick={(event) => onAskRelease(row, event.currentTarget)}
        >
          Release option
        </Button>
      )}
    </li>
  );
}

export default function Holds({ user, previewState = null }) {
  const liveHolds = useHoldsData({ enabled: !previewState });
  const {
    data,
    loading,
    error,
    refresh,
    release,
    releasingId,
    releaseError,
    clearReleaseError,
  } = previewState || liveHolds;
  const [releaseTarget, setReleaseTarget] = useState(null);
  const releaseButtonRef = useRef(null);

  const closeRelease = () => {
    if (releasingId) return;
    setReleaseTarget(null);
    clearReleaseError();
  };

  const confirmRelease = async () => {
    if (await release(releaseTarget)) setReleaseTarget(null);
  };

  const askRelease = (row, opener) => {
    releaseButtonRef.current = opener;
    clearReleaseError();
    setReleaseTarget(row);
  };

  const shell = {
    mode: MOBILE_SHELL_MODE.STANDARD,
    screenId: "holds",
    className: "ckm-holds",
    scrollClassName: "ckm-holds__scroll",
    appBar: <AppBar user={user} />,
    bottomNav: <NavBar user={user} />,
    // The shell's offline banner offers a retry only to screens that can
    // honestly act on one. This screen has exactly one request, so it can.
    onConnectionRestored: refresh,
  };

  /*
   * A heading before the states, not inside each of them: the screen is the
   * same screen whether it is loading, failed or full, and a heading that
   * appears only on success moves focus order around under a screen reader.
   */
  const heading = <h1 className="ckm-holds__heading">Offers &amp; holds</h1>;

  if (loading && !data) {
    return (
      <MobileShell {...shell}>
        {heading}
        <SkeletonGroup label="Loading your holds">
          <SkeletonRows rows={4} media />
        </SkeletonGroup>
      </MobileShell>
    );
  }

  if (error && !data) {
    return (
      <MobileShell {...shell}>
        {heading}
        <InlineMessage
          variant="panel"
          tone="error"
          title="Could not load your holds"
          onRetry={refresh}
        >
          Your options are safe — this is only the list that failed to load.
        </InlineMessage>
      </MobileShell>
    );
  }

  if (!data || data.isEmpty) {
    return (
      <MobileShell {...shell}>
        {heading}
        <EmptyState
          icon="schedule"
          titleAs="h2"
          title="No holds yet"
          body="When you place a hold on a project, it appears here with its remaining time and terms."
          actions={<Button to="/search" variant="primary">Browse projects</Button>}
        />
      </MobileShell>
    );
  }

  const { summary, groups } = data;

  return (
    <MobileShell {...shell}>
      {heading}

      {/*
        * A definition list, not three divs: each figure is a term and its value,
        * which is exactly what a screen reader should hear rather than six
        * unrelated text nodes in a row.
        */}
      <dl className="ckm-holds__summary">
        <div className="ckm-holds__stat">
          <dt className="ckm-holds__stat-label">Open</dt>
          <dd className="ckm-holds__stat-value">{summary.openCount}</dd>
        </div>
        <div className="ckm-holds__stat">
          <dt className="ckm-holds__stat-label">Expiring</dt>
          <dd className={`ckm-holds__stat-value${summary.expiringCount > 0 ? " is-urgent" : ""}`}>
            {summary.expiringCount}
          </dd>
        </div>
        <div className="ckm-holds__stat">
          <dt className="ckm-holds__stat-label">Committed</dt>
          <dd className="ckm-holds__stat-value">{money(summary.committed)}</dd>
        </div>
      </dl>

      {/* An error that arrives while a good list is already on screen replaces
          nothing — it sits above the stale rows and offers the retry. */}
      {error && (
        <InlineMessage tone="warning" title="Could not refresh" onRetry={refresh}>
          Showing the holds from your last successful load.
        </InlineMessage>
      )}

      {groups.map((group) => (
        <section className="ckm-holds__group" key={group.key} aria-labelledby={`ckm-holds-${group.key}`}>
          <h2 className="ckm-holds__group-title" id={`ckm-holds-${group.key}`}>
            {group.label}
            <span className="ckm-holds__group-count">{group.rows.length}</span>
          </h2>
          <ul className="ckm-holds__list">
            {group.rows.map((row) => (
              <HoldRow
                key={row.id}
                row={row}
                onAskRelease={askRelease}
              />
            ))}
          </ul>
        </section>
      ))}

      <ConfirmDialog
        open={Boolean(releaseTarget)}
        title={`Release your option on ${releaseTarget?.title || "this project"}?`}
        message="The project goes back on the market immediately. The option fee is not refunded, and this cannot be undone."
        confirmLabel="Release option"
        cancelLabel="Keep option"
        destructive
        pending={releasingId === releaseTarget?.id}
        error={releaseError}
        onCancel={closeRelease}
        onConfirm={confirmRelease}
        returnFocusTo={releaseButtonRef}
      />
    </MobileShell>
  );
}
