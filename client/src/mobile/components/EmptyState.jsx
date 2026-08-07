import Icon from "./Icon";
import "./EmptyState.css";

/*
 * EmptyState — the reusable "no data yet" block (reference screen 07). Each
 * section renders it when its own data is empty, so the zero-state is a real,
 * reachable branch rather than a one-off mockup.
 *
 * Pairs with InlineMessage's `panel` form, which is the same geometry for the
 * other reason a region has no content: "nothing here yet" vs "this failed".
 * They are separate components because they are separate facts about the world,
 * and only one of them is worth offering a retry for.
 *
 * `titleAs` defaults to "div" rather than a heading on purpose. A titled block
 * with no heading is worse markup, but this component is a verified Phase 0
 * baseline used by four dashboard sections, and changing its heading outline
 * belongs to the Phase 2 slice that owns the dashboard — the same call already
 * made for ckm-btn, ckm-tabs and ckm-sheet. New callers pass titleAs="h3";
 * Phase 2 flips the default once the dashboard's outline is re-verified.
 */
export default function EmptyState({
  icon,
  title,
  titleAs = "div",
  body,
  actions,
  compact = false,
  dashed = false,
}) {
  // Assigned rather than renamed in the destructuring: the lint rule does not
  // count `titleAs: Title` as a JSX use and reports it unused. Same reason
  // Card assigns `const Surface = as`.
  const Title = titleAs;

  return (
    <div className={`ckm-empty${compact ? " is-compact" : ""}${dashed ? " is-dashed" : ""}`}>
      <div className="ckm-empty__icon">
        <Icon name={icon} size={compact ? 22 : 32} color="var(--ckm-faint)" />
      </div>
      {title && <Title className="ckm-empty__title">{title}</Title>}
      {body && <p className="ckm-empty__body">{body}</p>}
      {actions && <div className="ckm-empty__actions">{actions}</div>}
    </div>
  );
}
