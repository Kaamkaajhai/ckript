import { COLLAB_ROLES, getCollabRoleLabel } from "../../../constants/collabRoles";
import { getCollaboratorUserId } from "../../../components/collab/useCollaborators";

/*
 * Ckript Mobile — the People surface's rows and permission rules (decision D18).
 *
 * Pure. The question this file answers is "what may THIS viewer do to THIS
 * person?", and it is the only question on the surface whose wrong answer is a
 * security-shaped bug rather than a layout one — so it is a function with tests
 * rather than three nested ternaries inside JSX.
 */

/** Who is in the document right now (live presence, not the access list). */
export const buildPresenceRows = (people = [], { myUserId = null } = {}) =>
  (Array.isArray(people) ? people : []).map((person) => ({
    key: String(person.userId),
    name: person.name || "Someone",
    isYou: String(person.userId) === String(myUserId),
    color: person.color || null,
    // "Editing INT. KITCHEN - DAY" is the useful sentence; "editing" alone is
    // not, and neither is a scene with no verb in front of it.
    activity: [
      person.state === "editing" ? "Editing" : "Viewing",
      person.sceneHeading || "",
    ].filter(Boolean).join(" · "),
  }));

/*
 * Who HAS ACCESS, and what this viewer may do about it.
 *
 * Three rules, all of which desktop also applies but spread across the JSX:
 *   • only the owner may change roles or remove anyone;
 *   • the owner may not remove themselves (the panel would be orphaned);
 *   • a row identifies people by user id, falling back to the invited email —
 *     a pending invite has no user record yet, and it is still removable.
 */
export const buildAccessRows = (entries = [], {
  isOwner = false,
  myUserId = null,
  pending = false,
} = {}) => (Array.isArray(entries) ? entries : []).map((entry) => {
  const userId = getCollaboratorUserId(entry);
  const key = userId || entry.invitedEmail || entry._id;
  const isMe = Boolean(userId) && String(userId) === String(myUserId);
  return {
    key,
    id: entry._id,
    name: entry.user?.name || entry.invitedEmail || "Unknown user",
    email: entry.user?.email || entry.invitedEmail || "",
    roleLabel: getCollabRoleLabel(entry.role),
    role: entry.role,
    accessLabel: entry.accessLevel === "content_only" ? "Content only" : "Full access",
    accessLevel: entry.accessLevel || "full_access",
    pending,
    isMe,
    canManage: Boolean(isOwner) && !isMe,
  };
});

/*
 * THE ACCESS-LEVEL CONTROL IS ONLY REAL FOR A FULL ADMIN (DEF-16).
 *
 * Desktop renders a `<select>` whose only option is "Content" unless the
 * collaborator is already `full_admin` — a one-option dropdown that cannot
 * change anything, on every other row. §2.8 calls that a placeholder dead end,
 * and it is worse than absent: it says an access level is adjustable when it is
 * not. So the choice is offered only where it has two answers, and every other
 * row states its access level as text.
 */
export const accessChoices = (row) => (
  row?.role === "full_admin"
    ? [
      { value: "full_access", label: "Full access" },
      { value: "content_only", label: "Content only" },
    ]
    : []
);

/** The roles an invite may be sent with, as the invite form's options. */
export const inviteRoleOptions = () => COLLAB_ROLES.map((role) => ({
  value: role.value,
  label: role.label || getCollabRoleLabel(role.value),
}));

/*
 * The invite form's own refusal, stated before the send rather than after it —
 * the same rule D17 applied to the comment composer.
 */
export const describeInvite = ({ isOwner = false, email = "", sending = false } = {}) => {
  if (!isOwner) {
    return { enabled: false, canSend: false, reason: "Only the script's owner can invite collaborators." };
  }
  const trimmed = String(email).trim();
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  return {
    enabled: true,
    canSend: looksLikeEmail && !sending,
    // Empty is not an error, it is "not filled in yet". Only a wrong-looking
    // address earns a message, and it appears once there is something to judge.
    reason: trimmed && !looksLikeEmail ? "That does not look like an email address." : "",
  };
};
