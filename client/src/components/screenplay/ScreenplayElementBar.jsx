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
          ? (dark ? "bg-[#D14D37]/15 text-[#D14D37] shadow-sm" : "bg-[#0B0A06] shadow-sm")
          : dark
            ? "text-[#b0b0b0] hover:bg-[#1e1e1e] hover:text-[#f2f2f2]"
            : "text-[#57544f] hover:bg-[#f0efe9] hover:text-[#0B0A06]";
        return (
          <button
            key={el.value}
            type="button"
            onClick={() => onSetElement?.(el.value)}
            title={el.tab ? `${el.label} — Tab ${el.tab}` : el.label}
            className={`${base} ${state}`}
            style={active && !dark ? { color: "#ffffff" } : { color: "inherit" }}
          >
            <Icon className="w-[17px] h-[17px]" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[10px] leading-none tracking-tight max-[640px]:hidden">{el.label}</span>
          </button>
        );
      })}
    </div>
  );
}
