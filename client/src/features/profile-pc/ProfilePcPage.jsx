import "./ProfilePcPage.css";

/**
 * Desktop writer-profile canvas. The application shell remains outside this
 * component; this component owns only the two-column content workspace.
 */
export default function ProfilePcPage({ identity, isDark = false, children }) {
  return (
    <main className="profile-pc-page" data-theme={isDark ? "dark" : "light"}>
      <div className="profile-pc-page__identity-column">{identity}</div>
      <div className="profile-pc-page__content-column">{children}</div>
    </main>
  );
}
