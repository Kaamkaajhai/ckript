import { describe, expect, it, vi } from "vitest";
import {
  buildMessageChatId,
  getMessagePreview,
  getMessagingError,
  loadConversationMessages,
  loadMessageConversations,
  markConversationRead,
  sendConversationMessage,
} from "./messageContract";

describe("shared messaging contract", () => {
  it("builds one stable chat id for either participant order", () => {
    expect(buildMessageChatId("writer-2", "investor-1")).toBe("investor-1_writer-2");
    expect(buildMessageChatId("investor-1", "writer-2")).toBe("investor-1_writer-2");
    expect(buildMessageChatId("", "writer-2")).toBe("");
  });

  it("derives useful previews for text and attachments", () => {
    expect(getMessagePreview({ text: "  Hello  " })).toBe("Hello");
    expect(getMessagePreview({ fileType: "image", fileUrl: "/image.jpg" })).toBe("📷 Image");
    expect(getMessagePreview({ fileType: "video", fileUrl: "/clip.mp4" })).toBe("🎬 Trailer Video");
    expect(getMessagePreview({ fileType: "document", fileUrl: "/draft.pdf" })).toBe("📎 File");
  });

  it("normalizes list envelopes and encodes chat ids", async () => {
    const client = {
      get: vi.fn()
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: [{ _id: "m1" }] }),
      patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    };
    await expect(loadMessageConversations(client)).resolves.toEqual([]);
    await expect(loadConversationMessages("a/b", client)).resolves.toEqual([{ _id: "m1" }]);
    await expect(markConversationRead("a/b", client)).resolves.toEqual({ success: true });
    expect(client.get).toHaveBeenLastCalledWith("/messages/a%2Fb");
    expect(client.patch).toHaveBeenCalledWith("/messages/a%2Fb/read");
  });

  it("trims text and refuses invalid sends before the network", async () => {
    const client = { post: vi.fn().mockResolvedValue({ data: { _id: "m1" } }) };
    await expect(sendConversationMessage({ receiverId: " u2 ", text: " hi " }, client))
      .resolves.toEqual({ _id: "m1" });
    expect(client.post).toHaveBeenCalledWith("/messages/send", { receiverId: "u2", text: "hi" });
    await expect(sendConversationMessage({ receiverId: "", text: "hello" }, client)).rejects.toThrow("receiverId");
    await expect(sendConversationMessage({ receiverId: "u2", text: "   " }, client)).rejects.toThrow("message");
  });

  it("turns server policy codes into durable user-facing errors", () => {
    expect(getMessagingError({ response: { data: { code: "PURCHASE_REQUIRED" } } })).toContain("Purchase");
    expect(getMessagingError({ response: { data: { code: "USER_BLOCKED" } } })).toContain("blocked");
    expect(getMessagingError({ response: { data: { message: "Try later" } } })).toBe("Try later");
  });
});
