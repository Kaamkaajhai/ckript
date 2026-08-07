/*
 * RosterRail — the permanent facet column.
 *
 * Two things follow from it being permanent rather than a drawer:
 *
 *   1. It survives a failed request. When the list column shows its error the
 *      facets stay exactly as the viewer set them and only their counts fall
 *      back to em-dashes, so a retry costs nothing. A drawer would have taken
 *      the setup down with the list.
 *   2. It is where the page shows its title. There is no masthead above three
 *      panes, so the display title sits at the top of the rail — which also
 *      gives the MainLayout mount, where no rail item is highlighted,
 *      something that says where you are. The page's actual <h1> lives in the
 *      list column, because this block is display:none once the rail folds.
 *
 * Below the container-query breakpoint the same markup is rendered inside an
 * overlay drawer by the page; `inDrawer` is all it knows about which.
 */
import { Link } from "react-router-dom";
import { ACTIVITY, CREDENTIALS, GENRES } from "../writerRoster";
import RosterIcon from "./RosterIcon";

const VISIBLE_GENRES = 6;

const Option = ({ label, count, active, disabled, onToggle }) => (
  <li>
    <button
      type="button"
      className={`ckr-opt${active ? " is-on" : ""}`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className={`ckr-box${active ? " is-on" : ""}`} aria-hidden="true">
        {active && <RosterIcon name="check" />}
      </span>
      <span className="ckr-opt__t">{label}</span>
      {/* Inside the button, so the accessible name reads "Thriller, 23 writers". */}
      <span className="ckr-opt__n">
        {count === null ? "—" : count}
        <span className="ckr-sr">{count === null ? " — count unavailable" : ` ${count} writers`}</span>
      </span>
    </button>
  </li>
);

const RosterRail = ({
  facets,
  counts,
  mandate,
  total,
  shown,
  status,
  showAllGenres,
  onShowAllGenres,
  onToggle,
  onToggleMandate,
  onReset,
  hasActive,
  inDrawer,
}) => {
  // A count is a lie during load and after a failure — say so rather than show 0.
  const countsKnown = status === "ok";
  const at = (group, key) => (countsKnown ? (counts?.[group]?.[key] ?? 0) : null);

  const genres = showAllGenres ? GENRES : GENRES.slice(0, VISIBLE_GENRES);
  // A genre already ticked must stay visible even when it sits past the fold.
  const hiddenActive = showAllGenres
    ? []
    : GENRES.slice(VISIBLE_GENRES).filter((g) => facets.genres.includes(g));

  return (
    <>
      {/*
        * Presentational, not the page heading. The real <h1> lives once in the
        * list column, so it is present at every width — this block is
        * display:none below the breakpoint where the rail leaves the flow.
        */}
      {!inDrawer && (
        <div className="ckr-rail__head">
          <p className="ckr-rail__h1" aria-hidden="true">Writers</p>
          <p className="ckr-rail__sub">Every writer and creator on Ckript, ranked.</p>
        </div>
      )}

      <div className="ckr-rail__body">
        <div className="ckr-facet">
          <div className="ckr-facet__head">
            <span className="ckr-lab">Genre</span>
            <span className="ckr-facet__n">{GENRES.length}</span>
          </div>
          <ul className="ckr-opts" aria-label="Genre">
            {[...genres, ...hiddenActive].map((genre) => (
              <Option
                key={genre}
                label={genre}
                count={at("genres", genre)}
                active={facets.genres.includes(genre)}
                onToggle={() => onToggle("genres", genre)}
              />
            ))}
          </ul>
          {!showAllGenres && (
            <button type="button" className="ckr-more" onClick={onShowAllGenres}>
              Show all {GENRES.length}
            </button>
          )}
        </div>

        <hr className="ckr-rule" />

        <div className="ckr-facet">
          <div className="ckr-facet__head">
            <span className="ckr-lab">Credentials</span>
          </div>
          <ul className="ckr-opts" aria-label="Credentials">
            {CREDENTIALS.map(({ key, label }) => (
              <Option
                key={key}
                label={label}
                count={at("credentials", key)}
                active={facets.credentials.includes(key)}
                onToggle={() => onToggle("credentials", key)}
              />
            ))}
          </ul>
        </div>

        <hr className="ckr-rule" />

        <div className="ckr-facet">
          <div className="ckr-facet__head">
            <span className="ckr-lab">Activity</span>
          </div>
          <ul className="ckr-opts" aria-label="Activity">
            {ACTIVITY.map(({ key, label }) => (
              <Option
                key={key}
                label={label}
                count={at("activity", key)}
                active={facets.activity.includes(key)}
                onToggle={() => onToggle("activity", key)}
              />
            ))}
          </ul>
        </div>

        {/*
          * Hidden entirely when the viewer has no genre mandate. A checkbox
          * that can never match anything is worse than an absent one.
          */}
        {mandate.isSet && (
          <>
            <hr className="ckr-rule" />
            <div className="ckr-mandate">
              <ul className="ckr-opts">
                <Option
                  label="Matches my mandate"
                  count={countsKnown ? (counts?.mandate ?? 0) : null}
                  active={facets.mandate}
                  onToggle={onToggleMandate}
                />
              </ul>
              <p className="ckr-mandate__note">
                Genre overlap only — <Link to="/mandates">edit mandate</Link>
              </p>
            </div>
          </>
        )}
      </div>

      <div className="ckr-rail__foot">
        <span className="ckr-rail__count">
          {status === "loading" && "Loading…"}
          {status === "error" && "Counts unavailable"}
          {status === "ok" && (<><b>{shown}</b> of {total} shown</>)}
        </span>
        {hasActive && (
          <button type="button" className="ckr-linkbtn" onClick={onReset}>Reset</button>
        )}
      </div>
    </>
  );
};

export default RosterRail;
