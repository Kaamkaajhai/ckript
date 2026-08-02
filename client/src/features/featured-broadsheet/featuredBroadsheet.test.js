import { describe, it, expect } from "vitest";
import {
  buildChipRow,
  buildQueryParams,
  countActiveFilters,
  filterScripts,
  formatCount,
  getBarWidth,
  getCompletionLabel,
  getCraftRows,
  getMandate,
  getMandateMatches,
  getMatchLine,
  getMetric,
  getRatingLabel,
  getScore,
  getServiceRows,
  getSpotlightDaysLeft,
  getSpotlightLabel,
  getWhyLead,
  isSpotlightActive,
  matchesMandate,
  sortScripts,
} from "./featuredBroadsheet";

const NOW = new Date("2026-03-01T00:00:00Z");
const inDays = (n) => new Date(NOW.getTime() + n * 86400000).toISOString();

const script = (over = {}) => ({
  _id: "s1",
  title: "The Salt Line",
  creator: { _id: "w1", name: "Meher Kapadia" },
  genre: "Thriller",
  contentType: "movie",
  format: "Feature Film",
  premium: true,
  price: 450,
  views: 12412,
  readsCount: 3140,
  rating: 4.8,
  budget: "high",
  verifiedBadge: true,
  scriptScore: { overall: 91, plot: 94, characters: 92, dialogue: 88, marketability: 89 },
  services: { evaluation: true, aiTrailer: true, spotlight: true },
  promotion: { spotlightActive: true, spotlightEndAt: inDays(19) },
  scriptCompletion: { status: "complete" },
  ...over,
});

describe("formatCount", () => {
  it("abbreviates thousands and drops a trailing .0", () => {
    expect(formatCount(940)).toBe("940");
    expect(formatCount(12412)).toBe("12.4k");
    expect(formatCount(12000)).toBe("12k");
  });

  it("treats missing counters as zero rather than NaN", () => {
    expect(formatCount(undefined)).toBe("0");
  });
});

describe("score and rating", () => {
  it("prefers the paid evaluation over the admin score", () => {
    expect(getScore(script())).toBe(91);
    expect(getScore(script({ scriptScore: {}, platformScore: { overall: 70 } }))).toBe(70);
  });

  it("shows an em dash instead of 0.0 for an unrated script", () => {
    expect(getRatingLabel(script({ rating: 0 }))).toBe("—");
    expect(getRatingLabel(script())).toBe("★ 4.8");
  });
});

describe("completion", () => {
  it("reads the partial counts off scriptCompletion", () => {
    expect(getCompletionLabel(script())).toBe("Complete");
    expect(getCompletionLabel(script({
      scriptCompletion: { status: "partial", completedParts: 3, totalParts: 10 },
    }))).toBe("Partial · 3 of 10");
  });

  it("omits the counts when the writer never supplied a total", () => {
    expect(getCompletionLabel(script({ scriptCompletion: { status: "ongoing" } }))).toBe("Ongoing");
  });
});

describe("spotlight", () => {
  it("is active only while the purchased window is open", () => {
    expect(isSpotlightActive(script(), NOW)).toBe(true);
    expect(isSpotlightActive(script({
      promotion: { spotlightActive: true, spotlightEndAt: inDays(-1) },
    }), NOW)).toBe(false);
    expect(isSpotlightActive(script({ promotion: { spotlightActive: false } }), NOW)).toBe(false);
  });

  it("treats an active flag with no end date as open-ended, not expired", () => {
    expect(isSpotlightActive(script({ promotion: { spotlightActive: true } }), NOW)).toBe(true);
  });

  it("counts remaining days and singularises the last one", () => {
    expect(getSpotlightDaysLeft(script(), NOW)).toBe(19);
    expect(getSpotlightLabel(script(), { now: NOW })).toBe("Spotlight · ends in 19 days");
    expect(getSpotlightLabel(script({
      promotion: { spotlightActive: true, spotlightEndAt: inDays(1) },
    }), { now: NOW })).toBe("Spotlight · ends in 1 day");
  });

  it("names the top slot separately and says nothing when inactive", () => {
    expect(getSpotlightLabel(script(), { isTop: true, now: NOW })).toBe("Top spotlight · ends in 19 days");
    expect(getSpotlightLabel(script({ promotion: {} }), { now: NOW })).toBe("");
  });
});

