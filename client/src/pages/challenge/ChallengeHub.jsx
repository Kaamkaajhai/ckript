import { useContext, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, Clock, History, User } from "lucide-react";
import publicApi from "../../services/publicApi";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import CompetitionCard from "../../components/competition/CompetitionCard";
import EntryCard from "../../components/competition/EntryCard";
import { Card } from "../../components/competition/ui";

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
  <Card>
    <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{children}</p>
  </Card>
);

const Grid = ({ children }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D14D37]">Ckript</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Challenges</h1>
          <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-300">
            Timed screenwriting competitions. Register, write to the theme, and get your script read.
          </p>
        </header>

        <nav className="mt-8 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700" aria-label="Challenge sections">
          {TABS.map(({ key, label, icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => select(key)}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-[#D14D37] text-[#D14D37]"
                    : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </nav>

        <div className="mt-8">
          {error ? <Empty>{error}</Empty> : null}

          {!error && loading ? (
            <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</p>
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
              <Grid>
                {pastItems.map((item) => (
                  <CompetitionCard key={item._id} item={item} variant="past" />
                ))}
              </Grid>
            ) : (
              <Empty>No challenge has finished yet.</Empty>
            )
          ) : null}

          {!error && !loading && tab === "hall-of-fame" ? (
            archive.length ? (
              <>
                <Grid>
                  {archive.map((item) => (
                    <CompetitionCard key={item._id} item={item} variant="past" />
                  ))}
                </Grid>
                <p className="mt-6 text-center">
                  <Link to="/hall-of-fame" className="text-sm font-medium text-[#D14D37] hover:underline">
                    Open the full Hall of Fame
                  </Link>
                </p>
              </>
            ) : (
              <Empty>No results have been declared yet. Winners will be recorded here permanently.</Empty>
            )
          ) : null}

          {!error && !loading && tab === "mine" ? (
            !user ? (
              <Card>
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Sign in to see the challenges you have entered.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAuthModal({ redirect: "/challenge?tab=mine" })}
                    className="mt-4 rounded-lg bg-[#D14D37] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8402d]"
                  >
                    Sign In
                  </button>
                </div>
              </Card>
            ) : mine.length ? (
              <div className="space-y-6">
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
