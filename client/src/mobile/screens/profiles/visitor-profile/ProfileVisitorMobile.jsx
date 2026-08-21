import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../../context/AuthContext";
import { AUTHENTICATED_PROFILE_STATUS } from "../../../../pages/profile/authenticatedProfile";
import { useAuthenticatedProfile } from "../../../../pages/profile/useAuthenticatedProfile";
import { resolveMediaUrl } from "../../../../utils/mediaUrl";
import PageHeader from "../../../components/app-bars/PageHeader";
import Badge from "../../../components/badges/Badge";
import Button from "../../../components/buttons/Button";
import InlineMessage from "../../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../../components/feedback/Skeletons";
import { useToast } from "../../../components/feedback/toastContext";
import SelectField from "../../../components/forms/SelectField";
import TextArea from "../../../components/forms/TextArea";
import ConfirmDialog from "../../../components/overlays/ConfirmDialog";
import Dialog from "../../../components/overlays/Dialog";
import NavBar from "../../../components/navigation/NavBar";
import MobileShell from "../../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../../shell/mobileShellModes";
import { buildVisitorProfileView } from "./visitorProfileModel";
import "./ProfileVisitorMobile.css";

const Chips = ({ label, values }) => values?.length ? (
  <section className="ckm-visitor-profile__section" aria-label={label}>
    <h2>{label}</h2>
    <div className="ckm-visitor-profile__chips">
      {values.map((value) => <Badge key={value}>{value}</Badge>)}
    </div>
  </section>
) : null;

const StateScreen = ({ title, message, action = null, retry = null }) => (
  <div className="ckm-visitor-profile__state">
    <InlineMessage
      variant="panel"
      tone={retry ? "error" : "info"}
      title={title}
      onRetry={retry}
      action={action}
    >
      {message}
    </InlineMessage>
  </div>
);

