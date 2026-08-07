// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendTrackEvent = vi.fn();
let consented = true;

vi.mock("../../tracking/analyticsClient", () => ({
  sendTrackEvent: (...args) => sendTrackEvent(...args),
}));

vi.mock("../../tracking/storage", () => ({
  hasConsent: () => consented,
}));

const { useMobileScrollDepth } = await import("./useMobileScrollDepth");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

beforeEach(() => {
  sendTrackEvent.mockClear();
  consented = true;
  // happy-dom has no layout engine: drive the geometry the hook reads.
  window.requestAnimationFrame = (cb) => {
    cb();
    return 1;
  };
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

/* A scrollable surface whose metrics the test controls directly. */
function Surface({ screenId = "dashboard" }) {
  const ref = useRef(null);
  useMobileScrollDepth(ref, { screenId });
  return <main data-testid="scroll" ref={ref} />;
}

function Nav() {
  const navigate = useNavigate();
  return <button type="button" data-testid="nav" onClick={() => navigate("/messages")} />;
}

function mount(ui, path = "/dashboard") {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>));
  return container.querySelector('[data-testid="scroll"]');
}

function setGeometry(el, { scrollTop, clientHeight = 800, scrollHeight = 4000 }) {
  Object.defineProperty(el, "scrollTop", { value: scrollTop, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
}

const scroll = (el) => act(() => {
  el.dispatchEvent(new Event("scroll"));
});

const depthsSent = () => sendTrackEvent.mock.calls.map(([payload]) => payload.scrollDepth);

describe("useMobileScrollDepth", () => {
  it("reports depth from the element that actually scrolls", () => {
    const el = mount(<Surface />);

    setGeometry(el, { scrollTop: 1200 }); // (1200 + 800) / 4000 = 50%
    scroll(el);

    expect(sendTrackEvent).toHaveBeenCalledTimes(1);
    const [payload] = sendTrackEvent.mock.calls[0];
    expect(payload.eventType).toBe("scroll_depth");
    expect(payload.scrollDepth).toBe(50);
    expect(payload.path).toBe("/dashboard");
    expect(payload.metadata).toEqual({ surface: "mobile-shell", screenId: "dashboard" });
  });

  it("sends nothing without tracking consent", () => {
    consented = false;
    const el = mount(<Surface />);

    setGeometry(el, { scrollTop: 2000 });
    scroll(el);

    expect(sendTrackEvent).not.toHaveBeenCalled();
  });

  it("only reports gains of at least five percent, and never regresses", () => {
    const el = mount(<Surface />);

    setGeometry(el, { scrollTop: 1200 }); // 50%
    scroll(el);
    setGeometry(el, { scrollTop: 1280 }); // 52% — below the step
    scroll(el);
    setGeometry(el, { scrollTop: 400 }); // scrolled back up
    scroll(el);
    setGeometry(el, { scrollTop: 1600 }); // 60%
    scroll(el);

    expect(depthsSent()).toEqual([50, 60]);
  });

  it("always reports reaching the end exactly once", () => {
    const el = mount(<Surface />);

    setGeometry(el, { scrollTop: 3200 }); // 100%
    scroll(el);
    scroll(el);

    expect(depthsSent()).toEqual([100]);
  });

  it("restarts measurement on the next URL", () => {
    const el = mount(
      <>
        <Nav />
        <Surface />
      </>,
    );

    setGeometry(el, { scrollTop: 1200 });
    scroll(el);
    expect(depthsSent()).toEqual([50]);

    act(() => {
      container.querySelector('[data-testid="nav"]').click();
    });

    // Same element, new screen: 20% must be reported rather than suppressed
    // as a regression from the previous screen's 50%.
    setGeometry(el, { scrollTop: 0, clientHeight: 800, scrollHeight: 4000 });
    scroll(el);

    expect(sendTrackEvent).toHaveBeenCalledTimes(2);
    const [payload] = sendTrackEvent.mock.calls[1];
    expect(payload.scrollDepth).toBe(20);
    expect(payload.path).toBe("/messages");
  });
});
