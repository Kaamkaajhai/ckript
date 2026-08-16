import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  checksumForPart,
  createMediaUploadHandlers,
  parseUploadContentRange,
  SCRIPT_MEDIA_CHUNK_BYTES,
} from "./mediaUploadController.js";

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const matches = (value, expected) => {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    if (expected.$in) return expected.$in.includes(value);
    if (expected.$gt) return new Date(value) > new Date(expected.$gt);
    if (expected.$lte) return new Date(value) <= new Date(expected.$lte);
  }
  return String(value) === String(expected);
};

const makeFixture = ({
  now = new Date("2026-08-13T06:00:00.000Z"),
  fileSize = SCRIPT_MEDIA_CHUNK_BYTES + 1,
  deleteFailures = 0,
} = {}) => {
  const sessions = [];
  const script = {
    _id: "script-7",
    creator: "writer-1",
    services: {},
    trailerStatus: "none",
    async save() { this.saved = (this.saved || 0) + 1; },
  };
  const uploadCalls = [];
  const deleteCalls = [];
  let remainingDeleteFailures = deleteFailures;

  const SessionModel = {
    async create(data) {
      const session = {
        ...data,
        _id: `session-${sessions.length + 1}`,
        status: "uploading",
        acceptedParts: [],
        asset: {},
        async save() { this.saved = (this.saved || 0) + 1; },
      };
      sessions.push(session);
      return session;
    },
    async findOne(query) {
      return sessions.find((session) => Object.entries(query).every(([key, expected]) => (
        matches(session[key], expected)
      ))) || null;
    },
    find(query) {
      const found = sessions.filter((session) => Object.entries(query).every(([key, expected]) => (
        matches(session[key], expected)
      )));
      return { async limit(value) { return found.slice(0, value); } };
    },
  };

  const handlers = createMediaUploadHandlers({
    ScriptModel: { async findById(id) { return id === script._id ? script : null; } },
    SessionModel,
    now: () => new Date(now),
    randomId: () => "upload-abc",
    uploadChunk: async (buffer, options) => {
      uploadCalls.push({ buffer, options });
      const final = options.end === options.total - 1;
      return final
        ? {
          done: true,
          secure_url: "https://res.cloudinary.com/test/video/upload/trailer.mp4",
          public_id: "scriptbridge/trailers/trailer-script-7-upload-abc",
          resource_type: "video",
          bytes: options.total,
          format: "mp4",
        }
        : { done: false };
    },
    deleteAsset: async (...args) => {
      deleteCalls.push(args);
      if (remainingDeleteFailures > 0) {
        remainingDeleteFailures -= 1;
        throw new Error("Cloudinary unavailable");
      }
    },
  });

  const user = {
    _id: "writer-1",
    role: "writer",
    subscription: { plan: "gold" },
  };
  const request = (overrides = {}) => ({
    params: { id: script._id },
    body: {
      kind: "trailer",
      fileName: "feature-trailer.mp4",
      mimeType: "video/mp4",
      fileSize,
      lastModified: 99,
    },
    headers: {},
    user,
    ...overrides,
  });

  return { handlers, sessions, script, uploadCalls, deleteCalls, request, user };
};

const createSession = async (fixture, body = {}) => {
  const req = fixture.request({ body: { ...fixture.request().body, ...body } });
  const res = makeResponse();
  await fixture.handlers.createSession(req, res);
  assert.equal(res.statusCode, 201);
  return fixture.sessions[0];
};

const partRequest = (fixture, session, index, body, start, end) => fixture.request({
  params: { id: fixture.script._id, sessionId: session._id, partNumber: String(index) },
  body,
  headers: {
    "content-range": `bytes ${start}-${end}/${session.fileSize}`,
    "x-chunk-sha256": checksumForPart(body),
  },
});

