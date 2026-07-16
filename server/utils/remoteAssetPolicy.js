import crypto from "crypto";

const DEFAULT_MAX_BYTES = 30 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_REDIRECTS = 2;
const GRANT_VERSION = 1;
const DEFAULT_GRANT_TTL_SECONDS = 7 * 24 * 60 * 60;

export class RemoteAssetPolicyError extends Error {
  constructor(message, code = "UNTRUSTED_REMOTE_ASSET") {
    super(message);
    this.name = "RemoteAssetPolicyError";
    this.code = code;
  }
}

const splitConfiguredHosts = (value = "") =>
  String(value || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

const getConfiguredHosts = () => new Set([
  "res.cloudinary.com",
  "api.cloudinary.com",
  ...splitConfiguredHosts(process.env.TRUSTED_MEDIA_HOSTS),
]);

const getGrantSecret = () => {
  const secret = String(process.env.FILE_UPLOAD_GRANT_SECRET || process.env.JWT_SECRET || "");
  if (secret.length < 16) {
    throw new RemoteAssetPolicyError(
      "File upload grant signing is not configured.",
      "ASSET_GRANT_CONFIGURATION_ERROR"
    );
  }
  return secret;
};

const encodeBase64Url = (value) => Buffer.from(value).toString("base64url");
const decodeBase64Url = (value) => Buffer.from(value, "base64url").toString("utf8");
const signGrantPayload = (encodedPayload) =>
  crypto.createHmac("sha256", getGrantSecret()).update(encodedPayload).digest("base64url");

const signaturesMatch = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const normalizeTrustedRemoteAssetUrl = (value, {
  cloudName = process.env.CLOUDINARY_CLOUD_NAME,
  allowedHosts = getConfiguredHosts(),
} = {}) => {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new RemoteAssetPolicyError("A remote asset URL is required.", "MISSING_REMOTE_ASSET_URL");
  }
  if (raw.length > 4096) {
    throw new RemoteAssetPolicyError("The remote asset URL is too long.", "REMOTE_ASSET_URL_TOO_LONG");
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new RemoteAssetPolicyError("The remote asset URL is invalid.", "INVALID_REMOTE_ASSET_URL");
  }

  if (parsed.protocol !== "https:") {
    throw new RemoteAssetPolicyError("Remote assets must use HTTPS.", "UNTRUSTED_REMOTE_ASSET_PROTOCOL");
  }
  if (parsed.username || parsed.password) {
    throw new RemoteAssetPolicyError("Remote asset URLs cannot contain credentials.", "REMOTE_ASSET_CREDENTIALS");
  }
  if (parsed.port && parsed.port !== "443") {
    throw new RemoteAssetPolicyError("Remote asset URLs cannot use a custom port.", "REMOTE_ASSET_PORT");
  }
  if (parsed.hash) {
    throw new RemoteAssetPolicyError("Remote asset URLs cannot contain fragments.", "REMOTE_ASSET_FRAGMENT");
  }

  const hostname = parsed.hostname.toLowerCase();
  const trustedHosts = allowedHosts instanceof Set
    ? allowedHosts
    : new Set(Array.from(allowedHosts || [], (host) => String(host).trim().toLowerCase()));
  if (!trustedHosts.has(hostname)) {
    throw new RemoteAssetPolicyError("The remote asset host is not trusted.", "UNTRUSTED_REMOTE_ASSET_HOST");
  }

  if (hostname === "res.cloudinary.com" || hostname === "api.cloudinary.com") {
    const expectedCloudName = String(cloudName || "").trim();
    if (!expectedCloudName) {
      throw new RemoteAssetPolicyError(
        "Cloudinary delivery validation is not configured.",
        "CLOUDINARY_VALIDATION_CONFIGURATION_ERROR"
      );
    }
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const cloudNameSegment = hostname === "api.cloudinary.com" && pathSegments[0] === "v1_1"
      ? pathSegments[1]
      : pathSegments[0];
    if (cloudNameSegment !== expectedCloudName) {
      throw new RemoteAssetPolicyError("The Cloudinary asset belongs to a different account.", "UNTRUSTED_CLOUDINARY_ACCOUNT");
    }
  }

  parsed.hostname = hostname;
  parsed.username = "";
  parsed.password = "";
  parsed.hash = "";
  if (parsed.port === "443") parsed.port = "";
  return parsed.toString();
};

export const getCloudinaryResourceTypeFromUrl = (value) => {
  try {
    const parsed = new URL(normalizeTrustedRemoteAssetUrl(value));
    if (parsed.hostname !== "res.cloudinary.com") return "";
    const segments = parsed.pathname.split("/").filter(Boolean);
    const uploadIndex = segments.indexOf("upload");
    const resourceType = uploadIndex > 0 ? segments[uploadIndex - 1] : "";
    return ["image", "video", "raw"].includes(resourceType) ? resourceType : "";
  } catch {
    return "";
  }
};

