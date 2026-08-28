import { describe, expect, it } from "vitest";
import {
  landingAccountPath,
  landingActionLabels,
  landingDiscoveryPath,
  landingWriterPath,
} from "./landingModel";

describe("landingModel", () => {
  it("keeps anonymous actions modal-owned", () => {
    expect(landingAccountPath(null)).toBe("");
    expect(landingDiscoveryPath(null)).toBe("");
    expect(landingWriterPath(null)).toBe("");
    expect(landingActionLabels(null)).toEqual({
      account: "Sign in",
      discovery: "Browse scripts",
      writer: "Start with your script",
    });
  });

  it.each([
    ["writer", "/dashboard", "/featured", "/new-project"],
    ["creator", "/dashboard", "/featured", "/new-project"],
    ["producer", "/home", "/featured", "/home"],
    ["actor", "/home", "/featured", "/home"],
    ["reader", "/reader", "/reader/search", "/reader"],
    ["admin", "/admin", "/admin", "/admin"],
    ["finance", "/finance", "/finance", "/finance"],
    ["unknown", "/profile", "/profile", "/profile"],
  ])("resolves %s member actions without reopening onboarding", (role, account, discovery, writer) => {
    const user = { role };
    expect(landingAccountPath(user)).toBe(account);
    expect(landingDiscoveryPath(user)).toBe(discovery);
    expect(landingWriterPath(user)).toBe(writer);
  });
});
