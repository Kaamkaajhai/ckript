import { describe, it, expect, beforeEach } from "vitest";
import {
  WORKING_DRAFT_KEY_PREFIX,
  WORKING_DRAFT_MAX_AGE_MS,
  workingDraftKey,
  readWorkingDraft,
  writeWorkingDraft,
  clearWorkingDraft,
  pruneWorkingDrafts,
  buildWorkingDraftSnapshot,
  snapshotHasContent,
  chooseDraftRecovery,
} from "./workingDraft";

/*
 * These tests exist because of DEF-2 (NATIVE_APP_IMPLEMENTATION.md §19.1): the
 * previous inline snapshot wrote to localStorage ONLY for brand-new scripts, so
 * the writers with the most to lose — the ones resuming a real draft — had no
 * local fallback at all. The first describe block below is the assertion that
 * this cannot come back.
 *
 * A memory storage stands in for localStorage so the quota and enumeration
 * paths can be exercised directly; every function takes the store as an option
 * for exactly that reason.
 */
const createStorage = ({ failOnWrite = false } = {}) => {
  const map = new Map();
  return {
    get size() { return map.size; },
    get length() { return map.size; },
    key: (i) => Array.from(map.keys())[i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (failOnWrite) {
        const err = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        throw err;
      }
      map.set(k, String(v));
    },
    removeItem: (k) => { map.delete(k); },
    _raw: map,
  };
};

const snapshot = (overrides = {}) => buildWorkingDraftSnapshot({
  userId: "writer-1",
  title: "The Last Scene",
  fountainContent: "INT. KITCHEN - NIGHT\n\nShe reads the letter.",
  step: 2,
  detailsStep: 3,
  baseUpdatedAt: "2026-08-09T10:00:00.000Z",
  now: 1_754_740_000_000,
  ...overrides,
});

describe("workingDraftKey — one snapshot per draft (DEF-2)", () => {
  it("keeps the historical bare key for a brand-new script, so an in-flight snapshot is not orphaned by this change", () => {
    expect(workingDraftKey(null)).toBe(WORKING_DRAFT_KEY_PREFIX);
    expect(workingDraftKey("")).toBe(WORKING_DRAFT_KEY_PREFIX);
    expect(workingDraftKey("   ")).toBe(WORKING_DRAFT_KEY_PREFIX);
  });

  it("gives a resumed draft its own key — the case that previously got no snapshot at all", () => {
    expect(workingDraftKey("abc123")).toBe(`${WORKING_DRAFT_KEY_PREFIX}:abc123`);
  });

  it("does not let two different drafts share one snapshot", () => {
    const storage = createStorage();
    writeWorkingDraft("draft-a", snapshot({ title: "A" }), { storage });
    writeWorkingDraft("draft-b", snapshot({ title: "B" }), { storage });

    expect(readWorkingDraft("draft-a", { storage }).title).toBe("A");
    expect(readWorkingDraft("draft-b", { storage }).title).toBe("B");
    // And neither one is the new-script snapshot.
    expect(readWorkingDraft(null, { storage })).toBeNull();
  });
});

