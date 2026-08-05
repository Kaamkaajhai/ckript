import Icon from "../../_shared/Icon";
import { RED } from "../../_shared/theme";

/* The right-hand visual of a feature panel. Renders one of four
   treatments depending on `feat.media` (see features.data.js). A dimmed
   art-directed cinematic backdrop sits behind every variant. */
export default function FeatureMedia({ feat }) {
  const { media, image, opacity } = feat;
  return (
    <div className="ckl-feat-media">
      <img
        className="ckl-feat-media-img"
        src={image}
        alt=""
        width="900"
        height="1000"
        loading="lazy"
        decoding="async"
        style={{ opacity }}
      />
      <div className="ckl-feat-media-overlay" />

      {media === "trailer" && (
        <>
          <div className="ckl-feat-media-play">
            <Icon name="play_arrow" fill size={34} color="#fff" />
          </div>
          <div className="ckl-feat-media-tr">
            <div className="ckl-feat-media-tr-track">
              <div className="ckl-feat-media-tr-fill" />
            </div>
            <div className="ckl-feat-media-tr-cap">FORSAKEN HORIZON — Trailer · 0:13 / 0:30</div>
          </div>
        </>
      )}

      {media && media.icon && (
        <div
          className="ckl-feat-media-badge"
          style={{ borderRadius: media.shape === "round-sq" ? 18 : "50%" }}
        >
          <Icon name={media.icon} size={32} color="#fff" />
        </div>
      )}

      {media && media.stat && (
        <div className="ckl-feat-media-stat">
          <div className="ckl-feat-media-stat-num">{media.stat}</div>
          <div className="ckl-feat-media-stat-label">{media.label}</div>
        </div>
      )}

      {media && media.stars && (
        <div className="ckl-feat-media-stars">
          {[0, 1, 2, 3, 4].map((i) => (
            <Icon key={i} name="star" fill size={30} color={i < media.stars ? RED : "rgba(255,255,255,0.45)"} />
          ))}
        </div>
      )}
    </div>
  );
}
