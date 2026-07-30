import { describe, it, expect } from "vitest";
import {
  getNotificationTarget,
  getNotificationActionLabel,
} from "./notificationTargets";

/*
 * A script needs BOTH a title and a writer username for getScriptCanonicalPath
 * to produce the pretty "/heading/username" form; with only one it falls back to
 * "/script/:id". Both are valid destinations, so the fixtures cover both shapes.
 */
const script = {
  _id: "s1",
  title: "The Long Walk",
  creator: { writerProfile: { username: "ada" } },
};
const scriptWithoutSlug = { _id: "s1" };
const from = { _id: "u2", name: "Ada" };
const viewer = { _id: "u1", role: "producer" };

describe("getNotificationTarget", () => {
  /*
   * The regression this module was extracted to fix. Both shells sent these to
   * "/purchase-requests", which is not a declared route — it fell through to the
   * "/:id" catch-all and rendered a profile page for a user named
   * "purchase-requests".
   */
  it.each(["purchase_request", "purchase_rejected"])(
    "%s goes to the script, never to the non-existent /purchase-requests",
    (type) => {
      const target = getNotificationTarget({ type, script }, viewer);
      expect(target).not.toBe("/purchase-requests");
      expect(target).toBe("/the-long-walk/ada");
    },
  );

  it("still resolves a script target when only the id is known", () => {
    expect(getNotificationTarget({ type: "purchase_request", script: scriptWithoutSlug }, viewer))
      .toBe("/script/s1");
  });

  it("never dead-ends a purchase notification that carries no script", () => {
    expect(getNotificationTarget({ type: "purchase_request" }, viewer)).toBe("/dashboard");
  });

  it("routes fixed-destination types", () => {
    expect(getNotificationTarget({ type: "message_request" }, viewer)).toBe("/messages");
    expect(getNotificationTarget({ type: "follow_request", from }, viewer)).toBe("/follow-requests");
    expect(getNotificationTarget({ type: "admin_alert" }, viewer)).toBe("/profile");
  });

  it.each([
    "unlock", "script_score", "trailer_ready", "hold", "collab_invite", "revision_update",
  ])("%s opens the script it concerns", (type) => {
    expect(getNotificationTarget({ type, script }, viewer)).toBe("/the-long-walk/ada");
  });

  it.each(["follow", "profile_view", "like", "comment"])(
    "%s opens the profile of whoever caused it",
    (type) => {
      expect(getNotificationTarget({ type, from }, viewer)).toBeTruthy();
    },
  );

  it("returns null for a type with nowhere to go, so the panel just opens", () => {
    expect(getNotificationTarget({ type: "something_new" }, viewer)).toBeNull();
    expect(getNotificationTarget({ type: "follow" }, viewer)).toBeNull(); // no `from`
  });

  it("tolerates junk without throwing", () => {
    for (const input of [undefined, null, {}, { type: null }]) {
      expect(() => getNotificationTarget(input, viewer)).not.toThrow();
    }
  });
});

describe("getNotificationActionLabel", () => {
  it("asks for a decision on things that need one", () => {
    expect(getNotificationActionLabel({ type: "purchase_request" })).toBe("Review");
    expect(getNotificationActionLabel({ type: "follow_request" })).toBe("Review");
    expect(getNotificationActionLabel({ type: "message_request" })).toBe("Reply");
  });

  it("falls back to Open", () => {
    expect(getNotificationActionLabel({ type: "unlock" })).toBe("Open");
    expect(getNotificationActionLabel({})).toBe("Open");
  });
});
