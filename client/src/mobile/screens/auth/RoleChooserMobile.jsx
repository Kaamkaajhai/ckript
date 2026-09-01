import { useContext, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { resolvePostAuthPath } from "../../../routing/audienceTransitions";
import Icon from "../../components/Icon";
import InlineMessage from "../../components/feedback/InlineMessage";
import MobileShell from "../../shell/MobileShell";
import { AUTH_SHELL_MODE, readReturnPath, withReturnPath } from "./authChrome";
import { AUTH_ROLES } from "./authModel";
import AuthScreenFrame from "./components/AuthScreenFrame";
import "./Auth.css";

/*
 * RoleChooserMobile — /join (Phase 8, D59).
 *
 * The one auth screen that is a choice rather than a form, and therefore the
 * one that gets the photograph: there is no keyboard competing for the space,
 * and the decision benefits from some atmosphere. Every other screen in the
 * family is type only.
 *
 * The role is a real decision with consequences the person cannot see — it sets
 * which workspace they land in, what they can upload, and (for producers) an
 * approval step — so each card states what the account is FOR in the second
 * person, rather than naming a job title and hoping.
 *
 * `?email=` arrives when Google refused a sign-in because no account exists
 * yet. Carrying it through means the flow does not ask for an email it was
 * just given.
 */

const ART = {
  src: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
};

const ROLE_ICON = {
  writer: "edit_note",
  producer: "movie",
  industry: "corporate_fare",
};

export default function RoleChooserMobile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useContext(AuthContext);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const returnPath = useMemo(() => readReturnPath(location.search), [location.search]);
  const prefillEmail = String(params.get("email") || "").trim();

  /* Signed in already — nothing here applies. Send them where they belong
     rather than to a chooser for an account they have. */
  useEffect(() => {
    if (!loading && user) {
      navigate(resolvePostAuthPath({ requestedPath: returnPath, user }), { replace: true });
    }
  }, [loading, user, returnPath, navigate]);

  const signUpPath = (roleKey) => {
    const query = new URLSearchParams({ as: roleKey });
    if (prefillEmail) query.set("email", prefillEmail);
    const referral = params.get("ref") || params.get("referral") || params.get("referralCode");
    if (referral) query.set("ref", referral);
    return withReturnPath(`/signup?${query.toString()}`, returnPath);
  };

  return (
    <MobileShell mode={AUTH_SHELL_MODE} screenId="role-chooser">
      <AuthScreenFrame
        art={ART}
        eyebrow="Join Ckript"
        title="How do you work?"
        lede="This sets up the right workspace for you. You can't change it later on your own, so pick the one that fits."
        closeTo="/"
        closeLabel="Back to Ckript"
        banner={prefillEmail ? (
          <InlineMessage tone="info" className="ckm-auth__banner" title="Almost there">
            There's no Ckript account for {prefillEmail} yet. Pick how you work and we'll set one up.
          </InlineMessage>
        ) : null}
        footer={(
          <p className="ckm-auth__alt">
            Already have an account?{" "}
            <Link className="ckm-auth__link" to={withReturnPath("/login", returnPath)}>Sign in</Link>
          </p>
        )}
      >
        {/* A list, because it is one: three alternatives of equal weight. The
            count is worth announcing before someone commits to reading them. */}
        <ul className="ckm-auth__roles">
          {AUTH_ROLES.filter(r => r.key !== 'industry').map((role) => (
            <li key={role.key}>
              <Link className="ckm-auth__role" to={signUpPath(role.key)}>
                <Icon className="ckm-auth__role-icon" name={ROLE_ICON[role.key]} size={26} />
                <span className="ckm-auth__role-text">
                  <span className="ckm-auth__role-title">{role.title}</span>
                  <span className="ckm-auth__role-detail">{role.detail}</span>
                  <span className="ckm-auth__role-blurb">{role.blurb}</span>
                </span>
                <Icon className="ckm-auth__role-go" name="arrow_forward" size={20} />
              </Link>
            </li>
          ))}
        </ul>
      </AuthScreenFrame>
    </MobileShell>
  );
}
