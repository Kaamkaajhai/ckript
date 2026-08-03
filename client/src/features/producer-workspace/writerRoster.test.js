import { describe, expect, it } from "vitest";
import {
  ACTIVITY,
  CREDENTIALS,
  EMPTY_FACETS,
  GENRES,
  buildBoardStats,
  buildChips,
  buildFacetCounts,
  buildRequestParams,
  countActiveFacets,
  filterWriters,
  formatCount,
  formatScore,
  getBioLine,
  getCredentialBadges,
  getMandate,
  getMandateMatches,
  getScoreBand,
  isAtCap,
  matchesMandate,
  readUrlState,
  writeUrlState,
} from "./writerRoster";

const writer = (overrides = {}) => ({
  _id: "w1",
  name: "Meera Raghunathan",
  bio: "Procedural thrillers, coastal port cities",
  scriptCount: 14,
  totalViews: 128449,
  avgScore: 86.6,
  followerCount: 4200,
  ...overrides,
  writerProfile: {
    genres: ["Thriller", "Crime"],
    wgaMember: true,
    sgaMember: false,
    representationStatus: "unrepresented",
    ...(overrides.writerProfile || {}),
  },
});

describe("field readers", () => {
  it("rounds the score and em-dashes an unscored writer", () => {
    expect(formatScore(writer())).toBe("87");
    expect(formatScore(writer({ avgScore: 0 }))).toBe("—");
    expect(formatScore(writer({ avgScore: undefined }))).toBe("—");
  });

  it("bands the score, and claims nothing for an unscored writer", () => {
    expect(getScoreBand(writer({ avgScore: 80 }))).toBe("high");
    expect(getScoreBand(writer({ avgScore: 79 }))).toBe("mid");
    expect(getScoreBand(writer({ avgScore: 59 }))).toBe("low");
    expect(getScoreBand(writer({ avgScore: 0 }))).toBeNull();
  });

  it("binds the bio directly, falling back only when it is empty", () => {
    expect(getBioLine(writer())).toBe("Procedural thrillers, coastal port cities");
    expect(getBioLine(writer({ bio: "   " }))).toBe("Screenwriter");
    expect(getBioLine(writer({ bio: null }))).toBe("Screenwriter");
  });

  it("ignores a `location` that the schema does not have", () => {
    // Guards the removed `writerProfile.location || bio` chain from coming back.
    const w = writer({ bio: "", writerProfile: { location: "Mumbai" } });
    expect(getBioLine(w)).toBe("Screenwriter");
  });

  it("reads credentials in a fixed order", () => {
    expect(getCredentialBadges(writer())).toEqual(["WGA"]);
    expect(getCredentialBadges(writer({
      writerProfile: { sgaMember: true, representationStatus: "signed" },
    }))).toEqual(["WGA", "SWA", "REPPED"]);
  });

  it("treats only 'unrepresented' as unrepresented", () => {
    expect(getCredentialBadges(writer({
      writerProfile: { wgaMember: false, representationStatus: "unrepresented" },
    }))).toEqual([]);
    expect(getCredentialBadges(writer({
      writerProfile: { wgaMember: false, representationStatus: "" },
    }))).toEqual([]);
  });
});

describe("formatCount", () => {
  it("compacts thousands and millions without a rounding artefact", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(940)).toBe("940");
    expect(formatCount(1000)).toBe("1K");
    expect(formatCount(128449)).toBe("128.4K");
    expect(formatCount(4_700_000)).toBe("4.7M");
    expect(formatCount(2_000_000)).toBe("2M");
  });
});

