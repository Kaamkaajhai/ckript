import { describe, expect, it } from "vitest";
import {
  buildProjectDetailEndpoint,
  isProjectBookmarked,
  readAccessFailure,
  readBookmarkIds,
} from "./useProjectDetail";

describe("which endpoint answers for which route form", () => {
  it("resolves the id form by id and both path forms by path", () => {
    expect(buildProjectDetailEndpoint({ id: "p1" })).toBe("/scripts/p1");
    expect(buildProjectDetailEndpoint({ projectHeading: "monsoon", writerUsername: "mira" }))
      .toBe("/scripts/path/monsoon/mira");
    // `/script/:heading/:writer` and the root-level catch-all arrive with identical params, which
    // is why one screen serves all three.
    expect(buildProjectDetailEndpoint({ id: "p1", projectHeading: "monsoon", writerUsername: "mira" }))
      .toBe("/scripts/path/monsoon/mira");
  });

  it("encodes both segments, because a project heading is writer-authored text", () => {
    expect(buildProjectDetailEndpoint({ projectHeading: "a b/c", writerUsername: "mi ra" }))
      .toBe("/scripts/path/a%20b%2Fc/mi%20ra");
  });

  it("falls back to the id form when a pair is incomplete", () => {
    expect(buildProjectDetailEndpoint({ id: "p1", projectHeading: "monsoon" })).toBe("/scripts/p1");
  });
});

describe("classifying a failed load", () => {
  const failWith = (status, message, extra = {}) => ({ response: { status, data: { message, ...extra } } });

  it("treats a 403 as a product state with no retry", () => {
    const classified = readAccessFailure(failWith(403, "Sign up with a business email.", { requiresBusinessEmail: true }));
    expect(classified.blocked).toBe(true);
    expect(classified.requiresBusinessEmail).toBe(true);
  });

  it("recognises the blocked responses that do not arrive as a 403", () => {
    // Inherited, not invented: some of these come back with a non-403 status and only the sentence
    // identifies them. Losing this would turn an account decision into an endless retry loop.
    for (const message of [
      "Please login with a company email",
      "You must purchase a plan to continue",
      "A business email is required",
      "Use your company email address",
    ]) {
      expect(readAccessFailure(failWith(400, message)).blocked, message).toBe(true);
    }
  });

  it("treats everything else as a failure the viewer may retry, and marks 404 separately", () => {
    const server = readAccessFailure(failWith(500, "Server exploded"));
    expect(server.blocked).toBe(false);
    expect(server.notFound).toBe(false);

    expect(readAccessFailure(failWith(404, "Script not found")).notFound).toBe(true);
  });

  it("always produces a sentence, including for a network error with no response", () => {
    const offline = readAccessFailure(new Error("Network Error"));
    expect(offline.blocked).toBe(false);
    expect(offline.message.length).toBeGreaterThan(0);
  });
});

describe("reading the viewer's bookmarks", () => {
  it("accepts both shapes the account is cached in", () => {
    // `favoriteScripts` is a list of ids from one endpoint and a list of populated documents from
    // another, depending on which one last wrote the cached user.
    expect(readBookmarkIds({ favoriteScripts: ["a", { _id: "b" }, null, {}] })).toEqual(["a", "b"]);
    expect(readBookmarkIds({})).toEqual([]);
    expect(readBookmarkIds(null)).toEqual([]);
  });

  it("does not report a bookmark for a project with no id", () => {
    expect(isProjectBookmarked({ favoriteScripts: ["a"] }, "a")).toBe(true);
    expect(isProjectBookmarked({ favoriteScripts: ["a"] }, "b")).toBe(false);
    expect(isProjectBookmarked({ favoriteScripts: ["a"] }, "")).toBe(false);
  });
});
