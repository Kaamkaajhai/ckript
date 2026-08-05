import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/*
 * useMobileBack — the plan's §8.3 back contract in one place.
 *
 *   "A nested screen uses browser history when a valid in-app previous entry
 *    exists. A direct deep link uses a deterministic parent-route fallback."
 *
 * The hard part is knowing which case you are in. `navigate(-1)` on a deep
 * link walks the user *out of the app* — back to the search results or the
 * message that sent them here — which is the single worst back-button bug a
 * mobile web app can ship.
 *
 * React Router maintains its own index inside `window.history.state.idx`
 * (verified in react-router 7.13.1: `getUrlBasedHistory` seeds `idx: 0` on the
 * entry it adopts and increments it on every push it performs). So:
 *
 *   idx > 0  -> this app pushed at least one entry before the current one;
 *               going back stays inside the app and restores real state.
 *   idx === 0 or missing
 *            -> the current entry is where this browsing context entered the
 *               app: a deep link, a share, a notification, a fresh tab. Back
 *               would leave. Navigate to the declared parent instead.
 *
 * The fallback replaces rather than pushes, so a user who arrived by deep link
 * cannot bounce between child and parent with the hardware back button.
 */

export function hasInAppHistory() {
  if (typeof window === "undefined") return false;
  const idx = window.history?.state?.idx;
  return typeof idx === "number" && idx > 0;
}

/**
 * @param {string} fallbackTo Parent route used when there is no in-app history.
 * @returns {{ goBack: () => void, canGoBack: boolean }}
 */
export function useMobileBack(fallbackTo = "/") {
  const navigate = useNavigate();
  const canGoBack = hasInAppHistory();

  const goBack = useCallback(() => {
    if (hasInAppHistory()) navigate(-1);
    else navigate(fallbackTo, { replace: true });
  }, [navigate, fallbackTo]);

  return { goBack, canGoBack };
}

export default useMobileBack;
