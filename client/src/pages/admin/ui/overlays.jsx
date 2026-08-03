import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

/**
 * Dialog, ConfirmDialog and Drawer — the admin's three interruption surfaces.
 *
 * All three share one engine (`useOverlay`) so the accessibility contract is written once:
 *
 *   • Focus moves INTO the surface on open and is trapped there — Tab cycles, never escapes into
 *     the page underneath.
 *   • Escape closes. The backdrop closes on click for dialogs and drawers, but ConfirmDialog's
 *     destructive variant deliberately does not pass a click-through close for the confirm step.
 *   • Focus RETURNS to the element that opened the surface on close. Losing that strands keyboard
 *     users at the top of the document after every modal.
 *   • Body scroll locks while open, compensating for the scrollbar so the page doesn't shift.
 *
 * Rendered through a portal: inside the DOM tree an ancestor's transform or overflow would clip a
 * fixed overlay (the same trap the landing's mobile menu documents).
 */

const FOCUSABLE = [
  "a[href]", "button:not([disabled])", "input:not([disabled])", "select:not([disabled])",
  "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

function useOverlay({ open, onClose, panelRef }) {
  const restoreRef = useRef(null);

  const onKeyDown = useCallback((event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose?.();
      return;
    }
    if (event.key !== "Tab") return;

    // The trap: keep Tab inside the panel in both directions.
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!focusables.length) { event.preventDefault(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }, [onClose, panelRef]);

  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;

    // Scroll lock with scrollbar compensation, so content behind doesn't jump sideways.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    // Focus the first focusable, or the panel itself for content-only surfaces.
    const panel = panelRef.current;
    const target = panel?.querySelector(FOCUSABLE) || panel;
    target?.focus?.();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      restoreRef.current?.focus?.();
    };
  }, [open, panelRef]);

  return onKeyDown;
}

function OverlayShell({ open, onClose, onKeyDown, labelledBy, kind, children, panelRef, closeOnBackdrop = true }) {
  if (!open) return null;
  // Portals land on document.body, outside the .ckad scope — so the tokens (and the active theme)
  // must travel with the portal root or every overlay renders unthemed.
  const theme = document.querySelector(".ckad")?.getAttribute("data-theme") || undefined;
  return createPortal(
    // The keydown listener lives on the container so it catches events from every child; it is not
    // itself interactive — the backdrop button below carries the click affordance.
    <div className={`ckad ado ado--${kind}`} data-theme={theme} onKeyDown={onKeyDown}>
      <button
        type="button"
        className="ado-backdrop"
        aria-label="Close"
        tabIndex={-1}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={panelRef}
        className="ado-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Dialog({ open, onClose, title, footer = null, width = 560, children }) {
  const panelRef = useRef(null);
  const onKeyDown = useOverlay({ open, onClose, panelRef });
  const titleId = useId();

  return (
    <OverlayShell open={open} onClose={onClose} onKeyDown={onKeyDown} labelledBy={titleId} kind="dialog" panelRef={panelRef}>
      <div className="ado-card" style={{ maxWidth: width }}>
        <header className="ado-head">
          <h2 className="ado-title" id={titleId}>{title}</h2>
          <Button variant="ghost" size="sm" iconOnly onClick={onClose} icon={<span aria-hidden="true">✕</span>}>
            Close
          </Button>
        </header>
        <div className="ado-body">{children}</div>
        {footer ? <footer className="ado-foot">{footer}</footer> : null}
      </div>
    </OverlayShell>
  );
}

/**
 * The two-button confirm. `danger` styles the confirming action; the cancel button takes initial
 * focus on destructive confirms so a reflexive Enter cannot delete anything.
 */
export function ConfirmDialog({
  open, onClose, onConfirm,
  title = "Are you sure?",
  body = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
}) {
  const cancelRef = useRef(null);
  useEffect(() => {
    if (open && danger) cancelRef.current?.focus();
  }, [open, danger]);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      width={440}
      footer={(
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      {body ? <p className="ado-copy">{body}</p> : null}
    </Dialog>
  );
}

/**
 * Slide-over drawer — detail and edit surfaces that keep the table visible behind them, which is
 * the workflow win over navigating away: the admin never loses their place in the list.
 */
export function Drawer({ open, onClose, title, footer = null, width = 480, side = "right", children }) {
  const panelRef = useRef(null);
  const onKeyDown = useOverlay({ open, onClose, panelRef });
  const titleId = useId();

  return (
    <OverlayShell open={open} onClose={onClose} onKeyDown={onKeyDown} labelledBy={titleId} kind={side === "left" ? "drawer-left" : "drawer"} panelRef={panelRef}>
      <div className="ado-sheet" style={{ width }}>
        <header className="ado-head">
          <h2 className="ado-title" id={titleId}>{title}</h2>
          <Button variant="ghost" size="sm" iconOnly onClick={onClose} icon={<span aria-hidden="true">✕</span>}>
            Close
          </Button>
        </header>
        <div className="ado-body ado-body--scroll">{children}</div>
        {footer ? <footer className="ado-foot">{footer}</footer> : null}
      </div>
    </OverlayShell>
  );
}
