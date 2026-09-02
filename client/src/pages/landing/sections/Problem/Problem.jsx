import { useAuthModal } from "../../../../context/AuthModalContext";
import Icon from "../../_shared/Icon";
import { RED } from "../../_shared/theme";
import { PROBLEM_CARDS } from "./problem.data";
import "./Problem.css";

export default function Problem() {
  const { openProducerOnboarding, openWriterOnboarding } = useAuthModal();
  const openOnboarding = (kind) => (kind === "writer" ? openWriterOnboarding() : openProducerOnboarding());

  return (
    <section className="ckl-problem">
      <div className="ckl-problem-inner">
        <div className="ckl-problem-head" data-ra="ckl-fadeUp">
          <div className="ckl-kicker">The problem</div>
          <h2 className="ckl-h2">
            The industry is <span className="ckl-problem-h2-red">broken</span><br />on both sides of the page.
          </h2>
        </div>

        <div className="ckl-problem-grid">
          {PROBLEM_CARDS.map((card) => (
            <div key={card.kicker} className="ckl-problem-card" data-ra="ckl-fadeUp" data-rd={card.rd}>
              <div className="ckl-problem-kicker">{card.kicker}</div>
              <h3 className="ckl-problem-title">
                {card.title[0]}<br /><span className="ckl-problem-title-em">{card.title[1]}</span>
              </h3>
              <div className="ckl-problem-rows">
                {card.rows.map((r) => (
                  <div key={r} className="ckl-problem-row">
                    <Icon name="arrow_forward" size={18} color={RED} style={{ flex: "none", marginTop: 4 }} />
                    <span className="ckl-problem-row-txt">{r}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => openOnboarding(card.kind)}
                className="ckl-problem-cta"
              >
                {card.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
