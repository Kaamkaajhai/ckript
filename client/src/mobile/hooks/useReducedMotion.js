import { useEffect, useState } from "react";

/*
 * useReducedMotion — the JavaScript half of the reduced-motion contract.
 *
 * `theme/base.css` already collapses every CSS animation and transition inside
 * `.ckm` under `prefers-reduced-motion: reduce`. That rule cannot reach motion
 * driven from JavaScript, and the overlays are exactly that: framer-motion
 * writes transforms straight onto the element as inline style, where no media
 * query applies. So the components ask this hook instead and choose a different
 * animation, not a faster one — a sheet that still flies up from the bottom in
 * 1ms is a flicker, which is worse for a vestibular disorder than the fade it
 * should have been.
 *
 * It is a live subscription, not a one-time read: the setting can be changed
 * from the OS while the app is open, and on iOS it commonly is.
 */
export default function useReducedMotion() {
  const [reduced, setReduced] = useState(() => query()?.matches ?? false);

  useEffect(() => {
    const mql = query();
    if (!mql) return undefined;
    const onChange = (event) => setReduced(event.matches);
    // Safari only gained addEventListener on MediaQueryList in 14; the app
    // supports older iOS than that in read-only mode, so keep the fallback.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return reduced;
}

function query() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia("(prefers-reduced-motion: reduce)");
}
