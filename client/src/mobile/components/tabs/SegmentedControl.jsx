import { useId } from "react";
import "./SegmentedControl.css";

/*
 * SegmentedControl — pick one of a small set, in place (prefix: ckm-segmented).
 *
 * The iOS segmented control, and deliberately *not* a tablist. The difference
 * is what the choice does:
 *
 *   tabs        swap which panel of content is shown  -> role=tablist
 *   segmented   change what the same content shows    -> a radio group
 *
 * "Newest / Top rated / Nearest" over one results list is a filter, so it is a
 * real radio group: native arrow-key movement, native form participation, and
 * "Sort, Newest, radio button, 1 of 3" announced without a line of JS.
 *
 * The inputs are opacity: 0 rather than display: none, for the same reason the
 * checkbox family gives — a hidden input is not focusable, and a control that
 * cannot be focused cannot be operated by keyboard or switch.
 *
 * Use it for two to four short options. Beyond that the segments starve; use
 * Tabs, or a select.
 */
export default function SegmentedControl({
  label,
  name = "",
  value,
  onChange,
  options = [],
  className = "",
  ...rest
}) {
  const generated = useId();
  const groupName = name || generated;

  const classes = ["ckm-segmented", className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="radiogroup" aria-label={label} {...rest}>
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        const id = `${groupName}-${optionValue}`;
        const selected = value === optionValue;

        return (
          <label
            key={optionValue}
            className={`ckm-segmented__segment${selected ? " is-selected" : ""}`}
            htmlFor={id}
          >
            <input
              className="ckm-segmented__input"
              type="radio"
              id={id}
              name={groupName}
              value={optionValue}
              checked={selected}
              disabled={option.disabled || undefined}
              onChange={(event) => onChange?.(optionValue, event)}
            />
            <span className="ckm-segmented__label">{optionLabel}</span>
            {option.count != null && <span className="ckm-segmented__count">{option.count}</span>}
          </label>
        );
      })}
    </div>
  );
}
