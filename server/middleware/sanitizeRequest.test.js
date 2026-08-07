// Can a request still hand a Mongo operator to a query?
//
// Mongoose casts a string to a string but does nothing about an OBJECT arriving where a string was
// expected, and that is the entire "database query built from user-controlled sources" class:
// `{"email": {"$ne": null}}` turns findOne into "find anyone". These run the middleware over the
// payloads an attacker would actually send, and then over a live Express app, because the Express 5
// getter on req.query is the specific reason the off-the-shelf package could not be used.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import sanitizeRequest from "./sanitizeRequest.js";

/** Run the middleware over a fake request and hand back what survived. */
const clean = (req) => {
  const shaped = { body: undefined, params: undefined, query: undefined, method: "POST", originalUrl: "/t", ...req };
  sanitizeRequest(shaped, {}, () => {});
  return shaped;
};

describe("operator injection is stripped from every request surface", () => {
  test("the auth bypass shape cannot reach a query", () => {
    // The one that matters: this makes User.findOne({ email }) return the first user in the
    // collection instead of nobody.
    const { body } = clean({ body: { email: { $ne: null }, password: "x" } });
    assert.deepEqual(body.email, {}, "the $ne operator survived");
    assert.equal(body.password, "x", "a normal field was damaged");
  });

  for (const op of ["$ne", "$gt", "$gte", "$lt", "$in", "$nin", "$regex", "$where", "$expr", "$function"]) {
    test(`strips ${op}`, () => {
      const { body } = clean({ body: { field: { [op]: "payload" } } });
      assert.deepEqual(body.field, {}, `${op} survived`);
    });
  }

  test("strips operators nested inside arrays and deeper objects", () => {
    const { body } = clean({
      body: { filters: [{ $where: "1==1" }, { ok: 1 }], deep: { a: { b: { $gt: "" } } } },
    });
    assert.deepEqual(body.filters[0], {});
    assert.deepEqual(body.filters[1], { ok: 1 });
    assert.deepEqual(body.deep.a.b, {});
  });

  test("strips dot-notation keys that would reach a nested path in an update", () => {
    const { body } = clean({ body: { "subscription.plan": "gold", name: "Rhea" } });
    assert.equal(body["subscription.plan"], undefined);
    assert.equal(body.name, "Rhea");
  });

  test("strips prototype-pollution keys", () => {
    const { body } = clean({ body: JSON.parse('{"__proto__": {"admin": true}, "constructor": 1, "ok": 2}') });
    assert.equal(body.ok, 2);
    assert.equal({}.admin, undefined, "the prototype was polluted");
  });

  test("cleans params and query, not just the body", () => {
    const req = clean({ params: { id: { $ne: null } }, query: { role: { $ne: "user" } } });
    assert.deepEqual(req.params.id, {});
    assert.deepEqual(req.query.role, {});
  });

  test("leaves ordinary payloads completely alone", () => {
    // The failure mode nobody notices until support does: a filter that eats legitimate data.
    const original = {
      email: "rohit@example.in",
      amount: 47250,
      nested: { title: "The Salt Road", tags: ["drama", "period"], price: 45000 },
      flag: false,
      nothing: null,
      when: "2026-08-06T11:24:00Z",
      money: "INR 1,999.00",
      hyphenated: "K1A-0B1",
    };
    const { body } = clean({ body: structuredClone(original) });
    assert.deepEqual(body, original);
  });

  test("survives payloads that are not objects", () => {
    assert.doesNotThrow(() => clean({ body: "a string" }));
    assert.doesNotThrow(() => clean({ body: null, params: undefined, query: undefined }));
    assert.doesNotThrow(() => clean({ body: [1, 2, 3] }));
  });

  test("a pathologically nested body terminates instead of hanging", () => {
    let deep = { $ne: 1 };
    for (let i = 0; i < 5000; i++) deep = { nested: deep };
    assert.doesNotThrow(() => clean({ body: deep }));
  });
});

describe("mounted in a real Express 5 app", () => {
  // The reason this middleware exists rather than express-mongo-sanitize: v2 reassigns req.query,
  // which Express 5 exposes as a getter, so mounting it throws on every request. This proves ours
  // does not — and that the query really is cleaned, not just the body.
  const listen = (app) => new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });

  const probe = async (queryParser) => {
    const app = express();
    if (queryParser) app.set("query parser", queryParser);
    app.use(express.json());
    app.use(sanitizeRequest);
    app.post("/probe", (req, res) => res.json({ body: req.body, query: req.query }));

    const server = await listen(app);
    try {
      const { port } = server.address();
      const response = await fetch(`http://127.0.0.1:${port}/probe?role[$ne]=user&page=2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: { $ne: null }, name: "Rhea" }),
      });
      assert.equal(response.status, 200, "the request did not survive the middleware");
      return await response.json();
    } finally {
      server.close();
    }
  };

  test("cleans the body end-to-end without throwing on req.query", async () => {
    // The throw this guards against is unconditional: express-mongo-sanitize assigns to req.query,
    // and in Express 5 that is a getter, so mounting it would 500 every request in the app.
    const { body, query } = await probe();
    assert.deepEqual(body.email, {}, "$ne survived in the body");
    assert.equal(body.name, "Rhea");
    assert.equal(query.page, "2", "a normal query parameter was lost");
  });

  test("the default 'simple' parser cannot produce a query operator in the first place", async () => {
    // Express 5's default parser does not nest brackets, so "role[$ne]=user" arrives as a literal
    // key whose value is a string — a handler reading req.query.role gets undefined, not an
    // operator. Asserted rather than assumed, because it is load-bearing and invisible.
    const { query } = await probe();
    assert.equal(query.role, undefined, "role became a nested object under the simple parser");
    assert.equal(query["role[$ne]"], "user");
  });

  test("and if the app ever switches to 'extended', the operator is still stripped", async () => {
    // The extended parser DOES nest, which is where query-string injection becomes real. This is the
    // regression test for a one-line app.set() somebody adds later.
    const { query } = await probe("extended");
    assert.deepEqual(query.role, {}, "$ne survived under the extended parser");
    assert.equal(query.page, "2");
  });
});
