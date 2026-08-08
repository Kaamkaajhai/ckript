import { useEffect, useRef } from "react";
import { canReceiveFocus, firstTabbableWithin, isInert, tabbableWithin } from "./tabbable";

/*
 * useFocusTrap — keep focus inside an open overlay, and put it back afterwards.
 *
 * Paired with `useInertBackground`, which does the heavy lifting: once the
 * background is inert, there is almost nothing left outside the overlay for Tab
 * to reach, so this hook is the small, checkable remainder rather than a
 * re-implementation of the browser's focus model. It owns three things.
 *
 * 1. Where focus starts. An explicit `initialFocus` wins; otherwise the first
 *    tabbable element; otherwise the container itself (which is why the
 *    container must carry tabIndex={-1}). Focus is set with `preventScroll`
 *    so opening a sheet does not jump its body to the first control.
 *
 * 2. The wrap. Tab from the last element goes to the first and Shift+Tab from
 *    the first goes to the last (APG modal dialog pattern). The list is
 *    recomputed on every keystroke, because an overlay's contents change while
 *    it is open — a form grows an error, a pending button becomes a link.
 *
 * 3. Where focus goes back to. §18 requires this and it is the part most often
 *    skipped: on close, focus returns to the control that opened the overlay.
 *    If that control is gone — deleted by the very action the dialog confirmed,
 *    which is the common case, not the exotic one — the remembered node is no
 *    longer connected, so the hook falls back to the surface the user is left
 *    looking at instead of dropping focus on <body> and sending a screen-reader
 *    user back to the top of the screen.
 *
 * The trap is driven by `enabled`, not by mount, so focus returns the moment a
 * close is requested rather than after the exit animation has finished playing.
 */
export default function useFocusTrap(ref, {
  enabled = true,
  initialFocus = null,
  returnFocusTo = null,
  fallbackFocusSelector = ".ckm-shell__scroll",
} = {}) {
  // Read through a ref so a caller re-rendering with a new inline object cannot
  // tear the trap down and rebuild it mid-interaction. The ref is seeded at
  // first render and refreshed in an effect declared *before* the trap's own,
  // so it is already current by the time the trap reads it — writing it during
  // render would be a violation, not a shortcut.
  const optionsRef = useRef({ initialFocus, returnFocusTo, fallbackFocusSelector });
  useEffect(() => {
    optionsRef.current = { initialFocus, returnFocusTo, fallbackFocusSelector };
  });

  useEffect(() => {
    const container = ref?.current;
    if (!enabled || !container) return undefined;

    const doc = container.ownerDocument || document;
    const previouslyFocused = doc.activeElement;

    const target = resolve(optionsRef.current.initialFocus)
      || firstTabbableWithin(container)
      || container;
    target.focus?.({ preventScroll: true });

    const onKeyDown = (event) => {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const tabbables = tabbableWithin(container);

      // Nothing to land on: hold focus on the container rather than letting
      // Tab walk out into a background the user cannot see.
      if (tabbables.length === 0) {
        event.preventDefault();
        container.focus?.({ preventScroll: true });
        return;
      }

      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      const active = doc.activeElement;

      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    // Focus can also leave without a Tab — a script, or the user tabbing out to
    // the browser's own UI and back in. Pull it home, unless this overlay has
    // itself been made inert by a second overlay stacked on top of it, in which
    // case the newer trap is the one that should be winning.
    const onFocusIn = (event) => {
      if (container.contains(event.target) || isInert(container)) return;
      const restoreTo = firstTabbableWithin(container) || container;
      restoreTo.focus?.({ preventScroll: true });
    };

    doc.addEventListener("keydown", onKeyDown, true);
    doc.addEventListener("focusin", onFocusIn, true);

    return () => {
      doc.removeEventListener("keydown", onKeyDown, true);
      doc.removeEventListener("focusin", onFocusIn, true);

      const { returnFocusTo: declared, fallbackFocusSelector: fallbackSelector } = optionsRef.current;
      const explicit = resolve(declared);
      if (canReceiveFocus(explicit)) {
        explicit.focus();
        return;
      }
      if (canReceiveFocus(previouslyFocused) && previouslyFocused !== doc.body) {
        previouslyFocused.focus();
        return;
      }

      // The opener is gone. Land on the screen's scroll surface, which is where
      // the user is now looking. It takes tabIndex -1 rather than 0, so this
      // adds a focus target without adding a Tab stop.
      const fallback = fallbackSelector ? doc.querySelector(fallbackSelector) : null;
      if (fallback) {
        if (!fallback.hasAttribute("tabindex")) fallback.setAttribute("tabindex", "-1");
        fallback.focus?.({ preventScroll: true });
      }
    };
  }, [ref, enabled]);
}

/** Accept a ref, a node, or a function returning either. */
function resolve(value) {
  const candidate = typeof value === "function" ? value() : value;
  if (!candidate) return null;
  return candidate.nodeType === 1 ? candidate : candidate.current ?? null;
}
