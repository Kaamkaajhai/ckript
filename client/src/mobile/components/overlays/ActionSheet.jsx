import { useId } from "react";
import { Link } from "react-router-dom";
import Icon from "../Icon";
import Overlay from "./Overlay";
import "./ActionSheet.css";

/*
 * ActionSheet — the contextual "what can I do with this?" list
 * (prefix: ckm-action-sheet).
 *
 * ---------------------------------------------------------------------------
 * This is the plan's "context menu", and the research changed its shape
 * ---------------------------------------------------------------------------
 * Phase 1 bullet 6 asks for a context menu. A phone has no right-click and no
 * hover, so the desktop object it names does not exist here; the native
 * equivalent is a sheet of actions raised from the bottom edge, which is what
 * this is.
 *
 * It is deliberately NOT `role="menu"`. The APG menu pattern is for application
 * menus and brings a whole desktop interaction contract with it: roving
 * tabindex, arrow-key navigation, and Tab *leaving* the menu entirely rather
 * than moving through it. Inclusive Components' argument is the one adopted
 * here — that contract is right for a menu bar and wrong for a short list of
 * actions and links, where it replaces behaviour every user already has (Tab
 * moves to the next thing) with behaviour they have to discover. A phone user
 * driving this with a Bluetooth keyboard or a switch device is better served by
 * plain buttons and links in a dialog.
 *
 * So: a dialog containing a list of controls. The trigger should carry
 * `aria-haspopup="dialog"` and `aria-expanded`, which is what it actually is.
 *
 * Destructive items are separated and coloured, and — unlike everything else
 * here — a destructive item does not close the sheet by itself. It hands over
 * to a ConfirmDialog, because a list you opened by tapping "more" is exactly
 * where a mis-tap is most likely.
 */
export default function ActionSheet({
  open = false,
  onClose = null,
  title = "",
  description = "",
  items = [],
  cancelLabel = "Cancel",
  returnFocusTo = null,
  className = "",
  ...rest
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Overlay
      open={open}
      onClose={onClose}
      placement="bottom"
      labelledBy={title ? titleId : ""}
      describedBy={description ? descriptionId : ""}
      returnFocusTo={returnFocusTo}
      surfaceClassName={["ckm-action-sheet", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {(title || description) && (
        <div className="ckm-action-sheet__header">
          {title && <h2 className="ckm-action-sheet__title" id={titleId}>{title}</h2>}
          {description && (
            <p className="ckm-action-sheet__description" id={descriptionId}>{description}</p>
          )}
        </div>
      )}

      {/* A real <ul>: the count is announced before the list is read, which is
          most of what a screen-reader user knows before committing to it —
          the same reason List is a <ul> rather than a stack of divs. */}
      <ul className="ckm-action-sheet__list ckm-scroll">
        {items.map((item, index) => (
          <li className="ckm-action-sheet__item" key={item.id || item.label || index}>
            <ActionSheetItem item={item} onClose={onClose} />
          </li>
        ))}
      </ul>

      <div className="ckm-action-sheet__cancel-row">
        <button className="ckm-action-sheet__cancel" type="button" onClick={onClose}>
          {cancelLabel}
        </button>
      </div>
    </Overlay>
  );
}

/*
 * An item is a link when it navigates and a button when it acts — never a
 * button that calls navigate(), which would cost long-press, open-in-new-tab
 * and the link semantics a screen reader announces.
 */
function ActionSheetItem({ item, onClose }) {
  const {
    label,
    icon = null,
    hint = "",
    to = null,
    href = null,
    onSelect = null,
    destructive = false,
    disabled = false,
  } = item;

  const className = [
    "ckm-action-sheet__action",
    destructive ? "ckm-action-sheet__action--destructive" : "",
    disabled ? "is-disabled" : "",
  ].filter(Boolean).join(" ");

  const content = (
    <>
      {icon && <Icon className="ckm-action-sheet__icon" name={icon} size={22} />}
      <span className="ckm-action-sheet__labels">
        <span className="ckm-action-sheet__label">{label}</span>
        {hint && <span className="ckm-action-sheet__hint">{hint}</span>}
      </span>
    </>
  );

  // Navigating closes the sheet; a destructive action does not, because it is
  // expected to open a confirmation the user must still answer.
  const handle = (event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onSelect?.(event);
    if (!destructive) onClose?.(event);
  };

  if (to && !disabled) {
    return <Link className={className} to={to} onClick={handle}>{content}</Link>;
  }
  if (href && !disabled) {
    return <a className={className} href={href} onClick={handle}>{content}</a>;
  }
  return (
    <button className={className} type="button" disabled={disabled} onClick={handle}>
      {content}
    </button>
  );
}
