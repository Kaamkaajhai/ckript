import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import {
  MessageCircle, ChevronLeft, Send, Lock, Info, Search, X,
  Check, CheckCheck, Smile, Trash2, MoreVertical, Image,
  ShieldCheck, ArrowRight,
} from "lucide-react";

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

const isSameDay = (a, b) =>
  new Date(a).toDateString() === new Date(b).toDateString();

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

/* ═══════════════════════════════════════════════════════════════
   MESSAGES PAGE
═══════════════════════════════════════════════════════════════ */
const Messages = () => {
  const { user } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /* state */
  const [conversations, setConversations] = useState([]);
  const [filteredConvs, setFilteredConvs] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [emojiPicker, setEmojiPicker] = useState(null); // messageId
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // messageId

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);

  const isWriter = user && ["writer", "creator"].includes(user.role);
  const isInvestor = user && user.role === "investor";

  /* ── Socket setup ────────────────────────────────────────── */
  useEffect(() => {
    const sock = io("http://localhost:5001");
    setSocket(sock);

    sock.on("receive-message", (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Update conversation last message
      setConversations((prev) =>
        prev.map((c) =>
          c.chatId === msg.chatId
            ? { ...c, lastMessage: msg.text || "📷", timestamp: msg.createdAt || new Date() }
            : c
        )
      );
    });

    sock.on("user-typing", ({ chatId, userId }) => {
      if (activeChat?.chatId === chatId && userId !== user._id) {
        setIsTyping(true);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setIsTyping(false), 2500);
      }
    });

    sock.on("message-deleted", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, deleted: true, text: "" } : m))
      );
    });

    loadConversations();
    return () => sock.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Re-listen when activeChat changes */
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
  }, [socket, activeChat, user._id]);

  /* ── URL param: open chat from ScriptDetail ─────────────── */
  useEffect(() => {
    if (loading) return;
    const recipientId = searchParams.get("recipientId");
    const recipientName = searchParams.get("recipientName") || "Writer";
    if (!recipientId || !isInvestor) return;

    const chatId = buildChatId(user._id, recipientId);
    const existing = conversations.find((c) => c.chatId === chatId);
    if (existing) { handleSelectChat(existing); return; }

    const pendingChat = {
      chatId,
      user: { _id: recipientId, name: recipientName, role: "writer", profileImage: "" },
      lastMessage: "",
      timestamp: new Date().toISOString(),
      isPending: true,
    };
    setActiveChat(pendingChat);
    setMessages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  /* ── Join socket room when chat changes ─────────────────── */
  useEffect(() => {
    if (socket && activeChat) {
      socket.emit("join-chat", activeChat.chatId);
    }
  }, [socket, activeChat]);

  /* ── Scroll to bottom ───────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ── Filter conversations by search query ───────────────── */
  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredConvs(conversations); return; }
    const q = searchQuery.toLowerCase();
    setFilteredConvs(conversations.filter((c) => c.user?.name?.toLowerCase().includes(q)));
  }, [searchQuery, conversations]);

  /* ── Load conversations ─────────────────────────────────── */
  const loadConversations = async () => {
    try {
      const { data } = await api.get("/messages/conversations");
      setConversations(data);
      setFilteredConvs(data);
    } catch {
      setConversations([]);
      setFilteredConvs([]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Load messages ──────────────────────────────────────── */
  const loadMessages = async (chatId) => {
    setMessagesLoading(true);
    try {
      const { data } = await api.get(`/messages/${chatId}`);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  /* ── Select conversation ────────────────────────────────── */
  const handleSelectChat = useCallback((conv) => {
    setSendError("");
    setIsTyping(false);
    setEmojiPicker(null);
    setActiveChat(conv);
    loadMessages(conv.chatId);
    // Clear unread badge
    setConversations((prev) =>
      prev.map((c) => (c.chatId === conv.chatId ? { ...c, unreadCount: 0 } : c))
    );
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  /* ── Send message ───────────────────────────────────────── */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    setSendError("");
    if (!newMessage.trim() || !activeChat) return;

    if (isWriter && !messagesLoading && messages.length === 0) {
      setSendError("You cannot initiate a conversation. Only investors can message first.");
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      _id: tempId,
      chatId: activeChat.chatId,
      sender: { _id: user._id, name: user.name, profileImage: user.profileImage, role: user.role },
      receiver: activeChat.user._id,
      text: newMessage,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, optimistic]);
    const sentText = newMessage;
    setNewMessage("");

    try {
      const { data: saved } = await api.post("/messages/send", {
        receiverId: activeChat.user._id,
        text: sentText,
      });

      // Replace optimistic with saved
      setMessages((prev) => prev.map((m) => (m._id === tempId ? saved : m)));

      socket?.emit("send-message", { ...saved, chatId: activeChat.chatId });

      if (activeChat.isPending) {
        const promoted = { ...activeChat, lastMessage: sentText, isPending: false };
        setConversations((prev) => [promoted, ...prev]);
        setFilteredConvs((prev) => [promoted, ...prev]);
        setActiveChat(promoted);
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.chatId === activeChat.chatId
              ? { ...c, lastMessage: sentText, timestamp: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      const code = err.response?.data?.code;
      setSendError(
        code === "PURCHASE_REQUIRED"
          ? "Purchase a project from this writer first to unlock messaging."
          : err.response?.data?.message || "Failed to send message."
      );
    }
  };

  /* ── Typing indicator emit ──────────────────────────────── */
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (socket && activeChat) {
      socket.emit("typing", { chatId: activeChat.chatId, userId: user._id });
    }
  };

  /* ── Emoji reaction ─────────────────────────────────────── */
  const handleReaction = async (messageId, emoji) => {
    setEmojiPicker(null);
    try {
      const { data: reactions } = await api.patch(`/messages/${messageId}/reaction`, { emoji });
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    } catch { /* silent */ }
  };

  /* ── Delete message ─────────────────────────────────────── */
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

  /* ── Avatar URL helper ──────────────────────────────────── */
  const avatar = (u) =>
    u?.profileImage
      ? u.profileImage.startsWith("http") ? u.profileImage : `http://localhost:5001${u.profileImage}`
      : `https://placehold.co/48x48/1e3a5f/ffffff?text=${encodeURIComponent(u?.name?.charAt(0) || "U")}`;

  /* ── Theme shorthand ────────────────────────────────────── */
  const t = {
    page: dark ? "bg-[#080e18] border-[#1c2a3a]" : "bg-white border-gray-100",
    sidebar: dark ? "bg-[#080e18] border-[#151f2e]" : "bg-white border-gray-100",
    chat: dark ? "bg-[#080e18]" : "bg-gray-50/40",
    header: dark ? "bg-[#080e18] border-[#151f2e]" : "bg-white border-gray-100",
    conv: dark ? "hover:bg-white/[0.03] border-[#151f2e]" : "hover:bg-gray-50 border-gray-50",
    convActive: dark ? "bg-[#0d1520]" : "bg-blue-50/60",
    input: dark ? "bg-[#0d1520] border-[#1c2a3a] text-white placeholder-[#2a3a4e]" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400",
    title: dark ? "text-white" : "text-gray-900",
    sub: dark ? "text-[#8896a7]" : "text-gray-500",
    muted: dark ? "text-[#4a5a6e]" : "text-gray-400",
    bubble: {
      mine: "bg-[#1e3a5f] text-white rounded-br-sm",
      theirs: dark ? "bg-[#0d1520] text-[#8896a7] border border-[#1c2a3a] rounded-bl-sm" : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm",
    },
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[70vh]">
      <div className={`w-10 h-10 border-[3px] rounded-full animate-spin ${dark ? "border-[#0d1520] border-t-[#8896a7]" : "border-gray-200 border-t-[#1e3a5f]"}`} />
    </div>
  );

  const showList = !activeChat;

  return (
    <div className={`flex h-[calc(100vh-5rem)] md:h-[calc(100vh-2rem)] rounded-2xl shadow-sm border overflow-hidden ${t.page}`}>

      {/* ════════════════════════════════════════
          LEFT — Conversation Sidebar
      ════════════════════════════════════════ */}
      <div className={[
        "w-full md:w-80 lg:w-96 flex-col border-r",
        t.sidebar,
        dark ? "border-[#151f2e]" : "border-gray-100",
        showList ? "flex" : "hidden md:flex",
      ].join(" ")}>

        {/* Sidebar Header */}
        <div className={`px-4 py-4 border-b ${dark ? "border-[#151f2e]" : "border-gray-100"}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-lg font-extrabold tracking-tight ${t.title}`}>Messages</h2>
            {isWriter && (
              <span className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${dark ? "bg-white/[0.04] text-[#8896a7]" : "bg-gray-100 text-gray-500"}`}>
                <Lock size={10} /> Reply only
              </span>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.muted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className={`w-full pl-8 pr-8 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 transition-all ${t.input}`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.muted}`}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 ? (
            <div className="p-8 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${dark ? "bg-white/[0.04]" : "bg-gray-100"}`}>
                <MessageCircle size={26} className={t.muted} strokeWidth={1.5} />
              </div>
              <p className={`text-sm font-semibold ${t.sub}`}>
                {searchQuery ? "No conversations found" : "No conversations yet"}
              </p>
              {isWriter && !searchQuery && (
                <p className={`text-xs mt-1.5 leading-relaxed ${t.muted}`}>
                  Investors will message you after purchasing your projects.
                </p>
              )}
              {isInvestor && !searchQuery && (
                <p className={`text-xs mt-1.5 leading-relaxed ${t.muted}`}>
                  Purchase a project to unlock messaging with the writer.
                </p>
              )}
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const isSelected = activeChat?.chatId === conv.chatId;
              const hasUnread = conv.unreadCount > 0;
              return (
                <div
                  key={conv.chatId}
                  onClick={() => handleSelectChat(conv)}
                  className={[
                    "px-3.5 py-3 cursor-pointer border-b transition-all duration-150",
                    dark ? "border-[#151f2e]" : "border-gray-50",
                    isSelected ? t.convActive : t.conv,
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={avatar(conv.user)}
                        alt={conv.user?.name}
                        className={`w-11 h-11 rounded-xl object-cover ring-2 ${dark ? "ring-[#151f2e]" : "ring-white"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className={`text-sm font-semibold truncate ${hasUnread ? (dark ? "text-white" : "text-gray-900") : t.title}`}>
                          {conv.user?.name}
                        </h3>
                        <span className={`text-[10px] flex-shrink-0 ml-1 ${t.muted}`}>
                          {formatTime(conv.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${hasUnread ? (dark ? "text-gray-300" : "text-gray-700") : t.sub}`}>
                          {conv.lastMessage || "Start a conversation"}
                        </p>
                        {hasUnread && (
                          <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-[#1e3a5f] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          RIGHT — Chat Area
      ════════════════════════════════════════ */}
      <div className={[
        "flex-1 flex-col overflow-hidden",
        t.chat,
        !showList ? "flex" : "hidden md:flex",
      ].join(" ")}>

        {/* ── Empty state (no conversation selected) ── */}
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 ${dark ? "bg-white/[0.04]" : "bg-gradient-to-br from-[#edf2fa] to-[#dce8f5]"}`}>
                  <MessageCircle size={38} className={dark ? "text-[#2a3a4e]" : "text-[#1e3a5f]"} strokeWidth={1.5} />
            </div>
            <h3 className={`text-base font-bold mb-1.5 ${t.title}`}>Your Messages</h3>
            <p className={`text-sm max-w-xs leading-relaxed ${t.sub}`}>
              {isInvestor
                ? "Select a conversation or purchase a project to unlock messaging with its writer."
                : isWriter
                ? "Investors will message you here after purchasing one of your projects."
                : "Select a conversation from the left to start chatting."}
            </p>
            {isInvestor && (
              <button
                onClick={() => navigate("/search")}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white text-sm font-semibold rounded-xl hover:bg-[#162d4a] transition-colors"
              >
                Browse Projects <ArrowRight size={15} />
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Chat Header ── */}
            <div className={`px-4 py-3 border-b flex items-center gap-3 flex-shrink-0 ${t.header} ${dark ? "border-[#151f2e]" : "border-gray-100"}`}>
              <button onClick={() => setActiveChat(null)} className={`md:hidden p-1.5 rounded-lg transition ${dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-100"}`}>
                <ChevronLeft size={20} className={t.sub} />
              </button>
                <img src={avatar(activeChat.user)} alt={activeChat.user?.name} className={`w-10 h-10 rounded-xl object-cover ring-2 ${dark ? "ring-[#151f2e]" : "ring-gray-100"}`} />
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-extrabold truncate ${t.title}`}>{activeChat.user?.name}</h3>
                <p className={`text-[11px] capitalize font-medium ${t.muted}`}>
                  {activeChat.user?.role} {isTyping ? "· typing…" : ""}
                </p>
              </div>
              {isInvestor && (
                <span className={`hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full ${dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                  <ShieldCheck size={12} /> Verified Investor
                </span>
              )}
            </div>

            {/* ── Messages List ── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1">
              {messagesLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className={`w-7 h-7 border-[3px] rounded-full animate-spin ${dark ? "border-[#0d1520] border-t-[#8896a7]" : "border-gray-200 border-t-[#1e3a5f]"}`} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <p className={`text-sm ${t.sub}`}>No messages yet.</p>
                  {isInvestor && (
                    <p className={`text-xs ${t.muted}`}>Send the first message to start the conversation.</p>
                  )}
                </div>
              ) : (
                messages.map((msg, i) => {
                  const senderId = msg.sender?._id || msg.sender;
                  const isMine = senderId?.toString() === user._id?.toString();
                  const showDateSep = i === 0 || !isSameDay(messages[i - 1].createdAt, msg.createdAt);
                  const isDeleted = msg.deleted;

                  return (
                    <div key={msg._id || i}>
                      {/* Date separator */}
                      {showDateSep && (
                        <div className="flex items-center gap-3 my-3">
                          <div className={`flex-1 h-px ${dark ? "bg-white/[0.06]" : "bg-gray-200"}`} />
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 ${t.muted}`}>
                            {formatDay(msg.createdAt)}
                          </span>
                          <div className={`flex-1 h-px ${dark ? "bg-white/[0.06]" : "bg-gray-200"}`} />
                        </div>
                      )}

                      {/* Message row */}
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"} group mb-0.5`}
                        onMouseEnter={() => setHoveredMsg(msg._id)}
                        onMouseLeave={() => { setHoveredMsg(null); setEmojiPicker(null); }}
                      >
                        {/* Other user avatar */}
                        {!isMine && (
                          <img
                            src={avatar(msg.sender)}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover self-end mr-2 flex-shrink-0"
                          />
                        )}

                        <div className={`relative max-w-[72%] sm:max-w-sm`}>
                          {/* Bubble */}
                          <div className={[
                            "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                            isMine ? t.bubble.mine : t.bubble.theirs,
                            isDeleted ? "opacity-40 italic" : "",
                          ].join(" ")}>
                            {isDeleted ? (
                              <span className="text-xs">This message was deleted</span>
                            ) : msg.fileUrl && msg.fileType === "image" ? (
                              <img src={msg.fileUrl} alt="attachment" className="max-w-full rounded-xl" />
                            ) : (
                              <p className="break-words leading-relaxed">{msg.text}</p>
                            )}
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? "text-[#c3d5e8]" : t.muted} text-[10px]`}>
                              <span>{formatTime(msg.createdAt)}</span>
                              {isMine && (
                                msg.read
                                  ? <CheckCheck size={11} className="text-blue-300" />
                                  : <Check size={11} />
                              )}
                            </div>
                          </div>

                          {/* Reactions display */}
                          {msg.reactions?.length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                              {Object.entries(
                                msg.reactions.reduce((acc, r) => {
                                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg._id, emoji)}
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] transition ${dark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-white hover:bg-gray-100 border border-gray-200"}`}
                                >
                                  {emoji} <span className={t.muted}>{count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Hover actions */}
                          {!isDeleted && hoveredMsg === msg._id && (
                            <div className={`absolute ${isMine ? "right-full mr-2" : "left-full ml-2"} top-0 flex items-center gap-1`}>
                              {/* Emoji picker trigger */}
                              <div className="relative">
                                <button
                                  onClick={() => setEmojiPicker(emojiPicker === msg._id ? null : msg._id)}
                                  className={`p-1.5 rounded-lg transition ${dark ? "bg-[#0d1520] hover:bg-[#1c2a3a] text-[#8896a7]" : "bg-white hover:bg-gray-100 border border-gray-200 text-gray-500"} shadow-sm`}
                                >
                                  <Smile size={14} />
                                </button>
                                <AnimatePresence>
                                  {emojiPicker === msg._id && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.9, y: 4 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.9 }}
                                      className={`absolute bottom-full mb-1.5 ${isMine ? "right-0" : "left-0"} flex gap-1.5 p-2 rounded-2xl shadow-xl border z-50 ${dark ? "bg-[#0d1520] border-[#1c2a3a]" : "bg-white border-gray-100"}`}
                                    >
                                      {QUICK_EMOJIS.map((em) => (
                                        <button
                                          key={em}
                                          onClick={() => handleReaction(msg._id, em)}
                                          className="text-lg hover:scale-125 transition-transform duration-100"
                                        >
                                          {em}
                                        </button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              {/* Delete (own messages only) */}
                              {isMine && (
                                <button
                                  onClick={() => setDeleteModal(msg._id)}
                                  className={`p-1.5 rounded-lg transition ${dark ? "bg-[#0d1520] hover:bg-red-900/30 text-[#8896a7] hover:text-red-400" : "bg-white hover:bg-red-50 border border-gray-200 text-gray-400 hover:text-red-500"} shadow-sm`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-end gap-2">
                    <img src={avatar(activeChat.user)} alt="" className="w-7 h-7 rounded-lg object-cover" />
                    <div className={`px-4 py-3 rounded-2xl rounded-bl-sm ${dark ? "bg-[#0d1520] border border-[#1c2a3a]" : "bg-white border border-gray-100"} shadow-sm`}>
                      <div className="flex gap-1 items-center h-3">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className={`w-1.5 h-1.5 rounded-full animate-bounce ${dark ? "bg-gray-500" : "bg-gray-400"}`}
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* ── Input Area ── */}
            {isWriter && !messagesLoading && messages.length === 0 ? (
              <div className={`px-4 py-4 border-t text-center ${t.header} ${dark ? "border-[#151f2e]" : "border-gray-100"}`}>
                <p className={`text-xs flex items-center justify-center gap-2 ${t.muted}`}>
                  <Lock size={12} /> Waiting for the investor to send the first message.
                </p>
              </div>
            ) : (
              <div className={`px-4 py-3 border-t flex-shrink-0 ${t.header} ${dark ? "border-[#151f2e]" : "border-gray-100"}`}>
                {sendError && (
                  <div className={`flex items-center gap-2 text-xs mb-2 px-3 py-2 rounded-xl ${dark ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-600"}`}>
                    <Lock size={12} className="flex-shrink-0" /> {sendError}
                  </div>
                )}
                {isWriter && (
                  <div className={`flex items-center gap-1.5 text-[11px] mb-2 ${t.muted}`}>
                    <Info size={11} /> Replying to investor message
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={isWriter ? "Reply to investor…" : "Type a message…"}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 focus:border-[#1e3a5f] transition-all ${t.input}`}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSendMessage(e); }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 flex-shrink-0 bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all hover:shadow-md hover:shadow-[#1e3a5f]/20"
                  >
                    <Send size={17} />
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════════════════════════════════
          Delete confirmation modal
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setDeleteModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${dark ? "bg-[#0d1520] border-[#1c2a3a]" : "bg-white border-gray-100"}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dark ? "bg-red-900/20" : "bg-red-50"}`}>
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className={`text-base font-bold text-center mb-1.5 ${t.title}`}>Delete Message?</h3>
              <p className={`text-sm text-center mb-6 ${t.sub}`}>This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModal(null)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${dark ? "border-[#1c2a3a] text-[#8896a7] hover:bg-white/[0.04]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteModal)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Messages;