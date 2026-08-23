import { describe, expect, it } from "vitest";
import { blogPosts, genrePages, guidePages, marketingPages } from "./seoContent";
import {
  getSeoPageContent,
  isMissingSeoContentPath,
  isSeoContentRoutePath,
  resolveSeoPageContent,
  titleFromPath,
} from "./seoPageContent";

const nativeMarketingPaths = marketingPages
  .map(({ path }) => path)
  .filter((path) => path !== "/pricing");
const registeredPaths = [
  ...nativeMarketingPaths,
  ...blogPosts.map(({ slug }) => `/resources/blog/${slug}`),
  ...Object.keys(genrePages).map((slug) => `/genre/${slug}`),
  ...Object.keys(guidePages),
];

describe("SEO page content resolver", () => {
  it.each(registeredPaths)("resolves registered content for %s", (pathname) => {
    const result = resolveSeoPageContent(pathname);
    expect(isSeoContentRoutePath(pathname)).toBe(true);
    expect(isMissingSeoContentPath(pathname)).toBe(false);
    expect(result.found).toBe(true);
    expect(result.content.h1).toBeTruthy();
    expect(result.content.eyebrow).toBeTruthy();
    expect(result.seo.canonicalPath).toBe(pathname);
    expect(result.smartLinks.length).toBeGreaterThan(0);
    expect(result.smartLinks).not.toContain(pathname);
  });

  it.each([
    "/features/not-registered",
    "/for/not-registered",
    "/industries/not-registered",
    "/resources/not-registered",
    "/resources/blog/not-registered",
    "/tools/not-registered",
    "/genre/not-registered",
  ])("returns an explicit not-found state for %s", (pathname) => {
    const result = resolveSeoPageContent(pathname);
    expect(isSeoContentRoutePath(pathname)).toBe(true);
    expect(isMissingSeoContentPath(pathname)).toBe(true);
    expect(result.found).toBe(false);
    expect(result.content.eyebrow).toBe("Page not found");
    expect(result.content.sections).toEqual([]);
    expect(result.smartLinks).toEqual(["/features", "/for", "/resources", "/tools"]);
  });

  it("keeps the content lookup pure and labels human-readable paths", () => {
    expect(getSeoPageContent("/features/ai-script-analysis")?.eyebrow).toBe("AI Script Analysis");
    expect(getSeoPageContent("/features/not-registered")).toBeNull();
    expect(titleFromPath("/how-to-find-film-investors")).toBe("How To Find Film Investors");
    expect(isSeoContentRoutePath("/pricing")).toBe(false);
    expect(isMissingSeoContentPath("/future/route")).toBe(false);
  });
});
