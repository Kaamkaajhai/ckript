import { useContext, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, Clock, History, User } from "lucide-react";
import publicApi from "../../services/publicApi";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import CompetitionCard from "../../components/competition/CompetitionCard";
import WinnerCard from "../../components/competition/WinnerCard";
import EntryCard from "../../components/competition/EntryCard";
import { Card } from "../../components/competition/ui";
import "./challenge.css";
import { yearSuffix } from "../../components/competition/labels";

/**
 * The Challenge hub — everything competition-related in one place.
 *
 * Before this, "Challenge" dropped you straight into whichever single competition was active, and
 * the archive and your own history lived at unrelated URLs (/hall-of-fame, /my-competitions) that
 * nothing linked to from here. Four tabs instead:
 *
 *   Live      competitions you can still act on — register, or write against the clock
 *   Previous  finished ones, including those still being judged
 *   Hall of Fame  the permanent record of declared results
 *   Mine      your own entries
 *
 * Tabs are URL-addressable via ?tab= rather than sub-paths, matching the convention already used
 * elsewhere in the app. Sub-paths would also collide with /challenge/register and
 * /challenge/dashboard, and with competition slugs, which are derived from the competition name.
 *
 * Public: Live, Previous and Hall of Fame load through publicApi so a logged-out visitor sees the
 * whole hub. Only "Mine" needs an account, and it asks for one in place rather than redirecting.
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

  const requested = params.get("tab");
  const tab = TABS.some((t) => t.key === requested) ? requested : "live";

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

  const select = (key) => {
    // `replace` so flicking between tabs does not bury the page the visitor arrived from under a
    // stack of history entries.
    setParams(key === "live" ? {} : { tab: key }, { replace: true });
  };

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

  return (
    <div className="ckc" style={{ minHeight: "100vh", paddingBottom: 96 }}>
      <div style={{ margin: "0 auto", maxWidth: 1120, padding: "48px 24px 0" }}>
        <header className="ckc-masthead">
          <p className="ckc-meta">Ckript · Screenwriting competitions</p>
          <h1 className="ckc-title ckc-h1">Challenges</h1>
          <p className="ckc-lede">
            One theme. A fixed window. Write a complete script against the clock, and have it read.
          </p>
        </header>

        <nav className="ckc-tabs" style={{ marginTop: 40 }} aria-label="Challenge sections">
          {TABS.map(({ key, label, icon }) => {
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

        <div style={{ marginTop: 36 }}>
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
              <Empty>No challenge is running right now. The next one will appear here.</Empty>
            )
          ) : null}

          {!error && !loading && tab === "past" ? (
            pastItems.length ? (
              <>
                <p className="ckc-meta" style={{ marginBottom: 24 }}>
                  {pastItems.length} challenge{pastItems.length === 1 ? " has" : "s have"} run so far
                </p>
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
              </>
            ) : (
              <Empty>No challenge has finished yet.</Empty>
            )
          ) : null}

          {!error && !loading && tab === "hall-of-fame" ? (
            honourRoll.length ? (
              <>
                <p className="ckc-meta" style={{ marginBottom: 32 }}>
                  {laureateCount === 1
                    ? "1 writer honoured"
                    : `${laureateCount} writers honoured across ${honourRoll.length} challenge${honourRoll.length === 1 ? "" : "s"}`}
                </p>

                <div className="ckc-stack-lg">
                  {honourRoll.map(({ competition: c, people }) => (
                    <section key={c._id} aria-label={c.name}>
                      <div style={{ marginBottom: 22, paddingBottom: 14, borderBottom: "1px solid var(--ckc-rule)" }}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <h2 className="ckc-title ckc-h2">
                            {c.name}
                            {yearSuffix(c.name, c.year) ? (
                              <span style={{ marginLeft: 10, color: "var(--ckc-muted)" }}>{c.year}</span>
                            ) : null}
                          </h2>
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
              </>
            ) : (
              <Empty>No results have been declared yet. Winners will be recorded here permanently.</Empty>
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
              <Empty>You have not entered a challenge yet. Pick one from Live to get started.</Empty>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ChallengeHub;
