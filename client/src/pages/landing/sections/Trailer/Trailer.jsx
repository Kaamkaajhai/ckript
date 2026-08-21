import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Diamond from "../../_shared/Diamond";
import Icon from "../../_shared/Icon";
import { ROUTES } from "../../_shared/theme";
import "./Trailer.css";

export default function Trailer() {
  const [showPopup, setShowPopup] = useState(false);
  const videoRef = useRef(null);

  const openTrailer = useCallback(() => setShowPopup(true), []);
  const closeTrailer = useCallback(() => {
    setShowPopup(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  /* close on Escape */
  useEffect(() => {
    if (!showPopup) return undefined;
    const onKey = (e) => { if (e.key === "Escape") closeTrailer(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPopup, closeTrailer]);

  return (
    <>
      <section className="ckl-trailer">
        <img
          className="ckl-trailer-bg"
          src="/landing/ai/trailer-cinema.webp"
          alt=""
          width="1920"
          height="1100"
          loading="lazy"
          decoding="async"
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
            <button type="button" onClick={openTrailer} className="ckl-trailer-play-btn hov-lift3">
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

      {/* ── Trailer Video Popup ── */}
      {showPopup && (
        <div className="ckl-trailer-popup-backdrop" onClick={closeTrailer}>
          <div className="ckl-trailer-popup" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ckl-trailer-popup-close"
              onClick={closeTrailer}
              aria-label="Close trailer"
            >
              ✕
            </button>
            <video
              ref={videoRef}
              className="ckl-trailer-popup-video"
              src="/nexara-trailer.MP4"
              controls
              autoPlay
              playsInline
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
      )}
    </>
  );
}
