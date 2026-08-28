import { stripTitlePage } from "./classify.js";

/**
 * The only shape a judge is ever shown for an entry.
 *
 * Blind judging is the point of the panel, and it is a property that has to hold at ONE place or it
 * does not hold at all. A projection chosen per endpoint drifts: someone adds a `.populate("userId")`
 * to make a list page convenient and the guarantee is gone with nothing failing. So every
 * judge-facing response goes through this function, and its test asserts the property against a
 * fully-populated entry rather than trusting the field list below to be complete.
 *
 * This BUILDS the response rather than deleting from the entry, and never spreads its input.
 * Deletion is the wrong shape for a privacy boundary: a field added to CompetitionEntry later would
 * flow straight through a blacklist, whereas an allow-list ignores anything it was not told about.
 *
 * What a judge gets, and why:
 *   eventId    the entry's public code (CGSC-XXXXXXXX) — already unique, already how the admin table
 *              labels entries, and carries no identity
 *   title      the writer's chosen title. The user asked for this to stay visible; it is context a
 *              judge legitimately needs
 *   body       the screenplay, from the frozen snapshot, with any title page stripped (see below)
 *   counts     pages/words/scenes, so a judge can pace their reading
 *
 * Absent on purpose: `userId` (the only identity link on the entry), `payment`, `registration`
 * (country, language, experience level), `ai` (an AI score would anchor the judge's own), `result`,
 * `externalRegistration`, and `snapshot.logline` / `snapshot.synopsis` — writer-authored free text
 * where a logline reading "by Jane Doe" would defeat the entire feature.
 *
 * Also absent: `submittedAt` and `createdAt`. Submission ORDER is a weak identity signal (it maps to
 * the registration list an admin can see) and has no judging value whatsoever, so it costs nothing
 * to withhold.
 */

/** Documentation of the contract; the builder below is the enforcement, and the test is the proof. */
export const JUDGE_ENTRY_FIELDS = Object.freeze([
  "id",
  "eventId",
  "title",
  "body",
  "pageCount",
  "wordCount",
  "sceneCount",
]);

const text = (value) => (typeof value === "string" ? value : "");
const count = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Remove a Fountain title-page block the writer typed INTO the script body.
 *
 * The STRUCTURED title page is already gone by construction: `Script.titlePage` is a Map holding the
 * author's name and contact details, and `submitCompetitionEntry` never copies it into the snapshot.
 * It is not in this data at all, so there is nothing here to strip.
 *
 * But a writer can type one. `classify.js` treats a leading "Title:/Credit:/Author:/Source:/Draft
 * date:" block as a title page, and anything the editor did not lift into the structured field lands
 * in `snapshot.fountainContent` verbatim — carrying exactly the name we are trying to withhold.
 *
 * `stripTitlePage` is the SAME function the editor and the PDF exporter use, which is the reason to
 * reuse it rather than write a regex here: the judge's view then cannot drift from what the rest of
 * the platform considers a title page. It is a no-op when there is no title page — `hasTitlePage`
 * requires the first non-blank line to be one of five known keys, so "FADE IN:" and "INT. ROOM - DAY"
 * cannot trigger it.
 *
 * Known edge, accepted: a title page written with no blank line after it makes `stripTitlePage`
 * consume lines up to the first blank, which can eat an opening scene. That is pre-existing shared
 * behaviour and matches the exporter; diverging here to be clever would mean the judge reads a
 * different document from the one the PDF shows.
 */
const scrubBody = (value) => stripTitlePage(text(value));

/**
 * @param {object} entry a CompetitionEntry document or lean object
 * @returns {object} the anonymised view, built field by field
 */
export const toJudgeEntryView = (entry = {}) => {
  const snapshot = entry.snapshot || {};
  return {
    id: String(entry._id || ""),
    eventId: text(entry.eventId),
    title: text(snapshot.title),
    // fountain is the authored form; textContent is the fallback for entries written before the
    // editor stored fountain. Same precedence the admin entry modal already uses. Both are scrubbed —
    // whichever one wins, it is the one the judge reads.
    body: scrubBody(snapshot.fountainContent) || scrubBody(snapshot.textContent),
    pageCount: count(snapshot.pageCount),
    wordCount: count(snapshot.wordCount),
    sceneCount: count(snapshot.sceneCount),
  };
};

/** Statuses a judge may see. An entry still being written is not a submission. */
export const JUDGEABLE_STATUSES = Object.freeze(["submitted", "ai_processed", "judged"]);

export default toJudgeEntryView;
