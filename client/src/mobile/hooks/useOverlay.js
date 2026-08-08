import { useEffect } from "react";
import useFocusTrap from "./useFocusTrap";
import useInertBackground from "./useInertBackground";
import useScrollLock from "./useScrollLock";
import { isInert } from "./tabbable";

/*
 * useOverlay — the four things every modal surface owes the user, applied in
 * one call so no overlay can ship with three of them.
 *
 *   inert background   nothing behind the overlay is clickable, focusable, or
 *                      present in the accessibility tree
 *   focus trap         Tab cycles inside; focus returns to the opener on close
 *   scroll lock        the screen underneath holds its place
 *   Escape             closes, per the APG modal dialog pattern
 *
 * They are separate hooks because a future non-modal surface will want some and
 * not others — a toast traps nothing, a docked panel locks nothing — but a
 * modal wants all four, always, and this is the call that guarantees it.
 *
 * ---------------------------------------------------------------------------
 * Two refs, not one, and the reason is a bug this signature prevents
 * ---------------------------------------------------------------------------
 * `layerRef` is the whole overlay (scrim + surface); `surfaceRef` is just the
 * dialog. They are different elements for a reason found the hard way: the
 * scrim is a *sibling* of the surface, so an inert walk starting at the surface
 * marks the scrim inert — and an inert element fires no click events, which
 * silently removes tap-to-dismiss. The unit suite could not see it, because
 * happy-dom implements `inert` as an attribute without enforcing any of its
 * behaviour; in a real browser the scrim would simply have stopped working.
 *
 * So inertness is computed from the layer, keeping the scrim live, while the
 * focus trap is scoped to the surface, keeping the scrim out of the tab order.
 *
 * Escape is bound at the document, so it works no matter where focus sits, and
 * skips an overlay that a second overlay has stacked on top of: only the
 * topmost surface closes, which is what both the APG pattern and the browser's
 * own modal dialogs do.
 */
export default function useOverlay({
  layerRef,
  surfaceRef,
  open = false,
  onClose = null,
  closeOnEscape = true,
  initialFocus = null,
  returnFocusTo = null,
  lockScroll = true,
} = {}) {
  useInertBackground(layerRef, open);
  useFocusTrap(surfaceRef, { enabled: open, initialFocus, returnFocusTo });
  useScrollLock(open && lockScroll);

  useEffect(() => {
    if (!open || !closeOnEscape || typeof onClose !== "function") return undefined;
    const doc = surfaceRef?.current?.ownerDocument || document;
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (isInert(surfaceRef?.current)) return;
      event.preventDefault();
      onClose(event);
    };
    doc.addEventListener("keydown", onKeyDown);
    return () => doc.removeEventListener("keydown", onKeyDown);
  }, [surfaceRef, open, closeOnEscape, onClose]);
}
