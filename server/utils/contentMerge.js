import { diff_match_patch } from "diff-match-patch";

const dmp = new diff_match_patch();

/**
 * Three-way merge for script content.
 *
 * Computes the patch the author actually made (base → proposed) and replays it onto whatever the
 * server currently holds, so two people editing the same script from their own copies converge
 * instead of overwriting each other. Non-overlapping edits (the common duet case — each writer
 * adding a different scene) merge cleanly; genuinely overlapping edits report `conflict`.
 *
 * With no base to diff against we cannot know what changed, so the proposed content is taken as-is
 * (`fallbackApplied`) — matching the pre-merge behaviour rather than silently dropping the write.
 */
export const applyThreeWayMerge = ({
  currentContent = "",
  baseContent = "",
  proposedContent = "",
}) => {
  const normalizedCurrent = String(currentContent || "");
  const normalizedBase = String(baseContent || "");
  const normalizedProposed = String(proposedContent || "");

  if (!normalizedBase) {
    return {
      mergedContent: normalizedProposed,
      merged: false,
      conflict: false,
      fallbackApplied: true,
    };
  }

  const patches = dmp.patch_make(normalizedBase, normalizedProposed);
  const [mergedContent, appliedFlags] = dmp.patch_apply(patches, normalizedCurrent);
  const conflict = Array.isArray(appliedFlags) && appliedFlags.some((flag) => flag !== true);

  return {
    mergedContent,
    merged: true,
    conflict,
    fallbackApplied: false,
  };
};

export default applyThreeWayMerge;
