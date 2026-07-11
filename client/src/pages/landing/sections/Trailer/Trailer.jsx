import { Link } from "react-router-dom";
import { useAuthModal } from "../../../../context/AuthModalContext";
import Diamond from "../../_shared/Diamond";
import Icon from "../../_shared/Icon";
import { ROUTES } from "../../_shared/theme";
import "./Trailer.css";

export default function Trailer() {
  const { openWriterOnboarding } = useAuthModal();

  return (
    <section className="ckl-trailer">
      <img
        className="ckl-trailer-bg"
        src="https://picsum.photos/seed/ckript-cinema/1920/1100?grayscale"
        alt=""
      />
      <div className="ckl-trailer-overlay" />
      <div className="ckl-trailer-inner">
        <div className="ckl-trailer-eyebrow" data-ra="ckl-fadeUp">
          <Diamond size={8} />
          <span className="ckl-trailer-kicker">Text-to-Trailer AI</span>
        </div>
        <h2 className="ckl-trailer-h2" data-ra="ckl-fadeUp" data-rd="0.08">
          Your script,<br /><span className="ckl-trailer-h2-em">rendered in 30 seconds.</span>
        </h2>
        <p className="ckl-trailer-lead" data-ra="ckl-fadeUp" data-rd="0.16">
          Upload your pages and watch Ckript blend stock footage with AI-generated visuals into a cinematic
          teaser — the fastest way to make a producer feel your story.
        </p>
        <div className="ckl-trailer-actions" data-ra="ckl-fadeUp" data-rd="0.24">
          <button type="button" onClick={() => openWriterOnboarding()} className="ckl-trailer-play-btn hov-lift3">
            <span className="ckl-trailer-play-icon">
              <Icon name="play_arrow" fill size={22} color="#fff" />
            </span>
            <span className="ckl-trailer-play-label">Watch a sample trailer</span>
          </button>
          <Link to={ROUTES.writer} className="ckl-trailer-link hov-bc-red">
            Start with your script
          </Link>
        </div>
      </div>
    </section>
  );
}
