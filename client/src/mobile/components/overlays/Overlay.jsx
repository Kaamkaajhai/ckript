import { useRef } from "react";
// `motion` is aliased to `Motion` because the lint config does not count a
// JSX member expression (`<Motion.div>`) as a use, and the unused-vars rule
// exempts capitalised names. Same symbol, no suppression comment.
import { AnimatePresence, motion as Motion } from "framer-motion";
import useOverlay from "../../hooks/useOverlay";
import useReducedMotion from "../../hooks/useReducedMotion";
import "./Overlay.css";

/*
 * Overlay — the base every modal surface in the app is built from
 * (prefix: ckm-overlay).
 *
 * Not exported for screens to use directly. Screens use Sheet, Dialog,
 * ConfirmDialog or ActionSheet; this is the one place their shared behaviour
 * lives, so a fifth overlay cannot be written that forgets the focus trap.
 *
 * ---------------------------------------------------------------------------
 * Why this is not a native <dialog showModal()>
 * ---------------------------------------------------------------------------
 * `showModal()` is genuinely better at the hard part — the browser makes the
 * background inert and contains focus itself. It was rejected here for one
 * concrete reason: it renders in the *top layer*, which is scoped to the
 * viewport and escapes `.ckm-root`. This app is deliberately phone-shaped —
 * `.ckm-root` is `max-width: 520px; margin: 0 auto` with `overflow: hidden` and
 * `isolation: isolate` — so at the 768px verification width the app is a 520px
 * column and a top-layer dialog would be 768px wide, breaking out of the frame
 * it belongs to. Every overlay would have to re-declare the frame geometry, in
 * a second place that can drift from the first.
 *
 * The half that actually matters is kept anyway: `useInertBackground` applies
 * the browser's own `inert` to everything outside the overlay, so background
 * inertness is still the platform's job and not this file's. What is hand-
 * written is only the Tab wrap and the focus-restoration policy.
 *
 * Note for whoever revisits this: happy-dom implements `showModal()` but does
 * *not* enforce a modal's focus containment (a probe moved focus to a button
 * outside an open modal and it took it), so the unit suite could not have
 * proved the trap either way. Both designs need the CDP key-event sweep; that
 * is not a point in favour of either.
 *
 * ---------------------------------------------------------------------------
 * The scrim
 * ---------------------------------------------------------------------------
 * It is a <div>, not a <button>. It carries no accessible name because it must
 * not be announced: a screen-reader user dismisses this with Escape or the
 * close control, and a "close" button spanning the whole screen would be
 * swiped into constantly. `aria-hidden` on it is safe precisely because a real
 * close affordance is required elsewhere in every surface built on this.
 */
export default function Overlay({
  open = false,
  onClose = null,
  placement = "bottom",
  role = "dialog",
  label = "",
  labelledBy = "",
  describedBy = "",
  initialFocus = null,
  returnFocusTo = null,
  closeOnScrim = true,
  closeOnEscape = true,
  surfaceClassName = "",
  className = "",
  surfaceProps = {},
  children,
  ...rest
}) {
  const layerRef = useRef(null);
  const surfaceRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useOverlay({
    layerRef,
    surfaceRef,
    open,
    onClose,
    closeOnEscape,
    initialFocus,
    returnFocusTo,
  });

  // An unlabelled dialog is announced as "dialog" and nothing else. If a caller
  // gives neither a label nor a labelling element, that is a bug in the caller,
  // but the surface should still say something rather than nothing.
  const naming = labelledBy
    ? { "aria-labelledby": labelledBy }
    : { "aria-label": label || "Dialog" };

  const motionProps = reducedMotion
    ? MOTION_REDUCED
    : MOTION_BY_PLACEMENT[placement] || MOTION_BY_PLACEMENT.bottom;

  return (
    <AnimatePresence>
      {open && (
        <div
          ref={layerRef}
          className={["ckm-overlay", `ckm-overlay--${placement}`, className].filter(Boolean).join(" ")}
          data-placement={placement}
          {...rest}
        >
          <Motion.div
            className="ckm-overlay__scrim"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.001 : 0.2 }}
            onClick={closeOnScrim ? onClose : undefined}
          />

          <Motion.div
            ref={surfaceRef}
            className={["ckm-overlay__surface", surfaceClassName].filter(Boolean).join(" ")}
            role={role}
            aria-modal="true"
            {...naming}
            aria-describedby={describedBy || undefined}
            /* The container is the focus of last resort when a surface holds
               no tabbable control at all, so it must be focusable — but at -1,
               never 0, or it would add a Tab stop of its own. */
            tabIndex={-1}
            {...motionProps}
            {...surfaceProps}
          >
            {children}
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* Motion is chosen, not merely shortened, under reduced motion: a sheet that
   still travels the height of the screen in 1ms is a flicker, and a flicker is
   worse for a vestibular disorder than the cross-fade it should have been. */
const MOTION_REDUCED = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.001 },
};

const SPRING = { type: "spring", stiffness: 420, damping: 40, mass: 0.9 };

const MOTION_BY_PLACEMENT = {
  bottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
    transition: SPRING,
  },
  center: {
    initial: { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.94 },
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
  full: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
  },
};
