import { useEffect, useRef, useState } from "react";
import Button from "../../../components/buttons/Button";
import EmptyState from "../../../components/EmptyState";
import InlineMessage from "../../../components/feedback/InlineMessage";
import TextArea from "../../../components/forms/TextArea";
import Sheet from "../../../components/overlays/Sheet";
import useKeyboardInset from "../../../hooks/useKeyboardInset";
import SegmentedControl from "../../../components/tabs/SegmentedControl";
import {
  buildCommentThreads,
  COMMENT_FILTER,
  COMMENT_FILTERS,
  describeComposer,
} from "../commentsModel";

/*
 * CommentsSheet — the desktop right rail's Comments tab (decision D17).
 *
 * A Sheet, by D15's test: notes about the script do not replace the script.
 * What makes this one different from the Navigator is that it WRITES — add,
 * reply, resolve, delete — so the three rules below are about what a write
 * costs on a phone rather than about layout.
 *
 * 1. THE RANGE IS CAPTURED WHEN THE SHEET OPENS.
 *    See `describeComposer`. Desktop reads `getSelection()` at submit time
 *    because its rail sits beside a visible selection; a modal sheet has
 *    blurred the editor and hidden the text. The captured range is passed to
 *    `onAddComment(body, range)` explicitly — the handler has always accepted
 *    one — and the quoted text is shown in the composer, because otherwise the
 *    writer is annotating something they cannot see.
 *
 * 2. IT REFUSES BEFORE THE TYPING, NOT AFTER.
 *    With nothing selected, desktop lets a writer compose a paragraph and then
 *    rejects it with a banner at the top of the surface — behind the keyboard,
 *    on a phone. Here the composer is disabled with the reason as visible text.
 *
 * 3. THE KEYBOARD CANNOT BURY THE THING YOU ARE TYPING INTO.
 *    `Sheet` pads its FOOTER by `useKeyboardInset`, and this surface has no
 *    footer — its composer, its Comment button and every reply box live in the
 *    sheet BODY. On iOS the layout viewport does not shrink when the keyboard
 *    opens, so without help the button under a focused field sits beneath the
 *    keyboard: visible in the DOM, unreachable with a thumb. The body therefore
 *    ends in a spacer exactly as tall as the keyboard is covering, which is
 *    what lets the browser scroll any field in it above the keyboard. Named
 *    rather than assumed: this is the mechanism, and a real device is still the
 *    only thing that can confirm the result.
 *
 * 4. DELETE ASKS.
 *    Desktop deletes a comment on one click. A mis-tap on a phone is far easier
 *    and the deletion is irreversible, so the row asks first. The confirmation
 *    is inline rather than a nested dialog: a confirm dialog on top of a sheet
 *    is two modal layers, and the thing being confirmed is one row.
 */
