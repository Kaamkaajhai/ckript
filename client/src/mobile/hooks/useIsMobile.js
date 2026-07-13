import { useEffect, useState } from "react";

/*
 * useIsMobile — true when the viewport is phone-sized. The mobile Ckript
 * experience is a deliberately separate build (not a responsive reflow of the
 * desktop app), so this is the single switch that decides which app a
 * signed-in user gets. SSR/prerender safe: defaults to false when there is no
 * window, and never activates during the (user-less) prerender pass anyway.
 */
export const MOBILE_BREAKPOINT = 768;

const query = `(max-width: ${MOBILE_BREAKPOINT}px)`;

function getMatch() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(query).matches;
}

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    // addEventListener is the modern API; addListener is the Safari<14 fallback.
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  return isMobile;
}