describe("read/write/clear", () => {
  let storage;
  beforeEach(() => { storage = createStorage(); });

  it("round-trips a snapshot", () => {
    writeWorkingDraft("d1", snapshot(), { storage });
    const read = readWorkingDraft("d1", { storage });
    expect(read.title).toBe("The Last Scene");
    expect(read.step).toBe(2);
    expect(read.detailsStep).toBe(3);
    expect(read.baseUpdatedAt).toBe("2026-08-09T10:00:00.000Z");
  });

  it("reports a failed write instead of throwing — a full quota must never break typing", () => {
    const full = createStorage({ failOnWrite: true });
    expect(() => writeWorkingDraft("d1", snapshot(), { storage: full })).not.toThrow();
    expect(writeWorkingDraft("d1", snapshot(), { storage: full })).toBe(false);
  });

  it("treats a corrupt snapshot as no snapshot rather than throwing into the render", () => {
    storage.setItem(workingDraftKey("d1"), "{not json");
    expect(readWorkingDraft("d1", { storage })).toBeNull();
  });

  it("clears only the draft it was asked to clear", () => {
    writeWorkingDraft("d1", snapshot(), { storage });
    writeWorkingDraft("d2", snapshot(), { storage });
    clearWorkingDraft("d1", { storage });
    expect(readWorkingDraft("d1", { storage })).toBeNull();
    expect(readWorkingDraft("d2", { storage })).not.toBeNull();
  });

  it("survives a storage that is absent entirely (private mode)", () => {
    expect(readWorkingDraft("d1", { storage: null })).toBeNull();
    expect(writeWorkingDraft("d1", snapshot(), { storage: null })).toBe(false);
    expect(() => clearWorkingDraft("d1", { storage: null })).not.toThrow();
    expect(pruneWorkingDrafts({ storage: null })).toEqual([]);
  });
});

describe("pruneWorkingDrafts — per-draft keys must not grow forever", () => {
  it("removes snapshots past the max age and keeps recent ones", () => {
    const storage = createStorage();
    const now = 2_000_000_000_000;
    writeWorkingDraft("old", snapshot({ now: now - WORKING_DRAFT_MAX_AGE_MS - 1 }), { storage });
    writeWorkingDraft("fresh", snapshot({ now: now - 1000 }), { storage });

    const removed = pruneWorkingDrafts({ storage, now });

    expect(removed).toEqual([`${WORKING_DRAFT_KEY_PREFIX}:old`]);
    expect(readWorkingDraft("old", { storage })).toBeNull();
    expect(readWorkingDraft("fresh", { storage })).not.toBeNull();
  });

  it("never touches keys belonging to anything else", () => {
    const storage = createStorage();
    storage.setItem("user", JSON.stringify({ token: "t" }));
    storage.setItem("dashboard:v1:writer-1", "{}");
    pruneWorkingDrafts({ storage, now: 9_000_000_000_000 });
    expect(storage.getItem("user")).not.toBeNull();
    expect(storage.getItem("dashboard:v1:writer-1")).not.toBeNull();
  });

  it("leaves an unparseable entry alone — deleting what we cannot read is how this function becomes the data loss", () => {
    const storage = createStorage();
    storage.setItem(`${WORKING_DRAFT_KEY_PREFIX}:weird`, "{not json");
    pruneWorkingDrafts({ storage, now: 9_000_000_000_000 });
    expect(storage.getItem(`${WORKING_DRAFT_KEY_PREFIX}:weird`)).toBe("{not json");
  });
});

describe("snapshotHasContent", () => {
  it("counts a real title as content even with an empty document", () => {
    expect(snapshotHasContent(buildWorkingDraftSnapshot({ title: "Untitled but typed" }))).toBe(true);
  });

  it("does not count markup with no words", () => {
    expect(snapshotHasContent(buildWorkingDraftSnapshot({ textContent: "<p></p><p><br></p>" }))).toBe(false);
  });

  it("counts fountain content", () => {
    expect(snapshotHasContent(buildWorkingDraftSnapshot({ fountainContent: "FADE IN:" }))).toBe(true);
  });
});

