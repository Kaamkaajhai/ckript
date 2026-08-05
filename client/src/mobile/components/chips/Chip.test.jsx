// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import Chip, { ChipRow } from "./Chip";
import Badge from "../badges/Badge";

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

describe("Chip", () => {
  it("stays a plain tag when nothing can be done to it", () => {
    const el = render(<Chip>Drama</Chip>);

    expect(el.querySelector("button")).toBeNull();
    expect(el.querySelector(".ckm-chip").classList.contains("ckm-chip--tag")).toBe(true);
  });

  it("announces selection instead of only looking selected", () => {
    const el = render(<Chip selected onSelect={() => {}}>Drama</Chip>);
    expect(el.querySelector("button").getAttribute("aria-pressed")).toBe("true");
  });

  it("reports an unselected filter as unpressed rather than silent", () => {
    const el = render(<Chip onSelect={() => {}}>Drama</Chip>);
    expect(el.querySelector("button").getAttribute("aria-pressed")).toBe("false");
  });

  it("gives the remove control its own name and its own target", () => {
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    const el = render(<Chip selected onSelect={onSelect} onRemove={onRemove}>Drama</Chip>);
    const buttons = el.querySelectorAll("button");

    expect(buttons.length).toBe(2);
    expect(buttons[1].getAttribute("aria-label")).toBe("Remove Drama");
    // Nested inside the chip's own button it would be unreachable and invalid.
    expect(buttons[0].contains(buttons[1])).toBe(false);

    act(() => { buttons[1].click(); });
    expect(onRemove).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("groups a filter rail so its purpose is announced once", () => {
    const el = render(<ChipRow label="Filter by genre"><Chip>Drama</Chip></ChipRow>);
    const group = el.querySelector('[role="group"]');

    expect(group.getAttribute("aria-label")).toBe("Filter by genre");
  });
});

describe("Badge", () => {
  it("carries its meaning in words, not only in colour", () => {
    const el = render(<Badge tone="success" dot>Published</Badge>);

    expect(el.textContent).toBe("Published");
    expect(el.querySelector(".ckm-badge__dot").getAttribute("aria-hidden")).toBe("true");
  });

  it("is never a target", () => {
    const el = render(<Badge tone="danger">Payment failed</Badge>);
    expect(el.querySelector("button, a")).toBeNull();
  });

  it("lets a bare count say what it counts", () => {
    const el = render(<Badge tone="danger" srLabel="3 unread messages">3</Badge>);

    expect(el.querySelector(".ckm-badge__text").getAttribute("aria-hidden")).toBe("true");
    expect(el.querySelector(".ckm-sr-only").textContent).toBe("3 unread messages");
  });
});
