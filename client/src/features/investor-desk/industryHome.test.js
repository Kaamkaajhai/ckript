import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import {
  loadIndustryHome,
  normalizeIndustryFeed,
  readIndustryHomeQuery,
  writeIndustryHomeQuery,
} from "./industryHome";

vi.mock("../../services/api", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("industry home contract", () => {
  it("owns shelf and sort in a canonical URL query", () => {
    expect(readIndustryHomeQuery("?shelf=matched&sort=reads")).toEqual({ shelf: "matched", sort: "reads" });
    expect(readIndustryHomeQuery("?sort=unknown")).toEqual({ shelf: "all", sort: "match" });
    expect(writeIndustryHomeQuery("?keep=1", { shelf: "genre:Drama", sort: "new" }).toString())
      .toBe("keep=1&shelf=genre%3ADrama&sort=new");
  });

  it("normalizes malformed feed collections without inventing projects", () => {
    expect(normalizeIndustryFeed({ genreSections: [{ genre: "Drama", scripts: [null, { _id: "p1" }] }, { genre: "", scripts: [{}] }] }))
      .toMatchObject({ genreSections: [{ genre: "Drama", scripts: [{ _id: "p1" }] }], trending: [], explore: [] });
  });

  it("settles profile independently from the primary feed", async () => {
    api.get.mockImplementation((path) => path === "/scripts/investor-home"
      ? Promise.resolve({ data: { trending: [{ _id: "p1" }] } })
      : Promise.reject(new Error("profile failed")));
    const result = await loadIndustryHome();
    expect(result).toMatchObject({ ok: true, data: { profile: null, profileFailed: true, degraded: false } });
    expect(result.data.feed.trending).toHaveLength(1);
  });

  it("falls back to a bounded latest list and reports total failure honestly", async () => {
    api.get.mockImplementation((path, options) => {
      if (path === "/users/me") return Promise.resolve({ data: {} });
      if (path === "/scripts/latest") {
        expect(options.params).toEqual({ limit: 12 });
        return Promise.resolve({ data: [{ _id: "latest" }] });
      }
      return Promise.reject(new Error("feed failed"));
    });
    await expect(loadIndustryHome()).resolves.toMatchObject({ ok: true, data: { degraded: true, feed: { trending: [{ _id: "latest" }] } } });

    api.get.mockRejectedValue(new Error("offline"));
    await expect(loadIndustryHome()).resolves.toMatchObject({ ok: false, cancelled: false });
  });
});
