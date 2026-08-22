// The owner-facing `/competitions/mine` list is a status index, not an entry export. Keep this
// projection beside its shaper so adding a card field is deliberate and cannot accidentally pull a
// complete screenplay, payment reference, registration answer, or AI evaluation into every hub load.
export const COMPETITION_ENTRY_SUMMARY_FIELDS = [
  "_id",
  "eventId",
  "status",
  "createdAt",
  "submittedAt",
  "snapshot.title",
  "snapshot.pageCount",
  "snapshot.wordCount",
  "ai.processedAt",
  "result.award",
  "result.specialTitle",
  "rewardsGranted.type",
].join(" ");

const dateValue = (value) => value || null;

export function competitionEntrySummary(entry = {}) {
  return {
    _id: entry._id,
    eventId: entry.eventId || "",
    status: entry.status || "registered",
    createdAt: dateValue(entry.createdAt),
    submittedAt: dateValue(entry.submittedAt),
    snapshot: {
      title: entry.snapshot?.title || "",
      pageCount: Math.max(0, Number(entry.snapshot?.pageCount) || 0),
      wordCount: Math.max(0, Number(entry.snapshot?.wordCount) || 0),
    },
    ai: { processedAt: dateValue(entry.ai?.processedAt) },
    result: {
      award: entry.result?.award || "none",
      specialTitle: entry.result?.specialTitle || "",
    },
    rewardsGranted: (Array.isArray(entry.rewardsGranted) ? entry.rewardsGranted : [])
      .map((reward) => ({ type: String(reward?.type || "").trim() }))
      .filter((reward) => reward.type),
  };
}
