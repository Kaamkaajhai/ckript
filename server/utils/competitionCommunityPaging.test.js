import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  COMPETITION_COMMUNITY_MAX_PAGE_SIZE,
  competitionPageInfo,
  parseCompetitionCommunityPaging,
} from "./competitionCommunityPaging.js";

const controllerSource = fs.readFileSync(new URL("../controllers/competitionController.js", import.meta.url), "utf8");

describe("competition community paging", () => {
  test("normalizes hostile and oversized query values", () => {
    assert.deepEqual(parseCompetitionCommunityPaging({ page: "3", limit: "20" }), { page: 3, limit: 20 });
    assert.deepEqual(parseCompetitionCommunityPaging({ page: { $gt: 0 }, limit: ["999"] }), { page: 1, limit: 12 });
    assert.equal(parseCompetitionCommunityPaging({ limit: "999" }).limit, COMPETITION_COMMUNITY_MAX_PAGE_SIZE);
  });

  test("reports a stable page contract", () => {
    assert.deepEqual(competitionPageInfo({ page: 2, limit: 12, total: 29 }), {
      page: 2,
      limit: 12,
      total: 29,
      totalPages: 3,
      hasMore: true,
    });
    assert.equal(competitionPageInfo({ page: 3, limit: 12, total: 29 }).hasMore, false);
  });

  test("participants are faceted and relationship arrays are queried only for the page", () => {
    const source = controllerSource.slice(
      controllerSource.indexOf("export const getCompetitionParticipants ="),
      controllerSource.indexOf("const sanitizePdfFileName"),
    );
    assert.match(source, /\$facet/);
    assert.match(source, /\$skip/);
    assert.match(source, /\$limit/);
    assert.match(source, /followers: req\.user\._id/);
    assert.match(source, /"followRequests\.from": req\.user\._id/);
    assert.doesNotMatch(source, /populate\(/);
  });
});
