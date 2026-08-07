// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * framer-motion is stubbed here, and the reason is worth stating rather than
 * hiding: happy-dom never completes an exit animation, so a dismissed toast
 * would stay in the DOM forever and every queue assertion below would be
 * testing the animation library instead of the queue.
 *
 * Stubbing AnimatePresence to unmount immediately is the honest seam — these
 * tests are about queue order, timers and ARIA, none of which motion affects.
 * The motion itself is verified in a real browser by the CDP sweep.
 */
vi.mock("framer-motion", () => {
  const MOTION_PROPS = new Set(["initial", "animate", "exit", "transition", "layout", "layoutId"]);
  return {
    AnimatePresence: ({ children }) => children,
    motion: new Proxy({}, {
      get: (_target, tag) => function MotionStub({ children, ...props }) {
        const safe = Object.fromEntries(Object.entries(props).filter(([key]) => !MOTION_PROPS.has(key)));
        return createElement(tag, safe, children);
      },
    }),
  };
});
import InlineMessage from "./InlineMessage";
import OfflineBanner from "./OfflineBanner";
import SkeletonGroup, { SkeletonRows, SkeletonText } from "./Skeletons";
import ToastProvider from "./ToastProvider";
import { toastDuration, toastIsAssertive, toastPersists, useToast } from "./toastContext";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.useRealTimers();
});

function render(ui) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter>{ui}</MemoryRouter>));
  return container;
}

/* A handle on the toast API from outside the tree, so a test can raise a toast
   the way a screen does rather than by poking at state. */
function toastHarness() {
  const api = {};
  function Probe() {
    Object.assign(api, useToast());
    return null;
  }
  const el = render(<ToastProvider><Probe /></ToastProvider>);
  return { el, api };
}

describe("toast policy", () => {
  it("refuses to auto-dismiss anything the user must read or act on", () => {
    // The rule the APG states and SC 2.2.1 backs: when the surface vanishes, so
    // does the ability to act on it.
    expect(toastPersists({ tone: "error" })).toBe(true);
    expect(toastPersists({ tone: "success", action: { label: "Undo" } })).toBe(true);
    expect(toastPersists({ tone: "success" })).toBe(false);
    expect(toastPersists({ tone: "info" })).toBe(false);
  });

  it("interrupts only for an error", () => {
    expect(toastIsAssertive("error")).toBe(true);
    expect(toastIsAssertive("warning")).toBe(false);
    expect(toastIsAssertive("success")).toBe(false);
  });

  it("gives a longer read to a message with more to read", () => {
    expect(toastDuration({ description: "" })).toBeLessThan(toastDuration({ description: "More." }));
  });
});

describe("ToastProvider", () => {
  it("keeps both live regions mounted before any message exists", () => {
    // A region created at the same moment its content arrives is routinely
    // missed; one that already existed and then changes is not.
    const { el } = toastHarness();
    expect(el.querySelector('[role="status"]')).toBeTruthy();
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("announces an acknowledgement politely and an error assertively", () => {
    const { el, api } = toastHarness();

    act(() => { api.success("Draft saved"); });
    expect(el.querySelector('[role="status"]').textContent).toContain("Draft saved");
    expect(el.querySelector('[role="alert"]').textContent).not.toContain("Draft saved");

    act(() => { api.dismissAll(); api.error("Upload failed"); });
    expect(el.querySelector('[role="alert"]').textContent).toContain("Upload failed");
  });

  it("auto-dismisses an acknowledgement but never an error", () => {
    vi.useFakeTimers();
    const { el, api } = toastHarness();

    act(() => { api.success("Draft saved"); });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(el.textContent).not.toContain("Draft saved");

    act(() => { api.error("Upload failed"); });
    act(() => { vi.advanceTimersByTime(60000); });
    expect(el.textContent).toContain("Upload failed");
  });

  it("holds the timer while the page is hidden", () => {
    // Otherwise a toast raised as the user switches apps spends its whole life
    // in the background and is gone when they come back.
    vi.useFakeTimers();
    const { el, api } = toastHarness();
    let hidden = false;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });

    act(() => { api.success("Draft saved"); });

    hidden = true;
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    act(() => { vi.advanceTimersByTime(30000); });
    expect(el.textContent).toContain("Draft saved");

    hidden = false;
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    act(() => { vi.advanceTimersByTime(6000); });
    expect(el.textContent).not.toContain("Draft saved");
  });

  it("shows one at a time and queues the rest in order", () => {
    vi.useFakeTimers();
    const { el, api } = toastHarness();

    act(() => { api.success("First"); api.success("Second"); });
    expect(el.textContent).toContain("First");
    expect(el.textContent).not.toContain("Second");

    act(() => { vi.advanceTimersByTime(6000); });
    expect(el.textContent).toContain("Second");
  });

  it("discards a waiting acknowledgement rather than a waiting error when full", () => {
    const { el, api } = toastHarness();

    act(() => {
      api.error("Blocking");        // visible, persists
      api.error("Also broken");     // queued behind it, must survive
      api.success("Filler one");    // the oldest evictable message
      api.success("Filler two");
      api.success("Filler three");  // overflows the queue: evicts Filler one
    });

    // Walk the queue by dismissing the visible message and reading the next.
    const next = () => {
      act(() => { el.querySelector(".ckm-toast__close").click(); });
      return el.textContent;
    };

    expect(el.textContent).toContain("Blocking");
    expect(next()).toContain("Also broken");
    expect(next()).toContain("Filler two");
    expect(el.textContent).not.toContain("Filler one");
  });

  it("runs an action once and dismisses, without nesting a button in a button", () => {
    const onAction = vi.fn();
    const { el, api } = toastHarness();

    act(() => { api.show({ tone: "success", title: "Project deleted", action: { label: "Undo", onAction } }); });

    const action = el.querySelector(".ckm-toast__action");
    expect(action.tagName).toBe("BUTTON");
    expect(action.closest("button:not(.ckm-toast__action)")).toBeNull();

    act(() => { action.click(); });
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(el.textContent).not.toContain("Project deleted");
  });

  it("names its dismiss control after the message it dismisses", () => {
    const { el, api } = toastHarness();
    act(() => { api.success("Draft saved"); });
    expect(el.querySelector(".ckm-toast__close").getAttribute("aria-label")).toBe("Dismiss: Draft saved");
  });

  it("marks the layer as a live region so the inert walk leaves it alone", () => {
    const { el } = toastHarness();
    expect(el.querySelector(".ckm-toast__layer").hasAttribute("data-ckm-live-region")).toBe(true);
  });
});

