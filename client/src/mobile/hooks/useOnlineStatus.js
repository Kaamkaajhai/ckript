import { useCallback, useState, useSyncExternalStore } from "react";

/*
 * useOnlineStatus — what the browser believes about connectivity, and nothing
 * more than that.
 *
 * ---------------------------------------------------------------------------
 * The honesty rule
 * ---------------------------------------------------------------------------
 * `navigator.onLine` does not mean "the internet works". MDN is blunt about it:
 * the property is "inherently unreliable", each browser and OS decides it by a
 * different heuristic, a machine attached to a router with no upstream link
 * still reports `true`, and a VPN or firewall can make a perfectly connected
 * machine report `false`. Its own guidance is to "only provide hints when the
 * user may seem offline" and never to disable features on it.
 *
 * So this hook is deliberately asymmetric, because the two values are not
 * equally trustworthy:
 *
 *   false  ->  worth telling the user about. It is the more reliable direction,
 *              and it explains a failure they are probably already seeing.
 *   true   ->  claims nothing. `recovered` says the *device* reports a network
 *              again — it does not say a request will now succeed, which is why
 *              the recovery affordance is a retry the user chooses, not a
 *              refetch this hook fires on their behalf.
 *
 * `useSyncExternalStore` rather than useState + listeners: it reads the live
 * value on every render instead of a copy that can go stale between the event
 * firing and the effect running, and its server snapshot keeps the 53
 * prerendered routes from asserting anything about a browser that is not there.
 */

function subscribe(onChange) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/* `!== false` rather than a truthiness test: an environment that does not
   implement the property must read as online, never as offline. Claiming a
   user is offline because a headless browser has no opinion would be exactly
   the over-claim this hook exists to avoid. */
function getSnapshot() {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function getServerSnapshot() {
  return true;
}

export default function useOnlineStatus() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [previous, setPrevious] = useState(online);
  const [recovered, setRecovered] = useState(false);

  /*
   * Adjusted during render rather than in an effect. The effect version — watch
   * `online`, then setState — is a cascading render React explicitly warns
   * against, and it also renders one frame of the wrong thing: the moment the
   * connection returns, the bar would still say "offline" until the effect ran.
   * This is the documented shape for state that derives from a change in
   * something else, and React re-runs the component immediately without
   * committing the intermediate result.
   *
   * Reaching this branch means the value changed, so `online === true` here can
   * only be the offline -> online transition.
   */
  if (previous !== online) {
    setPrevious(online);
    setRecovered(online);
  }

  const acknowledge = useCallback(() => setRecovered(false), []);

  return { online, recovered, acknowledge };
}
