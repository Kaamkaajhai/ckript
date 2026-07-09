import { useLayoutEffect } from "react";

/* Scale a fixed-size design "stage" to fill its responsive wrapper.

   The Hero and Steps sections were handed off as pixel-perfect
   compositions at a fixed design width/height. Rather than reflow
   them, we render them at their native size and uniformly scale the
   stage to the wrapper's current width, then set the wrapper's height
   to the scaled result so the next section sits flush beneath.

   Runs in useLayoutEffect (before paint) so the first frame is already
   correct, and re-fits on resize plus a few post-mount ticks to absorb
   late font/layout shifts. Below the mobile breakpoint the section CSS
   neutralises the transform and lets the content flow naturally. */
export default function useStageFit(wrapRef, stageRef, designW, designH) {
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;

    const fit = () => {
      const w = wrap.clientWidth || window.innerWidth;
      const s = w / designW;
      stage.style.transform = `translateX(-50%) scale(${s})`;
      wrap.style.height = `${designH * s}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    window.addEventListener("resize", fit);
    const timers = [50, 200, 600].map((t) => setTimeout(fit, t));

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
      timers.forEach(clearTimeout);
    };
  }, [wrapRef, stageRef, designW, designH]);
}

/* Initial stage scale for first render, before useStageFit runs.
   Mirrors the effect's math so there's no first-paint jump. */
export function initialStageScale(designW, fallback) {
  return typeof window !== "undefined" ? window.innerWidth / designW : fallback;
}
