// @vitest-environment happy-dom
//
// The two pieces every competition screen depends on. The countdown is the one that matters most:
// it decides what a writer believes about their remaining time, and it must trust the SERVER's
// clock, not the device's — a laptop that is ten minutes fast would otherwise steal ten minutes.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import CountdownTimer from "./CountdownTimer";
import PhaseTimeline from "./PhaseTimeline";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container, root;
const render = (el) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(el));
  return container;
};
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const DEVICE_NOW = new Date("2026-03-01T12:00:00.000Z");

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(DEVICE_NOW);
  });

  it("counts down to the target", () => {
    const target = new Date(DEVICE_NOW.getTime() + (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);
    const el = render(<CountdownTimer target={target.toISOString()} serverNow={DEVICE_NOW.toISOString()} />);
    expect(el.textContent).toContain("02");   // days
    expect(el.textContent).toContain("03");   // hours
    expect(el.textContent).toContain("04");   // minutes
    expect(el.textContent).toContain("05");   // seconds
  });

  it("ticks once per second", () => {
    const target = new Date(DEVICE_NOW.getTime() + 90_000);
    const el = render(<CountdownTimer target={target.toISOString()} serverNow={DEVICE_NOW.toISOString()} size="sm" />);
    expect(el.textContent).toContain("00:01:30");
    act(() => { vi.advanceTimersByTime(5000); });
    expect(el.textContent).toContain("00:01:25");
  });

  it("corrects for a device clock that is ahead of the server", () => {
    // The device thinks it is 12:00; the server says it is 11:50. The real deadline is 11:55
    // server-time — five minutes away — even though the device would call it five minutes PAST.
    const serverNow = new Date(DEVICE_NOW.getTime() - 10 * 60_000);
    const target = new Date(serverNow.getTime() + 5 * 60_000);
    const el = render(<CountdownTimer target={target.toISOString()} serverNow={serverNow.toISOString()} size="sm" />);
    expect(el.textContent).toContain("00:05:00");
  });

  it("corrects for a device clock that is behind the server", () => {
    const serverNow = new Date(DEVICE_NOW.getTime() + 10 * 60_000);
    const target = new Date(serverNow.getTime() + 60_000);
    const el = render(<CountdownTimer target={target.toISOString()} serverNow={serverNow.toISOString()} size="sm" />);
    expect(el.textContent).toContain("00:01:00");
  });

  it("floors at zero and fires onExpire exactly once", () => {
    const onExpire = vi.fn();
    const target = new Date(DEVICE_NOW.getTime() + 2000);
    const el = render(
      <CountdownTimer target={target.toISOString()} serverNow={DEVICE_NOW.toISOString()} onExpire={onExpire} />,
    );
    expect(onExpire).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(3000); });
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain("00");
    expect(el.textContent).not.toContain("-");   // never counts into negative numbers

    // The interval keeps running; the callback must not fire again.
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("re-arms onExpire when the target moves to the next phase boundary", () => {
    // The landing page keeps one timer alive across boundaries, re-pointing it at the next date.
    // If onExpire only ever fired once per mount, the page would auto-advance a single time and
    // then sit stale until someone reloaded.
    const onExpire = vi.fn();
    const first = new Date(DEVICE_NOW.getTime() + 1000);
    const el = render(<CountdownTimer target={first.toISOString()} serverNow={DEVICE_NOW.toISOString()} onExpire={onExpire} />);

    act(() => { vi.advanceTimersByTime(2000); });
    expect(onExpire).toHaveBeenCalledTimes(1);

    // The page refreshes and hands the SAME component the next boundary.
    const second = new Date(DEVICE_NOW.getTime() + 5000);
    act(() => { root.render(<CountdownTimer target={second.toISOString()} serverNow={DEVICE_NOW.toISOString()} onExpire={onExpire} />); });
    expect(el.textContent).not.toContain("-");

    act(() => { vi.advanceTimersByTime(5000); });
    expect(onExpire).toHaveBeenCalledTimes(2);
  });

  it("renders nothing without a target", () => {
    const el = render(<CountdownTimer target={null} serverNow={DEVICE_NOW.toISOString()} />);
    expect(el.textContent).toBe("");
  });

  it("stops its interval on unmount", () => {
    const target = new Date(DEVICE_NOW.getTime() + 60_000);
    render(<CountdownTimer target={target.toISOString()} serverNow={DEVICE_NOW.toISOString()} />);
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    act(() => root.unmount());
    expect(clearSpy).toHaveBeenCalled();
    // Re-mount an empty tree so the shared afterEach unmount stays valid.
    root = createRoot(container);
    act(() => root.render(<div />));
  });
});

describe("PhaseTimeline", () => {
  const steps = [
    { key: "registration_opens", label: "Registration opens", date: "2026-02-01T00:00:00.000Z", status: "done" },
    { key: "competition_starts", label: "Competition starts", date: "2026-03-05T00:00:00.000Z", status: "current" },
    { key: "results", label: "Results", date: null, status: "upcoming" },
  ];

  it("renders every step with its label", () => {
    const el = render(<PhaseTimeline steps={steps} serverNow={DEVICE_NOW.toISOString()} />);
    expect(el.textContent).toContain("Registration opens");
    expect(el.textContent).toContain("Competition starts");
    expect(el.textContent).toContain("Results");
    expect(el.querySelectorAll("li")).toHaveLength(3);
  });

  it("shows a countdown only on a current step that is still ahead", () => {
    const el = render(<PhaseTimeline steps={steps} serverNow={DEVICE_NOW.toISOString()} />);
    // 2026-03-01T12:00Z to 2026-03-05T00:00Z is three and a half days.
    expect(el.textContent).toContain("3d");
  });

  it("does not count down a current step whose date has passed", () => {
    const past = [{ key: "writing", label: "Writing", date: "2026-02-01T00:00:00.000Z", status: "current" }];
    const el = render(<PhaseTimeline steps={past} serverNow={DEVICE_NOW.toISOString()} />);
    expect(el.textContent).not.toMatch(/\d+d \d\d:\d\d:\d\d/);
  });

  it("renders nothing when there are no steps", () => {
    const el = render(<PhaseTimeline steps={[]} />);
    expect(el.textContent).toBe("");
  });
});
