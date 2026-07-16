import Icon from "./Icon";
import "./EmptyState.css";

/*
 * EmptyState — the reusable "no data yet" block (reference screen 07). Each
 * section renders it when its own data is empty, so the zero-state is a real,
 * reachable branch rather than a one-off mockup.
 */
export default function EmptyState({ icon, title, body, actions, compact = false, dashed = false }) {
  return (
    <div className={`ckm-empty${compact ? " is-compact" : ""}${dashed ? " is-dashed" : ""}`}>
      <div className="ckm-empty__icon">
        <Icon name={icon} size={compact ? 22 : 32} color="var(--ckm-faint)" />
      </div>
      {title && <div className="ckm-empty__title">{title}</div>}
      {body && <p className="ckm-empty__body">{body}</p>}
      {actions && <div className="ckm-empty__actions">{actions}</div>}
    </div>
  );
}
