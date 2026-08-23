// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import EventPosterModal from "./EventPosterModal";

const mocks = vi.hoisted(() => ({ mobile: true }));

vi.mock("../mobile/hooks/useIsMobile", () => ({
  default: () => mocks.mobile,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

async function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<MemoryRouter initialEntries={["/"]}><EventPosterModal /></MemoryRouter>);
    await Promise.resolve();
  });
  return container;
}

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  mocks.mobile = true;
});

describe("EventPosterModal", () => {
  it("does not cover the native mobile landing", async () => {
    const el = await mount();
    expect(el.querySelector('img[alt="Event Poster"]')).toBeNull();
  });

  it("retains the existing poster on the desktop landing", async () => {
    mocks.mobile = false;
    const el = await mount();
    expect(el.querySelector('img[alt="Event Poster"]')).toBeTruthy();
    expect(el.querySelector('button[aria-label="Close"]')?.style.width).toBe("44px");
  });
});
