import { useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../../services/api";
// The /active leg is PUBLIC and this hook backs CompetitionLanding, a public route. services/api
// hard-redirects to sign-in inside its REQUEST interceptor the moment a stored token is past
// expiresAt — for any url, before the call leaves — so a visitor arriving from a shared link or a
// search result with a stale session never sees the competition at all. ChallengeHub was immunised
// for exactly this reason; the page its cards point at was not. The authenticated /:id/me calls
// below stay on `api`, which is where the session is actually wanted.
import publicApi from "../../services/publicApi";
import { AuthContext } from "../../context/AuthContext";

/**
 * The single source of competition state for every challenge screen.
 *
 * Loads the public competition and, when signed in, the caller's own entry. Refreshes on a one
 * minute poll and — more importantly — whenever a countdown reaches zero, which is what makes the
 * page flip from "starts in 00:00:01" to the live theme without anyone pressing reload. A socket
 * would be overkill: the competition changes state a handful of times over 48 hours.
 */
const useCompetition = ({ poll = true, enabled = true, slug = "", id = "" } = {}) => {
  const { user } = useContext(AuthContext) || {};
  const [state, setState] = useState({
    competition: null,
    entry: null,
    phase: null,
    timeline: [],
    results: null,
    referrals: null,
    referralCode: "",
    serverNow: null,
    // `enabled: false` (the editor outside competition mode) must not sit in a permanent loading
    // state — nothing is ever going to arrive.
    loading: enabled,
    error: "",
  });

  // Guards against a slow response from a previous refresh overwriting a newer one.
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    // Set on the way IN as well as cleared on the way out. StrictMode runs mount → cleanup → mount,
    // so a cleanup-only version leaves the ref false forever and every setState below is skipped —
    // the page would sit on "Loading…" with a successful 200 already in hand.
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    try {
      // Three ways of naming the competition, and they are not interchangeable.
      //
      // `id` targets exactly one. /:id/me already answers with the competition, the caller's entry,
      // the phase and the timeline in a single round trip, so it stands in for the /active + /me pair
      // below. A screen that already knows WHICH competition it is looking at — the editor, working
      // on a script that stores its own competitionId — must go this way: re-resolving "the active
      // one" can quietly land on a different competition, and then the name, the deadline and the
      // id every action posts to all belong to somebody else's event.
      //
      // A slug goes through the public /active?c=, the same query the server accepts for reaching a
      // hidden competition by direct link. With neither, we resolve the active competition, as every
      // screen did before the hub existed.
      let data;
      let entry = null;
      let timeline = [];
      let referrals = null;
      let referralCode = "";

      if (id) {
        const mine = await api.get(`/competitions/${id}/me`);
        data = mine.data || {};
        entry = data.entry || null;
        timeline = data.timeline || [];
        referrals = data.referrals || null;
        referralCode = data.referralCode || "";
      } else {
        const active = await publicApi.get("/competitions/active", slug ? { params: { c: slug } } : undefined);
        data = active.data || {};
        timeline = data.timeline || [];

        if (user && data?.competition?._id) {
          try {
            const mine = await api.get(`/competitions/${data.competition._id}/me`);
            entry = mine.data?.entry || null;
            timeline = mine.data?.timeline || timeline;
            referrals = mine.data?.referrals || null;
            referralCode = mine.data?.referralCode || "";
          } catch (err) {
            // 404 simply means "not registered". 
            // 403 means "access denied" (e.g. investor/producer instead of writer).
            // In both cases, we don't have an entry, but we shouldn't throw and destroy the public competition data.
            if (err?.response?.status !== 404 && err?.response?.status !== 403) throw err;
          }
        }
      }

      if (!mountedRef.current || requestRef.current !== requestId) return;
      setState({
        competition: data.competition || null,
        entry,
        phase: data.phase || null,
        timeline,
        results: data.results || null,
        referrals,
        referralCode,
        serverNow: data.serverNow || null,
        loading: false,
        error: "",
      });
    } catch (err) {
      if (!mountedRef.current || requestRef.current !== requestId) return;
      const notFound = err?.response?.status === 404;
      setState((prev) => ({
        ...prev,
        loading: false,
        competition: notFound ? null : prev.competition,
        error: notFound ? "" : (err?.response?.data?.message || "Failed to load the competition."),
      }));
    }
    // `slug` and `id` MUST both be dependencies. This same callback is the 60s poll and the
    // countdown's onExpire handler, so without them, navigating from one competition to another —
    // or learning the id after the first render, which is what the editor does — keeps refreshing
    // the old one forever with no error to show for it.
  }, [user, enabled, slug, id]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!poll || !enabled) return undefined;
    // Named `timer`, not `id` — `id` is the competition option now, and a shadow here would read as
    // if the poll were clearing it.
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [poll, enabled, refresh]);

  return { ...state, refresh, isRegistered: Boolean(state.entry) };
};

export default useCompetition;
