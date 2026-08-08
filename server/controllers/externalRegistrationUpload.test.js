// Does a real screenshot upload actually reach the handler?
//
// It did not. The client sent `headers: { "Content-Type": "multipart/form-data" }`, which overrode
// the header axios builds from a FormData and dropped the `boundary=…` parameter with it. The
// boundary is what marks where each part begins, so without it the body cannot be parsed at all —
// the claim never arrived, and attaching a screenshot took the whole submission down.
//
// No unit test could catch that, because both halves were individually correct: the client built a
// valid FormData and the server mounted multer properly. Only a request that actually crosses the
// wire shows it. So these post real multipart bytes through the real middleware.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uploadExternalRegistrationScreenshot } from "./externalRegistrationController.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/** A one-pixel PNG — real bytes, so the mime filter and size limit see a genuine image. */
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
  + "0000000a49444154789c6360000002000100ffff03000006000557bfabd4"
  + "0000000049454e44ae426082",
  "hex",
);

const listen = (app) => new Promise((resolve) => {
  const server = app.listen(0, () => resolve(server));
});

/** The route exactly as competitionRoutes.js mounts it, minus `protect`. */
const makeApp = () => {
  const app = express();
  app.post("/claim", uploadExternalRegistrationScreenshot, (req, res) => {
    res.json({
      fields: req.body,
      file: req.file ? { name: req.file.originalname, type: req.file.mimetype, bytes: req.file.size } : null,
    });
  });
  return app;
};

const postForm = async (port, form, { contentType } = {}) => {
  const options = { method: "POST", body: form };
  // Overriding the header is the bug being reproduced; leaving it unset is the fix.
  if (contentType) options.headers = { "Content-Type": contentType };
  const response = await fetch(`http://127.0.0.1:${port}/claim`, options);
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* an error body may not be JSON */ }
  return { status: response.status, json, text };
};

describe("a claim with a screenshot crosses the wire", () => {
  test("fields and file both arrive when the boundary is left to the client", async () => {
    const server = await listen(makeApp());
    try {
      const form = new FormData();
      form.append("provider", "luma");
      form.append("fullName", "Aditi Rao");
      form.append("phone", "+91 98765 43210");
      form.append("externalRef", "EVT-8841XY");
      form.append("genres", "Drama");
      form.append("genres", "Thriller");
      form.append("screenshot", new Blob([PNG], { type: "image/png" }), "ticket.png");

      const { status, json } = await postForm(server.address().port, form);

      assert.equal(status, 200, "the upload did not reach the handler");
      assert.equal(json.fields.provider, "luma");
      assert.equal(json.fields.externalRef, "EVT-8841XY");
      // Repeated fields must survive as an array — that is how the genre list travels.
      assert.deepEqual(json.fields.genres, ["Drama", "Thriller"]);
      assert.equal(json.file.name, "ticket.png");
      assert.equal(json.file.type, "image/png");
      assert.ok(json.file.bytes > 0);
    } finally {
      server.close();
    }
  });

  test("a claim with NO screenshot still submits", async () => {
    // The screenshot is optional; the common path must not depend on multer finding a file.
    const server = await listen(makeApp());
    try {
      const form = new FormData();
      form.append("provider", "bookmyshow");
      form.append("externalRef", "BMS-1234");

      const { status, json } = await postForm(server.address().port, form);
      assert.equal(status, 200);
      assert.equal(json.fields.provider, "bookmyshow");
      assert.equal(json.file, null);
    } finally {
      server.close();
    }
  });

  test("REGRESSION: a hand-set Content-Type with no boundary is refused, not hung", async () => {
    // The exact bug. It must fail fast and legibly rather than hanging the submit button forever.
    const server = await listen(makeApp());
    try {
      const form = new FormData();
      form.append("provider", "luma");
      form.append("screenshot", new Blob([PNG], { type: "image/png" }), "ticket.png");

      const { status } = await postForm(server.address().port, form, {
        contentType: "multipart/form-data",
      });
      assert.notEqual(status, 200, "a boundary-less body was accepted, which cannot be parsed correctly");
      assert.ok(status >= 400 && status < 500, `expected a 4xx, got ${status}`);
    } finally {
      server.close();
    }
  });

  test("the client no longer sets that header", async () => {
    // The fix lives in the client, so the guard has to look there.
    const panel = fs.readFileSync(
      path.join(here, "..", "..", "client", "src", "pages", "challenge", "ExternalRegistrationPanel.jsx"),
      "utf8",
    );
    assert.doesNotMatch(
      panel,
      /"Content-Type":\s*"multipart\/form-data"/,
      "the panel is setting multipart/form-data by hand again, which drops the boundary",
    );
  });
});

describe("the upload guard rejects what it should", () => {
  test("a non-image is refused with a readable message", async () => {
    const server = await listen(makeApp());
    try {
      const form = new FormData();
      form.append("screenshot", new Blob([Buffer.from("#!/bin/sh\n")], { type: "application/x-sh" }), "evil.sh");

      const { status, json } = await postForm(server.address().port, form);
      assert.equal(status, 400);
      assert.match(json.message, /JPG, PNG, WebP or HEIC/);
    } finally {
      server.close();
    }
  });

  test("an oversized image is refused with 413, not a generic failure", async () => {
    const server = await listen(makeApp());
    try {
      const form = new FormData();
      const big = Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024)]);
      form.append("screenshot", new Blob([big], { type: "image/png" }), "huge.png");

      const { status, json } = await postForm(server.address().port, form);
      assert.equal(status, 413);
      assert.match(json.message, /8MB/);
    } finally {
      server.close();
    }
  });
});
