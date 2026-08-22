// The participant dashboard is an operational summary, not an entry export. Keep the projection
// beside its shaper so the route cannot accidentally return registration answers, payment records,
// external-registration evidence, the frozen screenplay body, or internal AI failures.
export const COMPETITION_DASHBOARD_ENTRY_FIELDS = [
  "_id",
  "eventId",
  "scriptId",
  "status",
  "createdAt",
  "submittedAt",
  "snapshot.title",
  "snapshot.wordCount",
  "snapshot.charCount",
  "snapshot.pageCount",
  "snapshot.sceneCount",
  "ai.logline",
  "ai.synopsis",
  "ai.evaluation",
  "ai.processedAt",
  "result.award",
  "result.specialTitle",
  "rewardsGranted.type",
  "rewardsGranted.at",
].join(" ");

const count = (value) => Math.max(0, Number(value) || 0);
const dateValue = (value) => value || null;

export function competitionDashboardEntry(entry = {}) {
  return {
    _id: entry._id,
    eventId: entry.eventId || "",
    scriptId: entry.scriptId || null,
    status: entry.status || "registered",
    createdAt: dateValue(entry.createdAt),
    submittedAt: dateValue(entry.submittedAt),
    snapshot: {
      title: entry.snapshot?.title || "",
      wordCount: count(entry.snapshot?.wordCount),
      charCount: count(entry.snapshot?.charCount),
      pageCount: count(entry.snapshot?.pageCount),
      sceneCount: count(entry.snapshot?.sceneCount),
    },
    ai: {
      logline: entry.ai?.logline || "",
      synopsis: entry.ai?.synopsis || "",
      evaluation: entry.ai?.evaluation || null,
      processedAt: dateValue(entry.ai?.processedAt),
    },
    result: {
      award: entry.result?.award || "none",
      specialTitle: entry.result?.specialTitle || "",
    },
    rewardsGranted: (Array.isArray(entry.rewardsGranted) ? entry.rewardsGranted : [])
      .map((reward) => ({ type: String(reward?.type || "").trim(), at: dateValue(reward?.at) }))
      .filter((reward) => reward.type),
  };
}
