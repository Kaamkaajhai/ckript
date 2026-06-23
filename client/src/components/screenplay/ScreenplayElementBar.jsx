// Compact element toolbar (WriterDuet technique): each of the eleven screenplay element
// types is a small icon stacked over a tiny label — no per-item border/box/pill. Hover tints
// the background; the active type gets a subtle navy fill. At this density all eleven fit on
// one inline row, so there is no "More" dropdown. File/mode actions live in a separate group
// to the right of a divider (rendered by the parent).

import { SCREENPLAY_ELEMENT_BAR } from "./screenplayElements";

/**
 * Horizontal row of compact icon-over-label element buttons.
 * @param {object} props
 * @param {string} props.currentElement   caret's element type (for active highlight)
 * @param {(value:string)=>void} props.onSetElement
 * @param {boolean} [props.dark]
 * @param {Array} [props.items]           override the element list (defaults to all eleven)
 */
export default function ScreenplayElementBar({ currentElement = "action", onSetElement, dark = false, items = SCREENPLAY_ELEMENT_BAR }) {
  const activeVal = (currentElement === "blank") ? "action" : currentElement;
  return (
    <div className="flex items-center gap-1">
      {items.map((el) => {
        const active = activeVal === el.value;
        const Icon = el.Icon;
        const base = "flex flex-col items-center justify-center gap-1 w-14 max-[640px]:w-11 px-1.5 py-1.5 rounded-lg transition select-none";
        const state = active
          ? "bg-[#1e3a5f] text-white shadow-sm"
          : dark
            ? "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
            : "text-gray-600 hover:bg-gray-100";
        return (
          <button
            key={el.value}
            type="button"
            onClick={() => onSetElement?.(el.value)}
            title={el.tab ? `${el.label} — Tab ${el.tab}` : el.label}
            className={`${base} ${state}`}
          >
            <Icon className="w-[17px] h-[17px]" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[10px] leading-none tracking-tight max-[640px]:hidden">{el.label}</span>
          </button>
        );
      })}
    </div>
  );
}
