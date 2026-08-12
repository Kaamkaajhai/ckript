import { summariseDiff, timeAgo } from "../../../components/screenplay/useVersionHistory";

/*
 * Ckript Mobile — version history's rows and rules (decision D19).
 *
 * Pure. The interesting decision here is `describeRestore`, which is the
 * mobile answer to a desktop control that fires immediately.
 */

/** One row per saved version, with the label desktop falls back to. */
export const buildVersionRows = (versions = [], { restoringId = null } = {}) =>
  (Array.isArray(versions) ? versions : []).map((version) => ({
    id: version._id,
    // Desktop's fallback chain, kept: an auto snapshot and an unlabelled manual
    // save are different things and a writer scanning a list needs to see which.
    title: version.label || (version.auto ? "Auto snapshot" : "Untitled version"),
    when: version.createdAt ? timeAgo(version.createdAt) : "",
    author: version.authorName || "",
    snapshot: version.fountainSnapshot || "",
    restoring: restoringId === version._id,
  }));

/**
 * A one-line summary of how far a version is from the current draft.
 *
 * This exists because the mobile diff is a SEPARATE VIEW (D19) rather than an
 * inline expander, so the list needs to say something useful about a version
 * without rendering its diff — otherwise "which of these six do I want?" can
 * only be answered by opening all six.
 */
export const describeDiff = (rows) => {
  const { added, removed, identical } = summariseDiff(rows);
  if (rows == null) return "";
  if (identical) return "Identical to your current draft";
  const parts = [];
  if (added) parts.push(`${added} line${added === 1 ? "" : "s"} added since`);
  if (removed) parts.push(`${removed} removed`);
  return parts.join(", ");
};

/*
 * D19 — RESTORE ASKS FIRST, AND SAYS WHAT IT ACTUALLY DOES.
 *
 * Desktop's Restore fires on one click, from a button sitting beside "Diff" in
 * a row of small controls. It replaces the writer's ENTIRE current draft. It is
 * genuinely recoverable — the server writes today's text as a snapshot before
 * overwriting, which is why `restore` posts `content: currentText` — but that
 * fact lives in an 11px line at the bottom of the modal, below the scroll, and
 * a writer whose script has just changed under them has no reason to have read
 * it.
 *
 * So the confirmation is not a warning, it is an EXPLANATION: it states the
 * safety net, which is the thing that makes the answer "yes" easy and informed.
 */
export const describeRestore = ({ row = null, confirming = false } = {}) => {
  if (!row) return { label: "Restore", confirming: false, explanation: "" };
  if (!confirming) return { label: "Restore", confirming: false, explanation: "" };
  return {
    label: "Yes, restore it",
    confirming: true,
    explanation: `Your current draft is saved as a new version first, so nothing is lost — then the script becomes “${row.title}”.`,
  };
};

/** Whether "Save version" may be pressed, and why not when it may not. */
export const describeSaveVersion = ({ scriptId = null, saving = false } = {}) => {
  if (!scriptId) {
    return { enabled: false, reason: "Save this project once before you can keep versions of it." };
  }
  return { enabled: !saving, reason: "" };
};
