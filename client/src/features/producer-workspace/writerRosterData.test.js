import { describe, expect, it, vi } from "vitest";
import { loadWriterRoster } from "./writerRosterData";

describe("loadWriterRoster", () => {
  it("loads the bounded roster and the industry mandate in parallel", async () => {
    const client = { get: vi.fn()
      .mockResolvedValueOnce({ data: [{ _id: "w1" }] })
      .mockResolvedValueOnce({ data: { industryProfile: { mandates: { genres: ["Drama"] } } } }) };
    const result = await loadWriterRoster({ sort: "score", query: "Ada", user: { role: "producer" }, client });
    expect(client.get).toHaveBeenNthCalledWith(1, "/users/writers?sort=score&search=Ada", { signal: undefined });
    expect(client.get).toHaveBeenNthCalledWith(2, "/users/me", { signal: undefined });
    expect(result.writers).toHaveLength(1);
    expect(result.mandateUnavailable).toBe(false);
  });

  it("keeps the roster usable when the optional mandate fails", async () => {
    const client = { get: vi.fn()
      .mockResolvedValueOnce({ data: [{ _id: "w1" }] })
      .mockRejectedValueOnce(new Error("profile unavailable")) };
    await expect(loadWriterRoster({ user: { role: "investor" }, client })).resolves.toMatchObject({
      writers: [{ _id: "w1" }],
      mandateSource: null,
      mandateUnavailable: true,
    });
  });
});
