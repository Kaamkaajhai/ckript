import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  GENRES,
  SORTS,
  buildBoardStats,
  countActiveFacets,
  filterWriters,
  formatCount,
  formatScore,
  getBioLine,
  getFollowers,
  getGenres,
  getMandate,
  getMandateMatches,
  getScriptCount,
  getViews,
  readUrlState,
  writeUrlState,
} from "../../../features/producer-workspace/writerRoster";
import useWriterRoster from "../../../features/producer-workspace/useWriterRoster";
import { WRITER_ROSTER_STATUS } from "../../../features/producer-workspace/writerRosterData";
import { isFilmIndustryProfessionalRole } from "../../../utils/industryAccess";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { getProfileCanonicalPath } from "../../../utils/profilePath";
import AppBar from "../../components/app-bars/AppBar";
import Button from "../../components/buttons/Button";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import SelectField from "../../components/forms/SelectField";
import NavBar from "../../components/navigation/NavBar";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import "./WriterRosterMobile.css";

const toggleValue = (values, value) => values.includes(value)
  ? values.filter((item) => item !== value)
  : [...values, value];

export default function WriterRosterMobile({ user, previewData = null, previewState = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const url = useMemo(() => readUrlState(searchParams), [searchParams]);
  const [queryInput, setQueryInput] = useState(url.query);
  const liveRoster = useWriterRoster({
    sort: url.sort,
    query: url.query,
    user,
    enabled: !previewState,
    previewData,
  });
  const roster = previewState || liveRoster;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryInput === url.query) return;
      setSearchParams(writeUrlState({ ...url, query: queryInput }), { replace: true });
    }, 320);
    return () => clearTimeout(timer);
  }, [queryInput, setSearchParams, url]);

  const mandate = useMemo(() => getMandate(roster.data?.mandateSource), [roster.data?.mandateSource]);
  const visible = useMemo(
    () => filterWriters(roster.data?.writers, { facets: url.facets, mandate }),
    [mandate, roster.data?.writers, url.facets],
  );
  const stats = useMemo(() => buildBoardStats(visible), [visible]);
  const activeCount = countActiveFacets(url.facets) + (url.query ? 1 : 0);

  const update = (patch) => setSearchParams(writeUrlState({ ...url, ...patch }), { replace: true });
  const updateFacets = (patch) => update({ facets: { ...url.facets, ...patch } });
  const clear = () => {
    setQueryInput("");
    setSearchParams("", { replace: true });
  };

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="writers"
      className="ckm-writers"
      scrollClassName="ckm-writers__scroll"
      appBar={<AppBar user={user} />}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={roster.retry}
    >
      <header className="ckm-writers__header">
        <p>Industry desk · writer discovery</p>
        <h1>Writers</h1>
        <span>Compare published work, audience reach and verified profile signals.</span>
      </header>

      <section className="ckm-writers__controls" aria-label="Search and sort writers">
        <label className="ckm-writers__search">
          <span>Search writers</span>
          <input
            type="search"
            aria-label="Search writers"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Name"
          />
        </label>
        <SelectField
          label="Sort"
          value={url.sort}
          options={SORTS.map(({ key, label }) => ({ value: key, label }))}
          onChange={(event) => update({ sort: event.target.value })}
        />
      </section>

      <details className="ckm-writers__filters">
        <summary>Refine {activeCount > 0 ? `· ${activeCount} active` : ""}</summary>
        <fieldset>
          <legend>Genres</legend>
          <div>
            {GENRES.map((genre) => (
              <label key={genre}>
                <input
                  type="checkbox"
                  aria-label={`Genre: ${genre}`}
                  checked={url.facets.genres.includes(genre)}
                  onChange={() => updateFacets({ genres: toggleValue(url.facets.genres, genre) })}
                />
                <span>{genre}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {mandate.isSet && (
          <label className="ckm-writers__mandate-filter">
            <input
              type="checkbox"
              aria-label="Matches my mandate"
              checked={url.facets.mandate}
              onChange={() => updateFacets({ mandate: !url.facets.mandate })}
            />
            <span>Matches my mandate</span>
          </label>
        )}
        {activeCount > 0 && <button type="button" onClick={clear}>Clear all</button>}
      </details>

      {isFilmIndustryProfessionalRole(user) && (
        <div className="ckm-writers__brief">
          <span>{mandate.isSet ? mandate.label : "No standing mandate set"}</span>
          <Link to="/mandates">{mandate.isSet ? "Edit mandate" : "Set mandate"}</Link>
        </div>
      )}

      {roster.status === WRITER_ROSTER_STATUS.LOADING && (
        <SkeletonGroup label="Loading writers" className="ckm-writers__loading">
          {Array.from({ length: 5 }).map((_, index) => <SkeletonShape key={index} height={152} radius="var(--ckm-r-lg)" />)}
        </SkeletonGroup>
      )}

      {roster.status === WRITER_ROSTER_STATUS.FAILED && (
        <InlineMessage variant="panel" title="The writer roster is unavailable" onRetry={roster.retry}>
          Your search and filters are preserved. Check your connection and retry.
        </InlineMessage>
      )}

      {roster.status === WRITER_ROSTER_STATUS.READY && (
        <>
          {roster.data?.mandateUnavailable && (
            <InlineMessage title="Mandate matching is unavailable">
              The complete writer roster is still available.
            </InlineMessage>
          )}
          <p className="ckm-writers__summary" role="status">
            <strong>{stats.writers}</strong> writers · <strong>{stats.scripts}</strong> scripts
            {stats.medianScore > 0 ? <> · median score <strong>{stats.medianScore}</strong></> : null}
          </p>
          {visible.length === 0 ? (
            <EmptyState
              icon="person_search"
              titleAs="h2"
              title={activeCount ? "Nothing matches these filters" : "No writers in the roster yet"}
              body={activeCount ? "Clear a filter or broaden the search." : "Published writer profiles will appear here."}
              actions={activeCount ? <Button variant="secondary" onClick={clear}>Clear filters</Button> : <Button variant="secondary" to="/featured">Browse projects</Button>}
            />
          ) : (
            <section className="ckm-writers__list" aria-label="Writer roster">
              {visible.map((writer) => {
                const name = writer.name || "Unnamed writer";
                const image = resolveMediaUrl(writer.profileImage);
                const matches = getMandateMatches(writer, mandate);
                return (
                  <article key={writer._id} className="ckm-writers__card">
                    <div className="ckm-writers__identity">
                      {image ? <img src={image} alt="" /> : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
                      <div><h2>{name}</h2><p>{getBioLine(writer)}</p></div>
                    </div>
                    {getGenres(writer).length > 0 && <p className="ckm-writers__genres">{getGenres(writer).slice(0, 4).join(" · ")}</p>}
                    <dl>
                      <div><dt>Scripts</dt><dd>{getScriptCount(writer)}</dd></div>
                      <div><dt>Views</dt><dd>{formatCount(getViews(writer))}</dd></div>
                      <div><dt>Score</dt><dd>{formatScore(writer)}</dd></div>
                      <div><dt>Fans</dt><dd>{formatCount(getFollowers(writer))}</dd></div>
                    </dl>
                    {matches.length > 0 && <p className="ckm-writers__fit">Mandate overlap · {matches.join(", ")}</p>}
                    <Link to={getProfileCanonicalPath(writer, { viewerId: user?._id, viewerRole: user?.role })}>Open profile</Link>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </MobileShell>
  );
}
