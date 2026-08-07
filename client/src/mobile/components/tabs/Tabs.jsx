import { useEffect, useRef } from "react";
import { panelIdFor, tabIdFor } from "./tabIds";
import "./Tabs.css";

/*
 * Tabs — a scrollable tab bar over sibling panels (prefix: ckm-tabbar).
 *
 * The APG tabs pattern, implemented properly rather than as buttons that look
 * like tabs. What that buys, and what a div-with-onClick loses:
 *
 *   • one Tab stop for the whole bar, not one per tab. Six tabs implemented as
 *     six buttons cost a keyboard user six presses to get past;
 *   • Left/Right move (and wrap), Home/End jump to the ends;
 *   • activation follows focus, which the APG recommends when the panels are
 *     already rendered — as they are here, since these are local state;
 *   • aria-selected and aria-controls, so the relationship between a tab and
 *     what it changed is announced rather than inferred from the layout.
 *
 * Ids are derived from the required `tabsId` rather than from a context, so a
 * TabPanel can live anywhere on the screen — inside a different section, or
 * under a sticky header — and still be wired to its tab.
 *
 * The bar scrolls sideways: at 320px, four tabs of real words do not fit, and
 * shrinking the text to make them fit is how tab bars end up at 9px.
 */

export default function Tabs({
  tabsId,
  label,
  tabs = [],
  value,
  onChange,
  fitted = false,
  className = "",
  ...rest
}) {
  const listRef = useRef(null);
  const ids = tabs.map((tab) => (typeof tab === "string" ? tab : tab.id));
  const activeIndex = Math.max(0, ids.indexOf(value));

  // Keep the selected tab on screen when it changes from outside the bar (a
  // swipe, a deep link, a "see all" that jumps to another section).
  useEffect(() => {
    const node = listRef.current?.querySelector('[aria-selected="true"]');
    node?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);

  const move = (nextIndex) => {
    const wrapped = (nextIndex + ids.length) % ids.length;
    onChange?.(ids[wrapped]);
    // Focus follows the selection, or the arrow key would move the highlight
    // and leave the keyboard behind on the old tab.
    listRef.current?.querySelectorAll(".ckm-tabbar__tab")[wrapped]?.focus();
  };

  const onKeyDown = (event) => {
    switch (event.key) {
      case "ArrowRight": move(activeIndex + 1); break;
      case "ArrowLeft": move(activeIndex - 1); break;
      case "Home": move(0); break;
      case "End": move(ids.length - 1); break;
      default: return;
    }
    event.preventDefault();
  };

  return (
    <div
      className={["ckm-tabbar", fitted ? "ckm-tabbar--fitted" : "", className].filter(Boolean).join(" ")}
      {...rest}
    >
      <div
        className="ckm-tabbar__list"
        role="tablist"
        aria-label={label}
        ref={listRef}
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab) => {
          const id = typeof tab === "string" ? tab : tab.id;
          const tabLabel = typeof tab === "string" ? tab : tab.label;
          const selected = id === value;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={tabIdFor(tabsId, id)}
              aria-controls={panelIdFor(tabsId, id)}
              aria-selected={selected}
              /* Roving tabindex: the bar is one stop, and Tab lands on
                 whichever tab is currently selected. */
              tabIndex={selected ? 0 : -1}
              className={`ckm-tabbar__tab${selected ? " is-selected" : ""}`}
              onClick={() => onChange?.(id)}
            >
              <span className="ckm-tabbar__label">{tabLabel}</span>
              {tab.count != null && <span className="ckm-tabbar__count">{tab.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/*
 * TabPanel — the content half of the pair.
 *
 * Rendered only when active (mounting all panels would make every screen pay
 * for tabs nobody opened), and given tabindex="0" so a panel of plain text is
 * reachable: without it, Tab from the tab bar jumps past the content the tab
 * just revealed and lands on whatever follows it.
 */
export function TabPanel({ tabsId, id, value, className = "", children, ...rest }) {
  if (id !== value) return null;

  return (
    <div
      className={["ckm-tabbar__panel", className].filter(Boolean).join(" ")}
      role="tabpanel"
      id={panelIdFor(tabsId, id)}
      aria-labelledby={tabIdFor(tabsId, id)}
      tabIndex={0}
      {...rest}
    >
      {children}
    </div>
  );
}
