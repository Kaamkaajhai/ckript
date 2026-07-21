import { test } from "node:test";
import assert from "node:assert/strict";
import { stripPdfPageFurniture } from "./screenplayImportClean.js";

// A page of screenplay as it comes out of PDF extraction: real content wrapped in page furniture.
const imported = [
  "Rage of Shadows",          // running header
  "INT. KITCHEN",
  "ORISA (25) stands at the head of the table.",
  "ORISA",                    // character cue — repeats like a header, MUST survive
  "He's here.",
  "(CONTINUED)",
  "Page 1 / 121",
  "",
  "Rage of Shadows",
  "2.",                       // bare page number
  "JAKE",
  "The wiring; I've gotta fix it.",
  "writer@example.com",       // contact used as a running footer
  "",
  "Rage of Shadows",
  "ORISA",
  "Wait.",
].join("\n");

test("removes page furniture", () => {
  const out = stripPdfPageFurniture(imported, { title: "Rage of Shadows" });
  assert.ok(!out.includes("(CONTINUED)"), "CONTINUED marker removed");
  assert.ok(!out.includes("Page 1 / 121"), "page footer removed");
  assert.ok(!/^2\.$/m.test(out), "bare page number removed");
  assert.ok(!out.includes("writer@example.com"), "email running header removed");
});

test("keeps character cues, which repeat exactly like a running header", () => {
  const out = stripPdfPageFurniture(imported, { title: "Rage of Shadows" });
  const lines = out.split("\n").map((l) => l.trim());
  assert.equal(lines.filter((l) => l === "ORISA").length, 2, "both ORISA cues survive");
  assert.equal(lines.filter((l) => l === "JAKE").length, 1, "JAKE cue survives");
  assert.ok(out.includes("He's here."), "dialogue survives");
  assert.ok(out.includes("INT. KITCHEN"), "scene heading survives");
});

test("keeps the title once (title page) but strips it as a running header", () => {
  const out = stripPdfPageFurniture(imported, { title: "Rage of Shadows" });
  const count = out.split("\n").filter((l) => l.trim() === "Rage of Shadows").length;
  assert.equal(count, 1, "first occurrence kept, repeats removed");
});

test("a title appearing once is left alone", () => {
  const single = "My Script\nby Someone\n\nINT. ROOM - DAY\n\nAction.";
  const out = stripPdfPageFurniture(single, { title: "My Script" });
  assert.ok(out.includes("My Script"), "single title occurrence is the title page, not furniture");
});

test("does not mangle a clean screenplay", () => {
  const clean = [
    "INT. ROOM - DAY", "", "Sam paces.", "", "SAM", "I can't do this.", "",
    "EXT. PARK - DAY", "", "Riya runs.",
  ].join("\n");
  const out = stripPdfPageFurniture(clean, { title: "Whatever" });
  assert.ok(out.includes("SAM"), "cue kept");
  assert.ok(out.includes("I can't do this."), "dialogue kept");
  assert.ok(out.includes("EXT. PARK - DAY"), "scene kept");
});

test("scene headings and transitions are never treated as furniture", () => {
  // These legitimately repeat across a feature script.
  const repeated = Array.from({ length: 20 }, () => "CUT TO:\n\nINT. ROOM - DAY\n\nAction.").join("\n\n");
  const out = stripPdfPageFurniture(repeated, { title: "X" });
  assert.ok(out.includes("CUT TO:"), "transition survives repetition");
  assert.ok(out.includes("INT. ROOM - DAY"), "scene survives repetition");
});

test("empty input is safe", () => {
  assert.equal(stripPdfPageFurniture(""), "");
  assert.equal(stripPdfPageFurniture(null), "");
});
