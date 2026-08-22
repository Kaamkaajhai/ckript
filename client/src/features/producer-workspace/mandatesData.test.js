import { describe, expect, it, vi } from "vitest";
import { loadMandates, normalizeMandates, saveMandates, toggleMandateValue } from "./mandatesData";

describe("mandates contract", () => {
  it("normalizes legacy formats and drops unknown or non-array values", () => {
    expect(normalizeMandates({
      formats: ["Feature Film", "tv pilot half-hour", "intrusive"],
      genres: ["drama", "Drama", "Unknown"],
      excludeGenres: "Horror",
      specificHooks: ["true story", "arbitrary"],
      budgetTiers: ["secret"],
    })).toEqual({
      formats: ["feature", "tv_halfhour"],
      genres: ["Drama"],
      excludeGenres: [],
      specificHooks: ["True Story"],
    });
  });

  it("keeps included and excluded genres mutually exclusive", () => {
    const next = toggleMandateValue({ genres: [], excludeGenres: ["Drama"] }, "genres", "Drama");
    expect(next.genres).toEqual(["Drama"]);
    expect(next.excludeGenres).toEqual([]);
  });

  it("loads and saves only the four canonical arrays", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ data: { industryProfile: { mandates: { formats: ["movie"] } } } }),
      put: vi.fn().mockResolvedValue({ data: { mandates: { formats: ["movie"], genres: ["Drama"] } } }),
    };
    await expect(loadMandates({ client })).resolves.toMatchObject({ formats: ["movie"] });
    await saveMandates({ formats: ["movie"], genres: ["Drama"], extra: ["no"] }, { client });
    expect(client.put).toHaveBeenCalledWith("/onboarding/mandates", {
      mandates: { formats: ["movie"], genres: ["Drama"], excludeGenres: [], specificHooks: [] },
    }, { signal: undefined });
  });
});
