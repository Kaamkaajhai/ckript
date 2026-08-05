// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Button from "./Button";

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

const click = (el) => act(() => {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
});

describe("Button", () => {
  it("renders a real button that does not submit a form by accident", () => {
    const el = render(<Button>Save</Button>);
    const button = el.querySelector("button");

    expect(button.type).toBe("button");
    expect(button.textContent).toContain("Save");
    expect(button.className).toContain("ckm-button--primary");
  });

  it("carries every intent as its own class and data attribute", () => {
    for (const variant of ["primary", "secondary", "tertiary", "destructive"]) {
      const el = render(<Button variant={variant}>Act</Button>);
      const button = el.querySelector("button");

      expect(button.className).toContain(`ckm-button--${variant}`);
      expect(button.dataset.variant).toBe(variant);

      act(() => root.unmount());
      container.remove();
      root = null;
      container = null;
    }
  });

  it("blocks the click while pending but keeps the control focusable and announced", () => {
    const onClick = vi.fn();
    const el = render(<Button pending pendingLabel="Saving…" onClick={onClick}>Save</Button>);
    const button = el.querySelector("button");

    click(button);

    expect(onClick).not.toHaveBeenCalled();
    // A pending control must not leave the tab order mid-task.
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    // The label carries the meaning in words, because reduced motion freezes
    // the spinner (base.css).
    expect(button.textContent).toContain("Saving…");
  });

  it("refuses the click when disabled", () => {
    const onClick = vi.fn();
    const el = render(<Button disabled onClick={onClick}>Save</Button>);
    const button = el.querySelector("button");

    click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(button.disabled).toBe(true);
  });

  it("calls back on a normal press", () => {
    const onClick = vi.fn();
    const el = render(<Button onClick={onClick}>Save</Button>);

    click(el.querySelector("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("stays a link when it navigates, so long-press and new-tab still work", () => {
    const el = render(<Button to="/dashboard">Dashboard</Button>);
    const link = el.querySelector("a");

    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/dashboard");
    expect(link.className).toContain("ckm-button");
  });

  it("degrades a disabled link to a disabled button rather than a dead anchor", () => {
    const el = render(<Button to="/dashboard" disabled>Dashboard</Button>);

    expect(el.querySelector("a")).toBeNull();
    expect(el.querySelector("button").disabled).toBe(true);
  });

  it("shows the pending indicator in place of the leading icon", () => {
    const el = render(<Button icon="add" pending>Create</Button>);

    expect(el.querySelector(".ckm-button__spinner")).toBeTruthy();
    expect(el.querySelector(".ckm-button__icon")).toBeNull();
  });
});
