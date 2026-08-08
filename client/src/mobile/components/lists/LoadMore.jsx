import { useEffect, useRef } from "react";
import Button from "../buttons/Button";
import "./LoadMore.css";

/*
 * LoadMore — the foot of a paged list (prefix: ckm-load-more).
 *
 * A button, not an infinite scroll. Infinite scroll on this app would fight
 * the shell: the footer becomes unreachable, "where was I" is unanswerable
 * after a back navigation, and a slow connection loads pages the user never
 * asked for. A button is also the only version of this that has a state a
 * screen reader can be told about.
 *
 * Three things it does that a bare button does not:
 *
 *   • counts. "Showing 20 of 64 scripts" is a status message under WCAG SC
 *     4.1.3, so it lives in role="status" and is announced when it changes —
 *     without taking focus, which is the whole point of that criterion. The
 *     list items themselves are not announced; the count is.
 *   • names the amount. "Load 20 more scripts" tells you what the tap costs
 *     before you spend it on mobile data; "Load more" does not.
 *   • rescues focus. When the last page loads, the button unmounts. If focus
 *     were left on the removed node it would fall to <body> and a screen
 *     reader user would be dropped at the top of the screen. So focus moves
 *     to the status line, which now reads as the end of the list.
 */
export default function LoadMore({
  loaded,
  total,
  pageSize = 0,
  pending = false,
  error = "",
  onLoadMore,
  onRetry = null,
  noun = "items",
  endMessage = "",
  className = "",
  ...rest
}) {
  const rootRef = useRef(null);
  const hadFocus = useRef(false);
  const remaining = Math.max(0, (total ?? 0) - (loaded ?? 0));
  const canLoadMore = remaining > 0;
  const nextBatch = pageSize > 0 ? Math.min(pageSize, remaining) : remaining;

  useEffect(() => {
    if (!canLoadMore && hadFocus.current) {
      hadFocus.current = false;
      rootRef.current?.focus();
    }
  }, [canLoadMore]);

  return (
    <div
      className={["ckm-load-more", className].filter(Boolean).join(" ")}
      ref={rootRef}
      tabIndex={-1}
      {...rest}
    >
      <p className="ckm-load-more__status" role="status">
        {`Showing ${loaded} of ${total} ${noun}`}
        {!canLoadMore && endMessage ? `. ${endMessage}` : ""}
      </p>

      {error && (
        <p className="ckm-load-more__error" role="alert">
          <span className="material-symbols-outlined ckm-load-more__error-icon" aria-hidden="true">error</span>
          {error}
        </p>
      )}

      {error && onRetry ? (
        <Button variant="secondary" fullWidth icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      ) : (
        canLoadMore && (
          <Button
            variant="secondary"
            fullWidth
            pending={pending}
            pendingLabel={`Loading ${noun}…`}
            onFocus={() => { hadFocus.current = true; }}
            onBlur={() => { hadFocus.current = false; }}
            onClick={onLoadMore}
          >
            {`Load ${nextBatch} more ${noun}`}
          </Button>
        )
      )}
    </div>
  );
}
