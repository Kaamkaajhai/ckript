import api from "../../services/api";

const clean = (value) => String(value ?? "").trim();

export const MAX_MESSAGE_ATTACHMENT_BYTES = 250 * 1024 * 1024;
export const MESSAGE_ATTACHMENT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "video/*",
  "audio/*",
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".zip",
].join(",");
export const QUICK_MESSAGE_REACTIONS = Object.freeze(["👍", "❤️", "😂", "😮", "😢", "🙏"]);
const MESSAGE_DOCUMENT_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
]);
const MESSAGE_DOCUMENT_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "csv", "zip",
]);

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

/**
 * The deal context is a property of the conversation, not of either renderer.
 * Keep it here so the desktop rail and native sheet agree about linked projects,
 * files, and the admin trailer even when a thread contains deleted messages.
 */
export function getMessageThreadContext(messages = []) {
  const visible = (Array.isArray(messages) ? messages : []).filter((message) => !message?.deleted);
  const linkedProjects = [];
  const projectIndex = new Map();

  // Newest context is primary, but retain every distinct project discussed in a long-running chat.
  [...visible].reverse().forEach((message) => {
    const script = message?.script;
    const id = clean(script?._id || (typeof script === "string" ? script : ""));
    if (!id) return;
    const title = clean(script?.title);
    const existing = projectIndex.get(id);
    if (existing) {
      if (!existing.title && title) existing.title = title;
      return;
    }
    const project = { id, title };
    projectIndex.set(id, project);
    linkedProjects.push(project);
  });

  return {
    primaryProject: linkedProjects[0] || null,
    linkedProjects,
    sharedFiles: visible.filter((message) => Boolean(message?.fileUrl)),
    adminTrailer: [...visible].reverse().find((message) => (
      message?.sender?.role === "admin" && message?.fileType === "video" && message?.fileUrl
    )) || null,
  };
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

export function validateMessageAttachment(file) {
  if (!file) return "Choose a file to attach.";
  if (Number(file.size) > MAX_MESSAGE_ATTACHMENT_BYTES) {
    return "Attachment is too large. Maximum size is 250MB.";
  }
  const mime = clean(file.type).toLowerCase();
  const extension = clean(file.name).toLowerCase().split(".").pop();
  const supported = (
    (mime.startsWith("image/") && mime !== "image/svg+xml")
    || mime.startsWith("video/")
    || mime.startsWith("audio/")
    || MESSAGE_DOCUMENT_MIMES.has(mime)
    || (!mime && MESSAGE_DOCUMENT_EXTENSIONS.has(extension))
  );
  if (!supported) {
    return "Unsupported file type. Choose an image, video, audio, PDF, Office, text, CSV, or ZIP file.";
  }
  return "";
}

export async function uploadConversationAttachment({ file, receiverId, onProgress }, client = api) {
  const recipient = clean(receiverId);
  if (!recipient) throw new TypeError("receiverId is required");
  const validationError = validateMessageAttachment(file);
  if (validationError) throw new TypeError(validationError);

  const body = new FormData();
  body.append("file", file);
  const config = typeof onProgress === "function"
    ? {
        onUploadProgress: ({ loaded = 0, total = 0 } = {}) => {
          const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
          onProgress(percent);
        },
      }
    : undefined;
  const { data } = await client.post(`/messages/upload?receiverId=${encodeURIComponent(recipient)}`, body, config);
  return data;
}

export async function toggleMessageReaction(messageId, emoji, client = api) {
  const id = clean(messageId);
  const reaction = clean(emoji);
  if (!id) throw new TypeError("messageId is required");
  if (!QUICK_MESSAGE_REACTIONS.includes(reaction)) throw new TypeError("Unsupported reaction");
  const { data } = await client.patch(`/messages/${encodeURIComponent(id)}/reaction`, { emoji: reaction });
  return Array.isArray(data) ? data : [];
}

export async function deleteOwnMessage(messageId, client = api) {
  const id = clean(messageId);
  if (!id) throw new TypeError("messageId is required");
  const { data } = await client.delete(`/messages/${encodeURIComponent(id)}`);
  return data;
}
