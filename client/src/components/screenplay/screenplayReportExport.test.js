import { describe, expect, it } from "vitest";
import {
  reportCsvCell,
  safeReportTitle,
  serializeScreenplayReportCsv,
} from "./screenplayReportExport";

describe("screenplay report exports", () => {
  it("uses a real fallback for blank titles", () => {
    expect(safeReportTitle("   ")).toBe("Script");
    expect(safeReportTitle("  The Train  ")).toBe("The Train");
  });

  it("escapes commas, quotes and line breaks without changing plain cells", () => {
    expect(reportCsvCell("Plain heading")).toBe("Plain heading");
    expect(reportCsvCell('INT. CAFE, NIGHT — "LATE"'))
      .toBe('"INT. CAFE, NIGHT — ""LATE"""');
    expect(reportCsvCell("two\nlines")).toBe('"two\nlines"');
  });

  it("serializes the scene columns desktop and mobile both promise", () => {
    const csv = serializeScreenplayReportCsv("scenes", [{
      number: 2,
      heading: "EXT. PLATFORM, NIGHT",
      page: 4,
      elements: 8,
      lineLength: 13,
    }]);
    expect(csv).toBe([
      "#,Heading,Page,Length (elements),Lines",
      '2,"EXT. PLATFORM, NIGHT",4,8,13',
    ].join("\r\n"));
  });

  it("serializes the character columns from the same definition", () => {
    const csv = serializeScreenplayReportCsv("characters", [{
      name: "MEHER",
      lines: 7,
      scenes: 2,
      first: 1,
      last: 4,
    }]);
    expect(csv).toContain("Character,Lines,Scenes,First,Last");
    expect(csv).toContain("MEHER,7,2,1,4");
  });

  it("refuses an unknown report rather than producing a plausible wrong file", () => {
    expect(() => serializeScreenplayReportCsv("beats", [])).toThrow(/Unknown screenplay report/);
  });
});
