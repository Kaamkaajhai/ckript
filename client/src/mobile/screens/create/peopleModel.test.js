import { describe, expect, it } from "vitest";
import {
  accessChoices,
  buildAccessRows,
  buildPresenceRows,
  describeInvite,
  inviteRoleOptions,
} from "./peopleModel";

/*
 * The permission rules, which are the one thing on this surface whose wrong
 * answer is a security-shaped bug rather than a layout one — so they are a
 * function with tests instead of ternaries inside JSX.
 */

const entries = [
  { _id: "e1", user: { _id: "u2", name: "Meher", email: "meher@example.com" }, role: "editor", accessLevel: "content_only", status: "accepted", isActive: true },
  { _id: "e2", user: { _id: "u1", name: "Arshad", email: "arshad@example.com" }, role: "full_admin", accessLevel: "full_access", status: "accepted", isActive: true },
  { _id: "e3", invitedEmail: "new@example.com", role: "commenter", status: "pending", isActive: true },
];

describe("buildAccessRows — who may manage whom", () => {
  it("lets only the owner manage anyone", () => {
    const asOwner = buildAccessRows(entries, { isOwner: true, myUserId: "u1" });
    const asGuest = buildAccessRows(entries, { isOwner: false, myUserId: "u2" });
    expect(asOwner.map((r) => r.canManage)).toEqual([true, false, true]);
    expect(asGuest.every((r) => r.canManage === false)).toBe(true);
  });

  it("never lets the owner remove themselves", () => {
    const rows = buildAccessRows(entries, { isOwner: true, myUserId: "u1" });
    const me = rows.find((r) => r.isMe);
    expect(me.name).toBe("Arshad");
    // Orphaning the panel by removing its only manager is not a state to offer.
    expect(me.canManage).toBe(false);
  });

  it("identifies a pending invite by its embedded row, even when it has no user record yet", () => {
    const rows = buildAccessRows(entries, { isOwner: true, myUserId: "u1", pending: true });
    const invited = rows.find((r) => r.name === "new@example.com");
    expect(invited.key).toBe("e3");
    expect(invited.canManage).toBe(true);
    expect(invited.pending).toBe(true);
  });

  it("states the access level in words rather than a stored value", () => {
    const rows = buildAccessRows(entries, { isOwner: true, myUserId: "u1" });
    expect(rows[0].accessLabel).toBe("Content only");
    expect(rows[1].accessLabel).toBe("Full access");
    expect(rows[0].roleLabel).toBe("Co-writer");
  });
});

describe("accessChoices — DEF-16", () => {
  it("offers the access choice only where it has more than one answer", () => {
    // Desktop renders a <select> whose ONLY option is "Content" for every
    // non-admin — a control that cannot change anything, which §2.8 forbids.
    expect(accessChoices({ role: "editor" })).toEqual([]);
    expect(accessChoices({ role: "commenter" })).toEqual([]);
    expect(accessChoices({ role: "full_admin" }).map((c) => c.value))
      .toEqual(["full_access", "content_only"]);
  });

  it("survives a missing row", () => {
    expect(accessChoices(null)).toEqual([]);
  });
});

describe("buildPresenceRows", () => {
  it("says what each person is doing, and where", () => {
    const rows = buildPresenceRows([
      { userId: "u1", name: "Arshad", color: "#c46a3f", state: "editing", sceneHeading: "INT. KITCHEN - DAY" },
      { userId: "u2", name: "Meher", state: "viewing" },
    ], { myUserId: "u1" });
    expect(rows[0]).toMatchObject({ isYou: true, activity: "Editing · INT. KITCHEN - DAY" });
    // No scene: a verb on its own, never a dangling separator.
    expect(rows[1]).toMatchObject({ isYou: false, activity: "Viewing" });
  });

  it("returns nothing for nobody, rather than a row saying so", () => {
    expect(buildPresenceRows([])).toEqual([]);
    expect(buildPresenceRows(null)).toEqual([]);
  });
});

describe("describeInvite", () => {
  it("refuses a non-owner with the reason", () => {
    const state = describeInvite({ isOwner: false, email: "x@y.com" });
    expect(state.enabled).toBe(false);
    expect(state.reason).toMatch(/owner/i);
  });

  it("says nothing about an empty field — empty is not wrong, it is unfilled", () => {
    const state = describeInvite({ isOwner: true, email: "" });
    expect(state.reason).toBe("");
    expect(state.canSend).toBe(false);
  });

  it("complains only once there is something to judge", () => {
    expect(describeInvite({ isOwner: true, email: "meher" }).reason).toMatch(/email address/i);
    expect(describeInvite({ isOwner: true, email: "meher@example.com" }).canSend).toBe(true);
  });

  it("will not send twice", () => {
    expect(describeInvite({ isOwner: true, email: "a@b.co", sending: true }).canSend).toBe(false);
  });
});

describe("inviteRoleOptions", () => {
  it("offers exactly the roles the server accepts", () => {
    // A role missing from the server list is silently downgraded to "editor" on
    // invite, so offering one that is not there grants more than the label says.
    expect(inviteRoleOptions().map((o) => o.value))
      .toEqual(["editor", "commenter", "viewer", "full_admin"]);
  });
});
