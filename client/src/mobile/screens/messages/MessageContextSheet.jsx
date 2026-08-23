import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import Button from "../../components/buttons/Button";
import Sheet from "../../components/overlays/Sheet";

const fileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function MessageContextSheet({
  open = false,
  member = null,
  context = {},
  canSchedule = false,
  onSchedule = null,
  onClose = null,
}) {
  const projects = context.linkedProjects || [];
  const files = context.sharedFiles || [];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Conversation details"
      description={`With ${member?.name || "this member"}`}
      className="ckm-messages__context-sheet"
    >
      <div className="ckm-messages__context">
        <section>
          <h3>Member</h3>
          <Link to={`/profile/${encodeURIComponent(member?._id || "")}`}>
            View {member?.name || "member"}&apos;s profile
          </Link>
        </section>

        <section>
          <h3>Linked projects</h3>
          {projects.length ? projects.map((project) => (
            <Link key={project.id} to={`/script/${encodeURIComponent(project.id)}`}>
              {project.title || "Open linked project"}
            </Link>
          )) : <p>No project has been linked in this conversation.</p>}
          {canSchedule ? (
            <Button variant="secondary" fullWidth icon="calendar_add_on" onClick={onSchedule}>
              Request a meeting
            </Button>
          ) : null}
        </section>

        <section>
          <h3>AI trailer</h3>
          <p>{context.adminTrailer ? "A trailer was shared by Ckript in this thread." : "No trailer has been shared yet."}</p>
        </section>

        <section>
          <h3>Shared files ({files.length})</h3>
          {files.length ? (
            <ul className="ckm-messages__context-files">
              {files.map((message, index) => (
                <li key={message._id || `${message.fileUrl}-${index}`}>
                  <a href={resolveMediaUrl(message.fileUrl)} target="_blank" rel="noreferrer">
                    <span>{message.fileName || "Open attachment"}</span>
                    <small>{fileSize(message.fileSize) || String(message.fileType || "file")}</small>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p>No files shared yet.</p>}
        </section>
      </div>
    </Sheet>
  );
}
