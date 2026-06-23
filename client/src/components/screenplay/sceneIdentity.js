// Scene identity — the foundation the whole collaboration layer (presence, locks, comments)
// anchors to. A scene is identified by its INDEX + HEADING TEXT, re-derived live from the
// document, NEVER by a stored character offset.
//
// Why not offsets: when person A edits scene 1, every character offset below shifts. A lock
// anchored to an offset would drift to the wrong scene. Index + heading survives edits made
// elsewhere in the document — see sceneIdentity.test (offset-shift proof).

// Scene detection comes from the ONE classifier so a line forced to a scene (Fountain ".LOCATION")
// is a real lockable/commentable unit, consistent with the navigator, reports, and editor. The
// leading "." marker is stripped from the stored heading so the identity key matches the displayed
// heading (and survives across reorders the same way a normal slug does).
import { classifyText, stripForceMarker } from "./classify";

const DOC_SCENE_ID = "scene:doc";

// Normalize a heading into a stable key (case/space-insensitive) for matching across edits.
const headingKey = (heading = "") =>
  String(heading).trim().toUpperCase().replace(/\s+/g, " ");

const makeSceneId = (index, heading) => `scene:${index}:${headingKey(heading)}`;

/**
 * Derive the ordered list of scenes from the document text.
 * Each scene: { index, heading, sceneId, startLine, endLine } (1-based, inclusive line range).
 *
 * - Zero detected scenes → the WHOLE document is a single lockable unit (never an unhandled state).
 * - The first scene's range includes any frontmatter above the first slugline, so every line of
 *   the document maps to exactly one scene.
 */
export const getScenes = (text = "") => {
  const lines = String(text).split("\n");
  const lastLine = lines.length; // 1-based count

  const types = classifyText(text);
  const slugLines = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (types[i] === "scene") slugLines.push({ line: i + 1, heading: stripForceMarker(lines[i].trim()) });
  }

  // §1.2 — zero-scene case: the whole document is one lockable unit.
  if (slugLines.length === 0) {
    return [{
      index: 0,
      heading: "(whole document)",
      sceneId: DOC_SCENE_ID,
      startLine: 1,
      endLine: Math.max(1, lastLine),
    }];
  }

  return slugLines.map((slug, i) => {
    // Scene 0 absorbs any frontmatter above the first slugline so no line is orphaned.
    const startLine = i === 0 ? 1 : slug.line;
    const endLine = i + 1 < slugLines.length ? slugLines[i + 1].line - 1 : lastLine;
    return {
      index: i,
      heading: slug.heading,
      sceneId: makeSceneId(i, slug.heading),
      startLine,
      endLine: Math.max(startLine, endLine),
    };
  });
};

/**
 * Resolve which scene a given 1-based line number belongs to.
 * Returns the scene object, or the last scene as a safe fallback.
 */
export const sceneAtLine = (text = "", lineNumber = 1) => {
  const scenes = getScenes(text);
  const ln = Math.max(1, Number(lineNumber) || 1);
  for (const scene of scenes) {
    if (ln >= scene.startLine && ln <= scene.endLine) return scene;
  }
  return scenes[scenes.length - 1];
};

/** Convenience: the sceneId at a line (the value locks/presence are keyed by). */
export const sceneIdAtLine = (text = "", lineNumber = 1) => sceneAtLine(text, lineNumber).sceneId;

/** Look a scene up by id against the current document (re-derived live). */
export const findSceneById = (text = "", sceneId = "") =>
  getScenes(text).find((s) => s.sceneId === sceneId) || null;

export { headingKey, DOC_SCENE_ID };
