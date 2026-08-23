import { describe, expect, it } from "vitest";
import { buildIncomingFollowRequestList } from "./followRequestsModel";

describe("incoming follow request view model", () => {
  it("normalizes profile targets and drops stale populated requests", () => {
    expect(buildIncomingFollowRequestList([
      {
        _id: "request-1",
        createdAt: "2026-08-21T00:00:00.000Z",
        from: {
          _id: "writer-1",
          name: "Mira Sen",
          role: "executive_producer",
          bio: "Story first.",
          writerProfile: { username: "mira sen" },
        },
      },
      { _id: "stale", from: null },
    ])).toEqual([{
      id: "request-1",
      fromUserId: "writer-1",
      name: "Mira Sen",
      role: "Executive Producer",
      bio: "Story first.",
      image: "",
      profilePath: "/profile/mira%20sen",
      createdAt: "2026-08-21T00:00:00.000Z",
    }]);
  });
});
