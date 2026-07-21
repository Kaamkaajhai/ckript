import { describe, it, expect } from "vitest";
import {
  getScriptWriters,
  formatWriterNames,
  formatScriptCredit,
  hasMultipleWriters,
  groupWriterCredits,
} from "./writerCredits";

describe("writer credits", () => {
  const owner = { _id: "u1", name: "Ujjwal Sharma" };

  it("falls back to the owner when a script has no credits yet (every legacy script)", () => {
    const writers = getScriptWriters({ creator: owner });
    expect(writers).toHaveLength(1);
    expect(writers[0].name).toBe("Ujjwal Sharma");
    expect(writers[0].creditType).toBe("written_by");
  });

  it("returns credits in credit order, not array order", () => {
    const script = {
      creator: owner,
      writers: [
        { name: "Second", order: 2 },
        { name: "First", order: 1 },
      ],
    };
    expect(getScriptWriters(script).map((w) => w.name)).toEqual(["First", "Second"]);
  });

  it("ignores blank credit rows left behind by the editor UI", () => {
    const script = { creator: owner, writers: [{ name: "Real" }, { name: "   " }, { name: "" }] };
    expect(getScriptWriters(script)).toHaveLength(1);
  });

  it("reads credits the way screen credits do", () => {
    expect(formatWriterNames(["A"])).toBe("A");
    expect(formatWriterNames(["A", "B"])).toBe("A & B");
    expect(formatWriterNames(["A", "B", "C"])).toBe("A, B & C");
  });

  it("collapses long lists so cards do not blow their layout", () => {
    expect(formatWriterNames(["A", "B", "C", "D"], { max: 2 })).toBe("A, B & 2 others");
    expect(formatWriterNames(["A", "B", "C"], { max: 2 })).toBe("A, B & 1 other");
  });

  it("builds a one-line credit straight from a script", () => {
    const script = { creator: owner, writers: [{ name: "Ujjwal", order: 0 }, { name: "Riya", order: 1 }] };
    expect(formatScriptCredit(script)).toBe("Ujjwal & Riya");
    expect(hasMultipleWriters(script)).toBe(true);
    expect(hasMultipleWriters({ creator: owner })).toBe(false);
  });

  it("groups credits by type for the detail page", () => {
    const script = {
      creator: owner,
      writers: [
        { name: "Ujjwal", creditType: "written_by", order: 0 },
        { name: "Riya", creditType: "written_by", order: 1 },
        { name: "Sam", creditType: "story_by", order: 2 },
      ],
    };
    const groups = groupWriterCredits(script);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Written by");
    expect(groups[0].writers.map((w) => w.name)).toEqual(["Ujjwal", "Riya"]);
    expect(groups[1].label).toBe("Story by");
  });

  it("keeps a populated user object so a credit can link to a profile", () => {
    const script = { creator: owner, writers: [{ userId: { _id: "u2", name: "Riya" }, name: "Riya" }] };
    const [credit] = getScriptWriters(script);
    expect(credit.id).toBe("u2");
    expect(credit.profile).toEqual({ _id: "u2", name: "Riya" });
  });

  it("returns nothing when there is neither a credit nor a named owner", () => {
    expect(getScriptWriters({})).toEqual([]);
    expect(formatScriptCredit({})).toBe("");
  });
});