describe("filterWriters", () => {
  const roster = [
    writer({ _id: "a", writerProfile: { genres: ["Thriller"], wgaMember: true }, scriptCount: 3, avgScore: 70 }),
    writer({ _id: "b", writerProfile: { genres: ["Comedy"], wgaMember: false }, scriptCount: 0, avgScore: 0 }),
    writer({ _id: "c", writerProfile: { genres: ["Crime", "Drama"], sgaMember: true }, scriptCount: 5, avgScore: 0 }),
  ];
  const ids = (list) => list.map((w) => w._id);

  it("returns everything when nothing is selected", () => {
    expect(ids(filterWriters(roster))).toEqual(["a", "b", "c"]);
  });

  it("ORs within the genre facet, so a second genre widens", () => {
    expect(ids(filterWriters(roster, { facets: { ...EMPTY_FACETS, genres: ["Thriller"] } })))
      .toEqual(["a"]);
    expect(ids(filterWriters(roster, { facets: { ...EMPTY_FACETS, genres: ["Thriller", "Crime"] } })))
      .toEqual(["a", "c"]);
  });

  it("ANDs within the activity facet, so a second condition narrows", () => {
    expect(ids(filterWriters(roster, { facets: { ...EMPTY_FACETS, activity: ["published"] } })))
      .toEqual(["a", "c"]);
    expect(ids(filterWriters(roster, { facets: { ...EMPTY_FACETS, activity: ["published", "scored"] } })))
      .toEqual(["a"]);
  });

  it("combines facets of different kinds with AND", () => {
    expect(ids(filterWriters(roster, {
      facets: { ...EMPTY_FACETS, genres: ["Thriller", "Crime"], credentials: ["swa"] },
    }))).toEqual(["c"]);
  });

  it("survives a malformed payload", () => {
    expect(filterWriters(null)).toEqual([]);
    expect(filterWriters([{ _id: "x" }], { facets: { ...EMPTY_FACETS, genres: ["Drama"] } })).toEqual([]);
  });
});

describe("mandate", () => {
  const mandate = getMandate({
    industryProfile: { mandates: { genres: ["Crime", "Thriller"], excludeGenres: ["Horror"] } },
  });

  it("is only set when it carries genres, since genre is the only shared axis", () => {
    expect(mandate.isSet).toBe(true);
    expect(getMandate({ industryProfile: { mandates: { formats: ["feature"] } } }).isSet).toBe(false);
    expect(getMandate(null).isSet).toBe(false);
  });

  it("matches on genre overlap, case-insensitively", () => {
    expect(getMandateMatches(writer({ writerProfile: { genres: ["thriller"] } }), mandate))
      .toEqual(["Thriller"]);
  });

  it("lets an excluded genre disqualify the whole writer", () => {
    const w = writer({ writerProfile: { genres: ["Crime", "Horror"] } });
    expect(getMandateMatches(w, mandate)).toEqual([]);
    expect(matchesMandate(w, mandate)).toBe(false);
  });

  it("matches nothing when no mandate is set", () => {
    expect(matchesMandate(writer(), getMandate({}))).toBe(false);
  });
});

describe("buildFacetCounts", () => {
  const roster = [
    writer({ _id: "a", writerProfile: { genres: ["Thriller"], wgaMember: true } }),
    writer({ _id: "b", writerProfile: { genres: ["Thriller"], wgaMember: false } }),
    writer({ _id: "c", writerProfile: { genres: ["Drama"], wgaMember: true } }),
  ];

  it("counts every option against the unfiltered set when nothing is selected", () => {
    const counts = buildFacetCounts(roster, EMPTY_FACETS, getMandate({}));
    expect(counts.genres.Thriller).toBe(2);
    expect(counts.genres.Drama).toBe(1);
    expect(counts.credentials.wga).toBe(2);
  });

  it("excludes a facet from its own count, so options stay comparable", () => {
    // Thriller is ticked. Drama must still read 1 — "what this would add" —
    // rather than 0, which is what counting against the filtered set gives.
    const counts = buildFacetCounts(roster, { ...EMPTY_FACETS, genres: ["Thriller"] }, getMandate({}));
    expect(counts.genres.Thriller).toBe(2);
    expect(counts.genres.Drama).toBe(1);
  });

  it("still narrows a facet by the OTHER active facets", () => {
    const counts = buildFacetCounts(roster, { ...EMPTY_FACETS, credentials: ["wga"] }, getMandate({}));
    expect(counts.genres.Thriller).toBe(1);
    expect(counts.genres.Drama).toBe(1);
  });

  it("reports zero for the mandate facet when no mandate is set", () => {
    expect(buildFacetCounts(roster, EMPTY_FACETS, getMandate({})).mandate).toBe(0);
  });
});

