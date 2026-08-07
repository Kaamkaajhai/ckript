import { useId } from "react";
import { useDragControls } from "framer-motion";
import IconButton from "../buttons/IconButton";
import useKeyboardInset from "../../hooks/useKeyboardInset";
import Overlay from "./Overlay";
import "./Sheet.css";

/*
 * Sheet — a bottom sheet for a short, contextual task (prefix: ckm-bottom-sheet).
 *
 * Plan §5.5: a sheet is for something brief that belongs to the screen behind
 * it — a filter set, a share target, a quick edit. Anything with its own
 * multi-step flow, its own long form, or its own URL is a Dialog or a route,
 * not this. The size cap is the design telling you so: a sheet cannot cover the
 * whole frame, because the strip of scrim above it is what says "the thing you
 * were doing is still there".
 *
 * Three details that make it feel native rather than merely modal:
 *
 *   • flick-down to dismiss. The gesture is bound to the grip and header only,
 *     via drag controls, so a drag that starts on the body scrolls the body.
 *     Binding drag to the whole surface is the usual bug: the sheet dismisses
 *     when the user meant to scroll it.
 *   • the footer clears the keyboard. `useKeyboardInset` measures what the
 *     virtual keyboard actually covers, so "Save" stays reachable while a field
 *     in the sheet is being typed into. On iOS the layout viewport does not
 *     shrink, so without this the footer sits under the keyboard, invisible.
 *   • the body is the only scroll surface, and the header/footer are not part
 *     of it, so the title stays put and the action never scrolls away.
 *
 * The grip is `aria-hidden`: it is a gesture affordance with no keyboard or
 * screen-reader meaning. The close button is the accessible dismissal, and it
 * is not optional.
 */
export default function Sheet({
  open = false,
  onClose = null,
  title = "",
  description = "",
  footer = null,
  closeLabel = "Close",
  showClose = true,
  initialFocus = null,
  returnFocusTo = null,
  headerAction = null,
  className = "",
  bodyClassName = "",
  children,
  ...rest
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dragControls = useDragControls();
  const keyboardInset = useKeyboardInset();

  return (
    <Overlay
      open={open}
      onClose={onClose}
      placement="bottom"
      labelledBy={title ? titleId : ""}
      describedBy={description ? descriptionId : ""}
      initialFocus={initialFocus}
      returnFocusTo={returnFocusTo}
      surfaceClassName={["ckm-bottom-sheet", className].filter(Boolean).join(" ")}
      surfaceProps={{
        drag: "y",
        dragControls,
        dragListener: false,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: 0, bottom: 0.6 },
        onDragEnd: (_, info) => {
          // Distance or speed: a short, fast flick is as clear an intent to
          // dismiss as a long slow drag, and only checking distance makes the
          // gesture feel unresponsive.
          if (info.offset.y > 120 || info.velocity.y > 700) onClose?.();
        },
      }}
      {...rest}
    >
      <div
        className="ckm-bottom-sheet__grab"
        onPointerDown={(event) => dragControls.start(event)}
      >
        <div className="ckm-bottom-sheet__grip" aria-hidden="true" />

        {(title || showClose || headerAction) && (
          <div className="ckm-bottom-sheet__header">
            <div className="ckm-bottom-sheet__titles">
              {title && <h2 className="ckm-bottom-sheet__title" id={titleId}>{title}</h2>}
              {description && (
                <p className="ckm-bottom-sheet__description" id={descriptionId}>{description}</p>
              )}
            </div>
            {headerAction}
            {showClose && (
              <IconButton
                className="ckm-bottom-sheet__close"
                icon="close"
                label={closeLabel}
                variant="soft"
                onClick={onClose}
              />
            )}
          </div>
        )}
      </div>

      <div className={["ckm-bottom-sheet__body", "ckm-scroll", bodyClassName].filter(Boolean).join(" ")}>
        {children}
      </div>

      {footer && (
        <div
          className="ckm-bottom-sheet__footer"
          style={keyboardInset ? { paddingBottom: `${keyboardInset}px` } : undefined}
        >
          {footer}
        </div>
      )}
    </Overlay>
  );
}
