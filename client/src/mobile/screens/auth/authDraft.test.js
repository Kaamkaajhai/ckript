// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllDrafts, clearDraft, isResumable, loadDraft, saveDraft } from "./authDraft";

/*
 * The tests that matter here are the exclusions.
 *
 * A draft is a convenience; the password and the special-category fields are a
 * liability. Those assertions are the reason this file exists — a regression in
 * `sanitise` would be invisible in every screen test and would quietly start
 * writing someone's password, date of birth and disability status into browser
 * storage that any script on the origin can read.
 */

const FULL_DRAFT = {
  step: 5,
  accountCreated: true,
  account: {
    name: "Mira Sen",
    email: "mira@example.com",
    phone: "+91 98765 43210",
    password: "Sup3rSecret!",
    confirmPassword: "Sup3rSecret!",
    dateOfBirth: "1994-02-11",
    referralCode: "ABC123",
  },
  profile: {
    username: "mira_sen",
    bio: "Writes thrillers.",
    diversity: {
      gender: "Female",
      nationality: "Indian",
      lgbtqStatus: "Prefer not to say",
      disabilityStatus: "None",
    },
  },
  genres: ["Thriller"],
  tags: ["Revenge"],
  formats: ["feature"],
};

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("what a draft is allowed to contain", () => {
  it("never writes the password", () => {
    saveDraft("writer", FULL_DRAFT);
    // Read the raw record, not the parsed one: the guarantee is about what is
    // on disk, and a getter could hide a leak that a string search would not.
    const raw = String(window.sessionStorage.getItem("ckm:signup-draft:1:writer"));
    expect(raw).not.toContain("Sup3rSecret!");
    expect(loadDraft("writer").account.password).toBeUndefined();
    expect(loadDraft("writer").account.confirmPassword).toBeUndefined();
  });

  it("never writes date of birth or the diversity block", () => {
    // GDPR Art. 9 special-category data: gender, nationality, LGBTQ+ status,
    // disability status — plus the DOB that sits beside them.
    saveDraft("writer", FULL_DRAFT);
    const raw = String(window.sessionStorage.getItem("ckm:signup-draft:1:writer"));
    expect(raw).not.toContain("1994-02-11");
    expect(raw).not.toContain("disabilityStatus");
    expect(raw).not.toContain("Prefer not to say");

    const loaded = loadDraft("writer");
    expect(loaded.account.dateOfBirth).toBeUndefined();
    expect(loaded.profile.diversity).toBeUndefined();
  });

  it("keeps the fields that are only tedious to retype", () => {
    saveDraft("writer", FULL_DRAFT);
    const loaded = loadDraft("writer");
    expect(loaded.account.name).toBe("Mira Sen");
    expect(loaded.account.email).toBe("mira@example.com");
    expect(loaded.account.referralCode).toBe("ABC123");
    expect(loaded.profile.username).toBe("mira_sen");
    expect(loaded.genres).toEqual(["Thriller"]);
    expect(loaded.step).toBe(5);
    expect(loaded.accountCreated).toBe(true);
  });

  it("sanitises on the way OUT as well as in", () => {
    // A record written by an older build — or by anything else that can reach
    // this origin — must not be able to reintroduce an excluded field.
    window.sessionStorage.setItem("ckm:signup-draft:1:writer", JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      step: 2,
      account: { name: "X", password: "leaked", dateOfBirth: "1990-01-01" },
      profile: { diversity: { gender: "Female" } },
    }));
    const loaded = loadDraft("writer");
    expect(loaded.account.password).toBeUndefined();
    expect(loaded.account.dateOfBirth).toBeUndefined();
    expect(loaded.profile.diversity).toBeUndefined();
  });

  it("drops a field nobody decided to persist", () => {
    saveDraft("writer", { ...FULL_DRAFT, secretNewField: "should not ride along" });
    const raw = String(window.sessionStorage.getItem("ckm:signup-draft:1:writer"));
    expect(raw).not.toContain("should not ride along");
  });
});

describe("lifecycle", () => {
  it("keeps each role's draft apart", () => {
    saveDraft("writer", { ...FULL_DRAFT, step: 4 });
    saveDraft("producer", { ...FULL_DRAFT, step: 7 });
    expect(loadDraft("writer").step).toBe(4);
    expect(loadDraft("producer").step).toBe(7);
  });

  it("refuses a draft written by a different version", () => {
    window.sessionStorage.setItem("ckm:signup-draft:1:writer", JSON.stringify({
      version: 99, savedAt: Date.now(), step: 3,
    }));
    expect(loadDraft("writer")).toBeNull();
  });

  it("expires a draft that is too old to be useful, and removes it", () => {
    saveDraft("writer", FULL_DRAFT);
    // Seven hours on, past the six-hour ceiling.
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 7 * 60 * 60 * 1000);
    expect(loadDraft("writer")).toBeNull();
    expect(window.sessionStorage.getItem("ckm:signup-draft:1:writer")).toBeNull();
  });

  it("clears every role's draft on request, not just the current one", () => {
    // Sign-out: leaving one person's half-finished sign-up in a browser the
    // next person is about to use is the leak this exists to avoid.
    saveDraft("writer", FULL_DRAFT);
    saveDraft("producer", FULL_DRAFT);
    saveDraft("industry", FULL_DRAFT);
    clearAllDrafts();
    expect(loadDraft("writer")).toBeNull();
    expect(loadDraft("producer")).toBeNull();
    expect(loadDraft("industry")).toBeNull();
  });

  it("clears one role's draft without touching another's", () => {
    saveDraft("writer", FULL_DRAFT);
    saveDraft("producer", FULL_DRAFT);
    clearDraft("writer");
    expect(loadDraft("writer")).toBeNull();
    expect(loadDraft("producer")).not.toBeNull();
  });

  it("survives storage being unavailable rather than throwing", () => {
    // Private mode, disabled storage, a sandboxed frame. A flow with no draft
    // still works; one that throws on every keystroke does not.
    // Restored explicitly rather than by restoreAllMocks: happy-dom's Storage is
    // a Proxy, and a spy on it does not reliably come off in afterEach — which
    // leaks a throwing setItem into the next test.
    const spy = vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    try {
      expect(saveDraft("writer", FULL_DRAFT)).toBe(false);
      expect(() => loadDraft("writer")).not.toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it("ignores a corrupt record instead of crashing the screen", () => {
    window.sessionStorage.setItem("ckm:signup-draft:1:writer", "{not json");
    expect(loadDraft("writer")).toBeNull();
  });
});

describe("isResumable", () => {
  it("does not interrupt someone over an empty first step", () => {
    expect(isResumable(null)).toBe(false);
    expect(isResumable({ step: 1, account: {} })).toBe(false);
  });

  it("offers to resume once there is something worth keeping", () => {
    expect(isResumable({ step: 1, account: { name: "Mira" } })).toBe(true);
    expect(isResumable({ step: 4, account: {} })).toBe(true);
    expect(isResumable({ step: 1, accountCreated: true, account: {} })).toBe(true);
  });
});
