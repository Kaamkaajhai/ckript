import { describe, expect, it } from "vitest";
import {
  normalizeReaderProfileResponse,
  readReaderProfileLocation,
  readerFollowLabel,
  readerProfileShare,
  writeReaderProfileLocation,
} from "./readerProfile";

describe("reader profile shared contract", () => {
  it("round-trips the URL-owned section and page", () => {
    expect(readReaderProfileLocation("?tab=favorites&page=3")).toEqual({ section: "favorites", page: 3 });
    expect(readReaderProfileLocation("?tab=private&page=0")).toEqual({ section: "read", page: 1 });
    expect(writeReaderProfileLocation("?keep=yes", { section: "reviews", page: 2 }).toString())
      .toBe("keep=yes&tab=reviews&page=2");
  });

  it("keeps private collection counts distinct from empty counts", () => {
    const data = normalizeReaderProfileResponse({
      profile: { _id: "r1", name: "Ria" },
      own: false,
      collectionsVisible: false,
      counts: { read: null, favorites: null, reviews: 4 },
      items: [],
      pagination: { section: "favorites", page: 1, total: 0, privateCollection: true },
    });
    expect(data.counts).toEqual({ read: null, favorites: null, reviews: 4 });
    expect(data.pagination.privateCollection).toBe(true);
  });

  it("derives follow labels and a stable public share fallback", () => {
    expect(readerFollowLabel({ followsMe: true })).toBe("Follow back");
    expect(readerFollowLabel({ followRequestPending: true })).toBe("Requested");
    expect(readerProfileShare({ _id: "r1", name: "Ria" }, "https://ckript.test").url)
      .toBe("https://ckript.test/share/profile/r1");
  });
});
