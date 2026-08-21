/*
 * The submission operation shared by desktop and native mobile chrome.
 *
 * Submission is a one-way door: the server snapshots the stored script and
 * locks it. UI components may present that decision differently, but they must
 * never drift on the ordering of "flush latest keystrokes, then submit" or on
 * the confirmation payload the server verifies.
 */

export const SUBMITTED_ENTRY_STATUSES = Object.freeze([
  "submitted",
  "ai_processed",
  "judged",
]);

export const DRAFT_FLUSH_ERROR = "competition-draft-flush-failed";

export const isCompetitionEntrySubmitted = (entry) => (
  SUBMITTED_ENTRY_STATUSES.includes(entry?.status)
);

export async function submitCompetitionEntry({ apiClient, competitionId, flushDraft }) {
  if (flushDraft) {
    let flushed;
    try {
      flushed = await flushDraft();
    } catch {
      flushed = false;
    }

    // The create-project save contract returns false when the server is not
    // holding the current editor state. Older callers return nothing, which is
    // intentionally still accepted for backwards compatibility.
    if (flushed === false) {
      const error = new Error("Could not save your latest changes. Check your connection and try again.");
      error.code = DRAFT_FLUSH_ERROR;
      throw error;
    }
  }

  const { data } = await apiClient.post(`/competitions/${competitionId}/submit`, {
    confirmOriginal: true,
    confirmFinal: true,
  });
  return data;
}

export function competitionSubmissionErrorMessage(error) {
  if (error?.code === DRAFT_FLUSH_ERROR) return error.message;
  return error?.response?.data?.message || "Submission failed. Please try again.";
}
