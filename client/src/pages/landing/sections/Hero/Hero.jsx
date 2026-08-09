import { useRef } from "react";
import { useAuthModal } from "../../../../context/AuthModalContext";
import LandingNav from "../../_shared/LandingNav";
import useStageFit, { initialStageScale } from "../../_shared/useStageFit";
import scriptOriginal from "../../../../assets/ckript-landing/script-original.png";
import filmClean from "../../../../assets/ckript-landing/film-clean.png";
import "./Hero.css";

const DESIGN_W = 1586;
const DESIGN_H = 992;

export default function Hero() {
  const wrapRef = useRef(null);
  const stageRef = useRef(null);

  const { openProducerOnboarding, openAboutModal } = useAuthModal();

  useStageFit(wrapRef, stageRef, DESIGN_W, DESIGN_H);
  const initScale = initialStageScale(DESIGN_W, 0.62);

  return (
    <section ref={wrapRef} className="ckl-hero-wrap" style={{ height: `${DESIGN_H * initScale}px` }}>
      <div
        ref={stageRef}
        className="ckl-hero-stage"
        style={{ transform: `translateX(-50%) scale(${initScale})` }}
      >
        {/* Decorations */}
        <div className="ckl-hero-decor-1">
          <img src={scriptOriginal} alt="" />
        </div>
        <div className="ckl-hero-decor-2">
          <img src={filmClean} alt="" />
        </div>

        {/* Nav. Absolutely positioned inside this stage, so it scales with the composition —
            see LandingNav for the page variant used everywhere else. */}
        <LandingNav variant="stage" />

        {/* Hero content */}
        <h1 className="ckl-hero-title">
          Ckript
          <br />
          The Journey from
          <br />
          Page to Screen
          <span className="ckl-hero-title-dot" />
        </h1>
        <span className="ckl-hero-line" />
        <p className="ckl-hero-desc">
          Ckript brings powerful writing tools and a modern marketplace together, helping writers create exceptional scripts and producers discover the next great story worth producing.
        </p>
        <div className="ckl-hero-buttons">
          <button type="button" onClick={openProducerOnboarding} className="ckl-hero-btn-primary hov-btn-lift">
            Browse Scripts
          </button>
          <button type="button" onClick={() => openAboutModal()} className="ckl-hero-btn-text hov-underline">
            Meet the Platform
          </button>
        </div>
      </div>
    </section>
  );
}
