/**
 * The exit save, made honest.
 *
 * When the editor is closing we cannot await a normal request, so the draft is
 * posted with `fetch(..., { keepalive: true })`. MDN is explicit about what that
 * costs: *"The body size for keepalive requests is limited to 64 kibibytes."*
 * (https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)
 *
 * The draft payload blows past that on any real screenplay, because it carries
 * the script text more than once — `textContent` and `fountainContent` are the
 * same Fountain string in screenplay mode, `baseContent` is a third near-copy,
 * and `scriptPreviewPageTexts` is a fourth in page-sized pieces. Measured
 * against the real payload shape it crosses 64 KiB somewhere between 9 and 16
 * pages at ordinary page density.
 *
 * That on its own would be a bug you could see. What made it a silent one is
 * that the browser rejects the request AFTER the call returns, the rejection is
 * swallowed, and the caller advances its "last saved" signature anyway — so the
 * client believes it saved, and `beforeunload` warns the writer their changes
 * may be lost and then fails to save them.
 *
 * So this module does two things and nothing else:
 *
 *   - drops what the exit save does not need. `scriptPreviewPageTexts` is
 *     derived from the document and rewritten by the very next autosave; every
 *     other field the server treats as `undefined` → leave the stored value
 *     alone, so omitting it is safe by the server's own contract.
 *   - MEASURES the encoded body and refuses to send one that will not fit.
 *
 * A refusal is a real answer, not a failure to have an answer: the caller keeps
 * its unsaved state, does not advance the signature, and the local working-draft
 * snapshot — which has no such cap — remains the record. Nothing in the design
 * may depend on this path succeeding.
 */

/** MDN: keepalive request bodies are capped at 64 KiB. */
export const KEEPALIVE_BODY_LIMIT_BYTES = 64 * 1024;

/**
 * Fields stripped from an exit save. Each is either derived from content the
 * same request already carries, or safely omitted because the server's draft
 * handler only writes fields that are not `undefined`.
 */
export const KEEPALIVE_DROPPED_FIELDS = Object.freeze(["scriptPreviewPageTexts"]);

export function measureUtf8Bytes(value) {
  const str = String(value ?? "");
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str).length;
  }
  // Fallback for environments without TextEncoder: count UTF-8 code units by
  // code point. Slower, but this runs once per exit, not per keystroke.
  let bytes = 0;
  for (const char of str) {
    const code = char.codePointAt(0);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

export function buildKeepalivePayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const slim = { ...payload };
  for (const field of KEEPALIVE_DROPPED_FIELDS) {
    delete slim[field];
  }
  return slim;
}

/**
 * Encode an exit save and decide whether the browser will actually carry it.
 *
 * Returns `{ body, bytes, withinLimit, limit, dropped }`. `body` is null when it
 * does not fit — there is no partial send, and pretending otherwise is the bug
 * this replaces.
 */
export function encodeKeepaliveBody(payload, { limit = KEEPALIVE_BODY_LIMIT_BYTES } = {}) {
  const slim = buildKeepalivePayload(payload);
  let serialized = "";
  try {
    serialized = JSON.stringify(slim);
  } catch {
    return { body: null, bytes: 0, withinLimit: false, limit, dropped: KEEPALIVE_DROPPED_FIELDS, reason: "unserializable" };
  }

  const bytes = measureUtf8Bytes(serialized);
  const withinLimit = bytes <= limit;
  return {
    body: withinLimit ? serialized : null,
    bytes,
    withinLimit,
    limit,
    dropped: KEEPALIVE_DROPPED_FIELDS,
    reason: withinLimit ? "ok" : "too-large",
  };
}
