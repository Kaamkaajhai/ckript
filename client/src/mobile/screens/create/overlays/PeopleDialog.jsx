import { useState } from "react";
import useCollaborators from "../../../../components/collab/useCollaborators";
import Button from "../../../components/buttons/Button";
import EmptyState from "../../../components/EmptyState";
import InlineMessage from "../../../components/feedback/InlineMessage";
import SelectField from "../../../components/forms/SelectField";
import TextField from "../../../components/forms/TextField";
import Dialog from "../../../components/overlays/Dialog";
import SkeletonGroup, { SkeletonRows } from "../../../components/feedback/Skeletons";
import {
  accessChoices,
  buildAccessRows,
  buildPresenceRows,
  describeInvite,
  inviteRoleOptions,
} from "../peopleModel";

/*
 * PeopleDialog — the desktop right rail's People tab (decision D18).
 *
 * D18 — A DIALOG, AND FOR A DIFFERENT REASON THAN SCENE CARDS.
 * -----------------------------------------------------------
 * D15's test is what the surface REPLACES. Scene cards replaces the script
 * page. This one replaces the writer's whole task: inviting someone, changing
 * what they may do, revoking their access. That is administration, not writing,
 * and it is the definition Dialog.jsx gives itself — "a task that replaces the
 * screen for its duration ... editing a profile, composing a message".
 *
 * There is a second, concrete reason, and it decided the shape: desktop opens
 * `InviteModal` ON TOP of the panel. A modal over a bottom sheet is two modal
 * layers, which this plan has already refused once (the comment delete
 * confirmation, D17). As a Dialog with the invite form as a SECTION, there is
 * one layer and no nesting.
 *
 * WHAT IS NOT HERE, AND WHY THAT IS NOT A GAP
 * -------------------------------------------
 * The "who is in the document right now" glance is here, but it is not the
 * reason to open this: presence already appears where a writer actually needs
 * it — as dots on the Navigator's scene rows and the corkboard's cards, beside
 * the scene the person is in. This surface is where you go to CHANGE something.
 *
 * IT OWNS NO DATA. `useCollaborators` is the shared hook the desktop panel uses
 * too, so both platforms have one definition of the endpoints and one answer to
 * "is this person listed twice?" (§15 — reuse the service calls, not the DOM).
 */
