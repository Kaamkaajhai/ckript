import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import {
  READER_DISCOVER_PAGE_SIZE,
  loadReaderDiscover,
  loadReaderHome,
  normalizeReaderDiscoverPage,
  readReaderDiscoverQuery,
  writeReaderDiscoverQuery,
} from "./readerHome";

vi.mock("../../services/api", () => ({ default: { get: vi.fn() } }));

const project = (id) => ({ _id: id, title: `Project ${id}` });

beforeEach(() => vi.clearAllMocks());

describe("reader home contract", () => {
  it("round-trips bounded canonical discover state and drops unknown facets", () => {
    const read = readReaderDiscoverQuery("?q=night&genre=Drama&category=movie&page=3");
    expect(read).toEqual({ q: "night", genre: "Drama", category: "movie", page: 3 });
    expect(writeReaderDiscoverQuery("", read).toString()).toBe("q=night&genre=Drama&category=movie&page=3");
    expect(readReaderDiscoverQuery("?genre=%24ne&category=unknown&page=-4")).toEqual({ q: "", genre: "", category: "", page: 1 });
  });

  it("normalizes paging and de-duplicates projects without inventing totals", () => {
    expect(normalizeReaderDiscoverPage({ scripts: [project("p1"), project("p1"), null], page: 2, total: 15, totalPages: 2 }))
      .toMatchObject({ scripts: [project("p1")], page: 2, total: 15, totalPages: 2, hasPrevious: true, hasNext: false });
  });

  it("loads one bounded reader page with typed filters", async () => {
    api.get.mockResolvedValue({ data: { scripts: [project("p1")], page: 2, total: 13, totalPages: 2 } });
    const result = await loadReaderDiscover({ query: { q: "  night  ", genre: "Drama", category: "movie", page: 2 } });
    expect(api.get).toHaveBeenCalledWith("/scripts/reader-search", expect.objectContaining({
      params: { q: "night", genre: "Drama", category: "movie", page: 2, limit: READER_DISCOVER_PAGE_SIZE },
    }));
    expect(result).toMatchObject({ ok: true, data: { total: 13, hasPrevious: true } });
  });

  it("starts fresh, read, and favorite requests together and degrades one failed shelf", async () => {
    api.get.mockImplementation((path, options) => {
      if (path === "/scripts/reader-search") return Promise.resolve({ data: { scripts: [project("fresh")], total: 1, page: 1, totalPages: 1 } });
      if (options.params.section === "read") return Promise.reject({ response: { status: 503, data: { message: "read offline" } } });
      return Promise.resolve({ data: {
        profile: { _id: "reader-1", role: "reader" }, own: true, collectionsVisible: true,
        relationship: {}, counts: { read: 0, favorites: 1, reviews: 0 }, items: [project("favorite")],
        pagination: { section: "favorites", page: 1, total: 1, totalPages: 1 },
      } });
    });
    const result = await loadReaderHome({ readerId: "reader-1" });
    expect(api.get).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ ok: true, data: { fresh: [project("fresh")], favorites: [project("favorite")], degraded: { read: true } } });
  });

  it("fails without making a request when the reader identity is missing", async () => {
    await expect(loadReaderHome()).resolves.toMatchObject({ ok: false });
    expect(api.get).not.toHaveBeenCalled();
  });
});
