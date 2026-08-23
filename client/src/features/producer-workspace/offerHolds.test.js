import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import { loadOfferHolds, normalizeOfferHolds, releaseOfferHold } from "./offerHolds";

vi.mock("../../services/api", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("offer holds contract", () => {
  it("normalizes both the legacy array and a future envelope", () => {
    expect(normalizeOfferHolds([{ _id: "h1" }, null])).toEqual([{ _id: "h1" }]);
    expect(normalizeOfferHolds({ holds: [{ _id: "h2" }] })).toEqual([{ _id: "h2" }]);
  });

  it("loads a bounded holder-owned list", async () => {
    api.get.mockResolvedValue({ data: [{ _id: "h1" }] });
    await expect(loadOfferHolds({ limit: 500 })).resolves.toMatchObject({ ok: true, data: [{ _id: "h1" }] });
    expect(api.get).toHaveBeenCalledWith("/scripts/holds", { signal: undefined, params: { limit: 100 } });
  });

  it("releases by option identity and strips the local row prefix", async () => {
    api.post.mockResolvedValue({ data: { option: { id: "h1", status: "cancelled" } } });
    await expect(releaseOfferHold({ holdId: "option:h1", scriptId: "s1" })).resolves.toMatchObject({ ok: true });
    expect(api.post).toHaveBeenCalledWith("/scripts/release-hold", { optionId: "h1", scriptId: "s1" });
  });

  it("keeps a conflict distinct so a caller can refresh instead of retrying blindly", async () => {
    api.post.mockRejectedValue({ response: { status: 409, data: { message: "This option is no longer active." } } });
    await expect(releaseOfferHold({ holdId: "h1" })).resolves.toEqual({
      ok: false,
      status: 409,
      message: "This option is no longer active.",
      conflict: true,
    });
  });
});
