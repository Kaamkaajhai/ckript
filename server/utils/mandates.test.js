import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeMandatesInput } from "./mandates.js";

describe("mandate payload normalization", () => {
  test("keeps bounded allow-listed values and canonicalizes legacy inputs", () => {
    assert.deepEqual(normalizeMandatesInput({
      formats: ["Feature Film", "tv pilot half-hour", "not-a-format", { inject: true }],
      genres: ["drama", "Drama", "Unknown", 12],
      excludeGenres: ["HORROR", "Drama"],
      specificHooks: ["true story", "custom script"],
      account: { role: "admin" },
    }), {
      formats: ["feature", "tv_halfhour"],
      genres: ["Drama"],
      excludeGenres: ["Horror", "Drama"],
      specificHooks: ["True Story"],
    });
  });

  test("turns malformed collections into empty arrays", () => {
    assert.deepEqual(normalizeMandatesInput({ formats: "feature", genres: {}, specificHooks: null }), {
      formats: [], genres: [], excludeGenres: [], specificHooks: [],
    });
  });
});
