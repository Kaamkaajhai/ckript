import api from "../../services/api";

const clean = (value) => String(value ?? "").trim();

export function buildMessageChatId(firstUserId, secondUserId) {
  const ids = [clean(firstUserId), clean(secondUserId)];
  if (ids.some((id) => !id)) return "";
  return ids.sort().join("_");
}

export function getMessagePreview(message = {}) {
  const body = clean(message.text);
  if (body) return body;
  if (message.fileType === "video") return "🎬 Trailer Video";
  if (message.fileType === "image") return "📷 Image";
  if (message.fileUrl) return "📎 File";
  return "";
}

export function getMessagingError(error, fallback = "Messaging is unavailable right now.") {
  const code = error?.response?.data?.code;
  if (code === "PURCHASE_REQUIRED") {
    return "Purchase a project from this writer first to unlock messaging.";
  }
  if (code === "QUOTA_EXCEEDED") {
    return error?.response?.data?.message || "Your direct-message allowance has been reached.";
  }
  if (code === "USER_BLOCKED") {
    return "Messaging is unavailable because one of you has blocked the other.";
  }
  return error?.response?.data?.message || fallback;
}

export async function loadMessageConversations(client = api) {
  const { data } = await client.get("/messages/conversations");
  return Array.isArray(data) ? data : [];
}

export async function loadConversationMessages(chatId, client = api) {
  const key = clean(chatId);
  if (!key) return [];
  const { data } = await client.get(`/messages/${encodeURIComponent(key)}`);
  return Array.isArray(data) ? data : [];
}

export async function markConversationRead(chatId, client = api) {
  const key = clean(chatId);
  if (!key) return { success: false };
  const { data } = await client.patch(`/messages/${encodeURIComponent(key)}/read`);
  return data;
}

export async function sendConversationMessage({ receiverId, text = "", ...extra }, client = api) {
  const recipient = clean(receiverId);
  const body = clean(text);
  if (!recipient) throw new TypeError("receiverId is required");
  if (!body && !extra.fileUrl) throw new TypeError("A message or attachment is required");

  const { data } = await client.post("/messages/send", {
    receiverId: recipient,
    text: body,
    ...extra,
  });
  return data;
}
