// Content-relative comment anchoring (Phase 3 §5.1). A comment is anchored to scene identity
// + offset-within-scene + the quoted text — NOT a raw document position. So:
//   - editing elsewhere in the script doesn't drift the comment (scene id is stable),
//   - within a scene we re-locate by searching for the quote (offset is just a hint), and
//   - if the quoted text is gone, the anchor resolves to null → the comment is "orphaned",
//     surfaced in the list rather than silently lost.

import { getScenes, sceneAtLine } from "./sceneIdentity";

const lineNumberAtOffset = (text, offset) => {
  let count = 1;
  for (let i = 0; i < offset && i < text.length; i += 1) if (text[i] === "\n") count += 1;
  return count;
};

const offsetOfLine = (text, lineNo) => {
  if (lineNo <= 1) return 0;
  let idx = 0;
  let seen = 0;
  while (seen < lineNo - 1) {
    idx = text.indexOf("\n", idx);
    if (idx === -1) return text.length;
    idx += 1;
    seen += 1;
  }
  return idx;
};

const sceneBounds = (text, scene) => {
  const totalLines = (text.match(/\n/g)?.length || 0) + 1;
  const start = offsetOfLine(text, scene.startLine);
  const end = scene.endLine >= totalLines ? text.length : offsetOfLine(text, scene.endLine + 1);
  return { start, end };
};

// Build a stored anchor from a document selection [from, to).
export const buildAnchor = (text = "", from = 0, to = 0) => {
  const lineNo = lineNumberAtOffset(text, from);
  const scene = sceneAtLine(text, lineNo);
  const { start } = sceneBounds(text, scene);
  return {
    sceneId: scene.sceneId,
    sceneOffset: Math.max(0, from - start),
    length: Math.max(0, to - from),
    quote: text.slice(from, to),
  };
};

// Resolve a stored anchor against the CURRENT document. Returns { from, to } or null (orphaned).
export const resolveAnchor = (text = "", anchor) => {
  if (!anchor || !anchor.quote) return null;
  const scene = getScenes(text).find((s) => s.sceneId === anchor.sceneId);
  if (!scene) return null; // scene removed → orphaned

  const { start, end } = sceneBounds(text, scene);
  const sceneText = text.slice(start, end);
  const quote = anchor.quote;

  // Prefer the exact stored offset; otherwise search the scene for the quote.
  let rel = -1;
  if (sceneText.slice(anchor.sceneOffset, anchor.sceneOffset + quote.length) === quote) {
    rel = anchor.sceneOffset;
  } else {
    rel = sceneText.indexOf(quote);
  }
  if (rel === -1) return null; // quoted text deleted/changed → orphaned

  const docFrom = start + rel;
  return { from: docFrom, to: docFrom + quote.length };
};
