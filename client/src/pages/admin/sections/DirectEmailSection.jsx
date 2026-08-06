import { useAdminDashboard } from "../dashboardContext";
import { BroadcastComposer } from "../dashboardShared";

const DirectEmailSection = () => {
    const {
        directUserEmail,
        setDirectUserEmail,
        directBroadcastTitle,
        setDirectBroadcastTitle,
        directBroadcastContent,
        setDirectBroadcastContent,
        directBroadcastLink,
        setDirectBroadcastLink,
        directBroadcastAttachments,
        setDirectBroadcastAttachments,
        handleSendAudienceBroadcast,
        isDark,
        userActionLoading,
    } = useAdminDashboard();

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Direct User Email</h2>
            </div>
            <div className="max-w-4xl">
                <div className={`rounded-2xl border mb-6 overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                    <div className={`px-5 py-4 border-b ${isDark ? "border-[#1a3050] bg-[#112240]" : "border-gray-100 bg-gray-50/50"}`}>
                        <h3 className={`text-sm font-extrabold tracking-wide ${isDark ? "text-gray-200" : "text-gray-800"}`}>Target Recipient</h3>
                    </div>
                    <div className="p-5">
                        <input
                            type="email"
                            value={directUserEmail}
                            onChange={(e) => setDirectUserEmail(e.target.value)}
                            placeholder="Enter exact user email (e.g. jdoe@example.com)"
                            className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 ${isDark ? "bg-[#132744] border-[#1a3050] text-gray-100 placeholder:text-gray-500 focus:ring-[#8B1E1E]/30" : "bg-white border-gray-200 text-gray-800 placeholder:text-gray-400 focus:ring-[#8B1E1E]/30"}`}
                        />
                    </div>
                </div>
                
                <BroadcastComposer
                    isDark={isDark}
                    audienceLabel="Specific User"
                    title={directBroadcastTitle}
                    content={directBroadcastContent}
                    actionUrl={directBroadcastLink}
                    attachments={directBroadcastAttachments}
                    onTitleChange={setDirectBroadcastTitle}
                    onContentChange={setDirectBroadcastContent}
                    onActionUrlChange={setDirectBroadcastLink}
                    onAttachmentsChange={setDirectBroadcastAttachments}
                    onSend={() => handleSendAudienceBroadcast("direct-user")}
                    sending={userActionLoading === "broadcast:direct-user"}
                />
            </div>
        </div>
    );
};

export default DirectEmailSection;
