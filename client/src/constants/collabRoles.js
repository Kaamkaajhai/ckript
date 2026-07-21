// Collaborator roles — the single source of truth for the client.
//
// Values MUST match VALID_COLLAB_ROLES in server/controllers/collab.controller.js. A role missing
// there is silently downgraded to "editor" on invite, so offering one that isn't listed grants more
// access than the label promises.
//
// Collaboration is live co-writing on one shared script, so a role answers: may you type, comment,
// read, or manage people. (The old `merger` role belonged to the removed branch/PR review flow.)

export const COLLAB_ROLES = [
  { value: "editor", label: "Co-writer", hint: "Writes with you live — one scene each at a time" },
  { value: "commenter", label: "Commenter", hint: "Reads and leaves notes, cannot edit" },
  { value: "viewer", label: "Reader", hint: "Read-only access" },
  { value: "full_admin", label: "Co-owner", hint: "Co-writes and manages collaborators" },
];

const LABELS = COLLAB_ROLES.reduce((acc, role) => {
  acc[role.value] = role.label;
  return acc;
}, {});

/** Friendly label for a stored role value. Unknown/legacy values fall back to the raw string. */
export const getCollabRoleLabel = (value = "") => {
  const key = String(value || "").trim().toLowerCase();
  return LABELS[key] || value || "Unknown";
};

/** Roles that can write to the script (mirrors PERMISSIONS.write on the server). */
export const ROLES_WITH_WRITE = ["full_admin", "editor"];

export const canRoleWrite = (value = "") =>
  ROLES_WITH_WRITE.includes(String(value || "").trim().toLowerCase());
