import ProfilePcPage from "../ProfilePcPage";

const Bone = ({ className = "" }) => (
  <span className={`profile-pc-skeleton__bone${className ? ` ${className}` : ""}`} />
);

function IdentitySkeleton() {
  return (
    <div className="profile-pc-skeleton__identity" aria-hidden="true">
      <Bone className="profile-pc-skeleton__avatar" />
      <Bone className="profile-pc-skeleton__name" />
      <Bone className="profile-pc-skeleton__username" />
      <div className="profile-pc-skeleton__badges">
        <Bone /><Bone /><Bone />
      </div>
      <Bone className="profile-pc-skeleton__representation" />
      <Bone className="profile-pc-skeleton__representation profile-pc-skeleton__representation--short" />

      <div className="profile-pc-skeleton__stats">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index}><Bone /><Bone /></div>
        ))}
      </div>

      <Bone className="profile-pc-skeleton__button" />
      <Bone className="profile-pc-skeleton__button profile-pc-skeleton__button--secondary" />

      <div className="profile-pc-skeleton__contact">
        <Bone className="profile-pc-skeleton__contact-label" />
        <Bone className="profile-pc-skeleton__contact-line" />
        <Bone className="profile-pc-skeleton__contact-line profile-pc-skeleton__contact-line--short" />
      </div>
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
      <div className="profile-pc-skeleton" aria-busy="true">
        <p className="profile-pc-skeleton__sr" role="status" aria-live="polite">Loading profile…</p>
        <Bone className="profile-pc-skeleton__breadcrumb" />

        <div className="profile-pc-skeleton__tabs" aria-hidden="true">
          <Bone className="profile-pc-skeleton__tab profile-pc-skeleton__tab--active" />
          <Bone className="profile-pc-skeleton__tab" />
          <Bone className="profile-pc-skeleton__tab profile-pc-skeleton__tab--wide" />
          <Bone className="profile-pc-skeleton__tab" />
        </div>

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
