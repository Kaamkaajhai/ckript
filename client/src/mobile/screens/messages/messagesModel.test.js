import { describe, expect, it } from "vitest";
import {
  appendUniqueMessage,
  buildConversationList,
  formatMessageDay,
  groupMessageReactions,
  mergeIncomingMessage,
  shouldShowDay,
} from "./messagesModel";

describe("native messaging view model", () => {
  const conversations = [
    { chatId: "a_b", user: { _id: "b", name: "Asha Rao", role: "executive_producer" }, lastMessage: "Hello", timestamp: "2026-08-20T10:00:00Z", unreadCount: 2 },
    { chatId: "a_c", user: { _id: "c", name: "Dev Shah" }, fileUrl: "/draft.pdf", timestamp: "2026-08-21T10:00:00Z" },
  ];

  it("normalizes, filters, and sorts conversation rows", () => {
    const list = buildConversationList(conversations, "asha");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ chatId: "a_b", unreadCount: 2, user: { name: "Asha Rao", role: "executive producer" } });
  });

  it("moves an updated thread to the front and increments only background unread", () => {
    const next = mergeIncomingMessage(conversations, {
      _id: "m2", chatId: "a_b", sender: "b", text: "New", createdAt: "2026-08-21T12:00:00Z",
    }, { activeChatId: "a_c", viewerId: "a" });
    expect(next[0]).toMatchObject({ chatId: "a_b", lastMessage: "New", unreadCount: 3 });

    const active = mergeIncomingMessage(conversations, {
      _id: "m3", chatId: "a_b", sender: "b", text: "Open",
    }, { activeChatId: "a_b", viewerId: "a" });
    expect(active[0].unreadCount).toBe(0);
  });

  it("deduplicates socket echoes and identifies date boundaries", () => {
    const first = { _id: "m1", createdAt: "2026-08-20T10:00:00Z" };
    const second = { _id: "m2", createdAt: "2026-08-21T10:00:00Z" };
    expect(appendUniqueMessage([first], first)).toEqual([first]);
    expect(appendUniqueMessage([first], second)).toEqual([first, second]);
    expect(shouldShowDay([first, second], 0)).toBe(true);
    expect(shouldShowDay([first, second], 1)).toBe(true);
    expect(formatMessageDay("2026-08-20T10:00:00Z", new Date("2026-08-21T12:00:00Z"))).toBe("Yesterday");
  });

  it("groups reaction counts and identifies the viewer's reactions", () => {
    expect(groupMessageReactions([
      { emoji: "👍", userId: "u1" },
      { emoji: "👍", userId: { _id: "u2" } },
      { emoji: "❤️", userId: "u3" },
    ], "u2")).toEqual([
      { emoji: "👍", count: 2, mine: true },
      { emoji: "❤️", count: 1, mine: false },
    ]);
  });
});
