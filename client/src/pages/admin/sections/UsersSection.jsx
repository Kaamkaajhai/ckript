import { useAdminDashboard } from "../dashboardContext";
import { BroadcastComposer, Pagination, UserTable } from "../dashboardShared";

/**
 * "investors" / "writers" / "readers" panel, extracted VERBATIM from AdminDashboard's renderContent in
 * stage 5c. Reads the dashboard's shared scope through context; presentation and behaviour are
 * unchanged. Do not add logic here — this file is a rendering seam, not a home for new features.
 */
const UsersSection = () => {
    const {
        activeTab,
        filmBroadcastContent,
        filmBroadcastLink,
        filmBroadcastTitle,
        filteredUsers,
        handleDeleteUserAccount,
        handleFreezeToggleUser,
        handleGrantPremiumToUser,
        handleRemovePremiumFromUser,
        handleSendAudienceBroadcast,
        hasSearch,
        isDark,
        page,
        setFilmBroadcastContent,
        setFilmBroadcastLink,
        setFilmBroadcastTitle,
        setPage,
        setSelectedUserDetail,
        setWriterBroadcastContent,
        setWriterBroadcastLink,
        setWriterBroadcastTitle,
        total,
        totalPages,
        userActionLoading,
        writerBroadcastContent,
        writerBroadcastLink,
        writerBroadcastTitle,
    } = useAdminDashboard();

                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                {activeTab === "investors" ? "Film Professionals" : activeTab === "writers" ? "Writers" : "Readers"}
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({hasSearch ? filteredUsers.length : total})</span>
                            </h2>
                        </div>
                        {activeTab === "writers" && (
                            <BroadcastComposer
                                isDark={isDark}
                                audienceLabel="Writers"
                                title={writerBroadcastTitle}
                                content={writerBroadcastContent}
                                actionUrl={writerBroadcastLink}
                                onTitleChange={setWriterBroadcastTitle}
                                onContentChange={setWriterBroadcastContent}
                                onActionUrlChange={setWriterBroadcastLink}
                                onSend={() => handleSendAudienceBroadcast("writers")}
                                sending={userActionLoading === "broadcast:writers"}
                            />
                        )}
                        {activeTab === "investors" && (
                            <BroadcastComposer
                                isDark={isDark}
                                audienceLabel="Film Professionals"
                                title={filmBroadcastTitle}
                                content={filmBroadcastContent}
                                actionUrl={filmBroadcastLink}
                                onTitleChange={setFilmBroadcastTitle}
                                onContentChange={setFilmBroadcastContent}
                                onActionUrlChange={setFilmBroadcastLink}
                                onSend={() => handleSendAudienceBroadcast("film-professionals")}
                                sending={userActionLoading === "broadcast:film-professionals"}
                            />
                        )}
                        <UserTable
                            users={filteredUsers}
                            isDark={isDark}
                            onLoginAs={null}
                            onViewUser={setSelectedUserDetail}
                            onFreezeUser={(user) => handleFreezeToggleUser(user, true)}
                            onUnfreezeUser={(user) => handleFreezeToggleUser(user, false)}
                            onGrantPremium={handleGrantPremiumToUser}
                            onRemovePremium={handleRemovePremiumFromUser}
                            onDeleteUser={handleDeleteUserAccount}
                            userActionLoading={userActionLoading}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );
};

export default UsersSection;
