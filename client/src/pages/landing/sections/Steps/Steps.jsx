import { useRef } from "react";
import { useAuthModal } from "../../../../context/AuthModalContext";
import Icon from "../../_shared/Icon";
import useStageFit, { initialStageScale } from "../../_shared/useStageFit";
import { ROUTES } from "../../_shared/theme";
import scriptImg from "../../../../assets/ckript-landing/script-img.png";
import trailerStill from "../../../../assets/ckript-landing/trailer-still.png";
import "./Steps.css";

/* Fit against 1850 (wider than the 1586 stage) so the scene is centred
   with margins; the stage's own box stays 1586×1080. */
const FIT_W = 1850;
const FIT_H = 1080;

const CAPTIONS = [
  { left: 258, rd: "0.52", num: "01", title: "Discover a script.", desc: ["Explore original stories", "across every genre."] },
  { left: 793, rd: "0.6", num: "02", title: "Watch the trailer.", desc: ["Experience AI-generated trailers", "that bring the story to life."] },
  { left: 1288, rd: "0.68", num: "03", title: "Own the story.", desc: ["Secure exclusive rights", "to make it yours."] },
];

export default function Steps() {
  const { openWriterOnboarding } = useAuthModal();
  const wrapRef = useRef(null);
  const stageRef = useRef(null);

  useStageFit(wrapRef, stageRef, FIT_W, FIT_H);
  const initScale = initialStageScale(FIT_W, 0.53);

  return (
    <section ref={wrapRef} className="ckl-steps-wrap" style={{ height: `${FIT_H * initScale}px` }}>
      <div
        ref={stageRef}
        className="ckl-steps-stage"
        style={{ transform: `translateX(-50%) scale(${initScale})` }}
      >
        <h1 className="ckl-steps-title" data-ra="ckl-fadeUp" data-rd="0">
          FIND IT. WATCH IT. OWN IT
          <span className="ckl-steps-title-dot" />
        </h1>
        <p className="ckl-steps-desc" data-ra="ckl-fadeUpC" data-rd="0.08">
          Producers can explore scripts, watch AI-generated trailers,<br />and acquire the ones that stand out.
        </p>

        {/* Arrows */}
        <div className="ckl-steps-arrows ckl-steps-arrow-1" data-ra="ckl-fadeIn" data-rd="0.5">
          <Icon name="arrow_right_alt" size={40} />
        </div>
        <div className="ckl-steps-arrows ckl-steps-arrow-2" data-ra="ckl-fadeIn" data-rd="0.62">
          <Icon name="arrow_right_alt" size={40} />
        </div>

        {/* Col 1 — script image */}
        <img className="ckl-steps-col-1" data-ra="ckl-fadeUp" data-rd="0.18" src={scriptImg} alt="" />

        {/* Col 2 — trailer */}
        <div className="ckl-steps-col-2 hov-trailer" data-ra="ckl-fadeUp" data-rd="0.3">
          <img src={trailerStill} alt="" />
          <div className="ckl-steps-trailer-bar">
            <div className="ckl-steps-trailer-track">
              <div className="ckl-steps-trailer-fill" />
              <div className="ckl-steps-trailer-dot" />
            </div>
            <div className="ckl-steps-trailer-ctrls">
              <div className="ckl-steps-trailer-ctrls-l">
                <Icon name="play_arrow" fill size={16} color="#fff" />
                <span className="ckl-steps-trailer-time">0:34 / 1:46</span>
              </div>
              <div className="ckl-steps-trailer-ctrls-r">
                <Icon name="volume_up" size={18} color="#fff" />
                <Icon name="settings" size={17} color="#fff" />
                <Icon name="fullscreen" size={18} color="#fff" />
              </div>
            </div>
          </div>
        </div>

        {/* Col 3 — rights card */}
        <div className="ckl-steps-col-3 hov-rights" data-ra="ckl-fadeUp" data-rd="0.42">
          <div className="ckl-steps-rights-title">FORSAKEN HORIZON</div>
          <div className="ckl-steps-rights-meta">Drama / Sci-Fi / Thriller<br />Feature Length</div>
          <div className="ckl-steps-rights-div" />
          <div className="ckl-steps-rights-rights">Rights<br />Worldwide<br />All Media</div>
          <button type="button" onClick={() => openWriterOnboarding()} className="ckl-steps-rights-btn hov-btn">
            <Icon name="lock" size={16} color="#fff" />
            <span>Acquire Script</span>
          </button>
        </div>

        {/* Captions */}
        {CAPTIONS.map((c, i) => (
          <div
            key={c.num}
            className={`ckl-steps-cap ckl-steps-cap-${i + 1}`}
            data-ra="ckl-fadeUpC"
            data-rd={c.rd}
            style={{ left: c.left }}
          >
            <div className="ckl-steps-cap-num">{c.num}</div>
            <div className="ckl-steps-cap-title">{c.title}</div>
            <div className="ckl-steps-cap-desc">{c.desc[0]}<br />{c.desc[1]}</div>
          </div>
        ))}

        {/* Browse Scripts CTA */}
        <span className="ckl-steps-cta-line" data-ra="ckl-fadeUpC" data-rd="0.74" />
        <button type="button" onClick={() => openWriterOnboarding()} className="ckl-steps-cta-btn hov-btn" data-ra="ckl-fadeUpC" data-rd="0.8">
          Browse Scripts
        </button>
      </div>
    </section>
  );
}
