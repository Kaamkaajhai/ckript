import { useEffect } from "react";
import { createPortal } from "react-dom";

/*
 * The confirmation in front of the two irreversible things this page can do:
 * releasing a live option (the fee is not refunded) and spending a reveal
 * credit. Both are one call away, so both get a stop.
 *
 * A portal for the same reason as the drawer — the shell's content area clips
 * its children.
 */
const LedgerConfirmDialog = ({
  open,
  eyebrow,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  submitting,
  error,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape" && !submitting) onCancel(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="ck-ledger-portal ck-ledger-portal--dialog">
      <button
        type="button"
        className="ck-ledger-portal__scrim"
        aria-label="Close dialog"
        onClick={submitting ? undefined : onCancel}
      />

      <div className="ck-ledger-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ck-ledger-dialog__head">
          <p className="ck-ledger-dialog__eyebrow">{eyebrow}</p>
          <h2 className="ck-ledger-dialog__title">{title}</h2>
          <p className="ck-ledger-dialog__body">{body}</p>
        </div>

        {error && <div className="ck-ledger-dialog__error" role="alert">{error}</div>}

        <div className="ck-ledger-dialog__foot">
          <button type="button" onClick={onCancel} disabled={submitting}>{cancelLabel}</button>
          <button type="button" className="is-confirm" onClick={onConfirm} disabled={submitting}>
            {submitting && <span className="ck-ledger-dialog__spinner" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default LedgerConfirmDialog;
