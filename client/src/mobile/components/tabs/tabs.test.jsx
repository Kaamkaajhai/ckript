// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import Tabs, { TabPanel } from "./Tabs";
import { panelIdFor, tabIdFor } from "./tabIds";
import SegmentedControl from "./SegmentedControl";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

function render(ui) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
  return container;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews", count: 12 },
  { id: "versions", label: "Version history" },
];

function TabsFixture({ initial = "overview" }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Tabs tabsId="p" label="Project sections" tabs={TABS} value={value} onChange={setValue} />
      {TABS.map((tab) => (
        <TabPanel key={tab.id} tabsId="p" id={tab.id} value={value}>{`${tab.label} content`}</TabPanel>
      ))}
    </>
  );
}

const press = (node, key) => act(() => {
  node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
});

describe("Tabs", () => {
  it("wires each tab to the panel it controls", () => {
    const el = render(<TabsFixture />);
    const tab = el.querySelectorAll('[role="tab"]')[0];
    const panel = el.querySelector('[role="tabpanel"]');

    expect(tab.id).toBe(tabIdFor("p", "overview"));
    expect(tab.getAttribute("aria-controls")).toBe(panelIdFor("p", "overview"));
    expect(panel.id).toBe(panelIdFor("p", "overview"));
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
  });

  it("is one Tab stop, not one per tab", () => {
    const el = render(<TabsFixture />);
    const tabs = [...el.querySelectorAll('[role="tab"]')];

    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it("moves and activates with the arrow keys", () => {
    const el = render(<TabsFixture />);
    const tabs = () => [...el.querySelectorAll('[role="tab"]')];

    press(tabs()[0], "ArrowRight");
    expect(tabs()[1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs()[1]);
    expect(el.querySelector('[role="tabpanel"]').textContent).toBe("Reviews content");
  });

  it("wraps at both ends, so the last tab is never a dead stop", () => {
    const el = render(<TabsFixture />);
    const tabs = () => [...el.querySelectorAll('[role="tab"]')];

    press(tabs()[0], "ArrowLeft");
    expect(tabs()[2].getAttribute("aria-selected")).toBe("true");

    press(tabs()[2], "ArrowRight");
    expect(tabs()[0].getAttribute("aria-selected")).toBe("true");
  });

  it("jumps to the ends with Home and End", () => {
    const el = render(<TabsFixture initial="reviews" />);
    const tabs = () => [...el.querySelectorAll('[role="tab"]')];

    press(tabs()[1], "End");
    expect(tabs()[2].getAttribute("aria-selected")).toBe("true");

    press(tabs()[2], "Home");
    expect(tabs()[0].getAttribute("aria-selected")).toBe("true");
  });

  it("shows one panel at a time and keeps it reachable by keyboard", () => {
    const el = render(<TabsFixture />);
    const panels = el.querySelectorAll('[role="tabpanel"]');

    expect(panels.length).toBe(1);
    // Without tabindex, Tab from the bar skips the content the tab revealed.
    expect(panels[0].tabIndex).toBe(0);
  });
});

describe("SegmentedControl", () => {
  const SORTS = [
    { value: "recent", label: "Recent" },
    { value: "rated", label: "Top rated" },
  ];

  it("is a radio group, because it filters rather than switching panels", () => {
    const el = render(<SegmentedControl label="Sort by" name="sort" options={SORTS} value="recent" onChange={() => {}} />);

    expect(el.querySelector('[role="radiogroup"]').getAttribute("aria-label")).toBe("Sort by");
    expect(el.querySelectorAll('input[type="radio"]').length).toBe(2);
  });

  it("keeps the real inputs focusable rather than hiding them", () => {
    const el = render(<SegmentedControl label="Sort by" name="sort" options={SORTS} value="recent" onChange={() => {}} />);
    const input = el.querySelector('input[type="radio"]');

    // display:none would remove it from the accessibility tree and the tab order.
    expect(input.hidden).toBe(false);
    expect(input.closest("label").getAttribute("for")).toBe(input.id);
  });

  it("reports the chosen value, not the event", () => {
    const onChange = vi.fn();
    const el = render(<SegmentedControl label="Sort by" name="sort" options={SORTS} value="recent" onChange={onChange} />);

    act(() => { el.querySelectorAll('input[type="radio"]')[1].click(); });
    expect(onChange.mock.calls[0][0]).toBe("rated");
  });

  it("accepts plain strings as options", () => {
    const el = render(<SegmentedControl label="View" name="view" options={["List", "Grid"]} value="List" onChange={() => {}} />);

    expect(el.querySelectorAll('input[type="radio"]').length).toBe(2);
    expect(el.textContent).toContain("Grid");
  });
});
