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
    <div role="group" aria-label={ariaLabel} className={`flex flex-wrap gap-2 ${className}`}>
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
              active
                ? "bg-[#1e3a5f] text-white border border-[#1e3a5f] shadow-sm"
                : dark
                  ? "bg-white/[0.05] text-gray-300 border border-[#1d3350] hover:bg-white/[0.09] hover:border-[#2f4a6e]"
                  : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 hover:border-gray-300"
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
