import "./ProfilePcPage.css";

/**
 * Professional-profile canvas. The application shell remains outside this component;
 * the profile owns a compact identity strip and the three-region workspace
 * approved in Direction B.
 */
export default function ProfilePcPage({ identity, isDark = false, children }) {
  return (
    <main className="profile-pc-page" data-theme={isDark ? "dark" : "light"}>
      <div className="profile-pc-page__identity-column">{identity}</div>
      <div className="profile-pc-page__workspace">
        <div className="profile-pc-page__content-column">{children}</div>
      </div>
    </main>
  );
}