describe("resumable script media sessions", () => {
  test("session creation is owner-only, bounded, and idempotent for the same local file", async () => {
    const fixture = makeFixture();
    const forbidden = makeResponse();
    await fixture.handlers.createSession(fixture.request({
      user: { ...fixture.user, _id: "other-writer" },
    }), forbidden);
    assert.equal(forbidden.statusCode, 403);
    assert.equal(fixture.sessions.length, 0);

    const first = makeResponse();
    await fixture.handlers.createSession(fixture.request(), first);
    assert.equal(first.statusCode, 201);
    assert.equal(first.body.upload.chunkSize, SCRIPT_MEDIA_CHUNK_BYTES);
    assert.equal(first.body.upload.acceptedBytes, 0);

    const retry = makeResponse();
    await fixture.handlers.createSession(fixture.request(), retry);
    assert.equal(retry.statusCode, 200);
    assert.equal(retry.body.upload.sessionId, first.body.upload.sessionId);
    assert.equal(fixture.sessions.length, 1);
  });

  test("rejects unsupported, oversized, and unentitled pitch-video sessions before Cloudinary", async () => {
    const fixture = makeFixture();

    const unsupported = makeResponse();
    await fixture.handlers.createSession(fixture.request({
      body: { ...fixture.request().body, mimeType: "application/x-msdownload" },
    }), unsupported);
    assert.equal(unsupported.statusCode, 400);

    const oversized = makeResponse();
    await fixture.handlers.createSession(fixture.request({
      body: { ...fixture.request().body, fileSize: 250 * 1024 * 1024 + 1 },
    }), oversized);
    assert.equal(oversized.statusCode, 413);

    const premium = makeResponse();
    await fixture.handlers.createSession(fixture.request({
      user: { ...fixture.user, subscription: { plan: "free" } },
      body: { ...fixture.request().body, kind: "pitchVideo" },
    }), premium);
    assert.equal(premium.statusCode, 403);
    assert.equal(premium.body.requiresUpgrade, true);
    assert.equal(fixture.sessions.length, 0);
  });

  test("accepts sequential checksummed parts and makes an identical retry idempotent", async () => {
    const fixture = makeFixture();
    const session = await createSession(fixture);
    const firstBytes = Buffer.alloc(SCRIPT_MEDIA_CHUNK_BYTES, 0x5a);

    const first = makeResponse();
    await fixture.handlers.uploadPart(partRequest(
      fixture,
      session,
      0,
      firstBytes,
      0,
      SCRIPT_MEDIA_CHUNK_BYTES - 1,
    ), first);
    assert.equal(first.statusCode, 200);
    assert.equal(first.body.upload.acceptedBytes, SCRIPT_MEDIA_CHUNK_BYTES);
    assert.equal(first.body.upload.nextPart, 1);
    assert.equal(fixture.uploadCalls.length, 1);
    assert.equal(fixture.uploadCalls[0].options.uploadId, "upload-abc");

    const duplicate = makeResponse();
    await fixture.handlers.uploadPart(partRequest(
      fixture,
      session,
      0,
      firstBytes,
      0,
      SCRIPT_MEDIA_CHUNK_BYTES - 1,
    ), duplicate);
    assert.equal(duplicate.statusCode, 200);
    assert.equal(duplicate.body.idempotent, true);
    assert.equal(fixture.uploadCalls.length, 1, "an acknowledged part was uploaded upstream twice");

    const finalBytes = Buffer.from([0x2a]);
    const final = makeResponse();
    await fixture.handlers.uploadPart(partRequest(
      fixture,
      session,
      1,
      finalBytes,
      SCRIPT_MEDIA_CHUNK_BYTES,
      SCRIPT_MEDIA_CHUNK_BYTES,
    ), final);
    assert.equal(final.statusCode, 200);
    assert.equal(session.status, "ready");
    assert.equal(final.body.upload.percent, 100);
    assert.equal(fixture.uploadCalls.length, 2);
  });

  test("refuses corrupt and out-of-order bytes without forwarding them", async () => {
    const fixture = makeFixture();
    const session = await createSession(fixture);
    const finalBytes = Buffer.from([0x2a]);

    const outOfOrder = makeResponse();
    await fixture.handlers.uploadPart(partRequest(
      fixture,
      session,
      1,
      finalBytes,
      SCRIPT_MEDIA_CHUNK_BYTES,
      SCRIPT_MEDIA_CHUNK_BYTES,
    ), outOfOrder);
    assert.equal(outOfOrder.statusCode, 409);
    assert.equal(outOfOrder.body.nextPart, 0);

    const corruptRequest = partRequest(
      fixture,
      session,
      0,
      Buffer.alloc(SCRIPT_MEDIA_CHUNK_BYTES, 1),
      0,
      SCRIPT_MEDIA_CHUNK_BYTES - 1,
    );
    corruptRequest.headers["x-chunk-sha256"] = "0".repeat(64);
    const corrupt = makeResponse();
    await fixture.handlers.uploadPart(corruptRequest, corrupt);
    assert.equal(corrupt.statusCode, 422);
    assert.equal(fixture.uploadCalls.length, 0);
  });

  test("completion attaches the final asset once and returns the same result on retry", async () => {
    const fixture = makeFixture({ fileSize: 4 });
    const session = await createSession(fixture);
    const bytes = Buffer.from("film");
    const part = makeResponse();
    await fixture.handlers.uploadPart(partRequest(fixture, session, 0, bytes, 0, 3), part);
    assert.equal(session.status, "ready");

    const completeRequest = fixture.request({
      params: { id: fixture.script._id, sessionId: session._id },
    });
    const complete = makeResponse();
    await fixture.handlers.completeSession(completeRequest, complete);
    assert.equal(complete.statusCode, 200);
    assert.equal(session.status, "completed");
    assert.equal(fixture.script.uploadedTrailerUrl, session.asset.secureUrl);
    assert.equal(fixture.script.trailerStatus, "ready");
    assert.equal(fixture.script.saved, 1);

    const duplicate = makeResponse();
    await fixture.handlers.completeSession(completeRequest, duplicate);
    assert.equal(duplicate.statusCode, 200);
    assert.equal(duplicate.body.idempotent, true);
    assert.equal(fixture.script.saved, 1, "idempotent completion saved the script twice");
  });

  test("abort and expiry delete a finalized-but-unattached asset", async () => {
    const fixture = makeFixture({ fileSize: 4 });
    const session = await createSession(fixture);
    const bytes = Buffer.from("film");
    await fixture.handlers.uploadPart(
      partRequest(fixture, session, 0, bytes, 0, 3),
      makeResponse(),
    );

    const aborted = makeResponse();
    await fixture.handlers.abortSession(fixture.request({
      params: { id: fixture.script._id, sessionId: session._id },
    }), aborted);
    assert.equal(aborted.statusCode, 200);
    assert.equal(session.status, "aborted");
    assert.deepEqual(fixture.deleteCalls[0], [session.asset.publicId, { resource_type: "video" }]);

    const expiredFixture = makeFixture({ now: new Date("2026-08-15T06:00:01.000Z") });
    // The fixture intentionally exposes sessions rather than its model. Build
    // the stale record explicitly to exercise the cleanup job's retryable path.
    expiredFixture.sessions.push({
      _id: "session-stale",
      scriptId: "script-7",
      userId: "writer-1",
      status: "ready",
      expiresAt: new Date("2026-08-14T06:00:00.000Z"),
      asset: { publicId: "orphan", resourceType: "video" },
      async save() { this.saved = true; },
    });
    const cleaned = await expiredFixture.handlers.cleanupExpiredSessions();
    assert.equal(cleaned, 1);
    assert.equal(expiredFixture.sessions[0].status, "expired");
    assert.equal(expiredFixture.deleteCalls[0][0], "orphan");
  });

  test("cancel closes the session even when upstream cleanup must retry", async () => {
    const fixture = makeFixture({ fileSize: 4, deleteFailures: 1 });
    const session = await createSession(fixture);
    await fixture.handlers.uploadPart(
      partRequest(fixture, session, 0, Buffer.from("film"), 0, 3),
      makeResponse(),
    );

    const aborted = makeResponse();
    await fixture.handlers.abortSession(fixture.request({
      params: { id: fixture.script._id, sessionId: session._id },
    }), aborted);

    assert.equal(aborted.statusCode, 202);
    assert.equal(session.status, "aborted", "a cleanup outage left the upload resumable");
    assert.equal(session.cleanupPending, true);

    const replacement = makeResponse();
    await fixture.handlers.createSession(fixture.request(), replacement);
    assert.equal(replacement.statusCode, 201);
    assert.notEqual(replacement.body.upload.sessionId, session._id);

    // Session creation also advances lazy cleanup; explicitly finish it only
    // if that background pass has not reached the record yet.
    await new Promise((resolve) => setImmediate(resolve));
    if (session.cleanupPending) await fixture.handlers.cleanupExpiredSessions();
    assert.equal(session.cleanupPending, false);
    assert.ok(fixture.deleteCalls.length >= 2);
  });
});

describe("upload range parser", () => {
  test("accepts exact HTTP byte ranges and rejects malformed or open-ended ranges", () => {
    assert.deepEqual(parseUploadContentRange("bytes 0-5/10"), {
      start: 0, end: 5, total: 10, size: 6,
    });
    assert.equal(parseUploadContentRange("bytes 0-5/*"), null);
    assert.equal(parseUploadContentRange("bytes 5-4/10"), null);
    assert.equal(parseUploadContentRange("bytes 0-10/10"), null);
  });
});
