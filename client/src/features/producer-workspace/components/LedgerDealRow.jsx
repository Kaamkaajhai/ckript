import { Link } from "react-router-dom";
import { MatIcon } from "../../../layouts/app-shell/navigation/icons.jsx";

/*
 * One entry in the deal book: an option the viewer holds, or a purchase request
 * they have sent. Both are the same card — the difference is the eyebrow, the
 * figures and which actions the overflow menu can honestly offer.
 *
 * Every action here is real. The menu deliberately shows an action it cannot
 * perform as DISABLED with a reason rather than hiding it, so the row does not
 * change shape between a live option and a settled one; and nothing in it is a
 * no-op — an entry only exists when there is an endpoint or a route behind it.
 */
const LedgerDealRow = ({
  deal,
  scriptPath,
  menuOpen,
  onToggleMenu,
  onOpen,
  onMessage,
  onReveal,
  onToggleWatch,
  onDownloadPdf,
  onRelease,
  isWatched,
  locked,
  contactsBlocked,
  contactRevealed,
}) => {
  const classes = [
    "ck-ledger__deal",
    `ck-ledger-tone--${deal.tone}`,
    deal.urgent && "ck-ledger__deal--urgent",
    deal.status === "converted" && "ck-ledger__deal--converted",
  ].filter(Boolean).join(" ");

  const item = (icon, label, onClick, options = {}) => ({
    icon, label, onClick, ...options,
  });

  const actions = [
    item("open_in_new", "Open project page", () => onOpen(deal), { as: "link", to: scriptPath, disabled: !scriptPath }),
    item("forum", deal.writer ? `Message ${deal.writer.split(" ")[0]}` : "Message writer", () => onMessage(deal), {
      disabled: locked || !deal.writerId,
      title: locked ? "Renew access to message writers" : "",
    }),
    item(
      "visibility",
      contactRevealed ? "Contact already revealed" : contactsBlocked ? "Contact quota reached" : "Reveal contact · 1 credit",
      () => onReveal(deal),
      {
        disabled: locked || contactsBlocked || contactRevealed || !deal.writerId,
        title: contactsBlocked ? "No reveal credits left this cycle" : "",
      },
    ),
    item(
      isWatched ? "bookmark_remove" : "bookmark_add",
      isWatched ? "Remove from watchlist" : "Add to watchlist",
      () => onToggleWatch(deal),
      { disabled: !deal.scriptId },
    ),
    item("picture_as_pdf", "Download acceptance PDF", () => onDownloadPdf(deal), {
      disabled: !deal.canDownloadPdf,
      title: deal.canDownloadPdf ? "" : "Available once the writer approves the request",
    }),
    item("delete", "Cancel option", () => onRelease(deal), {
      danger: true,
      disabled: !deal.canRelease || locked,
      title: deal.canRelease ? "" : "Only a live option can be released",
    }),
  ];

  return (
    <article className={classes}>
      <span className="ck-ledger__marker" aria-hidden="true">{deal.marker}</span>

      <div className="ck-ledger__deal-main">
        <div className="ck-ledger__deal-top">
          <small className="ck-ledger__deal-kind">{deal.kindLabel}</small>
          <span className="ck-ledger__pill">{deal.statusLabel}</span>
        </div>
        <h3 className="ck-ledger__deal-title" title={deal.title}>{deal.title}</h3>
        <p className="ck-ledger__deal-meta">{deal.metaLine}</p>
      </div>

      <div className="ck-ledger__deal-right">
        <div className="ck-ledger__deal-figures">
          <div className="ck-ledger__deal-fee">{deal.feeText}</div>
          <div className="ck-ledger__deal-date">{deal.dateText}</div>
        </div>

        <button type="button" className="ck-ledger__deal-open" onClick={() => onOpen(deal)}>
          {deal.primaryLabel}
        </button>

        <div className="ck-ledger__menu-anchor">
          <button
            type="button"
            className="ck-ledger__kebab"
            aria-label={`More actions for ${deal.title}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => onToggleMenu(deal)}
          >
            <MatIcon name="more_vert" size={19} />
          </button>

          {menuOpen && (
            <div className="ck-ledger__menu ck-ledger__menu--row" role="menu">
              {actions.map((action) => {
                const className = `ck-ledger__menu-item${action.danger ? " ck-ledger__menu-item--danger" : ""}`;
                if (action.as === "link" && !action.disabled) {
                  return (
                    <Link key={action.label} to={action.to} role="menuitem" className={className}>
                      <MatIcon name={action.icon} size={17} />
                      {action.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={action.label}
                    type="button"
                    role="menuitem"
                    className={className}
                    disabled={action.disabled}
                    title={action.title || undefined}
                    onClick={action.onClick}
                  >
                    <MatIcon name={action.icon} size={17} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default LedgerDealRow;
