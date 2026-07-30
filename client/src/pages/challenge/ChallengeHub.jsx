import { useContext, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, Clock, History, User, Check, Lock, Archive, PenLine } from "lucide-react";
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
const GLYPH = { className: "h-5 w-5", style: { color: "var(--ckc-ink)" }, "aria-hidden": "true" };

const QUESTIONS = [
  {
    // Rendered elements, matching TABS above: a destructured param renamed to PascalCase and used
    // only inside JSX is not seen as used by no-unused-vars in this config.
    icon: <Lock {...GLYPH} />,
    q: "Private",
    a: "Nobody reads it while you write. Entries are never published — the Hall of Fame shows a "
      + "title, never the script.",
  },
  {
    icon: <Archive {...GLYPH} />,
    q: "Frozen on submit",
    a: "The copy taken at the deadline is what gets judged. Rewrite the script afterwards and that "
      + "reading does not change.",
  },
  {
    icon: <PenLine {...GLYPH} />,
    q: "Always yours",
    a: "It stays in your Ckript library, unlocked — yours to rewrite, export, or take somewhere "
      + "else entirely.",
  },
];

/* The three ideas the event rests on. One each, and none of them explain a mechanism — the timeline
   below does that. */
const TRIO = [
  {
    title: "One Theme",
    body: "Nobody knows the prompt before the timer starts. Every participant begins with the same "
      + "blank page.",
  },
  {
    title: "48 Hours",
    body: "Write inside the Ckript editor with autosave, live progress and a deadline that cannot "
      + "move.",
  },
  {
    title: "Every Story Matters",
    body: "Every script receives an AI evaluation. The best stories earn awards and become part of "
      + "Ckript history.",
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

        {/* ── The opening ───────────────────────────────────────────────────────────────────────
            The figure is the page's one strong visual, doing the job an image does on the landing.
            Everything beside it stays quiet so it can be loud. */}
        <header className="ckc-hero">
          <div className="ckc-hero-figure">
            <span className="ckc-hero-n" aria-hidden="true">48</span>
            <span className="ckc-hero-u">Hours</span>
          </div>
          {/* Three lines and nothing else. A paragraph here is the moment the page starts
              explaining itself, and everything below already answers what it would have said. */}
          <div className="ckc-hero-text">
            <p className="ckc-meta">The Ckript Challenge</p>
            <h1 className="ckc-title ckc-hero-h1">
              One theme.<br />
              <em className="ckc-hero-em">Every writer starts together.</em>
            </h1>
          </div>
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

        {/* ── Three ideas ───────────────────────────────────────────────────────────────────────
            One idea each, and none of them explains a mechanism — the programme below does that. */}
        <div className="ckc-trio">
          {TRIO.map((card) => (
            <div key={card.title} className="ckc-trio-card">
              <h2 className="ckc-trio-t">{card.title}</h2>
              <p className="ckc-trio-b">{card.body}</p>
            </div>
          ))}
        </div>

        {/* ── The programme, on ink ──────────────────────────────────────────────────────────────
            The page's one dark ground. Six steps read as a run rather than a stack: the ordinal is
            a hanging figure, the step is a heading, and the ground does the emphasis so nothing
            needs a border. */}
        <section id="how-it-works" className="ckc-ink scroll-mt-24">
          <p className="ckc-ink-label">The event, start to finish</p>
          <h2 className="ckc-title ckc-ink-h2">Six steps. Every challenge.</h2>

          <ol className="ckc-run">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="ckc-run-i">
                <span className="ckc-run-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="ckc-run-t">{step.title}</h3>
                <p className="ckc-run-b">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="ckc-ink-foot">
            <p className="ckc-ink-label">Judged on</p>
            <div className="ckc-ink-chips">
              {JUDGING_CRITERIA.map((c) => <span key={c} className="ckc-ink-chip">{c}</span>)}
            </div>
          </div>
        </section>

        {/* ── What you get ──────────────────────────────────────────────────────────────────────
            Six lines, no card and no rule — space alone separates them, so this reads differently
            from both the trio above and the panel below. */}
        <Section id="what-you-receive" className="ckc-sec-tight">
          <h2 className="ckc-title ckc-h2-lead">What you get, whether you place or not.</h2>
          <div className="ckc-gets">
            {WHAT_YOU_RECEIVE.map((item) => (
              <div key={item} className="ckc-get">
                <Check className="h-4 w-4 shrink-0" style={{ color: "var(--ckc-ink)", marginTop: 5 }} aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Ownership ─────────────────────────────────────────────────────────────────────────
            The one tinted ground, and three objects rather than three paragraphs. What stops writers
            submitting is not the contest — it is not knowing what happens to the work afterwards.

            Every claim here describes behaviour the code already has. There is deliberately no
            rights or licensing statement: that is a legal claim, it belongs to whoever owns the
            terms, and it is the worst sentence on the site to get wrong. */}
        <section id="your-script" className="ckc-inset scroll-mt-24">
          <h2 className="ckc-title ckc-h2-lead ckc-inset-h2">Your script stays yours.</h2>
          <div className="ckc-own">
            {QUESTIONS.map(({ icon, q, a }) => (
              <div key={q} className="ckc-own-i">
                {icon}
                <h3 className="ckc-own-t">{q}</h3>
                <p className="ckc-own-b">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Who ───────────────────────────────────────────────────────────────────────────────
            Examples, never a gate — nobody should self-exclude by absence from the list. */}
        <section id="eligibility" className="ckc-who scroll-mt-24">
          <h2 className="ckc-title ckc-who-h2">Anyone who writes.</h2>
          <div className="ckc-pills">
            {ELIGIBILITY_CHIPS.map((c) => <span key={c} className="ckc-pill">{c}</span>)}
          </div>
          <p className="ckc-who-note">
            Entering costs nothing, and you write in the browser — nothing to install, nothing to buy.
          </p>
        </section>

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
