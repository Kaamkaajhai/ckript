import { describe, expect, it } from "vitest";
import {
  createLatestProfileRequestCoordinator,
  getAuthenticatedProfileShell,
  getSharedProfileExperience,
  isSameProfile,
  isWriterProfileRole,
} from "./profilePolicy";

describe("profile presentation policy", () => {
  it.each(["writer", "creator", " Writer ", "CREATOR"])(
    "recognizes %s as a writer profile independently of the viewer",
    (role) => {
      expect(isWriterProfileRole(role)).toBe(true);
    }
  );

  it("does not apply the writer workspace to an industry profile", () => {
    expect(isWriterProfileRole("producer")).toBe(false);
  });

  it("distinguishes ownership by stable ids, not object identity", () => {
    expect(isSameProfile({ _id: "user-1" }, { _id: "user-1" })).toBe(true);
    expect(isSameProfile({ _id: "user-1" }, { _id: "user-2" })).toBe(false);
  });

  it("mounts profiles edge-to-edge for creator and non-creator viewers", () => {
    expect(getAuthenticatedProfileShell("writer")).toEqual({
      layout: "dashboard",
      contentVariant: "fill",
    });
    expect(getAuthenticatedProfileShell("producer")).toEqual({
      layout: "main",
      contentVariant: "full",
    });
    expect(getAuthenticatedProfileShell("reader")).toEqual({
      layout: "main",
      contentVariant: "full",
    });
  });

  it("upgrades copied share links to the real profile for signed-in viewers", () => {
    expect(getSharedProfileExperience({ _id: "viewer-1" })).toBe("authenticated");
    expect(getSharedProfileExperience(null)).toBe("public");
  });

  it("cancels an obsolete profile request when navigation starts a newer one", () => {
    const requests = createLatestProfileRequestCoordinator();
    const first = requests.begin();
    const second = requests.begin();

    expect(first.controller.signal.aborted).toBe(true);
    expect(second.controller.signal.aborted).toBe(false);
    expect(requests.isCurrent(first.requestId)).toBe(false);
    expect(requests.isCurrent(second.requestId)).toBe(true);
  });
});
