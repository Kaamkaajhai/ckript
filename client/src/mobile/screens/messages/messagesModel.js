import { getMessagePreview } from "../../../features/messages-operator/messageContract";

const clean = (value) => String(value ?? "").trim();

export function messageSenderId(message = {}) {
  return clean(message.sender?._id || message.sender);
}

export function buildConversationList(conversations = [], query = "") {
  const needle = clean(query).toLocaleLowerCase();
  return (Array.isArray(conversations) ? conversations : [])
    .map((conversation) => {
      const member = conversation?.user || {};
      return {
        ...conversation,
        chatId: clean(conversation?.chatId),
        user: {
          ...member,
          _id: clean(member._id),
          name: clean(member.name) || "Ckript member",
          role: clean(member.role).replace(/_/g, " "),
        },
        lastMessage: clean(conversation?.lastMessage) || "Start the conversation",
        unreadCount: Math.max(0, Number(conversation?.unreadCount) || 0),
      };
    })
    .filter(({ chatId, user }) => chatId && user._id)
    .filter(({ user, lastMessage }) => (
      !needle
      || user.name.toLocaleLowerCase().includes(needle)
      || lastMessage.toLocaleLowerCase().includes(needle)
    ))
    .sort((first, second) => new Date(second.timestamp || 0) - new Date(first.timestamp || 0));
}

export function mergeIncomingMessage(conversations, message, { activeChatId = "", viewerId = "" } = {}) {
  const chatId = clean(message?.chatId);
  const senderId = messageSenderId(message);
  const existing = (Array.isArray(conversations) ? conversations : []).find((item) => item.chatId === chatId);
  if (!chatId || !existing) return conversations;

  const isMine = senderId === clean(viewerId);
  const isActive = chatId === clean(activeChatId);
  const updated = {
    ...existing,
    lastMessage: getMessagePreview(message),
    timestamp: message.createdAt || new Date().toISOString(),
    unreadCount: isMine || isActive ? 0 : (Number(existing.unreadCount) || 0) + 1,
  };
  return [updated, ...conversations.filter((item) => item.chatId !== chatId)];
}

export function appendUniqueMessage(messages, message) {
  if (!message?._id) return messages;
  if (messages.some((item) => item._id === message._id)) return messages;
  return [...messages, message];
}

export function formatConversationStamp(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function formatMessageDay(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

export function shouldShowDay(messages, index) {
  if (index === 0) return true;
  return new Date(messages[index - 1]?.createdAt).toDateString()
    !== new Date(messages[index]?.createdAt).toDateString();
}
