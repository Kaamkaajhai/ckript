// Who you are allowed to say you are, at the door.
//
// `POST /api/auth/join` read `role` from the request body and passed it to User.create with only the
// Mongoose enum as validation — and that enum contains `admin` and `finance`. Signing up as
// `role: "finance"` and verifying your own OTP returned a token that `financeOnly` accepts, which is
// every payment, invoice, user record and bank review. `admin` reached the whole admin API: its
// access-code check lives in `login`, which signup never touches, and the branch guard tests the
// SERVER's branch with `master` in the default allow-list.
//
// These tests pin the allow-list, and pin that the handler actually uses it — a correct helper wired
// to nothing would leave the hole exactly as it was.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, not url.pathname: this repo lives under a path containing a space, which stays
// percent-encoded otherwise.
const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "authController.js"), "utf8");

const { resolvePublicSignupRole } = await import("./authController.js");

describe("elevated roles cannot be self-assigned", () => {
  for (const role of ["admin", "finance", "judge"]) {
    test(`"${role}" falls back to the default`, () => {
      assert.equal(resolvePublicSignupRole(role), "creator");
    });
  }

  test("case and padding do not smuggle one through", () => {
    for (const attempt of ["ADMIN", " admin ", "Admin", "  FINANCE", "Finance "]) {
      assert.equal(resolvePublicSignupRole(attempt), "creator", `"${attempt}" got through`);
    }
  });

  test("it falls back rather than erroring, so probing reveals nothing", () => {
    // A 400 on "admin" and a 201 on "reader" would confirm which role names are real.
    assert.doesNotThrow(() => resolvePublicSignupRole("admin"));
    assert.equal(resolvePublicSignupRole("not_a_real_role"), "creator");
  });
});

describe("every role the product actually offers still works", () => {
  // client/src/mobile/screens/auth/authModel.js and pages/Join.jsx only ever send these three.
  for (const role of ["creator", "investor", "professional"]) {
    test(`"${role}" is preserved`, () => {
      assert.equal(resolvePublicSignupRole(role), role);
    });
  }

  for (const role of ["writer", "reader", "producer", "director", "actor", "industry"]) {
    test(`"${role}" is preserved`, () => {
      assert.equal(resolvePublicSignupRole(role), role);
    });
  }
});

describe("odd input degrades to the default instead of throwing", () => {
  for (const value of [undefined, null, "", "   ", 42, {}, [], true]) {
    test(`${JSON.stringify(value)} → creator`, () => {
      assert.equal(resolvePublicSignupRole(value), "creator");
    });
  }
});

describe("the join handler uses it", () => {
  test("join clamps role through resolvePublicSignupRole", () => {
    const start = source.indexOf("export const join = ");
    assert.notEqual(start, -1, "join is no longer exported — update this test");
    const next = source.indexOf("\nexport const ", start + 1);
    const body = source.slice(start, next === -1 ? source.length : next);

    assert.match(body, /role = resolvePublicSignupRole\(/,
      "join no longer clamps the requested role — the escalation hole is open again");
    assert.doesNotMatch(body, /role = normalizeInputValue\(role\)\.toLowerCase\(\) \|\| "creator"/,
      "the old unclamped normalisation is back");
  });

  test("the clamp happens before the role is read for anything else", () => {
    const start = source.indexOf("export const join = ");
    const next = source.indexOf("\nexport const ", start + 1);
    const body = source.slice(start, next === -1 ? source.length : next);

    const clamp = body.indexOf("resolvePublicSignupRole(");
    const firstUse = body.indexOf("USERNAME_REQUIRED_ROLES.has(role)");
    assert.ok(clamp !== -1 && firstUse !== -1, "expected landmarks are missing");
    assert.ok(clamp < firstUse,
      "role is used before it is clamped, so the requested value still drives validation");
  });
});
