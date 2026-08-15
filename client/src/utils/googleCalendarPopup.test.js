// @vitest-environment happy-dom
//
// How the consent popup tells the opener what happened, and how it knows it IS the popup.
//
// Two regressions live here. First, `popup.closed` cannot be read through the Cross-Origin-Opener-
// Policy Google sends — it reports true immediately — so the result has to travel through storage
// instead. Second, the same COOP context-group swap RESETS `window.name`, so the popup came back
// nameless, failed to recognise itself, and booted the entire application inside a 520px consent
// window. The marker therefore rides in the URL, which nothing can strip.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const at = (search, name = "") => {
  window.history.replaceState({}, "", `/${search}`);
  window.name = name;
};

let close;

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  close = vi.fn();
  window.close = close;
  document.body.innerHTML = "";
  window.name = "";
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
  window.name = "";
  localStorage.clear();
});

describe("the popup recognises itself", () => {
  it("recognises itself from the URL marker even when COOP wiped window.name", async () => {
    const { announceIfCalendarPopup } = await import("./googleCalendarPopup.js");
    at("?gcalPopup=1&calendar=connected", ""); // name reset by the context-group swap

    expect(announceIfCalendarPopup()).toBe(true);
    expect(close).toHaveBeenCalled();
  });

  it("still recognises itself by name, when the name did survive", async () => {
    const { announceIfCalendarPopup, POPUP_NAME } = await import("./googleCalendarPopup.js");
    at("?calendar=connected", POPUP_NAME);

    expect(announceIfCalendarPopup()).toBe(true);
    expect(close).toHaveBeenCalled();
  });

  it("leaves the MAIN tab alone when the redirect fallback lands there", async () => {
    // The blocked-popup fallback returns to a URL with no marker, in the user's real tab. Closing
    // that, or refusing to render the app in it, would be a far worse bug than the one being fixed.
    const { announceIfCalendarPopup } = await import("./googleCalendarPopup.js");
    at("?calendar=connected", "");

    expect(announceIfCalendarPopup()).toBe(false);
    expect(close).not.toHaveBeenCalled();
  });

  it("ignores an ordinary page load", async () => {
    const { announceIfCalendarPopup } = await import("./googleCalendarPopup.js");
    at("?tab=bookmarks", "");

    expect(announceIfCalendarPopup()).toBe(false);
    expect(close).not.toHaveBeenCalled();
  });

  it("does not leave the full app rendering inside the popup if close is refused", async () => {
    const { announceIfCalendarPopup } = await import("./googleCalendarPopup.js");
    window.close = () => { throw new Error("close refused"); };
    at("?gcalPopup=1&calendar=connected", "");

    expect(announceIfCalendarPopup()).toBe(true);
    expect(document.body.innerHTML).toContain("close this window");
  });
});

describe("the result reaches the opener through storage", () => {
  it("writes a changing value, so the storage event actually fires", async () => {
    const { announceIfCalendarPopup } = await import("./googleCalendarPopup.js");
    at("?gcalPopup=1&calendar=connected", "");

    announceIfCalendarPopup();

    // status:timestamp:reason — the timestamp is what makes the value differ, so `storage` fires.
    const written = localStorage.getItem("ckript:google-calendar:result");
    expect(written).toMatch(/^connected:\d+:/);
  });

  it("reports a failure as well as a success", async () => {
    const { announceIfCalendarPopup } = await import("./googleCalendarPopup.js");
    at("?gcalPopup=1&calendar=error", "");

    announceIfCalendarPopup();

    expect(localStorage.getItem("ckript:google-calendar:result")).toMatch(/^error:/);
  });

  it("carries the server's reason through, so the producer is told which failure it was", async () => {
    const { announceIfCalendarPopup } = await import("./googleCalendarPopup.js");
    at("?gcalPopup=1&calendar=error&reason=no_refresh_token", "");

    announceIfCalendarPopup();

    expect(localStorage.getItem("ckript:google-calendar:result")).toMatch(/^error:\d+:no_refresh_token$/);
  });

  it("delivers status AND reason to a subscriber", async () => {
    const { onCalendarPopupResult } = await import("./googleCalendarPopup.js");
    const seen = [];
    const stop = onCalendarPopupResult((status, reason) => seen.push([status, reason]));

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "ckript:google-calendar:result",
        newValue: `error:${Date.now()}:denied`,
      }),
    );

    expect(seen).toEqual([["error", "denied"]]);
    stop();
  });

  it("delivers the status to a subscriber via the storage event", async () => {
    const { onCalendarPopupResult } = await import("./googleCalendarPopup.js");
    const seen = [];
    const stop = onCalendarPopupResult((s) => seen.push(s));

    window.dispatchEvent(
      new StorageEvent("storage", { key: "ckript:google-calendar:result", newValue: `connected:${Date.now()}` }),
    );
    expect(seen).toEqual(["connected"]);

    stop();
    window.dispatchEvent(
      new StorageEvent("storage", { key: "ckript:google-calendar:result", newValue: `error:${Date.now()}` }),
    );
    expect(seen).toEqual(["connected"]); // unsubscribed
  });

  it("ignores storage traffic that is not ours", async () => {
    const { onCalendarPopupResult } = await import("./googleCalendarPopup.js");
    const seen = [];
    const stop = onCalendarPopupResult((s) => seen.push(s));

    window.dispatchEvent(new StorageEvent("storage", { key: "some-other-key", newValue: "connected:1" }));
    expect(seen).toEqual([]);
    stop();
  });
});
