import { describe, expect, it, vi } from "vitest";
import {
  buildMessageChatId,
  getMessagePreview,
  getMessagingError,
  loadConversationMessages,
  loadMessageConversations,
  markConversationRead,
  deleteOwnMessage,
  sendConversationMessage,
  toggleMessageReaction,
  uploadConversationAttachment,
  validateMessageAttachment,
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

  it("validates and uploads an attachment for one intended recipient with normalized progress", async () => {
    const file = new File(["draft"], "draft.txt", { type: "text/plain" });
    const client = { post: vi.fn().mockResolvedValue({ data: { fileUrl: "https://files.test/draft.txt", fileGrant: "grant" } }) };
    const progress = vi.fn();

    await expect(uploadConversationAttachment({ file, receiverId: " writer-2 ", onProgress: progress }, client))
      .resolves.toMatchObject({ fileGrant: "grant" });
    const [path, body, config] = client.post.mock.calls[0];
    expect(path).toBe("/messages/upload?receiverId=writer-2");
    expect(body.get("file")).toBe(file);
    config.onUploadProgress({ loaded: 5, total: 8 });
    expect(progress).toHaveBeenLastCalledWith(63);
    expect(validateMessageAttachment({ size: 250 * 1024 * 1024 + 1 })).toContain("250MB");
    expect(validateMessageAttachment({ name: "unsafe.svg", type: "image/svg+xml", size: 12 })).toContain("Unsupported");
    expect(validateMessageAttachment({ name: "malware.exe", type: "application/x-msdownload", size: 12 })).toContain("Unsupported");
  });

  it("shares reaction and own-message deletion operations", async () => {
    const client = {
      patch: vi.fn().mockResolvedValue({ data: [{ emoji: "👍", userId: "u1" }] }),
      delete: vi.fn().mockResolvedValue({ data: { success: true, messageId: "m/1" } }),
    };
    await expect(toggleMessageReaction("m/1", "👍", client)).resolves.toHaveLength(1);
    await expect(deleteOwnMessage("m/1", client)).resolves.toMatchObject({ success: true });
    expect(client.patch).toHaveBeenCalledWith("/messages/m%2F1/reaction", { emoji: "👍" });
    expect(client.delete).toHaveBeenCalledWith("/messages/m%2F1");
    await expect(toggleMessageReaction("m1", "not-an-emoji", client)).rejects.toThrow("Unsupported");
    await expect(deleteOwnMessage("", client)).rejects.toThrow("messageId");
  });
});
