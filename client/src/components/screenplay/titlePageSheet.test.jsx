// @vitest-environment happy-dom
//
// The title page must render as a real, visible PAGE (sheet) showing the configured fields, and
// clicking it must open the editor. This mounts the actual TitlePageSheet and checks the DOM.
import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { TitlePageSheet } from "./ScreenplayFocusMode";

let container, root;
const render = (el) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(el));
  return container;
};
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe("TitlePageSheet renders as a page", () => {
  it("shows the configured title block on the sheet", () => {
    const fields = { title: "The Heist", credit: "Written by", author: "Jane Doe", source: "Based on real events", draftDate: "June 30, 2026" };
    const el = render(<TitlePageSheet fields={fields} hasTitlePage onEdit={() => {}} dark={false} />);
    const text = el.textContent;
    expect(text).toContain("The Heist"); // title text (uppercasing is CSS text-transform, not content)
    expect(text).toContain("Written by");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("Based on real events");
    expect(text).toContain("June 30, 2026");
  });

  it("clicking the sheet calls onEdit", () => {
    const onEdit = vi.fn();
    const el = render(<TitlePageSheet fields={{ title: "X" }} hasTitlePage onEdit={onEdit} dark={false} />);
    act(() => el.querySelector("button").click());
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("with no title page, shows the 'Add a title page' placeholder", () => {
    const el = render(<TitlePageSheet fields={null} hasTitlePage={false} onEdit={() => {}} dark={false} />);
    expect(el.textContent).toContain("Add a title page");
  });
});
