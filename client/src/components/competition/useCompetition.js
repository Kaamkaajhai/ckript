import { useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

/**
 * The single source of competition state for every challenge screen.
 *
 * Loads the public competition and, when signed in, the caller's own entry. Refreshes on a one
 * minute poll and — more importantly — whenever a countdown reaches zero, which is what makes the
 * page flip from "starts in 00:00:01" to the live theme without anyone pressing reload. A socket
 * would be overkill: the competition changes state a handful of times over 48 hours.
 */
const useCompetition = ({ poll = true, enabled = true, slug = "" } = {}) => {
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
      // Without a slug this resolves "the" active competition, as every screen did before the hub
      // existed. With one, it targets that specific competition — the same `?c=` the server already
      // accepts for reaching a hidden competition by direct link.
      const { data } = await api.get("/competitions/active", slug ? { params: { c: slug } } : undefined);
      let entry = null;
      let timeline = data.timeline || [];
      let referrals = null;
      let referralCode = "";

      if (user && data?.competition?._id) {
        try {
          const mine = await api.get(`/competitions/${data.competition._id}/me`);
          entry = mine.data?.entry || null;
          timeline = mine.data?.timeline || timeline;
          referrals = mine.data?.referrals || null;
          referralCode = mine.data?.referralCode || "";
        } catch (err) {
          // 404 simply means "not registered" — the common case, not an error worth surfacing.
          if (err?.response?.status !== 404) throw err;
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
    // `slug` MUST be a dependency. This same callback is the 60s poll and the countdown's onExpire
    // handler, so without it, navigating from one competition to another keeps refreshing the old
    // one forever with no error to show for it.
  }, [user, enabled, slug]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!poll || !enabled) return undefined;
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [poll, enabled, refresh]);

  return { ...state, refresh, isRegistered: Boolean(state.entry) };
};

export default useCompetition;
