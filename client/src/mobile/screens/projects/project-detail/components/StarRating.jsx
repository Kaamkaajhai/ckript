import { useId } from "react";

/*
 * StarRating — five stars that are actually five radio buttons (D29).
 *
 * The desktop page draws its stars as <button>s that set a number. That is fine with a mouse and
 * wrong here for two reasons: a phone user arrives with a virtual keyboard and a screen reader far
 * more often, and five buttons announce as five unrelated actions with no sense that choosing one
 * unchooses the others. A radio group in a fieldset announces as one question with five answers
 * and one of them selected, and arrow keys move between them for free.
 *
 * The inputs are visually hidden but NOT `display:none` — a hidden-by-display input is removed
 * from the accessibility tree and from the tab order, which would leave the group unreachable. The
 * star glyph is the label, and the label is the 44px tap target.
 */
const STARS = [1, 2, 3, 4, 5];

export default function StarRating({
  value = 0,
  onChange = null,
  label = "Rating",
  name = "",
  disabled = false,
  required = false,
  error = "",
}) {
  const id = useId();
  const groupName = name || id;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <fieldset
      className={["ckm-project__stars", error ? "is-invalid" : ""].filter(Boolean).join(" ")}
      aria-describedby={errorId}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
    >
      <legend className="ckm-project__stars-legend">
        <span>{label}</span>
        {required && <span className="ckm-field__flag">Required</span>}
      </legend>

      <div className="ckm-project__stars-row">
        {STARS.map((star) => {
          const starId = `${id}-${star}`;
          const filled = star <= Number(value || 0);
          return (
            <label className="ckm-project__star" key={star} htmlFor={starId} data-filled={filled ? "true" : "false"}>
              <input
                id={starId}
                className="ckm-sr-only"
                type="radio"
                name={groupName}
                value={star}
                checked={Number(value) === star}
                onChange={() => onChange?.(star)}
                required={required}
              />
              <span className="material-symbols-outlined" aria-hidden="true">star</span>
              {/* The accessible name of each option is the whole answer, not the number: "3 stars"
                  read on its own tells a listener what choosing it means. */}
              <span className="ckm-sr-only">{star} {star === 1 ? "star" : "stars"}</span>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="ckm-project__stars-error" id={errorId} role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** The same five stars with no controls, for showing a rating that already exists. */
export function StarReadout({ value = 0, count = 0 }) {
  const score = Math.round(Number(value) || 0);
  return (
    <span className="ckm-project__star-readout">
      <span aria-hidden="true">
        {STARS.map((star) => (
          <span className="material-symbols-outlined" key={star} data-filled={star <= score ? "true" : "false"}>star</span>
        ))}
      </span>
      <span className="ckm-sr-only">
        {score} out of 5{count ? `, from ${count} ${count === 1 ? "rating" : "ratings"}` : ""}
      </span>
    </span>
  );
}
