import { describe, expect, it, vi } from "vitest";
import {
  competitionSubmissionErrorMessage,
  isCompetitionEntrySubmitted,
  submitCompetitionEntry,
} from "./competitionSubmission";

describe("competitionSubmission", () => {
  it("flushes the current draft before freezing the server snapshot", async () => {
    const order = [];
    const flushDraft = vi.fn(async () => { order.push("flush"); return true; });
    const apiClient = {
      post: vi.fn(async () => { order.push("submit"); return { data: { entry: { status: "submitted" } } }; }),
    };

    await expect(submitCompetitionEntry({ apiClient, competitionId: "c1", flushDraft }))
      .resolves.toMatchObject({ entry: { status: "submitted" } });
    expect(order).toEqual(["flush", "submit"]);
    expect(apiClient.post).toHaveBeenCalledWith("/competitions/c1/submit", {
      confirmOriginal: true,
      confirmFinal: true,
    });
  });

  it.each([
    [vi.fn(async () => false), "an explicit false"],
    [vi.fn(async () => { throw new Error("offline"); }), "a thrown save"],
  ])("never submits after %s (%s)", async (flushDraft) => {
    const apiClient = { post: vi.fn() };

    await expect(submitCompetitionEntry({ apiClient, competitionId: "c1", flushDraft }))
      .rejects.toMatchObject({ code: "competition-draft-flush-failed" });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("keeps void-returning legacy flush functions compatible", async () => {
    const apiClient = { post: vi.fn(async () => ({ data: { ok: true } })) };

    await expect(submitCompetitionEntry({
      apiClient,
      competitionId: "c1",
      flushDraft: vi.fn(async () => undefined),
    })).resolves.toEqual({ ok: true });
  });

  it("recognises every server-side submitted lifecycle status", () => {
    expect(isCompetitionEntrySubmitted({ status: "submitted" })).toBe(true);
    expect(isCompetitionEntrySubmitted({ status: "ai_processed" })).toBe(true);
    expect(isCompetitionEntrySubmitted({ status: "judged" })).toBe(true);
    expect(isCompetitionEntrySubmitted({ status: "writing" })).toBe(false);
  });

  it("preserves a server rejection message and supplies a safe fallback", () => {
    expect(competitionSubmissionErrorMessage({ response: { data: { message: "Deadline passed." } } }))
      .toBe("Deadline passed.");
    expect(competitionSubmissionErrorMessage(new Error("network")))
      .toBe("Submission failed. Please try again.");
  });
});
