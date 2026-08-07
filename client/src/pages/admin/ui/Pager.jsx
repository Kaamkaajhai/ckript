import Button from "./Button";

/**
 * Pager for SERVER-paginated lists — a page number the caller owns, not a slice of rows.
 *
 * DataTable has its own pager for the case where it holds every row; this one exists for the
 * opposite case, where the endpoint returns one page at a time and only the caller knows the total.
 *
 * Renders nothing at a single page: a control that can only be disabled is noise.
 */
export default function Pager({ page, totalPages, onPageChange, disabled = false, label = "page" }) {
  if (!totalPages || totalPages <= 1) return null;

  const current = Math.min(Math.max(1, page), totalPages);

  return (
    <nav className="adpg" aria-label={`${label} navigation`}>
      <Button
        size="sm"
        variant="secondary"
        disabled={disabled || current <= 1}
        onClick={() => onPageChange(current - 1)}
      >
        Previous
      </Button>

      {/* aria-live so a screen reader hears the page change; the buttons themselves stay silent. */}
      <span className="adpg-count ckad-num" aria-live="polite">
        Page {current} of {totalPages}
      </span>

      <Button
        size="sm"
        variant="secondary"
        disabled={disabled || current >= totalPages}
        onClick={() => onPageChange(current + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
