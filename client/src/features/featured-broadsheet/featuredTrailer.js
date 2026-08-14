/*
 * featuredTrailer.js — what a trailer surface has to decide, on either platform.
 *
 * Extracted from TrailerModal when the native screen needed the same two
 * rules, so there is one definition rather than two that can drift:
 *
 *   1. Source preference and fallback. A project can carry an AI-generated
 *      trailer, an uploaded one, or both, and `trailerSource` says which to
 *      prefer. If the preferred file 404s the surface steps to the other
 *      before giving up.
 *   2. The narrated summary. When a project has no playable trailer at all,
 *      the page narrates its own metadata over the speech synthesis API. That
 *      is real shipped behaviour, so both platforms keep it.
 */
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { getContentTypeLabel } from "./featuredBroadsheet";

export const NARRATION_SECONDS = 30;

/** Playable sources, most-preferred first, deduped and resolved. */
export const resolveTrailerCandidates = (script) => {
  const ai = script?.trailerUrl || "";
  const uploaded = script?.uploadedTrailerUrl || "";
  const ordered = script?.trailerSource === "uploaded" ? [uploaded, ai] : [ai, uploaded];
  return [...new Set(ordered.filter(Boolean))].map((url) => resolveMediaUrl(url)).filter(Boolean);
};

/** The sentences the narrated summary reads. Never a field the project lacks. */
export const narrationLines = (script) => [
  script?.title,
  script?.genre ? `A ${script.genre} story` : null,
  script?.logline || script?.synopsis || script?.description || null,
  script?.pageCount ? `${script.pageCount} pages.` : null,
  "Available now on Ckript.",
].filter(Boolean);

export const canNarrate = () => typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Speak the summary. Returns a cancel function, because speech outlives the
 * component that started it unless it is explicitly cancelled — the original
 * bug this behaviour shipped with.
 */
export function speakNarration(script, { onEnd = null } = {}) {
  if (!canNarrate()) return () => {};
  const utterance = new SpeechSynthesisUtterance(narrationLines(script).join(". "));
  utterance.rate = 0.92;
  utterance.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((voice) => voice.lang === "en-US") || voices[0];
  if (preferred) utterance.voice = preferred;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
  return () => window.speechSynthesis.cancel();
}

export const trailerSubtitle = (script) => [
  script?.genre,
  script?.contentType ? getContentTypeLabel(script.contentType) : null,
].filter(Boolean).join(" · ");