describe("mandate", () => {
  const mandate = getMandate({
    industryProfile: { mandates: { genres: ["Thriller", "Mystery"], formats: ["Feature Film"] } },
  });

  it("reports no mandate for a viewer who has not set one", () => {
    const none = getMandate({});
    expect(none.isSet).toBe(false);
    expect(none.label).toBe("No mandate set");
    expect(getMatchLine(script(), none)).toBe("No mandate set");
  });

  it("matches on genre and format", () => {
    expect(getMandateMatches(script(), mandate)).toEqual(["Genre match", "Format match"]);
    expect(matchesMandate(script(), mandate)).toBe(true);
  });

  it("needs two conditions before it counts as a match", () => {
    const genreOnly = script({ format: "Documentary", contentType: "documentary" });
    expect(getMandateMatches(genreOnly, mandate)).toEqual(["Genre match"]);
    expect(matchesMandate(genreOnly, mandate)).toBe(false);
    expect(getMatchLine(genreOnly, mandate)).toBe("Genre match");
  });

  it("lets an excluded genre veto an otherwise matching format", () => {
    const excluding = getMandate({
      industryProfile: {
        mandates: { genres: ["Thriller"], formats: ["Feature Film"], excludeGenres: ["Thriller"] },
      },
    });
    expect(getMandateMatches(script(), excluding)).toEqual([]);
  });

  it("matches a format written as the contentType key or its label", () => {
    const byKey = getMandate({ industryProfile: { mandates: { genres: ["Thriller"], formats: ["movie"] } } });
    expect(getMandateMatches(script({ format: "" }), byKey)).toContain("Format match");
  });
});

describe("craft rows and services", () => {
  it("omits sub-scores the evaluation never produced", () => {
    const rows = getCraftRows(script());
    expect(rows.map((r) => r.label)).toEqual(["Plot", "Character", "Dialogue", "Marketability"]);
    expect(rows[0]).toMatchObject({ value: 94, bar: "94%" });
  });

  it("returns nothing for an unevaluated script instead of four zero bars", () => {
    expect(getCraftRows(script({ scriptScore: {} }))).toEqual([]);
  });

  it("lists only the services actually bought", () => {
    expect(getServiceRows(script(), NOW)).toEqual([
      "Verified badge", "AI trailer", "Full evaluation", "Spotlight · 19 days remaining",
    ]);
    expect(getServiceRows(script({
      verifiedBadge: false, services: {}, promotion: {}, isFeatured: true, scriptScore: {},
    }), NOW)).toEqual(["Editorially featured"]);
  });
});

describe("ranking", () => {
  it("weights reads above views for engagement", () => {
    expect(getMetric(script(), "engagement")).toBe(12412 + 3140 * 2);
    expect(getMetric(script(), "views")).toBe(12412);
    expect(getMetric(script(), "score")).toBe(91);
  });

  it("sorts ascending only for price_low", () => {
    const cheap = script({ _id: "a", price: 10 });
    const dear = script({ _id: "b", price: 900 });
    expect(sortScripts([cheap, dear], "price_high").map((s) => s._id)).toEqual(["b", "a"]);
    expect(sortScripts([dear, cheap], "price_low").map((s) => s._id)).toEqual(["a", "b"]);
  });

  it("floors the bar so the weakest row is still visible", () => {
    expect(getBarWidth(script({ views: 1 }), "views", 100000)).toBe("6%");
    expect(getBarWidth(script({ views: 50 }), "views", 100)).toBe("50%");
    expect(getBarWidth(script(), "views", 0)).toBe("6%");
  });
});