describe("buildBoardStats", () => {
  it("sums scripts and takes the median of scored writers only", () => {
    const stats = buildBoardStats([
      writer({ scriptCount: 2, avgScore: 90 }),
      writer({ scriptCount: 3, avgScore: 0 }),
      writer({ scriptCount: 5, avgScore: 70 }),
      writer({ scriptCount: 0, avgScore: 50 }),
    ]);
    expect(stats.writers).toBe(4);
    expect(stats.scripts).toBe(10);
    // Scored: 50, 70, 90 → 70. The unscored writer does not drag it to 0.
    expect(stats.medianScore).toBe(70);
  });

  it("averages the middle pair on an even count", () => {
    expect(buildBoardStats([writer({ avgScore: 60 }), writer({ avgScore: 71 })]).medianScore).toBe(66);
  });

  it("reports zero rather than NaN when nothing is scored", () => {
    expect(buildBoardStats([writer({ avgScore: 0 })]).medianScore).toBe(0);
    expect(buildBoardStats([]).medianScore).toBe(0);
    expect(buildBoardStats(undefined).writers).toBe(0);
  });
});

describe("chips and counts", () => {
  it("builds one removable chip per active thing, query first", () => {
    const chips = buildChips({
      genres: ["Thriller"], credentials: ["wga"], activity: ["scored"], mandate: true,
    }, "  nolan  ");
    expect(chips.map((c) => c.label)).toEqual([
      "“nolan”", "Thriller", "WGA member", "Has a scored script", "Matches my mandate",
    ]);
  });

  it("builds nothing when nothing is active", () => {
    expect(buildChips(EMPTY_FACETS, "   ")).toEqual([]);
    expect(countActiveFacets(EMPTY_FACETS)).toBe(0);
  });

  it("counts the mandate toggle as one active facet", () => {
    expect(countActiveFacets({ ...EMPTY_FACETS, genres: ["A", "B"], mandate: true })).toBe(3);
  });
});

describe("url state", () => {
  it("round-trips", () => {
    const state = {
      sort: "score",
      query: "nolan",
      facets: { genres: ["Thriller", "Drama"], credentials: ["wga"], activity: [], mandate: true },
    };
    const written = writeUrlState(state);
    expect(written).toContain("sort=score");
    expect(readUrlState(written)).toEqual(state);
  });

  it("keeps the default sort out of the URL", () => {
    expect(writeUrlState({ sort: "reputation", facets: EMPTY_FACETS })).toBe("");
  });

  it("drops values this page does not know about", () => {
    // An unknown genre would otherwise filter the list to nothing with no chip
    // on screen to explain why.
    const state = readUrlState("?genre=Thriller,Klingon&cred=wga,nope&sort=chaos");
    expect(state.facets.genres).toEqual(["Thriller"]);
    expect(state.facets.credentials).toEqual(["wga"]);
    expect(state.sort).toBe("reputation");
  });

  it("reads a genre case-insensitively but stores the canonical spelling", () => {
    expect(readUrlState("?genre=thriller").facets.genres).toEqual(["Thriller"]);
  });

  it("defaults cleanly on an empty query string", () => {
    expect(readUrlState("")).toEqual({ sort: "reputation", query: "", facets: EMPTY_FACETS });
  });
});

describe("buildRequestParams", () => {
  it("sends sort and search only — facets are applied client-side", () => {
    expect(buildRequestParams({ sort: "views", query: " port city " }))
      .toBe("sort=views&search=port+city");
  });

  it("never sends a genre, so a facet change cannot trigger a refetch", () => {
    expect(buildRequestParams({ sort: "score" })).toBe("sort=score");
  });

  it("falls back to the server's own default sort", () => {
    expect(buildRequestParams({ sort: "nonsense" })).toBe("sort=reputation");
    expect(buildRequestParams()).toBe("sort=reputation");
  });
});

describe("cap", () => {
  it("flags a full page, which is the only signal that more exist", () => {
    expect(isAtCap(new Array(100).fill(writer()))).toBe(true);
    expect(isAtCap(new Array(99).fill(writer()))).toBe(false);
    expect(isAtCap(null)).toBe(false);
  });
});

describe("constants", () => {
  it("keeps the canonical genre list the directory shipped with", () => {
    expect(GENRES).toHaveLength(12);
    expect(GENRES).toContain("Thriller");
    expect(GENRES).not.toContain("All");
  });

  it("names every facet key exactly once", () => {
    expect(new Set(CREDENTIALS.map((c) => c.key)).size).toBe(CREDENTIALS.length);
    expect(new Set(ACTIVITY.map((a) => a.key)).size).toBe(ACTIVITY.length);
  });
});
