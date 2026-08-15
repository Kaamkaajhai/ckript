// @vitest-environment happy-dom
//
// The producer-side scheduling gate.
//
// The bug this pins: "goes till connect connect then nothing". Two faults stacked.
//
//   1. The gate read `user.googleCalendar.connected` from AuthContext, which hydrates from the
//      localStorage copy written at LOGIN. A calendar connected after that is invisible to it, so a
//      producer who had already connected was asked to connect again — every time, forever.
//   2. Consent was a full-page redirect, which unmounts the modal. They consented, came back, and
//      the scheduling form was simply gone.
//
// So the modal must ask the SERVER on open, and must survive the consent round trip.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const api = { get: vi.fn(), post: vi.fn(), delete: vi.fn() };
vi.mock("../services/api", () => ({ default: api }));

const { AuthContext } = await import("../context/AuthContext.jsx");
const { default: MeetingModal } = await import("./MeetingModal.jsx");

let host;
let root;

const STALE_PRODUCER = {
  _id: "p1",
  name: "Producer",
  // What login wrote. The producer HAS since connected; this copy cannot know that.
  googleCalendar: { connected: false },
};

const render = async (user = STALE_PRODUCER, props = {}) => {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
        <MeetingModal
          isOpen
          onClose={() => {}}
          writerId="w1"
          scriptId="s1"
          writerName="Writer"
          scriptName="Script"
          {...props}
        />
      </AuthContext.Provider>,
    );
  });
  return host.textContent || "";
};

beforeEach(() => {
  vi.clearAllMocks();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

describe("the gate believes the server, not the login snapshot", () => {
  it("shows the scheduling form when the server says connected, even though AuthContext says no", async () => {
    api.get.mockResolvedValue({ data: { connected: true, calendarEmail: "p@x.com", configured: true } });

    const text = await render();

    expect(api.get).toHaveBeenCalledWith("/google-calendar/status");
    // The whole bug in one assertion: a stale `false` must not re-prompt.
    expect(text).not.toContain("Connect Google Calendar");
  });

  it("still shows the connect gate when the server says not connected", async () => {
    api.get.mockResolvedValue({ data: { connected: false, configured: true } });

    const text = await render();

    expect(text).toContain("Connect Google Calendar");
  });

  it("falls back to the known state rather than blocking when the status call fails", async () => {
    api.get.mockRejectedValue(new Error("offline"));

    const text = await render({ ...STALE_PRODUCER, googleCalendar: { connected: true } });

    // Offline must not strand a producer who is in fact connected.
    expect(text).not.toContain("Connect Google Calendar");
  });

  it("says so when the server has no Google credentials configured", async () => {
    api.get.mockResolvedValue({ data: { connected: false, configured: false } });

    const text = await render();

    expect(text).toContain("not configured");
  });
});

describe("consent runs in a popup, so the modal survives it", () => {
  it("opens a popup instead of navigating the page away", async () => {
    api.get.mockResolvedValue({ data: { connected: false, configured: true } });
    api.post.mockResolvedValue({ data: { url: "https://accounts.google.com/o/oauth2/v2/auth?x=1" } });
    const popup = { closed: false, close: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(popup);

    await render();
    const connectBtn = [...host.querySelectorAll("button")].find((b) => /Connect Google Calendar/.test(b.textContent));
    await act(async () => connectBtn.click());

    expect(open).toHaveBeenCalledWith(
      "https://accounts.google.com/o/oauth2/v2/auth?x=1",
      "ckript-google-calendar",
      expect.stringContaining("width="),
    );
    // The modal is still mounted — this is the half that used to be destroyed.
    expect(host.textContent).toBeTruthy();
  });

  it("NEVER reads popup.closed — COOP makes it report true from the moment it opens", async () => {
    // The regression this exists for: Google's consent pages send Cross-Origin-Opener-Policy, which
    // severs the opener link. Chrome then blocks the read and `closed` comes back true. Trusting it
    // told the producer "Connection cancelled before Google finished" about a second in, while they
    // were still looking at the consent screen.
    api.get.mockResolvedValue({ data: { connected: false, configured: true } });
    api.post.mockResolvedValue({ data: { url: "https://accounts.google.com/consent" } });

    let closedReads = 0;
    const popup = {
      get closed() { closedReads += 1; return true; }, // what COOP actually does
      close: vi.fn(),
    };
    vi.spyOn(window, "open").mockReturnValue(popup);
    vi.useFakeTimers();

    await render();
    const connectBtn = [...host.querySelectorAll("button")].find((b) => /Connect Google Calendar/.test(b.textContent));
    await act(async () => connectBtn.click());

    // Run several poll ticks.
    for (let i = 0; i < 4; i += 1) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    }

    expect(closedReads).toBe(0);
    expect(host.textContent).not.toContain("cancelled");
    vi.useRealTimers();
  });

  it("completes when the popup announces success, without any window reference", async () => {
    api.get.mockResolvedValue({ data: { connected: false, configured: true } });
    api.post.mockResolvedValue({ data: { url: "https://accounts.google.com/consent" } });
    vi.spyOn(window, "open").mockReturnValue({ closed: false, close: vi.fn() });

    await render();
    const connectBtn = [...host.querySelectorAll("button")].find((b) => /Connect Google Calendar/.test(b.textContent));
    await act(async () => connectBtn.click());

    // The popup, back on our origin, writes to storage. That is the signal COOP cannot block.
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "ckript:google-calendar:result",
          newValue: `connected:${Date.now()}`,
        }),
      );
    });

    expect(host.textContent).not.toContain("Connect Google Calendar");
  });

  it("falls back to a full-page redirect when the popup is blocked", async () => {
    api.get.mockResolvedValue({ data: { connected: false, configured: true } });
    api.post.mockResolvedValue({ data: { url: "https://accounts.google.com/consent" } });
    vi.spyOn(window, "open").mockReturnValue(null); // blocked

    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, get href() { return ""; }, set href(v) { assign(v); } },
    });

    await render();
    const connectBtn = [...host.querySelectorAll("button")].find((b) => /Connect Google Calendar/.test(b.textContent));
    await act(async () => connectBtn.click());

    expect(assign).toHaveBeenCalledWith("https://accounts.google.com/consent");
  });
});
