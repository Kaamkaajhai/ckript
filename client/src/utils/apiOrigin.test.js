import { describe, expect, it } from "vitest";

import { isVercelHostname } from "./apiOrigin.js";

describe("isVercelHostname", () => {
  it("recognizes Vercel hosts using DNS label boundaries", () => {
    expect(isVercelHostname("https://project.vercel.app/api")).toBe(true);
    expect(isVercelHostname("https://vercel.app")).toBe(true);
  });

  it("rejects substring lookalikes and unrelated URL components", () => {
    expect(isVercelHostname("https://project.vercel.app.evil.test")).toBe(false);
    expect(isVercelHostname("https://evil.test/vercel.app")).toBe(false);
    expect(isVercelHostname("https://notvercel.app")).toBe(false);
  });

  it("rejects malformed and empty values", () => {
    expect(isVercelHostname("vercel.app")).toBe(false);
    expect(isVercelHostname("")).toBe(false);
  });
});
