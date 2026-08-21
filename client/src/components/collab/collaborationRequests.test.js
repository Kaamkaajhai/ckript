import { describe, expect, it, vi } from "vitest";
import {
  listCollabActivity,
  listCollabRequests,
  loadMyCollabRequest,
  normalizeCollabRequest,
  respondToCollabRequest,
  sendCollabRequest,
} from "./collaborationRequests";

describe("shared collaboration-request contract", () => {
  it("normalizes server and legacy request shapes without exposing requester email", () => {
    expect(normalizeCollabRequest({
      _id: "r1",
      scriptId: { _id: "s1", title: "Night Train" },
      requesterId: { _id: "u1", name: "Asha", email: "private@example.test" },
      requestedRole: "commenter",
    })).toEqual(expect.objectContaining({
      id: "r1",
      scriptId: "s1",
      scriptTitle: "Night Train",
      requester: { id: "u1", name: "Asha", profileImage: "" },
      requestedRole: "commenter",
      status: "pending",
    }));
  });

  it("uses bounded paged incoming and outgoing endpoints", async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: { requests: [{ _id: "r1" }], pagination: { page: 2, total: 13, pages: 2, hasPrevious: true } } }) };
    await expect(listCollabRequests({ scope: "outgoing", page: 2, limit: 12 }, client)).resolves.toMatchObject({
      requests: [{ id: "r1" }],
      pagination: { page: 2, total: 13, pages: 2, hasPrevious: true },
    });
    expect(client.get).toHaveBeenCalledWith("/collab/requests/outgoing", expect.objectContaining({ params: { page: 2, limit: 12 } }));
    await expect(listCollabRequests({ scope: "unknown" }, client)).rejects.toThrow("scope");
  });

  it("shares exact status, send, and owner-decision operations", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ data: { request: { _id: "r1", scriptId: "s/1", status: "pending" }, canRequest: false } }),
      post: vi.fn()
        .mockResolvedValueOnce({ data: { message: "Sent", request: { _id: "r1", scriptId: "s/1", status: "pending" } } })
        .mockResolvedValueOnce({ data: { message: "Accepted", request: { _id: "r1", scriptId: "s/1", status: "accepted" } } }),
    };
    await expect(loadMyCollabRequest("s/1", {}, client)).resolves.toMatchObject({ request: { id: "r1" }, canRequest: false });
    await expect(sendCollabRequest("s/1", { requestedRole: "viewer", message: "  Read only  " }, client)).resolves.toMatchObject({ message: "Sent" });
    await expect(respondToCollabRequest({ _id: "r1", scriptId: "s/1" }, { decision: "accepted", role: "viewer", accessLevel: "content_only" }, client)).resolves.toMatchObject({ request: { status: "accepted" } });
    expect(client.get).toHaveBeenCalledWith("/collab/s%2F1/request/mine", expect.any(Object));
    expect(client.post).toHaveBeenNthCalledWith(1, "/collab/s%2F1/request", { requestedRole: "viewer", message: "Read only" });
    expect(client.post).toHaveBeenNthCalledWith(2, "/collab/s%2F1/request/r1/respond", { decision: "accepted", role: "viewer", accessLevel: "content_only" });
  });

  it("pages activity through the same contract", async () => {
    const client = { get: vi.fn().mockResolvedValue({ data: { activity: [{ _id: "a1" }], pagination: { page: 1, total: 1 } } }) };
    await expect(listCollabActivity("s1", { page: 1 }, client)).resolves.toMatchObject({ activity: [{ _id: "a1" }] });
    expect(client.get).toHaveBeenCalledWith("/collab/s1/activity", expect.objectContaining({ params: { page: 1, limit: 12 } }));
  });
});
