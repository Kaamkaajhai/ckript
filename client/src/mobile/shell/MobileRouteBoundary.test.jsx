// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MobileRouteBoundary from "./MobileRouteBoundary";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let consoleError;

beforeEach(() => {
  // React logs the caught render error itself; the boundary is the assertion.
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  consoleError.mockRestore();
});

function render(ui) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
  return container;
}

function Boom() {
  throw new Error("screen exploded");
}

describe("MobileRouteBoundary", () => {
  it("renders the screen when nothing fails", () => {
    const el = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <MobileRouteBoundary>
          <p data-testid="screen">ok</p>
        </MobileRouteBoundary>
      </MemoryRouter>,
    );

    expect(el.querySelector('[data-testid="screen"]')).toBeTruthy();
    expect(el.querySelector(".ckm-shell__failure")).toBeNull();
  });

  it("shows a recoverable failure surface instead of a blank frame", () => {
    const onError = vi.fn();
    const el = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <MobileRouteBoundary onError={onError}>
          <Boom />
        </MobileRouteBoundary>
      </MemoryRouter>,
    );

    const failure = el.querySelector(".ckm-shell__failure");
    expect(failure).toBeTruthy();
    expect(failure.getAttribute("role")).toBe("alert");
    expect(failure.querySelector(".ckm-shell__failure-action")).toBeTruthy();
    expect(onError).toHaveBeenCalled();
  });

  it("shows the route pending state while a screen suspends", () => {
    const pending = new Promise(() => {});
    function Suspended() {
      throw pending;
    }

    const el = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <MobileRouteBoundary>
          <Suspended />
        </MobileRouteBoundary>
      </MemoryRouter>,
    );

    const status = el.querySelector(".ckm-shell__pending");
    expect(status).toBeTruthy();
    expect(status.getAttribute("aria-live")).toBe("polite");
  });

  it("does not carry a failed screen into the next URL", () => {
    // A real navigation, not a remount: the boundary must clear itself when
    // the pathname changes, or one broken screen would break every later one.
    function Screen() {
      const { pathname } = useLocation();
      if (pathname === "/dashboard") throw new Error("screen exploded");
      return <p data-testid="next">next screen</p>;
    }

    function GoNext() {
      const navigate = useNavigate();
      return (
        <button type="button" data-testid="nav" onClick={() => navigate("/messages")}>
          next
        </button>
      );
    }

    const el = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <GoNext />
        <MobileRouteBoundary>
          <Screen />
        </MobileRouteBoundary>
      </MemoryRouter>,
    );

    expect(el.querySelector(".ckm-shell__failure")).toBeTruthy();

    act(() => {
      el.querySelector('[data-testid="nav"]').click();
    });

    expect(el.querySelector(".ckm-shell__failure")).toBeNull();
    expect(el.querySelector('[data-testid="next"]')).toBeTruthy();
  });

  it("retries the same screen when the user asks it to", () => {
    let shouldFail = true;
    function Flaky() {
      if (shouldFail) throw new Error("transient");
      return <p data-testid="recovered">recovered</p>;
    }

    const el = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <MobileRouteBoundary>
          <Flaky />
        </MobileRouteBoundary>
      </MemoryRouter>,
    );

    shouldFail = false;
    act(() => {
      el.querySelector(".ckm-shell__failure-action").click();
    });

    expect(el.querySelector('[data-testid="recovered"]')).toBeTruthy();
  });
});
