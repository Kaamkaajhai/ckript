import assert from "node:assert/strict";
import test from "node:test";

import {
  RemoteAssetPolicyError,
  createRemoteAssetGrant,
  fetchTrustedRemoteAsset,
  getCloudinaryResourceTypeFromUrl,
  isPdfBuffer,
  normalizeTrustedRemoteAssetUrl,
  verifyRemoteAssetGrant,
} from "./remoteAssetPolicy.js";

process.env.CLOUDINARY_CLOUD_NAME = "ckript-test";
process.env.FILE_UPLOAD_GRANT_SECRET = "test-only-upload-grant-secret-32-bytes";

const trustedPdfUrl = "https://res.cloudinary.com/ckript-test/raw/upload/v1/scriptbridge/scripts/script.pdf";

test("accepts the configured Cloudinary account and normalizes the URL", () => {
  assert.equal(normalizeTrustedRemoteAssetUrl(trustedPdfUrl), trustedPdfUrl);
  const privateDownloadUrl = "https://api.cloudinary.com/v1_1/ckript-test/raw/download?timestamp=123&signature=test";
  assert.equal(normalizeTrustedRemoteAssetUrl(privateDownloadUrl), privateDownloadUrl);
});

test("classifies Cloudinary resource types from parsed path segments, not substrings", () => {
  assert.equal(
    getCloudinaryResourceTypeFromUrl("https://res.cloudinary.com/ckript-test/raw/upload/v1/script.pdf"),
    "raw"
  );
  assert.equal(
    getCloudinaryResourceTypeFromUrl("https://res.cloudinary.com/ckript-test/raw/not-upload/v1/image/upload/file.pdf"),
    "image"
  );
  assert.equal(
    getCloudinaryResourceTypeFromUrl("https://evil.test/ckript-test/raw/upload/file.pdf"),
    ""
  );
});

test("rejects substring lookalikes, foreign Cloudinary accounts, credentials, ports, and HTTP", () => {
  const rejected = [
    "https://res.cloudinary.com.evil.test/ckript-test/raw/upload/script.pdf",
    "https://evil.test/res.cloudinary.com/ckript-test/raw/upload/script.pdf",
    "https://res.cloudinary.com/another-account/raw/upload/script.pdf",
    "https://user:pass@res.cloudinary.com/ckript-test/raw/upload/script.pdf",
    "https://res.cloudinary.com:8443/ckript-test/raw/upload/script.pdf",
    "http://res.cloudinary.com/ckript-test/raw/upload/script.pdf",
  ];
  for (const candidate of rejected) {
    assert.throws(() => normalizeTrustedRemoteAssetUrl(candidate), RemoteAssetPolicyError);
  }
});

test("binds an upload grant to its owner, purpose, and exact normalized URL", () => {
  const grant = createRemoteAssetGrant({ url: trustedPdfUrl, ownerId: "writer-1", publicId: "scriptbridge/scripts/script" });
  const payload = verifyRemoteAssetGrant(grant, { url: trustedPdfUrl, ownerId: "writer-1" });
  assert.equal(payload.publicId, "scriptbridge/scripts/script");
  assert.throws(() => verifyRemoteAssetGrant(grant, { url: trustedPdfUrl, ownerId: "writer-2" }), /another user/i);
  assert.throws(
    () => verifyRemoteAssetGrant(grant, { url: trustedPdfUrl.replace("script.pdf", "other.pdf"), ownerId: "writer-1" }),
    /does not match/i
  );
});

test("rejects expired and tampered upload grants", () => {
  const grant = createRemoteAssetGrant({ url: trustedPdfUrl, ownerId: "writer-1", expiresInSeconds: 60 });
  const payload = verifyRemoteAssetGrant(grant, { url: trustedPdfUrl, ownerId: "writer-1" });
  assert.throws(
    () => verifyRemoteAssetGrant(grant, { url: trustedPdfUrl, ownerId: "writer-1", now: payload.exp + 1 }),
    /expired/i
  );
  assert.throws(() => verifyRemoteAssetGrant(`${grant}x`, { url: trustedPdfUrl, ownerId: "writer-1" }), /signature/i);
});

test("validates every redirect target and enforces the response size limit", async () => {
  const redirectFetch = async () => new Response(null, {
    status: 302,
    headers: { location: "https://internal.example.test/admin" },
  });
  await assert.rejects(
    fetchTrustedRemoteAsset(trustedPdfUrl, { fetchImpl: redirectFetch }),
    /host is not trusted/i
  );

  const oversizedFetch = async () => new Response(Buffer.alloc(12), {
    status: 200,
    headers: { "content-length": "12", "content-type": "application/pdf" },
  });
  await assert.rejects(
    fetchTrustedRemoteAsset(trustedPdfUrl, { fetchImpl: oversizedFetch, maxBytes: 8 }),
    /size limit/i
  );
});

test("recognizes PDF content by signature instead of trusting a URL suffix or response header", () => {
  assert.equal(isPdfBuffer(Buffer.from("%PDF-1.7\n")), true);
  assert.equal(isPdfBuffer(Buffer.from("PK\u0003\u0004docx")), false);
});
