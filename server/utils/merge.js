import { diff_match_patch } from "diff-match-patch";

const dmp = new diff_match_patch();

export const computeDiff = (mainContent = "", branchContent = "") => {
  const diffs = dmp.diff_main(String(mainContent || ""), String(branchContent || ""));
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([operation, text], index) => ({
    index,
    operation,
    text,
  }));
};

export const applyMergeDecisions = (mainContent = "", branchContent = "", decisions = []) => {
  const diffs = computeDiff(mainContent, branchContent);
  const decisionMap = new Map(
    (Array.isArray(decisions) ? decisions : []).map((entry) => [Number(entry?.changeIndex), entry?.decision])
  );

  return diffs.reduce((result, diff) => {
    const decision = decisionMap.get(diff.index) || "incoming";

    if (diff.operation === 0) {
      // Unchanged text — always include.
      return result + diff.text;
    }

    if (diff.operation === -1) {
      // Text only in main (deleted in branch).
      // "current" → keep it. "both" → keep it. "incoming" → discard it.
      if (decision === "current" || decision === "both") {
        return result + diff.text;
      }
      return result;
    }

    // operation === 1: text only in branch (inserted).
    // "incoming" → add it. "both" → add it. "current" → discard it.
    if (decision === "current") {
      return result;
    }

    return result + diff.text;
  }, "");
};
