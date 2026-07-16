const SCENE_HEADING_PATTERN = /(^|[.!?]\s+|\n+)((?:\d+\s+)?(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)[^\n]*)/gim;
const TRANSITION_PATTERN = /(^|[.!?]\s+|\n+)((?:CUT TO:|FADE IN:|FADE OUT\.|SMASH CUT TO:|DISSOLVE TO:|MATCH CUT TO:|BACK TO SCENE:))/gim;
const SHOT_CUE_PATTERN = /(^|[.!?]\s+|\n+)((?:CLOSE ON:|ANGLE ON:|INSERT:|SUPER:|POV:))/gim;
const CHARACTER_CUE_PATTERN = /([.!?]\s+|\n+)([A-Z][A-Z0-9' .-]{1,30}(?:\s*\([^)]+\))?)(?=\s+[A-Za-z"\u201c\u201d])/g;

const CHARACTER_CUE_EXCLUSIONS = new Set([
  "INT.",
  "EXT.",
  "INT/EXT.",
  "EXT/INT.",
  "I/E.",
  "EST.",
  "CUT TO:",
  "FADE IN:",
  "FADE OUT.",
  "SMASH CUT TO:",
  "DISSOLVE TO:",
  "MATCH CUT TO:",
  "BACK TO SCENE:",
  "CLOSE ON:",
  "ANGLE ON:",
  "INSERT:",
  "SUPER:",
  "POV:",
  "UNKNOWN MESSAGE:",
  "FLASH CUTS:",
  "BACK TO SCENE.",
]);

const dialogueLooksNatural = (value = "") => /^["'\u2018\u2019\u201c\u201d]?(?:[A-Z][a-z]|[a-z])/.test(String(value || "").trim());
const cueStartsLikeAction = (value = "") => /^(?:A|AN|THE|HER|HIS|THEIR|ITS)\b/.test(String(value || "").trim());

// NOTE: This module is now a FORMATTER only. The old parseScreenplayBlocks/looksLikeCharacterCue
// classifier was retired \u2014 element classification lives solely in screenplay/classify.js (the one
// classifier the editor, viewer, reports, and FDX share). formatScreenplayLikeText below just
// normalizes raw/imported text into clean Fountain; classify.js then types it.

export const formatScreenplayLikeText = (value = "") => {
  let text = String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n");

  if (!text.trim()) return "";

  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ");

  text = text
    .replace(/^CUT\s*\n\s*TO:$/gim, "CUT TO:")
    .replace(/^FADE\s*\n\s*IN:$/gim, "FADE IN:")
    .replace(/^FADE\s*\n\s*OUT\.$/gim, "FADE OUT.")
    .replace(/^SMASH\s*\n\s*CUT\s*\n\s*TO:$/gim, "SMASH CUT TO:")
    .replace(/^DISSOLVE\s*\n\s*TO:$/gim, "DISSOLVE TO:")
    .replace(/^MATCH\s*\n\s*CUT\s*\n\s*TO:$/gim, "MATCH CUT TO:");

  text = text.replace(SCENE_HEADING_PATTERN, (_match, boundary, heading) => {
    const punct = boundary.replace(/\s+/g, ""); // keep sentence punctuation, drop whitespace
    return `${punct}\n\n${heading.trim()}`;
  });

  text = text.replace(/([^\n])\s+((?:\d+\s+)?(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)[^\n]*)/g, "$1\n\n$2");
  text = text.replace(TRANSITION_PATTERN, (_match, boundary, transition) => {
    const punct = boundary.replace(/\s+/g, "");
    return `${punct}\n\n${transition.trim()}`;
  });
  text = text.replace(SHOT_CUE_PATTERN, (_match, boundary, cue) => {
    const punct = boundary.replace(/\s+/g, "");
    return `${punct}\n${cue.trim()}`;
  });
  text = text.replace(
    /((?:\d+\s+)?(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)[^\n]*?\b(?:DAY|NIGHT|EVENING|MORNING|AFTERNOON|CONTINUOUS|LATER))\s+(?=[A-Z][a-z])/g,
    "$1\n"
  );
  text = text.replace(
    /((?:\d+\s+)?(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)[^\n]*?\b(?:DAY|NIGHT|EVENING|MORNING|AFTERNOON|CONTINUOUS|LATER))\s+(?=[A-Z])/g,
    "$1\n"
  );
  text = text.replace(/\n(\d+)\s+\n\n((?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.))/g, "\n$1 $2");
  text = text.replace(/(CUT TO:|FADE IN:|FADE OUT\.|SMASH CUT TO:|DISSOLVE TO:|MATCH CUT TO:)\s+(\d+)\s+/g, "$1\n\n$2\n");
  text = text.replace(/\n\d+\s*\n/g, "\n");
  text = text.replace(/^\d+\s+(?=(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.))/gim, "");
  text = text.replace(/^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)\s*\n([A-Z0-9' .-]+(?:DAY|NIGHT|EVENING|MORNING|AFTERNOON|CONTINUOUS|LATER))$/gim, "$1 $2");
  text = text.replace(/^(INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)\s*\n([A-Z0-9' .-]+)$/gim, "$1 $2");
  text = text.replace(
    /^((?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)[^\n]*?)\n([A-Z0-9' .-]+(?:DAY|NIGHT|EVENING|MORNING|AFTERNOON|CONTINUOUS|LATER))$/gim,
    "$1 $2"
  );
  text = text.replace(/^([A-Z][A-Z0-9' .-]{1,30})(\s+\([^)]+\))?\s+([A-Za-z"\u2018\u2019\u201c\u201d].*)$/gm, (match, cue, parenthetical = "", dialogue = "") => {
    const cleanedCue = String(cue || "").trim();
    if (CHARACTER_CUE_EXCLUSIONS.has(cleanedCue) || cueStartsLikeAction(cleanedCue) || !dialogueLooksNatural(dialogue)) return match;
    return `${cleanedCue}${parenthetical || ""}\n${String(dialogue || "").trim()}`;
  });

  text = text.replace(CHARACTER_CUE_PATTERN, (_match, boundary, cue) => {
    const cleanedCue = cue.trim();
    const looksLikeHeading =
      /^(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)/.test(cleanedCue) ||
      /^(?:CUT TO:|FADE IN:|FADE OUT\.|SMASH CUT TO:|DISSOLVE TO:|MATCH CUT TO:|BACK TO SCENE:)$/.test(cleanedCue);

    if (looksLikeHeading) return `${boundary}${cleanedCue}`;
    return `${boundary.trimEnd()}\n${cleanedCue}`;
  });

  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2}([A-Z][A-Z0-9' .-]{1,30}(?:\s*\([^)]+\))?)\n{2}/g, "\n$1\n")
    .trim();
};
