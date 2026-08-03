import {
  getScriptCreatorName,
  getScriptPreviewWindowLabel,
} from "../../dashboardShared";
import {
  getScriptCompletionProgressText,
  getScriptCompletionStatusLabel,
  getScriptCompletionSummary,
} from "../../../../utils/scriptCompletion";
import { Badge, Card, DataTable, StatusPill } from "../../ui";

/**
 * The kit-based replacement for dashboardShared's ScriptTable — same flags, same actions render
 * prop, so seven consumer sections migrate by swapping the component name. Server pagination and
 * the shell search remain outside; this adds sorting, column visibility, CSV export and the
 * shared states.
 */

const completionTone = (s) => {
  const label = String(getScriptCompletionStatusLabel(s) || "").toLowerCase();
  if (label.includes("complete")) return "success";
  if (label.includes("progress") || label.includes("partial")) return "warn";
  return "neutral";
};

const scriptStatus = (s) => {
  if (s.isDeleted) return { label: "deleted", status: "rejected" };
  if (s.status === "pending_approval" && s.approvalRequestType === "edit_submission") {
    return { label: "edit approval", status: "pending" };
  }
  return { label: s.status?.replace("_", " ") || "draft", status: s.status || "draft" };
};

export default function ScriptsDataTable({
  scripts,
  actions = null,
  showScore = false,
  showCreator = true,
  showApprovalType = false,
  showPreviewWindow = false,
  exportName = "scripts",
}) {
  const columns = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      sortValue: (s) => s.title || "",
      render: (s) => (
        <>
          {s.title}
          <span className="adtb-sub">SID: {s.sid || "Pending"}</span>
          {getScriptPreviewWindowLabel(s) ? (
            <span className="adtb-sub">Viewable: {getScriptPreviewWindowLabel(s)}</span>
          ) : null}
        </>
      ),
    },
  ];

  if (showCreator) {
    columns.push({
      key: "creator",
      header: "Creator",
      sortable: true,
      sortValue: (s) => getScriptCreatorName(s),
      render: (s) => getScriptCreatorName(s),
    });
  }

  columns.push(
    {
      key: "genre",
      header: "Genre",
      sortable: true,
      hideable: true,
      sortValue: (s) => s.genre || s.primaryGenre || "",
      render: (s) => s.genre || s.primaryGenre || "—",
    },
    {
      key: "completion",
      header: "Completion",
      sortValue: (s) => getScriptCompletionSummary?.(s) || getScriptCompletionStatusLabel(s) || "",
      render: (s) => (
        <>
          <Badge tone={completionTone(s)}>{getScriptCompletionStatusLabel(s)}</Badge>
          {getScriptCompletionProgressText(s) ? (
            <span className="adtb-sub">{getScriptCompletionProgressText(s)}</span>
          ) : null}
        </>
      ),
    },
  );

  if (showPreviewWindow) {
    columns.push({
      key: "preview",
      header: "Free Preview",
      hideable: true,
      sortValue: (s) => getScriptPreviewWindowLabel(s) || "",
      render: (s) => (getScriptPreviewWindowLabel(s)
        ? <Badge tone="accent">{getScriptPreviewWindowLabel(s)}</Badge>
        : <span className="adtb-sub">Not set</span>),
    });
  }

  if (showApprovalType) {
    columns.push({
      key: "approvalType",
      header: "Approval Type",
      sortValue: (s) => s.approvalRequestType || "",
      render: (s) => (
        <Badge tone={s.approvalRequestType === "edit_submission" ? "accent" : "neutral"}>
          {s.approvalRequestType === "edit_submission" ? "Edit Approval" : "New Submission"}
        </Badge>
      ),
    });
  }

  columns.push({
    key: "status",
    header: "Status",
    sortable: true,
    sortValue: (s) => scriptStatus(s).label,
    render: (s) => {
      const st = scriptStatus(s);
      return <StatusPill status={st.status}>{st.label}</StatusPill>;
    },
  });

  if (showScore) {
    columns.push({
      key: "score",
      header: "Score",
      align: "right",
      sortable: true,
      sortValue: (s) => Number(s.scriptScore?.overall || s.platformScore?.overall || s.rating) || 0,
      render: (s) => s.scriptScore?.overall || s.platformScore?.overall || s.rating || "—",
    });
  }

  columns.push({
    key: "date",
    header: "Date",
    sortable: true,
    sortValue: (s) => new Date(s.createdAt || 0).getTime(),
    render: (s) => new Date(s.createdAt).toLocaleDateString(),
  });

  if (actions) {
    columns.push({
      key: "actions",
      header: "Actions",
      sortValue: () => "",
      render: (s) => <span className="adtb-rowactions adtb-rowactions--wrap">{actions(s)}</span>,
    });
  }

  return (
    <Card flush>
      <DataTable
        columns={columns}
        rows={scripts}
        search={false}
        paginate={false}
        exportName={exportName}
        empty={{ title: "No scripts found" }}
      />
    </Card>
  );
}
