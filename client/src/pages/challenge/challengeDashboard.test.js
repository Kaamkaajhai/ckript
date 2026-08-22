import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  detail: vi.fn(),
  follow: vi.fn(),
}));

vi.mock("../../services/api", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("./challengeDetail", () => ({ loadChallengeDetail: mocks.detail }));
vi.mock("../profile/authenticatedProfile", () => ({ updateProfileFollow: mocks.follow }));

import {
  CHALLENGE_DASHBOARD_STATUS,
  challengeDashboardPath,
  challengeDashboardTab,
  loadChallengeDashboard,
  loadChallengeParticipants,
  loadChallengeReferrals,
  openChallengeEditor,
  updateChallengeParticipantFollow,
} from "./challengeDashboard";

beforeEach(() => vi.clearAllMocks());

describe("challenge participant dashboard contract", () => {
  it("keeps the exact challenge and URL-owned section", () => {
    expect(challengeDashboardTab("COMMUNITY")).toBe("community");
    expect(challengeDashboardTab("unknown")).toBe("home");
    expect(challengeDashboardPath({ slug: "48 hours/2026", tab: "studio" })).toBe("/challenge/dashboard?c=48+hours%2F2026&tab=studio");
    expect(challengeDashboardPath({ slug: "48-hours", tab: "home" })).toBe("/challenge/dashboard?c=48-hours");
  });

  it("resolves the slug publicly, then requests only the dashboard owner projection", async () => {
    mocks.detail.mockResolvedValue({ ok: true, data: { competition: { _id: "c1", slug: "48-hours" } } });
    mocks.get.mockResolvedValue({ data: { competition: { _id: "c1" }, entry: { eventId: "E1" }, phase: "live", timeline: [] } });
    await expect(loadChallengeDashboard({ slug: "48-hours" })).resolves.toMatchObject({ ok: true, standing: CHALLENGE_DASHBOARD_STATUS.READY, data: { entry: { eventId: "E1" } } });
    expect(mocks.get).toHaveBeenCalledWith("/competitions/c1/me", expect.objectContaining({ params: { view: "dashboard" } }));
  });

  it("distinguishes a missing challenge from a known challenge without an entry", async () => {
    mocks.detail.mockResolvedValueOnce({ ok: true, data: { competition: null } });
    await expect(loadChallengeDashboard({ slug: "missing" })).resolves.toMatchObject({ standing: CHALLENGE_DASHBOARD_STATUS.NOT_FOUND });
    mocks.detail.mockResolvedValueOnce({ ok: true, data: { competition: { _id: "c1" } } });
    mocks.get.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(loadChallengeDashboard({ slug: "known" })).resolves.toMatchObject({ standing: CHALLENGE_DASHBOARD_STATUS.NOT_REGISTERED });
  });

  it("normalizes bounded participants and referral page metadata", async () => {
    mocks.get.mockResolvedValueOnce({ data: { participants: [{ _id: "u2", name: "Rhea", username: "rhea" }], page: 2, limit: 12, total: 18, hasMore: false } });
    await expect(loadChallengeParticipants({ competitionId: "c1", page: 2 })).resolves.toMatchObject({ ok: true, data: { page: 2, total: 18, items: [{ canonicalPath: "/rhea" }] } });
    expect(mocks.get).toHaveBeenLastCalledWith("/competitions/c1/participants", expect.objectContaining({ params: { page: 2, limit: 12 } }));

    mocks.get.mockResolvedValueOnce({ data: { referrals: [{ name: "Mira" }], pageInfo: { page: 1, limit: 12, total: 1, hasMore: false }, progress: { count: 1 }, referralCode: "CKR1" } });
    await expect(loadChallengeReferrals({ competitionId: "c1" })).resolves.toMatchObject({ ok: true, data: { total: 1, progress: { count: 1 }, referralCode: "CKR1" } });
  });

  it("opens one server-owned script and shares follow semantics with profiles", async () => {
    mocks.post.mockResolvedValue({ data: { scriptId: "s1" } });
    await expect(openChallengeEditor({ competitionId: "c1" })).resolves.toEqual({ ok: true, data: { scriptId: "s1" } });
    mocks.follow.mockResolvedValue({ ok: true, data: { isFollowing: false, followRequestPending: true } });
    await expect(updateChallengeParticipantFollow({ _id: "u2", name: "Rhea" })).resolves.toMatchObject({ ok: true, data: { name: "Rhea", followRequestPending: true } });
  });
});
