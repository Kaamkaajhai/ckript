import { describe, expect, it } from "vitest";
import { lineDiff, summariseDiff } from "../../../components/screenplay/useVersionHistory";
import {
  buildVersionRows,
  describeDiff,
  describeRestore,
  describeSaveVersion,
} from "./versionsModel";

/*
 * The diff arithmetic and the restore rule. Both are things a reader cannot
 * check by eye, and the restore rule is the one whose wrong answer silently
 * replaces a writer's whole script.
 */

const OLD = ["INT. KITCHEN - DAY", "", "Ana burns the toast."].join("\n");
const NEW = ["INT. KITCHEN - DAY", "", "Ana burns the toast.", "", "She swears."].join("\n");

describe("lineDiff / summariseDiff", () => {
  it("reports added and removed lines against the current draft", () => {
    const rows = lineDiff(OLD, NEW);
    expect(summariseDiff(rows)).toMatchObject({ added: 1, removed: 0, identical: false });
    expect(rows.find((r) => r.op === 1).line).toBe("She swears.");
  });

  it("calls an unchanged version identical rather than reporting zero of each", () => {
    expect(summariseDiff(lineDiff(NEW, NEW))).toMatchObject({ identical: true });
  });

  it("returns null for no version, so a caller can tell 'nothing selected' from 'no changes'", () => {
    expect(lineDiff(null, NEW)).toBeNull();
    expect(summariseDiff(null)).toMatchObject({ added: 0, removed: 0, identical: false });
  });
});

describe("buildVersionRows", () => {
  it("keeps desktop's label fallback, because auto and unlabelled are different things", () => {
    const rows = buildVersionRows([
      { _id: "v1", label: "First draft", createdAt: new Date().toISOString(), authorName: "Ana" },
      { _id: "v2", auto: true, createdAt: new Date().toISOString() },
      { _id: "v3", createdAt: new Date().toISOString() },
    ]);
    expect(rows.map((r) => r.title)).toEqual(["First draft", "Auto snapshot", "Untitled version"]);
    expect(rows[0].when).toBe("just now");
    expect(rows[0].author).toBe("Ana");
  });

  it("marks only the row actually being restored", () => {
    const rows = buildVersionRows([{ _id: "v1" }, { _id: "v2" }], { restoringId: "v2" });
    expect(rows.map((r) => r.restoring)).toEqual([false, true]);
  });
});

describe("describeDiff — what a row says without rendering its diff", () => {
  it("summarises in one line, since the mobile diff is a separate view", () => {
    // DEF-18: before both sides were newline-terminated, appending ONE line
    // reported "2 lines added since, 1 removed" — the old last line counted as
    // removed and re-added because its terminator changed.
    expect(describeDiff(lineDiff(OLD, NEW))).toBe("1 line added since");
    expect(describeDiff(lineDiff(NEW, OLD))).toBe("1 removed");
    expect(describeDiff(lineDiff(NEW, NEW))).toBe("Identical to your current draft");
  });

  it("says nothing at all when there is no version to compare", () => {
    expect(describeDiff(null)).toBe("");
  });
});

describe("describeRestore — D19", () => {
  const row = { id: "v1", title: "First draft" };

  it("offers Restore first, and only then the confirmation", () => {
    const first = describeRestore({ row, confirming: false });
    expect(first).toMatchObject({ label: "Restore", confirming: false, explanation: "" });
  });

  it("explains the safety net rather than warning about the danger", () => {
    const asked = describeRestore({ row, confirming: true });
    expect(asked.label).toBe("Yes, restore it");
    // The desktop modal states this in an 11px line at the bottom, below the
    // fold. It is the fact that makes "yes" an easy, informed answer, so it
    // belongs at the moment of asking.
    expect(asked.explanation).toMatch(/saved as a new version first, so nothing is lost/i);
    expect(asked.explanation).toContain("First draft");
  });

  it("survives being asked about no row at all", () => {
    expect(describeRestore({}).label).toBe("Restore");
  });
});

describe("describeSaveVersion", () => {
  it("refuses on an unsaved project, with the reason", () => {
    const state = describeSaveVersion({ scriptId: null });
    expect(state.enabled).toBe(false);
    expect(state.reason).toMatch(/save this project once/i);
  });

  it("will not save twice at once", () => {
    expect(describeSaveVersion({ scriptId: "s1", saving: true }).enabled).toBe(false);
    expect(describeSaveVersion({ scriptId: "s1" })).toMatchObject({ enabled: true, reason: "" });
  });
});
