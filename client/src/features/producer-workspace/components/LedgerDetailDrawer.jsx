import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { MatIcon } from "../../../layouts/app-shell/navigation/icons.jsx";
import { buildActivity, formatInr, getInitials } from "../producerLedger";

/*
 * The record behind a row. It is a reading surface, not a second place to
 * transact: the money-moving flows (offer, payment, terms) live on the script's
 * own page and are reached from the footer, so this drawer never duplicates
 * that logic.
 *
 * Rendered in a portal because the app shell's content area is `overflow:
 * hidden` — an absolutely positioned drawer inside it would be clipped by the
 * page's own scroll container.
 */
const LedgerDetailDrawer = ({
  deal,
  scriptPath,
  messagePath,
  writerPath,
  contactRevealed,
  locked,
  meetingsBlocked,
  onClose,
  onMeeting,
  onRelease,
  onDownloadPdf,
}) => {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!deal) return null;

  const activity = buildActivity(deal);
  const figures = [
    { label: deal.kind === "option" ? "Option fee" : "Offer", value: formatInr(deal.fee) },
    { label: "AI score", value: deal.score == null ? "—" : String(deal.score) },
    {
      label: deal.kind === "option" ? "Days left" : "Status",
      value: deal.kind === "option"
        ? (deal.daysRemaining == null ? "—" : String(deal.daysRemaining))
        : deal.statusLabel,
    },
  ];

  return createPortal(
    <div className="ck-ledger-portal">
      <button type="button" className="ck-ledger-portal__scrim" aria-label="Close details" onClick={onClose} />

      <div className="ck-ledger-drawer" role="dialog" aria-modal="true" aria-label={`${deal.title} — deal record`}>
        <header className="ck-ledger-drawer__head">
          <div className="ck-ledger-drawer__head-body">
            <p className="ck-ledger-drawer__kind">{deal.kindLabel}</p>
            <h2 className="ck-ledger-drawer__title">{deal.title}</h2>
            <p className="ck-ledger-drawer__meta">{deal.metaLine}</p>
          </div>
          <button type="button" className="ck-ledger-drawer__close" aria-label="Close" onClick={onClose}>
            <MatIcon name="close" size={19} />
          </button>
        </header>

        <div className="ck-ledger-drawer__body">
          <div className="ck-ledger-drawer__logline">
            <div className="ck-ledger-drawer__cover">
              {deal.script?.coverImage || deal.script?.thumbnailUrl
                ? <img src={deal.script.coverImage || deal.script.thumbnailUrl} alt="" />
                : <MatIcon name="description" size={24} />}
            </div>
            <p>
              {deal.logline || "No logline on file for this project yet."}
            </p>
          </div>

          <div className="ck-ledger-drawer__figures">
            {figures.map((figure) => (
              <div key={figure.label} className="ck-ledger-drawer__figure">
                <div className="ck-ledger-drawer__figure-label">{figure.label}</div>
                <div className="ck-ledger-drawer__figure-value">{figure.value}</div>
              </div>
            ))}
          </div>

          {deal.writerId && (
            <div className="ck-ledger-drawer__writer">
              <div className="ck-ledger-drawer__writer-top">
                <span className="ck-ledger__avatar">{getInitials(deal.writer)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ck-ledger-drawer__writer-name">{deal.writer || "Writer"}</div>
                  <div className="ck-ledger-drawer__writer-line">
                    {contactRevealed ? "Contact revealed" : "Contact not revealed"}
                  </div>
                </div>
                {writerPath && (
                  <Link to={writerPath} aria-label="Open writer profile" style={{ color: "#a39d92" }}>
                    <MatIcon name="open_in_new" size={19} />
                  </Link>
                )}
              </div>
              <p className="ck-ledger-drawer__writer-note">
                {contactRevealed
                  ? "Email and phone are on the writer's profile."
                  : "Reveal a contact from the row menu to see email and phone."}
              </p>
              <div className="ck-ledger-drawer__writer-actions">
                {locked || !messagePath
                  ? <button type="button" disabled>Message</button>
                  : <Link to={messagePath}>Message</Link>}
                <button
                  type="button"
                  onClick={() => onMeeting(deal)}
                  disabled={locked || meetingsBlocked || !deal.scriptId}
                  title={meetingsBlocked ? "Meeting quota reached for this cycle" : undefined}
                >
                  {meetingsBlocked ? "Meeting quota reached" : "Schedule meeting"}
                </button>
              </div>
            </div>
          )}

          {activity.length > 0 && (
            <div>
              <div className="ck-ledger-drawer__activity-label">Activity</div>
              <div>
                {activity.map((event, index) => (
                  <div
                    key={`${event.text}-${index}`}
                    className={`ck-ledger-drawer__event ck-ledger-tone--${event.tone}`}
                  >
                    <span className="ck-ledger-drawer__event-rail" aria-hidden="true" />
                    <div>
                      <div className="ck-ledger-drawer__event-text">{event.text}</div>
                      <div className="ck-ledger-drawer__event-when">{event.when}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="ck-ledger-drawer__foot">
          {scriptPath ? (
            <Link to={scriptPath} className="ck-ledger-drawer__primary">
              <MatIcon name="open_in_new" size={18} />
              Open project page
            </Link>
          ) : (
            <button type="button" className="ck-ledger-drawer__primary" disabled>
              Project page unavailable
            </button>
          )}
          <div className="ck-ledger-drawer__secondary">
            <button
              type="button"
              onClick={() => onDownloadPdf(deal)}
              disabled={!deal.canDownloadPdf}
              title={deal.canDownloadPdf ? undefined : "Available once the writer approves the request"}
            >
              Acceptance PDF
            </button>
            <button
              type="button"
              className="is-danger"
              onClick={() => onRelease(deal)}
              disabled={!deal.canRelease || locked}
              title={deal.canRelease ? undefined : "Only a live option can be released"}
            >
              Cancel option
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default LedgerDetailDrawer;
