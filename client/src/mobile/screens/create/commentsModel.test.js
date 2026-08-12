import { describe, expect, it } from "vitest";
import {
  buildCommentThreads,
  COMMENT_FILTER,
  countOpenComments,
  describeComposer,
} from "./commentsModel";

/*
 * The comment surface's rules, without a CodeMirror. Two things are worth
 * pinning here and nowhere else: the thread grouping (which the desktop rail
 * recomputes per row, and which this replaces), and `describeComposer` — the
 * whole of D17, which is a decision about WHEN a range is read and WHEN a
 * refusal is shown, not about markup.
 */

const comments = [
  { _id: "a", body: "Cut this beat", authorId: "me", authorName: "Ana", anchor: { quote: "INT. KITCHEN" } },
  { _id: "a1", parentId: "a", body: "Agreed", authorId: "u2", authorName: "Ravi" },
  { _id: "a2", parentId: "a", body: "Or shorten it", authorId: "me", authorName: "Ana" },
  { _id: "b", body: "Nice line", authorId: "u2", authorName: "Ravi", resolved: true },
  { _id: "c", body: "Whose car?", authorId: "u2", authorName: "Ravi" },
];

describe("buildCommentThreads", () => {
  it("groups replies under their parent and never lists a reply as a thread", () => {
    const threads = buildCommentThreads(comments, { filter: null, myUserId: "me" });
    expect(threads.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(threads[0].replies.map((r) => r.body)).toEqual(["Agreed", "Or shorten it"]);
    expect(threads[1].replies).toEqual([]);
  });

  it("filters by open, resolved and mine, exactly as the desktop rail does", () => {
    const ids = (filter) => buildCommentThreads(comments, { filter, myUserId: "me" }).map((t) => t.id);
    expect(ids(COMMENT_FILTER.OPEN)).toEqual(["a", "c"]);
    expect(ids(COMMENT_FILTER.RESOLVED)).toEqual(["b"]);
    expect(ids(COMMENT_FILTER.MINE)).toEqual(["a"]);
  });

  it("marks my own comments, because only they may be deleted", () => {
    const threads = buildCommentThreads(comments, { filter: null, myUserId: "me" });
    expect(threads.map((t) => t.mine)).toEqual([true, false, false]);
  });

  it("shows an orphaned comment rather than dropping it", () => {
    const threads = buildCommentThreads(comments, {
      filter: COMMENT_FILTER.OPEN,
      myUserId: "me",
      isOrphaned: (c) => c._id === "a",
    });
    // Silently hiding a colleague's note because the line it pointed at moved is
    // worse than showing it with its anchor struck through.
    expect(threads.find((t) => t.id === "a").orphaned).toBe(true);
    expect(threads.find((t) => t.id === "c").orphaned).toBe(false);
  });

  it("survives a malformed list rather than throwing inside a render", () => {
    expect(buildCommentThreads([null, undefined, { _id: "x", body: "ok" }], { filter: null })).toHaveLength(1);
    expect(buildCommentThreads()).toEqual([]);
  });
});

describe("countOpenComments", () => {
  it("counts unresolved THREADS, not replies", () => {
    // Three replies on one open thread is still one thing to look at.
    expect(countOpenComments(comments)).toBe(2);
    expect(countOpenComments([])).toBe(0);
  });
});

describe("describeComposer — D17", () => {
  const range = { from: 10, to: 24, text: "INT. KITCHEN" };

  it("refuses a view-only writer with a reason, before any typing", () => {
    const state = describeComposer({ canComment: false, capturedRange: range });
    expect(state.enabled).toBe(false);
    expect(state.canSubmit).toBe(false);
    expect(state.reason).toMatch(/view-only/i);
  });

  it("refuses with no selection — the case desktop only reports AFTER the note is written", () => {
    const state = describeComposer({ canComment: true, capturedRange: null, body: "A whole paragraph" });
    expect(state.enabled).toBe(false);
    expect(state.reason).toMatch(/select some script text/i);
    // The point of D17: a body this long must never have been typeable.
    expect(state.canSubmit).toBe(false);
  });

  it("shows the captured quote, because the highlighted text is behind the sheet", () => {
    const state = describeComposer({ canComment: true, capturedRange: range, body: "Cut it" });
    expect(state.enabled).toBe(true);
    expect(state.quote).toBe("INT. KITCHEN");
    expect(state.canSubmit).toBe(true);
  });

  it("will not submit whitespace, or twice", () => {
    expect(describeComposer({ canComment: true, capturedRange: range, body: "   " }).canSubmit).toBe(false);
    expect(describeComposer({ canComment: true, capturedRange: range, body: "Cut it", submitting: true }).canSubmit).toBe(false);
  });

  it("treats a zero-length selection as no selection", () => {
    // getSelection() returns null for a collapsed caret, but a range that
    // arrived from anywhere else with empty text must refuse the same way.
    expect(describeComposer({ canComment: true, capturedRange: { from: 4, to: 4, text: "" } }).enabled).toBe(false);
  });
});
