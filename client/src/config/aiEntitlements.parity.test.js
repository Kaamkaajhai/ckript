import { describe, expect, it } from "vitest";

import * as client from "./aiEntitlements";
// Imported by path out of the client tree on purpose. Both files are dependency-free ESM, so this
// resolves fine under vitest, and it is the only thing that can actually catch drift: a mirror kept
// in sync by a comment is a mirror that stops being in sync.
import * as server from "../../../server/config/aiEntitlements.js";

const PLAN_ENUM = ["free", "pro", "enterprise", "silver", "gold", "diamond"];
const EDGE_VALUES = [undefined, null, "", "   ", "none", "NONE", "Gold", "  GOLD  ", "platinum"];

describe("client/server AI entitlement parity", () => {
  it("agrees with the server on every plan in the enum", () => {
    for (const plan of PLAN_ENUM) {
      expect(client.hasAiAccess(plan), `plan: ${plan}`).toBe(server.hasAiAccess(plan));
    }
  });

  it("agrees with the server on absent, malformed and future plan values", () => {
    for (const value of EDGE_VALUES) {
      expect(client.hasAiAccess(value), `value: ${JSON.stringify(value)}`)
        .toBe(server.hasAiAccess(value));
    }
  });

  it("carries the same image allowance as the server", () => {
    // If these diverge the UI counts down to a number the server will not honour, which is the exact
    // class of lie this whole change set exists to remove.
    expect(client.AI_IMAGE_ALLOWANCE).toBe(server.AI_IMAGE_ALLOWANCE);
  });

  it("computes the same remaining count as the server across the range", () => {
    for (let used = -2; used <= server.AI_IMAGE_ALLOWANCE + 2; used += 1) {
      expect(client.aiImagesRemaining(used), `used: ${used}`).toBe(server.aiImagesRemaining(used));
    }
  });

  it("carries the same free-plan list as the server", () => {
    expect([...client.AI_FREE_PLANS]).toEqual([...server.AI_FREE_PLANS]);
  });
});

describe("userHasAiAccess", () => {
  it("reads the plan off an auth-context user shape", () => {
    expect(client.userHasAiAccess({ subscription: { plan: "gold" } })).toBe(true);
    expect(client.userHasAiAccess({ subscription: { plan: "diamond" } })).toBe(true);
    expect(client.userHasAiAccess({ subscription: { plan: "free" } })).toBe(false);
  });

  it("treats a missing user or subscription as locked rather than throwing", () => {
    // A logged-out or still-loading user must not crash an onClick handler.
    expect(client.userHasAiAccess(undefined)).toBe(false);
    expect(client.userHasAiAccess(null)).toBe(false);
    expect(client.userHasAiAccess({})).toBe(false);
    expect(client.userHasAiAccess({ subscription: {} })).toBe(false);
  });
});

describe("describeAiError", () => {
  const errorWith = (status, data) => ({ response: { status, data } });

  it("routes a 403 with requiresUpgrade to the upgrade path", () => {
    const result = client.describeAiError(
      errorWith(403, { message: "AI cover generation is included with a paid plan.", requiresUpgrade: true })
    );
    expect(result.kind).toBe("locked");
    expect(result.offerUpgrade).toBe(true);
    expect(result.message).toMatch(/paid plan/);
  });

  it("does NOT offer an upgrade when the allowance is merely spent", () => {
    // The writer already pays. Offering them the plan they hold is the wrong answer to a 429.
    const result = client.describeAiError(errorWith(429, { message: "You've used all 15…", quotaExhausted: true }));
    expect(result.kind).toBe("quota");
    expect(result.offerUpgrade).toBe(false);
  });

  it("treats an ordinary failure as neither locked nor exhausted", () => {
    const result = client.describeAiError(errorWith(500, { message: "Failed to generate AI cover image." }));
    expect(result.kind).toBe("error");
    expect(result.offerUpgrade).toBe(false);
    expect(result.message).toBe("Failed to generate AI cover image.");
  });

  it("falls back to the error's own message when the server sent no body", () => {
    expect(client.describeAiError({ message: "Network Error" }).message).toBe("Network Error");
    expect(client.describeAiError({}).message).toMatch(/went wrong/i);
  });
});
