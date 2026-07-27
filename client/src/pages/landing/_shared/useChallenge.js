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

const EMPTY = {
  phase: "dormant",   // dormant | announced | registration_open | registration_closed | live | judging | results
  competition: null,  // { name, slug, dates, prizePool, theme, hasJudges }
  winner: null,       // { name, award, year, slug } — one past laureate, for proof
  pastEntrants: 0,    // cumulative across completed competitions
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
        // `/list` answers "what is on"; `/completed` carries the winners and the participant counts
        // that `/list` deliberately omits (it would need a per-row aggregation on a public endpoint).
        const [listed, completed] = await Promise.all([
          publicApi.get("/competitions/list"),
          publicApi.get("/competitions/completed"),
        ]);
        if (cancelled) return;

        const list = listed.data || {};
        const items = completed.data?.items || [];

        // A competition you can still act on wins over one that has merely been announced.
        const current = (list.live || [])[0] || (list.upcoming || [])[0] || null;

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
              year: withWinner.year,
              competitionName: withWinner.name,
              slug: withWinner.slug,
            }
            : null,
          pastEntrants: items.reduce((n, c) => n + (Number(c.totalParticipants) || 0), 0),
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
