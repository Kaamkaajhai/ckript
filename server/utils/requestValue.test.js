// The coercion helpers that stand between a request and a query.
//
// middleware/sanitizeRequest.js strips Mongo operators globally and is what actually stops
// `{"email": {"$ne": null}}`. These are the second lock, for the two things the middleware cannot do:
// survive a refactor that unmounts it, and be VISIBLE to a reader or a static analyser looking at one
// handler in isolation.
//
// Every test below feeds the shapes an attacker actually sends — an object, an array, a nested
// operator — and asserts the helper refuses rather than passes it through.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  asTrimmedString,
  asObjectId,
  asInt,
  asEnum,
  escapeRegex,
  asSearchRegex,
} from "./requestValue.js";

/** The payload shapes that make a Mongo query mean something other than what the handler intended. */
const HOSTILE = [
  ["an operator object", { $ne: null }],
  ["a comparison object", { $gt: "" }],
  ["a where clause", { $where: "1==1" }],
  ["an array", ["luma"]],
  ["a nested object", { a: { b: 1 } }],
  ["null", null],
  ["undefined", undefined],
];

describe("asTrimmedString only ever yields a string", () => {
  for (const [name, value] of HOSTILE) {
    test(`refuses ${name}`, () => {
      assert.equal(asTrimmedString(value), "");
    });
  }

  test("trims and caps length", () => {
    assert.equal(asTrimmedString("  hello  "), "hello");
    assert.equal(asTrimmedString("abcdefghij", 4), "abcd");
  });

  test("a number is not silently stringified", () => {
    // Deliberate: a handler expecting a string should see the absence, not "42", so the caller
    // decides what a numeric input means rather than the helper guessing.
    assert.equal(asTrimmedString(42), "");
  });
});

describe("asObjectId refuses anything that is not one", () => {
  for (const [name, value] of HOSTILE) {
    test(`refuses ${name}`, () => {
      assert.equal(asObjectId(value), null);
    });
  }

  test("refuses a string that is not a 24-char hex id", () => {
    for (const value of ["nope", "507f1f77bcf86cd79943901", "507f1f77bcf86cd799439011x", ""]) {
      assert.equal(asObjectId(value), null, `${JSON.stringify(value)} was accepted`);
    }
  });

  test("accepts a real id and returns a usable ObjectId", () => {
    const id = asObjectId("507f1f77bcf86cd799439011");
    assert.ok(id instanceof mongoose.Types.ObjectId);
    assert.equal(String(id), "507f1f77bcf86cd799439011");
  });

  test("tolerates surrounding whitespace, which query strings often carry", () => {
    assert.equal(String(asObjectId(" 507f1f77bcf86cd799439011 ")), "507f1f77bcf86cd799439011");
  });
});

describe("asInt keeps pagination inside a range", () => {
  test("parses and clamps", () => {
    assert.equal(asInt("5", { min: 1, max: 100 }), 5);
    assert.equal(asInt("500", { min: 1, max: 100 }), 100);
    assert.equal(asInt("0", { min: 1, max: 100 }), 1);
  });

  test("falls back rather than producing NaN", () => {
    // `.skip((page - 1) * limit)` with a non-numeric page yields NaN, which the driver rejects — the
    // request fails as a 500 instead of just using page 1.
    for (const [name, value] of HOSTILE) {
      assert.equal(asInt(value, { min: 1, max: 100, fallback: 1 }), 1, `${name} produced a bad value`);
    }
    assert.equal(asInt("abc", { min: 1, max: 100, fallback: 1 }), 1);
  });

  test("a float is truncated, not rejected", () => {
    assert.equal(asInt("3.9", { min: 1, max: 100 }), 3);
  });
});

describe("asEnum admits only known values", () => {
  const ALLOWED = ["pending", "approved", "rejected"];

  test("passes a known value through", () => {
    assert.equal(asEnum("approved", ALLOWED, "pending"), "approved");
  });

  test("falls back for anything else", () => {
    assert.equal(asEnum("nonsense", ALLOWED, "pending"), "pending");
    for (const [name, value] of HOSTILE) {
      assert.equal(asEnum(value, ALLOWED, "pending"), "pending", `${name} slipped through`);
    }
  });

  test("does not match on a coerced object", () => {
    // String({}) is "[object Object]" and String(["pending"]) is "pending" — the second is the trap,
    // and comparing the RAW value rather than a coerced one is what avoids it.
    assert.equal(asEnum(["pending"], ALLOWED, "fallback"), "fallback");
  });
});

describe("regex built from user input stays literal", () => {
  test("escapes every metacharacter", () => {
    const escaped = escapeRegex("a.*b(c)[d]{e}|f^g$h\\i+j?");
    // The proof that matters: the escaped form matches itself and nothing cleverer.
    assert.equal(new RegExp(`^${escaped}$`).test("a.*b(c)[d]{e}|f^g$h\\i+j?"), true);
    assert.equal(new RegExp(`^${escaped}$`).test("aXXbc"), false);
  });

  test("a search for '.' does not match every character", () => {
    const rx = asSearchRegex(".");
    assert.equal(rx.test("abc"), false);
    assert.equal(rx.test("a.c"), true);
  });

  test("a search for '(' is not a syntax error", () => {
    // Unescaped, `new RegExp("(")` throws and takes the endpoint down with a 500.
    assert.doesNotThrow(() => asSearchRegex("((("));
    assert.equal(asSearchRegex("(((").test("((("), true);
  });

  test("is case-insensitive, which is what a search box implies", () => {
    assert.equal(asSearchRegex("RHEA").test("rhea kapoor"), true);
  });

  test("returns null when there is nothing to search for", () => {
    for (const value of ["", "   ", null, undefined, { $ne: null }]) {
      assert.equal(asSearchRegex(value), null, `${JSON.stringify(value)} produced a regex`);
    }
  });

  test("is length-bounded, so a huge pattern is not the database's problem", () => {
    const rx = asSearchRegex("a".repeat(5000), { maxLength: 120 });
    assert.ok(rx.source.length <= 120, `pattern was ${rx.source.length} chars`);
  });

  test("a pathological search string does not hang", () => {
    const started = Date.now();
    const rx = asSearchRegex("(a+)+$".repeat(20));
    rx.test("a".repeat(5000));
    assert.ok(Date.now() - started < 1000, "escaped input still backtracked");
  });
});
