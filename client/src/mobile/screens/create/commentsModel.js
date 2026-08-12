/*
 * Ckript Mobile — the comments surface's data and rules (plan §11 Phase 3
 * bullet 4, decision D17).
 *
 * Pure, for the reason `editorChrome.js` and `navigatorModel.js` are: "may this
 * writer comment, and if not what does the screen say instead?" has exactly one
 * answer, and a unit test should be able to read it without a CodeMirror.
 */

export const COMMENT_FILTER = Object.freeze({
  OPEN: "open",
  RESOLVED: "resolved",
  MINE: "mine",
});

export const COMMENT_FILTERS = Object.freeze([
  { id: COMMENT_FILTER.OPEN, label: "Open" },
  { id: COMMENT_FILTER.RESOLVED, label: "Resolved" },
  { id: COMMENT_FILTER.MINE, label: "Mine" },
]);

/**
 * Group a flat comment list into threads, exactly as the desktop rail does:
 * a top-level comment is one without a `parentId`, and its replies are the
 * comments that name it.
 *
 * Replies are attached rather than filtered per-render because the desktop
 * version calls `repliesOf(id)` inside its map — O(n²) over a script with a
 * hundred notes, on the device least able to afford it (§15).
 */
export const buildCommentThreads = (comments = [], {
  filter = COMMENT_FILTER.OPEN,
  myUserId = null,
  isOrphaned = null,
} = {}) => {
  const replies = new Map();
  for (const comment of comments) {
    if (!comment?.parentId) continue;
    const key = String(comment.parentId);
    if (!replies.has(key)) replies.set(key, []);
    replies.get(key).push(comment);
  }

  const mine = (comment) => String(comment.authorId) === String(myUserId);

  return comments
    .filter((comment) => comment && !comment.parentId)
    .filter((comment) => {
      if (filter === COMMENT_FILTER.OPEN) return !comment.resolved;
      if (filter === COMMENT_FILTER.RESOLVED) return Boolean(comment.resolved);
      if (filter === COMMENT_FILTER.MINE) return mine(comment);
      return true;
    })
    .map((comment) => ({
      id: comment._id,
      body: comment.body,
      authorName: comment.authorName,
      resolved: Boolean(comment.resolved),
      mine: mine(comment),
      quote: comment.anchor?.quote || "",
      // An orphaned comment is one whose quoted text has been edited away. It is
      // shown, never hidden: silently dropping a colleague's note because the
      // line moved is worse than showing it with its anchor struck through.
      orphaned: typeof isOrphaned === "function" ? Boolean(isOrphaned(comment)) : false,
      replies: (replies.get(String(comment._id)) || []).map((reply) => ({
        id: reply._id,
        body: reply.body,
        authorName: reply.authorName,
      })),
    }));
};

/** Open threads only — the count the overflow entry and the sheet title carry. */
export const countOpenComments = (comments = []) =>
  comments.filter((comment) => comment && !comment.parentId && !comment.resolved).length;

/*
 * D17 — THE COMPOSER MUST CAPTURE ITS RANGE WHEN THE SHEET OPENS, NOT WHEN
 * "COMMENT" IS PRESSED, AND IT MUST REFUSE UP FRONT.
 *
 * `handleAddComment(body, range)` falls back to `apiRef.getSelection()` when no
 * range is passed. On desktop that is correct: the rail sits BESIDE the editor,
 * the selection is still on screen, and reading it at submit time is reading
 * something the writer can see.
 *
 * On a phone the sheet is modal — the editor behind it is `inert` and blurred,
 * and the selected text is not visible at all. Two consequences, and this
 * function exists because of the second:
 *
 *   1. the range is captured at open time and passed EXPLICITLY, so nothing
 *      depends on a selection surviving a modal, a blur and a virtual keyboard;
 *   2. with nothing selected, desktop lets the writer type a paragraph and THEN
 *      fails with "Select some script text… to comment on first." That error is
 *      a `setError` banner at the top of a surface whose composer is at the
 *      bottom, behind the keyboard. So mobile refuses BEFORE the typing, with
 *      the reason as visible text — the same rule the wizard footer follows.
 */
export const describeComposer = ({
  canComment = false,
  capturedRange = null,
  body = "",
  submitting = false,
} = {}) => {
  if (!canComment) {
    return {
      enabled: false,
      canSubmit: false,
      reason: "You have view-only access to this script, so you cannot add comments.",
      quote: "",
    };
  }
  if (!capturedRange || !capturedRange.text) {
    return {
      enabled: false,
      canSubmit: false,
      reason: "Select some script text first, then open Comments — a note is anchored to the words it is about.",
      quote: "",
    };
  }
  return {
    enabled: true,
    canSubmit: Boolean(body.trim()) && !submitting,
    reason: "",
    // Shown in the composer, because on a phone the highlighted text is behind
    // the sheet: without it the writer is annotating something invisible.
    quote: capturedRange.text,
  };
};
