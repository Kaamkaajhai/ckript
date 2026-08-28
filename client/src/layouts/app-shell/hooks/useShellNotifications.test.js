import { describe, expect, it } from "vitest";
import { loadSeenToastIds } from "./useShellNotifications";

describe("notification toast persistence", () => {
  it("restores only a stored id list for the current account", () => {
    const storage = { getItem: (key) => key === "ck_seen_toasts_writer-1" ? '["n1","n2"]' : null };
    expect([...loadSeenToastIds("writer-1", storage)]).toEqual(["n1", "n2"]);
    expect([...loadSeenToastIds("writer-2", storage)]).toEqual([]);
  });

  it("fails closed for malformed or non-list storage", () => {
    expect([...loadSeenToastIds("writer-1", { getItem: () => "not-json" })]).toEqual([]);
    expect([...loadSeenToastIds("writer-1", { getItem: () => '{"id":"n1"}' })]).toEqual([]);
  });
});
