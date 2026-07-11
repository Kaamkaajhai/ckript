import { describe, it, expect } from "vitest";
import { splitScreenplayIntoPages } from "./pages";
import { countPages } from "./paginate";

describe("splitScreenplayIntoPages", () => {
  it("returns [] for empty/whitespace input", () => {
    expect(splitScreenplayIntoPages("")).toEqual([]);
    expect(splitScreenplayIntoPages("   \n  ")).toEqual([]);
  });

  it("keeps a short script on a single page and drops nothing meaningful", () => {
    const text = "INT. ROOM - DAY\n\nMary enters.\n\nMARY\nHello.";
    const pages = splitScreenplayIntoPages(text);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toContain("INT. ROOM - DAY");
    expect(pages[0]).toContain("Hello.");
  });

  it("ignores legacy '===' markers (page breaks were removed) — no split, marker stripped", () => {
    const text = "INT. A - DAY\n\nAction one.\n\n===\n\nINT. B - DAY\n\nAction two.";
    const pages = splitScreenplayIntoPages(text);
    // Content-based only: this short script is a single page and the stray === never shows.
    expect(pages).toHaveLength(1);
    expect(pages.join("\n")).not.toContain("===");
    expect(pages[0]).toContain("INT. A - DAY");
    expect(pages[0]).toContain("INT. B - DAY");
  });

  it("page count matches the canonical paginator (countPages)", () => {
    const text = Array.from({ length: 20 }, (_, i) => `INT. ROOM ${i} - DAY\n\nA line of action to fill the page as the scene plays out.\n\n`).join("");
    expect(splitScreenplayIntoPages(text)).toHaveLength(countPages(text));
  });
});
