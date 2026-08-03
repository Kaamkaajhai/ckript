import { getUserProfileSummary } from "../../dashboardShared";
import { Badge, Button, DataTable } from "../../ui";

/**
 * The kit-based replacement for dashboardShared's UserTable — same props contract, so consumer
 * sections swap it in without touching their handlers. Server pagination and the shell search stay
 * outside; this adds sorting, column visibility, CSV export and the shared states.
 *
 * Action VISIBILITY rules are copied verbatim from the original (premium buttons only for the
 * industry roles, freeze/unfreeze mutually exclusive, everything disabled while that user's action
 * is in flight) — the buttons changed skin, not behaviour.
 */

const PREMIUM_ROLES = new Set(["investor", "producer", "director", "industry", "professional"]);

const ROLE_TONE = {
  investor: "success", producer: "success", director: "success", industry: "success", professional: "success",
  writer: "info", creator: "info",
  finance: "gold",
};

const statusOf = (u) => (u.isDeactivated ? "Deleted" : u.isFrozen ? "Frozen" : "Active");
const STATUS_TONE = { Deleted: "danger", Frozen: "warn", Active: "success" };

export default function UsersDataTable({
  users,
  onLoginAs = null,
  onViewUser = null,
  onFreezeUser = null,
  onUnfreezeUser = null,
  onGrantPremium = null,
  onRemovePremium = null,
  onDeleteUser = null,
  userActionLoading = "",
  exportName = "users",
}) {
  const hasRowActions = Boolean(onLoginAs || onViewUser || onFreezeUser || onUnfreezeUser
    || onGrantPremium || onRemovePremium || onDeleteUser);

  const columns = [
    {
      key: "user",
      header: "User",
      sortable: true,
      sortValue: (u) => u.name || "",
      render: (u) => (
        <span className="adtb-user">
          {u.profileImage
            ? <img src={u.profileImage} alt="" className="adtb-avatar" />
            : <span className="adtb-avatar adtb-avatar--initial">{u.name?.charAt(0)?.toUpperCase() || "?"}</span>}
          <span>
            {u.name}
            <span className="adtb-sub">
              <Badge tone={STATUS_TONE[statusOf(u)]}>{statusOf(u)}</Badge>
            </span>
            {u.phone ? <span className="adtb-sub">{u.phone}</span> : null}
            {getUserProfileSummary(u) ? <span className="adtb-sub">{getUserProfileSummary(u)}</span> : null}
          </span>
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      render: (u) => u.email,
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (u) => <Badge tone={ROLE_TONE[String(u.role).toLowerCase()] || "accent"}>{u.role}</Badge>,
    },
    {
      key: "joined",
      header: "Joined",
      sortable: true,
      sortValue: (u) => new Date(u.createdAt || 0).getTime(),
      render: (u) => new Date(u.createdAt).toLocaleDateString(),
    },
  ];

  if (hasRowActions) {
    columns.push({
      key: "actions",
      header: "Actions",
      sortValue: () => "",
      render: (u) => {
        const role = String(u.role).toLowerCase();
        const busy = (key) => userActionLoading === `${key}-${u._id}`;
        return (
          <span className="adtb-rowactions adtb-rowactions--wrap">
            {onViewUser ? (
              <Button size="sm" variant="ghost" onClick={() => onViewUser(u)}>View Details</Button>
            ) : null}
            {onLoginAs ? (
              <Button size="sm" variant="ghost" disabled={u.isFrozen || u.isDeactivated} onClick={() => onLoginAs(u._id)}>
                Login As
              </Button>
            ) : null}
            {onGrantPremium && PREMIUM_ROLES.has(role) && !u.isPremium ? (
              <Button size="sm" variant="ghost" disabled={Boolean(u.isDeactivated)} loading={busy("premium")} onClick={() => onGrantPremium(u)}>
                Grant Premium
              </Button>
            ) : null}
            {onRemovePremium && PREMIUM_ROLES.has(role) && u.isPremium ? (
              <Button size="sm" variant="ghost" disabled={Boolean(u.isDeactivated)} loading={busy("remove-premium")} onClick={() => onRemovePremium(u)}>
                Remove Premium
              </Button>
            ) : null}
            {onFreezeUser && !u.isFrozen && !u.isDeactivated ? (
              <Button size="sm" variant="ghost" loading={busy("freeze")} onClick={() => onFreezeUser(u)}>Freeze</Button>
            ) : null}
            {onUnfreezeUser && u.isFrozen && !u.isDeactivated ? (
              <Button size="sm" variant="ghost" loading={busy("unfreeze")} onClick={() => onUnfreezeUser(u)}>Unfreeze</Button>
            ) : null}
            {onDeleteUser ? (
              <Button size="sm" variant="ghost" className="adtb-danger" disabled={Boolean(u.isDeactivated)} loading={busy("delete")} onClick={() => onDeleteUser(u)}>
                {u.isDeactivated ? "Deleted" : "Delete"}
              </Button>
            ) : null}
          </span>
        );
      },
    });
  }

  return (
    <DataTable
      columns={columns}
      rows={users}
      search={false}
      paginate={false}
      exportName={exportName}
      empty={{ title: "No users found" }}
    />
  );
}
