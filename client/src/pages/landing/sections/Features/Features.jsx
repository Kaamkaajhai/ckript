import { useState } from "react";
import Diamond from "../../_shared/Diamond";
import Icon from "../../_shared/Icon";
import FeatureMedia from "./FeatureMedia";
import { FEATURES } from "./features.data";
import "./Features.css";

function FeatureDetail({ feat }) {
  return (
    <div className="ckl-feat-panel">
      <div className="ckl-feat-text">
        <span className="ckl-feat-tag">{feat.tag}</span>
        <h3 className="ckl-feat-title">{feat.title}</h3>
        <p className="ckl-feat-italic">{feat.italic}</p>
        <p className="ckl-feat-desc">{feat.desc}</p>
        <div className="ckl-feat-bullets">
          {feat.bullets.map((b) => (
            <div key={b} className="ckl-feat-bullet">
              <Diamond size={7} />
              <span className="ckl-feat-bullet-txt">{b}</span>
            </div>
          ))}
        </div>
      </div>
      <FeatureMedia feat={feat} />
    </div>
  );
}

export default function Features() {
  const [activeFeat, setActiveFeat] = useState(0);

  return (
    <section className="ckl-features">
      <div className="ckl-features-inner">
        <div className="ckl-features-head" data-ra="ckl-fadeUp">
          <div className="ckl-kicker">What you get</div>
          <h2 className="ckl-h2">
            Built for writers.<br /><span className="ckl-h2-em">Loved by producers.</span>
          </h2>
          <p className="ckl-lead ckl-features-lead">
            Seven tools that turn your script from a file on your laptop into a film people actually want to make.
          </p>
        </div>

        <div className="ckl-feat-grid">
          {/* Tab rail — also the accordion trigger on mobile */}
          <div className="ckl-feat-tabs" data-ra="ckl-fadeUp" data-rd="0.05">
            {FEATURES.map((f, i) => {
              const on = activeFeat === i;
              return (
                <div key={f.num} className="ckl-feat-tab-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveFeat(on ? -1 : i)}
                    className={`ckl-feat-tab${on ? " is-active" : ""}`}
                  >
                    <span className="ckl-feat-tab-num">{f.num}</span>
                    <span className="ckl-feat-tab-label">{f.tab}</span>
                    <Icon
                      name={on ? "expand_less" : "expand_more"}
                      size={24}
                      color={on ? "#fff" : "#161513"}
                      style={{ marginLeft: "auto" }}
                    />
                  </button>
                  {on && (
                    <div className="ckl-feat-detail-mobile">
                      <FeatureDetail feat={f} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detail panel (desktop) */}
          <div className="ckl-feat-detail-desktop" data-ra="ckl-fadeUp" data-rd="0.12">
            <FeatureDetail feat={FEATURES[activeFeat >= 0 ? activeFeat : 0]} />
          </div>
        </div>
      </div>
    </section>
  );
}
