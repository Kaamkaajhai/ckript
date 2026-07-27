import { useEffect, useState, useContext, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { isSocketSupported } from "../../utils/apiOrigin";
import MessagesSkeleton from "../../components/skeleton/MessagesSkeleton";
import MeetingModal from "../../components/MeetingModal";
import {
  MessageCircle, ChevronLeft, Send, Lock, Search, X, Check, CheckCheck, Smile,
  Trash2, Video, FileText, Paperclip, Loader2, Download, ShieldCheck, ArrowRight,
  ChevronDown, ArrowUpDown, CheckSquare, Info, MoreVertical, User, Slash,
  Calendar, Film, Archive,
} from "lucide-react";
import "./MessagesOperatorPage.css";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "").replace(/\/$/, "");

/* ── helpers ──────────────────────────────────────────────────── */
const buildChatId = (a, b) => {
  const sorted = [a.toString(), b.toString()].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

const formatTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDay = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

const getMessagePreview = (msg) =>
  msg?.text ||
  (msg?.fileType === "video"
    ? "🎬 Trailer Video"
    : msg?.fileType === "image"
      ? "📷 Image"
      : msg?.fileUrl
        ? "📎 File"
        : "");

const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_ORIGIN}${url}`;
};

const formatFileSize = (bytes = 0) => {
  const size = Number(bytes || 0);
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const initialsOf = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const REACTION_HIDE_DELAY_MS = 900;
const MAX_ATTACHMENT_SIZE_BYTES = 250 * 1024 * 1024;
const FILTERS = [
  ["all", "All"],
  ["unread", "Unread"],
  ["investors", "Investors"],
  ["admin", "Admin"],
];
const SORTS = [
  ["recent", "Most recent"],
  ["unread", "Unread first"],
  ["name", "Name A–Z"],
];

/* small avatar — real profile image, initials fallback */
const Avatar = ({ user, size = "" }) => {
  const src = user?.profileImage
    ? user.profileImage.startsWith("http")
      ? user.profileImage
      : `${API_ORIGIN}${user.profileImage}`
    : "";
  const cls = `mo-cav ${size} ${user?.role === "admin" ? "ink" : ""}`.trim();
  if (src) return <img className={cls} src={src} alt={user?.name || ""} />;
  return <div className={cls}>{initialsOf(user?.name)}</div>;
};

/* ═══════════════════════════════════════════════════════════════
   MESSAGES · OPERATOR CONSOLE (Wireframe 2 · Design 2)
═══════════════════════════════════════════════════════════════ */
const MessagesOperatorPage = () => {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /* core state (ported from the production Messages feature) */
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [emojiPicker, setEmojiPicker] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [trailerActionLoading, setTrailerActionLoading] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);

  /* Operator-specific view state */
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [ctxOpen, setCtxOpen] = useState(true);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [showMeeting, setShowMeeting] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeChatRef = useRef(null);
  const shouldAutoScrollRef = useRef(false);
  const previousChatIdRef = useRef("");
  const reactionHideTimerRef = useRef(null);

  const isWriter = user && ["writer", "creator"].includes(user.role);
  const isInvestor = user && user.role === "investor";

  const scrollMessagesToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    setShowScrollToBottomButton(false);
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollToBottomButton(distanceFromBottom > 96);
  };

  const clearReactionHideTimer = () => {
    if (!reactionHideTimerRef.current) return;
    clearTimeout(reactionHideTimerRef.current);
    reactionHideTimerRef.current = null;
  };

  const scheduleReactionHide = (delay = REACTION_HIDE_DELAY_MS) => {
    clearReactionHideTimer();
    reactionHideTimerRef.current = setTimeout(() => {
      setHoveredMsg(null);
      setEmojiPicker(null);
      reactionHideTimerRef.current = null;
    }, delay);
  };

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => () => clearReactionHideTimer(), []);

  /* close menus on outside click / Escape */
  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest?.(".mo-menuwrap")) {
        setSortMenuOpen(false);
        setMoreMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setSortMenuOpen(false);
      setMoreMenuOpen(false);
      setEmojiPicker(null);
      setDeleteModal(null);
      setChatSearchOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* ── Socket setup ────────────────────────────────────────── */
  useEffect(() => {
    if (!user?._id || !isSocketSupported()) return;

    const storedSession = localStorage.getItem("user");
    let socketToken = "";
    if (storedSession) {
      try { socketToken = JSON.parse(storedSession)?.token || ""; } catch { socketToken = ""; }
    }

    const sock = io(API_ORIGIN, { auth: { token: socketToken } });
    setSocket(sock);

    sock.on("receive-message", (msg) => {
      const currentChat = activeChatRef.current;
      const senderId = msg?.sender?._id || msg?.sender;
      const isMine = senderId?.toString() === user?._id?.toString();
      const isActiveThread = currentChat?.chatId === msg?.chatId;

      if (isActiveThread) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.chatId === msg.chatId);
        if (index === -1) return prev;
        const current = prev[index];
        const updated = {
          ...current,
          lastMessage: getMessagePreview(msg),
          timestamp: msg.createdAt || new Date().toISOString(),
          unreadCount: isMine || isActiveThread ? 0 : (current.unreadCount || 0) + 1,
        };
        return [updated, ...prev.filter((_, i) => i !== index)];
      });
    });

    sock.on("message-deleted", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, deleted: true, text: "" } : m))
      );
    });

    return () => sock.close();
  }, [user?._id]);

  /* typing listener re-bound to active chat */
  useEffect(() => {
    if (!socket) return;
    socket.off("user-typing");
    socket.on("user-typing", ({ chatId, userId }) => {
      if (activeChat?.chatId === chatId && userId !== user._id) {
        setIsTyping(true);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setIsTyping(false), 2500);
      }
    });
  }, [socket, activeChat, user?._id]);

  /* ── Load conversations ─────────────────────────────────── */
  const loadMessages = useCallback(async (chatId, { silent = false } = {}) => {
    if (!chatId) return;
    if (!silent) setMessagesLoading(true);
    try {
      const { data } = await api.get(`/messages/${chatId}`);
      const next = Array.isArray(data) ? data : [];
      setMessages((prev) => {
        const sameLength = prev.length === next.length;
        const sameFirst = prev[0]?._id === next[0]?._id;
        const sameLast = prev[prev.length - 1]?._id === next[next.length - 1]?._id;
        if (sameLength && sameFirst && sameLast) return prev;
        return next;
      });
    } catch {
      if (!silent) setMessages([]);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get("/messages/conversations");
      const next = Array.isArray(data) ? data : [];
      setConversations(next);
      const activeId = activeChatRef.current?.chatId;
      if (activeId) {
        const refreshed = next.find((c) => c.chatId === activeId);
        if (refreshed) setActiveChat((curr) => (curr ? { ...curr, ...refreshed } : curr));
      }
    } catch {
      if (!silent) setConversations([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?._id) { setLoading(false); return; }
    loadConversations();
  }, [user?._id, loadConversations]);

  /* ── Select conversation ────────────────────────────────── */
  const handleSelectChat = useCallback((conv) => {
    setSendError("");
    setIsTyping(false);
    setEmojiPicker(null);
    setChatSearch("");
    setChatSearchOpen(false);
    setActiveChat(conv);
    loadMessages(conv.chatId);
    setConversations((prev) =>
      prev.map((c) => (c.chatId === conv.chatId ? { ...c, unreadCount: 0 } : c))
    );
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [loadMessages]);

  /* ── URL param: open chat from ScriptDetail / Search ────── */
  useEffect(() => {
    if (loading) return;
    const recipientId = searchParams.get("recipientId");
    const recipientName = searchParams.get("recipientName") || "Writer";
    const recipientRole = searchParams.get("recipientRole") || (isInvestor ? "writer" : "investor");
    if (!recipientId || !(isInvestor || isWriter)) return;

    const chatId = buildChatId(user._id, recipientId);
    const existing = conversations.find((c) => c.chatId === chatId);
    if (existing) { handleSelectChat(existing); return; }

    setActiveChat({
      chatId,
      user: { _id: recipientId, name: recipientName, role: recipientRole, profileImage: "" },
      lastMessage: "",
      timestamp: new Date().toISOString(),
      isPending: true,
    });
    setMessages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  /* join socket room */
  useEffect(() => {
    if (socket && activeChat) socket.emit("join-chat", activeChat.chatId);
  }, [socket, activeChat]);

  /* auto-scroll */
  useEffect(() => {
    const currentChatId = activeChat?.chatId || "";
    if (!currentChatId) {
      previousChatIdRef.current = "";
      shouldAutoScrollRef.current = false;
      setShowScrollToBottomButton(false);
      return;
    }
    const chatChanged = previousChatIdRef.current !== currentChatId;
    if (chatChanged) {
      previousChatIdRef.current = currentChatId;
      shouldAutoScrollRef.current = true;
      scrollMessagesToBottom("auto");
      return;
    }
    if (!shouldAutoScrollRef.current) return;
    shouldAutoScrollRef.current = false;
    scrollMessagesToBottom("smooth");
  }, [activeChat?.chatId, messages.length]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!activeChat?.chatId || !container) { setShowScrollToBottomButton(false); return; }
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollToBottomButton(distanceFromBottom > 96);
  }, [activeChat?.chatId, messages.length, isTyping]);

  /* background sync */
  useEffect(() => {
    if (!user?._id) return;
    const interval = setInterval(async () => {
      await loadConversations({ silent: true });
      const activeId = activeChatRef.current?.chatId;
      if (activeId) await loadMessages(activeId, { silent: true });
    }, 4000);
    return () => clearInterval(interval);
  }, [user?._id, loadConversations, loadMessages]);

  /* ── Send message ───────────────────────────────────────── */
  const sendTextMessage = async (textToSend, extraPayload = {}) => {
    setSendError("");
    const hasAttachment = Boolean(extraPayload?.fileUrl);
    if ((!textToSend?.trim() && !hasAttachment) || !activeChat) return false;

    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      _id: tempId,
      chatId: activeChat.chatId,
      sender: { _id: user._id, name: user.name, profileImage: user.profileImage, role: user.role },
      receiver: activeChat.user._id,
      text: textToSend || "",
      fileUrl: extraPayload.fileUrl,
      fileType: extraPayload.fileType,
      fileName: extraPayload.fileName,
      fileSize: extraPayload.fileSize,
      createdAt: new Date().toISOString(),
      read: false,
    };

    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, optimistic]);
    const sentText = textToSend;

    try {
      const { data: saved } = await api.post("/messages/send", {
        receiverId: activeChat.user._id,
        text: sentText || "",
        ...extraPayload,
      });
      setMessages((prev) => prev.map((m) => (m._id === tempId ? saved : m)));
      socket?.emit("send-message", { ...saved, chatId: activeChat.chatId });

      if (activeChat.isPending) {
        const promoted = { ...activeChat, lastMessage: getMessagePreview(saved), isPending: false };
        setConversations((prev) => [promoted, ...prev]);
        setActiveChat(promoted);
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.chatId === activeChat.chatId
              ? { ...c, lastMessage: getMessagePreview(saved), timestamp: new Date().toISOString() }
              : c
          )
        );
      }
      return true;
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      const code = err.response?.data?.code;
      setSendError(
        code === "PURCHASE_REQUIRED"
          ? "Purchase a project from this writer first to unlock messaging."
          : err.response?.data?.message || "Failed to send message."
      );
      return false;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text && !attachment) return;

    const attachmentPayload = attachment
      ? {
          fileUrl: attachment.fileUrl,
          fileType: attachment.fileType,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
        }
      : {};

    setNewMessage("");
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const sent = await sendTextMessage(text, attachmentPayload);
    if (!sent && attachmentPayload.fileUrl) setAttachment(attachment);
  };

  const handlePickAttachment = () => {
    if (!activeChat || uploadingAttachment) return;
    fileInputRef.current?.click();
  };

  const handleAttachmentChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSendError("");
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setSendError("Attachment is too large. Maximum size is 250MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/messages/upload", formData);
      setAttachment(data);
    } catch (err) {
      setSendError(err.response?.data?.message || "Failed to upload attachment.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleTrailerFeedback = async (msg, action) => {
    if (!msg || !["approved", "revision_requested"].includes(action)) return;
    const scriptId = msg.script?._id || msg.script;
    const feedbackText =
      action === "approved"
        ? `Looks good. I approve this AI trailer: ${msg.fileUrl}`
        : "Please provide a better AI trailer version with improved quality/story impact.";
    if (scriptId) {
      setTrailerActionLoading(msg._id);
      try {
        await api.post(`/scripts/${scriptId}/trailer-feedback`, {
          action,
          note: action === "revision_requested" ? "Writer requested a better trailer version" : "",
          trailerUrl: msg.fileUrl || "",
        });
      } catch (err) {
        setSendError(err.response?.data?.message || "Failed to update trailer status.");
        setTrailerActionLoading("");
        return;
      }
      setTrailerActionLoading("");
    }
    await sendTextMessage(feedbackText.trim(), scriptId ? { scriptId } : {});
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (socket && activeChat) socket.emit("typing", { chatId: activeChat.chatId, userId: user._id });
  };

  const handleReaction = async (messageId, emoji) => {
    scheduleReactionHide(1100);
    try {
      const { data: reactions } = await api.patch(`/messages/${messageId}/reaction`, { emoji });
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)));
    } catch { /* silent */ }
  };

  const handleDelete = async (messageId) => {
    setDeleteModal(null);
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, deleted: true, text: "" } : m))
      );
      socket?.emit("message-deleted", { chatId: activeChat.chatId, messageId });
    } catch { /* silent */ }
  };

  /* ── Operator actions ───────────────────────────────────── */
  const togglePick = (chatId) => {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(chatId) ? next.delete(chatId) : next.add(chatId);
      return next;
    });
  };

  const exitSelectMode = () => { setSelectMode(false); setPicked(new Set()); };

  const bulkMarkRead = () => {
    if (!picked.size) return;
    setConversations((prev) =>
      prev.map((c) => (picked.has(c.chatId) ? { ...c, unreadCount: 0 } : c))
    );
    exitSelectMode();
  };

  const handleBlockUser = async () => {
    if (!activeChat?.user?._id) return;
    setMoreMenuOpen(false);
    setBlockLoading(true);
    try {
      await api.post("/users/block", { userId: activeChat.user._id });
      setSendError("You have blocked this user. Messaging is now disabled for this conversation.");
    } catch (err) {
      setSendError(err.response?.data?.message || "Failed to block user.");
    } finally {
      setBlockLoading(false);
    }
  };

  const openProfile = () => {
    setMoreMenuOpen(false);
    if (activeChat?.user?._id) navigate(`/profile/${activeChat.user._id}`);
  };

  /* ── derived deal context from the real thread ──────────── */
  const scriptFromThread = useMemo(
    () => messages.find((m) => m.script && (m.script._id || typeof m.script === "string"))?.script || null,
    [messages]
  );
  const sharedFiles = useMemo(
    () => messages.filter((m) => m.fileUrl && !m.deleted),
    [messages]
  );
  const adminTrailer = useMemo(
    () => messages.find((m) => (m.sender?.role === "admin") && m.fileType === "video" && m.fileUrl),
    [messages]
  );

  const otherIsInvestor = activeChat?.user?.role === "investor";
  const scriptId = scriptFromThread?._id || (typeof scriptFromThread === "string" ? scriptFromThread : null);
  const scriptTitle = scriptFromThread?.title || "";

  /* ── filtered + sorted conversation list ────────────────── */
  const visibleConvs = useMemo(() => {
    let list = conversations;
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter((c) => c.user?.name?.toLowerCase().includes(q));
    if (filter === "unread") list = list.filter((c) => (c.unreadCount || 0) > 0);
    else if (filter === "investors") list = list.filter((c) => c.user?.role === "investor");
    else if (filter === "admin") list = list.filter((c) => c.user?.role === "admin");

    if (sort === "unread") list = [...list].sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
    else if (sort === "name") list = [...list].sort((a, b) => (a.user?.name || "").localeCompare(b.user?.name || ""));
    else list = [...list].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return list;
  }, [conversations, searchQuery, filter, sort]);

  const filterCounts = useMemo(() => ({
    all: conversations.length,
    unread: conversations.filter((c) => (c.unreadCount || 0) > 0).length,
    investors: conversations.filter((c) => c.user?.role === "investor").length,
    admin: conversations.filter((c) => c.user?.role === "admin").length,
  }), [conversations]);

  const visibleMessages = useMemo(() => {
    if (!chatSearchOpen || !chatSearch.trim()) return messages;
    const q = chatSearch.trim().toLowerCase();
    return messages.filter((m) => (m.text || "").toLowerCase().includes(q));
  }, [messages, chatSearchOpen, chatSearch]);

  if (loading) return <div className="messages-operator-page"><MessagesSkeleton /></div>;

  const writerLocked = isWriter && !messagesLoading && messages.length === 0;

  /* ── render one message row ─────────────────────────────── */
  const renderMessage = (msg, i, list) => {
    const senderId = msg.sender?._id || msg.sender;
    const isMine = senderId?.toString() === user._id?.toString();
    const showDateSep = i === 0 || !isSameDay(list[i - 1].createdAt, msg.createdAt);
    const isDeleted = msg.deleted;
    const isAdmin = !isMine && msg.sender?.role === "admin";
    const groupedReactions = (msg.reactions || []).reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc;
    }, {});
    const myReactions = new Set((msg.reactions || []).filter((r) => (r.userId?._id || r.userId)?.toString() === user._id?.toString()).map((r) => r.emoji));

    return (
      <div key={msg._id || i}>
        {showDateSep && (
          <div className="mo-daysep"><i /><span>{formatDay(msg.createdAt)}</span><i /></div>
        )}
        <div
          className={`mo-row ${isMine ? "me" : ""}`}
          onMouseEnter={() => { clearReactionHideTimer(); setHoveredMsg(msg._id); }}
          onMouseLeave={() => scheduleReactionHide()}
        >
          {!isMine && <Avatar user={msg.sender} size="sm" />}
          <div className="mo-bwrap">
            {/* hover actions */}
            {!isDeleted && hoveredMsg === msg._id && (
              <div className="mo-hov" onMouseEnter={clearReactionHideTimer} onMouseLeave={() => scheduleReactionHide()}>
                <button
                  title="React"
                  onClick={() => { clearReactionHideTimer(); setHoveredMsg(msg._id); setEmojiPicker(emojiPicker === msg._id ? null : msg._id); }}
                >
                  <Smile size={14} />
                </button>
                {isMine && (
                  <button className="del" title="Delete" onClick={() => setDeleteModal(msg._id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
            {/* emoji picker */}
            {emojiPicker === msg._id && (
              <div className="mo-picker" onMouseEnter={clearReactionHideTimer} onMouseLeave={() => scheduleReactionHide()}>
                {QUICK_EMOJIS.map((em) => (
                  <button key={em} onClick={() => handleReaction(msg._id, em)}>{em}</button>
                ))}
              </div>
            )}

            <div className={`mo-bub ${isMine ? "mine" : "them"} ${isDeleted ? "deleted" : ""}`}>
              {isDeleted ? (
                <span>This message was deleted</span>
              ) : (
                <>
                  {isAdmin && <div className="mo-admlab">Platform Admin</div>}
                  {msg.fileUrl && msg.fileType === "image" ? (
                    <div className="mo-att-img">
                      <img src={resolveMediaUrl(msg.fileUrl)} alt={msg.fileName || "attachment"} />
                    </div>
                  ) : msg.fileUrl && msg.fileType === "video" ? (
                    <div className="mo-att-vid-wrap">
                      <div className="mo-att-vid">
                        <video src={resolveMediaUrl(msg.fileUrl)} controls preload="metadata" />
                      </div>
                      <a className="mo-vlnk" href={resolveMediaUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
                        <Video size={13} /> Open trailer in new tab
                      </a>
                    </div>
                  ) : msg.fileUrl ? (
                    <div className="mo-att-file">
                      <div style={{ minWidth: 0 }}>
                        <b><FileText size={13} /> <span>{msg.fileName || "Attachment"}</span></b>
                        {msg.fileSize ? <small>{formatFileSize(msg.fileSize)}</small> : null}
                      </div>
                      <a className="mo-op" href={resolveMediaUrl(msg.fileUrl)} target="_blank" rel="noreferrer">
                        <Download size={11} /> Open
                      </a>
                    </div>
                  ) : null}
                  {msg.text ? (
                    <div className={msg.fileUrl ? "mo-att-txt" : ""}>
                      {scriptTitle && msg.text.includes(scriptTitle) ? (
                        <span>
                          {msg.text.split(scriptTitle).reduce((acc, part, idx, arr) => {
                            acc.push(<span key={`t${idx}`}>{part}</span>);
                            if (idx < arr.length - 1) {
                              acc.push(
                                <button key={`l${idx}`} className="mo-lnk" onClick={() => scriptId && navigate(`/script/${scriptId}`)}>
                                  {scriptTitle}
                                </button>
                              );
                            }
                            return acc;
                          }, [])}
                        </span>
                      ) : msg.text}
                    </div>
                  ) : null}
                  <div className="mo-ts">
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMine && (msg.read ? <CheckCheck size={12} className="rr-read" /> : <Check size={12} />)}
                  </div>
                </>
              )}
            </div>

            {/* reactions */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="mo-rc">
                {Object.entries(groupedReactions).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    className={myReactions.has(emoji) ? "mine" : ""}
                    onClick={() => handleReaction(msg._id, emoji)}
                  >
                    {emoji} {count}
                  </button>
                ))}
              </div>
            )}

            {/* writer trailer feedback */}
            {!isMine && isWriter && isAdmin && msg.fileType === "video" && msg.fileUrl && (
              <div className="mo-trailer-fb">
                <button className="mo-btn-xs approve" disabled={trailerActionLoading === msg._id}
                  onClick={() => handleTrailerFeedback(msg, "approved")}>
                  <Check size={12} /> {trailerActionLoading === msg._id ? "Saving…" : "Use This Trailer"}
                </button>
                <button className="mo-btn-xs revise" disabled={trailerActionLoading === msg._id}
                  onClick={() => handleTrailerFeedback(msg, "revision_requested")}>
                  <ArrowRight size={12} /> {trailerActionLoading === msg._id ? "Saving…" : "Request Better Version"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="messages-operator-page">
      <div className={`mo-console ${activeChat ? "thread-open" : ""}`}>

        {/* ═══════════ LIST COLUMN ═══════════ */}
        <div className="mo-listcol">
          <div className="mo-listhd">
            <h4>Inbox</h4>
            <span className="mo-lockbadge"><Lock size={11} /> {isWriter ? "Purchase unlocked" : "Unlocked"}</span>
          </div>

          <div className="mo-subtool">
            <div className="mo-searchbox">
              <Search size={13} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
              />
              {searchQuery && (
                <button className="mo-clr" onClick={() => setSearchQuery("")}><X size={13} /></button>
              )}
            </div>
            <div className="mo-menuwrap">
              <button className={`mo-tbtn ${sortMenuOpen ? "on" : ""}`} title="Sort"
                onClick={(e) => { e.stopPropagation(); setSortMenuOpen((v) => !v); setMoreMenuOpen(false); }}>
                <ArrowUpDown size={13} />
              </button>
              {sortMenuOpen && (
                <div className="mo-menu">
                  {SORTS.map(([v, label]) => (
                    <button key={v} className={sort === v ? "sel" : ""}
                      onClick={() => { setSort(v); setSortMenuOpen(false); }}>
                      {label}<span className="mo-ck"><Check size={13} /></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className={`mo-tbtn ${selectMode ? "on" : ""}`} title="Select"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}>
              <CheckSquare size={13} />
            </button>
          </div>

          <div className="mo-segbar">
            {FILTERS.map(([v, label]) => (
              <button key={v} className={`mo-seg ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}>
                {label}<span className="c">{filterCounts[v]}</span>
              </button>
            ))}
          </div>

          {selectMode && picked.size > 0 && (
            <div className="mo-bulkbar">
              <b>{picked.size} selected</b>
              <button className="mo-btn" onClick={bulkMarkRead}><CheckCheck size={12} /> Mark read</button>
              <button className="mo-btn" style={{ marginLeft: "auto" }} onClick={exitSelectMode}>Clear</button>
            </div>
          )}

          <div className="mo-convscroll">
            {visibleConvs.length === 0 ? (
              <div className="mo-list-empty">
                <div className="big"><MessageCircle size={22} strokeWidth={1.6} /></div>
                <h4>{searchQuery || filter !== "all" ? "No conversations found" : "No conversations yet"}</h4>
                <p>
                  {searchQuery || filter !== "all"
                    ? "Try a different name, or clear the filter."
                    : isWriter
                      ? "After an approved purchase, you or the investor can start the conversation."
                      : "Purchase a project to unlock messaging with the writer."}
                </p>
              </div>
            ) : (
              visibleConvs.map((conv) => {
                const isSelected = activeChat?.chatId === conv.chatId;
                const hasUnread = (conv.unreadCount || 0) > 0;
                const isPicked = picked.has(conv.chatId);
                return (
                  <div
                    key={conv.chatId}
                    className={`mo-conv ${isSelected && !selectMode ? "on" : ""} ${hasUnread ? "unreadrow" : ""} ${isPicked ? "picked" : ""}`}
                    onClick={() => (selectMode ? togglePick(conv.chatId) : handleSelectChat(conv))}
                  >
                    {selectMode && (
                      <div className="mo-chk">{isPicked ? <Check size={12} /> : null}</div>
                    )}
                    <Avatar user={conv.user} />
                    <div className="mo-body">
                      <div className="mo-nm">
                        <b>{conv.user?.name}</b>
                        <span>{formatTime(conv.timestamp)}</span>
                      </div>
                      <div className="mo-pv">
                        <p>{conv.lastMessage || "Start a conversation"}</p>
                        {hasUnread && (
                          <span className="mo-unread">{conv.unreadCount > 9 ? "9+" : conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════════ THREAD COLUMN ═══════════ */}
        <div className="mo-threadcol">
          {!activeChat ? (
            <div className="mo-empty">
              <div className="big"><MessageCircle size={38} strokeWidth={1.5} /></div>
              <h4>Your Messages</h4>
              <p>
                {isInvestor
                  ? "Select a conversation or purchase a project to unlock messaging with its writer."
                  : isWriter
                    ? "After a purchase is approved, you can start a conversation with that investor here."
                    : "Select a conversation from the left to start chatting."}
              </p>
              {isInvestor && (
                <button className="mo-btn" onClick={() => navigate("/search")}>
                  Browse Projects <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            <>
              {/* thread sub-toolbar */}
              <div className="mo-chat-toolbar">
                <button className="mo-back" onClick={() => setActiveChat(null)}><ChevronLeft size={18} /></button>
                <Avatar user={activeChat.user} size="sm" />
                <div className="mo-chat-id">
                  <b>{activeChat.user?.name}</b>
                  <div className="mo-role">
                    {activeChat.user?.role} {isTyping ? <span className="typ">· typing…</span> : ""}
                  </div>
                </div>
                <div className="mo-toolacts">
                  {isInvestor && scriptId && (
                    <button className="mo-tbtn" onClick={() => setShowMeeting(true)}>
                      <Calendar size={13} /> Meeting
                    </button>
                  )}
                  <button className={`mo-tbtn ${chatSearchOpen ? "on" : ""}`} title="Search in conversation"
                    onClick={() => { setChatSearchOpen((v) => !v); setChatSearch(""); }}>
                    <Search size={13} />
                  </button>
                  <button className={`mo-tbtn ${ctxOpen ? "on" : ""}`} title="Deal details"
                    onClick={() => setCtxOpen((v) => !v)}>
                    <Info size={13} />
                  </button>
                  <div className="mo-menuwrap">
                    <button className={`mo-tbtn ${moreMenuOpen ? "on" : ""}`}
                      onClick={(e) => { e.stopPropagation(); setMoreMenuOpen((v) => !v); setSortMenuOpen(false); }}>
                      <MoreVertical size={13} />
                    </button>
                    {moreMenuOpen && (
                      <div className="mo-menu right">
                        <button onClick={openProfile}><User size={13} /> View profile</button>
                        <button className="danger" onClick={handleBlockUser} disabled={blockLoading}>
                          <Slash size={13} /> {blockLoading ? "Blocking…" : "Block user"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* deal strip */}
              <div className="mo-dealstrip">
                {scriptTitle ? (
                  <button className="mo-chip accent" onClick={() => scriptId && navigate(`/script/${scriptId}`)}>
                    <FileText size={12} /> {scriptTitle}
                  </button>
                ) : (
                  <span className="mo-chip"><FileText size={12} /> No linked script yet</span>
                )}
                {otherIsInvestor && (
                  <span className="mo-chip g"><ShieldCheck size={12} /> Verified Investor</span>
                )}
                {adminTrailer && (
                  <span className="mo-chip a"><Film size={12} /> AI trailer shared</span>
                )}
                <span className="mo-chip"><Paperclip size={12} /> {sharedFiles.length} file{sharedFiles.length === 1 ? "" : "s"}</span>
              </div>

              {/* in-thread search */}
              {chatSearchOpen && (
                <div className="mo-searchchat">
                  <div className="mo-searchbox">
                    <Search size={13} />
                    <input autoFocus value={chatSearch} onChange={(e) => setChatSearch(e.target.value)}
                      placeholder="Search in this conversation…" />
                    {chatSearch && <button className="mo-clr" onClick={() => setChatSearch("")}><X size={13} /></button>}
                  </div>
                </div>
              )}

              {/* messages */}
              <div className="mo-msgs" ref={messagesContainerRef} onScroll={handleMessagesScroll}>
                {messagesLoading ? (
                  <div className="mo-spin"><i /></div>
                ) : messages.length === 0 ? (
                  <div className="mo-empty">
                    <div className="big" style={{ width: 56, height: 56, borderRadius: 16 }}>
                      <MessageCircle size={26} strokeWidth={1.6} />
                    </div>
                    <h4 style={{ fontSize: 16 }}>No messages yet</h4>
                    <p style={{ fontSize: 12.5 }}>
                      {isWriter
                        ? "Waiting for the investor to send the first message."
                        : "Send the first message to start the conversation."}
                    </p>
                  </div>
                ) : visibleMessages.length === 0 ? (
                  <div className="mo-empty">
                    <div className="big" style={{ width: 56, height: 56, borderRadius: 16 }}>
                      <Search size={24} strokeWidth={1.6} />
                    </div>
                    <h4 style={{ fontSize: 16 }}>No matches</h4>
                    <p style={{ fontSize: 12.5 }}>No messages match “{chatSearch}”.</p>
                  </div>
                ) : (
                  visibleMessages.map((msg, i) => renderMessage(msg, i, visibleMessages))
                )}

                {isTyping && (
                  <div className="mo-row">
                    <Avatar user={activeChat.user} size="sm" />
                    <div className="mo-typing"><i /><i /><i /></div>
                  </div>
                )}
                <div ref={messagesEndRef} />

                {showScrollToBottomButton && (
                  <button className="mo-s2b" title="Scroll to latest" onClick={() => scrollMessagesToBottom("smooth")}>
                    <ChevronDown size={18} />
                  </button>
                )}
              </div>

              {/* composer / locked bar */}
              {writerLocked ? (
                <div className="mo-locked-bar">
                  <Lock size={13} /> Waiting for the investor to send the first message.
                </div>
              ) : (
                <div className="mo-composer">
                  {sendError && (
                    <div className="mo-errbar"><Lock size={13} /> {sendError}</div>
                  )}
                  {attachment && (
                    <div className="mo-attchip">
                      <div className="info">
                        <b>{attachment.fileName || "Attachment"}</b>
                        <small>{attachment.fileType} · {formatFileSize(attachment.fileSize)}</small>
                      </div>
                      <button className="x" onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <form className="mo-crow" onSubmit={handleSendMessage}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: "none" }}
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip"
                      onChange={handleAttachmentChange}
                    />
                    <button type="button" className="mo-ib" title="Attach file (≤250 MB)"
                      onClick={handlePickAttachment} disabled={uploadingAttachment}>
                      {uploadingAttachment ? <Loader2 size={18} className="mo-rot" /> : <Paperclip size={18} />}
                    </button>
                    <div className="mo-cfield">
                      <input
                        ref={inputRef}
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder={isWriter ? "Reply with text or attach file…" : "Type a message or attach file…"}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSendMessage(e); }}
                      />
                    </div>
                    <button type="submit" className="mo-send"
                      disabled={uploadingAttachment || (!newMessage.trim() && !attachment)}>
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══════════ CONTEXT COLUMN ═══════════ */}
        {activeChat && ctxOpen && (
          <aside className="mo-ctx">
            <div className="mo-sec mo-ctxhead">
              <Avatar user={activeChat.user} size="lg" />
              <span className="mo-name">{activeChat.user?.name}</span>
              {otherIsInvestor ? (
                <div style={{ marginTop: 8 }}><span className="mo-vbadge"><ShieldCheck size={12} /> Verified Investor</span></div>
              ) : (
                <div className="mo-role" style={{ marginTop: 6 }}>{activeChat.user?.role}</div>
              )}
              <div className="mo-ctxactions">
                <button className="mo-btn" onClick={openProfile}><User size={12} /> Profile</button>
                <button className="mo-btn danger" onClick={handleBlockUser} disabled={blockLoading}>
                  <Slash size={12} /> {blockLoading ? "…" : "Block"}
                </button>
              </div>
            </div>

            {scriptTitle && (
              <div className="mo-sec">
                <h5>Unlocked this chat</h5>
                <button className="mo-proj" onClick={() => scriptId && navigate(`/script/${scriptId}`)}>
                  <div className="mo-thumb" />
                  <div className="mo-pi">
                    <b>{scriptTitle}</b>
                    <small>Open script page</small>
                  </div>
                </button>
              </div>
            )}

            <div className="mo-sec">
              <h5>AI Trailer status</h5>
              {adminTrailer ? (
                <div className="mo-statline"><span className="mo-sdot" style={{ background: "#a56c19" }} /> Trailer shared — review in thread</div>
              ) : (
                <div className="mo-statline faint"><span className="mo-sdot" style={{ background: "#a39d92" }} /> No trailer yet</div>
              )}
            </div>

            <div className="mo-sec">
              <h5>Shared files ({sharedFiles.length})</h5>
              {sharedFiles.length === 0 ? (
                <div className="mo-statline faint">No files shared yet</div>
              ) : (
                sharedFiles.map((m) => (
                  <div className="mo-filetile" key={m._id}>
                    <div className="mo-ft">
                      {m.fileType === "video" ? <Video size={14} /> : m.fileType === "image" ? <FileText size={14} /> : <FileText size={14} />}
                    </div>
                    <div className="mo-fn">
                      <div className="n">{m.fileName || "Attachment"}</div>
                      {m.fileSize ? <div className="s">{formatFileSize(m.fileSize)}</div> : null}
                    </div>
                    <a className="mo-dl" href={resolveMediaUrl(m.fileUrl)} target="_blank" rel="noreferrer" title="Open">
                      <Download size={14} />
                    </a>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      {/* meeting modal (investor → writer scheduling) */}
      {isInvestor && (
        <MeetingModal
          isOpen={showMeeting}
          onClose={() => setShowMeeting(false)}
          writerId={activeChat?.user?._id}
          scriptId={scriptId}
          writerName={activeChat?.user?.name}
          scriptName={scriptTitle}
          onMeetingScheduled={() => setShowMeeting(false)}
        />
      )}

      {/* delete confirmation modal */}
      {deleteModal && (
        <div className="mo-scrim" onClick={() => setDeleteModal(null)}>
          <div className="mo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mic"><Trash2 size={22} /></div>
            <h4>Delete message?</h4>
            <p>This action cannot be undone.</p>
            <div className="mo-mbtns">
              <button className="mo-btn" onClick={() => setDeleteModal(null)}>Cancel</button>
              <button className="mo-btn confirm" onClick={() => handleDelete(deleteModal)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesOperatorPage;
