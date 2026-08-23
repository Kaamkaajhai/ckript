import { useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PUBLIC_PROFILE_STATUS, usePublicProfile } from "../../../../pages/profile/usePublicProfile";
import { resolveMediaUrl } from "../../../../utils/mediaUrl";
import PageHeader from "../../../components/app-bars/PageHeader";
import Badge from "../../../components/badges/Badge";
import Button from "../../../components/buttons/Button";
import InlineMessage from "../../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../../components/feedback/Skeletons";
import MobileShell from "../../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../../shell/mobileShellModes";
import { buildPublicProfileView } from "./publicProfileModel";
import "./PublicProfileMobile.css";

const ChipList = ({ label, values }) => {
  if (!values?.length) return null;

  return (
    <section className="ckm-public-profile__section" aria-label={label}>
      <h2>{label}</h2>
      <div className="ckm-public-profile__chips">
        {values.map((value) => <Badge key={value}>{value}</Badge>)}
      </div>
    </section>
  );
};

const PublishedProjects = ({ projects }) => (
  <section className="ckm-public-profile__projects" aria-labelledby="public-profile-projects">
    <div>
      <h2 id="public-profile-projects">Published projects</h2>
      <Badge srLabel={`${projects.length} published projects`}>{projects.length}</Badge>
    </div>
    {projects.length ? (
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <Link to={`/share/project/${encodeURIComponent(project.id)}`}>
              <span>{project.genre}</span>
              <strong>{project.title}</strong>
              <p>{project.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    ) : <p>No public projects available right now.</p>}
  </section>
);

export default function PublicProfileMobile({ previewData = undefined }) {
  const { id } = useParams();
  const location = useLocation();
  const result = usePublicProfile({ id, enabled: previewData === undefined });
  const profile = previewData?.user ?? result.profile;
  const scripts = previewData?.scripts ?? result.scripts;
  const status = previewData ? PUBLIC_PROFILE_STATUS.READY : result.status;
  const view = useMemo(() => buildPublicProfileView(profile || {}, scripts), [profile, scripts]);
  const loginTo = `/login?next=${encodeURIComponent(`${location.pathname}${location.search}`)}`;

  const header = (
    <PageHeader
      title={profile ? view.name : "Shared profile"}
      backTo="/"
      actions={<Button to={loginTo} variant="tertiary" size="sm">Sign in</Button>}
    />
  );

  if (status === PUBLIC_PROFILE_STATUS.LOADING) {
    return (
      <MobileShell mode={MOBILE_SHELL_MODE.PUBLIC} screenId="public-profile" appBar={header}>
        <SkeletonGroup label="Loading shared profile" className="ckm-public-profile__loading">
          <SkeletonShape height={210} />
          <SkeletonShape height={180} />
        </SkeletonGroup>
      </MobileShell>
    );
  }

  if (!profile) {
    const isPrivate = status === PUBLIC_PROFILE_STATUS.PRIVATE;
    return (
      <MobileShell mode={MOBILE_SHELL_MODE.PUBLIC} screenId="public-profile" appBar={header}>
        <div className="ckm-public-profile__state">
          <InlineMessage tone={isPrivate ? "info" : "error"} title={isPrivate ? "This profile is private" : "Profile unavailable"} onRetry={status === PUBLIC_PROFILE_STATUS.FAILED ? result.retry : undefined}>
            {result.message || "This link may be unavailable or incorrect."}
          </InlineMessage>
          <Button to={loginTo} fullWidth>Sign in to Ckript</Button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell mode={MOBILE_SHELL_MODE.PUBLIC} screenId="public-profile" className="ckm-public-profile" appBar={header} onConnectionRestored={result.retry}>
      <article className="ckm-public-profile__page">
        <div className="ckm-public-profile__hero">
          <div className="ckm-public-profile__cover">
            {view.cover ? <img src={resolveMediaUrl(view.cover)} alt="" /> : null}
          </div>
          <div className="ckm-public-profile__identity">
            <div className="ckm-public-profile__avatar">
              {view.image
                ? <img src={resolveMediaUrl(view.image)} alt="" />
                : <span aria-hidden="true">{view.name.charAt(0)}</span>}
            </div>
            <div>
              <p className="ckm-public-profile__eyebrow">Shared profile</p>
              <h2>{view.name}</h2>
              <p>{view.role}{view.memberSince ? ` · Member since ${view.memberSince}` : ""}</p>
            </div>
          </div>
          <div className="ckm-public-profile__stats">
            <span><strong>{view.followers}</strong> followers</span>
            <span><strong>{view.following}</strong> following</span>
            {view.professional ? <Badge tone="accent">Professional</Badge> : null}
          </div>
          <Button to={loginTo} fullWidth>Sign in to connect</Button>
        </div>

        <section className="ckm-public-profile__section">
          <h2>About</h2>
          <p>{view.bio}</p>
        </section>
        {view.facts.length ? (
          <section className="ckm-public-profile__section">
            <h2>{view.writer ? "Writer profile" : "Professional profile"}</h2>
            <dl>
              {view.facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        <ChipList label="Skills" values={view.skills} />
        <ChipList label="Genres" values={view.genres} />
        <ChipList label="Specialized tags" values={view.tags} />
        <ChipList label="Preferred genres" values={view.mandates?.genres} />
        <ChipList label="Formats" values={view.mandates?.formats} />
        {view.links.length ? (
          <section className="ckm-public-profile__section">
            <h2>Public links</h2>
            <div className="ckm-public-profile__links">
              {view.links.map((item) => (
                <a key={item.key} href={item.url} target="_blank" rel="noreferrer">
                  {item.label}<span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {view.writer ? <PublishedProjects projects={view.projects} /> : null}
      </article>
    </MobileShell>
  );
}
