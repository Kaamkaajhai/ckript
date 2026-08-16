// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { shareProject, shareUrlFor } from "./shareProject";

describe("shareUrlFor", () => {
  it("shares the public project route instead of an authenticated canonical path", () => {
    expect(shareUrlFor({ _id: "script 1", href: "/the-film/ada" }))
      .toBe(`${window.location.origin}/share/project/script%201`);
  });

  it("honours an authoritative share URL from the server", () => {
    expect(shareUrlFor({ shareMeta: { url: "https://ckript.com/share/project/s1" }, _id: "s1" }))
      .toBe("https://ckript.com/share/project/s1");
  });
});

describe("shareProject", () => {
  afterEach(() => vi.restoreAllMocks());

  it("distinguishes dismissal from a failed share", async () => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(Object.assign(new Error("closed"), { name: "AbortError" })),
    });
    expect(await shareProject({ _id: "s1", title: "A Film" })).toBe("dismissed");
  });

  it("copies the public URL when native sharing is unavailable", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    expect(await shareProject({ _id: "s1" })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/share/project/s1`);
  });
});
