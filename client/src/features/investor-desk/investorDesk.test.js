import { describe, expect, it } from "vitest";
import {
  buildShelves,
  collectFeedProjects,
  formatDateline,
  getAsk,
  getAverageScore,
  getBriefCompletion,
  getFormatLabel,
  getGreeting,
  getMatchReasons,
  getScore,
  getWorkspaceLabel,
  sortProjects,
} from "./investorDesk";

const project = (overrides = {}) => ({ _id: "id", title: "Untitled", ...overrides });

describe("greeting and dateline", () => {
  it("moves through the day", () => {
    expect(getGreeting(new Date(2026, 2, 27, 8))).toBe("Good morning");
    expect(getGreeting(new Date(2026, 2, 27, 14))).toBe("Good afternoon");
    expect(getGreeting(new Date(2026, 2, 27, 21))).toBe("Good evening");
  });

  it("prints the masthead dateline", () => {
    expect(formatDateline(new Date(2026, 2, 27))).toBe("Friday, 27 March 2026");
  });
});

describe("workspace label", () => {
  it("names the viewer's own desk rather than assuming an investor", () => {
    expect(getWorkspaceLabel("reader")).toBe("Reader desk");
    expect(getWorkspaceLabel("actor")).toBe("Casting desk");
    expect(getWorkspaceLabel("producer")).toBe("Investor desk");
    expect(getWorkspaceLabel(undefined)).toBe("Investor desk");
  });
});

describe("project field readers", () => {
  it("prefers the platform score, falls back to the AI score, and reports null when unscored", () => {
    expect(getScore(project({ platformScore: { overall: 87 }, scriptScore: { overall: 40 } }))).toBe(87);
    expect(getScore(project({ scriptScore: { overall: 40 } }))).toBe(40);
    expect(getScore(project())).toBeNull();
  });

  it("resolves the ask in the same order the project card does", () => {
    expect(getAsk(project({ isSold: true, premium: true, price: 100 })).kind).toBe("sold");
    expect(getAsk(project({ holdStatus: "held", premium: true, price: 100 })).kind).toBe("hold");
    expect(getAsk(project({ premium: true, price: 450000 }))).toEqual({ kind: "money", value: 450000 });
    expect(getAsk(project({ price: 450000 })).kind).toBe("free");
  });

  it("labels formats and falls back to the writer's own wording", () => {
    expect(getFormatLabel(project({ format: "limited_series" }))).toBe("Limited Series");
    expect(getFormatLabel(project({ format: "other", formatOther: "Radio play" }))).toBe("Radio play");
    expect(getFormatLabel(project({ contentType: "documentary" }))).toBe("Documentary");
    expect(getFormatLabel(project())).toBe("");
  });
});

describe("standing brief", () => {
  it("reports a real completeness reading of the stored mandate", () => {
    const brief = getBriefCompletion({
      industryProfile: {
        investmentRange: "50k_250k",
        mandates: { genres: ["thriller"], formats: ["feature"], excludeGenres: [], specificHooks: [] },
      },
    });
    expect(brief.setCount).toBe(3);
    expect(brief.total).toBe(5);
    expect(brief.percent).toBe(60);
  });

  it("reads 0% when nothing has been set", () => {
    expect(getBriefCompletion(null).percent).toBe(0);
    expect(getBriefCompletion({}).facets).toHaveLength(5);
  });
});

describe("match reasons", () => {
  it("reads the feed's own score breakdown", () => {
    const reasons = getMatchReasons(project({
      _scoreBreakdown: { interestMatch: 0.6, behaviorMatch: 0.05, popularity: 0.4, recency: 0.9 },
    }));
    expect(reasons).toHaveLength(4);
    expect(reasons[0]).toMatchObject({ key: "interestMatch", met: true, percent: 60 });
    expect(reasons[1]).toMatchObject({ key: "behaviorMatch", met: false, percent: 5 });
  });

  it("says nothing when the feed sent no breakdown", () => {
    expect(getMatchReasons(project())).toEqual([]);
  });
});

describe("sorting", () => {
  const a = project({ _id: "a", readsCount: 10, rating: 4, premium: true, price: 100, status: "published", publishedAt: "2026-01-01" });
  const b = project({ _id: "b", readsCount: 90, rating: 2, premium: true, price: 900, status: "published", publishedAt: "2026-03-01" });
  const c = project({ _id: "c", readsCount: 50, rating: 5, status: "published", publishedAt: "2026-02-01" });

  it("keeps the server's ranking for the match key", () => {
    expect(sortProjects([a, b, c], "match").map((p) => p._id)).toEqual(["a", "b", "c"]);
  });

  it("orders by each other key", () => {
    expect(sortProjects([a, b, c], "reads").map((p) => p._id)).toEqual(["b", "c", "a"]);
    expect(sortProjects([a, b, c], "rating").map((p) => p._id)).toEqual(["c", "a", "b"]);
    expect(sortProjects([a, b, c], "new").map((p) => p._id)).toEqual(["b", "c", "a"]);
    expect(sortProjects([a, b, c], "price").map((p) => p._id)).toEqual(["b", "a", "c"]);
  });

  it("is stable, so equal keys keep the feed order", () => {
    const x = project({ _id: "x", readsCount: 5 });
    const y = project({ _id: "y", readsCount: 5 });
    expect(sortProjects([x, y], "reads").map((p) => p._id)).toEqual(["x", "y"]);
  });
});

describe("shelves", () => {
  const feed = {
    genreSections: [
      { genre: "Thriller", scripts: [project({ _id: "1" }), project({ _id: "2" })] },
      { genre: "Drama", scripts: [] },
    ],
    trending: [project({ _id: "2" }), project({ _id: "3" })],
  };

  it("drops empty genre sections and appends the matched shelf", () => {
    const shelves = buildShelves(feed);
    expect(shelves.map((shelf) => shelf.title)).toEqual(["Thriller", "Matched for you"]);
    expect(shelves[0].caption).toBe("your first-ranked genre");
  });

  it("counts each project once across shelves", () => {
    expect(collectFeedProjects(feed).map((p) => p._id)).toEqual(["1", "2", "3"]);
  });

  it("returns no shelves for an empty feed", () => {
    expect(buildShelves({})).toEqual([]);
    expect(collectFeedProjects(null)).toEqual([]);
  });
});

describe("average score", () => {
  it("averages only the projects that carry a score", () => {
    expect(getAverageScore([
      project({ platformScore: { overall: 90 } }),
      project({ platformScore: { overall: 80 } }),
      project(),
    ])).toBe(85);
  });

  it("reports null when nothing is scored", () => {
    expect(getAverageScore([project(), project()])).toBeNull();
    expect(getAverageScore([])).toBeNull();
  });
});
