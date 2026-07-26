import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Trophy, Award, Sparkles, ArrowLeft, ExternalLink } from "lucide-react";
import publicApi from "../../services/publicApi";
import { Section, Card, Stat, Avatar } from "../../components/competition/ui";
import { rewardLabel, yearSuffix } from "../../components/competition/labels";
import useDynamicSeo from "../../components/competition/useDynamicSeo";

/**
 * One competition's permanent record.
 *
 * Winners link to their PROFILE, never to their script: competition entries stay private drafts and
 * are not published by winning. The Featured Scripts section only ever shows scripts a writer has
 * separately chosen to publish, so it is empty (and hidden) until that happens.
 */

const profilePath = (person) => (person?.username ? `/${person.username}` : `/share/profile/${person?._id}`);

const WinnerBlock = ({ person, label, icon: Icon, accent, prominent = false }) => {
  if (!person) return null;
  return (
    <Card className={prominent ? "border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-900/10" : ""}>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <Icon className={`h-4 w-4 ${accent}`} aria-hidden="true" />
        {person.specialTitle || label}
      </p>

      <div className={`mt-4 flex items-start gap-4 ${prominent ? "sm:gap-5" : ""}`}>
        <Avatar src={person.profileImage} name={person.name} size={prominent ? 72 : 52} />
        <div className="min-w-0 flex-1">
          <h3 className={`font-bold text-gray-900 dark:text-white ${prominent ? "text-2xl" : "text-lg"}`}>
            {person.name}
          </h3>
          {person.scriptTitle ? (
            <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">{person.scriptTitle}</p>
          ) : null}
          {person.logline ? (
            <p className="mt-2 text-sm italic text-gray-600 dark:text-gray-300">{person.logline}</p>
          ) : null}

          {person.rewards?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.rewards
                .map((type) => rewardLabel(type, { specialTitle: person.specialTitle }))
                .filter(Boolean).map((label_, i) => (
                <span key={i} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600">
                  {label_}
                </span>
              ))}
            </div>
          ) : null}

          <Link
            to={profilePath(person)}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#D14D37] hover:underline"
          >
            View writer profile <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  );
};

