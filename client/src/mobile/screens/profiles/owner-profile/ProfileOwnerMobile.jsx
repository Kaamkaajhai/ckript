import { useCallback, useContext, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../../../context/AuthContext";
import { AUTHENTICATED_PROFILE_STATUS } from "../../../../pages/profile/authenticatedProfile";
import {
  mergeOwnProfileUpdate,
  saveOwnProfile,
  uploadOwnProfileImage,
} from "../../../../pages/profile/profileEditor";
import { useAuthenticatedProfile } from "../../../../pages/profile/useAuthenticatedProfile";
import { resolveMediaUrl } from "../../../../utils/mediaUrl";
import PageHeader from "../../../components/app-bars/PageHeader";
import Badge from "../../../components/badges/Badge";
import Button from "../../../components/buttons/Button";
import InlineMessage from "../../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../../components/feedback/Skeletons";
import { useToast } from "../../../components/feedback/toastContext";
import NavBar from "../../../components/navigation/NavBar";
import MobileShell from "../../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../../shell/mobileShellModes";
import OwnerProfileEditor from "./OwnerProfileEditor";
import { buildOwnerProfileView } from "./ownerProfileModel";
import "./ProfileOwnerMobile.css";

const ChipList = ({ label, values }) => values?.length ? (
  <section className="ckm-owner-profile__section" aria-label={label}>
    <h2>{label}</h2>
    <div className="ckm-owner-profile__chips">{values.map((value) => <Badge key={value}>{value}</Badge>)}</div>
  </section>
) : null;

export default function ProfileOwnerMobile({ user }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const toast = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editorError, setEditorError] = useState("");
  const profileKey = id || user?._id;

  const canonicalize = useCallback((path) => {
    if (path && path !== location.pathname) navigate(path, { replace: true });
  }, [location.pathname, navigate]);
  const profileState = useAuthenticatedProfile({ profileKey, viewer: user, onCanonicalPath: canonicalize });
  const view = useMemo(() => buildOwnerProfileView({
    profile: profileState.profile || {},
    scripts: profileState.scripts,
    purchasedScripts: profileState.purchasedScripts,
    bookmarkedScripts: profileState.bookmarkedScripts,
  }), [profileState.bookmarkedScripts, profileState.profile, profileState.purchasedScripts, profileState.scripts]);

  const syncViewer = useCallback((update) => {
    const next = mergeOwnProfileUpdate(user || {}, update || {});
    setUser(next);
    try {
      localStorage.setItem("user", JSON.stringify(next));
    } catch {
      // The authenticated in-memory profile remains authoritative when storage
      // is unavailable (private mode, quota exhaustion, or test environments).
    }
  }, [setUser, user]);

  const save = async (draft) => {
    if (saving) return { ok: false, message: "A profile update is already in progress." };
    setSaving(true);
    setEditorError("");
    try {
      const result = await saveOwnProfile({ draft, profile: profileState.profile });
      if (!result.ok) {
        setEditorError(result.message);
        return result;
      }
      profileState.applyProfileUpdate(result.data);
      syncViewer(result.data);
      toast.success("Profile updated", "Your identity and professional overview are current.");
      if (result.data?.canonicalPath && result.data.canonicalPath !== location.pathname) {
        navigate(result.data.canonicalPath, { replace: true });
      }
      return result;
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file) => {
    if (uploading) return { ok: false, message: "An image upload is already in progress." };
    setUploading(true);
    setEditorError("");
    try {
      const result = await uploadOwnProfileImage(file);
      if (!result.ok) {
        setEditorError(result.message);
        return result;
      }
      profileState.applyProfileUpdate(result.data);
      syncViewer(result.data);
      return result;
    } finally {
      setUploading(false);
    }
  };

  const header = <PageHeader title="Your profile" eyebrow="Workspace" backTo="/dashboard" />;
  const shell = (children, overlays = null) => (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="profile-owner"
      className="ckm-owner-profile"
      appBar={header}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={profileState.reload}
      overlays={overlays}
    >
      {children}
    </MobileShell>
  );

  if (profileState.status === AUTHENTICATED_PROFILE_STATUS.LOADING) {
    return shell(<SkeletonGroup label="Loading your profile" className="ckm-owner-profile__loading"><SkeletonShape height={240} /><SkeletonShape height={180} /></SkeletonGroup>);
  }
  if (profileState.status !== AUTHENTICATED_PROFILE_STATUS.READY) {
    return shell(<div className="ckm-owner-profile__state"><InlineMessage variant="panel" tone="error" title="Could not load your profile" onRetry={profileState.reload}>{profileState.failure?.message}</InlineMessage></div>);
  }

  const overlays = editorOpen ? (
    <OwnerProfileEditor
      open={editorOpen}
      profile={profileState.profile}
      pending={saving}
      uploadPending={uploading}
      error={editorError}
      onClose={() => { setEditorOpen(false); setEditorError(""); }}
      onSave={save}
      onUpload={upload}
    />
  ) : null;

  return shell(
    <article className="ckm-owner-profile__page">
      {!view.completion.isComplete ? (
        <section className="ckm-owner-profile__completion" aria-labelledby="profile-completion-title">
          <div>
            <p>Profile completion</p>
            <h2 id="profile-completion-title">{view.completion.percentage}% complete</h2>
            {view.completion.totalFields ? <span>{view.completion.completedFields} of {view.completion.totalFields} required fields</span> : null}
          </div>
          <div className="ckm-owner-profile__progress" role="progressbar" aria-label="Profile completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow={view.completion.percentage}><span style={{ width: `${view.completion.percentage}%` }} /></div>
          <Button fullWidth onClick={() => setEditorOpen(true)}>Complete profile</Button>
        </section>
      ) : null}

      <section className="ckm-owner-profile__hero" aria-labelledby="owner-profile-name">
        <div className="ckm-owner-profile__cover">{view.cover ? <img src={resolveMediaUrl(view.cover)} alt="" /> : null}</div>
        <div className="ckm-owner-profile__identity">
          <div className="ckm-owner-profile__avatar">{view.image ? <img src={resolveMediaUrl(view.image)} alt="" /> : <span aria-hidden="true">{view.name.charAt(0)}</span>}</div>
          <div><p>{view.role}</p><h2 id="owner-profile-name">{view.name}</h2><span>{view.username ? `@${view.username}` : view.location || "Ckript member"}</span></div>
        </div>
        <div className="ckm-owner-profile__connections"><span><strong>{view.followers}</strong> followers</span><span><strong>{view.following}</strong> following</span></div>
        <div className="ckm-owner-profile__actions"><Button onClick={() => setEditorOpen(true)}>Edit profile</Button><Button variant="secondary" to="/profile?tab=settings">Account &amp; security</Button><Button variant="secondary" to="/follow-requests">Follow requests{view.pendingFollowRequests ? ` (${view.pendingFollowRequests})` : ""}</Button></div>
      </section>

      <section className="ckm-owner-profile__stats" aria-label="Profile workspace totals">
        {view.stats.map((stat) => <div key={stat.key}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
      </section>

      <section className="ckm-owner-profile__section">
        <h2>About</h2>
        <p>{view.bio}</p>
        <dl>
          {view.email ? <div><dt>Email</dt><dd>{view.email}</dd></div> : null}
          {view.phone ? <div><dt>Phone</dt><dd>{view.phone}</dd></div> : null}
          {view.location ? <div><dt>Location</dt><dd>{view.location}</dd></div> : null}
          {view.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>
      <ChipList label="Skills" values={view.skills} />
      <ChipList label="Genres" values={view.genres} />
      <ChipList label="Specialized tags" values={view.tags} />
      <ChipList label="Preferred genres" values={view.mandates?.genres} />
      <ChipList label="Formats" values={view.mandates?.formats} />

      {view.links.length ? <section className="ckm-owner-profile__section"><h2>Links</h2><div className="ckm-owner-profile__links">{view.links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</div></section> : null}
      {view.badges.length ? <section className="ckm-owner-profile__section"><h2>Achievements</h2><div className="ckm-owner-profile__chips">{view.badges.map((badge) => <Badge key={badge.id} tone="success">{badge.label}</Badge>)}</div></section> : null}

      {view.writer ? (
        <section className="ckm-owner-profile__projects" aria-labelledby="owner-projects-title">
          <div><h2 id="owner-projects-title">Published projects</h2><Button variant="tertiary" to="/dashboard">Manage all</Button></div>
          {view.projects.length ? <ul>{view.projects.slice(0, 4).map((project) => <li key={project.id}><Link to={`/script/${encodeURIComponent(project.id)}`}><span>{project.genre}</span><strong>{project.title}</strong><p>{project.summary}</p></Link></li>)}</ul> : <p>No published projects yet.</p>}
        </section>
      ) : null}
    </article>,
    overlays,
  );
}
