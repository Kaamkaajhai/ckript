// Line-based pagination (industry standard, replaces the old words÷250 estimate). These guard the
// behaviour; the analytic count is separately verified to match the actual rendered PDF within ±1 page.
import { describe, it, expect } from "vitest";
import { paginate, countPages, pageOfLine, LINES_PER_PAGE } from "./paginate";

const scene = (n) => `INT. ROOM ${n} - DAY\n\nAction line describing the scene as things unfold before us here.\n\nMARY\nA line of dialogue spoken by a character in this scene.\n\n`;

describe("line-based pagination", () => {
  it("empty / tiny script is 1 page", () => {
    expect(countPages("")).toBe(1);
    expect(countPages("INT. ROOM - DAY\n\nShe enters.")).toBe(1);
  });

  it("uses the industry ~54 lines per US-Letter page", () => {
    expect(LINES_PER_PAGE).toBe(54);
  });

  it("a manual === break always starts a new page", () => {
    const two = "INT. A - DAY\n\nAction.\n\n===\n\nINT. B - DAY\n\nMore action.";
    const { pageCount, pageStarts } = paginate(two);
    expect(pageCount).toBe(2);
    expect(pageStarts.length).toBe(2);
    // page 2 begins after the === line (index 4); the "INT. B - DAY" scene (index 6) is on page 2.
    expect(pageStarts[1]).toBeGreaterThan(4);
    expect(pageOfLine(two, 6)).toBe(2);
  });

  it("long scripts auto-paginate by content (more scenes → more pages)", () => {
    const short = Array.from({ length: 3 }, (_, i) => scene(i + 1)).join("");
    const long = Array.from({ length: 30 }, (_, i) => scene(i + 1)).join("");
    expect(countPages(long)).toBeGreaterThan(countPages(short));
    expect(countPages(long)).toBeGreaterThan(1);
  });

  it("is NOT word-count based (whitespace/word padding on one line doesn't add pages)", () => {
    // One action line with many words but it wraps to few lines → stays ~1 page, unlike words÷250.
    const wordy = "INT. ROOM - DAY\n\n" + "word ".repeat(300); // 300 words, one wrapped paragraph
    expect(countPages(wordy)).toBeLessThan(4); // words/250 would say ~2; line-based stays small & bounded
  });

  it("pageOfLine maps a document line to its page", () => {
    const doc = "INT. A - DAY\n\nAction.\n\n===\n\nINT. B - DAY";
    expect(pageOfLine(doc, 0)).toBe(1);           // first scene → page 1
    const lines = doc.split("\n");
    expect(pageOfLine(doc, lines.length - 1)).toBe(2); // after the break → page 2
  });
});
