import { describe, expect, it, vi } from "vitest";
import publicApi from "../../services/publicApi";
import {
  hallOfFameDetailPath,
  hallOfFameProfilePath,
  loadHallOfFameList,
  normalizeHallOfFameList,
  readHallOfFameQuery,
  writeHallOfFameQuery,
} from "./hallOfFame";

vi.mock("../../services/publicApi", () => ({ default: { get: vi.fn() } }));

describe("Hall of Fame contract", () => {
  it("round-trips URL-owned filters and resets defaults", () => {
    expect(readHallOfFameQuery("?page=3&year=2026&competition=Final+Draft")).toEqual({ page: 3, year: "2026", competition: "Final Draft" });
    expect(writeHallOfFameQuery("?page=3&year=2026", { page: 1, year: "all" }).toString()).toBe("");
  });

  it("normalizes missing arrays and page metadata", () => {
    expect(normalizeHallOfFameList({ pageInfo: { total: 0 } })).toMatchObject({ items: [], years: [], competitions: [], pageInfo: { page: 1, limit: 12, total: 0 } });
  });

  it("sends filters to the bounded public endpoint", async () => {
    publicApi.get.mockResolvedValueOnce({ data: { items: [], pageInfo: { page: 2, limit: 12 } } });
    await loadHallOfFameList({ query: { page: 2, year: "2026", competition: "Final Draft" } });
    expect(publicApi.get).toHaveBeenCalledWith("/competitions/completed", expect.objectContaining({ params: { page: 2, year: "2026", competition: "Final Draft" } }));
  });

  it("keeps dynamic record and profile paths canonical", () => {
    expect(hallOfFameDetailPath("final draft")).toBe("/hall-of-fame/final%20draft");
    expect(hallOfFameProfilePath({ username: "maya rao" })).toBe("/maya%20rao");
    expect(hallOfFameProfilePath({ userId: "writer-1" })).toBe("/share/profile/writer-1");
  });
});