describe("filtering", () => {
  const list = [
    script({ _id: "a", genre: "Thriller", budget: "high", premium: true }),
    script({
      _id: "b", genre: "Comedy", budget: "low", premium: false, verifiedBadge: false,
      promotion: {}, trailerUrl: "", scriptScore: {}, services: {},
    }),
  ];

  it("searches title, writer, genre and logline", () => {
    expect(filterScripts(list, { query: "salt" }).length).toBe(2);
    expect(filterScripts(list, { query: "meher" }).length).toBe(2);
    expect(filterScripts(list, { query: "nothing here" })).toEqual([]);
  });

  it("narrows by facet", () => {
    expect(filterScripts(list, { filters: { genres: ["Comedy"] } }).map((s) => s._id)).toEqual(["b"]);
    expect(filterScripts(list, { filters: { premium: "free" } }).map((s) => s._id)).toEqual(["b"]);
    expect(filterScripts(list, { filters: { budgets: ["high"] } }).map((s) => s._id)).toEqual(["a"]);
  });

  it("applies the only-show toggles", () => {
    expect(filterScripts(list, { filters: { only: ["spotlight"] }, now: NOW }).map((s) => s._id)).toEqual(["a"]);
    expect(filterScripts(list, { filters: { only: ["verified"] } }).map((s) => s._id)).toEqual(["a"]);
    expect(filterScripts(list, { filters: { only: ["evaluated"] } }).map((s) => s._id)).toEqual(["a"]);
  });

  it("passes everything through when 'matches mandate' is on but no mandate exists", () => {
    const out = filterScripts(list, { filters: { only: ["mandate"] }, mandate: getMandate({}) });
    expect(out.length).toBe(2);
  });
});

describe("chips and query", () => {
  const filters = { genres: ["Thriller"], types: ["movie"], budgets: ["high"], premium: "premium", only: ["verified"] };

  it("counts every active facet, and 'all' access as none", () => {
    expect(countActiveFilters(filters)).toBe(5);
    expect(countActiveFilters({ premium: "all" })).toBe(0);
  });

  it("builds one dismissible chip per active facet", () => {
    const chips = buildChipRow(filters);
    expect(chips.map((c) => c.label)).toEqual([
      "Thriller", "Movie", "High budget", "Verified", "Premium Only",
    ]);
    // Clearing the access chip returns it to "all" rather than removing a value.
    expect(chips.at(-1)).toMatchObject({ kind: "premium", value: "all" });
  });

  it("sends single-valued facets to the API and leaves multi-select to the client", () => {
    expect(buildQueryParams({ sort: "score", filters })).toBe(
      "sort=score&genre=Thriller&contentType=movie&budget=high&premium=true",
    );
    const multi = buildQueryParams({ filters: { genres: ["Thriller", "Drama"] } });
    expect(multi).toBe("sort=engagement");
  });
});

describe("getWhyLead", () => {
  const mandate = getMandate({
    industryProfile: { mandates: { genres: ["Thriller"], formats: ["Feature Film"] } },
  });

  it("leads with mandate fit when two conditions match", () => {
    expect(getWhyLead(script(), { mandate, now: NOW }))
      .toBe("Shown first because it matches your mandate — Genre match · Format match.");
  });

  it("falls back to paid placement, naming the remaining window", () => {
    const offMandate = script({ genre: "Horror", format: "Short Film", contentType: "short_film" });
    expect(getWhyLead(offMandate, { mandate, now: NOW }))
      .toBe("Leading on paid placement — this spotlight runs another 19 days. Outside your mandate.");
  });

  it("falls back to performance when nothing is promoted", () => {
    const plain = script({ genre: "Horror", format: "Short Film", contentType: "short_film", promotion: {} });
    expect(getWhyLead(plain, { mandate, now: NOW }))
      .toBe("Leading on engagement — 12.4k views and a 91/100 platform score. Outside your mandate.");
  });

  it("says nothing about a mandate the viewer never set", () => {
    const none = getMandate({});
    expect(getWhyLead(script({ promotion: {} }), { mandate: none, now: NOW }))
      .toBe("Leading on engagement — 12.4k views and a 91/100 platform score.");
  });
});
