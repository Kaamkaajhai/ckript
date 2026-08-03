import { useAdminDashboard } from "../dashboardContext";
import { BroadcastComposer, Pagination } from "../dashboardShared";
import { Card, SectionHeader } from "../ui";
import UsersDataTable from "./shared/UsersDataTable";

/**
 * "investors" / "writers" / "readers" — re-skinned onto the admin kit (stage 6b).
 *
 * The broadcast composers and every handler are unchanged; UsersDataTable replaces the hand-rolled
 * UserTable with the same props contract, adding sorting, column visibility, CSV export and the
 * shared states on top.
 */

const TITLES = {
  investors: "Film Professionals",
  writers: "Writers",
  readers: "Readers",
};

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
      <SectionHeader
        title={TITLES[activeTab] || "Readers"}
        count={hasSearch ? filteredUsers.length : total}
      />

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

      <Card flush>
        <UsersDataTable
          users={filteredUsers}
          exportName={activeTab}
          onViewUser={setSelectedUserDetail}
          onFreezeUser={(user) => handleFreezeToggleUser(user, true)}
          onUnfreezeUser={(user) => handleFreezeToggleUser(user, false)}
          onGrantPremium={handleGrantPremiumToUser}
          onRemovePremium={handleRemovePremiumFromUser}
          onDeleteUser={handleDeleteUserAccount}
          userActionLoading={userActionLoading}
        />
      </Card>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark />
    </div>
  );
};

export default UsersSection;
