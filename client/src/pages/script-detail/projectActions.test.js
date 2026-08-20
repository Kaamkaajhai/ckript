// @vitest-environment happy-dom
/*
 * What each project-detail WRITE sends, and what it makes of the answer.
 *
 * These are the shared definitions both platforms call, so what is pinned here is the part a
 * second copy would get subtly wrong: which endpoint and body, the refusal envelope (a sentence
 * the UI can show plus flags it can branch on), and the two places the client narrows or defaults
 * something the server does not.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import {
  DEFAULT_PURCHASE_NOTE,
  approvePurchaseRequest,
  assertMeeting,
  assertReview,
  deleteProject,
  fetchProjectPurchaseRequests,
  messageThreadPath,
  rejectPurchaseRequest,
  requestPurchase,
  scheduleMeeting,
  submitProducerRating,
  submitProjectReview,
} from "./projectActions";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const refusal = (status, data) => ({ response: { status, data } });

beforeEach(() => vi.clearAllMocks());

describe("the refusal envelope", () => {
  it("shows the server's own sentence rather than a generic one", async () => {
    api.post.mockRejectedValueOnce(refusal(400, { message: "You already have a pending purchase request for this script." }));
    const result = await requestPurchase({ scriptId: "s1" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("You already have a pending purchase request for this script.");
  });

  it("falls back only when the server said nothing", async () => {
    api.post.mockRejectedValueOnce(new Error("network"));
    const result = await requestPurchase({ scriptId: "s1" });
    expect(result.message).toBe("Failed to submit purchase request.");
  });

  it("carries the machine-readable flags beside the sentence", async () => {
    api.post.mockRejectedValueOnce(refusal(403, { message: "Limit reached.", limitReached: true }));
    const quota = await scheduleMeeting({ title: "t", date: "2026-09-01", time: "10:00", duration: 30 });
    expect(quota.flags.limitReached).toBe(true);

    api.post.mockRejectedValueOnce(refusal(428, { message: "Connect your calendar." }));
    const calendar = await scheduleMeeting({ title: "t", date: "2026-09-01", time: "10:00", duration: 30 });
    // A 428 IS the needs-calendar answer, whether or not the body repeats it as a flag — the UI
    // must never have to regex-match the sentence to find that out.
    expect(calendar.flags.needsCalendar).toBe(true);

    api.put.mockRejectedValueOnce(refusal(409, { message: "Already approved someone else." }));
    const conflict = await approvePurchaseRequest({ requestId: "r1" });
    expect(conflict.flags.conflict).toBe(true);
  });
});

describe("requesting a purchase", () => {
  it("sends the default note when the buyer wrote nothing", async () => {
    api.post.mockResolvedValueOnce({ data: {} });
    await requestPurchase({ scriptId: "s1", note: "   " });
    expect(api.post).toHaveBeenCalledWith("/scripts/purchase-request", {
      scriptId: "s1",
      note: DEFAULT_PURCHASE_NOTE,
    });
  });

  it("sends what the buyer actually wrote, trimmed", async () => {
    api.post.mockResolvedValueOnce({ data: {} });
    await requestPurchase({ scriptId: "s1", note: "  I produce documentaries.  " });
    expect(api.post.mock.calls[0][1].note).toBe("I produce documentaries.");
  });

  it("refuses without a project rather than posting an empty id", async () => {
    const result = await requestPurchase({});
    expect(result.ok).toBe(false);
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("the writer's request list", () => {
  /*
   * The endpoint answers with every request across ALL of the writer's projects — there is no
   * per-script route — so the narrowing is the client's job, and it is done in one place.
   */
  it("keeps only this project's requests, newest first, whichever shape `script` arrived in", async () => {
    api.get.mockResolvedValueOnce({
      data: [
        { _id: "a", script: "s1", createdAt: "2026-01-01" },
        { _id: "b", script: { _id: "s2" }, createdAt: "2026-03-01" },
        { _id: "c", script: { _id: "s1" }, createdAt: "2026-02-01" },
      ],
    });
    const { data } = await fetchProjectPurchaseRequests({ scriptId: "s1" });
    expect(data.map((row) => row._id)).toEqual(["c", "a"]);
  });

  it("answers with an empty list, not a request, when there is no project", async () => {
    const result = await fetchProjectPurchaseRequests({});
    expect(result.data).toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("declines with a trimmed note", async () => {
    api.put.mockResolvedValueOnce({ data: {} });
    await rejectPurchaseRequest({ requestId: "r1", note: "  Not for us.  " });
    expect(api.put).toHaveBeenCalledWith("/scripts/purchase-request/r1/reject", { note: "Not for us." });
  });
});

describe("what the form checks before the server does", () => {
  it("asks for the rating first, because a review with words and no stars is the common miss", () => {
    expect(assertReview({ rating: 0, comment: "Loved it, especially the ending." })).toContain("rating");
    expect(assertReview({ rating: 4, comment: "ok" })).toContain("5 characters");
    expect(assertReview({ rating: 4, comment: "Loved it" })).toBe("");
  });

  it("never lets a local check replace the server's — an invalid draft is not posted at all", async () => {
    const result = await submitProjectReview({ scriptId: "s1", rating: 0, comment: "" });
    expect(result.ok).toBe(false);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("keeps a producer's note optional and its rating bounded", async () => {
    expect((await submitProducerRating({ scriptId: "s1", rating: 6 })).ok).toBe(false);
    expect((await submitProducerRating({ scriptId: "s1", rating: 0 })).ok).toBe(false);
    api.post.mockResolvedValueOnce({ data: {} });
    await submitProducerRating({ scriptId: "s1", rating: 4 });
    expect(api.post).toHaveBeenCalledWith("/producer-ratings", { script: "s1", rating: 4, review: "" });
  });

  it("names the missing meeting field rather than saying the form is invalid", () => {
    expect(assertMeeting({ title: "", date: "2026-09-01", time: "10:00", duration: 30 })).toContain("title");
    expect(assertMeeting({ title: "Chat", date: "", time: "10:00", duration: 30 })).toContain("date");
    expect(assertMeeting({ title: "Chat", date: "2026-09-01", time: "", duration: 30 })).toContain("time");
    expect(assertMeeting({ title: "Chat", date: "2026-09-01", time: "10:00", duration: 30 })).toBe("");
  });
});

describe("the conversation path", () => {
  it("encodes a writer's name so an ampersand cannot become a second parameter", () => {
    expect(messageThreadPath({ writerId: "w1", writerName: "A & B" }))
      .toBe("/messages?recipientId=w1&recipientName=A%20%26%20B");
  });
});

describe("deleting", () => {
  it("announces the deletion to every other mounted surface", async () => {
    api.delete.mockResolvedValueOnce({ data: { softDeleted: true } });
    const heard = [];
    const listener = (event) => heard.push(event.detail.id);
    window.addEventListener("scriptDeleted", listener);
    await deleteProject({ scriptId: "s1" });
    window.removeEventListener("scriptDeleted", listener);
    // A delete that skips the event leaves a tile on the dashboard pointing at a project that
    // is gone; dispatching it here means neither platform can forget.
    expect(heard).toEqual(["s1"]);
  });

  it("says nothing to anyone when the delete was refused", async () => {
    api.delete.mockRejectedValueOnce(refusal(409, { message: "This script was submitted to a competition." }));
    const heard = [];
    const listener = () => heard.push(1);
    window.addEventListener("scriptDeleted", listener);
    const result = await deleteProject({ scriptId: "s1" });
    window.removeEventListener("scriptDeleted", listener);
    expect(result.ok).toBe(false);
    expect(heard).toEqual([]);
  });
});
