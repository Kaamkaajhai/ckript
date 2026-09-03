import { useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../../../context/AuthContext";
import { AUTHENTICATED_PROFILE_STATUS } from "../../../../pages/profile/authenticatedProfile";
import { updateAccountSettings } from "../../../../pages/profile/accountSecurity";
import {
  mergeOwnProfileUpdate,
  saveOwnProfile,
  uploadOwnProfileImage,
} from "../../../../pages/profile/profileEditor";
import { useAuthenticatedProfile } from "../../../../pages/profile/useAuthenticatedProfile";
import {
  readProfileCollectionLocation,
  removeSavedProjectFromViewer,
  writeProfileCollectionLocation,
} from "../../../../pages/profile/profileCollections";
import { useProfileCollections } from "../../../../pages/profile/useProfileCollections";
import { useToast } from "../../../components/feedback/toastContext";
import NavBar from "../../../components/navigation/NavBar";
import MobileShell from "../../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../../shell/mobileShellModes";
import { buildOwnerProfileView } from "../owner-profile/ownerProfileModel";
import ProfileCollectionsMobile from "../profile-collections/ProfileCollectionsMobile";
import ProfileDesk, { DeskBanner, DeskBar, DeskCta, DeskState } from "./ProfileDesk";
import ProfileEditorDialog from "./ProfileEditorDialog";
import {
  DeskChips,
  DeskEmpty,
  DeskFactRow,
  DeskIdentity,
  DeskLabel,
  DeskList,
  DeskLoading,
  DeskPanel,
  DeskProgress,
  DeskStackRow,
  DeskStats,
  DeskSwitchRow,
  DeskTabList,
} from "./ProfileDeskParts";
import {
  DESK_TAB,
  deskAudienceOf,
  deskOwnerStats,
  deskProjects,
  deskStatus,
  deskTabs,
  readDeskTab,
  writeDeskTab,
} from "./profileDeskModel";
import "./ProfileDesk.css";

/*
 * OwnerProfileDesk — your own profile.
 *
 * The prototype's 2c ("My profile") and 2d ("My desk"). Unlike the visitor
 * screen this is a tab root, and the prototype says so: its bar has no back
 * chevron, its title sits against the leading edge, and its one trailing
 * control is "Edit". So it keeps the shell's STANDARD mode and the bottom tab
 * bar, and the docked action sits above them.
 *
 * TWO SWITCHES, ONE MUTATION. The prototype's "Open to work" toggle is not
 * decoration — it is the thing that decides whether anyone can find you. Ours
 * are the two real settings behind that: `isPrivate` (both roles) and, for a
 * writer, `allowIndustryContact`. Both write through the same
 * `updateAccountSettings` the Account & security screen uses, so the two
 * screens can never hold different opinions about the same field.
 */

const EDIT_HINT = "Edit anything on this page from the editor.";

/*
 * `previewData` / `previewCollection` are the same fixture seam ProjectDetail
 * already uses (mobile/dev/ProjectDetailHarness.jsx): this screen is
 * personalized end to end, so the only way to look at the same pixels twice is
 * to hand it the payload instead of the network. They are never passed in
 * production — MobileRoutes mounts the screen without them.
 */
export default function OwnerProfileDesk({ user, previewData = null, previewCollection = null }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setUser } = useContext(AuthContext);
  const toast = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [settingBusy, setSettingBusy] = useState("");
  const profileKey = id || user?._id;

  const canonicalize = useCallback((path) => {
    if (path && path !== location.pathname) navigate(`${path}${location.search}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const liveState = useAuthenticatedProfile({
    profileKey: previewData ? "" : profileKey,
    viewer: user,
    onCanonicalPath: canonicalize,
  });
  const profileState = previewData ? { ...liveState, ...previewData } : liveState;
  const ready = profileState.status === AUTHENTICATED_PROFILE_STATUS.READY;
  const collectionLocation = readProfileCollectionLocation(searchParams, { own: true });
  const liveCollection = useProfileCollections({
    profileId: profileState.profile?._id,
    section: collectionLocation.section,
    page: collectionLocation.page,
    enabled: ready && !previewData,
  });
  const collectionState = previewCollection ? { ...liveCollection, ...previewCollection } : liveCollection;

  const view = useMemo(() => buildOwnerProfileView({
    profile: profileState.profile || {},
    scripts: profileState.scripts,
    purchasedScripts: profileState.purchasedScripts,
    bookmarkedScripts: profileState.bookmarkedScripts,
    collectionCounts: collectionState.data?.counts,
  }), [collectionState.data?.counts, profileState.bookmarkedScripts, profileState.profile, profileState.purchasedScripts, profileState.scripts]);

  const projects = useMemo(() => deskProjects(profileState.scripts), [profileState.scripts]);
  const tabs = useMemo(() => deskTabs({ view, own: true, collections: true }), [view]);
  const tab = readDeskTab(searchParams, tabs);
  const audience = deskAudienceOf(view);

  const selectTab = useCallback((key) => {
    setSearchParams(writeDeskTab(searchParams, key), { replace: true });
  }, [searchParams, setSearchParams]);

  const updateCollectionLocation = useCallback((section, page = 1) => {
    setSearchParams(writeProfileCollectionLocation(searchParams, { section, page }));
  }, [searchParams, setSearchParams]);

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

  const reloadProfile = profileState.reload;
  const reloadCollections = collectionState.reload;
  const reloadAll = useCallback(() => {
    reloadProfile();
    reloadCollections();
  }, [reloadCollections, reloadProfile]);

  /* --- Loading and failure ---------------------------------------------- */

  if (profileState.status === AUTHENTICATED_PROFILE_STATUS.LOADING) {
    return (
      <MobileShell
        mode={MOBILE_SHELL_MODE.STANDARD}
        screenId="profile-owner"
        scrollClassName="ckm-desk__scroll"
        bottomNav={<NavBar user={user} />}
      >
        <div className="ckm-desk">
          <DeskBar own title="My profile" />
          <DeskLoading shape="rows" label="Loading your profile…" />
        </div>
      </MobileShell>
    );
  }

  if (!ready) {
    return (
      <MobileShell
        mode={MOBILE_SHELL_MODE.STANDARD}
        screenId="profile-owner"
        scrollClassName="ckm-desk__scroll"
        bottomNav={<NavBar user={user} />}
      >
        <div className="ckm-desk">
          <DeskBar own title="My profile" />
          <DeskState
            icon="cloud_off"
            title="Could not load your profile"
            body={profileState.failure?.message || "Check your connection and try again."}
          >
            <DeskCta label="Try again" onClick={profileState.reload} />
          </DeskState>
        </div>
      </MobileShell>
    );
  }

  /* --- Mutations --------------------------------------------------------- */

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

  /* One mutation for both switches, and it is the same one Account & security
     calls. The optimistic path is deliberately absent: a visibility control
     that says "public" while the server still says "private" is the worst of
     both, so the switch waits and the row is disabled while it does. */
  const changeSetting = async (key, payload, message) => {
    if (settingBusy) return;
    setSettingBusy(key);
    try {
      const result = await updateAccountSettings(payload);
      if (!result.ok) {
        toast.error("That did not save", result.message);
        return;
      }
      profileState.applyProfileUpdate(result.data?.user || payload);
      syncViewer(result.data?.user || payload);
      toast.success(message);
    } finally {
      setSettingBusy("");
    }
  };

  const removeSaved = async (projectId) => {
    const result = await collectionState.removeSaved(projectId);
    if (!result.ok) return;
    setUser((current) => {
      if (!current) return current;
      const next = removeSavedProjectFromViewer(current, projectId, result.data?.source);
      try { localStorage.setItem("user", JSON.stringify(next)); } catch { /* memory state remains authoritative */ }
      return next;
    });
    if (result.pageBecameEmpty) updateCollectionLocation("bookmarks", collectionLocation.page - 1);
    toast.success("Removed from saved projects");
    window.dispatchEvent(new CustomEvent("bookmarkUpdated", {
      detail: { scriptId: projectId, bookmarked: false, source: result.data?.source },
    }));
  };

  /* --- Chrome ------------------------------------------------------------ */

  const profile = profileState.profile || {};
  const isPrivate = Boolean(profile.isPrivate);
  const openToContact = profile.allowIndustryContact !== false;
  /* The dot belongs to the switch below, not to the name — see DeskIdentity. */
  const status = { meta: deskStatus({ view, profile }).meta };
  const statCells = deskOwnerStats(view);
  const openEditor = () => { setEditorError(""); setEditorOpen(true); };
  const baseId = "ckm-desk-owner";

  const bar = (
    <DeskBar
      own
      title={view.writer ? "My profile" : "My desk"}
      action={{ label: "Edit", onClick: openEditor }}
    />
  );

  const dock = view.writer
    ? <DeskCta label="Add a project" icon="add" to="/create-project" />
    : <DeskCta label="Post a mandate" icon="add" to="/mandates" />;

  const overlays = editorOpen ? (
    <ProfileEditorDialog
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

  return (
    <ProfileDesk
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="profile-owner"
      audience={audience}
      bar={bar}
      dock={dock}
      bottomNav={<NavBar user={user} />}
      overlays={overlays}
      onConnectionRestored={reloadAll}
    >
      {isPrivate ? (
        <DeskBanner
          tone="ink"
          icon="visibility_off"
          title="Your profile is hidden"
          body="Only approved followers can see it, and you will not appear in search."
          action={{
            label: "Unhide",
            pending: settingBusy === "privacy",
            onClick: () => changeSetting("privacy", { isPrivate: false }, "You are discoverable again"),
          }}
        />
      ) : null}

      {view.pendingFollowRequests ? (
        <DeskBanner
          tone="accent"
          icon="person_add"
          title={`${view.pendingFollowRequests} follow request${view.pendingFollowRequests === 1 ? "" : "s"} waiting`}
          body="Approve or decline them so your follower list stays yours."
          action={{ label: "Review", to: "/follow-requests" }}
        />
      ) : null}

      <DeskIdentity
        name={view.name}
        image={view.image}
        verified={view.professional}
        role={[view.role, view.location].filter(Boolean).join(" · ")}
        status={status}
        editable
        onPortrait={openEditor}
      />

      <DeskSwitchRow
        label={isPrivate ? "Private account" : "Discoverable"}
        note={isPrivate
          ? "Only approved followers can see your profile."
          : "Producers and writers can find you in search."}
        checked={!isPrivate}
        pending={settingBusy === "privacy"}
        controlLabel="Discoverable in search"
        onChange={(next) => changeSetting(
          "privacy",
          { isPrivate: !next },
          next ? "You are discoverable again" : "Your profile is hidden",
        )}
      />

      {view.writer ? (
        <DeskSwitchRow
          label={openToContact ? "Open to contact" : "Not taking contact"}
          note="Verified industry professionals may spend a credit to see your contact details."
          checked={openToContact}
          pending={settingBusy === "contact"}
          controlLabel="Open to industry contact"
          onChange={(next) => changeSetting(
            "contact",
            { allowIndustryContact: next },
            next ? "You are open to industry contact" : "Industry contact is off",
          )}
        />
      ) : null}

      {!view.completion.isComplete ? (
        <DeskProgress
          percent={view.completion.percentage}
          label={`Profile ${view.completion.percentage}% complete`}
          cta={view.completion.totalFields
            ? `${view.completion.completedFields} of ${view.completion.totalFields}`
            : "Finish it"}
          onClick={openEditor}
        />
      ) : null}

      <DeskStats cells={statCells} onSelect={selectTab} label="Your totals" />

      <DeskTabList tabs={tabs} value={tab} onChange={selectTab} baseId={baseId} label="Your profile sections" />

      {tab === DESK_TAB.WORK ? (
        <DeskPanel tabKey={tab} baseId={baseId}>
          {projects.length ? (
            <>
              <DeskList tall>
                {projects.map((project) => (
                  <DeskStackRow
                    key={project.id}
                    title={project.title}
                    meta={project.metaPlain}
                    score={project.badge}
                    to={`/script/${encodeURIComponent(project.id)}`}
                    chevron
                  />
                ))}
              </DeskList>
              <DeskLabel>Manage</DeskLabel>
              <DeskList>
                <DeskFactRow label="All projects and drafts" value="Dashboard" to="/dashboard" chevron />
                <DeskFactRow label="Add a project" value="Upload" to="/create-project" chevron />
              </DeskList>
              <p className="ckm-desk__footnote">
                Only published projects appear here. Drafts stay in your dashboard until you publish them.
              </p>
            </>
          ) : (
            <DeskEmpty
              icon="note_add"
              title="No published projects yet"
              body="Upload a script and Ckript builds its title page, page count and scene index for you."
              action={{ label: "Add a project", to: "/create-project" }}
            />
          )}
        </DeskPanel>
      ) : null}

      {tab === DESK_TAB.MANDATE ? (
        <DeskPanel tabKey={tab} baseId={baseId}>
          {view.facts.length || view.mandates?.genres?.length || view.mandates?.formats?.length ? (
            <>
              <DeskList tall>
                {view.facts.map(([label, value]) => (
                  <DeskFactRow key={label} label={label} value={value} onClick={openEditor} chevron />
                ))}
              </DeskList>
              <DeskLabel>Reading for</DeskLabel>
              {view.mandates?.genres?.length
                ? <DeskChips values={view.mandates.genres} />
                : <p className="ckm-desk__footnote">No genres set — writers cannot match you without them.</p>}
              <DeskLabel>Formats</DeskLabel>
              {view.mandates?.formats?.length
                ? <DeskChips values={view.mandates.formats} />
                : <p className="ckm-desk__footnote">No formats set yet.</p>}
              <p className="ckm-desk__footnote">{EDIT_HINT}</p>
            </>
          ) : (
            <DeskEmpty
              icon="policy"
              title="No mandate yet"
              body="Writers cannot find you without one. Two lines about what you are reading for is enough."
              action={{ label: "Edit the mandate", onClick: openEditor }}
            />
          )}
        </DeskPanel>
      ) : null}

      {tab === DESK_TAB.ABOUT ? (
        <DeskPanel tabKey={tab} baseId={baseId}>
          <p className="ckm-desk__prose">{view.bio}</p>

          <DeskList>
            {view.username ? <DeskFactRow label="Username" value={`@${view.username}`} onClick={openEditor} chevron /> : null}
            {view.email ? <DeskFactRow label="Email" value={view.email} to="/profile?tab=settings" chevron /> : null}
            {view.phone ? <DeskFactRow label="Phone" value={view.phone} onClick={openEditor} chevron /> : null}
            {view.location ? <DeskFactRow label="Location" value={view.location} onClick={openEditor} chevron /> : null}
            {view.writer
              ? view.facts.map(([label, value]) => (
                <DeskFactRow key={label} label={label} value={value} onClick={openEditor} chevron />
              ))
              : null}
          </DeskList>

          {view.skills.length ? (<><DeskLabel>Skills</DeskLabel><DeskChips values={view.skills} /></>) : null}
          {view.genres.length ? (<><DeskLabel>Genres</DeskLabel><DeskChips values={view.genres} /></>) : null}
          {view.tags.length ? (<><DeskLabel>Specialized tags</DeskLabel><DeskChips values={view.tags} /></>) : null}
          {view.badges.length ? (
            <><DeskLabel>Achievements</DeskLabel><DeskChips values={view.badges.map((badge) => badge.label)} /></>
          ) : null}

          {view.links.length ? (
            <>
              <DeskLabel>Links</DeskLabel>
              <DeskList>
                {view.links.map((link) => (
                  <DeskFactRow key={link.url} label={link.label} value="Open" href={link.url} chevron />
                ))}
              </DeskList>
            </>
          ) : null}

          <DeskLabel>Your numbers</DeskLabel>
          <DeskList>
            {view.stats.map((stat) => <DeskFactRow key={stat.key} label={stat.label} value={String(stat.value)} />)}
            <DeskFactRow label="Followers" value={String(view.followers)} />
            <DeskFactRow label="Following" value={String(view.following)} />
          </DeskList>

          <DeskLabel>Manage</DeskLabel>
          <DeskList>
            <DeskFactRow label="Account &amp; security" value="Open" to="/profile?tab=settings" chevron />
            <DeskFactRow
              label="Follow requests"
              value={view.pendingFollowRequests ? String(view.pendingFollowRequests) : "None"}
              to="/follow-requests"
              chevron
            />
            {view.writer
              ? <DeskFactRow label="Collaboration requests" value="Open" to="/collaborations" chevron />
              : null}
          </DeskList>

          <p className="ckm-desk__footnote">{EDIT_HINT}</p>
        </DeskPanel>
      ) : null}

      {tab === DESK_TAB.ACTIVITY ? (
        <DeskPanel tabKey={tab} baseId={baseId}>
          <ProfileCollectionsMobile
            state={collectionState}
            section={collectionLocation.section}
            page={collectionLocation.page}
            own
            onLocationChange={updateCollectionLocation}
            onRemoveSaved={removeSaved}
          />
        </DeskPanel>
      ) : null}
    </ProfileDesk>
  );
}
