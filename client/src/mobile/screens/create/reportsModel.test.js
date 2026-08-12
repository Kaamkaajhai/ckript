import { describe, expect, it } from "vitest";
import {
  buildReports,
  DEFAULT_REPORT_SORT,
  REPORT_SORT_OPTIONS,
  REPORT_TAB,
  sortReportRows,
} from "./reportsModel";

const SCRIPT = [
  "INT. KITCHEN - DAY",
  "",
  "ANA",
  "Toast again.",
  "",
  "EXT. PLATFORM - NIGHT",
  "",
  "MEHER",
  "Last train.",
  "",
  "ANA",
  "There is always another.",
].join("\n");

describe("mobile screenplay reports model", () => {
  it("derives both views from the shared screenplay parser", () => {
    const reports = buildReports(SCRIPT);
    expect(reports.scenes.map((scene) => scene.heading)).toEqual([
      "INT. KITCHEN - DAY",
      "EXT. PLATFORM - NIGHT",
    ]);
    expect(reports.characters.map((character) => character.name)).toEqual(["ANA", "MEHER"]);
    expect(reports.characters[0]).toMatchObject({ lines: 2, scenes: 2, first: 1, last: 2 });
  });

  it("sorts numbers and words in either direction", () => {
    const rows = [
      { name: "Zulu", lines: 2 },
      { name: "Ana", lines: 8 },
      { name: "Meher", lines: 4 },
    ];
    expect(sortReportRows(rows, "lines:desc").map((row) => row.lines)).toEqual([8, 4, 2]);
    expect(sortReportRows(rows, "name:asc").map((row) => row.name)).toEqual(["Ana", "Meher", "Zulu"]);
  });

  it("keeps source order when the selected values tie", () => {
    const rows = [
      { name: "First", scenes: 2 },
      { name: "Second", scenes: 2 },
      { name: "Third", scenes: 1 },
    ];
    expect(sortReportRows(rows, "scenes:desc").map((row) => row.name))
      .toEqual(["First", "Second", "Third"]);
  });

  it("publishes one valid default for every visible tab", () => {
    for (const tab of Object.values(REPORT_TAB)) {
      expect(REPORT_SORT_OPTIONS[tab].some((option) => option.value === DEFAULT_REPORT_SORT[tab])).toBe(true);
    }
  });
});
