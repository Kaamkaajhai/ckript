import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import publicApi from "../../services/publicApi";
import { Card } from "../../components/competition/ui";
import CompetitionCard from "../../components/competition/CompetitionCard";
import "../challenge/challenge.css";

/**
 * The permanent archive of every completed competition.
 *
 * Public and unauthenticated — this is the credibility page, so it must be readable (and indexable)
 * without an account. It is derived entirely from declared results: there is no separate Hall of
 * Fame record to keep in sync.
 */

// The filters are controls, so they are set like controls rather than like content: a quiet ruled
// box on the card surface, in the interface voice, with the slug line naming what it filters.
const CONTROL = {
  fontFamily: "var(--ckc-sans)",
  fontSize: 14,
  color: "var(--ckc-ink)",
  background: "var(--ckc-card)",
  border: "1px solid var(--ckc-rule)",
  borderRadius: 3,
  padding: "9px 12px",
};

const HallOfFame = () => {
  const [items, setItems] = useState([]);
  const [years, setYears] = useState([]);
  const [year, setYear] = useState("all");
  const [competition, setCompetition] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Hall of Fame | Ckript";
    let alive = true;
    publicApi.get("/competitions/completed")
      .then(({ data }) => {
        if (!alive) return;
        setItems(data.items || []);
        setYears(data.years || []);
      })
      .catch(() => { if (alive) setError("We couldn't load the Hall of Fame just now."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Distinct competition names, so re-runs of the same event group under one filter entry.
  const names = useMemo(
    () => [...new Set(items.map((i) => i.name))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const shown = items.filter((i) =>
    (year === "all" || String(i.year) === String(year))
    && (competition === "all" || i.name === competition));

  return (
    <div className="ckc" style={{ minHeight: "100vh", paddingBottom: 96 }}>
      <div style={{ margin: "0 auto", maxWidth: 1120, padding: "48px 24px 0" }}>
        <header className="ckc-masthead">
          {/* The archive is finished business, so the eyebrow stays in the slug-line voice — the
              coral belongs to whatever is running right now, and nothing here is. */}
          <p className="ckc-meta inline-flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Hall of Fame
          </p>
          <h1 className="ckc-title ckc-h1">Every competition, every winner</h1>
          <p className="ckc-lede">
            Celebrating the best writers and scripts from every Ckript competition.
          </p>
        </header>

        {loading ? (
          <p className="ckc-meta" style={{ padding: "56px 0", textAlign: "center" }}>Loading…</p>
        ) : error ? (
          <Card className="mx-auto mt-16 max-w-lg text-center">
            <p className="ckc-lede" style={{ margin: "0 auto" }}>{error}</p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="mx-auto mt-16 max-w-lg text-center">
            <Trophy className="mx-auto h-10 w-10" style={{ color: "var(--ckc-faint)" }} aria-hidden="true" />
            <p className="ckc-title ckc-h3" style={{ marginTop: 16 }}>No competitions have finished yet</p>
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: "var(--ckc-muted)" }}>
              The first winners will appear here as soon as results are announced.
            </p>
            <Link to="/challenge" className="ckc-btn mt-6">
              See the current challenge
            </Link>
          </Card>
        ) : (
          <>
            {(names.length > 1 || years.length > 1) ? (
              <div
                className="mt-10 flex flex-wrap items-end gap-4"
                style={{ paddingBottom: 24, borderBottom: "1px solid var(--ckc-rule)" }}
              >
                {names.length > 1 ? (
                  <label className="flex flex-col gap-1.5">
                    <span className="ckc-meta">Competition</span>
                    <select
                      value={competition}
                      onChange={(e) => setCompetition(e.target.value)}
                      aria-label="Filter by competition"
                      style={CONTROL}
                    >
                      <option value="all">All competitions</option>
                      {names.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                ) : null}
                {years.length > 1 ? (
                  <label className="flex flex-col gap-1.5">
                    <span className="ckc-meta">Year</span>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      aria-label="Filter by year"
                      style={CONTROL}
                    >
                      <option value="all">All years</option>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}

            {shown.length === 0 ? (
              <p className="ckc-meta" style={{ padding: "56px 0", textAlign: "center" }}>
                No competitions match that filter.
              </p>
            ) : (
              <div className="ckc-grid mt-10">
                {shown.map((item) => <CompetitionCard key={item._id} item={item} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HallOfFame;