describe("InlineMessage", () => {
  it("interrupts for an error", () => {
    expect(render(<InlineMessage tone="error" title="Nope" />).querySelector('[role="alert"]')).toBeTruthy();
  });

  it("merely reports for every other tone", () => {
    // role="alert" is assertive and cuts off whatever is being read; the APG
    // treats reaching for it too often as a failure in its own right.
    const el = render(<InlineMessage tone="info" title="FYI" />);
    expect(el.querySelector('[role="status"]')).toBeTruthy();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it("offers a retry that is a real control", () => {
    const onRetry = vi.fn();
    const el = render(<InlineMessage tone="error" title="Could not load" onRetry={onRetry} />);
    const button = el.querySelector(".ckm-button");
    expect(button.textContent).toContain("Try again");
    act(() => { button.click(); });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("titles the panel form with a real heading", () => {
    const el = render(<InlineMessage variant="panel" tone="error" title="We could not load this" />);
    expect(el.querySelector("h3")?.textContent).toBe("We could not load this");
  });

  it("does not carry its tone by colour alone", () => {
    const el = render(<InlineMessage tone="warning" title="Careful" />);
    expect(el.querySelector(".ckm-message__icon").textContent).toBe("warning");
  });
});

describe("OfflineBanner", () => {
  let onLine;

  beforeEach(() => {
    onLine = true;
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => onLine,
    });
  });

  function setOnline(next) {
    onLine = next;
    act(() => { window.dispatchEvent(new Event(next ? "online" : "offline")); });
  }

  it("keeps its region mounted and silent while connectivity is fine", () => {
    const el = render(<OfflineBanner />);
    expect(el.querySelector('[role="status"]')).toBeTruthy();
    expect(el.querySelector(".ckm-offline__bar")).toBeNull();
  });

  it("reports a lost connection as a hint, not as a verdict", () => {
    const el = render(<OfflineBanner />);
    setOnline(false);
    // MDN: navigator.onLine is inherently unreliable, so the copy must not
    // claim more than "appear".
    expect(el.textContent).toContain("appear to be offline");
    expect(el.querySelector(".ckm-offline__bar--offline")).toBeTruthy();
  });

  it("claims the device is back, never that the request will now succeed", () => {
    const el = render(<OfflineBanner onRetry={() => {}} />);
    setOnline(false);
    setOnline(true);
    expect(el.textContent).toContain("Your device is back online");
    expect(el.querySelector(".ckm-offline__action").textContent).toBe("Retry");
  });

  it("offers the retry to the screen and clears itself once taken", () => {
    const onRetry = vi.fn();
    const el = render(<OfflineBanner onRetry={onRetry} />);
    setOnline(false);
    setOnline(true);
    act(() => { el.querySelector(".ckm-offline__action").click(); });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(el.querySelector(".ckm-offline__bar")).toBeNull();
  });

  it("says nothing on a first load that was never offline", () => {
    onLine = true;
    const el = render(<OfflineBanner />);
    expect(el.querySelector(".ckm-offline__bar")).toBeNull();
  });
});

describe("Skeletons", () => {
  it("announces one sentence and hides every shape", () => {
    const el = render(
      <SkeletonGroup label="Loading your projects">
        <SkeletonRows rows={3} />
      </SkeletonGroup>,
    );

    const group = el.querySelector('[role="status"]');
    expect(group.getAttribute("aria-busy")).toBe("true");
    expect(group.textContent).toBe("Loading your projects");
    expect(el.querySelector(".ckm-skel__shapes").getAttribute("aria-hidden")).toBe("true");
    expect(el.querySelectorAll(".ckm-skel__row")).toHaveLength(3);
  });

  it("ends a paragraph mid-line, the way real text does", () => {
    const el = render(<SkeletonGroup><SkeletonText lines={3} /></SkeletonGroup>);
    const lines = el.querySelectorAll(".ckm-skel__lines .ckm-skel__shape");
    expect(lines).toHaveLength(3);
    expect(lines[2].style.width).toBe("62%");
    expect(lines[0].style.width).toBe("100%");
  });

  it("never renders a zero-row placeholder", () => {
    const el = render(<SkeletonGroup><SkeletonRows rows={0} /></SkeletonGroup>);
    expect(el.querySelectorAll(".ckm-skel__row").length).toBeGreaterThan(0);
  });
});
