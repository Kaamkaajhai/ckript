import { createRequire } from "module";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink, writeFile } from "fs/promises";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WINDOWS_OCR_SCRIPT_PATH = path.resolve(__dirname, "../scripts/extract_pdf_text_with_windows_ocr.ps1");

export const normalizeExtractedPdfText = (value = "") =>
  String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n");

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
const dialogueLooksNatural = (value = "") => /^[\"'\u2018\u2019\u201c\u201d]?(?:[A-Z][a-z]|[a-z])/.test(String(value || "").trim());
const cueStartsLikeAction = (value = "") => /^(?:A|AN|THE|HER|HIS|THEIR|ITS)\b/.test(String(value || "").trim());

export const formatScreenplayLikeText = (value = "") => {
  let text = normalizeExtractedPdfText(value);
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

export const extractPdfTextWithPdftotext = async (buffer) => {
  const tempId = crypto.randomUUID();
  const tempPdfPath = path.join(os.tmpdir(), `ckript-pdf-${tempId}.pdf`);
  const tempTxtPath = path.join(os.tmpdir(), `ckript-pdf-${tempId}.txt`);

  try {
    await writeFile(tempPdfPath, buffer);
    await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", tempPdfPath, tempTxtPath]);
    const text = await readFile(tempTxtPath, "utf8");
    return normalizeExtractedPdfText(text);
  } finally {
    await Promise.allSettled([
      unlink(tempPdfPath),
      unlink(tempTxtPath),
    ]);
  }
};

const extractPdfTextWithWindowsOcr = async (buffer) => {
  if (process.platform !== "win32") return "";

  const tempId = crypto.randomUUID();
  const tempPdfPath = path.join(os.tmpdir(), `ckript-pdf-${tempId}.pdf`);
  const tempTxtPath = path.join(os.tmpdir(), `ckript-pdf-${tempId}.txt`);

  try {
    await writeFile(tempPdfPath, buffer);
    await execFileAsync("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      WINDOWS_OCR_SCRIPT_PATH,
      "-InputPdf",
      tempPdfPath,
      "-OutputTxt",
      tempTxtPath,
    ], {
      timeout: 10 * 60 * 1000,
      windowsHide: true,
    });
    const text = await readFile(tempTxtPath, "utf8");
    return normalizeExtractedPdfText(text);
  } finally {
    await Promise.allSettled([
      unlink(tempPdfPath),
      unlink(tempTxtPath),
    ]);
  }
};

export const extractTextFromPdfBuffer = async (buffer) => {
  let text = "";
  let numItems = 0;
  let strategy = "none";

  try {
    const data = await pdfParse(buffer);
    text = normalizeExtractedPdfText(data?.text || "");
    numItems = Number(data?.numpages) || 0;
    strategy = text.trim() ? "pdf-parse" : "pdf-parse-empty";
  } catch (parseError) {
    console.warn("[extractTextFromPdfBuffer] pdf-parse failed:", parseError?.message || parseError);
  }

  if (!text.trim()) {
    try {
      text = await extractPdfTextWithPdftotext(buffer);
      if (text.trim()) strategy = "pdftotext";
    } catch (fallbackError) {
      console.warn("[extractTextFromPdfBuffer] pdftotext failed:", fallbackError?.message || fallbackError);
    }
  }

  if (!text.trim()) {
    try {
      text = await extractPdfTextWithWindowsOcr(buffer);
      if (text.trim()) strategy = "windows-ocr";
    } catch (ocrError) {
      console.warn("[extractTextFromPdfBuffer] Windows OCR failed:", ocrError?.message || ocrError);
    }
  }

  return {
    text: formatScreenplayLikeText(text),
    numItems,
    strategy,
  };
};

export const extractTextFromPdfUrl = async (url = "") => {
  const remoteUrl = String(url || "").trim();
  if (!remoteUrl) {
    return { text: "", numItems: 0, strategy: "missing-url" };
  }

  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Failed to download PDF for extraction (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return extractTextFromPdfBuffer(buffer);
};