export default function CommentsSheet({
  open = false,
  onClose = null,
  comments = [],
  canComment = false,
  myUserId = null,
  isCommentOrphaned = null,
  getSelection = null,
  onAddComment = null,
  onReplyComment = null,
  onResolveComment = null,
  onDeleteComment = null,
  onFocusComment = null,
  returnFocusTo = null,
}) {
  const [filter, setFilter] = useState(COMMENT_FILTER.OPEN);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyFor, setReplyFor] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [capturedRange, setCapturedRange] = useState(null);
  const keyboardInset = useKeyboardInset();

  /* The whole of rule 1, in one effect: read the selection at the moment the
     sheet opens, while the editor still holds it. */
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setCapturedRange(getSelection?.() || null);
      setBody("");
      setReplyFor(null);
      setConfirmDelete(null);
    }
    wasOpen.current = open;
  }, [open, getSelection]);

  const threads = buildCommentThreads(comments, { filter, myUserId, isOrphaned: isCommentOrphaned });
  const composer = describeComposer({ canComment, capturedRange, body, submitting });

  const submit = async () => {
    if (!composer.canSubmit) return;
    setSubmitting(true);
    try {
      const ok = await onAddComment?.(body.trim(), capturedRange);
      if (ok !== false) setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (threadId) => {
    if (!replyBody.trim()) return;
    await onReplyComment?.(threadId, replyBody.trim());
    setReplyBody("");
    setReplyFor(null);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Comments"
      closeLabel="Close comments"
      returnFocusTo={returnFocusTo}
      className="ckm-editor__comments"
    >
      <div className="ckm-editor__comments-composer">
        {composer.enabled ? (
          <>
            <p className="ckm-editor__comments-quote">
              <span className="ckm-sr-only">Commenting on: </span>
              &ldquo;{composer.quote}&rdquo;
            </p>
            <TextArea
              label="Your note"
              rows={3}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What should change here?"
            />
            <div className="ckm-editor__comments-composer-actions">
              <Button size="sm" onClick={submit} disabled={!composer.canSubmit}>
                {submitting ? "Posting…" : "Comment"}
              </Button>
            </div>
          </>
        ) : (
          /* Rule 2: the reason is visible text ahead of the attempt, not a
             banner after it. */
          <InlineMessage tone="info" variant="panel">{composer.reason}</InlineMessage>
        )}
      </div>

      <div className="ckm-editor__comments-filter">
        <SegmentedControl
          label="Show"
          value={filter}
          onChange={setFilter}
          options={COMMENT_FILTERS.map((entry) => ({ value: entry.id, label: entry.label }))}
        />
      </div>

      {threads.length === 0 ? (
        <EmptyState
          icon="chat_bubble"
          title={`No ${filter} comments`}
          body="Select some script text to start a note about it."
        />
      ) : (
        <ul className="ckm-editor__comments-list">
          {threads.map((thread) => (
            <li key={thread.id} className="ckm-editor__comments-thread">
              {/* Tapping the note takes the writer to the text it is about —
                  which means leaving, so the sheet closes first (the same
                  ordering the corkboard and the navigator use). */}
              <button
                type="button"
                className="ckm-editor__comments-jump"
                onClick={() => { onClose?.(); requestAnimationFrame(() => onFocusComment?.({ _id: thread.id, anchor: { quote: thread.quote } })); }}
              >
                {thread.quote && (
                  <span className={`ckm-editor__comments-anchor${thread.orphaned ? " is-orphaned" : ""}`}>
                    &ldquo;{thread.quote}&rdquo;
                  </span>
                )}
                {thread.orphaned && (
                  <span className="ckm-editor__comments-orphan">Orphaned — the text this note pointed at is gone</span>
                )}
                <span className="ckm-editor__comments-body">{thread.body}</span>
                <span className="ckm-editor__comments-author">
                  {thread.authorName}{thread.mine ? " (you)" : ""}
                  {thread.resolved ? " · Resolved" : ""}
                </span>
              </button>

              {thread.replies.map((reply) => (
                <p key={reply.id} className="ckm-editor__comments-reply">
                  <span className="ckm-editor__comments-body">{reply.body}</span>
                  <span className="ckm-editor__comments-author">{reply.authorName}</span>
                </p>
              ))}

              <div className="ckm-editor__comments-actions">
                {canComment && (
                  <Button
                    size="sm"
                    variant="tertiary"
                    onClick={() => { setReplyFor(replyFor === thread.id ? null : thread.id); setReplyBody(""); }}
                    aria-expanded={replyFor === thread.id}
                  >
                    Reply
                  </Button>
                )}
                <Button size="sm" variant="tertiary" onClick={() => onResolveComment?.(thread.id, !thread.resolved)}>
                  {thread.resolved ? "Reopen" : "Resolve"}
                </Button>
                {thread.mine && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="ckm-editor__comments-delete"
                    onClick={() => setConfirmDelete(thread.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>

              {/* Rule 3 — inline, not a second modal layer over the sheet. */}
              {confirmDelete === thread.id && (
                <InlineMessage
                  tone="warning"
                  variant="panel"
                  title="Delete this comment?"
                  action={(
                    <>
                      <Button size="sm" variant="destructive" onClick={() => { setConfirmDelete(null); onDeleteComment?.(thread.id); }}>
                        Delete it
                      </Button>
                      <Button size="sm" variant="tertiary" onClick={() => setConfirmDelete(null)}>Keep it</Button>
                    </>
                  )}
                >
                  Replies to it go too, and this cannot be undone.
                </InlineMessage>
              )}

              {replyFor === thread.id && (
                <div className="ckm-editor__comments-replybox">
                  <TextArea
                    label="Your reply"
                    rows={2}
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    placeholder="Reply…"
                  />
                  <div className="ckm-editor__comments-composer-actions">
                    <Button size="sm" onClick={() => sendReply(thread.id)} disabled={!replyBody.trim()}>Send</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Rule 3. Zero-height when no keyboard is open, so it costs nothing on a
          desktop browser or a tablet with a hardware keyboard. */}
      {keyboardInset > 0 && (
        <div
          className="ckm-editor__comments-keyboard-spacer"
          style={{ height: `${keyboardInset}px` }}
          aria-hidden="true"
          data-testid="comments-keyboard-spacer"
        />
      )}
    </Sheet>
  );
}
