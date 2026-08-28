import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  HALL_OF_FAME_DETAIL_FIELDS,
  HALL_OF_FAME_LIST_FIELDS,
  hallOfFamePageInfo,
  parseHallOfFameFeaturedPaging,
  parseHallOfFamePaging,
} from "./competitionHallOfFamePaging.js";

describe("Hall of Fame paging", () => {
  it("types and bounds archive filters instead of passing hostile values to Mongo", () => {
    assert.deepEqual(parseHallOfFamePaging({ page: "-4", limit: "900", year: { $gt: 0 }, competition: { $ne: "" } }), {
      page: 1,
      limit: 24,
      year: null,
      competition: "",
    });
    assert.deepEqual(parseHallOfFamePaging({ page: "3", limit: "8", year: "2026", competition: "  Final Draft  " }), {
      page: 3,
      limit: 8,
      year: 2026,
      competition: "Final Draft",
    });
  });

  it("caps featured-script pages independently", () => {
    assert.deepEqual(parseHallOfFameFeaturedPaging({ scriptPage: "2", scriptLimit: "99" }), { page: 2, limit: 12 });
  });

  it("reports stable page metadata", () => {
    assert.deepEqual(hallOfFamePageInfo({ page: 2, limit: 12, total: 29 }), {
      page: 2,
      limit: 12,
      total: 29,
      totalPages: 3,
      hasMore: true,
    });
  });

  it("projects list and detail fields without returning the complete competition document", () => {
    assert.match(HALL_OF_FAME_LIST_FIELDS, /resultsDeclaredAt/);
    assert.doesNotMatch(HALL_OF_FAME_LIST_FIELDS, /rules|faq|resources|registration|entryFee/);
    assert.match(HALL_OF_FAME_DETAIL_FIELDS, /judges/);
    assert.doesNotMatch(HALL_OF_FAME_DETAIL_FIELDS, /registration|entryFee|communityLinks/);
  });

  it("the controller applies projection, skip/limit, and bounded featured-script reads", async () => {
    const source = await readFile(new URL("../controllers/competitionController.js", import.meta.url), "utf8");
    const index = source.slice(source.indexOf("export const getCompletedCompetitions"), source.indexOf("export const getHallOfFameEntry"));
    const detail = source.slice(source.indexOf("export const getHallOfFameEntry"), source.indexOf("// ── Participant endpoints"));
    assert.match(index, /select\(HALL_OF_FAME_LIST_FIELDS\)/);
    assert.match(index, /\.skip\(\(paging\.page - 1\) \* paging\.limit\)/);
    assert.match(index, /\.limit\(paging\.limit\)/);
    assert.match(detail, /select\(HALL_OF_FAME_DETAIL_FIELDS\)/);
    assert.match(detail, /\.limit\(featuredPaging\.limit\)/);
    assert.match(detail, /featuredScriptsPageInfo/);
  });
});
