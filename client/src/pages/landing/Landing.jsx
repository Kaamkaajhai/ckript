import { useLayoutEffect, useRef } from "react";
import useReveal from "./_shared/useReveal";
import useChallenge from "./_shared/useChallenge";
import SectionBridge from "./_shared/SectionBridge";
import Hero from "./sections/Hero/Hero";
import ChallengeStrip from "./sections/ChallengeStrip/ChallengeStrip";
import Steps from "./sections/Steps/Steps";
import Marquee from "./sections/Marquee/Marquee";
import Features from "./sections/Features/Features";
import Formats from "./sections/Formats/Formats";
import Trailer from "./sections/Trailer/Trailer";
import Problem from "./sections/Problem/Problem";
import Partners from "./sections/Partners/Partners";
import FinalCta from "./sections/FinalCta/FinalCta";
import Footer from "./sections/Footer/Footer";
import EventPosterModal from "../../components/EventPosterModal";
import "./landing.css";

export default function Landing() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  // One fetch for the whole page, shared by the strip and the section so they can never disagree
  // about what is running. It resolves to a dormant state on the first frame and upgrades if data
  // arrives — the landing must render, and render identically, whether or not the API answers.
  const challenge = useChallenge();

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
      {/* Renders only while registration is open or the clock is running; null the rest of the year. */}
      <ChallengeStrip
        phase={challenge.phase}
        competition={challenge.competition}
        serverNow={challenge.serverNow}
      />
      <SectionBridge label="How It Works" />
      <Steps />
      <Marquee />
      <Features />
      <Formats />
      <Trailer />
      <Problem />
      {/* No challenge SECTION here on purpose. The homepage sells Ckript; the challenge sells itself
          on its own page, and a second full section restating it only ever became a worse copy of
          /challenge. The two paths that remain are the nav entry and ChallengeStrip above, which
          appears only while registration is open or writing is under way — so the homepage still
          carries the event when there is one, and says nothing when there is not. */}
      <Partners />
      <FinalCta />
      <Footer />
      <EventPosterModal />
    </div>
  );
}
