const SCENE_HEADING_PATTERN = /(^|[.!?]\s+|\n+)((?:\d+\s+)?(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)[^\n]*)/gim;
const TRANSITION_PATTERN = /(^|[.!?]\s+|\n+)((?:CUT TO:|FADE IN:|FADE OUT\.|SMASH CUT TO:|DISSOLVE TO:|MATCH CUT TO:|BACK TO SCENE:))/gim;
const SHOT_CUE_PATTERN = /(^|[.!?]\s+|\n+)((?:CLOSE ON:|ANGLE ON:|INSERT:|SUPER:|POV:))/gim;
const CHARACTER_CUE_PATTERN = /([.!?]\s+|\n+)([A-Z][A-Z0-9' .-]{1,30}(?:\s*\([^)]+\))?)(?=\s+[A-Za-z"\u201c\u201d])/g;
const SCENE_LINE_PATTERN = /^(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)/i;
const TRANSITION_LINE_PATTERN = /^(?:CUT TO:|FADE IN:|FADE OUT\.|SMASH CUT TO:|DISSOLVE TO:|MATCH CUT TO:|BACK TO SCENE:)\s*$/i;
const SHOT_LINE_PATTERN = /^(?:CLOSE ON:|ANGLE ON:|INSERT:|SUPER:|POV:|UNKNOWN MESSAGE:|FLASH CUTS:|BACK TO SCENE\.)/i;
const PARENTHETICAL_LINE_PATTERN = /^\([^)]+\)$/;
const INLINE_CHARACTER_CUE_PATTERN = /^([A-Z][A-Z0-9' .-]{1,30})(?:\s+(\([^)]+\)))?\s+([A-Za-z"\u2018\u2019\u201c\u201d].*)$/;

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

const looksLikeCharacterCue = (line = "") => {
  const trimmed = String(line || "").trim();
  if (!trimmed) return false;
  if (CHARACTER_CUE_EXCLUSIONS.has(trimmed)) return false;
  if (SCENE_LINE_PATTERN.test(trimmed) || TRANSITION_LINE_PATTERN.test(trimmed) || SHOT_LINE_PATTERN.test(trimmed)) {
    return false;
  }

  if (!/^[A-Z][A-Z0-9' .-]{1,30}(?:\s+\([^)]+\))?$/.test(trimmed)) return false;

  const bareCue = trimmed.replace(/\s+\([^)]+\)$/, "").trim();
  const words = bareCue.split(/\s+/).filter(Boolean);
  const hasParenthetical = /\([^)]+\)$/.test(trimmed);
  const hasContd = /\bCONT'?D\b/.test(trimmed);

  return hasParenthetical || hasContd || words.length === 1;
};

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
    const prefix = boundary.includes("\n") ? "\n\n" : `${boundary.trimEnd()}\n\n`;
    return `${prefix}${heading.trim()}`;
  });

  text = text.replace(/([^\n])\s+((?:\d+\s+)?(?:INT\.|EXT\.|INT\/EXT\.|EXT\/INT\.|I\/E\.|EST\.)[^\n]*)/g, "$1\n\n$2");
  text = text.replace(TRANSITION_PATTERN, (_match, boundary, transition) => {
    const prefix = boundary.includes("\n") ? "\n\n" : `${boundary.trimEnd()}\n\n`;
    return `${prefix}${transition.trim()}`;
  });
  text = text.replace(SHOT_CUE_PATTERN, (_match, boundary, cue) => {
    const prefix = boundary.includes("\n") ? "\n" : `${boundary.trimEnd()}\n`;
    return `${prefix}${cue.trim()}`;
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

export const parseScreenplayBlocks = (value = "") => {
  const text = formatScreenplayLikeText(value);
  if (!text) return [];

  const lines = text.split("\n");
  const blocks = [];
  let inDialogue = false;
  let encounteredScene = false;

  for (let index = 0; index < lines.length; index += 1) {
    let trimmed = lines[index].trim();

    if (!trimmed) {
      if (blocks.length && blocks[blocks.length - 1]?.type !== "spacer") {
        blocks.push({ type: "spacer", text: "" });
      }
      inDialogue = false;
      continue;
    }

    if (/^\d+$/.test(trimmed)) {
      continue;
    }

    if (/^(?:CUT|FADE|SMASH CUT|DISSOLVE|MATCH CUT)$/i.test(trimmed) && /^TO:$/i.test(lines[index + 1]?.trim() || "")) {
      trimmed = `${trimmed} TO:`;
      index += 1;
    }

    if (SCENE_LINE_PATTERN.test(trimmed) && !/\b(?:DAY|NIGHT|EVENING|MORNING|AFTERNOON|CONTINUOUS|LATER)\b/i.test(trimmed)) {
      const nextLine = lines[index + 1]?.trim() || "";
      if (
        nextLine &&
        !SCENE_LINE_PATTERN.test(nextLine) &&
        !TRANSITION_LINE_PATTERN.test(nextLine) &&
        !SHOT_LINE_PATTERN.test(nextLine) &&
        /^[A-Z0-9' .-]+$/.test(nextLine)
      ) {
        trimmed = `${trimmed} ${nextLine}`;
        index += 1;
      }
    }

    if (!encounteredScene && !SCENE_LINE_PATTERN.test(trimmed)) {
      blocks.push({ type: "frontmatter", text: trimmed });
      inDialogue = false;
      continue;
    }

    const inlineCueMatch = encounteredScene ? trimmed.match(INLINE_CHARACTER_CUE_PATTERN) : null;
    if (
      inlineCueMatch &&
      !CHARACTER_CUE_EXCLUSIONS.has(String(inlineCueMatch[1] || "").trim()) &&
      !cueStartsLikeAction(String(inlineCueMatch[1] || "").trim()) &&
      dialogueLooksNatural(String(inlineCueMatch[3] || "").trim()) &&
      !SCENE_LINE_PATTERN.test(trimmed) &&
      !SHOT_LINE_PATTERN.test(trimmed) &&
      !TRANSITION_LINE_PATTERN.test(trimmed)
    ) {
      const cue = String(inlineCueMatch[1] || "").trim();
      const parenthetical = String(inlineCueMatch[2] || "").trim();
      const dialogue = String(inlineCueMatch[3] || "").trim();

      if (looksLikeCharacterCue(`${cue}${parenthetical ? ` ${parenthetical}` : ""}`)) {
        blocks.push({ type: "character", text: cue });
        if (parenthetical) blocks.push({ type: "parenthetical", text: parenthetical });
        if (dialogue) blocks.push({ type: "dialogue", text: dialogue });
        inDialogue = true;
        continue;
      }

      blocks.push({ type: "action", text: trimmed });
      inDialogue = false;
      continue;
    }

    if (SCENE_LINE_PATTERN.test(trimmed)) {
      blocks.push({ type: "scene", text: trimmed });
      encounteredScene = true;
      inDialogue = false;
      continue;
    }

    if (TRANSITION_LINE_PATTERN.test(trimmed)) {
      blocks.push({ type: "transition", text: trimmed });
      inDialogue = false;
      continue;
    }

    if (SHOT_LINE_PATTERN.test(trimmed)) {
      blocks.push({ type: "shot", text: trimmed });
      inDialogue = false;
      continue;
    }

    if (PARENTHETICAL_LINE_PATTERN.test(trimmed)) {
      blocks.push({ type: "parenthetical", text: trimmed });
      inDialogue = true;
      continue;
    }

    if (looksLikeCharacterCue(trimmed)) {
      blocks.push({ type: "character", text: trimmed });
      inDialogue = true;
      continue;
    }

    if (
      inDialogue &&
      (
        cueStartsLikeAction(trimmed) ||
        (/^[A-Z][A-Z0-9' .-]+$/.test(trimmed) && trimmed.split(/\s+/).length > 1)
      )
    ) {
      blocks.push({ type: "action", text: trimmed });
      inDialogue = false;
      continue;
    }

    if (inDialogue) {
      blocks.push({ type: "dialogue", text: trimmed });
      continue;
    }

    blocks.push({ type: "action", text: trimmed });
  }

  while (blocks.length && blocks[blocks.length - 1]?.type === "spacer") {
    blocks.pop();
  }

  return blocks;
};
