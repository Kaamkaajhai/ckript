// Final Draft (.fdx) import/export — client-side, so element types come from the editor's ONE
// classifier (classifyText in classify.js), never a second parser written here (§0). FDX is XML;
// we use fast-xml-parser in preserveOrder mode on both sides so document order (and interleaved
// <DualDialogue> blocks) survive, and so escaped characters / nested <Text> runs are handled by a
// real parser rather than hand-rolled string work.

import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { classifyText } from "./classify";

// our element type → FDX Paragraph Type. (dual is handled specially — it becomes a Character
// paragraph inside a <DualDialogue> group; lyrics strips the ~; sequence has no FDX equivalent so
// it rides through as Action text, keeping its "# " marker so the classifier re-reads it.)
const ELEMENT_TO_FDX = {
  scene: "Scene Heading",
  action: "Action",
  character: "Character",
  dialogue: "Dialogue",
  parenthetical: "Parenthetical",
  transition: "Transition",
  shot: "Shot",
  act: "New Act",
  endact: "End of Act",
  sequence: "Action",
};

// FDX Paragraph Type → our element. Anything not here is unknown → falls back to Action and is
// reported (never dropped). "General" is FDX's generic body type.
const FDX_TO_ELEMENT = {
  "Scene Heading": "scene",
  Action: "action",
  General: "action",
  Character: "character",
  Dialogue: "dialogue",
  Parenthetical: "parenthetical",
  Transition: "transition",
  Shot: "shot",
  Lyric: "lyrics",
  Lyrics: "lyrics",
  "New Act": "act",
  "End of Act": "endact",
};

const XML_OPTS = {
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
};

const stripCaret = (text = "") => String(text).replace(/\s*\^\s*$/, "").trim();

// ── Fountain → FDX ───────────────────────────────────────────────────────────
const textNode = (s) => ({ "#text": s });
const paraNode = (type, text) => ({ Paragraph: [{ Text: [textNode(text)] }], ":@": { "@_Type": type } });

const specToPara = (spec) => {
  if (spec.type === "dual") return paraNode("Character", stripCaret(spec.text));
  if (spec.type === "lyrics") return paraNode("Lyric", spec.text.replace(/^~\s*/, ""));
  return paraNode(ELEMENT_TO_FDX[spec.type] || "Action", spec.text);
};

export const fountainToFdx = (fountainText = "") => {
  const lines = String(fountainText).split("\n");
  const types = classifyText(fountainText);

  // Non-blank lines → element specs (same classifier the editor renders with).
  const specs = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (types[i] === "blank") continue;
    specs.push({ type: types[i], text: lines[i].trim() });
  }

  // Group a character cue with the parenthetical/dialogue lines under it, so a dual cue (^) can be
  // paired with the speech immediately before it into a single <DualDialogue>.
  const units = [];
  let cur = null;
  for (const s of specs) {
    if (s.type === "character" || s.type === "dual") { cur = { lead: s, items: [s] }; units.push(cur); }
    else if ((s.type === "parenthetical" || s.type === "dialogue") && cur) { cur.items.push(s); }
    else { cur = null; units.push({ single: s }); }
  }

  const content = [];
  for (let i = 0; i < units.length; ) {
    const u = units[i];
    const next = units[i + 1];
    if (u.items && next && next.items && next.lead.type === "dual") {
      // first speaker + the ^-marked second speaker → one simultaneous pair
      content.push({ DualDialogue: [...u.items, ...next.items].map(specToPara) });
      i += 2;
    } else if (u.items) {
      for (const it of u.items) content.push(specToPara(it));
      i += 1;
    } else {
      content.push(specToPara(u.single));
      i += 1;
    }
  }

  const tree = [{
    FinalDraft: [{ Content: content }],
    ":@": { "@_DocumentType": "Script", "@_Template": "No", "@_Version": "1" },
  }];

  const builder = new XMLBuilder({ ...XML_OPTS, format: true, suppressEmptyNode: true });
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${builder.build(tree)}`;
};

// ── FDX → Fountain ───────────────────────────────────────────────────────────
const tagOf = (node) => Object.keys(node).find((k) => k !== ":@");
const childrenOf = (node) => node[tagOf(node)] || [];

// A <Text> body may be a single value, several styled runs, or nested — flatten to one string.
const flattenText = (nodes) => {
  if (!Array.isArray(nodes)) return "";
  let out = "";
  for (const n of nodes) {
    if (n == null) continue;
    if (Object.prototype.hasOwnProperty.call(n, "#text")) { out += n["#text"]; continue; }
    for (const k of Object.keys(n)) {
      if (k === ":@") continue;
      if (Array.isArray(n[k])) out += flattenText(n[k]);
    }
  }
  return out;
};

export const fdxToFountain = (xml = "") => {
  let parsed;
  try {
    parsed = new XMLParser({ ...XML_OPTS, trimValues: false }).parse(xml);
  } catch {
    const err = new Error("File is not valid Final Draft XML.");
    err.statusCode = 400;
    throw err;
  }

  const finalDraft = (Array.isArray(parsed) ? parsed : []).find((n) => tagOf(n) === "FinalDraft");
  const content = finalDraft && childrenOf(finalDraft).find((n) => tagOf(n) === "Content");
  if (!content) {
    const err = new Error("No screenplay content found in this Final Draft file.");
    err.statusCode = 400;
    throw err;
  }

  const lines = [];
  const unmapped = new Set();
  const pushBlank = () => { if (lines.length && lines[lines.length - 1] !== "") lines.push(""); };

  // Emit one paragraph as Fountain line(s) shaped so the editor's classifier re-reads the same
  // element. dualCue=true appends the Fountain ^ to the second speaker of a dual pair.
  const emit = (typeAttr, rawText, { dualCue = false } = {}) => {
    const text = String(rawText).replace(/\s+/g, " ").trim();
    if (!text) return;
    const el = FDX_TO_ELEMENT[typeAttr];
    if (!el && typeAttr) unmapped.add(typeAttr);
    switch (el || "action") {
      case "scene":
      case "transition":
      case "act":
      case "endact":
        pushBlank(); lines.push(text.toUpperCase()); lines.push(""); break;
      case "shot":
        pushBlank(); lines.push(text); lines.push(""); break;
      case "character":
        pushBlank(); lines.push(text.toUpperCase() + (dualCue ? " ^" : "")); break; // dialogue hugs below
      case "parenthetical":
        lines.push(/^\(.*\)$/.test(text) ? text : `(${text.replace(/^\(|\)$/g, "")})`); break;
      case "dialogue":
        lines.push(text); lines.push(""); break;
      case "lyrics":
        lines.push(/^~/.test(text) ? text : `~ ${text}`); lines.push(""); break;
      case "action":
      default:
        pushBlank(); lines.push(text); lines.push(""); break;
    }
  };

  for (const child of childrenOf(content)) {
    const tag = tagOf(child);
    if (tag === "Paragraph") {
      emit(child[":@"]?.["@_Type"] || "", flattenText(childrenOf(child)));
    } else if (tag === "DualDialogue") {
      let charSeen = 0;
      for (const p of childrenOf(child)) {
        if (tagOf(p) !== "Paragraph") continue;
        const typeAttr = p[":@"]?.["@_Type"] || "";
        const isChar = FDX_TO_ELEMENT[typeAttr] === "character";
        if (isChar) charSeen += 1;
        emit(typeAttr, flattenText(childrenOf(p)), { dualCue: isChar && charSeen >= 2 });
      }
    }
    // other Content children (e.g. nothing in practice) are ignored
  }

  const fountain = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { fountain, unmapped: [...unmapped] };
};
