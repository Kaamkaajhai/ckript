import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Trophy, Award, Sparkles, ArrowLeft, ExternalLink } from "lucide-react";
import publicApi from "../../services/publicApi";
import { Section, Card, Stat, Avatar } from "../../components/competition/ui";
import { rewardLabel, yearSuffix } from "../../components/competition/labels";
import useDynamicSeo from "../../components/competition/useDynamicSeo";
import externalUrl from "../../utils/externalUrl";
import "../challenge/challenge.css";

/**
 * One competition's permanent record.
 *
 * A finished competition is a document, so it is set like one: a masthead, then ruled sections in
 * the order the record is read — who won, what was written, who judged, what it added up to.
 *
 * Winners link to their PROFILE, never to their script: competition entries stay private drafts and
 * are not published by winning. The Featured Scripts section only ever shows scripts a writer has
 * separately chosen to publish, so it is empty (and hidden) until that happens.
 */

// `userId` first: buildPublicResults shapes laureates with userId (the shared WinnerCard reads the
// same field), and only the featured-script writers below carry `_id`. Reading `_id` alone sent every
// winner without a username to /share/profile/undefined — a dead link on the one page that exists to
// point at the people.
const profilePath = (person) => (person?.username
  ? `/${person.username}`
  : `/share/profile/${person?.userId || person?._id}`);