export const createRemoteAssetGrant = ({
  url,
  ownerId,
  publicId = "",
  purpose = "script-source",
  format = "pdf",
  expiresInSeconds = DEFAULT_GRANT_TTL_SECONDS,
} = {}) => {
  const normalizedUrl = normalizeTrustedRemoteAssetUrl(url);
  const normalizedOwnerId = String(ownerId || "").trim();
  if (!normalizedOwnerId) {
    throw new RemoteAssetPolicyError("An upload owner is required.", "MISSING_ASSET_GRANT_OWNER");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    v: GRANT_VERSION,
    sub: normalizedOwnerId,
    purpose: String(purpose || "script-source"),
    url: normalizedUrl,
    publicId: String(publicId || ""),
    format: String(format || "pdf").toLowerCase(),
    iat: issuedAt,
    exp: issuedAt + Math.max(60, Number(expiresInSeconds) || DEFAULT_GRANT_TTL_SECONDS),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signGrantPayload(encodedPayload)}`;
};

export const verifyRemoteAssetGrant = (grant, {
  url,
  ownerId,
  purpose = "script-source",
  now = Math.floor(Date.now() / 1000),
} = {}) => {
  const [encodedPayload, suppliedSignature, ...extraParts] = String(grant || "").split(".");
  if (!encodedPayload || !suppliedSignature || extraParts.length > 0) {
    throw new RemoteAssetPolicyError("The file upload grant is invalid.", "INVALID_ASSET_GRANT");
  }
  const expectedSignature = signGrantPayload(encodedPayload);
  if (!signaturesMatch(suppliedSignature, expectedSignature)) {
    throw new RemoteAssetPolicyError("The file upload grant signature is invalid.", "INVALID_ASSET_GRANT_SIGNATURE");
  }

  let payload;
  try {
    payload = JSON.parse(decodeBase64Url(encodedPayload));
  } catch {
    throw new RemoteAssetPolicyError("The file upload grant payload is invalid.", "INVALID_ASSET_GRANT_PAYLOAD");
  }

  const normalizedUrl = normalizeTrustedRemoteAssetUrl(url);
  if (payload.v !== GRANT_VERSION) {
    throw new RemoteAssetPolicyError("The file upload grant version is unsupported.", "UNSUPPORTED_ASSET_GRANT_VERSION");
  }
  if (String(payload.sub || "") !== String(ownerId || "")) {
    throw new RemoteAssetPolicyError("The file upload grant belongs to another user.", "ASSET_GRANT_OWNER_MISMATCH");
  }
  if (String(payload.purpose || "") !== String(purpose || "")) {
    throw new RemoteAssetPolicyError("The file upload grant has the wrong purpose.", "ASSET_GRANT_PURPOSE_MISMATCH");
  }
  if (String(payload.url || "") !== normalizedUrl) {
    throw new RemoteAssetPolicyError("The file URL does not match its upload grant.", "ASSET_GRANT_URL_MISMATCH");
  }
  if (!Number.isFinite(Number(payload.exp)) || Number(payload.exp) < Number(now)) {
    throw new RemoteAssetPolicyError("The file upload grant has expired. Upload the file again.", "EXPIRED_ASSET_GRANT");
  }
  return payload;
};

export const isPdfBuffer = (buffer) =>
  Buffer.isBuffer(buffer) && buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";

const readBodyWithLimit = async (response, maxBytes, controller) => {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    controller.abort();
    throw new RemoteAssetPolicyError("The remote asset exceeds the size limit.", "REMOTE_ASSET_TOO_LARGE");
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of response.body || []) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      controller.abort();
      throw new RemoteAssetPolicyError("The remote asset exceeds the size limit.", "REMOTE_ASSET_TOO_LARGE");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, total);
};

export const fetchTrustedRemoteAsset = async (value, {
  maxBytes = DEFAULT_MAX_BYTES,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRedirects = DEFAULT_MAX_REDIRECTS,
  fetchImpl = globalThis.fetch,
} = {}) => {
  if (typeof fetchImpl !== "function") {
    throw new RemoteAssetPolicyError("Remote asset fetching is unavailable.", "REMOTE_ASSET_FETCH_UNAVAILABLE");
  }

  let currentUrl = normalizeTrustedRemoteAssetUrl(value);
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "application/pdf,application/octet-stream;q=0.8" },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirectCount === maxRedirects) {
          throw new RemoteAssetPolicyError("The remote asset redirect could not be followed safely.", "REMOTE_ASSET_REDIRECT_REJECTED");
        }
        await response.body?.cancel?.();
        currentUrl = normalizeTrustedRemoteAssetUrl(new URL(location, currentUrl).toString());
        continue;
      }

      if (!response.ok) {
        throw new RemoteAssetPolicyError(
          `Remote storage returned ${response.status}.`,
          "REMOTE_ASSET_FETCH_FAILED"
        );
      }

      const buffer = await readBodyWithLimit(response, maxBytes, controller);
      return {
        buffer,
        contentType: String(response.headers.get("content-type") || "").toLowerCase(),
        url: currentUrl,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new RemoteAssetPolicyError("The remote asset request timed out.", "REMOTE_ASSET_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new RemoteAssetPolicyError("The remote asset could not be fetched safely.", "REMOTE_ASSET_FETCH_FAILED");
};

export const fetchTrustedPdfAsset = async (value, options = {}) => {
  const result = await fetchTrustedRemoteAsset(value, options);
  if (!isPdfBuffer(result.buffer)) {
    throw new RemoteAssetPolicyError("The stored remote asset is not a valid PDF.", "INVALID_REMOTE_PDF");
  }
  return result;
};
