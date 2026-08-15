import { beforeEach, describe, expect, it } from "vitest";
import {
  UPLOAD_WORKING_DRAFT_KEY_PREFIX,
  UPLOAD_WORKING_DRAFT_MAX_AGE_MS,
  buildUploadWorkingDraftSnapshot,
  chooseUploadWorkingDraftRecovery,
  clearUploadWorkingDraft,
  getUploadWorkingDraftSignature,
  pruneUploadWorkingDrafts,
  readUploadWorkingDraft,
  uploadWorkingDraftFlow,
  uploadWorkingDraftKey,
  writeUploadWorkingDraft,
} from "./uploadWorkingDraft";

const createStorage = ({ failOnWrite = false } = {}) => {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: (index) => Array.from(map.keys())[index] ?? null,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      if (failOnWrite) throw new Error("QuotaExceededError");
      map.set(key, String(value));
    },
    removeItem: (key) => map.delete(key),
  };
};

const snapshot = (overrides = {}) => buildUploadWorkingDraftSnapshot({
  userId: "writer-1",
  draftId: "draft-1",
  scriptId: "draft-1",
  step: 2,
  detailStep: 4,
  data: {
    formData: { title: "Monsoon Letters", logline: "A postman carries one last secret." },
    textContent: "INT. POST OFFICE - NIGHT",
    legal: { agreedToTerms: false },
  },
  baseUpdatedAt: "2026-08-10T08:00:00.000Z",
  now: 1_754_812_800_000,
  ...overrides,
});

describe("uploadWorkingDraftKey — fresh, ?draft and ?edit never share recovery", () => {
  it("gives all three route modes distinct keys and lets edit win if a malformed URL carries both", () => {
    expect(uploadWorkingDraftKey({})).toBe(`${UPLOAD_WORKING_DRAFT_KEY_PREFIX}:new`);
    expect(uploadWorkingDraftKey({ draftId: "abc" })).toBe(`${UPLOAD_WORKING_DRAFT_KEY_PREFIX}:draft:abc`);
    expect(uploadWorkingDraftKey({ editId: "abc" })).toBe(`${UPLOAD_WORKING_DRAFT_KEY_PREFIX}:edit:abc`);
    expect(uploadWorkingDraftFlow({ draftId: "draft", editId: "live" })).toEqual({ kind: "edit", id: "live" });
  });

  it("isolates two drafts, two edits, and a fresh upload in the same store", () => {
    const storage = createStorage();
    const flows = [
      [{}, "new"],
      [{ draftId: "a" }, "draft-a"],
      [{ draftId: "b" }, "draft-b"],
      [{ editId: "a" }, "edit-a"],
      [{ editId: "b" }, "edit-b"],
    ];
    for (const [flow, title] of flows) {
      writeUploadWorkingDraft(flow, snapshot({ data: { formData: { title } } }), { storage });
    }
    for (const [flow, title] of flows) {
      expect(readUploadWorkingDraft(flow, { storage }).data.formData.title).toBe(title);
    }
  });
});

describe("upload working-draft storage", () => {
  let storage;
  beforeEach(() => { storage = createStorage(); });

  it("round-trips the exact panel and all JSON form state", () => {
    writeUploadWorkingDraft({ draftId: "draft-1" }, snapshot(), { storage });
    const value = readUploadWorkingDraft({ draftId: "draft-1" }, { storage });
    expect(value.step).toBe(2);
    expect(value.detailStep).toBe(4);
    expect(value.data.formData.title).toBe("Monsoon Letters");
    expect(value.signature).toBe(getUploadWorkingDraftSignature(value));
  });

  it("drops browser File/Blob values instead of pretending they can be restored", () => {
    const file = new Blob(["cover"], { type: "image/png" });
    const value = buildUploadWorkingDraftSnapshot({
      data: { title: "Safe", thumbnailFile: file },
      pendingFiles: { thumbnail: "cover.png" },
    });
    expect(value.data.thumbnailFile).toBeUndefined();
    expect(value.pendingFiles.thumbnail).toBe("cover.png");
  });

  it("reports storage denial without throwing into typing", () => {
    const denied = createStorage({ failOnWrite: true });
    expect(() => writeUploadWorkingDraft({}, snapshot(), { storage: denied })).not.toThrow();
    expect(writeUploadWorkingDraft({}, snapshot(), { storage: denied })).toBe(false);
  });

  it("clears only the requested flow", () => {
    writeUploadWorkingDraft({ draftId: "a" }, snapshot(), { storage });
    writeUploadWorkingDraft({ editId: "a" }, snapshot(), { storage });
    clearUploadWorkingDraft({ draftId: "a" }, { storage });
    expect(readUploadWorkingDraft({ draftId: "a" }, { storage })).toBeNull();
    expect(readUploadWorkingDraft({ editId: "a" }, { storage })).not.toBeNull();
  });

  it("prunes only stale upload snapshots", () => {
    const now = 2_000_000_000_000;
    writeUploadWorkingDraft({}, snapshot({ now: now - UPLOAD_WORKING_DRAFT_MAX_AGE_MS - 1 }), { storage });
    writeUploadWorkingDraft({ draftId: "fresh" }, snapshot({ now: now - 10 }), { storage });
    storage.setItem("user", "important");

    expect(pruneUploadWorkingDrafts({ storage, now })).toEqual([`${UPLOAD_WORKING_DRAFT_KEY_PREFIX}:new`]);
    expect(storage.getItem("user")).toBe("important");
    expect(readUploadWorkingDraft({ draftId: "fresh" }, { storage })).not.toBeNull();
  });
});

describe("chooseUploadWorkingDraftRecovery", () => {
  it("restores fresh work and work based on the current server version", () => {
    expect(chooseUploadWorkingDraftRecovery({ snapshot: snapshot({ baseUpdatedAt: null }) }))
      .toEqual({ action: "restore", reason: "local-only" });
    expect(chooseUploadWorkingDraftRecovery({
      snapshot: snapshot(),
      userId: "writer-1",
      serverUpdatedAt: "2026-08-10T08:00:00.000Z",
    })).toEqual({ action: "restore", reason: "ahead-of-server" });
  });

  it("does not leak another account's snapshot on a shared device", () => {
    expect(chooseUploadWorkingDraftRecovery({ snapshot: snapshot(), userId: "writer-2" }))
      .toEqual({ action: "discard", reason: "other-user" });
  });

  it("refuses to silently put local values over a server copy that moved", () => {
    expect(chooseUploadWorkingDraftRecovery({
      snapshot: snapshot(),
      userId: "writer-1",
      serverUpdatedAt: "2026-08-10T12:00:00.000Z",
    })).toEqual({ action: "conflict", reason: "server-moved" });
  });

  it("treats corrupt and absent snapshots as no recoverable work", () => {
    expect(chooseUploadWorkingDraftRecovery({ snapshot: null })).toEqual({ action: "none", reason: "no-snapshot" });
    expect(chooseUploadWorkingDraftRecovery({ snapshot: { data: null } }))
      .toEqual({ action: "discard", reason: "empty" });
  });
});
