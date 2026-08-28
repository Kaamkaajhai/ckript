import { useCallback, useContext, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useScriptBookmark } from "../hooks/useScriptBookmark";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  READER_DISCOVER_FORMATS,
  READER_DISCOVER_GENRES,
  READER_HOME_STATUS,
  readReaderDiscoverQuery,
  writeReaderDiscoverQuery,
} from "./reader-home/readerHome";
import { useReaderDiscover, useReaderHome } from "./reader-home/useReaderHome";
import "./ReaderHome.css";

const readerPath = (project) => `/reader/script/${encodeURIComponent(project?._id || "")}`;

function ReaderProjectCard({ project }) {
  const bookmark = useScriptBookmark(project);
  const cover = resolveMediaUrl(project?.coverImage);
  return (
    <article className="reader-home__card">
      {cover ? <img src={cover} alt="" loading="lazy" /> : <div className="reader-home__placeholder" aria-hidden="true">CK</div>}
      <div>
        <p>{project?.creator?.name || "Ckript writer"}{project?.genre ? ` · ${project.genre}` : ""}</p>
        <h3><Link to={readerPath(project)}>{project?.title || "Untitled project"}</Link></h3>
        <span>{project?.logline || project?.description || "Open this project to learn more."}</span>
        {bookmark.canBookmark ? (
          <button type="button" disabled={bookmark.pending} aria-pressed={bookmark.isBookmarked} onClick={bookmark.toggleBookmark}>
            {bookmark.isBookmarked ? "Saved" : "Save"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function Shelf({ title, projects }) {
  if (!projects.length) return null;
  return <section className="reader-home__shelf"><h2>{title}</h2><div className="reader-home__grid">{projects.map((project) => <ReaderProjectCard key={project._id} project={project} />)}</div></section>;
}

export default function ReaderHome() {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const discover = pathname === "/reader/search";
  const query = useMemo(() => readReaderDiscoverQuery(searchParams), [searchParams]);
  const home = useReaderHome({ readerId: user?._id || user?.id, enabled: !discover });
  const results = useReaderDiscover({ query, enabled: discover });
  const setQuery = useCallback((patch) => {
    setSearchParams(writeReaderDiscoverQuery(searchParams, { ...patch, page: patch.page ?? 1 }), { replace: true });
  }, [searchParams, setSearchParams]);

  if (discover) {
    return (
      <main className="reader-home reader-home--discover">
        <header><p>Reader</p><h1>Discover projects</h1><span>Search the published catalogue by story, format, or genre.</span></header>
        <section className="reader-home__controls" aria-label="Discover projects">
          <label>Search projects<input type="search" value={query.q} maxLength="120" placeholder="Title, genre, tag, or Ckript ID" onChange={(event) => setQuery({ q: event.target.value })} /></label>
          <label>Format<select value={query.category} onChange={(event) => setQuery({ category: event.target.value })}>{READER_DISCOVER_FORMATS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Genre<select value={query.genre} onChange={(event) => setQuery({ genre: event.target.value })}><option value="">All genres</option>{READER_DISCOVER_GENRES.map((genre) => <option key={genre}>{genre}</option>)}</select></label>
        </section>
        {results.status === READER_HOME_STATUS.LOADING ? <p role="status">Loading projects…</p> : null}
        {results.status === READER_HOME_STATUS.FAILED ? <div role="alert"><p>{results.failure?.message}</p><button type="button" onClick={results.retry}>Try again</button></div> : null}
        {results.status === READER_HOME_STATUS.READY && results.data.total === 0 ? <p>No projects match this search.</p> : null}
        {results.status === READER_HOME_STATUS.READY && results.data.total > 0 ? (
          <section className="reader-home__shelf"><h2>{results.data.total} projects</h2><div className="reader-home__grid">{results.data.scripts.map((project) => <ReaderProjectCard key={project._id} project={project} />)}</div>{results.data.totalPages > 1 ? <nav className="reader-home__pagination" aria-label="Discovery pages"><button type="button" disabled={!results.data.hasPrevious} onClick={() => setQuery({ page: results.data.page - 1 })}>Previous</button><span>Page {results.data.page} of {results.data.totalPages}</span><button type="button" disabled={!results.data.hasNext} onClick={() => setQuery({ page: results.data.page + 1 })}>Next</button></nav> : null}</section>
        ) : null}
      </main>
    );
  }

  return (
    <main className="reader-home">
      <header><p>Reader home</p><h1>What will you read next?</h1><span>Return to saved stories or discover newly published work.</span></header>
      {home.status === READER_HOME_STATUS.LOADING ? <p role="status">Loading your reader home…</p> : null}
      {home.status === READER_HOME_STATUS.FAILED ? <div role="alert"><p>{home.failure?.message}</p><button type="button" onClick={home.retry}>Try again</button></div> : null}
      {home.status === READER_HOME_STATUS.READY ? <><Shelf title="Read again" projects={home.data.read.slice(0, 4)} /><Shelf title="Favorites" projects={home.data.favorites.slice(0, 4)} /><Shelf title="Fresh projects" projects={home.data.fresh} />{!home.data.read.length && !home.data.favorites.length && !home.data.fresh.length ? <p>Your reading desk is ready. <Link to="/reader/search">Discover projects</Link>.</p> : null}</> : null}
    </main>
  );
}
