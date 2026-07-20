import { describe, it, expect } from "vitest";

// Mirrors the prefix/suffix narrowing in ScreenplayEditor's external-value sync effect.
// Kept as a standalone function so the behaviour that protects the local caret is pinned by a test.
const narrow = (current, next) => {
  let start = 0;
  const max = Math.min(current.length, next.length);
  while (start < max && current[start] === next[start]) start += 1;
  let endCurrent = current.length;
  let endNext = next.length;
  while (endCurrent > start && endNext > start && current[endCurrent - 1] === next[endNext - 1]) {
    endCurrent -= 1;
    endNext -= 1;
  }
  return { from: start, to: endCurrent, insert: next.slice(start, endNext) };
};

const apply = (current, ch) => current.slice(0, ch.from) + ch.insert + current.slice(ch.to);

// CodeMirror maps a cursor through a change: positions strictly before the changed span are
// untouched; positions after shift by the length delta.
const mapCursor = (pos, ch) => {
  if (pos <= ch.from) return pos;
  if (pos >= ch.to) return pos + (ch.insert.length - (ch.to - ch.from));
  return ch.from + ch.insert.length; // inside the replaced span
};

describe("editor external-value sync narrowing", () => {
  const doc = [
    "INT. ROOM - DAY", "", "Sam paces.", "",
    "EXT. PARK - DAY", "", "Riya runs.", "",
    "INT. KITCHEN - NIGHT", "", "Alex burns toast.", "",
  ].join("\n");

  it("produces the same document as a full replace", () => {
    const next = doc.replace("Riya runs.", "Riya sprints past the fountain.");
    expect(apply(doc, narrow(doc, next))).toBe(next);
  });

  it("touches only the changed span, not the whole document", () => {
    const next = doc.replace("Riya runs.", "Riya sprints.");
    const ch = narrow(doc, next);
    expect(ch.from).toBeGreaterThan(0);
    expect(ch.to).toBeLessThan(doc.length);
    // A full-doc replace would have been from:0 to:doc.length — the bug this guards against.
    expect(ch.to - ch.from).toBeLessThan(doc.length / 2);
  });

  it("leaves a caret in an EARLIER scene exactly where it was", () => {
    const caret = doc.indexOf("Sam paces.") + 4; // local writer typing in scene 1
    const next = doc.replace("Riya runs.", "Riya sprints past the fountain.");
    expect(mapCursor(caret, narrow(doc, next))).toBe(caret);
  });

  it("shifts a caret in a LATER scene by exactly the length delta", () => {
    const caret = doc.indexOf("Alex burns toast.") + 4; // local writer typing in scene 3
    const next = doc.replace("Riya runs.", "Riya sprints past the fountain.");
    const delta = next.length - doc.length;
    // Still the same character offset within their own line — i.e. visually unmoved.
    const mapped = mapCursor(caret, narrow(doc, next));
    expect(mapped).toBe(caret + delta);
    expect(next.slice(mapped - 4, mapped)).toBe(doc.slice(caret - 4, caret));
  });

  it("handles pure insertion at the end (new scene appended by a co-writer)", () => {
    const next = doc + "\nINT. HALL - DAY\n\nNew scene.\n";
    const ch = narrow(doc, next);
    expect(ch.from).toBe(doc.length);
    expect(ch.to).toBe(doc.length);
    expect(apply(doc, ch)).toBe(next);
    // A caret anywhere in the existing document is completely unaffected.
    expect(mapCursor(10, ch)).toBe(10);
  });
});
