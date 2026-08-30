import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { shouldTryNextModel, FALLBACK_MODELS } from "./googleAiService.js";

/**
 * The model ladder, and when to walk down it.
 *
 * Written after every AI feature went dark. Google retired gemini-2.5-pro, gemini-1.5-pro AND
 * gemini-2.5-flash — which was the default plus the entire fallback ladder — so every call 404'd.
 * Worse, the fallback only ran for quota errors, so a 404 threw on the first rung and the other two
 * were never tried. A heuristic score was silently substituted and nobody noticed for weeks.
 *
 * Two separate failures, so two separate guards: what counts as "try the next model", and what is
 * actually IN the ladder.
 */

const source = fs.readFileSync(new URL("./googleAiService.js", import.meta.url), "utf8");

describe("when to fall through to the next model", () => {
  test("quota and rate limits — another model has its own budget", () => {
    assert.equal(shouldTryNextModel(429, "Resource has been exhausted"), true);
    assert.equal(shouldTryNextModel(400, "Quota exceeded for this project"), true);
    assert.equal(shouldTryNextModel(400, "rate limit reached"), true);
    assert.equal(shouldTryNextModel(429, ""), true);
  });

  test("a retired model — the exact failure that caused the outage", () => {
    // Verbatim from Google, the day this broke.
    assert.equal(
      shouldTryNextModel(404, "This model models/gemini-2.5-pro is no longer available to new users. Please update your code to use models/gemini-3.1-pro-preview"),
      true
    );
    assert.equal(shouldTryNextModel(404, ""), true);
    assert.equal(shouldTryNextModel(400, "model is not found"), true);
  });

  test("Google's own overload — transient and model-specific", () => {
    assert.equal(shouldTryNextModel(503, "This model is currently experiencing high demand."), true);
    assert.equal(shouldTryNextModel(500, "The model is overloaded. Please try again later."), true);
  });

  test("does NOT walk the ladder for failures every model would share", () => {
    // Retrying these just multiplies latency before surfacing the same error. The bad-key case
    // matters most: three models each taking ~9s to reject the same credential is a 27-second wait
    // for an error we could have returned immediately.
    assert.equal(shouldTryNextModel(403, "API key not valid. Please pass a valid API key."), false);
    assert.equal(shouldTryNextModel(403, "Requests to this API generativelanguage.googleapis.com are blocked."), false);
    assert.equal(shouldTryNextModel(400, "Invalid JSON payload received"), false);
    assert.equal(shouldTryNextModel(504, "AI request timed out after 60 seconds"), false);
    assert.equal(shouldTryNextModel(502, "Google AI returned an empty response"), false);
  });

  test("survives a missing message or status without throwing", () => {
    assert.equal(shouldTryNextModel(undefined, undefined), false);
    assert.equal(shouldTryNextModel(null, ""), false);
    assert.equal(shouldTryNextModel(), false);
  });
});

describe("the ladder itself", () => {
  test("contains no model Google has retired", () => {
    /*
     * The whole outage in one assertion. These four were the default and the entire ladder, and all
     * of them now answer "no longer available to new users" — while still being listed by
     * ListModels, which is why the list cannot be trusted and every replacement was confirmed with a
     * real generateContent call.
     */
    const RETIRED = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-pro"];
    for (const dead of RETIRED) {
      assert.equal(
        FALLBACK_MODELS.includes(dead),
        false,
        `"${dead}" is retired — a ladder rung that 404s is a rung that does nothing`
      );
    }
  });

  test("the default model is not retired either", () => {
    const defaultModel = source.match(/process\.env\.GOOGLE_AI_MODEL \|\| "([^"]+)"/)?.[1];
    assert.ok(defaultModel, "could not find the default model");
    assert.equal(["gemini-1.5-pro", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-pro"].includes(defaultModel), false,
      `the default "${defaultModel}" is a retired model`);
  });

  test("has more than one rung, or it is not a ladder", () => {
    assert.ok(FALLBACK_MODELS.length >= 2, "a single-entry ladder cannot fall back to anything");
    assert.equal(new Set(FALLBACK_MODELS).size, FALLBACK_MODELS.length, "duplicate rungs waste a retry on the same model");
  });

  test("prefers aliases, so the next retirement is not another outage", () => {
    // A pinned version is a dated bomb: it works until Google retires it and then nothing does.
    // An alias moves with them. At least one rung must be one.
    assert.ok(
      FALLBACK_MODELS.some((m) => m.endsWith("-latest")),
      "no alias in the ladder — every rung is a pinned version that will eventually be retired"
    );
  });
});
