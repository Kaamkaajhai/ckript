import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import {
  AUTHENTICATED_PROFILE_STATUS,
  classifyProfileFailure,
  getAuthenticatedProfile,
  revealProfileContact,
  sendProfileMessage,
  toggleProfileBlock,
  updateProfileFollow,
} from "./authenticatedProfile";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock("../../services/scriptPitchService", () => ({ sendPitch: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe("authenticated profile load contract", () => {
  it("normalizes the visitor payload, relationship and canonical path", async () => {
    api.get.mockResolvedValueOnce({ data: {
      user: {
        _id: "writer-1",
        role: "writer",
        canonicalPath: "/mira",
        followers: [{ _id: "viewer-1" }],
        following: [],
        followRequestPending: false,
      },
      scripts: [
        { _id: "published", status: "published" },
        { _id: "draft", status: "draft" },
        { _id: "deleted", status: "published", isDeleted: true },
      ],
    } });

    const result = await getAuthenticatedProfile({
      profileKey: "mira person",
      viewer: { _id: "viewer-1", role: "producer" },
      signal: new AbortController().signal,
    });

    expect(api.get).toHaveBeenCalledWith(
      "/users/mira%20person",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result).toMatchObject({
      ok: true,
      data: {
        scripts: [{ _id: "published", status: "published" }],
        relationship: { isFollowing: true, followsMe: false, followRequestPending: false },
        canonicalPath: "/mira",
      },
    });
  });

  it.each([
    [{ status: 403, data: { privateAccount: true, profileId: "w1" } }, AUTHENTICATED_PROFILE_STATUS.PRIVATE],
    [{ status: 403, data: { blockedByProfile: true } }, AUTHENTICATED_PROFILE_STATUS.BLOCKED],
    [{ status: 403, data: { personalEmailFipRestricted: true } }, AUTHENTICATED_PROFILE_STATUS.RESTRICTED],
    [{ status: 404, data: {} }, AUTHENTICATED_PROFILE_STATUS.NOT_FOUND],
    [{ status: 503, data: {} }, AUTHENTICATED_PROFILE_STATUS.FAILED],
  ])("classifies access response %o as %s", (response, expected) => {
    expect(classifyProfileFailure({ response }).status).toBe(expected);
  });
});

describe("authenticated profile actions", () => {
  it("uses the real follow/request transitions", async () => {
    api.post.mockResolvedValue({ data: { status: "pending" } });
    expect(await updateProfileFollow({ profileId: "w1", relationship: {} }))
      .toMatchObject({ ok: true, data: { followRequestPending: true, isFollowing: false } });
    expect(api.post).toHaveBeenLastCalledWith("/users/follow", { userId: "w1" });

    expect(await updateProfileFollow({ profileId: "w1", relationship: { followRequestPending: true } }))
      .toMatchObject({ ok: true, data: { followRequestPending: false } });
    expect(api.post).toHaveBeenLastCalledWith("/users/follow-requests/cancel", { userId: "w1" });

    expect(await updateProfileFollow({ profileId: "w1", relationship: { isFollowing: true } }))
      .toMatchObject({ ok: true, data: { isFollowing: false } });
    expect(api.post).toHaveBeenLastCalledWith("/users/unfollow", { userId: "w1" });
  });

  it("sends the profile composer through the real message endpoint", async () => {
    api.post.mockResolvedValueOnce({ data: { _id: "message-1" } });
    expect(await sendProfileMessage({ profileId: "w1", message: " Hello " }))
      .toMatchObject({ ok: true, data: { _id: "message-1" } });
    expect(api.post).toHaveBeenCalledWith("/messages/send", { receiverId: "w1", text: "Hello" });
  });

  it("shares block and metered-contact calls across presentations", async () => {
    api.post.mockResolvedValue({ data: { contact: { email: "mira@example.com" } } });
    expect(await toggleProfileBlock({ profileId: "w1", blocked: false }))
      .toMatchObject({ ok: true, data: { blocked: true } });
    expect(api.post).toHaveBeenCalledWith("/users/block", { userId: "w1" });

    expect(await revealProfileContact({ profileId: "w1" }))
      .toMatchObject({ ok: true, data: { contact: { email: "mira@example.com" } } });
    expect(api.post).toHaveBeenCalledWith("/payment/reveal-contact/w1");
  });
});
