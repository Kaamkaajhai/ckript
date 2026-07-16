// Scene reordering — the careful text transform behind the corkboard (Phase 4 §2.2).
//
// Dragging a card moves a scene's WHOLE block (its heading + everything under it, up to the
// next scene heading) as ONE transaction — not line by line. Scene identity stays index+heading
// (see sceneIdentity.js): the moved scene keeps its heading, and indices re-derive from the new
// text, so locks/presence/navigator re-resolve correctly after the move.
//
// Two guarantees the corkboard relies on:
//   • Frontmatter (any lines above the first slugline — title block, notes) is NEVER moved. It
//     stays pinned as the document prefix, so dragging scene 1 doesn't drag the title with it.
//   • The reassembled text parses identically (each INT./EXT. line still starts a scene) and
//     exports to PDF/Fountain unchanged except for order.

// Scene detection comes from the ONE classifier so the corkboard's scene blocks match the
// navigator/reports/identity exactly — including lines forced to a scene (Fountain ".LOCATION").
import { classifyText } from "./classify";

// Split a document into { prefix, blocks } where:
//   prefix  = the lines above the first slugline (frontmatter), kept verbatim and never moved
//   blocks  = one entry per scene, each the array of lines from its heading through the line
//             before the next heading (so a block carries the scene's trailing blank lines).
const splitIntoBlocks = (text) => {
  const lines = String(text).split("\n");
  const types = classifyText(text);
  const headingLines = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (types[i] === "scene") headingLines.push(i);
  }
  if (headingLines.length === 0) return { prefix: lines, blocks: [] };

  const prefix = lines.slice(0, headingLines[0]);
  const blocks = headingLines.map((start, i) => {
    const end = i + 1 < headingLines.length ? headingLines[i + 1] : lines.length;
    return lines.slice(start, end);
  });
  return { prefix, blocks };
};

const trimTrailingBlank = (lines) => {
  const out = lines.slice();
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
};

/** Number of scene blocks in the text (excludes frontmatter). */
export const sceneBlockCount = (text) => splitIntoBlocks(text).blocks.length;

/**
 * Move the scene block at `fromIndex` so it sits at position `toIndex` in scene order.
 * Returns the new document text. Returns the text unchanged when indices are equal, out of
 * range, or there are no scenes — so callers can apply the result unconditionally.
 *
 * `toIndex` is the destination index in the post-removal ordering (insert-at semantics):
 * moving [A,B,C,D] from 0 to 2 yields [B,C,A,D].
 */
export const moveScene = (text, fromIndex, toIndex) => {
  const { prefix, blocks } = splitIntoBlocks(text);
  const n = blocks.length;
  if (!n) return String(text);

  const from = Number(fromIndex);
  const to = Number(toIndex);
  if (
    !Number.isInteger(from) || !Number.isInteger(to) ||
    from < 0 || from >= n || to < 0 || to >= n || from === to
  ) {
    return String(text);
  }

  const reordered = blocks.slice();
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);

  // Normalize each block to end in exactly one blank line so scenes stay visually separated and
  // the spacing is consistent regardless of what trailing whitespace the original blocks had.
  const body = reordered.flatMap((b) => [...trimTrailingBlank(b), ""]);

  // Keep the frontmatter prefix verbatim (it retains its own separation from scene 1), append
  // the reordered scene bodies, and trim the trailing blank line off the whole document.
  return trimTrailingBlank([...prefix, ...body]).join("\n");
};
