import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { resolveDirectMessagePair } from "./messageAccess.js";

describe("direct-message role pairs", () => {
  for (const role of ["investor", "producer", "director", "industry", "professional"]) {
    test(`${role} can start a writer conversation`, () => {
      const pair = resolveDirectMessagePair(
        { _id: "industry-1", role },
        { _id: "writer-1", role: "writer" },
      );
      assert.equal(pair.allowed, true);
      assert.equal(pair.marketplacePair, true);
      assert.equal(pair.industryId, "industry-1");
      assert.equal(pair.writerId, "writer-1");
    });
  }

  test("the writer can reply to any industry role", () => {
    const pair = resolveDirectMessagePair(
      { _id: "writer-1", role: "creator" },
      { _id: "producer-1", role: "producer" },
    );
    assert.equal(pair.allowed, true);
    assert.equal(pair.senderIsIndustry, false);
  });

  test("admin/writer coordination remains allowed", () => {
    assert.equal(resolveDirectMessagePair(
      { _id: "admin-1", role: "admin" },
      { _id: "writer-1", role: "writer" },
    ).adminWriter, true);
  });

  test("unrelated role pairs remain refused", () => {
    assert.equal(resolveDirectMessagePair(
      { _id: "reader-1", role: "reader" },
      { _id: "writer-1", role: "writer" },
    ).allowed, false);
    assert.equal(resolveDirectMessagePair(
      { _id: "producer-1", role: "producer" },
      { _id: "director-1", role: "director" },
    ).allowed, false);
  });
});