const WinnerBlock = ({ person, label, icon: Icon, accent, prominent = false }) => {
  if (!person) return null;
  return (
    <Card>
      {/* The award leads, on its own rule, the way the shared WinnerCard sets it — this is a roll of
          honour, so what they won is read before who won it. Only the top placing takes the accent;
          the rest stay in the slug-line voice so the coral keeps meaning something. */}
      <p
        className="ckc-meta flex items-center gap-1.5"
        style={{
          color: prominent ? "var(--ckc-accent-text)" : undefined,
          paddingBottom: 12,
          borderBottom: "1px solid var(--ckc-rule)",
        }}
      >
        <Icon className="h-4 w-4" style={{ color: accent }} aria-hidden="true" />
        {person.specialTitle || label}
      </p>

      <div className={`mt-4 flex items-start gap-4 ${prominent ? "sm:gap-5" : ""}`}>
        <Avatar src={person.profileImage} name={person.name} size={prominent ? 72 : 52} />
        <div className="min-w-0 flex-1">
          <h3
            className={`ckc-title ${prominent ? "ckc-h2" : ""}`}
            style={prominent ? undefined : { fontSize: "1.1875rem" }}
          >
            {person.name}
          </h3>
          {person.scriptTitle ? (
            <p style={{ marginTop: 6, fontFamily: "var(--ckc-display)", fontStyle: "italic", fontSize: "1.0625rem", color: "var(--ckc-ink)" }}>
              {person.scriptTitle}
            </p>
          ) : null}
          {person.logline ? (
            <>
              <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: "var(--ckc-muted)" }}>
                {person.logline}
              </p>
              {/* Same note the shared WinnerCard carries: a logline is either the writer's pitch or
                  the AI's reading of their script, and the reader gets to tell which. */}
              {person.loglineByAi ? (
                <p className="ckc-meta" style={{ marginTop: 7 }}>AI-generated logline</p>
              ) : null}
            </>
          ) : null}

          {person.rewards?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.rewards
                .map((type) => rewardLabel(type, { specialTitle: person.specialTitle }))
                .filter(Boolean).map((label_, i) => (
                <span key={i} className="ckc-chip">
                  {label_}
                </span>
              ))}
            </div>
          ) : null}

          <Link to={profilePath(person)} className="ckc-link mt-4 inline-flex items-center gap-1.5" style={{ fontSize: 14 }}>
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
    return (
      <div className="ckc" style={{ minHeight: "100vh" }}>
        <p className="ckc-meta mx-auto max-w-5xl px-4 py-20 text-center">Loading…</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="ckc" style={{ minHeight: "100vh" }}>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <Card className="text-center">
            <Trophy className="mx-auto h-10 w-10" style={{ color: "var(--ckc-faint)" }} aria-hidden="true" />
            <h1 className="ckc-title ckc-h2" style={{ marginTop: 16 }}>Competition not found</h1>
            <p style={{ marginTop: 10, lineHeight: 1.6, color: "var(--ckc-muted)" }}>
              This competition either doesn't exist or its results haven't been announced yet.
            </p>
            <Link to="/hall-of-fame" className="ckc-btn mt-6">
              Back to the Hall of Fame
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const { competition, results, stats, featuredScripts } = data;
  const dateRange = [competition.dates?.startsAt, competition.dates?.endsAt]
    .filter(Boolean)
    .map((d) => new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }))
    .join(" – ");

  return (
    <div className="ckc" style={{ minHeight: "100vh" }}>
      {competition.bannerUrl ? (
        <img src={competition.bannerUrl} alt="" className="h-48 w-full object-cover sm:h-64" />
      ) : (
        /* No banner, no decoration standing in for one — just the quiet band that closes the top of
           the page, so the record starts with its own masthead. */
        <div className="w-full" style={{ height: 10, background: "var(--ckc-cream)", borderBottom: "1px solid var(--ckc-rule)" }} />
      )}

      <div className="mx-auto max-w-5xl px-4 pb-16">
        <Link to="/hall-of-fame" className="ckc-meta mt-6 inline-flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Hall of Fame
        </Link>

        <header className="ckc-masthead" style={{ marginTop: 18 }}>
          <h1 className="ckc-title ckc-h1">
            {competition.name}{" "}
            <span style={{ color: "var(--ckc-muted)" }}>{yearSuffix(competition.name, competition.year)}</span>
          </h1>
          {/* The theme is the one line of the record that stays coral: it is what the event was. */}
          {competition.theme?.title ? (
            <p style={{ marginTop: -6, fontFamily: "var(--ckc-display)", fontStyle: "italic", fontSize: "1.25rem", color: "var(--ckc-accent-text)" }}>
              {competition.theme.title}
            </p>
          ) : null}
          <p className="ckc-meta" style={{ letterSpacing: "0.06em" }}>{dateRange}</p>
          {competition.prizePool ? (
            <span className="ckc-chip" style={{ alignSelf: "flex-start" }}>{competition.prizePool}</span>
          ) : null}
        </header>

        {results.winner || results.runnerUp ? (
          <>
            <hr className="ckc-rule" style={{ marginTop: 40 }} />
            <Section title="Winners">
              <div className="ckc-stack">
                <WinnerBlock person={results.winner} label="Winner" icon={Trophy} accent="var(--ckc-accent)" prominent />
                <WinnerBlock person={results.runnerUp} label="Runner-Up" icon={Award} accent="var(--ckc-faint)" />
              </div>
            </Section>
          </>
        ) : null}

        {results.special?.length ? (
          <>
            <hr className="ckc-rule" />
            <Section title="Special awards">
              <div className="grid gap-5 sm:grid-cols-2">
                {results.special.map((person, i) => (
                  <WinnerBlock key={i} person={person} label="Special award" icon={Sparkles} accent="var(--ckc-faint)" />
                ))}
              </div>
            </Section>
          </>
        ) : null}

        {featuredScripts?.length ? (
          <>
            <hr className="ckc-rule" />
            <Section title="Featured scripts">
              <div className="ckc-grid">
                {featuredScripts.map((script) => (
                  /* Not the shared Card here: it always carries its own padding, and this one holds
                     a full-bleed cover above the text. */
                  <div key={script._id} className="ckc-card overflow-hidden">
                    {script.coverImage ? (
                      <img src={script.coverImage} alt="" className="h-36 w-full object-cover" />
                    ) : (
                      <div className="h-36 w-full" style={{ background: "var(--ckc-cream)", borderBottom: "1px solid var(--ckc-rule)" }} />
                    )}
                    <div className="ckc-card-pad">
                      <h3 className="ckc-title ckc-h3">{script.title}</h3>
                      {script.genre ? <p className="ckc-meta" style={{ marginTop: 6 }}>{script.genre}</p> : null}
                      <p style={{ marginTop: 10, fontSize: 14, color: "var(--ckc-muted)" }}>{script.writer.name}</p>
                      <div className="mt-4 flex gap-5">
                        <Link to={`/share/project/${script._id}`} className="ckc-link" style={{ fontSize: 14 }}>
                          Read script
                        </Link>
                        <Link to={profilePath(script.writer)} style={{ fontSize: 14, fontWeight: 500, color: "var(--ckc-muted)" }}>
                          View writer
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        ) : null}

        {competition.judges?.length ? (
          <>
            <hr className="ckc-rule" />
            <Section title="Judges">
              <div className="ckc-grid">
                {competition.judges.map((judge, i) => (
                  <Card key={i}>
                    <div className="flex items-start gap-3">
                      <Avatar src={judge.photoUrl} name={judge.name} size={48} />
                      <div className="min-w-0">
                        <p className="ckc-title ckc-h3">{judge.name}</p>
                        {judge.title ? (
                          <p className="ckc-meta" style={{ marginTop: 5 }}>
                            {judge.title}
                            {judge.company ? (
                              <>
                                {" @ "}
                                {judge.companyLink ? (
                                  <a href={externalUrl(judge.companyLink)} target="_blank" rel="noreferrer noopener" className="hover:underline hover:text-[#111] transition-colors text-inherit">
                                    {judge.company}
                                  </a>
                                ) : (
                                  judge.company
                                )}
                              </>
                            ) : ""}
                          </p>
                        ) : judge.company ? (
                          <p className="ckc-meta" style={{ marginTop: 5 }}>
                            {judge.companyLink ? (
                              <a href={externalUrl(judge.companyLink)} target="_blank" rel="noreferrer noopener" className="hover:underline hover:text-[#111] transition-colors text-inherit">
                                {judge.company}
                              </a>
                            ) : (
                              judge.company
                            )}
                          </p>
                        ) : null}
                        {judge.bio ? (
                          <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: "var(--ckc-muted)" }}>{judge.bio}</p>
                        ) : null}
                        {judge.companyBio ? (
                          <div className="mt-4 text-sm" style={{ color: "var(--ckc-muted)" }}>
                            <p className="font-semibold text-[10px] uppercase tracking-wide mb-1" style={{ color: "var(--ckc-ink)" }}>About {judge.company}</p>
                            <p className="line-clamp-3">{judge.companyBio}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          </>
        ) : null}

        {competition.sponsors?.length ? (
          <>
            <hr className="ckc-rule" />
            <Section title="Sponsors">
              <div className="flex flex-wrap items-center gap-5">
                {competition.sponsors.map((sponsor, i) => {
                  const href = externalUrl(sponsor.url);
                  const mark = (
                    <span className="flex items-center gap-3">
                      {sponsor.logoUrl
                        ? <img src={sponsor.logoUrl} alt={sponsor.name} className="h-8 object-contain" />
                        : <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ckc-ink)" }}>{sponsor.name}</span>}
                      {sponsor.tier ? <span className="ckc-chip">{sponsor.tier}</span> : null}
                    </span>
                  );
                  // A sponsor with no usable link still belongs on the record — as a card, not as a
                  // focusable anchor that goes nowhere.
                  return href ? (
                    <a
                      key={i}
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ckc-card"
                      style={{ padding: "12px 16px" }}
                    >
                      {mark}
                    </a>
                  ) : (
                    <span key={i} className="ckc-card" style={{ padding: "12px 16px" }}>{mark}</span>
                  );
                })}
              </div>
            </Section>
          </>
        ) : null}

        <hr className="ckc-rule" />
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
