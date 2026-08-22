import { useContext } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy, Clock, History, User } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import CompetitionCard from "../../components/competition/CompetitionCard";
import WinnerCard from "../../components/competition/WinnerCard";
import EntryCard from "../../components/competition/EntryCard";
import { Card } from "../../components/competition/ui";
import "./challenge.css";
import { yearSuffix } from "../../components/competition/labels";
import {
  CHALLENGE_HUB_STATUS,
  writeChallengeHubTab,
} from "./challengeHub";
import useChallengeHub from "./useChallengeHub";

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
  const hub = useChallengeHub({ user });

  const requested = params.get("tab");
  const tab = TABS.some((t) => t.key === requested) ? requested : "live";

  const select = (key) => {
    // `replace` so flicking between tabs does not bury the page the visitor arrived from under a
    // stack of history entries.
    setParams(writeChallengeHubTab(params, key), { replace: true });
  };

  const publicData = hub.public.data || {};
  const mineData = hub.mine.data || {};
  const liveItems = publicData.live || [];
  const pastItems = publicData.past || [];
  const honourRoll = publicData.honourRoll || [];
  const laureateCount = publicData.laureateCount || 0;
  const mine = mineData.items || [];
  const publicLoading = hub.public.status === CHALLENGE_HUB_STATUS.LOADING;
  const publicError = hub.public.status === CHALLENGE_HUB_STATUS.FAILED;

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
          {tab !== "mine" && publicError ? (
            <div className="ckc-card ckc-card-pad" style={{ textAlign: "center", padding: "52px 24px" }}>
              <p className="ckc-lede" style={{ margin: "0 auto" }}>{hub.public.failure?.message}</p>
              <button type="button" className="ckc-btn" style={{ marginTop: 20 }} onClick={hub.retryPublic}>Try again</button>
            </div>
          ) : null}

          {tab !== "mine" && !publicError && publicLoading ? (
            <p className="ckc-meta" style={{ padding: "56px 0", textAlign: "center" }}>Loading…</p>
          ) : null}

          {!publicError && !publicLoading && tab === "live" ? (
            liveItems.length ? (
              <Grid>
                {liveItems.map((item) => (
                  <CompetitionCard
                    key={item._id}
                    item={item}
                    variant={item.phase === "announced" ? "upcoming" : "live"}
                    serverNow={publicData.serverNow}
                  />
                ))}
              </Grid>
            ) : (
              <Empty>No challenge is running right now. The next one will appear here.</Empty>
            )
          ) : null}

          {!publicError && !publicLoading && tab === "past" ? (
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

          {!publicError && !publicLoading && tab === "hall-of-fame" ? (
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

          {tab === "mine" ? (
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
            ) : hub.mine.status === CHALLENGE_HUB_STATUS.LOADING ? (
              <p className="ckc-meta" style={{ padding: "56px 0", textAlign: "center" }}>Loading your challenges…</p>
            ) : hub.mine.status === CHALLENGE_HUB_STATUS.FAILED ? (
              <div className="ckc-card ckc-card-pad" style={{ textAlign: "center", padding: "52px 24px" }}>
                <p className="ckc-lede" style={{ margin: "0 auto" }}>{hub.mine.failure?.message}</p>
                <button type="button" className="ckc-btn" style={{ marginTop: 20 }} onClick={hub.retryMine}>Try again</button>
              </div>
            ) : mine.length ? (
              <div className="ckc-stack">
                {mine.map((item) => (
                  <EntryCard key={item.entry?._id || item.competition?._id} item={item} serverNow={mineData.serverNow} />
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
