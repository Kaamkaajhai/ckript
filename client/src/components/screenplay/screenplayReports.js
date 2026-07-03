// Scene & Character reports (Phase 4 §3). Auto-generated, read-only summaries derived from the
// SAME sources the rest of the editor uses — getScenes() for scene identity/line ranges and
// classifyText() (the one classifier) for the classified element stream — so the numbers stay
// consistent with the editor, viewer, navigator, and export. No separate parser.

import { extractScenes, classifyText } from "./screenplayMode";
import { paginate } from "./paginate";

const wordCount = (line = "") => {
  const t = line.trim();
  return t ? t.split(/\s+/).length : 0;
};

// A character cue → its bare name (drop a leading "@" force marker and "(CONT'D)"/"(V.O.)"/etc.,
// normalize case+spacing) so the same speaker isn't split across rows.
const cueName = (text = "") =>
  String(text).replace(/^@\s*/, "").replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim().toUpperCase();

/**
 * Scene report — one row per scene: number, heading, page, and length.
 * `page` is LINE-based (industry standard, matches the exported PDF via paginate.js): the page the
 * scene heading's line falls on. `line` is the heading's 1-based line for scroll-to.
 */
export const buildSceneReport = (text = "") => {
  const lines = String(text).split("\n");
  const heads = extractScenes(text); // [{ line, text }] — the navigator's exact heading lines
  const { pageStarts } = paginate(text); // 0-based line index where each page begins
  const pageOfLine = (lineIdx0) => {
    let p = 1;
    for (let k = 0; k < pageStarts.length; k += 1) if (lineIdx0 >= pageStarts[k]) p = k + 1;
    return p;
  };

  return heads.map((h, i) => {
    const start = h.line; // 1-based heading line
    const end = i + 1 < heads.length ? heads[i + 1].line - 1 : lines.length; // inclusive
    const slice = lines.slice(start - 1, end);
    const elements = slice.filter((l) => l.trim()).length; // non-blank lines = elements
    const words = slice.reduce((n, l) => n + wordCount(l), 0);
    const page = pageOfLine(start - 1);
    return {
      number: i + 1,
      heading: h.text,
      line: start,
      page,
      lineLength: end - start + 1,
      elements,
      words,
    };
  });
};

/**
 * Character report — one row per speaking character: dialogue blocks (lines spoken), number of
 * scenes they appear in, and first/last scene number.
 *
 * Classification comes from classifyText() — the SAME per-line heuristic the editor renders
 * with — so a cue the writer sees on the page (e.g. multi-word "DETECTIVE RAO") is never silently
 * dropped from the report. A cue is only counted as a speaker once a dialogue line actually
 * follows it (the inDialogue guard): that keeps a stray all-caps action line ("THE BUILDING
 * EXPLODES") from being miscounted as a character.
 */
export const buildCharacterReport = (text = "") => {
  const lines = String(text).split("\n");
  const types = classifyText(text);
  const map = new Map(); // name -> { name, lines, scenes:Set, first, last }
  let sceneNo = 0;
  let pending = null; // { name, scene } — a cue awaiting a confirming dialogue line
  let speaker = null; // confirmed current speaker (dialogue is flowing)

  const record = (name, scene) => {
    const rec = map.get(name) || { name, lines: 0, scenes: new Set(), first: scene, last: scene };
    rec.scenes.add(scene);
    rec.last = scene;
    map.set(name, rec);
    return rec;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const type = types[i];
    const raw = lines[i].trim();
    if (type === "scene") { sceneNo += 1; pending = null; speaker = null; continue; }
    if (type === "character" || type === "dual") {
      pending = sceneNo > 0 ? { name: cueName(raw), scene: sceneNo } : null;
      speaker = null;
      continue;
    }
    if (type === "parenthetical") continue; // stays attached to the (pending/current) speaker
    if (type === "dialogue" || type === "lyrics") {
      if (pending) { speaker = pending.name; record(speaker, pending.scene); pending = null; }
      if (speaker) map.get(speaker).lines += 1;
      continue;
    }
    // action / transition / shot / blank / sequence / act end the current speech.
    pending = null;
    speaker = null;
  }

  return [...map.values()]
    .map((r) => ({ name: r.name, lines: r.lines, scenes: r.scenes.size, first: r.first, last: r.last }))
    .sort((a, b) => b.lines - a.lines || a.name.localeCompare(b.name));
};
