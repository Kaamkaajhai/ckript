import { describe, expect, it } from "vitest";
import {
  challengeAwardLabel,
  challengeDateRange,
  challengeResultSummary,
  formatChallengeCountdown,
  nextChallengeDeadline,
} from "./challengeHubModel";

describe("native challenge hub model", () => {
  it("names the next phase-specific deadline", () => {
    const dates = { regOpensAt: "open", regClosesAt: "close", startsAt: "start", endsAt: "end" };
    expect(nextChallengeDeadline({ phase: "announced", dates })).toEqual({ label: "Registration opens", at: "open" });
    expect(nextChallengeDeadline({ phase: "registration_open", dates })).toEqual({ label: "Registration closes", at: "close" });
    expect(nextChallengeDeadline({ phase: "registration_closed", dates })).toEqual({ label: "Theme releases", at: "start" });
    expect(nextChallengeDeadline({ phase: "live", dates })).toEqual({ label: "Writing deadline", at: "end" });
    expect(nextChallengeDeadline({ phase: "judging", dates })).toBeNull();
  });

  it("formats bounded countdown and archive language", () => {
    const now = new Date("2026-08-22T00:00:00.000Z").getTime();
    expect(formatChallengeCountdown(now + 90_000, now)).toBe("1m 30s");
    expect(formatChallengeCountdown(now + 90_000_000, now)).toBe("1d 1h");
    expect(formatChallengeCountdown(now - 1, now)).toBe("Now");
    expect(challengeResultSummary({ resultsDeclaredAt: null })).toContain("not been announced");
    expect(challengeResultSummary({ resultsDeclaredAt: "now", winner: { name: "Mira" } })).toBe("Winner: Mira");
  });

  it("keeps authored special-award labels and tolerates missing dates", () => {
    expect(challengeAwardLabel({ result: { award: "special", specialTitle: "Best Dialogue" } })).toBe("Best Dialogue");
    expect(challengeDateRange({})).toBe("Dates to be announced");
  });
});