export default function ProfileVisitorMobile({ user }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const toast = useToast();
  const messageButtonRef = useRef(null);
  const pitchButtonRef = useRef(null);
  const blockButtonRef = useRef(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pitchOpen, setPitchOpen] = useState(false);
  const [pitchScripts, setPitchScripts] = useState([]);
  const [pitchDraft, setPitchDraft] = useState({ scriptId: "", note: "" });
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);

  const handleCanonicalPath = useCallback((path) => {
    if (path && path !== location.pathname) navigate(path, { replace: true });
  }, [location.pathname, navigate]);

  const profileState = useAuthenticatedProfile({
    profileKey: id,
    viewer: user,
    setViewer: setUser,
    onCanonicalPath: handleCanonicalPath,
  });
  const view = useMemo(() => buildVisitorProfileView({
    profile: profileState.profile || {},
    scripts: profileState.scripts,
    viewer: user,
    relationship: profileState.relationship,
    contact: profileState.contact,
    contactStats: profileState.contactStats,
  }), [profileState.contact, profileState.contactStats, profileState.profile, profileState.relationship, profileState.scripts, user]);

  const header = (
    <PageHeader
      title={profileState.profile?.name || "Member profile"}
      eyebrow="Profile"
      backTo="/search?scope=people"
    />
  );
  const shell = (children, overlays = null) => (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="profile-visitor"
      className="ckm-visitor-profile"
      appBar={header}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={profileState.reload}
      overlays={overlays}
    >
      {children}
    </MobileShell>
  );

  if (profileState.status === AUTHENTICATED_PROFILE_STATUS.LOADING) {
    return shell(
      <SkeletonGroup label="Loading member profile" className="ckm-visitor-profile__loading">
        <SkeletonShape height={240} />
        <SkeletonShape height={180} />
      </SkeletonGroup>,
    );
  }

  if (profileState.status !== AUTHENTICATED_PROFILE_STATUS.READY) {
    const privateProfile = profileState.status === AUTHENTICATED_PROFILE_STATUS.PRIVATE;
    const restricted = profileState.status === AUTHENTICATED_PROFILE_STATUS.RESTRICTED;
    const retry = profileState.status === AUTHENTICATED_PROFILE_STATUS.FAILED ? profileState.reload : null;
    const title = privateProfile
      ? "This profile is private"
      : restricted
        ? "Profile access is restricted"
        : profileState.status === AUTHENTICATED_PROFILE_STATUS.BLOCKED
          ? "Profile unavailable"
          : "Member not found";
    const action = privateProfile && profileState.failure?.profileId ? (
      <Button onClick={profileState.follow} pending={profileState.pending.follow}>
        {profileState.relationship.followRequestPending ? "Cancel follow request" : "Send follow request"}
      </Button>
    ) : restricted ? <Button to="/pricing">View access options</Button> : null;
    return shell(<StateScreen title={title} message={profileState.actionError || profileState.failure?.message} action={action} retry={retry} />);
  }

  const submitMessage = async () => {
    if (!await profileState.sendMessage(message)) return;
    setMessage("");
    setMessageOpen(false);
    toast.success("Message sent", `Your conversation with ${view.name} has started.`);
  };

  const openPitch = async () => {
    setPitchOpen(true);
    const result = await profileState.loadPitchScripts();
    if (!result.ok) return;
    setPitchScripts(result.data);
    setPitchDraft((current) => ({ ...current, scriptId: current.scriptId || result.data[0]?._id || "" }));
  };

  const submitPitch = async () => {
    if (!await profileState.sendPitch(pitchDraft)) return;
    setPitchOpen(false);
    setPitchDraft({ scriptId: "", note: "" });
    toast.success("Pitch sent", `${view.name} can now review your project.`);
  };

  const confirmBlock = async () => {
    if (!await profileState.toggleBlock()) return;
    setBlockConfirmOpen(false);
    toast.success("Member blocked", "Following and messaging are now unavailable.");
  };

  const blockAction = async () => {
    if (view.blockedByCurrent) {
      if (await profileState.toggleBlock()) toast.success("Member unblocked");
      return;
    }
    profileState.clearActionError();
    setBlockConfirmOpen(true);
  };

  const overlays = (
    <>
      <Dialog
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        title={`Message ${view.name}`}
        description="Start a private conversation. The recipient can reply from Messages."
        returnFocusTo={messageButtonRef}
        footer={(
          <Button fullWidth pending={profileState.pending.message} onClick={submitMessage}>
            Send message
          </Button>
        )}
      >
        <TextArea
          label="Message"
          value={message}
          maxLength={500}
          rows={8}
          required
          error={profileState.actionError}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Dialog>
      <Dialog
        open={pitchOpen}
        onClose={() => setPitchOpen(false)}
        title={`Pitch to ${view.name}`}
        description="Choose one of your projects and add an optional note."
        returnFocusTo={pitchButtonRef}
        footer={(
          <Button fullWidth pending={profileState.pending.pitch} disabled={!pitchDraft.scriptId} onClick={submitPitch}>
            Send pitch
          </Button>
        )}
      >
        <div className="ckm-visitor-profile__form">
          <SelectField
            label="Project"
            value={pitchDraft.scriptId}
            placeholder={pitchScripts.length ? "Choose a project" : "No projects available"}
            options={pitchScripts.map((script) => ({ value: script._id, label: script.title || "Untitled project" }))}
            required
            onChange={(event) => setPitchDraft((current) => ({ ...current, scriptId: event.target.value }))}
          />
          <TextArea
            label="Note"
            value={pitchDraft.note}
            maxLength={500}
            rows={6}
            optional
            error={profileState.actionError}
            onChange={(event) => setPitchDraft((current) => ({ ...current, note: event.target.value }))}
          />
        </div>
      </Dialog>
      <ConfirmDialog
        open={blockConfirmOpen}
        onCancel={() => setBlockConfirmOpen(false)}
        onConfirm={confirmBlock}
        title={`Block ${view.name}?`}
        message="You will stop following each other, and neither of you will be able to follow or message the other until you unblock them."
        confirmLabel="Block member"
        destructive
        pending={profileState.pending.block}
        error={profileState.actionError}
        returnFocusTo={blockButtonRef}
      />
    </>
  );

  return shell(
    <article className="ckm-visitor-profile__page">
      <section className="ckm-visitor-profile__hero" aria-labelledby="visitor-profile-name">
        <div className="ckm-visitor-profile__cover">
          {view.cover ? <img src={resolveMediaUrl(view.cover)} alt="" /> : null}
        </div>
        <div className="ckm-visitor-profile__identity">
          <div className="ckm-visitor-profile__avatar">
            {view.image
              ? <img src={resolveMediaUrl(view.image)} alt="" />
              : <span aria-hidden="true">{view.name.charAt(0)}</span>}
          </div>
          <div>
            <p className="ckm-visitor-profile__eyebrow">{view.role}</p>
            <h2 id="visitor-profile-name">{view.name}</h2>
            <p>{view.location || (view.memberSince ? `Member since ${view.memberSince}` : "Ckript member")}</p>
          </div>
        </div>
        <div className="ckm-visitor-profile__stats">
          <span><strong>{view.followers}</strong> followers</span>
          <span><strong>{view.following}</strong> following</span>
          {view.credentials.map((credential) => <Badge key={credential} tone="success">{credential}</Badge>)}
        </div>
        <div className="ckm-visitor-profile__primary-actions">
          <Button
            variant={profileState.relationship.isFollowing || profileState.relationship.followRequestPending ? "secondary" : "primary"}
            pending={profileState.pending.follow}
            disabled={!view.canFollow}
            onClick={profileState.follow}
          >
            {view.followLabel}
          </Button>
          {view.canMessage ? <Button ref={messageButtonRef} variant="secondary" onClick={() => { profileState.clearActionError(); setMessageOpen(true); }}>Message</Button> : null}
          {view.canPitch ? <Button ref={pitchButtonRef} variant="secondary" onClick={openPitch}>Pitch script</Button> : null}
        </div>
        {profileState.actionError && !messageOpen && !pitchOpen && !blockConfirmOpen ? (
          <InlineMessage tone="error">{profileState.actionError}</InlineMessage>
        ) : null}
      </section>

      <section className="ckm-visitor-profile__section">
        <h2>About</h2>
        <p>{view.bio}</p>
      </section>
      {view.facts.length ? (
        <section className="ckm-visitor-profile__section">
          <h2>{view.writer ? "Writer profile" : "Professional profile"}</h2>
          <dl>{view.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>
      ) : null}
      <Chips label="Skills" values={view.skills} />
      <Chips label="Genres" values={view.genres} />
      <Chips label="Specialized tags" values={view.tags} />
      <Chips label="Preferred genres" values={view.mandates?.genres} />
      <Chips label="Formats" values={view.mandates?.formats} />

      {view.writer ? (
        <section className="ckm-visitor-profile__section">
          <h2>Contact</h2>
          {view.contact ? (
            <div className="ckm-visitor-profile__contact">
              {view.contact.email ? <a href={`mailto:${view.contact.email}`}>{view.contact.email}</a> : null}
              {view.contact.phone ? <a href={`tel:${view.contact.phone}`}>{view.contact.phone}</a> : null}
              {view.contact.links.map((item) => <a key={item.key} href={item.url} target="_blank" rel="noreferrer">{item.label} ↗</a>)}
            </div>
          ) : view.canReveal ? (
            <>
              <p>{view.contactLimitReached
                ? `You have used all ${view.contactLimit} contact reveals for this period.`
                : `${view.contactRemaining} of ${view.contactLimit} contact reveals remain.`}</p>
              <Button
                variant="secondary"
                fullWidth
                pending={profileState.pending.contact}
                disabled={view.contactLimitReached}
                onClick={profileState.revealContact}
              >
                {view.contactAlreadyRevealed ? "Show contact details" : "Reveal contact · uses 1"}
              </Button>
            </>
          ) : <p>Contact details are not available for this profile or account.</p>}
        </section>
      ) : null}

      {view.writer ? (
        <section className="ckm-visitor-profile__projects" aria-labelledby="visitor-projects-title">
          <div><h2 id="visitor-projects-title">Published projects</h2><Badge srLabel={`${view.projects.length} published projects`}>{view.projects.length}</Badge></div>
          {view.projects.length ? <ul>{view.projects.map((project) => <li key={project.id}><Link to={`/share/project/${encodeURIComponent(project.id)}`}><span>{project.genre}</span><strong>{project.title}</strong><p>{project.summary}</p></Link></li>)}</ul> : <p>No published projects available.</p>}
        </section>
      ) : null}

      <section className="ckm-visitor-profile__safety" aria-label="Profile safety">
        <Button ref={blockButtonRef} variant="tertiary" onClick={blockAction} pending={profileState.pending.block}>
          {view.blockedByCurrent ? `Unblock ${view.name}` : `Block ${view.name}`}
        </Button>
      </section>
    </article>,
    overlays,
  );
}
