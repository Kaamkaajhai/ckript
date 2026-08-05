import ProfilePcPage from "../ProfilePcPage";

const Bone = ({ className = "" }) => (
  <span className={`profile-pc-skeleton__bone${className ? ` ${className}` : ""}`} />
);

function IdentitySkeleton() {
  return (
    <div className="profile-workspace-identity profile-pc-skeleton__identity" aria-hidden="true">
      <Bone className="profile-workspace-identity__avatar profile-pc-skeleton__avatar" />
      <Bone className="profile-workspace-identity__name profile-pc-skeleton__name" />
      <Bone className="profile-workspace-identity__username profile-pc-skeleton__username" />
      <div className="profile-workspace-identity__badges profile-pc-skeleton__badges">
        <Bone /><Bone /><Bone />
      </div>
      <Bone className="profile-workspace-identity__representation profile-pc-skeleton__representation" />

      <div className="profile-workspace-stats profile-pc-skeleton__stats">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index}><Bone /><Bone /></div>
        ))}
      </div>

      <div className="profile-workspace-actions"><Bone className="profile-pc-skeleton__button" /><Bone className="profile-pc-skeleton__button profile-pc-skeleton__button--secondary" /></div>

    </div>
  );
}

function SkeletonCard({ wide = false, lines = 3 }) {
  return (
    <div className={`profile-pc-skeleton__card${wide ? " profile-pc-skeleton__card--wide" : ""}`}>
      <Bone className="profile-pc-skeleton__card-title" />
      <div className="profile-pc-skeleton__card-lines">
        {Array.from({ length: lines }, (_, index) => (
          <Bone key={index} className={index === lines - 1 ? "profile-pc-skeleton__line--short" : ""} />
        ))}
      </div>
    </div>
  );
}

export default function ProfilePcSkeleton({ isDark = false }) {
  return (
    <ProfilePcPage isDark={isDark} identity={<IdentitySkeleton />}>
      <div className="profile-workspace-tabs profile-pc-skeleton__tabs" aria-hidden="true">
        <Bone className="profile-pc-skeleton__breadcrumb" />
        {Array.from({ length: 8 }, (_, index) => <Bone key={index} className="profile-pc-skeleton__tab" />)}
      </div>
      <div className="profile-workspace-panel profile-pc-skeleton" aria-busy="true">
        <p className="profile-pc-skeleton__sr" role="status" aria-live="polite">Loading profile…</p>
        <div className="profile-pc-skeleton__content" aria-hidden="true">
          <SkeletonCard wide lines={4} />
          <div className="profile-pc-skeleton__grid">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
          </div>
          <div className="profile-pc-skeleton__grid">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        </div>
      </div>
    </ProfilePcPage>
  );
}
