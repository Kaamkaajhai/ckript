/**
 * TagSelect — pick from a list by tapping oval tags instead of opening a dropdown.
 *
 * Replaces <select> across the create/upload flows. Every option is visible at once, which suits
 * short, browsable vocabularies (genres, tones, formats, rights terms) where a writer benefits from
 * seeing the range rather than hunting through a collapsed menu.
 *
 * Renders real <button>s with aria-pressed, so it stays keyboard- and screen-reader-navigable —
 * a plain styled <div> would silently lose both.
 */

const normalizeOptions = (options = []) =>
  options
    .map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt))
    .filter((opt) => opt && opt.value !== undefined && opt.value !== null);

export default function TagSelect({
  options = [],
  value,
  onChange,
  multiple = false,
  max = 0,
  dark = false,
  disabled = false,
  // Single-select only: tapping the active tag clears it. Off by default so a required field
  // can't be emptied by a stray second tap.
  allowClear = false,
  ariaLabel,
  className = "",
  size = "md",
  // `id` and the extra props matter for form validation: callers scroll the user to the offending
  // control via document.getElementById(fieldId) and mark it with aria-invalid. A tag group has to
  // carry those the same way the <select> it replaced did.
  id,
  ...rest
}) {
  const items = normalizeOptions(options);
  const selected = multiple ? (Array.isArray(value) ? value : []) : value;
  const isSelected = (v) => (multiple ? selected.includes(v) : String(selected ?? "") === String(v));
  const atLimit = multiple && max > 0 && selected.length >= max;

  const handle = (optValue) => {
    if (disabled) return;
    if (multiple) {
      if (selected.includes(optValue)) onChange(selected.filter((v) => v !== optValue));
      else if (!atLimit) onChange([...selected, optValue]);
      return;
    }
    if (allowClear && isSelected(optValue)) onChange("");
    else onChange(optValue);
  };

  const pad = size === "sm" ? "px-3 py-1 text-[11.5px]" : "px-3.5 py-1.5 text-[12.5px]";

  return (
    <div id={id} role="group" aria-label={ariaLabel} tabIndex={-1} className={`flex flex-wrap gap-2 ${className}`} {...rest}>
      {items.map((opt) => {
        const active = isSelected(opt.value);
        // At the cap, un-picked tags read as unavailable rather than silently doing nothing on tap.
        const blocked = disabled || (!active && atLimit);
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => handle(opt.value)}
            disabled={blocked}
            aria-pressed={active}
            title={opt.title || opt.label}
            className={`${pad} rounded-full font-semibold transition-all ${
              blocked ? "cursor-not-allowed opacity-40" : "cursor-pointer"
            } ${
              /* Active is the accent TINT, not an accent fill — same mark Sidebar uses for the
                 current item. Solid coral would need white text and only reaches 4.35:1.
                 Dark keeps a hue rather than Sidebar's plain raised grey because a tag group's
                 rest state is itself a filled pill and the two would collapse into each other;
                 #f08b76 is the accent lifted for dark surfaces (index.css), since #b8402d
                 only manages ~3.4:1 there. */
              active
                ? dark
                  ? "bg-[#f08b76]/[0.14] text-[#f08b76] border border-[#f08b76]/40"
                  : "bg-[#D14D37]/10 text-[#b8402d] border border-[#D14D37]/35 shadow-sm"
                : dark
                  ? "bg-white/[0.05] text-[#cfccc5] border border-[#242424] hover:bg-white/[0.09] hover:border-[#3a3a3a]"
                  : "bg-[#f4efe6] text-[#57544f] border border-[#e7e5df] hover:bg-[#ede6d9] hover:border-[#d8d4cb]"
            }`}
          >
            {opt.label}
            {multiple && active && <span className="ml-1.5 opacity-70">×</span>}
          </button>
        );
      })}
    </div>
  );
}
