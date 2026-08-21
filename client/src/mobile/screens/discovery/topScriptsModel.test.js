import { describe, expect, it } from "vitest";
import {
  TOP_SCRIPTS_BUDGETS,
  TOP_SCRIPTS_SORTS,
  activeTopScriptsFilters,
  appendTopScriptsPage,
  buildTopScriptsApiParams,
  describeTopScriptMetric,
  normalizeTopScriptsPage,
  readTopScriptsState,
  topScriptsStateToParams,
} from "./topScriptsModel";

describe("top scripts URL and request model", () => {
  it("round-trips all five ranking modes and four facets", () => {
    TOP_SCRIPTS_SORTS.forEach(({ value }) => {
      const params = topScriptsStateToParams({
        sort: value,
        genre: "Drama",
        contentType: "movie",
        budget: "medium",
        pricing: "premium",
      });
      expect(readTopScriptsState(params)).toEqual({
        sort: value,
        genre: "Drama",
        contentType: "movie",
        budget: "medium",
        pricing: "premium",
      });
    });
  });

  it("bounds the native request to an explicit page", () => {
    const state = readTopScriptsState(new URLSearchParams("sort=trending&genre=Drama"));
    const params = buildTopScriptsApiParams(state, 3);
    expect(params.get("sort")).toBe("trending");
    expect(params.get("page")).toBe("3");
    expect(params.get("limit")).toBe("12");
    expect(params.get("genre")).toBe("Drama");
  });

  it("normalizes the legacy array and deduplicates appended pages", () => {
    expect(normalizeTopScriptsPage([{ _id: "a" }])).toMatchObject({ total: 1, hasMore: false });
    const current = normalizeTopScriptsPage({
      scripts: [{ _id: "a" }],
      pagination: { page: 1, limit: 12, total: 3, hasMore: true },
    });
    const incoming = normalizeTopScriptsPage({
      scripts: [{ _id: "a" }, { _id: "b" }],
      pagination: { page: 2, limit: 12, total: 3, hasMore: true },
    });
    expect(appendTopScriptsPage(current, incoming).scripts.map(({ _id }) => _id)).toEqual(["a", "b"]);
  });

  it("states the active ranking metric and facets in text", () => {
    expect(describeTopScriptMetric({ trendScore: 19.6 }, "trending")).toEqual({ value: 20, label: "trend score" });
    expect(activeTopScriptsFilters(readTopScriptsState(new URLSearchParams("genre=Drama&pricing=free"))))
      .toHaveLength(2);
  });
  /*
   * DEF-20. The desktop Top page offered "mid" and this model copied it, but
   * Script.budget's enum is "medium" — so that facet returned zero projects
   * under every ranking, on both platforms, since the page shipped.
   */
  it("offers only budget values the Script enum can store", () => {
    expect(TOP_SCRIPTS_BUDGETS.map(({ value }) => value))
      .toEqual(["micro", "low", "medium", "high", "blockbuster"]);
    expect(readTopScriptsState(new URLSearchParams("budget=mid")).budget).toBe("");
  });
});
