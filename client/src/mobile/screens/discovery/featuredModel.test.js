import { describe, expect, it } from "vitest";
import {
  EMPTY_FEATURED_STATE,
  FEATURED_BUDGETS,
  FEATURED_PAGE_SIZE,
  FEATURED_SORTS,
  activeFeaturedFilters,
  appendFeaturedPage,
  buildFeaturedApiParams,
  buildFeaturedEditorialParams,
  describeFeaturedMetric,
  featuredStateToParams,
  normalizeFeaturedPage,
  readFeaturedState,
} from "./featuredModel";

const params = (search) => new URLSearchParams(search);

describe("featured URL contract", () => {
  it("restores every facet from a deep link", () => {
    const state = readFeaturedState(params("sort=views&genre=Horror&contentType=tv_series&budget=high&pricing=free"));
    expect(state).toEqual({
      sort: "views",
      genre: "Horror",
      contentType: "tv_series",
      budget: "high",
      pricing: "free",
    });
  });

  it("refuses a value the server does not implement rather than forwarding it", () => {
    const state = readFeaturedState(params("sort=trending&genre=Westerns&contentType=novella&budget=mid&pricing=cheap"));
    expect(state).toEqual(EMPTY_FEATURED_STATE);
  });

  it("omits defaults from the URL so a clean view has a clean address", () => {
    expect(featuredStateToParams(EMPTY_FEATURED_STATE).toString()).toBe("");
    expect(featuredStateToParams({ ...EMPTY_FEATURED_STATE, sort: "score" }).toString()).toBe("sort=score");
  });

  it("round-trips: every state survives a write and a read", () => {
    for (const { value: sort } of FEATURED_SORTS) {
      for (const { value: budget } of FEATURED_BUDGETS) {
        const original = { ...EMPTY_FEATURED_STATE, sort, budget, genre: "Drama", pricing: "premium" };
        expect(readFeaturedState(featuredStateToParams(original))).toEqual(original);
      }
    }
  });

  it("uses the budget values the Script enum actually stores (DEF-20)", () => {
    expect(FEATURED_BUDGETS.map((b) => b.value)).toEqual(["micro", "low", "medium", "high", "blockbuster"]);
    expect(readFeaturedState(params("budget=mid")).budget).toBe("");
    expect(readFeaturedState(params("budget=medium")).budget).toBe("medium");
  });
});

describe("featured request contract", () => {
  it("always asks for a bounded gold-only page", () => {
    const sent = buildFeaturedApiParams(EMPTY_FEATURED_STATE, 3);
    expect(sent.get("page")).toBe("3");
    expect(sent.get("limit")).toBe(String(FEATURED_PAGE_SIZE));
    expect(sent.get("goldOnly")).toBe("true");
    expect(sent.get("sort")).toBe("engagement");
  });

  it("maps pricing onto the premium parameter the controller reads", () => {
    expect(buildFeaturedApiParams({ ...EMPTY_FEATURED_STATE, pricing: "premium" }).get("premium")).toBe("true");
    expect(buildFeaturedApiParams({ ...EMPTY_FEATURED_STATE, pricing: "free" }).get("premium")).toBe("false");
    expect(buildFeaturedApiParams(EMPTY_FEATURED_STATE).has("premium")).toBe(false);
  });

  it("sends no facet the viewer did not choose", () => {
    const sent = buildFeaturedApiParams(EMPTY_FEATURED_STATE);
    for (const facet of ["genre", "contentType", "budget"]) expect(sent.has(facet)).toBe(false);
  });

  it("bounds the editorial set too, and does not narrow it by facet", () => {
    const sent = buildFeaturedEditorialParams();
    expect(sent.get("limit")).toBe(String(FEATURED_PAGE_SIZE));
    expect(sent.has("genre")).toBe(false);
  });
});

describe("featured paging", () => {
  it("reads the additive envelope", () => {
    const page = normalizeFeaturedPage({
      scripts: [{ _id: "a" }, { _id: "b" }],
      pagination: { page: 2, limit: 12, total: 30, hasMore: true },
    });
    expect(page).toEqual({ scripts: [{ _id: "a" }, { _id: "b" }], page: 2, limit: 12, total: 30, hasMore: true });
  });

  it("still reads a legacy bare array, which is what an older server returns", () => {
    const page = normalizeFeaturedPage([{ _id: "a" }]);
    expect(page.total).toBe(1);
    expect(page.hasMore).toBe(false);
    expect(page.page).toBe(1);
  });

  it("never renders the same project twice across appended pages", () => {
    const first = normalizeFeaturedPage({ scripts: [{ _id: "a" }, { _id: "b" }], pagination: { page: 1, total: 3, hasMore: true } });
    const second = normalizeFeaturedPage({ scripts: [{ _id: "b" }, { _id: "c" }], pagination: { page: 2, total: 3, hasMore: false } });
    const merged = appendFeaturedPage(first, second);
    expect(merged.scripts.map((s) => s._id)).toEqual(["a", "b", "c"]);
    expect(merged.hasMore).toBe(false);
  });

  it("drops a result with no id rather than keying a list on undefined", () => {
    expect(normalizeFeaturedPage({ scripts: [{ _id: "a" }, {}, { title: "no id" }] }).scripts).toHaveLength(1);
  });
});

describe("featured ranked metric", () => {
  const project = { views: 1200, readsCount: 100, scriptScore: { overall: 82 }, premium: true, price: 45000 };

  it("states the number the active sort ranked on", () => {
    expect(describeFeaturedMetric(project, "views")).toEqual({ value: "1.2k", label: "views" });
    expect(describeFeaturedMetric(project, "score")).toEqual({ value: "82/100", label: "score" });
    expect(describeFeaturedMetric(project, "engagement")).toEqual({ value: "1.4k", label: "engagement" });
  });

  it("gives both price sorts the same metric, because they rank the same field", () => {
    expect(describeFeaturedMetric(project, "price_high")).toEqual(describeFeaturedMetric(project, "price_low"));
    expect(describeFeaturedMetric({ premium: false }, "price_high")).toEqual({ value: "Free", label: "to read" });
  });

  it("says a project is unevaluated instead of ranking it at zero out of a hundred", () => {
    expect(describeFeaturedMetric({}, "score")).toEqual({ value: "Not", label: "evaluated" });
  });

  it("does not invent a publication date it was not given", () => {
    expect(describeFeaturedMetric({}, "createdAt")).toEqual({ value: "—", label: "published" });
    expect(describeFeaturedMetric({ publishedAt: "2026-03-08T00:00:00Z" }, "createdAt").label).toBe("published");
  });
});

describe("featured active filters", () => {
  it("labels each facet with the word the viewer chose, and how to clear it", () => {
    const filters = activeFeaturedFilters({
      sort: "views", genre: "Crime", contentType: "web_series", budget: "medium", pricing: "premium",
    });
    expect(filters.map((f) => f.key)).toEqual(["genre", "contentType", "budget", "pricing"]);
    expect(filters[1].label).toBe("Web Series");
    expect(filters[2].label).toBe("Medium (₹1Cr–₹10Cr)");
    expect(filters[3].reset).toBe("all");
  });

  it("counts no filter for a default view, and never counts the sort", () => {
    expect(activeFeaturedFilters(EMPTY_FEATURED_STATE)).toEqual([]);
    expect(activeFeaturedFilters({ ...EMPTY_FEATURED_STATE, sort: "createdAt" })).toEqual([]);
  });
});
