import { useEffect } from "react";

/* Reveal-on-scroll.

   Any element inside `rootRef` carrying a `data-ra` attribute starts
   hidden (opacity:0 via `.ckl [data-ra]` in landing.css) and animates
   in the first time it scrolls into view. `data-ra` names the keyframe
   (default ckl-fadeUp); `data-rd` is an optional delay in seconds.

   A single observer at the landing root covers every section, so
   sections only need to annotate their markup — no per-section wiring.
   Where IntersectionObserver is unavailable the elements are revealed
   immediately so nothing is left invisible. */
export default function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = root.querySelectorAll("[data-ra]");

    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => {
        el.style.opacity = "1";
      });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target;
          const name = el.getAttribute("data-ra") || "ckl-fadeUp";
          const d = el.getAttribute("data-rd") || "0";
          el.style.animation = `${name} .85s ${d}s cubic-bezier(.2,.7,.2,1) both`;
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}
