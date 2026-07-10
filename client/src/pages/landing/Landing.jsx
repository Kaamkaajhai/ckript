import { useLayoutEffect, useRef } from "react";
import useReveal from "./_shared/useReveal";
import SectionBridge from "./_shared/SectionBridge";
import Hero from "./sections/Hero/Hero";
import Steps from "./sections/Steps/Steps";
import Marquee from "./sections/Marquee/Marquee";
import Features from "./sections/Features/Features";
import Formats from "./sections/Formats/Formats";
import Trailer from "./sections/Trailer/Trailer";
import Problem from "./sections/Problem/Problem";
import Partners from "./sections/Partners/Partners";
import FinalCta from "./sections/FinalCta/FinalCta";
import Footer from "./sections/Footer/Footer";
import "./landing.css";

/* ═══════════════════════════════════════════════════════════════
   Ckript Landing — orchestrator.

   Each section owns its own markup and stylesheet under ./sections.
   This file only sequences them and wires the two page-level
   concerns that span sections:

   • a single reveal-on-scroll observer for every [data-ra] element
     (see _shared/useReveal), and
   • the `.ckl-scroll` class on <html> that restyles the page
     scrollbar for the duration the landing is mounted.

   Ported from the "Ckript Landing.dc.html" Claude Design handoff;
   every inline SVG icon in the original was replaced with Google
   Material Symbols (see _shared/Icon).
   ═══════════════════════════════════════════════════════════════ */
export default function Landing() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  // Scope the page-scrollbar styling to the landing's lifetime.
  // useLayoutEffect runs before paint, so the class is present on the
  // first frame — no flash of the app's default scrollbar.
  useLayoutEffect(() => {
    const el = document.documentElement;
    el.classList.add("ckl-scroll");
    return () => el.classList.remove("ckl-scroll");
  }, []);

  return (
    <div className="ckl" ref={rootRef}>
      <Hero />
      <SectionBridge label="How It Works" />
      <Steps />
      <Marquee />
      <Features />
      <Formats />
      <Trailer />
      <Problem />
      <Partners />
      <FinalCta />
      <Footer />
    </div>
  );
}
