import { describe, expect, it } from "vitest";
import {
  filterItems,
  getAwardLabel,
  getScores,
  getStats,
  toYear,
} from "./competitionRecord";

const items = [
  {
    phase: "results",
    competition: {
      name: "Global Script Challenge 2026",
      slug: "global-script-challenge-2026",
      dates: { startsAt: "2026-02-14T18:00:00.000Z" },
      resultsDeclaredAt: "2026-03-02T12:00:00.000Z",
    },
    entry: {
      eventId: "CGSC-WINNER",
      status: "judged",
      submittedAt: "2026-02-16T15:42:00.000Z",
      snapshot: { title: "The Salt Line", pageCount: 47 },
      result: { award: "winner" },
      ai: { evaluation: { plot: 88, overall: 92 } },
    },
  },
  {
    phase: "live",
    competition: {
      name: "Spring 48",
      slug: "spring-48",
      dates: { startsAt: "2025-07-29T18:00:00.000Z" },
      resultsDeclaredAt: null,
    },
    entry: {
      eventId: "CGSC-WRITING",
      status: "writing",
      submittedAt: null,
      snapshot: { title: "", pageCount: 3 },
      result: { award: "none" },
      ai: {},
    },
  },
];

describe("competition record mapping", () => {
  it("derives honest aggregate stats from the API entries", () => {
    expect(getStats(items)).toEqual({ awards: 1, pages: 50, certificates: 1 });
  });

  it("searches competition names, script titles and Event IDs", () => {
    expect(filterItems(items, { query: "salt", status: "all", award: "all", year: "all" })).toEqual([items[0]]);
    expect(filterItems(items, { query: "writing", status: "all", award: "all", year: "all" })).toEqual([items[1]]);
  });

  it("combines status, award and year filters", () => {
    expect(filterItems(items, { status: "judged", award: "honours", year: "2026" })).toEqual([items[0]]);
    expect(filterItems(items, { status: "writing", award: "none", year: "2026" })).toEqual([]);
  });

  it("does not claim an undeclared award", () => {
    expect(getAwardLabel(items[1])).toBe("Pending");
    expect(getAwardLabel(items[0])).toBe("Winner");
  });

  it("normalizes years and score values for display", () => {
    expect(toYear(items[0])).toBe("2026");
    expect(getScores(items[0].entry)).toEqual([
      { key: "plot", label: "Plot", value: 88 },
      { key: "overall", label: "Overall", value: 92 },
    ]);
  });
});
