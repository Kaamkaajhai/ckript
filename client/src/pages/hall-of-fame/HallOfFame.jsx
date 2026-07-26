import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import publicApi from "../../services/publicApi";
import { Card } from "../../components/competition/ui";
import CompetitionCard from "../../components/competition/CompetitionCard";

/**
 * The permanent archive of every completed competition.
 *
 * Public and unauthenticated — this is the credibility page, so it must be readable (and indexable)
 * without an account. It is derived entirely from declared results: there is no separate Hall of
 * Fame record to keep in sync.
 */

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <header className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D14D37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#D14D37]">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Hall of Fame
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
            Every competition, every winner
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Celebrating the best writers and scripts from every Ckript competition.
          </p>
        </header>

        {loading ? (
          <p className="mt-16 text-center text-gray-500 dark:text-gray-400">Loading…</p>
        ) : error ? (
          <Card className="mx-auto mt-16 max-w-lg text-center">
            <p className="text-gray-700 dark:text-gray-200">{error}</p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="mx-auto mt-16 max-w-lg text-center">
            <Trophy className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
            <p className="mt-4 font-semibold text-gray-900 dark:text-white">No competitions have finished yet</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              The first winners will appear here as soon as results are announced.
            </p>
            <Link to="/challenge" className="mt-6 inline-block rounded-lg bg-[#D14D37] px-5 py-2.5 font-medium text-white hover:bg-[#b8402d]">
              See the current challenge
            </Link>
          </Card>
        ) : (
          <>
            {(names.length > 1 || years.length > 1) ? (
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                {names.length > 1 ? (
                  <select
                    value={competition}
                    onChange={(e) => setCompetition(e.target.value)}
                    aria-label="Filter by competition"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#D14D37] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">All competitions</option>
                    {names.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                ) : null}
                {years.length > 1 ? (
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    aria-label="Filter by year"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#D14D37] dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">All years</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                ) : null}
              </div>
            ) : null}

            {shown.length === 0 ? (
              <p className="mt-12 text-center text-gray-500 dark:text-gray-400">
                No competitions match that filter.
              </p>
            ) : (
              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
