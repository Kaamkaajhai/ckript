import { useContext, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, Clock, History, User, Check } from "lucide-react";
import publicApi from "../../services/publicApi";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import CompetitionCard from "../../components/competition/CompetitionCard";
import WinnerCard from "../../components/competition/WinnerCard";
import EntryCard from "../../components/competition/EntryCard";
import ChallengeNow from "../../components/competition/ChallengeNow";
import { Section, Stat } from "../../components/competition/ui";
import { COMPANY } from "../../constants/company";
import { HOW_IT_WORKS, WHAT_YOU_RECEIVE, JUDGING_CRITERIA } from "./constants";
import "./challenge.css";
import { yearSuffix } from "../../components/competition/labels";

/**
 * The Challenge — the public front door, and the index behind it.
 *
 * This page used to open on its own tab strip. That made it a console: four filters and, for the
 * ~70-75% of visitors who arrive when nothing is running, a panel whose entire content was an
 * apology. A first-time visitor arriving from the landing learned nothing about what the challenge
 * IS, and "My Challenges" asked them about entries they could not have.
 *
 * So the page now answers before it browses. Everything above the bridge is the EVENT — what it is,
 * how it works, what you get, what happens to your script, who can enter — and none of it depends
 * on a competition existing, so it is identical on a dormant day. Everything below the bridge is
 * the RECORD: the same four tabs, unchanged, over the same two responses.
 *
 * The tabs were not amputated, only moved. `?tab=` deep links, the replace-based history behaviour
 * and the /list+/completed merge all work exactly as before.
 *
 * Public: Live, Previous and Hall of Fame load through publicApi so a logged-out visitor sees the
 * whole page. Only "Mine" needs an account.
 */

// Icons are stored as rendered elements: a destructured param renamed to PascalCase and used only
// inside JSX is not seen as used by no-unused-vars in this config.
const ICON = "h-4 w-4";
const TABS = [
  { key: "live", label: "Live", icon: <Clock className={ICON} aria-hidden="true" /> },
  { key: "past", label: "Previous", icon: <History className={ICON} aria-hidden="true" /> },
  { key: "hall-of-fame", label: "Hall of Fame", icon: <Trophy className={ICON} aria-hidden="true" /> },
  { key: "mine", label: "My Challenges", icon: <User className={ICON} aria-hidden="true" /> },
];

/**
 * What stops most writers submitting anywhere is not the competition — it is not knowing what
 * happens to the work afterwards, and the worry is specific: who reads it, what exactly is judged,
 * do I get it back.
 *
 * Every answer here describes behaviour the code already has: entries are private drafts and the
 * public results shape carries no script id, the submission snapshot is frozen at claim time, and
 * PARTICIPANT_COMPLETION_MESSAGE already promises the script stays in the writer's library. There
 * is deliberately NO rights or licensing claim here — that is a legal statement, it belongs to
 * whoever owns the terms, and it is the most damaging sentence on the site to get wrong.
 *
 * Local, not in constants.js: a shared constant with one consumer is just a longer import path.
 */
const QUESTIONS = [
  {
    q: "Who can read it?",
    a: "Nobody but you while you are writing. When you submit, a frozen copy goes for evaluation and "
      + "nowhere else. Entries are never published — even in the Hall of Fame only a title and a "
      + "logline appear, never the script.",
  },
  {
    q: "What exactly gets judged?",
    a: "The copy frozen at the moment you submit. Whatever you do to the script afterwards — rewrite "
      + "it, retitle it, take it apart — does not change what was read.",
  },
  {
    q: "What happens to it when the challenge ends?",
    a: "It stays in your Ckript library, unlocked, yours to rewrite, export, or take somewhere else "
      + "entirely.",
  },
];

const ELIGIBILITY_CHIPS = [
  "First script", "Fiftieth script", "Students", "Professionals", "Screen", "TV", "Anime", "Stage",
];

// A declared result is still news for about three weeks, and any newer edition outranks it the
// moment one is announced — so this self-heals without a cron or a freshness flag.
const RESULTS_BAND_DAYS = 21;

const Empty = ({ children }) => (
  <div className="ckc-card ckc-card-pad" style={{ textAlign: "center", padding: "52px 24px" }}>
    <p className="ckc-lede" style={{ margin: "0 auto" }}>{children}</p>
  </div>
);

const Grid = ({ children }) => <div className="ckc-grid">{children}</div>;