describe("chooseDraftRecovery — the decision, kept out of the component", () => {
  it("does nothing when there is no snapshot", () => {
    expect(chooseDraftRecovery({ snapshot: null })).toEqual({ action: "none", reason: "no-snapshot" });
  });

  it("discards a snapshot belonging to a different account — a shared device must not leak someone's script", () => {
    const result = chooseDraftRecovery({ snapshot: snapshot({ userId: "writer-1" }), userId: "writer-2" });
    expect(result).toEqual({ action: "discard", reason: "other-user" });
  });

  it("discards a snapshot with nothing in it", () => {
    const result = chooseDraftRecovery({ snapshot: buildWorkingDraftSnapshot({ userId: "writer-1" }), userId: "writer-1" });
    expect(result).toEqual({ action: "discard", reason: "empty" });
  });

  it("restores outright when there is no server copy — the brand-new-script case", () => {
    const result = chooseDraftRecovery({ snapshot: snapshot(), userId: "writer-1", server: null });
    expect(result).toEqual({ action: "restore", reason: "no-server-copy" });
  });

  it("does nothing when the server already holds this text", () => {
    const snap = snapshot();
    const result = chooseDraftRecovery({
      snapshot: snap,
      userId: "writer-1",
      server: { updatedAt: "2026-08-09T10:00:00.000Z", content: snap.fountainContent },
    });
    expect(result).toEqual({ action: "none", reason: "in-sync" });
  });

  it("matches on textContent too, so a prose draft is not falsely recovered", () => {
    const snap = buildWorkingDraftSnapshot({ userId: "writer-1", textContent: "<p>Chapter one.</p>", baseUpdatedAt: "T1" });
    const result = chooseDraftRecovery({
      snapshot: snap,
      userId: "writer-1",
      server: { updatedAt: "T1", content: "<p>Chapter one.</p>" },
    });
    expect(result.action).toBe("none");
  });

  it("RESTORES when the server is still on this session's base — the OS-killed-tab case this whole module is for", () => {
    const result = chooseDraftRecovery({
      snapshot: snapshot({ baseUpdatedAt: "2026-08-09T10:00:00.000Z" }),
      userId: "writer-1",
      server: { updatedAt: "2026-08-09T10:00:00.000Z", content: "INT. KITCHEN - NIGHT\n" },
    });
    expect(result).toEqual({ action: "restore", reason: "ahead-of-server" });
  });

  it("REFUSES to auto-restore when the saved copy moved on since this session's base — a co-writer's work is not ours to overwrite", () => {
    const result = chooseDraftRecovery({
      snapshot: snapshot({ baseUpdatedAt: "2026-08-09T10:00:00.000Z" }),
      userId: "writer-1",
      server: { updatedAt: "2026-08-09T18:30:00.000Z", content: "INT. KITCHEN - NIGHT\n\nHe burns the letter." },
    });
    expect(result).toEqual({ action: "conflict", reason: "server-moved" });
  });

  it("restores when the snapshot predates baseUpdatedAt being recorded — an older snapshot is still better than losing it", () => {
    const legacy = { userId: "writer-1", title: "Old", textContent: "<p>Words</p>", step: 1 };
    const result = chooseDraftRecovery({
      snapshot: legacy,
      userId: "writer-1",
      server: { updatedAt: "2026-08-09T18:30:00.000Z", content: "<p>Different</p>" },
    });
    expect(result).toEqual({ action: "restore", reason: "ahead-of-server" });
  });

  it("compares by identity, not by clock — a snapshot written by a device with a wrong clock still decides correctly", () => {
    const skewed = snapshot({ now: 1 }); // "written" in 1970 as far as this device is concerned
    expect(chooseDraftRecovery({
      snapshot: skewed,
      userId: "writer-1",
      server: { updatedAt: skewed.baseUpdatedAt, content: "something else" },
    })).toEqual({ action: "restore", reason: "ahead-of-server" });
  });
});

describe("buildWorkingDraftSnapshot", () => {
  it("carries the writer's position, not just their text (D7: resume into the exact step and sub-panel)", () => {
    const snap = buildWorkingDraftSnapshot({ step: 2, detailsStep: 4 });
    expect(snap.step).toBe(2);
    expect(snap.detailsStep).toBe(4);
  });

  it("coerces a missing position to the top of the wizard rather than storing NaN", () => {
    const snap = buildWorkingDraftSnapshot({ step: undefined, detailsStep: undefined });
    expect(snap.step).toBe(1);
    expect(snap.detailsStep).toBe(0);
  });

  it("falls back to the draft id when no scriptId has been assigned yet", () => {
    expect(buildWorkingDraftSnapshot({ draftId: "d9" }).scriptId).toBe("d9");
  });
});
