import { useEffect, useState, useContext, useRef } from "react";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const Messages = () => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const newSocket = io("http://localhost:5001");
    setSocket(newSocket);
    loadConversations();
    return () => newSocket.close();
  }, []);

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
      setConversations([
        { _id: "1", chatId: "chat-1", user: { _id: "user1", name: "John Doe", profileImage: "https://via.placeholder.com/50", role: "investor" }, lastMessage: "Hey, interested in your script!", timestamp: new Date().toISOString() },
        { _id: "2", chatId: "chat-2", user: { _id: "user2", name: "Jane Smith", profileImage: "https://via.placeholder.com/50", role: "producer" }, lastMessage: "Can we discuss the project?", timestamp: new Date().toISOString() },
      ]);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const { data } = await api.get(`/messages/${chatId}`);
      setMessages(data);
    } catch (error) {
      setMessages([]);
    }
  };

  const handleSelectChat = (conversation) => {
    setActiveChat(conversation);
    loadMessages(conversation.chatId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    const messageData = { chatId: activeChat.chatId, sender: user._id, text: newMessage, timestamp: new Date().toISOString() };
    try {
      await api.post("/messages/send", { chatId: activeChat.chatId, text: newMessage });
      socket.emit("send-message", messageData);
      setMessages([...messages, messageData]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const showList = !activeChat;

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ── Conversation List ── */}
      <div className={[
        "w-full md:w-80 lg:w-96 border-r border-gray-100 flex-col",
        showList ? "flex" : "hidden md:flex",
      ].join(" ")}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 font-medium">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeChat?._id === conv._id;
              return (
                <div
                  key={conv._id}
                  onClick={() => handleSelectChat(conv)}
                  className={[
                    "p-3.5 cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50",
                    isSelected ? "bg-indigo-50/60" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <img src={conv.user.profileImage} alt={conv.user.name} className="w-12 h-12 rounded-full object-cover" />
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{conv.user.name}</h3>
                        <span className="text-[11px] text-gray-400">{new Date(conv.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
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
        "flex-1 flex-col bg-gray-50/50",
        !showList ? "flex" : "hidden md:flex",
      ].join(" ")}>
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900 mb-1">Your Messages</p>
              <p className="text-sm text-gray-500">Select a conversation to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-3 sm:p-4 bg-white border-b border-gray-100 flex items-center gap-3">
              <button onClick={() => setActiveChat(null)} className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img src={activeChat.user.profileImage} alt={activeChat.user.name} className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">{activeChat.user.name}</h3>
                <p className="text-xs text-gray-500 capitalize">{activeChat.user.role}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={["flex", msg.sender === user._id ? "justify-end" : "justify-start"].join(" ")}
                >
                  <div className={[
                    "max-w-[75%] sm:max-w-sm px-4 py-2.5 rounded-2xl text-sm",
                    msg.sender === user._id ? "bg-indigo-600 text-white rounded-br-md" : "bg-white text-gray-800 border border-gray-200 rounded-bl-md",
                  ].join(" ")}>
                    <p className="break-words">{msg.text}</p>
                    <p className={["text-[10px] mt-1", msg.sender === user._id ? "text-indigo-200" : "text-gray-400"].join(" ")}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-gray-100 border border-transparent rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <button type="submit" disabled={!newMessage.trim()}
                  className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Messages;
