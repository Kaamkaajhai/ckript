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
                <div className="rounded-2xl border mb-6 overflow-hidden bg-[var(--ad-surface)] border-[var(--ad-line)] shadow-sm">
                    <div className="px-5 py-4 border-b border-[var(--ad-line)] bg-[var(--ad-surface-2)]">
                        <h3 className={`text-sm font-extrabold tracking-wide ${isDark ? "text-gray-200" : "text-gray-800"}`}>Target Recipient</h3>
                    </div>
                    <div className="p-5">
                        <input
                            type="text"
                            value={directUserEmail}
                            onChange={(e) => setDirectUserEmail(e.target.value)}
                            placeholder="Enter exact user email or multiple comma-separated emails (e.g. jdoe@example.com, alice@test.com)"
                            // focus ring was #8B1E1E — the RETIRED brand red, not the current accent.
                            className="w-full rounded-xl border px-4 py-3 text-sm bg-[var(--ad-surface-2)] border-[var(--ad-line-2)] text-[var(--ad-ink)] placeholder:text-[var(--ad-ink-3)] focus:outline-none focus:ring-2 focus:ring-[var(--ad-accent)]"
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
