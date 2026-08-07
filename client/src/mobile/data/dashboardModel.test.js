import { describe, it, expect } from "vitest";
import {
  buildDashboardModel,
  mapAiReview,
  mapPlatformReview,
  mapProjectCard,
  verdictForRating,
  gradeForOverall,
} from "./dashboardModel";

/*
 * These fixtures are the shapes `server/controllers/dashboardController.js`
 * actually returns, transcribed field-for-field. That is the whole point of
 * this file: the mapping it guards was previously written against fields the
 * payload does not have (`review.score`, `review.summary`), which no test
 * caught because every test used the client's own invented shape. A fixture
 * copied from the client is a fixture that agrees with the bug.
 */
const aiReviewPayload = {
  scriptId: "s1",
  scriptTitle: "The Last Scene",
  source: "ai",
  rating: 78,
  scores: { plot: 82, characters: 74, dialogue: 88, pacing: 61, marketability: 70 },
  feedback: "A confident, cinematic voice with a devastating final act.",
  strengths: ["Distinct narrative voice", "Emotionally resonant climax"],
  weaknesses: ["Sagging second act"],
  improvements: ["Cut ten pages from the middle"],
  audienceFit: "Festival-circuit drama.",
  comparables: "Aftersun, The Father",
  date: "2026-02-12T00:00:00.000Z",
};

const adminScorePayload = {
  scriptId: "s1",
  scriptTitle: "The Last Scene",
  overall: 74,
  content: 78,
  trailer: 66,
  title: 82,
  synopsis: 70,
  tags: 74,
  feedback: "Strong central premise and title.",
  scoredAt: "2026-03-01T00:00:00.000Z",
};

const scriptPayload = {
  _id: "s1",
  title: "The Last Scene",
  logline: "A grieving editor splices one last reel to say goodbye.",
  genre: "Drama",
  format: "feature",
  status: "published",
  views: 4100,
  coverImage: "covers/last-scene.jpg",
  premium: true,
  price: 1499,
  scriptScore: { overall: 78 },
  platformScore: { overall: 74 },
  createdAt: "2026-02-01T00:00:00.000Z",
  publishedAt: "2026-02-12T00:00:00.000Z",
  creator: { name: "Arshad R.", username: "arshad" },
};

describe("mapAiReview", () => {
  it("reads the score from `rating`, which is the field the server sends", () => {
    // The regression this exists for: the old mapping read `review.score`,
    // which is undefined, so every AI card scored 0.
    expect(aiReviewPayload.score).toBeUndefined();
    expect(mapAiReview(aiReviewPayload).score).toBe(78);
  });

  it("builds one bar per scored dimension, with that dimension's own value", () => {
    const { bars } = mapAiReview(aiReviewPayload);
    // Previously: four fixed labels each carrying the overall rating, so the
    // bars were identical and none of them was true.
    expect(bars.map((b) => b.label)).toEqual([
      "Plot", "Characters", "Dialogue", "Pacing", "Marketability",
    ]);
    expect(bars.map((b) => b.val)).toEqual([82, 74, 88, 61, 70]);
    expect(bars.map((b) => b.w)).toEqual(["82%", "74%", "88%", "61%", "70%"]);
  });

  it("omits an unscored dimension rather than drawing it as zero", () => {
    const partial = { ...aiReviewPayload, scores: { plot: 82, pacing: null } };
    expect(mapAiReview(partial).bars.map((b) => b.label)).toEqual(["Plot"]);
  });

  it("uses the model's own feedback as the excerpt, not a canned sentence", () => {
    expect(mapAiReview(aiReviewPayload).excerpt).toBe(aiReviewPayload.feedback);
    expect(mapAiReview({ ...aiReviewPayload, feedback: undefined }).excerpt).toBe("");
  });

  it("carries the written strengths, weaknesses and improvements into the detail", () => {
    const { detail } = mapAiReview(aiReviewPayload);
    expect(detail.strengths).toEqual(aiReviewPayload.strengths);
    expect(detail.improve).toEqual(aiReviewPayload.weaknesses);
    expect(detail.recommendations).toEqual(aiReviewPayload.improvements);
    expect(detail.audienceFit).toBe(aiReviewPayload.audienceFit);
    expect(detail.comparables).toBe(aiReviewPayload.comparables);
  });

  it("labels the verdict on desktop's bands", () => {
    expect(verdictForRating(80).label).toBe("Excellent");
    expect(verdictForRating(79).label).toBe("Good");
    expect(verdictForRating(60).label).toBe("Good");
    expect(verdictForRating(59).label).toBe("Needs Work");
  });
});

