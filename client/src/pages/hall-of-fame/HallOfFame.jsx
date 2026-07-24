import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Award, Users, Globe } from "lucide-react";
import publicApi from "../../services/publicApi";
import { Card, Avatar } from "../../components/competition/ui";
import { yearSuffix } from "../../components/competition/labels";

/**
 * The permanent archive of every completed competition.
 *
 * Public and unauthenticated — this is the credibility page, so it must be readable (and indexable)
 * without an account. It is derived entirely from declared results: there is no separate Hall of
 * Fame record to keep in sync.
 */

const PersonLine = ({ label, person, icon: Icon, accent }) => {
  if (!person) return null;
  return (
    <div className="flex items-center gap-2.5">
      <Avatar src={person.profileImage} name={person.name} size={32} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <Icon className={`h-3 w-3 ${accent}`} aria-hidden="true" /> {label}
        </p>
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{person.name}</p>
      </div>
    </div>
  );
};

const CompetitionCard = ({ item }) => (
  <Link
    to={`/hall-of-fame/${item.slug}`}
    className="block rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-[#D14D37] hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
  >
    {item.bannerUrl ? (
      <img src={item.bannerUrl} alt="" className="h-32 w-full rounded-t-2xl object-cover" />
    ) : (
      <div className="h-32 w-full rounded-t-2xl bg-gradient-to-br from-[#D14D37]/15 to-[#D14D37]/5" />
    )}

    <div className="p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{item.name}</h3>
        {yearSuffix(item.name, item.year) ? (
          <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            {item.year}
          </span>
        ) : null}
      </div>

      {item.theme ? (
        <p className="mt-1 text-sm italic text-[#D14D37]">{item.theme}</p>
      ) : null}

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {item.dates?.startsAt ? new Date(item.dates.startsAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : ""}
        {item.dates?.endsAt ? ` – ${new Date(item.dates.endsAt).toLocaleDateString(undefined, { dateStyle: "medium" })}` : ""}
      </p>

      {item.prizePool ? (
        <p className="mt-3 text-sm font-medium text-gray-800 dark:text-gray-100">{item.prizePool}</p>
      ) : null}

      <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-4 dark:border-gray-700">
        <PersonLine label="Winner" person={item.winner} icon={Trophy} accent="text-amber-500" />
        <PersonLine label="Runner-Up" person={item.runnerUp} icon={Award} accent="text-slate-400" />
        {!item.winner && !item.runnerUp ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Results archived.</p>
        ) : null}
      </div>

      <div className="mt-4 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" aria-hidden="true" /> {item.totalParticipants} participants
        </span>
        <span className="inline-flex items-center gap-1">
          <Globe className="h-3.5 w-3.5" aria-hidden="true" /> {item.countriesRepresented} countries
        </span>
      </div>
    </div>
  </Link>
);

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