export default function PeopleDialog({
  open = false,
  onClose = null,
  scriptId = null,
  myUserId = null,
  people = [],
  returnFocusTo = null,
}) {
  const collab = useCollaborators(open ? scriptId : null, myUserId);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");

  const presence = buildPresenceRows(people, { myUserId });
  const active = buildAccessRows(collab.active, { isOwner: collab.isOwner, myUserId });
  const pending = buildAccessRows(collab.pending, { isOwner: collab.isOwner, myUserId, pending: true });
  const invite = describeInvite({ isOwner: collab.isOwner, email, sending });

  const send = async () => {
    if (!invite.canSend) return;
    setSending(true);
    setSent("");
    try {
      const ok = await collab.invite({ email: email.trim(), role, accessLevel: "content_only", message: "" });
      if (ok) { setSent(`Invitation sent to ${email.trim()}.`); setEmail(""); }
    } finally {
      setSending(false);
    }
  };

  /* DEF-14 — removing someone revokes their access to the script and the only
     way back is a fresh invitation they must accept. Desktop did it on one
     click; both platforms now ask. Inline rather than a nested dialog, for the
     reason D17 gives. */
  const askRemove = (row) => {
    if (confirmRemove !== row.key) { setConfirmRemove(row.key); return; }
    setConfirmRemove(null);
    collab.remove(row.key);
  };

  const renderRow = (row) => (
    <li key={row.key} className={`ckm-editor__person${row.pending ? " is-pending" : ""}`}>
      <div className="ckm-editor__person-head">
        <div className="ckm-editor__person-who">
          <p className="ckm-editor__person-name">{row.name}{row.isMe ? " (you)" : ""}</p>
          {row.email && <p className="ckm-editor__person-email">{row.email}</p>}
        </div>
        <span className="ckm-editor__person-role">{row.roleLabel}</span>
      </div>

      <p className="ckm-editor__person-access">
        {row.pending ? "Invited — not accepted yet" : row.accessLabel}
      </p>

      {row.canManage && (
        <div className="ckm-editor__person-actions">
          {/* DEF-16: the access control is offered only where it has more than
              one answer. Every other row states its level as text above. */}
          {accessChoices(row).length > 0 && (
            <SelectField
              label={`Access for ${row.name}`}
              value={row.accessLevel}
              options={accessChoices(row)}
              onChange={(event) => collab.updateRole(row.key, row.role, event.target.value)}
            />
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => askRemove(row)}
          >
            {confirmRemove === row.key
              ? (row.pending ? "Confirm cancel" : "Confirm remove")
              : (row.pending ? "Cancel invite" : "Remove")}
          </Button>
        </div>
      )}

      {confirmRemove === row.key && (
        <p className="ckm-editor__person-warn" role="status">
          {row.pending
            ? "The invitation stops working and they can be invited again later."
            : `${row.name} loses access to this script immediately. Getting it back needs a new invitation.`}
        </p>
      )}
    </li>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="People"
      description="Who is here now, and who has access to this script."
      closeLabel="Close people"
      returnFocusTo={returnFocusTo}
      className="ckm-editor__people"
    >
      {presence.length > 0 && (
        <section className="ckm-editor__people-section" aria-labelledby="ckm-people-now">
          <h3 className="ckm-editor__people-heading" id="ckm-people-now">In the script now</h3>
          <ul className="ckm-editor__people-list">
            {presence.map((person) => (
              <li key={person.key} className="ckm-editor__person ckm-editor__person--live">
                <span
                  className="ckm-editor__person-dot"
                  style={person.color ? { backgroundColor: person.color } : undefined}
                  aria-hidden="true"
                />
                <div className="ckm-editor__person-who">
                  <p className="ckm-editor__person-name">{person.name}{person.isYou ? " (you)" : ""}</p>
                  <p className="ckm-editor__person-email">{person.activity}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!scriptId ? (
        <EmptyState
          icon="group"
          title="Save this project once to invite people"
          body="Collaborators are attached to a saved script, so there is nothing to share yet."
        />
      ) : (
        <>
          {collab.isOwner && (
            <section className="ckm-editor__people-section" aria-labelledby="ckm-people-invite">
              <h3 className="ckm-editor__people-heading" id="ckm-people-invite">Invite someone</h3>
              <TextField
                label="Their email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                error={invite.reason}
                onChange={(event) => { setEmail(event.target.value); setSent(""); }}
              />
              <SelectField
                label="What they can do"
                value={role}
                options={inviteRoleOptions()}
                onChange={(event) => setRole(event.target.value)}
              />
              <div className="ckm-editor__people-invite-actions">
                <Button size="sm" onClick={send} disabled={!invite.canSend}>
                  {sending ? "Sending…" : "Send invitation"}
                </Button>
              </div>
              {sent && <InlineMessage tone="success" variant="panel">{sent}</InlineMessage>}
            </section>
          )}

          {collab.error && (
            <InlineMessage tone="error" variant="panel" className="ckm-editor__people-error">
              {collab.error}
            </InlineMessage>
          )}

          <section className="ckm-editor__people-section" aria-labelledby="ckm-people-access">
            <h3 className="ckm-editor__people-heading" id="ckm-people-access">Who has access</h3>
            {collab.loading ? (
              <SkeletonGroup label="Loading collaborators"><SkeletonRows rows={2} media={false} /></SkeletonGroup>
            ) : active.length === 0 ? (
              <EmptyState icon="group" title="Nobody else yet" body="Invitations you send appear here." />
            ) : (
              <ul className="ckm-editor__people-list">{active.map(renderRow)}</ul>
            )}
          </section>

          {pending.length > 0 && (
            <section className="ckm-editor__people-section" aria-labelledby="ckm-people-pending">
              <h3 className="ckm-editor__people-heading" id="ckm-people-pending">Invited, not accepted</h3>
              <ul className="ckm-editor__people-list">{pending.map(renderRow)}</ul>
            </section>
          )}
        </>
      )}
    </Dialog>
  );
}
