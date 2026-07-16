import { useAuthModal } from "../../../../context/AuthModalContext";
import { ROUTES } from "../../_shared/theme";
import "./FinalCta.css";

export default function FinalCta() {
  const { openWriterOnboarding, openProducerOnboarding } = useAuthModal();

  return (
    <section className="ckl-cta">
      <span className="ckl-cta-line" data-ra="ckl-fadeUp" />
      <div data-ra="ckl-fadeUp" data-rd="0.06">
        <span className="ckl-cta-diamond" />
      </div>
      <h2 className="ckl-cta-h2" data-ra="ckl-fadeUp" data-rd="0.1">
        Your story deserves<br /><span className="ckl-cta-h2-em">an audience.</span>
      </h2>
      <p className="ckl-cta-lead" data-ra="ckl-fadeUp" data-rd="0.18">
        Upload your script, shape a trailer, and put your work in front of the producers, directors, and
        investors who can make it real.
      </p>
      <div className="ckl-cta-actions" data-ra="ckl-fadeUp" data-rd="0.26">
        <button type="button" onClick={() => openWriterOnboarding()} className="ckl-cta-btn hov-btn-lift">
          Start with your script
        </button>
        <button type="button" onClick={() => openProducerOnboarding()} className="ckl-cta-link hov-underline">
          Browse scripts
        </button>
      </div>
    </section>
  );
}
