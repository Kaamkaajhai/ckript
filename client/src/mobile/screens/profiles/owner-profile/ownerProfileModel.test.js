import { describe, expect, it } from "vitest";
import { buildOwnerProfileView } from "./ownerProfileModel";

describe("owner profile view", () => {
  it("uses authoritative completion and own workspace counts", () => {
    const view = buildOwnerProfileView({
      profile: {
        name: "Mira",
        role: "writer",
        email: "mira@example.com",
        phone: "123",
        profileViews: 12,
        pendingFollowRequestCount: 3,
        followers: [{ _id: "1" }],
        following: [{ _id: "2" }, { _id: "3" }],
        favoriteScripts: ["saved-1"],
        profileCompletion: { percentage: 73, completedFields: 8, totalFields: 11, isComplete: false },
        writerProfile: { username: "mira", genres: ["Drama"] },
      },
      scripts: [{ _id: "s1", title: "One" }],
      bookmarkedScripts: [{ _id: "b1" }, { _id: "b2" }],
      purchasedScripts: [{ _id: "p1" }],
      collectionCounts: { bookmarks: 7 },
    });

    expect(view).toMatchObject({
      username: "mira",
      email: "mira@example.com",
      completion: { percentage: 73, completedFields: 8, totalFields: 11, isComplete: false },
      pendingFollowRequests: 3,
    });
    expect(Object.fromEntries(view.stats.map(({ key, value }) => [key, value]))).toEqual({
      projects: 1,
      saved: 7,
      purchases: 1,
      views: 12,
    });
  });

  it("keeps credentialed and non-http professional links out of the view", () => {
    const view = buildOwnerProfileView({
      profile: {
        role: "producer",
        industryProfile: {
          imdbUrl: "https://user:secret@imdb.com/name/nm1",
          linkedInUrl: "javascript:alert(1)",
          otherUrl: "https://studio.example/work",
        },
      },
    });
    expect(view.links).toEqual([{ label: "Website", url: "https://studio.example/work" }]);
  });
});
