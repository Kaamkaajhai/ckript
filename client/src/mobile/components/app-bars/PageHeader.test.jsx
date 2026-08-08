// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import PageHeader from "./PageHeader";
import IconButton from "../buttons/IconButton";

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
  act(() => root.render(<MemoryRouter>{ui}</MemoryRouter>));
  return container;
}

const LONG = "An Unreasonably Long Screenplay Title That Would Otherwise Push The Actions Off Screen";

describe("PageHeader", () => {
  it("gives the screen exactly one h1 inside a banner landmark", () => {
    const el = render(<PageHeader title="Messages" />);

    expect(el.querySelectorAll("h1").length).toBe(1);
    expect(el.querySelector("h1").textContent).toBe("Messages");
    expect(el.querySelector("header")).toBeTruthy();
  });

  it("keeps a clamped title reachable in full", () => {
    const el = render(<PageHeader title={LONG} />);
    expect(el.querySelector("h1").getAttribute("title")).toBe(LONG);
  });

  it("renders a back affordance only when the screen declares a parent", () => {
    const withBack = render(<PageHeader title="Script" backTo="/search" />);
    expect(withBack.querySelector(".ckm-back")).toBeTruthy();

    act(() => root.unmount());
    container.remove();
    root = null;
    container = null;

    const withoutBack = render(<PageHeader title="Dashboard" />);
    expect(withoutBack.querySelector(".ckm-back")).toBeNull();
  });

  it("places screen actions in the bar without disturbing the title", () => {
    const el = render(
      <PageHeader
        title="Script"
        backTo="/search"
        actions={<IconButton icon="more_vert" label="More options" />}
      />,
    );

    const actions = el.querySelector(".ckm-page-header__actions");
    expect(actions.querySelector('[aria-label="More options"]')).toBeTruthy();
    expect(el.querySelector("h1").textContent).toBe("Script");
  });

  it("renders eyebrow and subtitle as supporting text, not headings", () => {
    const el = render(<PageHeader eyebrow="Draft" title="Untitled" subtitle="Saved 2 minutes ago" />);

    expect(el.querySelectorAll("h1").length).toBe(1);
    expect(el.querySelector(".ckm-page-header__eyebrow").textContent).toBe("Draft");
    expect(el.querySelector(".ckm-page-header__subtitle").textContent).toBe("Saved 2 minutes ago");
  });
});
