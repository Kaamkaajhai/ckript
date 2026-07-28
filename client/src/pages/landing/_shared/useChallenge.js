import { useEffect, useState } from "react";
import publicApi from "../../../services/publicApi";

/**
 * Competition state for the landing page.
 *
 * TWO RULES, both load-bearing:
 *
 * 1. `publicApi`, never `services/api`. The authenticated instance's request interceptor reads a
 *    stored `expiresAt` and hard-redirects to sign-in when it has passed — for ANY url, before the
 *    request goes out. On the homepage that would bounce a visitor with a stale token off the most
 *    important page on the site. ChallengeHub takes the same precaution for the same reason.
 *
 * 2. Never block, never fail loudly. The landing renders its dormant copy on the first frame and
 *    upgrades if data arrives. A spinner, a layout shift or an error state on the homepage costs
 *    more than the competition is worth — so every failure path here is silence.
 *
 * Competitions run three or four times a year, so `dormant` is the state this returns most of the
 * time. It is the primary case, not a fallback.
 */

/* How long "Results are in" stays true on the homepage. */
const RESULTS_FRESH_DAYS = 30;

const EMPTY = {
  phase: "dormant",   // dormant | announced | registration_open | registration_closed | live | judging | results
  competition: null,  // { name, slug, dates, prizePool, theme }
  winner: null,       // { name, year, competitionName, slug } — one past laureate, for proof
  serverNow: null,
};

/** The deadline each phase counts down to, and what to call it. */
export const countdownFor = (phase, dates = {}) => {
  if (phase === "announced") return { at: dates.regOpensAt, label: "Registration opens in" };
  if (phase === "registration_open") return { at: dates.regClosesAt, label: "Registration closes in" };
  if (phase === "registration_closed") return { at: dates.startsAt, label: "Writing begins in" };
  if (phase === "live") return { at: dates.endsAt, label: "Deadline in" };
  return { at: null, label: "" };
};

const useChallenge = () => {
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // `/list` answers "what is on"; `/completed` carries the winners that `/list` deliberately
        // omits (they need a per-row aggregation).
        //
        // allSettled, NOT all. These two are independent and unequal: `/list` decides whether the
        // section says "registration open" or nothing at all, while `/completed` only supplies the
        // laureate card. Under Promise.all a single 500 on the aggregation-heavy endpoint would
        // reject the pair and drop the homepage back to dormant copy mid-competition — the one week
        // it must not. Observed in testing, so this is a real path, not a hypothetical one.
        const [listed, completed] = await Promise.allSettled([
          publicApi.get("/competitions/list"),
          publicApi.get("/competitions/completed"),
        ]);
        if (cancelled) return;

        // Nothing to say without `/list`; keep the dormant copy already on screen.
        if (listed.status !== "fulfilled") return;

        const list = listed.value.data || {};
        const items = completed.status === "fulfilled" ? (completed.value.data?.items || []) : [];

        // `/list` files judging and results under `past` — correctly, since nobody can enter them.
        // But those are the two moments the challenge is most worth talking about: the scripts are
        // in, or the winners are out. Without this the landing shows evergreen dormant copy during
        // its own headline week, and the judging/results states below could never render at all.
        //
        // Judging always counts — it lasts days and the result is imminent. Results ages out, because
        // "Meet this year's winners" is a lie eight months later; the laureate card carries the proof
        // from then on.
        const now = list.serverNow ? new Date(list.serverNow) : new Date();
        const fresh = (declaredAt) => declaredAt
          && (now - new Date(declaredAt)) / 86400000 <= RESULTS_FRESH_DAYS;

        const concluded = (list.past || []).find((c) => (
          c.phase === "judging" || (c.phase === "results" && fresh(c.resultsDeclaredAt))
        ));

        // A competition you can still act on wins over one that has merely been announced, and both
        // win over one that is over.
        const current = (list.live || [])[0] || (list.upcoming || [])[0] || concluded || null;

        // The most recent laureate, for the one proof card. Winners only — a runner-up card with no
        // winner above it reads as a missing person.
        const withWinner = items.find((c) => c.winner);

        setState({
          phase: current?.phase || "dormant",
          competition: current
            ? {
              name: current.name,
              slug: current.slug,
              dates: current.dates || {},
              prizePool: current.prizePool || "",
              // Only ever present once the reveal has happened — the server strips it before that.
              theme: current.theme || "",
            }
            : null,
          winner: withWinner
            ? {
              name: withWinner.winner.name,
              // The script's TITLE only. `winner.logline` is deliberately not carried across:
              // `loglineByAi` is true whenever Ckript generated it, and setting machine-written
              // prose under a real writer's name on the homepage would attribute words to them
              // that they did not write.
              scriptTitle: withWinner.winner.scriptTitle || "",
              year: withWinner.year,
              competitionName: withWinner.name,
              slug: withWinner.slug,
            }
            : null,
          serverNow: list.serverNow || null,
        });
      } catch {
        // Stay dormant. The homepage must never show a competition error.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return state;
};

export default useChallenge;
