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