describe("mapPlatformReview", () => {
  it("reads the score from `overall`, which is the field the server sends", () => {
    expect(adminScorePayload.score).toBeUndefined();
    expect(mapPlatformReview(adminScorePayload).score).toBe(74);
  });

  it("shows all five platform dimensions, not one bar carrying the overall", () => {
    const { bars } = mapPlatformReview(adminScorePayload);
    expect(bars.map((b) => b.label)).toEqual([
      "Main Content", "Trailer", "Title", "Synopsis", "Tag & Meta",
    ]);
    expect(bars.map((b) => b.val)).toEqual([78, 66, 82, 70, 74]);
  });

  it("grades on desktop's A–F bands", () => {
    expect(gradeForOverall(85).letter).toBe("A");
    expect(gradeForOverall(70).letter).toBe("B");
    expect(gradeForOverall(55).letter).toBe("C");
    expect(gradeForOverall(40).letter).toBe("D");
    expect(gradeForOverall(39).letter).toBe("F");
    // The old mapping only ever produced A or B, so a failing script was
    // presented to its author as a B.
    expect(mapPlatformReview({ ...adminScorePayload, overall: 12 }).grade).toBe("Grade F");
  });
});

describe("mapProjectCard", () => {
  it("merges the real score, preferring the platform score over the AI one", () => {
    // Was hardcoded `null` with a "would need to merge with reviews" comment.
    expect(mapProjectCard(scriptPayload).score).toBe(74);
    expect(mapProjectCard({ ...scriptPayload, platformScore: null }).score).toBe(78);
    expect(mapProjectCard({ ...scriptPayload, platformScore: null, scriptScore: null }).score).toBeNull();
  });

  it("links to the same canonical path desktop uses", () => {
    expect(mapProjectCard(scriptPayload).href).toBe("/the-last-scene/arshad");
  });

  it("reads the price from `premium`, not a field that does not exist", () => {
    expect(mapProjectCard(scriptPayload).price).toBe(1499);
    expect(mapProjectCard({ ...scriptPayload, premium: false }).price).toBeNull();
  });

  it("says why an unpublished project has no view count", () => {
    expect(mapProjectCard(scriptPayload).publicNote).toBe("4,100 views");
    expect(mapProjectCard({ ...scriptPayload, status: "draft" }).publicNote).toBe("Not yet public");
  });

  it("expands the format code to the label a human reads", () => {
    expect(mapProjectCard(scriptPayload).tags.map((t) => t.label)).toEqual(["Drama", "Feature Film"]);
  });
});

describe("buildDashboardModel", () => {
  const model = () => buildDashboardModel({
    scripts: [
      scriptPayload,
      { ...scriptPayload, _id: "s2", title: "Ember", status: "pending_approval", views: 0 },
      { ...scriptPayload, _id: "s3", title: "Verge", status: "rejected", views: 0 },
      { ...scriptPayload, _id: "s4", title: "Halcyon", isCollaborator: true, collaboratorRole: "Co-writer" },
    ],
    stats: { totalEarnings: 8400, totalUnlocks: 146, profileViews: 2340, trailersGenerated: 9, avgScore: 74 },
    reviews: { ai: [aiReviewPayload], adminScores: [adminScorePayload] },
    user: { name: "Arshad R.", profileCompletion: 55 },
  });

  it("counts pending and rejected projects the writer actually has", () => {
    const { projects } = model();
    // Desktop computes both from a list it has already filtered to published,
    // so its two notices can never fire. Mobile does not filter.
    expect(projects.pendingApproval).toBe(1);
    expect(projects.rejectedCount).toBe(1);
  });

  it("separates collaborations from the writer's own projects", () => {
    const { projects } = model();
    expect(projects.total).toBe(3);
    expect(projects.collaborations).toHaveLength(1);
    expect(projects.collaborations[0].role).toBe("Co-writer");
  });

  it("counts views from published scripts only", () => {
    expect(model().performance.stats[0].value).toBe("4,100");
  });

  it("gives every Top Scripts row a destination", () => {
    const { topScripts, biggestMover } = model().overview;
    expect(topScripts.length).toBeGreaterThan(0);
    topScripts.forEach((s) => expect(s.href).toMatch(/^\//));
    expect(biggestMover.href).toMatch(/^\//);
  });

  it("distinguishes a locked analytics plan from a zero", () => {
    const locked = buildDashboardModel({
      scripts: [],
      stats: { profileViews: null, totalViews: null, isAnalyticsLocked: true },
      user: {},
    });
    expect(locked.overview.analyticsLocked).toBe(true);
    expect(locked.overview.glance[0].value).toBe("—");

    const zero = buildDashboardModel({ scripts: [], stats: { profileViews: 0 }, user: {} });
    expect(zero.overview.analyticsLocked).toBe(false);
    expect(zero.overview.glance[0].value).toBe("0");
  });

  it("accepts profileCompletion as either a number or an object", () => {
    expect(buildDashboardModel({ user: { profileCompletion: 55 } }).overview.profileCompletion).toBe(55);
    expect(buildDashboardModel({ user: { profileCompletion: { percentage: 40 } } }).overview.profileCompletion).toBe(40);
  });

  it("survives an entirely empty account without throwing", () => {
    const empty = buildDashboardModel({});
    expect(empty.projects.featured).toEqual([]);
    expect(empty.overview.biggestMover).toBeNull();
    expect(empty.performance.chart.bars).toEqual([]);
    expect(empty.aiReviews).toEqual([]);
  });
});
