import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import publicApi from "../../services/publicApi";
import {
  loadChallengeHubPublic,
  loadMyChallenges,
  normalizeChallengeHubPublic,
  normalizeMyChallenges,
  readChallengeHubTab,
  writeChallengeHubTab,
} from "./challengeHub";

vi.mock("../../services/api", () => ({ default: { get: vi.fn() } }));
vi.mock("../../services/publicApi", () => ({ default: { get: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("challenge hub contract", () => {
  it("keeps the four canonical query states and falls invalid values back to Live", () => {
    expect(readChallengeHubTab("?tab=past")).toBe("past");
    expect(readChallengeHubTab("?tab=hall-of-fame")).toBe("hall-of-fame");
    expect(readChallengeHubTab("?tab=mine")).toBe("mine");
    expect(readChallengeHubTab("?tab=unknown")).toBe("live");
    expect(writeChallengeHubTab("?from=nav&tab=past", "live").toString()).toBe("from=nav");
    expect(writeChallengeHubTab("?from=nav", "mine").toString()).toBe("from=nav&tab=mine");
  });

  it("merges completed statistics into Previous and builds a writer-first honour roll", () => {
    const result = normalizeChallengeHubPublic({
      live: [{ _id: "live-1", name: "Live" }],
      upcoming: [{ _id: "next-1", name: "Next" }],
      past: [{ _id: "past-1", name: "Past", phase: "results" }],
      serverNow: "2026-08-22T00:00:00.000Z",
    }, {
      items: [{
        _id: "past-1",
        totalParticipants: 41,
        countriesRepresented: 8,
        winner: { userId: "writer-1", name: "Mira" },
        runnerUp: { userId: "writer-2", name: "Asha" },
        special: [{ userId: "writer-3", name: "Noor", specialTitle: "Best Dialogue" }],
      }],
      years: [2026],
    });

    expect(result.live.map((item) => item._id)).toEqual(["live-1", "next-1"]);
    expect(result.past[0]).toMatchObject({ totalParticipants: 41, countriesRepresented: 8 });
    expect(result.honourRoll[0].people.map(({ award }) => award)).toEqual(["winner", "runner_up", "special"]);
    expect(result.laureateCount).toBe(3);
  });

  it("filters malformed owner rows without changing the server order", () => {
    expect(normalizeMyChallenges({ items: [
      { entry: { _id: "e1" }, competition: { _id: "c1" } },
      { entry: null, competition: { _id: "c2" } },
      { entry: { _id: "e3" }, competition: { _id: "c3" } },
    ] }).items.map((item) => item.entry._id)).toEqual(["e1", "e3"]);
  });

  it("loads both public sources through the public client and Mine through the authenticated client", async () => {
    publicApi.get
      .mockResolvedValueOnce({ data: { live: [{ _id: "c1" }] } })
      .mockResolvedValueOnce({ data: { items: [] } });
    api.get.mockResolvedValueOnce({ data: { items: [], serverNow: "now" } });

    const publicResult = await loadChallengeHubPublic();
    const mineResult = await loadMyChallenges();

    expect(publicResult.ok).toBe(true);
    expect(publicApi.get.mock.calls.map(([url]) => url)).toEqual(["/competitions/list", "/competitions/completed"]);
    expect(api.get).toHaveBeenCalledWith("/competitions/mine", { signal: undefined });
    expect(mineResult).toMatchObject({ ok: true, data: { items: [], serverNow: "now" } });
  });

  it("preserves server failures as retryable messages", async () => {
    publicApi.get.mockRejectedValueOnce({ response: { data: { message: "Archive offline" }, status: 503 } });
    publicApi.get.mockResolvedValueOnce({ data: { items: [] } });
    const result = await loadChallengeHubPublic();
    expect(result).toMatchObject({ ok: false, statusCode: 503, message: "Archive offline" });
  });
});