const HallOfFameDetail = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    // Wrapped rather than called straight in the effect body: a synchronous setState there triggers
    // a cascading render, and this effect re-runs whenever the slug changes.
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const { data: payload } = await publicApi.get(`/competitions/hall-of-fame/${slug}`);
        if (alive) setData(payload);
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [slug]);

  // Per-page metadata so search engines can discover competition history over time. Set at runtime
  // because the slug is dynamic — the build-time prerender only covers the static /hall-of-fame index.
  const competitionName = data?.competition?.name;
  useDynamicSeo({
    title: competitionName ? `${competitionName} | Hall of Fame | Ckript` : "",
    description: competitionName
      ? `Meet the winners and featured writers from the ${competitionName} hosted by Ckript.`
      : "",
  });

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-20 text-center text-gray-500 dark:text-gray-400">Loading…</div>;
  }

  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <Card className="text-center">
          <Trophy className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Competition not found</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            This competition either doesn't exist or its results haven't been announced yet.
          </p>
          <Link to="/hall-of-fame" className="mt-6 inline-block rounded-lg bg-[#D14D37] px-5 py-2.5 font-medium text-white hover:bg-[#b8402d]">
            Back to the Hall of Fame
          </Link>
        </Card>
      </div>
    );
  }

  const { competition, results, stats, featuredScripts } = data;
  const dateRange = [competition.dates?.startsAt, competition.dates?.endsAt]
    .filter(Boolean)
    .map((d) => new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }))
    .join(" – ");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {competition.bannerUrl ? (
        <img src={competition.bannerUrl} alt="" className="h-48 w-full object-cover sm:h-64" />
      ) : (
        <div className="h-32 w-full bg-gradient-to-br from-[#D14D37]/15 to-[#D14D37]/5" />
      )}

      <div className="mx-auto max-w-5xl px-4 pb-16">
        <Link to="/hall-of-fame" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#D14D37] dark:text-gray-300">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Hall of Fame
        </Link>

        <header className="mt-4">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            {competition.name}{" "}
            <span className="font-normal text-gray-400">{yearSuffix(competition.name, competition.year)}</span>
          </h1>
          {competition.theme?.title ? (
            <p className="mt-2 text-lg italic text-[#D14D37]">{competition.theme.title}</p>
          ) : null}
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{dateRange}</p>
          {competition.prizePool ? (
            <p className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700">
              {competition.prizePool}
            </p>
          ) : null}
        </header>

        {results.winner || results.runnerUp ? (
          <Section title="Winners">
            <div className="space-y-5">
              <WinnerBlock person={results.winner} label="Winner" icon={Trophy} accent="text-amber-500" prominent />
              <WinnerBlock person={results.runnerUp} label="Runner-Up" icon={Award} accent="text-slate-400" />
            </div>
          </Section>
        ) : null}

        {results.special?.length ? (
          <Section title="Special awards">
            <div className="grid gap-4 sm:grid-cols-2">
              {results.special.map((person, i) => (
                <WinnerBlock key={i} person={person} label="Special award" icon={Sparkles} accent="text-[#D14D37]" />
              ))}
            </div>
          </Section>
        ) : null}

        {featuredScripts?.length ? (
          <Section title="Featured scripts">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredScripts.map((script) => (
                <Card key={script._id} className="p-0 overflow-hidden">
                  {script.coverImage ? (
                    <img src={script.coverImage} alt="" className="h-36 w-full object-cover" />
                  ) : (
                    <div className="h-36 w-full bg-gray-100 dark:bg-gray-700" />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{script.title}</h3>
                    {script.genre ? <p className="text-xs text-gray-500 dark:text-gray-400">{script.genre}</p> : null}
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{script.writer.name}</p>
                    <div className="mt-3 flex gap-3">
                      <Link to={`/share/project/${script._id}`} className="text-sm font-medium text-[#D14D37] hover:underline">
                        Read script
                      </Link>
                      <Link to={profilePath(script.writer)} className="text-sm font-medium text-gray-600 hover:underline dark:text-gray-300">
                        View writer
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        ) : null}

        {competition.judges?.length ? (
          <Section title="Judges">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {competition.judges.map((judge, i) => (
                <Card key={i}>
                  <div className="flex items-start gap-3">
                    <Avatar src={judge.photoUrl} name={judge.name} size={48} />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">{judge.name}</p>
                      {judge.title ? <p className="text-sm text-gray-600 dark:text-gray-300">{judge.title}</p> : null}
                      {judge.bio ? <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{judge.bio}</p> : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        ) : null}

        {competition.sponsors?.length ? (
          <Section title="Sponsors">
            <div className="flex flex-wrap items-center gap-6">
              {competition.sponsors.map((sponsor, i) => (
                <a
                  key={i}
                  href={sponsor.url || "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-[#D14D37] dark:border-gray-700 dark:bg-gray-800"
                >
                  {sponsor.logoUrl
                    ? <img src={sponsor.logoUrl} alt={sponsor.name} className="h-8 object-contain" />
                    : <span className="font-medium text-gray-700 dark:text-gray-200">{sponsor.name}</span>}
                  {sponsor.tier ? (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {sponsor.tier}
                    </span>
                  ) : null}
                </a>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="By the numbers">
          <Card>
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Stat label="Participants" value={stats.totalParticipants} />
              <Stat label="Countries" value={stats.countriesRepresented} />
              <Stat label="Scripts submitted" value={stats.scriptsSubmitted} />
              <Stat label="Completion rate" value={`${stats.completionRate}%`} />
            </dl>
          </Card>
        </Section>
      </div>
    </div>
  );
};

export default HallOfFameDetail;
