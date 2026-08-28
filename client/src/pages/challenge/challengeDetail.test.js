import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ publicGet: vi.fn(), privateGet: vi.fn() }));

vi.mock("../../services/publicApi", () => ({ default: { get: mocks.publicGet } }));
vi.mock("../../services/api", () => ({ default: { get: mocks.privateGet } }));

import {
  challengeCountdownTarget,
  challengeDetailAction,
  challengeDetailPaths,
  loadChallengeDetail,
  loadChallengeEntrySummary,
  normalizeChallengeDetail,
} from "./challengeDetail";

beforeEach(() => vi.clearAllMocks());

describe("challenge detail contract", () => {
  it("normalizes the public read without inventing arrays or records", () => {
    expect(normalizeChallengeDetail({
      competition: { _id: "c1" },
      phase: " live ",
      timeline: [null, { key: "live" }],
      results: { winner: { name: "Mira" } },
      serverNow: "2026-08-22T00:00:00.000Z",
    })).toEqual({
      competition: { _id: "c1" },
      phase: "live",
      timeline: [{ key: "live" }],
      results: { winner: { name: "Mira" } },
      serverNow: "2026-08-22T00:00:00.000Z",
    });
  });

  it("keeps the selected slug on registration and dashboard routes", () => {
    expect(challengeDetailPaths({ slug: "forty eight/hours" })).toEqual({
      register: "/challenge/register?c=forty%20eight%2Fhours",
      dashboard: "/challenge/dashboard?c=forty%20eight%2Fhours",
    });
  });

  it("maps every actionable phase without letting non-writers register", () => {
    const competition = { slug: "48-hours" };
    expect(challengeDetailAction({ competition, phase: "registration_open", user: null })).toMatchObject({ kind: "authenticate", label: "Register now" });
    expect(challengeDetailAction({ competition, phase: "registration_open", user: { role: "writer" } })).toMatchObject({ kind: "register", to: "/challenge/register?c=48-hours" });
    expect(challengeDetailAction({ competition, phase: "registration_open", user: { role: "producer" } })).toMatchObject({ kind: "unavailable", disabled: true });
    expect(challengeDetailAction({ competition, phase: "live" })).toMatchObject({ kind: "theme", targetId: "theme" });
    expect(challengeDetailAction({ competition, phase: "results" })).toMatchObject({ kind: "results", targetId: "results" });
    expect(challengeDetailAction({ competition, entry: { eventId: "E1" }, phase: "live" })).toMatchObject({ kind: "dashboard" });
  });

  it("chooses the authoritative deadline for each phase", () => {
    const dates = { regOpensAt: "open", regClosesAt: "close", startsAt: "start", endsAt: "end" };
    expect(challengeCountdownTarget("announced", dates).target).toBe("open");
    expect(challengeCountdownTarget("registration_open", dates).target).toBe("close");
    expect(challengeCountdownTarget("registration_closed", dates).target).toBe("start");
    expect(challengeCountdownTarget("live", dates).target).toBe("end");
    expect(challengeCountdownTarget("judging", dates).target).toBeNull();
  });

  it("loads a slug through the public client and treats a missing record as an empty detail", async () => {
    mocks.publicGet.mockResolvedValueOnce({ data: { competition: { _id: "c1" }, phase: "live" } });
    await expect(loadChallengeDetail({ slug: "48-hours" })).resolves.toMatchObject({ ok: true, data: { competition: { _id: "c1" } } });
    expect(mocks.publicGet).toHaveBeenCalledWith("/competitions/active", expect.objectContaining({ params: { c: "48-hours" } }));

    mocks.publicGet.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(loadChallengeDetail({ slug: "missing" })).resolves.toMatchObject({ ok: true, data: { competition: null } });
  });

  it("requests only the owner summary and treats not registered as a valid null", async () => {
    mocks.privateGet.mockResolvedValueOnce({ data: { entry: { eventId: "E1" } } });
    await expect(loadChallengeEntrySummary({ competitionId: "c1" })).resolves.toEqual({ ok: true, data: { eventId: "E1" } });
    expect(mocks.privateGet).toHaveBeenCalledWith("/competitions/c1/me", expect.objectContaining({ params: { view: "summary" } }));

    mocks.privateGet.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(loadChallengeEntrySummary({ competitionId: "c1" })).resolves.toEqual({ ok: true, data: null });
  });
});
