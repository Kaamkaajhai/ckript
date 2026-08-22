import { Link, useSearchParams } from "react-router-dom";
import { Trophy } from "lucide-react";
import { Card } from "../../components/competition/ui";
import CompetitionCard from "../../components/competition/CompetitionCard";
import {
  HALL_OF_FAME_STATUS,
  readHallOfFameQuery,
  writeHallOfFameQuery,
} from "./hallOfFame";
import { useHallOfFameList } from "./useHallOfFame";
import "../challenge/challenge.css";

const CONTROL = {
  fontFamily: "var(--ckc-sans)", fontSize: 14, color: "var(--ckc-ink)", background: "var(--ckc-card)",
  border: "1px solid var(--ckc-rule)", borderRadius: 3, minHeight: 44, padding: "9px 12px",
};

export default function HallOfFame() {
  const [params, setParams] = useSearchParams();
  const query = readHallOfFameQuery(params);
  const archive = useHallOfFameList({ query });
  const data = archive.data || {};
  const pageInfo = data.pageInfo || {};
  const update = (patch) => setParams(writeHallOfFameQuery(params, patch), { replace: true });

  return (
    <div className="ckc" style={{ minHeight: "100vh", paddingBottom: 96 }}>
      <div style={{ margin: "0 auto", maxWidth: 1120, padding: "48px 24px 0" }}>
        <header className="ckc-masthead">
          <p className="ckc-meta inline-flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Hall of Fame</p>
          <h1 className="ckc-title ckc-h1">Every competition, every winner</h1>
          <p className="ckc-lede">Celebrating the best writers and scripts from every Ckript competition.</p>
        </header>

        {archive.status === HALL_OF_FAME_STATUS.LOADING ? (
          <p className="ckc-meta" style={{ padding: "56px 0", textAlign: "center" }}>Loading…</p>
        ) : archive.status === HALL_OF_FAME_STATUS.FAILED ? (
          <Card className="mx-auto mt-16 max-w-lg text-center">
            <p className="ckc-lede" style={{ margin: "0 auto" }}>{archive.failure?.message}</p>
            <button type="button" className="ckc-btn mt-6" onClick={archive.retry}>Try again</button>
          </Card>
        ) : Number(pageInfo.total || 0) === 0 && query.year === "all" && query.competition === "all" ? (
          <Card className="mx-auto mt-16 max-w-lg text-center">
            <Trophy className="mx-auto h-10 w-10" style={{ color: "var(--ckc-faint)" }} aria-hidden="true" />
            <p className="ckc-title ckc-h3" style={{ marginTop: 16 }}>No competitions have finished yet</p>
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: "var(--ckc-muted)" }}>The first winners will appear here as soon as results are announced.</p>
            <Link to="/challenge" className="ckc-btn mt-6">See the current challenge</Link>
          </Card>
        ) : (
          <>
            {(data.competitions?.length > 1 || data.years?.length > 1) ? (
              <div className="mt-10 flex flex-wrap items-end gap-4" style={{ paddingBottom: 24, borderBottom: "1px solid var(--ckc-rule)" }}>
                {data.competitions?.length > 1 ? (
                  <label className="flex flex-col gap-1.5"><span className="ckc-meta">Competition</span>
                    <select value={query.competition} onChange={(event) => update({ competition: event.target.value, page: 1 })} style={CONTROL}>
                      <option value="all">All competitions</option>
                      {data.competitions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </label>
                ) : null}
                {data.years?.length > 1 ? (
                  <label className="flex flex-col gap-1.5"><span className="ckc-meta">Year</span>
                    <select value={query.year} onChange={(event) => update({ year: event.target.value, page: 1 })} style={CONTROL}>
                      <option value="all">All years</option>
                      {data.years.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}

            {!data.items?.length ? (
              <Card className="mx-auto mt-16 max-w-lg text-center">
                <p className="ckc-title ckc-h3">No competitions match those filters</p>
                <button type="button" className="ckc-btn mt-6" onClick={() => update({ year: "all", competition: "all", page: 1 })}>Clear filters</button>
              </Card>
            ) : <div className="ckc-grid mt-10">{data.items.map((item) => <CompetitionCard key={item._id} item={item} />)}</div>}

            {pageInfo.totalPages > 1 ? (
              <nav aria-label="Hall of Fame pages" className="mt-10 flex items-center justify-center gap-4">
                <button type="button" className="ckc-btn" disabled={pageInfo.page <= 1} onClick={() => update({ page: pageInfo.page - 1 })}>Previous</button>
                <span className="ckc-meta">Page {pageInfo.page} of {pageInfo.totalPages}</span>
                <button type="button" className="ckc-btn" disabled={!pageInfo.hasMore} onClick={() => update({ page: pageInfo.page + 1 })}>Next</button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