const ChallengeHub = () => {
  const [params, setParams] = useSearchParams();
  const { user } = useContext(AuthContext) || {};
  const { openAuthModal } = useAuthModal();

  const [list, setList] = useState({ live: [], upcoming: [], past: [], serverNow: null });
  const [archive, setArchive] = useState([]);
  const [mine, setMine] = useState([]);
  const [mineServerNow, setMineServerNow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // publicApi, not api: the authenticated instance hard-redirects to sign-in when a stored
        // session has expired, which would bounce a visitor off a public page.
        const [listed, completed] = await Promise.all([
          publicApi.get("/competitions/list"),
          publicApi.get("/competitions/completed"),
        ]);
        if (cancelled) return;
        setList(listed.data || { live: [], upcoming: [], past: [] });
        setArchive(completed.data?.items || []);
        setError("");
      } catch {
        if (!cancelled) setError("Could not load competitions. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) { setMine([]); return undefined; }
    let cancelled = false;
    api.get("/competitions/mine")
      .then(({ data }) => {
        if (cancelled) return;
        setMine(data?.items || []);
        setMineServerNow(data?.serverNow || null);
      })
      .catch(() => { if (!cancelled) setMine([]); });
    return () => { cancelled = true; };
  }, [user]);

  // Anything a writer can still act on, soonest first, with announced ones after the open ones.
  const liveItems = [...(list.live || []), ...(list.upcoming || [])];

  // /list is deliberately cheap and carries no results — it exists to answer "what is on". So a
  // finished competition would render as "Results archived." with blank counts even though its
  // winner is sitting in the archive response we already fetched. Merge the two by id rather than
  // adding the per-competition aggregation to /list, which would cost a full stats pass per row on
  // every hub load.
  const archiveById = new Map(archive.map((a) => [String(a._id), a]));
  const pastItems = (list.past || []).map((item) => ({ ...item, ...(archiveById.get(String(item._id)) || {}) }));

  // The Hall of Fame is organised BY CHALLENGE, and within each challenge it is about the writers.
  // Each competition contributes a section — just enough of its own detail to say which event this
  // was — under which every award sits: winner, runner-up, and each category award.
  const honourRoll = archive
    .map((c) => {
      const from = (person, award) => (person ? [{ person, award }] : []);
      return {
        competition: c,
        people: [
          ...from(c.winner, "winner"),
          ...from(c.runnerUp, "runner_up"),
          ...(c.special || []).flatMap((p) => from(p, "special")),
        ],
      };
    })
    .filter((group) => group.people.length);

  const laureateCount = honourRoll.reduce((n, g) => n + g.people.length, 0);

  // ── Which competition the band talks about ───────────────────────────────────────────────────
  // judging and results live in `past` (nobody can enter them), but they are the two weeks this
  // page is most worth reading, so they can still hold the band.
  const recentPast = (list.past || [])[0] || null;
  const stillCurrent = recentPast && (
    recentPast.phase === "judging"
    || (recentPast.phase === "results" && recentPast.resultsDeclaredAt
      && Date.now() - new Date(recentPast.resultsDeclaredAt).getTime() < RESULTS_BAND_DAYS * 864e5)
  );
  const featured = (list.live || [])[0] || (list.upcoming || [])[0] || (stillCurrent ? recentPast : null);
  const latest = featured ? null : (pastItems[0] || null);
  const myEntry = featured
    ? mine.find((m) => String(m.competition?._id) === String(featured._id))?.entry
    : null;

  // ── Tabs ─────────────────────────────────────────────────────────────────────────────────────
  const requested = params.get("tab");
  // "My Challenges" is meaningless to someone who has never signed in, and at full weight it is a
  // large part of why this page read as somebody else's dashboard. But a bookmarked or shared
  // ?tab=mine must still land somewhere sensible, so an explicit request keeps the tab and the
  // panel offers sign-in in place.
  const visible = user ? TABS : TABS.filter((t) => t.key !== "mine");
  const strip = (!user && requested === "mine") ? TABS : visible;

  // Explicit ?tab always wins — the landing links ?tab=hall-of-fame in most of its phase variants.
  // Otherwise open on whichever panel has something in it, preferring faces over inventory.
  const fallback = liveItems.length ? "live" : honourRoll.length ? "hall-of-fame" : pastItems.length ? "past" : "live";
  const tab = strip.some((t) => t.key === requested) ? requested : fallback;

  const select = (key) => {
    // `replace` so flicking between tabs does not bury the page the visitor arrived from under a
    // stack of history entries. Always write the key — the old special case that wrote {} for
    // "live" meant the active tab did not survive a reload or a share.
    setParams({ tab: key }, { replace: true });
  };

  // After the restructure #record is several screens down, so a visitor who asked for a tab has to
  // be taken to it — otherwise the landing's "See past winners" lands on an explainer nobody asked
  // for. Only fires when the URL carried ?tab= at FIRST paint, so a later tab click never scrolls.
  const arrivedWithTab = useRef(Boolean(params.get("tab")));
  const scrolled = useRef(false);
  useEffect(() => {
    if (loading || scrolled.current || !arrivedWithTab.current) return;
    scrolled.current = true;
    // "auto", never "smooth" — the interior register has no motion.
    document.getElementById("record")?.scrollIntoView({ behavior: "auto" });
  }, [loading]);

  const partnerMailto = `mailto:${COMPANY.supportEmail}?subject=${encodeURIComponent("Partnering on the Ckript Challenge")}`;

  return (
    <div className="ckc" style={{ minHeight: "100vh", paddingBottom: 96 }}>
      <div style={{ margin: "0 auto", maxWidth: 1120, padding: "48px 24px 0" }}>

        {/* ── The event ─────────────────────────────────────────────────────────────────────── */}

        <header className="ckc-masthead">
          <p className="ckc-meta">The Ckript Challenge</p>
          {/* A sentence, not the landing's two noun fragments — the grammar itself signals
              continuation rather than echo, and it states the one fact that distinguishes this
              from any other contest: simultaneity. */}
          <h1 className="ckc-title ckc-h1">
            Everyone writes to the same theme,{" "}
            <em style={{ fontStyle: "italic", color: "var(--ckc-muted)" }}>at the same time.</em>
          </h1>
          <p className="ckc-lede-editorial">
            A challenge opens, the theme is unsealed, and every writer has forty-eight hours to turn
            it into a script. Whatever you have at the deadline is what gets read — and every entry
            gets read, not only the ones that place. It does not run all year; this is where the next
            one opens.
          </p>
        </header>

        <div style={{ marginTop: 30 }}>
          <ChallengeNow
            item={featured}
            latest={latest}
            serverNow={list.serverNow}
            entry={myEntry}
            user={user}
            loading={loading}
            error={error}
            openAuthModal={openAuthModal}
            openCount={liveItems.length}
            onSeeAll={() => {
              select("live");
              document.getElementById("record")?.scrollIntoView({ behavior: "auto" });
            }}
          />
        </div>

        {/* ── The sill ──────────────────────────────────────────────────────────────────────────
            "Is this for me" is the first question anyone asks, so it is answered first — and as a
            caption on the band rather than a section of its own. No h2 at all: an 11px mono label in
            a margin column is the strongest available signal that this block is not the same KIND of
            thing as its neighbours, which is what teaches the reader on the first scroll that the
            blocks here are not interchangeable. Every word is the copy it had as a full section. */}
        <section id="eligibility" className="ckc-sill" aria-labelledby="sill-label">
          <p id="sill-label" className="ckc-meta">Who can enter</p>
          <div>
            <p className="ckc-sill-lede">
              Anyone who writes. Wherever you are, whatever you have written before.
            </p>
            {/* Examples, never a gate — nobody should self-exclude by absence from the list. */}
            <div className="ckc-sill-chips">
              {ELIGIBILITY_CHIPS.map((c) => <span key={c} className="ckc-chip">{c}</span>)}
            </div>
            <p className="ckc-sill-note">
              Entering costs nothing, and you write in the browser — there is nothing to install and
              nothing to buy.
            </p>
          </div>
        </section>

        <Section id="how-it-works" className="ckc-sec-tight">
          <div className="ckc-prog-head">
            <div>
              <p className="ckc-meta mb-2.5">The event, start to finish</p>
              <h2 className="ckc-title ckc-h2">How a challenge works</h2>
              <p className="ckc-lede mt-2" style={{ fontSize: "0.9375rem" }}>
                Six steps. None of them change from one challenge to the next.
              </p>
            </div>
            {/* Rides in the header rather than trailing the section: this is the detail of step 05,
                and as a tail block it ended the section the way the next one began. */}
            <div>
              <p className="ckc-meta">Judged on</p>
              <p style={{ marginTop: 7, fontSize: "0.9375rem", color: "var(--ckc-body)", maxWidth: "46ch" }}>
                Every entry is read against the same five things, whoever wrote it.
              </p>
              <div className="ckc-prog-crit">
                {JUDGING_CRITERIA.map((c) => <span key={c} className="ckc-chip">{c}</span>)}
              </div>
            </div>
          </div>

          <div className="ckc-prog">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="ckc-prog-step">
                <span className="ckc-prog-n">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="ckc-prog-t">{step.title}</h3>
                <p className="ckc-prog-b">{step.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Heading in the margin, list shifted right — the cheapest way to break the single left
            edge every section used to share, and a print gesture rather than a doc-site one. */}
        <Section id="what-you-receive" className="ckc-sec-tight">
          <div className="ckc-marginal">
            <div>
              <h2 className="ckc-title ckc-h2-quiet">What you get, whether you place or not</h2>
              <p className="ckc-lede mt-2.5" style={{ fontSize: "0.875rem" }}>
                Most people who enter a competition quietly assume they will not win. This is the
                part that is true for everyone.
              </p>
            </div>
            {/* Ticks stay ink, not coral: six coral checkmarks would be the loudest thing on a page
                that is dormant three-quarters of the year, and the accent means "live". */}
            <div className="ckc-ledger">
              {WHAT_YOU_RECEIVE.map((item) => (
                <div key={item}>
                  <Check className="h-4 w-4 shrink-0" style={{ color: "var(--ckc-ink)", marginTop: 3 }} aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── The centre ────────────────────────────────────────────────────────────────────────
            THE one ground change and THE one width change on the page, spent together on the block
            that actually decides whether someone submits. Deliberately NOT a <Section>: py-10 would
            lose a specificity fight with .ckc-inset's own padding and leave a dead utility behind.
            The negative margin cancels the wrapper's 24px gutter — coupled to `padding: 48px 24px 0`
            below, so change one and change both. */}
        <section id="your-script" className="ckc-inset scroll-mt-24">
          <p className="ckc-meta">Ownership and privacy</p>
          <h2 className="ckc-title ckc-h2-lead" style={{ marginTop: 12 }}>Your script stays yours</h2>
          <p className="ckc-lede" style={{ marginTop: 12, maxWidth: "54ch" }}>
            What stops most writers submitting anywhere is not the competition. It is not knowing
            what happens to the work afterwards.
          </p>
          <div className="ckc-qa">
            {QUESTIONS.map(({ q, a }) => (
              <div key={q}>
                <h3 className="ckc-qa-q">{q}</h3>
                <p className="ckc-qa-a">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Everything above was the event; everything below is the index. A double rule is what a
            printed programme puts at the end of a part, and it reuses the strong/hairline pairing
            the sill and the step matrix already established — so it reads as system, not ornament. */}
        <hr aria-hidden="true" className="ckc-part-break" />

        {/* ── The record ────────────────────────────────────────────────────────────────────── */}

        <Section id="record">
          <div className="ckc-record-head">
            <div>
              <p className="ckc-meta mb-2.5">The record</p>
              <h2 className="ckc-title ckc-h2">Every challenge, and everyone in it</h2>
              <p className="ckc-lede mt-2" style={{ maxWidth: "46ch" }}>
                Each edition Ckript has run, and the writers it has honoured.
              </p>
            </div>
            {/* Only once there is a record — a cold start must never say "0 challenges run".
                countriesRepresented is deliberately NOT summed: the same country appears in several
                editions, so adding them double-counts. */}
            {archive.length ? (
              <dl className="ckc-figures">
                <Stat label="Challenges run" value={archive.length} />
                <Stat
                  label="Scripts finished"
                  value={archive.reduce((n, c) => n + (c.scriptsSubmitted || 0), 0).toLocaleString()}
                />
                <Stat label="Writers honoured" value={laureateCount} />
              </dl>
            ) : null}
          </div>

          <nav className="ckc-tabs" aria-label="All challenges">
            {strip.map(({ key, label, icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => select(key)}
                  aria-current={active ? "page" : undefined}
                  className="ckc-tab"
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </nav>

          {!user ? (
            <p style={{ marginTop: 22, fontSize: 14, color: "var(--ckc-muted)" }}>
              Entered a challenge before?{" "}
              <button
                type="button"
                className="ckc-link"
                onClick={() => openAuthModal({ redirect: "/challenge?tab=mine" })}
              >
                Sign in to see your entries.
              </button>
            </p>
          ) : null}

          {/* `loading` gates ONLY this area. The masthead and every editorial section above render
              immediately — they depend on nothing fetched, and this page is prerendered and
              indexed, so a page-wide spinner was its first paint. */}
          <div style={{ marginTop: 32 }}>
            {error ? <Empty>{error}</Empty> : null}

            {!error && loading ? (
              <p className="ckc-meta" style={{ padding: "56px 0", textAlign: "center" }}>Loading…</p>
            ) : null}

            {!error && !loading && tab === "live" ? (
              liveItems.length ? (
                <Grid>
                  {liveItems.map((item) => (
                    <CompetitionCard
                      key={item._id}
                      item={item}
                      variant={item.phase === "announced" ? "upcoming" : "live"}
                      serverNow={list.serverNow}
                    />
                  ))}
                </Grid>
              ) : (
                <Empty>
                  Nothing is open at the moment. An announced challenge appears here as soon as it is
                  scheduled.
                </Empty>
              )
            ) : null}

            {!error && !loading && tab === "past" ? (
              pastItems.length ? (
                <Grid>
                  {pastItems.map((item) => (
                    <CompetitionCard
                      key={item._id}
                      item={item}
                      variant="past"
                      to={`/challenge/c/${item.slug}`}
                    />
                  ))}
                </Grid>
              ) : (
                <Empty>No challenge has finished yet.</Empty>
              )
            ) : null}

            {!error && !loading && tab === "hall-of-fame" ? (
              honourRoll.length ? (
                <div className="ckc-stack-lg">
                  {honourRoll.map(({ competition: c, people }) => (
                    <section key={c._id} aria-label={c.name}>
                      <div style={{ marginBottom: 22, paddingBottom: 14, borderBottom: "1px solid var(--ckc-rule)" }}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <h3 className="ckc-title ckc-h2">
                            {c.name}
                            {yearSuffix(c.name, c.year) ? (
                              <span style={{ marginLeft: 10, color: "var(--ckc-muted)" }}>{c.year}</span>
                            ) : null}
                          </h3>
                          <Link to={`/challenge/c/${c.slug}`} className="ckc-link" style={{ fontSize: 14 }}>
                            About this challenge
                          </Link>
                        </div>
                        {/* Just enough to say which event this was — the detail lives on the
                            competition's own page. */}
                        <p style={{ marginTop: 6, fontSize: 14, color: "var(--ckc-muted)" }}>
                          {c.theme ? <span style={{ fontFamily: "var(--ckc-display)", fontStyle: "italic", fontSize: 16 }}>{c.theme}</span> : null}
                          {c.theme && c.totalParticipants ? " · " : ""}
                          {c.totalParticipants
                            ? `${c.totalParticipants} entrant${c.totalParticipants === 1 ? "" : "s"} from ${c.countriesRepresented} ${c.countriesRepresented === 1 ? "country" : "countries"}`
                            : null}
                        </p>
                      </div>

                      <Grid>
                        {people.map(({ person, award }) => (
                          <WinnerCard key={`${award}-${person.userId}`} person={person} award={award} />
                        ))}
                      </Grid>
                    </section>
                  ))}
                </div>
              ) : (
                <Empty>No results have been declared yet. Winners are recorded here permanently.</Empty>
              )
            ) : null}

            {!error && !loading && tab === "mine" ? (
              !user ? (
                <div className="ckc-card ckc-card-pad" style={{ textAlign: "center", padding: "52px 24px" }}>
                  <p className="ckc-lede" style={{ margin: "0 auto" }}>
                    Sign in to see the challenges you have entered.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAuthModal({ redirect: "/challenge?tab=mine" })}
                    className="ckc-btn"
                    style={{ marginTop: 20 }}
                  >
                    Sign in
                  </button>
                </div>
              ) : mine.length ? (
                <div className="ckc-stack">
                  {mine.map((item) => (
                    <EntryCard key={item.entry?._id || item.competition?._id} item={item} serverNow={mineServerNow} />
                  ))}
                </div>
              ) : (
                <Empty>
                  You have not entered a challenge yet. When one opens it appears in Live — and here,
                  once you are in.
                </Empty>
              )
            ) : null}
          </div>
        </Section>

        {/* Addressed to roughly one visitor in a thousand, so it stays last and stays quiet. Set in
            the margin, reprising the sill's device: it brackets the page between two label-only
            blocks and stops it ending on yet another left-aligned stack. */}
        <hr className="ckc-rule" style={{ marginTop: 52 }} />
        <div className="ckc-marginal" style={{ marginTop: 26 }}>
          <p className="ckc-meta" style={{ paddingTop: 5 }}>Partner with us</p>
          <div className="ckc-colophon-body">
            <p className="ckc-lede" style={{ maxWidth: "52ch" }}>
              Studios, festivals, schools and film bodies back awards, set themes and read finalists.
              If that could be you, we would like to hear from you.
            </p>
            <a className="ckc-link" href={partnerMailto}>Write to us</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeHub;
