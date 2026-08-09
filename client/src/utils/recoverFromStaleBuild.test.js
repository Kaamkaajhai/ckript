// @vitest-environment happy-dom
//
// Deploying while someone has the page open strands their tab on a build the server has deleted:
// every lazy route asks for a chunk hash that no longer exists. Reloading fixes it. The danger is
// the fix itself — a handler that reloads unconditionally turns one blank page into an endless
// refresh loop the moment a chunk is missing for a reason reloading cannot cure. So the loop guard
// is what these tests are really about.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const fire = () => {
  const event = new Event("vite:preloadError", { cancelable: true });
  event.payload = new Error("Failed to fetch dynamically imported module");
  window.dispatchEvent(event);
  return event;
};

let reload;

beforeEach(async () => {
  vi.resetModules();
  sessionStorage.clear();
  reload = vi.fn();
  // happy-dom's location.reload is not configurable directly; replace the accessor.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload },
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("a tab running a deleted build reloads itself", () => {
  it("reloads once when a chunk from a previous deploy is gone", async () => {
    const { default: recover } = await import("./recoverFromStaleBuild.js");
    recover();

    const event = fire();

    expect(reload).toHaveBeenCalledTimes(1);
    // Vite would otherwise rethrow this as an unhandled rejection.
    expect(event.defaultPrevented).toBe(true);
  });

  it("NEVER reloads a second time — a broken deploy must not spin the page forever", async () => {
    const { default: recover } = await import("./recoverFromStaleBuild.js");
    recover();

    fire();
    expect(reload).toHaveBeenCalledTimes(1);

    // The reload happened; the flag survives it. A chunk still missing means reloading cannot help.
    fire();
    fire();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("lets the error surface once it has given up, rather than swallowing it", async () => {
    const { default: recover } = await import("./recoverFromStaleBuild.js");
    recover();

    fire();
    const second = fire();

    // Not prevented: the error boundary should get a chance to say something honest.
    expect(second.defaultPrevented).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("re-arms after a load that succeeded", async () => {
    const mod = await import("./recoverFromStaleBuild.js");
    mod.default();

    fire();
    expect(reload).toHaveBeenCalledTimes(1);

    // main.jsx clears the flag after render — the build is intact, so a future deploy gets its shot.
    mod.clearStaleBuildFlag();
    fire();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload when sessionStorage is unavailable", async () => {
    // Private mode / storage disabled. Unable to count attempts, it must fail CLOSED: a blank page
    // is recoverable by hand, an infinite reload loop is not.
    // happy-dom does not route sessionStorage through Storage.prototype, so spy on the instance.
    const getItem = vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    const { default: recover } = await import("./recoverFromStaleBuild.js");
    recover();
    fire();

    expect(reload).not.toHaveBeenCalled();
    getItem.mockRestore();
  });
});
