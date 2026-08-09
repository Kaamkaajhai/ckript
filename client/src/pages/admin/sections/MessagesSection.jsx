import { useAdminDashboard } from "../dashboardContext";
import { formatFileSize, resolveMediaUrl } from "../dashboardShared";

/**
 * "messages" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5b. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const MessagesSection = () => {
    const {
        activeMessageUser,
        adminConversations,
        filteredMessageUsers,
        handleAdminAttachmentChange,
        handleAdminMessageScroll,
        handlePickMessageAttachment,
        handleSendAdminMessage,
        hasSearch,
        isDark,
        messageAttachment,
        messageFileInputRef,
        messageList,
        messageListContainerRef,
        messageListEndRef,
        messageText,
        messageUsers,
        messagesLoading,
        openWriterConversation,
        scrollAdminMessagesToBottom,
        setMessageAttachment,
        setMessageText,
        showAdminScrollToBottomButton,
        uploadingMessageAttachment,
    } = useAdminDashboard();

                const selectedWriterId = String(activeMessageUser?._id || "");
                const selectedConversation = adminConversations.find((conv) => String(conv?.user?._id) === selectedWriterId);

                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Admin Messages
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                    ({hasSearch ? filteredMessageUsers.length : messageUsers.length})
                                </span>
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className={`lg:col-span-1 h-[240px] sm:h-[280px] lg:h-[calc(100vh-240px)] lg:min-h-[520px] lg:max-h-[760px] rounded-2xl border flex flex-col overflow-hidden ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                <div className={`px-4 py-3 border-b ${isDark ? "border-[#2e2828]" : "border-gray-100"}`}>
                                    <p className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>Writers</p>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {messagesLoading && filteredMessageUsers.length === 0 ? (
                                        <p className={`px-4 py-5 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading conversations...</p>
                                    ) : filteredMessageUsers.length === 0 ? (
                                        <p className={`px-4 py-5 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No writers found.</p>
                                    ) : (
                                        filteredMessageUsers.map((writer) => {
                                            const isSelected = String(writer._id) === selectedWriterId;
                                            const conversation = writer.conversation;
                                            return (
                                                <button
                                                    key={writer._id}
                                                    onClick={() => openWriterConversation(writer)}
                                                    className={`w-full text-left px-4 py-3 border-b transition-colors ${isDark ? "border-[#2e2828]" : "border-gray-100"} ${isSelected ? (isDark ? "bg-[#a83a4d]/10" : "bg-[#f7edee]") : (isDark ? "hover:bg-white/[0.03]" : "hover:bg-gray-50")}`}
                                                >
                                                    <p className={`text-sm font-semibold ${isDark ? "text-gray-100" : "text-gray-800"}`}>{writer.name || "Unknown"}</p>
                                                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{writer.email || "No email"}</p>
                                                    {conversation?.lastMessage && (
                                                        <p className={`text-xs mt-1 truncate ${isDark ? "text-gray-500" : "text-gray-500"}`}>{conversation.lastMessage}</p>
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className={`relative lg:col-span-2 h-[62vh] sm:h-[66vh] lg:h-[calc(100vh-240px)] lg:min-h-[520px] lg:max-h-[760px] rounded-2xl border flex flex-col overflow-hidden ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                {!activeMessageUser ? (
                                    <div className="flex-1 py-20 flex items-center justify-center px-6 text-center">
                                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Select a writer to start or continue a trailer discussion.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`px-4 py-3 border-b ${isDark ? "border-[#2e2828]" : "border-gray-100"}`}>
                                            <p className={`text-sm font-bold ${isDark ? "text-gray-100" : "text-gray-800"}`}>{activeMessageUser.name || "Writer"}</p>
                                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                                {activeMessageUser.email || "No email"}
                                                {selectedConversation?.timestamp ? ` • Last active ${new Date(selectedConversation.timestamp).toLocaleString()}` : ""}
                                            </p>
                                        </div>

                                        <div
                                            ref={messageListContainerRef}
                                            onScroll={handleAdminMessageScroll}
                                            className="p-4 space-y-3 flex-1 min-h-0 overflow-y-auto"
                                        >
                                            {messagesLoading ? (
                                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading thread...</p>
                                            ) : messageList.length === 0 ? (
                                                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No messages yet. Send the first message to start this conversation.</p>
                                            ) : (
                                                messageList.map((msg) => {
                                                    const isWriterMessage = String(msg?.sender?._id || "") === String(activeMessageUser._id || "");
                                                    return (
                                                        <div key={msg._id} className={`flex ${isWriterMessage ? "justify-start" : "justify-end"}`}>
                                                            <div className={`max-w-[80%] px-3 py-2 rounded-xl ${isWriterMessage ? (isDark ? "bg-[#221d1d] text-gray-100" : "bg-gray-100 text-gray-800") : (isDark ? "bg-[#a83a4d]/20 text-[#f7edee]" : "bg-[#f7edee] text-[#521221]")}`}>
                                                                {msg.fileUrl && msg.fileType === "image" ? (
                                                                    <div className="space-y-2">
                                                                        <img src={resolveMediaUrl(msg.fileUrl)} alt="attachment" className="max-w-full rounded-xl" />
                                                                        {msg.text ? <p className="text-sm whitespace-pre-wrap">{msg.text}</p> : null}
                                                                    </div>
                                                                ) : msg.fileUrl && msg.fileType === "video" ? (
                                                                    <div className="space-y-2">
                                                                        <video src={resolveMediaUrl(msg.fileUrl)} controls preload="metadata" className="w-full rounded-xl max-h-72" />
                                                                        <a href={resolveMediaUrl(msg.fileUrl)} target="_blank" rel="noreferrer" className={`text-xs underline ${isDark ? "text-[#e79aa6]" : "text-[#a83a4d]"}`}>Open video in new tab</a>
                                                                        {msg.text ? <p className="text-sm whitespace-pre-wrap">{msg.text}</p> : null}
                                                                    </div>
                                                                ) : msg.fileUrl ? (
                                                                    <div className="space-y-2">
                                                                        <div className={`rounded-lg px-2.5 py-2 ${isWriterMessage ? "bg-[var(--ad-surface-2)]" : "bg-[var(--ad-accent-soft)]"}`}>
                                                                            <p className="text-xs font-semibold truncate">{msg.fileName || "Attachment"}</p>
                                                                            <p className={`text-[10px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{formatFileSize(msg.fileSize)}</p>
                                                                            <a href={resolveMediaUrl(msg.fileUrl)} target="_blank" rel="noreferrer" className={`inline-block mt-1 text-xs underline ${isDark ? "text-[#e79aa6]" : "text-[#a83a4d]"}`}>Open file</a>
                                                                        </div>
                                                                        {msg.text ? <p className="text-sm whitespace-pre-wrap">{msg.text}</p> : null}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm whitespace-pre-wrap">{msg.text || "(attachment)"}</p>
                                                                )}
                                                                <p className={`text-[11px] mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                            <div ref={messageListEndRef} />
                                        </div>

                                        {showAdminScrollToBottomButton && (
                                            <button
                                                type="button"
                                                onClick={() => scrollAdminMessagesToBottom("smooth")}
                                                aria-label="Scroll to latest message"
                                                title="Scroll to latest"
                                                className="absolute right-4 bottom-[78px] z-20 w-10 h-10 rounded-full flex items-center justify-center shadow-md border bg-[var(--ad-surface)] border-[var(--ad-line-2)] text-[var(--ad-ink)] hover:bg-[var(--ad-surface-2)]"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        )}

                                        <div className={`p-3 border-t ${isDark ? "border-[#2e2828]" : "border-gray-100"}`}>
                                            {messageAttachment && (
                                                <div className={`mb-2 rounded-xl border px-3 py-2 flex items-center justify-between ${isDark ? "border-[#2e2828] bg-[#221d1d]" : "border-gray-200 bg-gray-50"}`}>
                                                    <div>
                                                        <p className={`text-xs font-semibold ${isDark ? "text-gray-100" : "text-gray-800"}`}>{messageAttachment.fileName || "Attachment"}</p>
                                                        <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{messageAttachment.fileType || "file"} • {formatFileSize(messageAttachment.fileSize)}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setMessageAttachment(null);
                                                            if (messageFileInputRef.current) messageFileInputRef.current.value = "";
                                                        }}
                                                        className={`text-xs font-bold px-2 py-1 rounded-lg ${isDark ? "text-red-300 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            )}

                                            <input
                                                ref={messageFileInputRef}
                                                type="file"
                                                className="hidden"
                                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip"
                                                onChange={handleAdminAttachmentChange}
                                            />

                                            <div className={`rounded-2xl border p-2 flex items-center gap-2 ${isDark ? "bg-[#1a1616] border-[#2e2828]" : "bg-gray-50 border-gray-200"}`}>
                                                <button
                                                    type="button"
                                                    onClick={handlePickMessageAttachment}
                                                    disabled={uploadingMessageAttachment || !activeMessageUser}
                                                    className={`w-12 h-12 shrink-0 rounded-full inline-flex items-center justify-center border transition-colors ${uploadingMessageAttachment || !activeMessageUser ? "bg-[var(--ad-surface-3)] border-transparent text-[var(--ad-ink-4)]" : "bg-[var(--ad-surface)] border-[var(--ad-line-2)] text-[var(--ad-ink)] hover:bg-[var(--ad-surface-2)]"}`}
                                                    title={uploadingMessageAttachment ? "Uploading..." : "Attach file"}
                                                >
                                                    {uploadingMessageAttachment ? (
                                                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v4m0 8v4m8-8h-4M8 12H4m12.364-5.657l-2.828 2.828M10.464 13.536l-2.828 2.828m0-9.9l2.828 2.828m5.072 5.072l2.828 2.828" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a5.5 5.5 0 01-7.78-7.78l9.19-9.19a3.5 3.5 0 114.95 4.95l-9.19 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.49" />
                                                        </svg>
                                                    )}
                                                </button>

                                                <textarea
                                                    rows={1}
                                                    value={messageText}
                                                    onChange={(e) => setMessageText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSendAdminMessage();
                                                        }
                                                    }}
                                                    placeholder="Reply with text or attach file..."
                                                    // Was a navy field inside a warm composer, with a #5c7190 placeholder at 3.7:1
                                                    // — under the 4.5:1 text minimum. --ad-ink-3 is the lightest ink the palette
                                                    // allows to carry text.
                                                    className="flex-1 resize-none h-12 rounded-xl px-4 py-3 text-base border bg-[var(--ad-surface-2)] border-[var(--ad-line-2)] text-[var(--ad-ink)] placeholder:text-[var(--ad-ink-3)] focus:outline-none focus:ring-2 focus:ring-[var(--ad-accent)]"
                                                />
                                                <button
                                                    onClick={handleSendAdminMessage}
                                                    disabled={uploadingMessageAttachment || (!messageText.trim() && !messageAttachment)}
                                                    // Enabled and disabled were #10233f and #122540 — a per-channel difference of
                                                    // 2/2/1, about 1.03:1. The admin could not tell a Send button that would fire
                                                    // from one that was inert. Now the live state carries the accent fill and the
                                                    // dead one a flat surface, which differ in both hue and lightness.
                                                    className={`w-12 h-12 shrink-0 rounded-full inline-flex items-center justify-center transition-colors ${(!uploadingMessageAttachment && (messageText.trim() || messageAttachment)) ? "bg-[var(--ad-accent)] text-[var(--ad-ink-invert)] hover:bg-[var(--ad-accent-hover)]" : "bg-[var(--ad-surface-3)] text-[var(--ad-ink-4)]"}`}
                                                    title="Send message"
                                                >
                                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L15 22 11 13 2 9 22 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
};

export default MessagesSection;
