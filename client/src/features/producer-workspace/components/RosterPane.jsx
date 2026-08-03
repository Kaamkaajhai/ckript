/*
 * RosterPane — the detail column.
 *
 * The risk this component carries is that it becomes a second, slightly wrong
 * copy of the profile page. The rule that keeps it honest: it renders only
 * fields that are already in the /users/writers row it was handed. No second
 * fetch, so there is nothing here that can drift out of step with a profile,
 * and nothing here that the profile gate is protecting.
 *
 * (The endpoint currently over-ships a good deal more than that — see the note
 * at the top of WriterRosterPage.jsx. Binding only the listed fields is why
 * that leak does not reach the screen, but it is not a fix for it.)
 *
 * It holds the page's single primary action. One "Open full profile" for the
 * whole register rather than one button per row is what lets the row be 44px.
 */
import { Link } from "react-router-dom";
import {
  formatCount,
  formatScore,
  getBioLine,
  getFollowers,
  getGenres,
  getMandateMatches,
  getScoreBand,
  getScriptCount,
  getViews,
  isRepresented,
  isSwa,
  isWga,
} from "../writerRoster";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import RosterIcon from "./RosterIcon";

const Resting = () => (
  <div className="ckr-rest">
    <span className="ckr-rest__badge"><RosterIcon name="userSearch" /></span>
    <p className="ckr-rest__t">No writer selected</p>
    <p className="ckr-rest__n">
      Pick a row, or press <kbd>↓</kbd> to start at the top of the list.
    </p>
  </div>
);

const credentialLine = (writer) => {
  const memberships = [isWga(writer) && "WGA", isSwa(writer) && "SWA"].filter(Boolean);
  const first = memberships.length
    ? `${memberships.join(" and ")} member`
    : "Not a WGA or SWA member";
  return { first, repped: isRepresented(writer) };
};

const RosterPane = ({ writer, mandate, profilePath, restricted, onOpenProfile }) => {
  if (!writer) return <Resting />;

  const avatar = resolveMediaUrl(writer.profileImage);
  const name = writer.name || "Unnamed writer";
  const genres = getGenres(writer);
  const matches = getMandateMatches(writer, mandate);
  const band = getScoreBand(writer);
  const { first, repped } = credentialLine(writer);

  const metrics = [
    { label: "Scripts", value: getScriptCount(writer) },
    { label: "Views", value: formatCount(getViews(writer)) },
    { label: "Score", value: formatScore(writer), band },
    { label: "Fans", value: formatCount(getFollowers(writer)) },
  ];

  return (
    <>
      <div className="ckr-pane__head">
        <div className="ckr-pane__idrow">
          {avatar
            ? <img className="ckr-pane__av ckr-pane__av--img" src={avatar} alt="" />
            : <span className="ckr-pane__av" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
          <div className="ckr-pane__idtext">
            <h2 className="ckr-pane__name">{name}</h2>
            <p className="ckr-pane__bio">{getBioLine(writer)}</p>
          </div>
        </div>

        <div className="ckr-pane__actions">
          {/*
            * A real link when it is allowed, so middle-click and "copy link
            * address" work. When the gate applies it is a button that opens the
            * explanation — never a link that silently does nothing, which is
            * what the page this replaces did.
            */}
          {restricted ? (
            <button type="button" className="ckr-btn ckr-btn--primary ckr-btn--wide" onClick={onOpenProfile}>
              <RosterIcon name="lock" className="ckr-btn__ic" />
              Open full profile
            </button>
          ) : (
            <Link to={profilePath} className="ckr-btn ckr-btn--primary ckr-btn--wide">
              Open full profile
            </Link>
          )}
        </div>
      </div>

      <div className="ckr-pane__body">
        <div className="ckr-stats">
          {metrics.map(({ label, value, band: metricBand }) => (
            <div className="ckr-stat" key={label}>
              <span className={`ckr-stat__v${metricBand ? ` ckr-stat__v--${metricBand}` : ""}`}>{value}</span>
              <span className="ckr-stat__l">{label}</span>
            </div>
          ))}
        </div>

        {genres.length > 0 && (
          <div className="ckr-block">
            <span className="ckr-lab">Genres</span>
            <div className="ckr-pills">
              {genres.map((genre) => <span key={genre} className="ckr-pill">{genre}</span>)}
            </div>
          </div>
        )}

        <div className="ckr-block">
          <span className="ckr-lab">Credentials</span>
          <p className="ckr-cred">
            {first} · <b>{repped ? "Represented" : "Unrepresented"}</b>
          </p>
        </div>

        {mandate.isSet && (
          <div className="ckr-fit">
            <span className="ckr-lab">Mandate fit</span>
            {matches.length > 0 ? (
              <p className="ckr-fit__t">
                Matches {matches.map((genre, i) => (
                  <span key={genre}>
                    {i > 0 && (i === matches.length - 1 ? " and " : ", ")}
                    <b>{genre}</b>
                  </span>
                ))} from your mandate. Nothing excluded.
              </p>
            ) : (
              <p className="ckr-fit__t">Nothing in this writer’s genres matches your mandate.</p>
            )}
            {/* Never a percentage. Genre is the only axis writer data and
                mandate data share, so a score here would be false precision. */}
            <p className="ckr-fit__n">Genre overlap only — not a match score.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default RosterPane;
