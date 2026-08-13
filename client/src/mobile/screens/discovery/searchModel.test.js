import { describe, expect, it } from "vitest";
import {
  EMPTY_SEARCH_STATE,
  activeSearchFilters,
  appendSearchPage,
  buildSearchApiParams,
  hasSearchIntent,
  normalizeSearchPage,
  readSearchState,
  searchStateToParams,
} from "./searchModel";

describe("mobile search URL contract", () => {
  it("restores every supported scope, facet and sort from the URL", () => {
    const state = readSearchState(new URLSearchParams(
      "q=night&type=projects&genre=Drama&contentType=movie&budget=medium&pricing=free&sort=views",
    ));
    expect(state).toEqual({
      q: "night",
      type: "projects",
      genre: "Drama",
      contentType: "movie",
      budget: "medium",
      pricing: "free",
      sort: "views",
    });
    expect(searchStateToParams(state).toString()).toContain("genre=Drama");
  });

  it("drops invalid URL values instead of sending invented filters", () => {
    expect(readSearchState(new URLSearchParams("type=films&genre=Nope&sort=random")))
      .toEqual(EMPTY_SEARCH_STATE);
  });

  it("maps the visible pricing vocabulary to the existing server query", () => {
    const params = buildSearchApiParams({ ...EMPTY_SEARCH_STATE, pricing: "premium" }, 3);
    expect(params.get("premium")).toBe("true");
    expect(params.get("page")).toBe("3");
    expect(params.get("limit")).toBe("10");
  });
});

describe("mobile search results", () => {
  it("does not browse merely because a scope changed, but filters are a valid search", () => {
    expect(hasSearchIntent({ ...EMPTY_SEARCH_STATE, type: "writers" })).toBe(false);
    expect(hasSearchIntent({ ...EMPTY_SEARCH_STATE, genre: "Drama" })).toBe(true);
  });

  it("builds removable labels for every active facet", () => {
    const labels = activeSearchFilters({
      ...EMPTY_SEARCH_STATE,
      genre: "Drama",
      contentType: "movie",
      pricing: "free",
      sort: "score",
    });
    expect(labels.map((item) => item.label)).toEqual(["Drama", "Movie", "Free only", "Top rated"]);
  });

  it("appends pages without duplicating a repeated boundary item", () => {
    const first = normalizeSearchPage({
      users: [{ _id: "u1" }],
      scripts: [{ _id: "s1" }],
      pagination: { page: 1, users: { total: 2, hasMore: true }, scripts: { total: 2, hasMore: true } },
    });
    const second = normalizeSearchPage({
      users: [{ _id: "u1" }, { _id: "u2" }],
      scripts: [{ _id: "s2" }],
      pagination: { page: 2, users: { total: 2 }, scripts: { total: 2 } },
    });
    const merged = appendSearchPage(first, second);
    expect(merged.users.map((item) => item._id)).toEqual(["u1", "u2"]);
    expect(merged.scripts.map((item) => item._id)).toEqual(["s1", "s2"]);
  });
});
