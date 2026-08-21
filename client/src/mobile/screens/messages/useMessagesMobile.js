import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  buildMessageChatId,
  getMessagePreview,
  getMessagingError,
  loadConversationMessages,
  loadMessageConversations,
  markConversationRead,
  sendConversationMessage,
} from "../../../features/messages-operator/messageContract";
import { getApiOrigin, isSocketSupported } from "../../../utils/apiOrigin";
import { appendUniqueMessage, mergeIncomingMessage } from "./messagesModel";

export const MESSAGE_LOAD_STATUS = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  FAILED: "failed",
});

const sessionToken = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")?.token || "";
  } catch {
    return "";
  }
};

export default function useMessagesMobile(user) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(MESSAGE_LOAD_STATUS.LOADING);
  const [threadStatus, setThreadStatus] = useState(MESSAGE_LOAD_STATUS.READY);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [sending, setSending] = useState(false);
  const activeChatRef = useRef(null);
  const conversationsRef = useRef([]);
  const socketRef = useRef(null);
  const threadRequestRef = useRef(0);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!user?._id) {
      setStatus(MESSAGE_LOAD_STATUS.READY);
      return [];
    }
    if (!silent) setStatus(MESSAGE_LOAD_STATUS.LOADING);
    try {
      const next = await loadMessageConversations();
      setConversations(next);
      setError("");
      setStatus(MESSAGE_LOAD_STATUS.READY);
      return next;
    } catch (requestError) {
      if (!silent) {
        setError(getMessagingError(requestError, "Could not load your conversations."));
        setStatus(MESSAGE_LOAD_STATUS.FAILED);
      }
      return [];
    }
  }, [user?._id]);

  const loadThread = useCallback(async (conversation, { silent = false } = {}) => {
    if (!conversation?.chatId || conversation.isPending) {
      setMessages([]);
      setThreadStatus(MESSAGE_LOAD_STATUS.READY);
      return;
    }
    const requestId = ++threadRequestRef.current;
    if (!silent) setThreadStatus(MESSAGE_LOAD_STATUS.LOADING);
    try {
      const next = await loadConversationMessages(conversation.chatId);
      if (requestId !== threadRequestRef.current) return;
      setMessages(next);
      setThreadStatus(MESSAGE_LOAD_STATUS.READY);
      setSendError("");
      setConversations((current) => current.map((item) => (
        item.chatId === conversation.chatId ? { ...item, unreadCount: 0 } : item
      )));
      markConversationRead(conversation.chatId).catch(() => {});
    } catch (requestError) {
      if (requestId !== threadRequestRef.current || silent) return;
      setSendError(getMessagingError(requestError, "Could not load this conversation."));
      setThreadStatus(MESSAGE_LOAD_STATUS.FAILED);
    }
  }, []);

  useEffect(() => {
    let live = true;
    if (!user?._id) return undefined;
    loadMessageConversations()
      .then((next) => {
        if (!live) return;
        setConversations(next);
        setError("");
        setStatus(MESSAGE_LOAD_STATUS.READY);
      })
      .catch((requestError) => {
        if (!live) return;
        setError(getMessagingError(requestError, "Could not load your conversations."));
        setStatus(MESSAGE_LOAD_STATUS.FAILED);
      });
    return () => { live = false; };
  }, [user?._id]);

  const queryKey = searchParams.toString();
  useEffect(() => {
    if (status !== MESSAGE_LOAD_STATUS.READY || !user?._id) return;
    let live = true;
    const syncFromUrl = async () => {
      // Defer state synchronization out of the effect body. The URL is the
      // external store; this task applies its selection after React commits it.
      await Promise.resolve();
      if (!live) return;
      const threadId = searchParams.get("thread") || "";
      const recipientId = searchParams.get("recipientId") || "";
      let selected = threadId ? conversations.find((item) => item.chatId === threadId) : null;

      if (!selected && recipientId) {
        const chatId = buildMessageChatId(user._id, recipientId);
        selected = conversations.find((item) => item.chatId === chatId) || {
          chatId,
          user: {
            _id: recipientId,
            name: searchParams.get("recipientName") || "Ckript member",
            role: searchParams.get("recipientRole") || "",
            profileImage: "",
          },
          lastMessage: "",
          timestamp: new Date().toISOString(),
          unreadCount: 0,
          isPending: true,
        };
      }

      if (!selected) {
        activeChatRef.current = null;
        setActiveChat(null);
        setMessages([]);
        setSendError(threadId ? "That conversation is no longer available." : "");
        return;
      }
      if (activeChatRef.current?.chatId === selected.chatId) return;
      activeChatRef.current = selected;
      setActiveChat(selected);
      setSendError("");
      loadThread(selected);
    };
    syncFromUrl();
    return () => { live = false; };
  }, [conversations, loadThread, queryKey, searchParams, status, user?._id]);

  const openConversation = useCallback((conversation) => {
    setSearchParams({ thread: conversation.chatId });
  }, [setSearchParams]);

  const closeConversation = useCallback(() => {
    threadRequestRef.current += 1;
    activeChatRef.current = null;
    setActiveChat(null);
    setMessages([]);
    setSendError("");
    setSearchParams({});
  }, [setSearchParams]);

  const send = useCallback(async (body) => {
    const text = String(body || "").trim();
    const conversation = activeChatRef.current;
    if (!text || !conversation?.user?._id || sending) return { ok: false };

    setSending(true);
    setSendError("");
    const temporaryId = `pending-${Date.now()}`;
    const optimistic = {
      _id: temporaryId,
      chatId: conversation.chatId,
      sender: { _id: user._id, name: user.name, role: user.role, profileImage: user.profileImage },
      receiver: conversation.user._id,
      text,
      createdAt: new Date().toISOString(),
      read: false,
      pending: true,
    };
    setMessages((current) => [...current, optimistic]);

    try {
      const saved = await sendConversationMessage({ receiverId: conversation.user._id, text });
      setMessages((current) => current
        .filter((message) => message._id !== saved._id)
        .map((message) => message._id === temporaryId ? saved : message));
      const promoted = {
        ...conversation,
        isPending: false,
        lastMessage: getMessagePreview(saved),
        timestamp: saved.createdAt || new Date().toISOString(),
        unreadCount: 0,
      };
      activeChatRef.current = promoted;
      setActiveChat(promoted);
      setConversations((current) => [promoted, ...current.filter((item) => item.chatId !== promoted.chatId)]);
      setSending(false);
      return { ok: true, message: saved };
    } catch (requestError) {
      setMessages((current) => current.filter((message) => message._id !== temporaryId));
      const message = getMessagingError(requestError, "Could not send your message.");
      setSendError(message);
      setSending(false);
      return { ok: false, error: message };
    }
  }, [sending, user]);

  useEffect(() => {
    if (!user?._id || !isSocketSupported()) return undefined;
    const client = io(getApiOrigin(), { auth: { token: sessionToken() } });
    socketRef.current = client;
    client.on("receive-message", (message) => {
      const current = activeChatRef.current;
      if (current?.chatId === message?.chatId) {
        setMessages((items) => appendUniqueMessage(items, message));
        markConversationRead(current.chatId).catch(() => {});
      }
      const next = mergeIncomingMessage(conversationsRef.current, message, {
          activeChatId: current?.chatId,
          viewerId: user._id,
      });
      if (next === conversationsRef.current) reload({ silent: true });
      else setConversations(next);
    });
    client.on("message-deleted", ({ messageId }) => {
      setMessages((items) => items.filter((message) => message._id !== messageId));
    });
    return () => {
      client.close();
      socketRef.current = null;
    };
  }, [reload, user?._id]);

  useEffect(() => {
    if (!socketRef.current || !activeChat?.chatId) return;
    socketRef.current.emit("join-chat", activeChat.chatId);
  }, [activeChat?.chatId]);

  const refresh = useCallback(async () => {
    await reload({ silent: true });
    if (activeChatRef.current && threadStatus !== MESSAGE_LOAD_STATUS.LOADING) {
      await loadThread(activeChatRef.current, { silent: true });
    }
  }, [loadThread, reload, threadStatus]);

  useEffect(() => {
    if (!user?._id) return undefined;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "hidden") refresh();
    }, 8000);
    return () => window.clearInterval(interval);
  }, [refresh, user?._id]);

  return useMemo(() => ({
    status,
    threadStatus,
    conversations,
    activeChat,
    messages,
    error,
    sendError,
    sending,
    reload,
    refresh,
    openConversation,
    closeConversation,
    retryThread: () => activeChatRef.current && loadThread(activeChatRef.current),
    send,
  }), [activeChat, closeConversation, conversations, error, loadThread, messages, openConversation, refresh, reload, send, sendError, sending, status, threadStatus]);
}
