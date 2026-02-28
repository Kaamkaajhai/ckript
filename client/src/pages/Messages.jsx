import { useEffect, useState, useContext, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { MessageCircle, ChevronLeft, Send, Lock, Info } from "lucide-react";

import { useDarkMode } from "../context/DarkModeContext";

// Build a consistent chatId from two user IDs (same logic as server)
const buildChatId = (a, b) => {
  const sorted = [a.toString(), b.toString()].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

const Messages = () => {
  const { user } = useContext(AuthContext);
  const { isDarkMode: dark } = useDarkMode();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef(null);

  // Determine if the logged-in user is a writer/creator role
  const isWriter = user && ["writer", "creator"].includes(user.role);
  const isInvestor = user && user.role === "investor";

  useEffect(() => {
    const newSocket = io("http://localhost:5001");
    setSocket(newSocket);
    loadConversations();
    return () => newSocket.close();
  }, []);

  // If investor arrives from ScriptDetail with ?recipientId=...&recipientName=...
  // pre-open the chat after conversations are loaded
  useEffect(() => {
    if (loading) return; // wait until conversations have loaded
    const recipientId = searchParams.get("recipientId");
    const recipientName = searchParams.get("recipientName") || "Writer";
    if (!recipientId || !isInvestor) return;

    // Build the chatId the same way the server does
    const chatId = buildChatId(user._id, recipientId);

    // If this conversation is already in the list, select it
    const existing = conversations.find((c) => c.chatId === chatId);
    if (existing) {
      handleSelectChat(existing);
      return;
    }

    // Otherwise create a pending chat entry (investor is about to send the first message)
    const pendingChat = {
      chatId,
      user: { _id: recipientId, name: recipientName, role: "writer", profileImage: "" },
      lastMessage: "",
      timestamp: new Date().toISOString(),
      isPending: true, // flag: no messages exist yet
    };
    setActiveChat(pendingChat);
    setMessages([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (socket && activeChat) {
      socket.emit("join-chat", activeChat.chatId);
      socket.on("receive-message", (message) => {
        if (message.chatId === activeChat.chatId) {
          setMessages((prev) => [...prev, message]);
        }
      });
    }
  }, [socket, activeChat]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadConversations = async () => {
    try {
      const { data } = await api.get("/messages/conversations");
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId) => {
    setMessagesLoading(true);
    try {
      const { data } = await api.get(`/messages/${chatId}`);
      setMessages(data);
    } catch (error) {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectChat = (conversation) => {
    setSendError("");
    setActiveChat(conversation);
    loadMessages(conversation.chatId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setSendError("");
    if (!newMessage.trim() || !activeChat) return;

    // Writers cannot send if there are no messages yet (backend enforces this too)
    if (isWriter && !messagesLoading && messages.length === 0) {
      setSendError("You cannot initiate a conversation. Only investors can message first.");
      return;
    }

    const messageData = {
      chatId: activeChat.chatId,
      sender: user._id,
      text: newMessage,
      timestamp: new Date().toISOString(),
    };

    try {
      await api.post("/messages/send", {
        receiverId: activeChat.user._id,
        text: newMessage,
      });
      socket?.emit("send-message", messageData);
      // If this was a pending (no prior messages) chat, now promote it into the conversations list
      if (activeChat.isPending) {
        const promoted = { ...activeChat, lastMessage: newMessage, isPending: false };
        setConversations((prev) => [promoted, ...prev]);
        setActiveChat(promoted);
      } else {
        // Update lastMessage in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.chatId === activeChat.chatId ? { ...c, lastMessage: newMessage, timestamp: new Date().toISOString() } : c
          )
        );
      }
      setMessages((prev) => [...prev, messageData]);
      setNewMessage("");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to send message.";
      const code = error.response?.data?.code;
      if (code === "PURCHASE_REQUIRED") {
        setSendError("Purchase a project from this writer first to unlock messaging.");
      } else {
        setSendError(msg);
      }
    }
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-3 border-[#c3d5e8] border-t-[#0f2544] rounded-full animate-spin"></div>
      </div>
    );
  }

  const showList = !activeChat;

  return (
    <div className={`flex h-[calc(100vh-5rem)] md:h-[calc(100vh-2rem)] rounded-2xl shadow-sm border overflow-hidden ${dark ? 'bg-[#101e30] border-[#182840]' : 'bg-white border-gray-100'}`}>
      {/* ── Conversation List ── */}
      <div className={[
        "w-full md:w-80 lg:w-96 border-r flex-col",
        dark ? "border-[#182840]" : "border-gray-100/80",
        showList ? "flex" : "hidden md:flex",
      ].join(" ")}>
        <div className={`p-4 border-b ${dark ? 'border-[#182840]' : 'border-gray-100/80'}`}>
          <h2 className={`text-lg font-extrabold tracking-tight ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Messages</h2>
          {isWriter && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              <Info size={12} />
              You can only reply to investor messages.
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${dark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                <MessageCircle size={28} className={dark ? 'text-gray-500' : 'text-gray-400'} strokeWidth={1.5} />
              </div>
              <p className={`text-sm font-medium ${dark ? 'text-gray-400' : 'text-gray-600'}`}>No conversations yet</p>
              {isWriter && (
                <p className={`text-xs mt-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Investors will message you after purchasing your projects.</p>
              )}
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeChat?.chatId === conv.chatId;
              return (
                <div
                  key={conv.chatId}
                  onClick={() => handleSelectChat(conv)}
                  className={[
                    "p-3.5 cursor-pointer border-b transition-colors",
                    dark ? "border-[#182840] hover:bg-white/[0.04]" : "border-gray-50 hover:bg-gray-50",
                    isSelected ? (dark ? "bg-white/[0.06]" : "bg-[#edf2f7]/60") : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={conv.user.profileImage || `https://placehold.co/50x50/e2e8f0/64748b?text=${conv.user.name?.charAt(0) || "U"}`}
                        alt={conv.user.name}
                        className={`w-12 h-12 rounded-xl object-cover ring-2 ${dark ? 'ring-[#182840]' : 'ring-gray-100'}`}
                      />
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#1e3a5f] border-2 rounded-full ${dark ? 'border-[#101e30]' : 'border-white'}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className={`text-sm font-semibold truncate ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{conv.user.name}</h3>
                        <span className={`text-[11px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(conv.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${dark ? 'text-gray-500' : 'text-gray-500'}`}>{conv.lastMessage}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className={[
        "flex-1 flex-col",
        dark ? "bg-[#242424]" : "bg-gray-50/50",
        !showList ? "flex" : "hidden md:flex",
      ].join(" ")}>
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#edf2f7] to-[#f0f4f8] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={40} className="text-[#1a365d]" strokeWidth={1.5} />
              </div>
              <p className={`text-base font-semibold mb-1 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>Your Messages</p>
              <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-500'}`}>Select a conversation to start chatting</p>
              {isWriter && (
                <p className={`text-xs mt-2 flex items-center justify-center gap-1 ${dark ? 'text-gray-400' : 'text-gray-400'}`}>
                  <Lock size={12} /> Investors can message you after purchasing your projects.
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className={`p-3 sm:p-4 border-b flex items-center gap-3 ${dark ? 'bg-[#101e30] border-[#182840]' : 'bg-white border-gray-100'}`}>
              <button onClick={() => setActiveChat(null)} className={`md:hidden p-1.5 rounded-lg ${dark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-100'}`}>
                <ChevronLeft size={20} className={dark ? 'text-gray-400' : 'text-gray-600'} />
              </button>
              <img
                src={activeChat.user.profileImage || `https://placehold.co/50x50/e2e8f0/64748b?text=${activeChat.user.name?.charAt(0) || "U"}`}
                alt={activeChat.user.name}
                className={`w-10 h-10 rounded-xl object-cover ring-2 ${dark ? 'ring-[#182840]' : 'ring-gray-100'}`}
              />
              <div className="flex-1">
                <h3 className={`text-sm font-semibold ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{activeChat.user.name}</h3>
                <p className={`text-xs capitalize ${dark ? 'text-gray-500' : 'text-gray-500'}`}>{activeChat.user.role}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {messages.map((msg, i) => {
                const senderId = msg.sender?._id || msg.sender;
                const isMine = senderId?.toString() === user._id?.toString();
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={["flex", isMine ? "justify-end" : "justify-start"].join(" ")}
                  >
                    <div className={[
                      "max-w-[75%] sm:max-w-sm px-4 py-2.5 rounded-2xl text-sm",
                      isMine ? "bg-[#0f2544] text-white rounded-br-md" : dark ? "bg-[#182840] text-gray-200 border border-[#1d3350] rounded-bl-md" : "bg-white text-gray-800 border border-gray-200 rounded-bl-md",
                    ].join(" ")}>
                      <p className="break-words">{msg.text}</p>
                      <p className={["text-[10px] mt-1", isMine ? "text-[#c3d5e8]" : "text-gray-400"].join(" ")}>
                        {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input or Locked notice */}
            {isWriter && !messagesLoading && messages.length === 0 ? (
              /* Writer viewing a chat that has no messages yet — cannot initiate */
              <div className={`p-4 border-t text-center ${dark ? 'bg-[#101e30] border-[#182840]' : 'bg-white border-gray-100'}`}>
                <p className={`text-xs flex items-center justify-center gap-1.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Lock size={13} />
                  Waiting for the investor to send the first message.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className={`p-3 sm:p-4 border-t ${dark ? 'bg-[#101e30] border-[#182840]' : 'bg-white border-gray-100'}`}>
                {sendError && (
                  <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                    <Lock size={11} /> {sendError}
                  </p>
                )}
                {isWriter && (
                  <p className={`text-[11px] mb-2 flex items-center gap-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Info size={11} /> You are replying to an investor message.
                  </p>
                )}
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isWriter ? "Reply to investor..." : "Type a message..."}
                    className={`flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/10 focus:border-[#1e3a5f] transition-all duration-200 ${dark ? 'bg-[#242424] border-[#1d3350] text-gray-200 placeholder-gray-600 focus:bg-[#101e30]' : 'bg-gray-50/80 border-gray-200 focus:bg-white'}`}
                  />
                  <button type="submit" disabled={!newMessage.trim()}
                    className="w-10 h-10 bg-[#1e3a5f] text-white rounded-xl flex items-center justify-center hover:bg-[#162d4a] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 hover:shadow-md hover:shadow-[#1e3a5f]/20"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Messages;
