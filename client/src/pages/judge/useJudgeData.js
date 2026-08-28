import { useCallback, useEffect, useState } from "react";
import judgeApi from "../../services/judgeApi";

/**
 * Loading for the judge console.
 *
 * Every fetch is cancel-guarded: a judge clicking through a queue fires overlapping requests, and
 * without the guard a slow response for entry #3 lands after the fast one for entry #7 and silently
 * replaces the script under the score sheet. A judge would then score the wrong entry, so this is a
 * correctness guard, not a tidiness one.
 *
 * The guard has to live in the EFFECT BODY, not inside an async function the effect calls. An async
 * function returns a promise, so a cleanup returned from it is discarded and the flag it closes over
 * is never set — the guard reads as if it works and does nothing. Refetching is therefore driven by
 * a counter the effect depends on, which also keeps setState out of the effect body.
 */

const message = (error, fallback) =>
  error?.response?.data?.message || (error?.response?.status === 401 ? "" : fallback);

/** The judge's assigned competitions. */
export const useJudgeCompetitions = () => {
  const [state, setState] = useState({ competitions: [], loading: true, error: "", unauthorized: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    judgeApi
      .get("/judge/competitions")
      .then(({ data }) => {
        if (cancelled) return;
        setState({ competitions: data.competitions || [], loading: false, error: "", unauthorized: false });
      })
      .catch((error) => {
        if (cancelled) return;
        const unauthorized = error?.response?.status === 401 || error?.response?.status === 403;
        setState({
          competitions: [],
          loading: false,
          error: unauthorized ? "" : message(error, "Could not load your competitions."),
          unauthorized,
        });
      });
    return () => { cancelled = true; };
  }, [tick]);

  // A user action, not an effect body — setState here is exactly where it belongs.
  const refresh = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    setTick((t) => t + 1);
  }, []);

  return { ...state, refresh };
};

/** One competition's rubric, progress, and entry queue. */
export const useJudgeQueue = (competitionId) => {
  const [state, setState] = useState({
    competition: null,
    rubric: { criteria: [], awards: [], scale: 10 },
    entries: [],
    progress: null,
    judgingOpen: false,
    judgingClosedReason: "",
    loading: true,
    error: "",
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!competitionId) return undefined;
    let cancelled = false;

    Promise.all([
      judgeApi.get(`/judge/competitions/${competitionId}`),
      judgeApi.get(`/judge/competitions/${competitionId}/entries`, { params: { limit: 100 } }),
    ])
      .then(([meta, queue]) => {
        if (cancelled) return;
        setState({
          competition: meta.data.competition,
          rubric: meta.data.rubric || { criteria: [], awards: [], scale: 10 },
          progress: meta.data.progress,
          judgingOpen: meta.data.judgingOpen,
          judgingClosedReason: meta.data.judgingClosedReason || "",
          entries: queue.data.entries || [],
          loading: false,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: message(error, "Could not load this competition.") }));
      });

    return () => { cancelled = true; };
  }, [competitionId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, refresh };
};

/** One entry, with its script and this judge's own draft. */
export const useJudgeEntry = (competitionId, entryId) => {
  const [state, setState] = useState({ entry: null, myScore: null, myNominations: [], loading: true, error: "" });

  useEffect(() => {
    if (!competitionId || !entryId) return undefined;
    let cancelled = false;

    judgeApi
      .get(`/judge/competitions/${competitionId}/entries/${entryId}`)
      .then(({ data }) => {
        // The guard that matters most in this file: without it, a slow response for a previously
        // opened entry lands after this one and swaps the script beside the score sheet.
        if (cancelled) return;
        setState({
          entry: data.entry,
          myScore: data.myScore,
          myNominations: data.myNominations || [],
          loading: false,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: message(error, "Could not load this entry.") }));
      });

    return () => { cancelled = true; };
  }, [competitionId, entryId]);

  return state;
};
