import CompetitionEntry from "../models/CompetitionEntry.js";
import { runProjectMetadataGeneration, runScriptScoreFromText } from "./aiController.js";

// A claimed run older than this is assumed dead (process restart, hung request) and may be retaken.
const STALE_RUN_MS = 15 * 60_000;

/**
 * Generate a submitted entry's story materials and evaluation.
 *
 * Called fire-and-forget from submit, and again by the admin "Retry AI" action — so it must be safe
 * to run twice. Two rules make that true:
 *   • an entry that already has `ai.processedAt` is skipped outright,
 *   • the writer's standing is never harmed by a failure — the entry stays `submitted`, the error is
 *     recorded for the admin, and results can still be declared without AI ever succeeding.
 *
 * It reads the frozen SNAPSHOT, never the live script, so a later edit (or a restored draft) cannot
 * change what was judged.
 */
export const runEntryAIProcessing = async (entryId) => {
  const entry = await CompetitionEntry.findById(entryId);
  if (!entry) return null;
  if (entry.ai?.processedAt) return entry;              // already done — retry is a no-op
  if (!["submitted", "ai_processed"].includes(entry.status)) return entry;

  // Claim the work atomically. Submit fires this and-forget, and an admin can hit "Retry AI" at the
  // same time; without a claim both runs call the model, so the entry is billed twice and the writer
  // gets duplicate notifications. Whoever sets startedAt from null wins; everyone else backs off.
  const claim = await CompetitionEntry.findOneAndUpdate(
    {
      _id: entry._id,
      "ai.processedAt": null,
      $or: [
        { "ai.startedAt": null },
        { "ai.startedAt": { $exists: false } },
        // A run that died mid-flight must not wedge the entry forever.
        { "ai.startedAt": { $lt: new Date(Date.now() - STALE_RUN_MS) } },
      ],
    },
    { $set: { "ai.startedAt": new Date() } },
    { new: true },
  );
  if (!claim) return entry;   // another run holds it

  const source = entry.snapshot?.fountainContent || entry.snapshot?.textContent || "";
  if (!source.trim()) {
    entry.ai.error = "No submitted content to analyse.";
    await entry.save();
    return entry;
  }

  // Each half is attempted independently: a model hiccup on the evaluation should not cost the
  // writer their logline and synopsis.
  const errors = [];

  // On a retry, don't pay for work that already succeeded. (runScriptScoreGeneration self-skips the
  // same way when a score is already stored.)
  const needsMetadata = !entry.ai.logline || !entry.ai.synopsis;
  if (needsMetadata) {
    try {
      const meta = await runProjectMetadataGeneration({
        text: source,
        title: entry.snapshot?.title || "",
        userId: entry.userId,
        fields: ["logline", "synopsis"],
      });
      if (meta.usedFallback) {
        errors.push("Story materials: the AI service was unavailable.");
      } else {
        entry.ai.logline = meta.logline || "";
        entry.ai.synopsis = meta.synopsis || "";
      }
    } catch (error) {
      errors.push(`Story materials: ${error.message}`);
    }
  }

  if (!entry.ai.evaluation) {
    try {
      // Scored from the SNAPSHOT, never the live Script. Going through the script-based generator
      // would have judged whatever the writer's document says now, and — because that generator
      // short-circuits when a score already exists — would have silently handed the competition a
      // stale score from a draft evaluated before submission.
      const score = await runScriptScoreFromText({
        text: source,
        meta: {
          title: entry.snapshot?.title,
          pageCount: entry.snapshot?.pageCount,
          logline: entry.ai.logline,
        },
      });
      if (score && Number(score.overall || 0) > 0) {
        entry.ai.evaluation = score;
        // A heuristic fallback is not a real evaluation; record it so the admin can retry.
        if (score.usedFallback) errors.push("Evaluation: the AI service was unavailable, so a fallback score was used.");
      } else {
        errors.push("Evaluation: the AI returned no usable score.");
      }
    } catch (error) {
      errors.push(`Evaluation: ${error.message}`);
    }
  }

  // Write ONLY the ai fields, and never touch `status` if the entry has moved on. This function holds
  // an in-memory document loaded minutes ago; a model call can outlive a declare, and `entry.save()`
  // would then write the whole stale document back — reverting a `judged` entry to `ai_processed` and
  // silently dropping it out of the public competition history.
  const persist = async (fields) => {
    await CompetitionEntry.updateOne({ _id: entry._id }, { $set: fields });
    return CompetitionEntry.findById(entry._id);
  };

  if (errors.length) {
    // Partial success still counts as processed only if BOTH halves landed; otherwise the admin gets
    // a Retry button and the entry stays `submitted`.
    return persist({
      "ai.error": errors.join(" "),
      "ai.logline": entry.ai.logline || "",
      "ai.synopsis": entry.ai.synopsis || "",
      "ai.evaluation": entry.ai.evaluation || null,
      "ai.startedAt": null,          // release the claim so a retry can pick it up
    });
  }

  const fields = {
    "ai.error": "",
    "ai.logline": entry.ai.logline || "",
    "ai.synopsis": entry.ai.synopsis || "",
    "ai.evaluation": entry.ai.evaluation || null,
    "ai.processedAt": new Date(),
  };
  // Only advance a still-unjudged entry. Results declared while the model was running win.
  const advanced = await CompetitionEntry.findOneAndUpdate(
    { _id: entry._id, status: { $in: ["submitted", "ai_processed"] } },
    { $set: { ...fields, status: "ai_processed" } },
    { new: true },
  );
  return advanced || persist(fields);
};

export default runEntryAIProcessing;
