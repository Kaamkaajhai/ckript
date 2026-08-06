import Button from "./Button";

/**
 * The state surfaces: Card, EmptyState, ErrorState, Skeleton, Spinner.
 *
 * Every screen renders one of these in each non-happy state instead of inventing its own. An empty
 * state always says what WOULD be here and, when there is one, offers the action that fills it —
 * "No data" teaches nothing.
 */

export function Card({ title, description = "", actions = null, flush = false, className = "", children }) {
  return (
    <section className={`adc ${className}`.trim()}>
      {title || actions ? (
        <header className="adc-head">
          <div>
            {title ? <h3 className="adc-title">{title}</h3> : null}
            {description ? <p className="adc-desc">{description}</p> : null}
          </div>
          {actions ? <div className="adc-actions">{actions}</div> : null}
        </header>
      ) : null}
      {/* `flush` lets tables sit edge-to-edge; prose keeps the padding. */}
      <div className={flush ? "adc-body adc-body--flush" : "adc-body"}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon = null, title, body = "", actionLabel = "", onAction = null }) {
  return (
    <div className="ade">
      {icon ? <div className="ade-ico" aria-hidden="true">{icon}</div> : null}
      <p className="ade-title">{title}</p>
      {body ? <p className="ade-body">{body}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="secondary" size="sm" onClick={onAction} className="ade-cta">{actionLabel}</Button>
      ) : null}
    </div>
  );
}

/** Failure with a way back. A retry the user can see beats a silent auto-retry they can't. */
export function ErrorState({ title = "Something went wrong", body = "", onRetry = null }) {
  return (
    <div className="ade ade--error" role="alert">
      <p className="ade-title">{title}</p>
      {body ? <p className="ade-body">{body}</p> : null}
      {onRetry ? <Button variant="secondary" size="sm" onClick={onRetry} className="ade-cta">Try again</Button> : null}
    </div>
  );
}

/**
 * Loading placeholders. Shaped like the content they stand in for — a spinner in a void tells the
 * admin nothing about what is coming or how much of it.
 */
export function Skeleton({ width = "100%", height = 14, radius = 4, className = "" }) {
  return (
    <span
      className={`ads ${className}`.trim()}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="ads-text" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? "62%" : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 4 }) {
  return (
    <div className="ads-table" aria-hidden="true">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="ads-row">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} width={c === 0 ? "24%" : `${12 + ((r + c) % 3) * 6}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ size = 16, label = "Loading" }) {
  return (
    <span className="adsp" style={{ width: size, height: size }} role="status" aria-label={label} />
  );
}
